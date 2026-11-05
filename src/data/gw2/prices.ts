/**
 * Trading Post prices (official API /v2/commerce/prices).
 * Uses Stale-While-Revalidate: hydrates immediately from persistent IndexedDB cache (`prices:v1`)
 * for instant 0ms UI rendering on startup, then refreshes in the background after TTL (5 min).
 * Streams 200-ID chunks progressively as each batch resolves.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { PriceInfo } from '../../domain/types.ts';
import { fetchByIds } from './client.ts';
import { cacheGet, cacheSet, createEmitter } from './cache.ts';

interface ApiPrice {
  id: number;
  buys: { quantity: number; unit_price: number };
  sells: { quantity: number; unit_price: number };
}

const CACHE_KEY = 'prices:v1';
const TTL_MS = 5 * 60 * 1000;
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const prices = new Map<number, PriceInfo>();
let pricesSnapshot: ReadonlyMap<number, PriceInfo> = new Map();
const fetchedAt = new Map<number, number>();
const inFlightIds = new Set<number>();
const emitter = createEmitter();
let version = 0;
let lastError: string | null = null;
let lastUpdate = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function bumpVersion() {
  pricesSnapshot = new Map(prices);
  version++;
  emitter.emit();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void cacheSet(CACHE_KEY, {
      entries: [...prices.entries()],
      fetchedAt: [...fetchedAt.entries()],
      updatedAt: lastUpdate,
    });
  }, 1200);
}

const ready: Promise<void> = (async () => {
  const entry = await cacheGet<{
    entries: [number, PriceInfo][];
    fetchedAt?: [number, number][];
    updatedAt?: number;
  }>(CACHE_KEY);
  if (entry && Date.now() - entry.savedAt < STALE_MAX_AGE_MS && Array.isArray(entry.value?.entries)) {
    for (const [id, info] of entry.value.entries) {
      if (!prices.has(id)) prices.set(id, info);
    }
    if (Array.isArray(entry.value.fetchedAt) && Date.now() - entry.savedAt < TTL_MS) {
      for (const [id, ts] of entry.value.fetchedAt) {
        if (!fetchedAt.has(id)) fetchedAt.set(id, ts);
      }
    }
    if (entry.value.updatedAt && !lastUpdate) {
      lastUpdate = entry.value.updatedAt;
    }
    bumpVersion();
  }
})();

export function isPriceLoading(id: number): boolean {
  return inFlightIds.has(id) && !prices.has(id);
}

export async function ensurePrices(ids: readonly number[], force = false): Promise<void> {
  await ready;
  const now = Date.now();
  const need = [...new Set(ids)].filter(
    (id) => id > 0 && !inFlightIds.has(id) && (force || now - (fetchedAt.get(id) ?? 0) > TTL_MS),
  );
  if (!need.length) return;
  need.forEach((id) => {
    fetchedAt.set(id, now);
    inFlightIds.add(id);
  });

  const res = await fetchByIds<ApiPrice>(
    'commerce/prices',
    need,
    {},
    undefined,
    undefined,
    (chunkItems, chunkIds) => {
      for (const p of chunkItems) {
        prices.set(p.id, {
          sell: p.sells?.unit_price ?? 0,
          buy: p.buys?.unit_price ?? 0,
          sellQty: p.sells?.quantity ?? 0,
          buyQty: p.buys?.quantity ?? 0,
        });
      }
      for (const rawId of chunkIds) {
        inFlightIds.delete(Number(rawId));
      }
      if (chunkItems.length > 0) {
        lastUpdate = Date.now();
      }
      bumpVersion();
    },
  );

  for (const id of need) {
    inFlightIds.delete(id);
  }
  if (res.error) {
    lastError = res.error;
    need.forEach((id) => fetchedAt.delete(id));
  } else {
    lastError = null;
    lastUpdate = Date.now();
    scheduleSave();
  }
  bumpVersion();
}

export function getPrice(id: number): PriceInfo | undefined {
  return prices.get(id);
}

export function usePrices(ids: readonly number[]): {
  map: ReadonlyMap<number, PriceInfo>;
  error: string | null;
  updatedAt: number;
  version: number;
  refresh: () => void;
} {
  const ver = useSyncExternalStore(emitter.subscribe, () => version);
  const key = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(','), [ids]);
  useEffect(() => {
    if (key) void ensurePrices(key.split(',').map(Number));
  }, [key]);
  return {
    map: pricesSnapshot,
    error: lastError,
    updatedAt: lastUpdate,
    version: ver,
    refresh: () => key && void ensurePrices(key.split(',').map(Number), true),
  };
}
