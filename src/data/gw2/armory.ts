/**
 * Legendäre Rüstkammer (öffentliche Liste, offizielle API /v2/legendaryarmory).
 * Dient dazu, offiziell bekannte legendäre Waffen zu erkennen, die im Community-Datensatz fehlen
 * (werden in der UI als „Rezept nicht erfasst“ geführt statt erfunden zu werden).
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { apiGet, buildUrl } from './client';
import { cacheGet, cacheSet, createEmitter } from './cache';
import { ensureItems, getItem, useItems } from './items';

const CACHE_KEY = 'armory-ids:v1';
const TTL_MS = 7 * 24 * 3600 * 1000;
const emitter = createEmitter();

interface State {
  status: 'idle' | 'loading' | 'ready' | 'error';
  ids: number[];
  error: string | null;
  version: number;
}
let state: State = { status: 'idle', ids: [], error: null, version: 0 };
let loading: Promise<void> | null = null;

function set(p: Partial<State>) {
  state = { ...state, ...p, version: state.version + 1 };
  emitter.emit();
}

export function loadArmoryIds(): Promise<void> {
  if (loading) return loading;
  if (state.status === 'ready') return Promise.resolve();
  loading = (async () => {
    set({ status: 'loading', error: null });
    try {
      const cached = await cacheGet<number[]>(CACHE_KEY);
      let ids: number[] | null = cached && Date.now() - cached.savedAt < TTL_MS ? cached.value : null;
      if (!ids) {
        const res = await apiGet<{ id: number }[]>(buildUrl('legendaryarmory'));
        if (res.ok && res.data) {
          ids = res.data.map((e) => e.id);
          await cacheSet(CACHE_KEY, ids);
        } else if (cached) ids = cached.value;
        else throw new Error(res.error ?? 'Rüstkammer-Liste nicht verfügbar');
      }
      await ensureItems(ids);
      set({ status: 'ready', ids });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Offizielle Rüstkammer-Waffen (Item-Typ „Weapon“, Rarität „Legendary“) */
export function useArmoryWeapons(): { id: number; name: string; type: string }[] {
  const s = useSyncExternalStore(emitter.subscribe, () => state);
  useEffect(() => {
    if (s.status === 'idle') void loadArmoryIds();
  }, [s.status]);
  const { version } = useItems(s.ids);
  return useMemo(() => {
    const out: { id: number; name: string; type: string }[] = [];
    for (const id of s.ids) {
      const it = getItem(id);
      if (it && it.type === 'Weapon' && it.weaponType) out.push({ id, name: it.name, type: it.weaponType });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ids, version]);
}
