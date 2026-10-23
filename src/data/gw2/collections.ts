/**
 * Sammlungs-Erfolge legendärer Waffen (offizielle API: Erfolgskategorie "Legendäre Waffen" + /v2/achievements).
 * Zuordnung zur Waffe über den englischen Namen ("Sunrise I: …"). Persönlicher Fortschritt kommt aus
 * /v2/account/achievements (Berechtigung "progression"), das die App bereits abruft.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { apiGet, buildUrl, fetchByIds } from './client';
import { cacheGet, cacheSet, createEmitter } from './cache';
import { LANG } from './items';

export interface CollectionAchievement {
  id: number;
  nameEn: string;
  name: string;
  description: string;
  requirement: string;
  /** Anzahl Teilziele laut Erfolgsdefinition (bits) bzw. Schwellwert */
  total: number;
}

interface ApiAchievement {
  id: number;
  name: string;
  description?: string;
  requirement?: string;
  bits?: unknown[];
  tiers?: { count: number }[];
}
interface ApiCategory {
  id: number;
  name: string;
  achievements: number[];
}

const CACHE_KEY = `collections:${LANG}:v1`;
const TTL_MS = 14 * 24 * 3600 * 1000;
const emitter = createEmitter();

interface State {
  status: 'idle' | 'loading' | 'ready' | 'error';
  list: CollectionAchievement[];
  error: string | null;
}
let state: State = { status: 'idle', list: [], error: null };
let loading: Promise<void> | null = null;

function set(p: Partial<State>) {
  state = { ...state, ...p };
  emitter.emit();
}

const clean = (s: string | undefined) => (s ?? '').replace(/<\/?c(=@?[\w#]+)?>/gi, '').replace(/<br\s*\/?>/gi, ' ');

export function loadCollections(): Promise<void> {
  if (loading) return loading;
  if (state.status === 'ready') return Promise.resolve();
  loading = (async () => {
    set({ status: 'loading', error: null });
    try {
      const cached = await cacheGet<CollectionAchievement[]>(CACHE_KEY);
      if (cached && Date.now() - cached.savedAt < TTL_MS) {
        set({ status: 'ready', list: cached.value });
        return;
      }
      let cat: ApiCategory | undefined;
      const direct = await apiGet<ApiCategory>(buildUrl('achievements/categories/114', { lang: 'en' }));
      if (direct.ok && direct.data && /legendary weapons/i.test(direct.data.name)) cat = direct.data;
      if (!cat) {
        const all = await fetchByIds<ApiCategory>('achievements/categories', ['all'], { lang: 'en' });
        cat = all.items.find((c) => /^legendary weapons$/i.test(c.name));
      }
      if (!cat) throw new Error('Erfolgskategorie „Legendäre Waffen“ wurde in der API nicht gefunden.');
      const [en, local] = await Promise.all([
        fetchByIds<ApiAchievement>('achievements', cat.achievements, { lang: 'en' }),
        fetchByIds<ApiAchievement>('achievements', cat.achievements, { lang: LANG }),
      ]);
      if (en.error && !en.items.length) throw new Error(en.error);
      const localById = new Map(local.items.map((a) => [a.id, a]));
      const list: CollectionAchievement[] = en.items.map((a) => {
        const l = localById.get(a.id) ?? a;
        return {
          id: a.id,
          nameEn: a.name,
          name: l.name,
          description: clean(l.description),
          requirement: clean(l.requirement),
          total: a.bits?.length ?? a.tiers?.[a.tiers.length - 1]?.count ?? 0,
        };
      });
      await cacheSet(CACHE_KEY, list);
      set({ status: 'ready', list });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function useCollections(): State {
  const s = useSyncExternalStore(emitter.subscribe, () => state);
  useEffect(() => {
    if (s.status === 'idle') void loadCollections();
  }, [s.status]);
  return s;
}
