/**
 * Persönliche Accountdaten (benötigen einen API-Schlüssel mit passenden Berechtigungen).
 *
 *   Feature                      Endpunkt                        Berechtigung
 *   Materiallager                /v2/account/materials           inventories
 *   Bank                         /v2/account/bank                inventories
 *   Geteiltes Inventar           /v2/account/inventory           inventories
 *   Charakter-Taschen/Handwerk   /v2/characters?ids=all          characters (+ inventories für Taschen)
 *   Geldbörse                    /v2/account/wallet              wallet
 *   Bekannte Rezepte             /v2/account/recipes             unlocks
 *   Legendäre Rüstkammer         /v2/account/legendaryarmory     unlocks
 *
 * Fehlende Berechtigungen werden je Feature gemeldet; die übrigen Daten werden trotzdem geladen.
 */
import { useSyncExternalStore } from 'react';
import { apiGet, buildUrl, describeApiError } from './client';
import { createEmitter } from './cache';
import { progressActions } from '../progressStore';

const STORAGE_KEY = 'gw2_overlay_account_data_v1';

export type AccountFeature = 'materials' | 'bank' | 'shared' | 'characters' | 'wallet' | 'recipes' | 'armory';

export const FEATURE_INFO: Record<AccountFeature, { label: string; scope: string }> = {
  materials: { label: 'Materiallager', scope: 'inventories' },
  bank: { label: 'Bank', scope: 'inventories' },
  shared: { label: 'Geteiltes Inventar', scope: 'inventories' },
  characters: { label: 'Charaktere (Handwerk, Taschen)', scope: 'characters' },
  wallet: { label: 'Geldbörse', scope: 'wallet' },
  recipes: { label: 'Bekannte Rezepte', scope: 'unlocks' },
  armory: { label: 'Legendäre Rüstkammer', scope: 'unlocks' },
};

export interface AccountData {
  syncedAt: number;
  accountName?: string;
  permissions: string[];
  /** Gesamtbestand je Item-ID über Lager, Bank, geteiltes Inventar und Charakter-Taschen */
  stock: [number, number][];
  /** Aufschlüsselung je Item: [Lager, Bank, Geteilt, Charaktere] */
  breakdown: Record<number, [number, number, number, number]>;
  wallet: [number, number][] | null;
  knownRecipes: number[] | null;
  armory: [number, number][] | null;
  crafting: Record<string, { rating: number; character: string }> | null;
  errors: Partial<Record<AccountFeature, string>>;
}

export interface AccountState {
  status: 'none' | 'loading' | 'ready';
  data: AccountData | null;
  /** Abgeleitete Strukturen für schnellen Zugriff */
  stockMap: ReadonlyMap<number, number>;
  knownRecipeSet: ReadonlySet<number> | null;
  armoryMap: ReadonlyMap<number, number> | null;
  walletMap: ReadonlyMap<number, number> | null;
  hasStockData: boolean;
}

const emitter = createEmitter();

function derive(data: AccountData | null, status: AccountState['status']): AccountState {
  const hasStock = Boolean(data) && !data!.errors.materials && !data!.errors.bank;
  return {
    status,
    data,
    stockMap: new Map(data?.stock ?? []),
    knownRecipeSet: data?.knownRecipes ? new Set(data.knownRecipes) : null,
    armoryMap: data?.armory ? new Map(data.armory) : null,
    walletMap: data?.wallet ? new Map(data.wallet) : null,
    hasStockData: hasStock && (data?.stock.length ?? 0) > 0,
  };
}

function loadPersisted(): AccountData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as AccountData;
    return d && Array.isArray(d.stock) ? d : null;
  } catch {
    return null;
  }
}

const initial = loadPersisted();
let state: AccountState = derive(initial, initial ? 'ready' : 'none');

function setState(next: AccountState) {
  state = next;
  emitter.emit();
}

export function getAccountState(): AccountState {
  return state;
}
export function useAccountState(): AccountState {
  return useSyncExternalStore(emitter.subscribe, getAccountState);
}

interface Slot {
  id: number;
  count: number;
}
interface ApiBag {
  inventory?: (Slot | null)[];
}
interface ApiCharacter {
  name: string;
  crafting?: { discipline: string; rating: number; active: boolean }[];
  bags?: (ApiBag | null)[];
}

export async function syncAccountData(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) {
    clearAccountData();
    return;
  }
  setState({ ...state, status: 'loading' });

  const errors: AccountData['errors'] = {};
  const breakdown: AccountData['breakdown'] = {};
  const add = (id: number, count: number, idx: 0 | 1 | 2 | 3) => {
    const b = (breakdown[id] ??= [0, 0, 0, 0]);
    b[idx] += count;
  };

  const tokenRes = await apiGet<{ name: string; permissions: string[] }>(buildUrl('tokeninfo', {}, key));
  if (!tokenRes.ok || !tokenRes.data) {
    const msg = describeApiError(tokenRes);
    setState(derive(state.data, state.data ? 'ready' : 'none'));
    throw new Error(msg);
  }
  const permissions = tokenRes.data.permissions ?? [];
  const can = (scope: string) => permissions.includes(scope);

  const need = (feature: AccountFeature): boolean => {
    const scope = FEATURE_INFO[feature].scope;
    if (!can(scope)) {
      errors[feature] = `Berechtigung „${scope}“ fehlt im API-Schlüssel.`;
      return false;
    }
    return true;
  };
  const failed = (feature: AccountFeature, res: { status: number; error?: string }) => {
    errors[feature] = describeApiError(res, FEATURE_INFO[feature].scope);
  };

  const tasks: Promise<void>[] = [];
  let wallet: [number, number][] | null = null;
  let knownRecipes: number[] | null = null;
  let armory: [number, number][] | null = null;
  let crafting: AccountData['crafting'] = null;

  if (need('materials')) {
    tasks.push(
      apiGet<(Slot & { category?: number })[]>(buildUrl('account/materials', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('materials', r);
        r.data.forEach((s) => s.count > 0 && add(s.id, s.count, 0));
      }),
    );
  }
  if (need('bank')) {
    tasks.push(
      apiGet<(Slot | null)[]>(buildUrl('account/bank', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('bank', r);
        r.data.forEach((s) => s && add(s.id, s.count, 1));
      }),
    );
  }
  if (need('shared')) {
    tasks.push(
      apiGet<(Slot | null)[]>(buildUrl('account/inventory', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('shared', r);
        r.data.forEach((s) => s && add(s.id, s.count, 2));
      }),
    );
  }
  if (need('characters')) {
    tasks.push(
      apiGet<ApiCharacter[]>(buildUrl('characters', { ids: 'all' }, key)).then((r) => {
        if (!r.ok || !r.data) return failed('characters', r);
        const best: NonNullable<AccountData['crafting']> = {};
        for (const c of r.data) {
          for (const cr of c.crafting ?? []) {
            if (!best[cr.discipline] || cr.rating > best[cr.discipline].rating) {
              best[cr.discipline] = { rating: cr.rating, character: c.name };
            }
          }
          if (can('inventories')) {
            for (const bag of c.bags ?? []) {
              for (const s of bag?.inventory ?? []) if (s) add(s.id, s.count, 3);
            }
          }
        }
        crafting = best;
      }),
    );
  }
  if (need('wallet')) {
    tasks.push(
      apiGet<{ id: number; value: number }[]>(buildUrl('account/wallet', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('wallet', r);
        wallet = r.data.map((w) => [w.id, w.value]);
      }),
    );
  }
  if (need('recipes')) {
    tasks.push(
      apiGet<number[]>(buildUrl('account/recipes', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('recipes', r);
        knownRecipes = r.data;
      }),
    );
  }
  if (need('armory')) {
    tasks.push(
      apiGet<{ id: number; count: number }[]>(buildUrl('account/legendaryarmory', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('armory', r);
        armory = r.data.map((a) => [a.id, a.count]);
      }),
    );
  }
  await Promise.all(tasks);

  const stock: [number, number][] = Object.entries(breakdown).map(([id, b]) => [Number(id), b[0] + b[1] + b[2] + b[3]]);
  const data: AccountData = {
    syncedAt: Date.now(),
    accountName: tokenRes.data.name,
    permissions,
    stock,
    breakdown,
    wallet,
    knownRecipes,
    armory,
    crafting,
    errors,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (crafting) {
      progressActions.syncAccountRatings(crafting);
    }
  } catch (e) {
    console.error('Account-Cache konnte nicht gespeichert werden', e);
  }
  setState(derive(data, 'ready'));
}

export function clearAccountData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorieren */
  }
  setState(derive(null, 'none'));
}

/** Lädt nur, wenn ein Schlüssel vorhanden und der Stand älter als `maxAgeMs` ist. */
export async function syncIfStale(apiKey: string | undefined, maxAgeMs = 15 * 60 * 1000): Promise<void> {
  if (!apiKey?.trim()) return;
  if (state.status === 'loading') return;
  if (state.data && Date.now() - state.data.syncedAt < maxAgeMs) return;
  try {
    await syncAccountData(apiKey);
  } catch {
    /* Fehler werden über den Zustand/Banner angezeigt */
  }
}
