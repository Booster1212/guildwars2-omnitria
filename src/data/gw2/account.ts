/**
 * Personal account data (requires an API key with appropriate permissions).
 *
 *   Feature                      Endpoint                        Permission
 *   Material Storage             /v2/account/materials           inventories
 *   Bank                         /v2/account/bank                inventories
 *   Shared Inventory             /v2/account/inventory           inventories
 *   Character Bags/Crafting      /v2/characters?ids=all          characters (+ inventories for bags)
 *   Wallet                       /v2/account/wallet              wallet
 *   Known Recipes                /v2/account/recipes             unlocks
 *   Legendary Armory             /v2/account/legendaryarmory     unlocks
 *
 * Missing permissions are reported per feature; remaining data is still loaded.
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

export interface AccountCharacterDiscipline {
  discipline: string;
  rating: number;
  active: boolean;
}

export interface AccountCharacter {
  name: string;
  race?: string;
  gender?: string;
  profession: string;
  level: number;
  age?: number;
  created?: string;
  deaths?: number;
  guild?: string;
  crafting: AccountCharacterDiscipline[];
  bagCount: number;
  bagSlotsTotal: number;
  bagSlotsUsed: number;
  /** Item stacks inside this character's inventory bags: [itemId, count][] */
  bagItems: [number, number][];
  /** Equipped items on this character: [itemId, slot][] */
  equipment?: [number, string][];
}

export interface AccountData {
  syncedAt: number;
  accountName?: string;
  permissions: string[];
  /** Official /v2/account expansion/content access flags (e.g. HeartOfThorns, PathOfFire, EndOfDragons, SecretsOfTheObscure, JanthirWilds) */
  access?: string[] | null;
  /** Total inventory per item ID across material storage, bank, shared inventory, and character bags */
  stock: [number, number][];
  /** Breakdown per item: [materialStorage, bank, shared, characters] */
  breakdown: Record<number, [number, number, number, number]>;
  /** Per-character bag inventory quantities per item ID: itemId -> { characterName: count } */
  characterBreakdown?: Record<number, Record<string, number>>;
  /** Character summaries from /v2/characters?ids=all */
  characters?: AccountCharacter[] | null;
  wallet: [number, number][] | null;
  knownRecipes: number[] | null;
  armory: [number, number][] | null;
  crafting: Record<string, { rating: number; character: string }> | null;
  errors: Partial<Record<AccountFeature, string>>;
}

export interface AccountState {
  status: 'none' | 'loading' | 'ready';
  data: AccountData | null;
  /** Derived structures for fast access */
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
  id?: number;
  size?: number;
  inventory?: (Slot | null)[];
}
interface ApiEquipmentSlot {
  id: number;
  slot?: string;
  binding?: string;
}
interface ApiCharacter {
  name: string;
  race?: string;
  gender?: string;
  profession?: string;
  level?: number;
  age?: number;
  created?: string;
  deaths?: number;
  guild?: string;
  crafting?: { discipline: string; rating: number; active: boolean }[];
  bags?: (ApiBag | null)[];
  equipment?: (ApiEquipmentSlot | null)[];
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
  const characterBreakdown: NonNullable<AccountData['characterBreakdown']> = {};
  const add = (id: number, count: number, idx: 0 | 1 | 2 | 3) => {
    if (!id || count <= 0) return;
    const b = (breakdown[id] ??= [0, 0, 0, 0]);
    b[idx] += count;
  };
  const addCharacterItem = (id: number, count: number, characterName: string) => {
    if (!id || count <= 0 || !characterName) return;
    add(id, count, 3);
    const map = (characterBreakdown[id] ??= {});
    map[characterName] = (map[characterName] ?? 0) + count;
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
      errors[feature] = `Missing "${scope}" permission in API key.`;
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
  let characters: AccountCharacter[] | null = null;
  let access: string[] | null = null;

  if (can('account')) {
    tasks.push(
      apiGet<{ access?: string[] }>(buildUrl('account', {}, key)).then((r) => {
        if (r.ok && r.data && Array.isArray(r.data.access)) {
          access = r.data.access;
        }
      }),
    );
  }

  if (need('materials')) {
    tasks.push(
      apiGet<(Slot & { category?: number })[]>(buildUrl('account/materials', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('materials', r);
        r.data.forEach((s) => s && s.count > 0 && add(s.id, s.count, 0));
      }),
    );
  }
  if (need('bank')) {
    tasks.push(
      apiGet<(Slot | null)[]>(buildUrl('account/bank', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('bank', r);
        r.data.forEach((s) => s && s.count > 0 && add(s.id, s.count, 1));
      }),
    );
  }
  if (need('shared')) {
    tasks.push(
      apiGet<(Slot | null)[]>(buildUrl('account/inventory', {}, key)).then((r) => {
        if (!r.ok || !r.data) return failed('shared', r);
        r.data.forEach((s) => s && s.count > 0 && add(s.id, s.count, 2));
      }),
    );
  }
  if (need('characters')) {
    tasks.push(
      apiGet<ApiCharacter[]>(buildUrl('characters', { ids: 'all' }, key)).then(async (r) => {
        if (!r.ok || !r.data) return failed('characters', r);
        const best: NonNullable<AccountData['crafting']> = {};
        const charList: AccountCharacter[] = [];

        for (const c of r.data) {
          if (!c || !c.name) continue;
          const charCrafting: AccountCharacterDiscipline[] = [];
          for (const cr of c.crafting ?? []) {
            if (!cr || !cr.discipline) continue;
            charCrafting.push({
              discipline: cr.discipline,
              rating: cr.rating ?? 0,
              active: Boolean(cr.active),
            });
            if (!best[cr.discipline] || cr.rating > best[cr.discipline].rating) {
              best[cr.discipline] = { rating: cr.rating, character: c.name };
            }
          }

          let rawBags = c.bags;
          if (can('inventories') && rawBags === undefined) {
            const invRes = await apiGet<{ bags?: (ApiBag | null)[] }>(
              buildUrl(`characters/${encodeURIComponent(c.name)}/inventory`, {}, key),
            );
            if (invRes.ok && invRes.data?.bags) {
              rawBags = invRes.data.bags;
            }
          }

          let bagCount = 0;
          let bagSlotsTotal = 0;
          let bagSlotsUsed = 0;
          const charBagMap = new Map<number, number>();

          if (can('inventories') && Array.isArray(rawBags)) {
            for (const bag of rawBags) {
              if (!bag) continue;
              bagCount++;
              const inv = Array.isArray(bag.inventory) ? bag.inventory : [];
              bagSlotsTotal += typeof bag.size === 'number' && bag.size > 0 ? bag.size : inv.length;
              for (const s of inv) {
                if (s && s.id && s.count > 0) {
                  bagSlotsUsed++;
                  addCharacterItem(s.id, s.count, c.name);
                  charBagMap.set(s.id, (charBagMap.get(s.id) ?? 0) + s.count);
                }
              }
            }
          }

          const equipmentList: [number, string][] = [];
          if (Array.isArray(c.equipment)) {
            for (const eq of c.equipment) {
              if (eq && eq.id) {
                equipmentList.push([eq.id, eq.slot ?? 'Equipped']);
              }
            }
          }

          charList.push({
            name: c.name,
            race: c.race,
            gender: c.gender,
            profession: c.profession ?? 'Unknown',
            level: c.level ?? 80,
            age: c.age,
            created: c.created,
            deaths: c.deaths,
            guild: c.guild,
            crafting: charCrafting,
            bagCount,
            bagSlotsTotal,
            bagSlotsUsed,
            bagItems: Array.from(charBagMap.entries()),
            equipment: equipmentList.length > 0 ? equipmentList : undefined,
          });
        }
        crafting = best;
        characters = charList;
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
    access,
    stock,
    breakdown,
    characterBreakdown,
    characters,
    wallet,
    knownRecipes,
    armory,
    crafting,
    errors,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (crafting || characters) {
      progressActions.syncAccountRatings(crafting, characters);
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

/** Loads only if an API key is present and cached data is older than `maxAgeMs`. */
export async function syncIfStale(apiKey: string | undefined, maxAgeMs = 15 * 60 * 1000): Promise<void> {
  if (!apiKey?.trim()) return;
  if (state.status === 'loading') return;
  if (state.data && Date.now() - state.data.syncedAt < maxAgeMs) return;
  try {
    await syncAccountData(apiKey);
  } catch {
    /* Errors are surfaced via state/banner */
  }
}

/**
 * Resolves a character's crafting discipline rating and metadata.
 * If a specific character is selected, returns that character's discipline rating (or 0 if unlearned on that character).
 * Otherwise falls back to the highest account rating for that discipline.
 */
export function getCharacterDisciplineInfo(
  data: AccountData | null | undefined,
  characterName: string | null | undefined,
  discipline: string,
): { rating: number; character: string; active: boolean; isCharacterSpecific: boolean } | null {
  if (!data) return null;
  const trimmed = characterName?.trim();
  if (trimmed && Array.isArray(data.characters)) {
    const ch = data.characters.find((c) => c.name === trimmed);
    if (ch) {
      const cr = ch.crafting?.find((d) => d.discipline === discipline);
      return {
        rating: cr ? cr.rating : 0,
        character: ch.name,
        active: Boolean(cr?.active),
        isCharacterSpecific: true,
      };
    }
  }
  const best = data.crafting?.[discipline];
  if (best) {
    return {
      rating: best.rating,
      character: best.character,
      active: true,
      isCharacterSpecific: false,
    };
  }
  return null;
}

/**
 * Resolves the account's expansion/content access flags from AccountData or the gw2Api account cache.
 * Returns null if no API account data is available (i.e. expansion ownership is unknown).
 */
export function getAccountAccessList(data?: AccountData | null): string[] | null {
  if (data && Array.isArray(data.access) && data.access.length > 0) {
    return data.access;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('gw2_overlay_account_cache');
      if (raw) {
        const parsed = JSON.parse(raw) as { access?: string[] };
        if (parsed && Array.isArray(parsed.access) && parsed.access.length > 0) {
          return parsed.access;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
