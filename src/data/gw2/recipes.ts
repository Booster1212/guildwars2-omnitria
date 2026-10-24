/**
 * Offizielle Handwerksrezepte (/v2/recipes). Es gibt kein "ids=all": die ID-Liste wird einmal geladen,
 * danach in Blöcken à 200 (~66 Anfragen). Ergebnis wird kompakt in IndexedDB gehalten und nur bei neuer
 * Spielversion (/v2/build) oder nach 14 Tagen neu geladen.
 *
 * Hinweis: Mystische-Schmiede-Rezepte sind NICHT in dieser API (siehe docs/DATA_SOURCES.md).
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { Recipe } from '../../domain/types';
import { apiGet, buildUrl, fetchByIds, describeApiError } from './client';
import { cacheGet, cacheSet, createEmitter } from './cache';

export const DISCIPLINES = ['Armorsmith', 'Weaponsmith', 'Artificer', 'Jeweler', 'Leatherworker', 'Tailor', 'Chef', 'Huntsman'] as const;
const DISC_SET = new Set<string>(DISCIPLINES);
const CACHE_KEY = 'recipes:v1';
const TTL_MS = 14 * 24 * 3600 * 1000;

interface ApiRecipe {
  id: number;
  type: string;
  output_item_id: number;
  output_item_count: number;
  disciplines: string[];
  min_rating: number;
  flags: string[];
  ingredients: { item_id: number; count: number }[];
}

type Packed = [number, string, number, number, number, string[], string[], [number, number][]];

interface CachePayload {
  build: number | null;
  recipes: Packed[];
}

export interface RecipeDbState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: { done: number; total: number };
  error: string | null;
  recipes: Recipe[];
  byOutput: ReadonlyMap<number, Recipe[]>;
  loadedAt: number;
  fromCache: boolean;
}

const emitter = createEmitter();
let state: RecipeDbState = {
  status: 'idle',
  progress: { done: 0, total: 0 },
  error: null,
  recipes: [],
  byOutput: new Map(),
  loadedAt: 0,
  fromCache: false,
};
let loading: Promise<void> | null = null;

function set(next: Partial<RecipeDbState>) {
  state = { ...state, ...next };
  emitter.emit();
}

function unpack(p: Packed): Recipe {
  return {
    id: String(p[0]),
    outputId: p[2],
    outputCount: p[3],
    kind: 'official',
    disciplines: p[5].filter((d) => DISC_SET.has(d)),
    rating: p[4],
    ingredients: p[7].map(([itemId, count]) => ({ itemId, count })),
    source: 'official',
    flags: p[6],
    type: p[1],
  };
}

function index(packed: Packed[]): { recipes: Recipe[]; byOutput: Map<number, Recipe[]> } {
  const recipes = packed.map(unpack);
  const byOutput = new Map<number, Recipe[]>();
  for (const r of recipes) {
    const list = byOutput.get(r.outputId);
    if (list) list.push(r);
    else byOutput.set(r.outputId, [r]);
  }
  return { recipes, byOutput };
}

async function currentBuild(): Promise<number | null> {
  const r = await apiGet<{ id: number }>(buildUrl('build'));
  return r.ok && r.data ? r.data.id : null;
}

export function loadRecipeDb(force = false): Promise<void> {
  if (loading) return loading;
  if (state.status === 'ready' && !force) return Promise.resolve();
  loading = (async () => {
    set({ status: 'loading', error: null, progress: { done: 0, total: 0 } });
    try {
      const [cached, build] = await Promise.all([cacheGet<CachePayload>(CACHE_KEY), currentBuild()]);
      if (
        !force &&
        cached &&
        Date.now() - cached.savedAt < TTL_MS &&
        (build === null || cached.value.build === null || cached.value.build === build)
      ) {
        const idx = index(cached.value.recipes);
        set({ status: 'ready', ...idx, loadedAt: cached.savedAt, fromCache: true });
        return;
      }
      const idsRes = await apiGet<number[]>(buildUrl('recipes'));
      if (!idsRes.ok || !idsRes.data) {
        if (cached) {
          // Veraltete Daten sind besser als keine – mit Hinweis
          const idx = index(cached.value.recipes);
          set({
            status: 'ready',
            ...idx,
            loadedAt: cached.savedAt,
            fromCache: true,
            error: `Aktualisierung fehlgeschlagen (${describeApiError(idsRes)}) – zwischengespeicherte Rezepte werden verwendet.`,
          });
          return;
        }
        throw new Error(describeApiError(idsRes));
      }
      const res = await fetchByIds<ApiRecipe>('recipes', idsRes.data, {}, undefined, (done, total) =>
        set({ progress: { done, total } }),
      );
      if (res.error && res.items.length < idsRes.data.length * 0.9) {
        throw new Error(`Rezepte unvollständig geladen: ${res.error}`);
      }
      const packed: Packed[] = res.items
        .filter((r) => r.disciplines.some((d) => DISC_SET.has(d)))
        .map((r) => [
          r.id,
          r.type,
          r.output_item_id,
          r.output_item_count,
          r.min_rating,
          r.disciplines,
          r.flags,
          r.ingredients.map((i) => [i.item_id, i.count] as [number, number]),
        ]);
      await cacheSet<CachePayload>(CACHE_KEY, { build, recipes: packed });
      set({ status: 'ready', ...index(packed), loadedAt: Date.now(), fromCache: false });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function useRecipeDb(autoLoad = true): RecipeDbState & { reload: () => void } {
  const s = useSyncExternalStore(emitter.subscribe, () => state);
  useEffect(() => {
    if (autoLoad && s.status === 'idle') void loadRecipeDb();
  }, [autoLoad, s.status]);
  return { ...s, reload: () => void loadRecipeDb(true) };
}
