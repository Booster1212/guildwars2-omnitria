/**
 * Handelsgesellschafts-Preise (offizielle API /v2/commerce/prices). Kurzzeit-Cache (5 Min.).
 * Nicht handelbare IDs liefern 404/fehlen im Ergebnis und werden als "kein Preis" gemerkt.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { PriceInfo } from '../../domain/types';
import { fetchByIds } from './client';
import { createEmitter } from './cache';

interface ApiPrice {
  id: number;
  buys: { quantity: number; unit_price: number };
  sells: { quantity: number; unit_price: number };
}

const TTL_MS = 5 * 60 * 1000;
const prices = new Map<number, PriceInfo>();
const fetchedAt = new Map<number, number>();
const emitter = createEmitter();
let version = 0;
let lastError: string | null = null;
let lastUpdate = 0;

export async function ensurePrices(ids: readonly number[], force = false): Promise<void> {
  const now = Date.now();
  const need = [...new Set(ids)].filter((id) => id > 0 && (force || now - (fetchedAt.get(id) ?? 0) > TTL_MS));
  if (!need.length) return;
  need.forEach((id) => fetchedAt.set(id, now)); // verhindert Doppelabfragen während des Ladens
  const res = await fetchByIds<ApiPrice>('commerce/prices', need);
  res.items.forEach((p) =>
    prices.set(p.id, {
      sell: p.sells?.unit_price ?? 0,
      buy: p.buys?.unit_price ?? 0,
      sellQty: p.sells?.quantity ?? 0,
      buyQty: p.buys?.quantity ?? 0,
    }),
  );
  if (res.error) {
    lastError = res.error;
    need.forEach((id) => fetchedAt.delete(id));
  } else {
    lastError = null;
    lastUpdate = Date.now();
  }
  version++;
  emitter.emit();
}

export function getPrice(id: number): PriceInfo | undefined {
  return prices.get(id);
}

export function usePrices(ids: readonly number[]): {
  map: ReadonlyMap<number, PriceInfo>;
  error: string | null;
  updatedAt: number;
  refresh: () => void;
} {
  useSyncExternalStore(emitter.subscribe, () => version);
  const key = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(','), [ids]);
  useEffect(() => {
    if (key) void ensurePrices(key.split(',').map(Number));
  }, [key]);
  return {
    map: prices,
    error: lastError,
    updatedAt: lastUpdate,
    refresh: () => key && void ensurePrices(key.split(',').map(Number), true),
  };
}
