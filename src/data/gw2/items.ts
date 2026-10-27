/**
 * Item data (official API /v2/items). Persistently cached, loaded in batches, deduplicated.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { GameItem, Rarity } from '../../domain/types';
import { fetchByIds } from './client';
import { cacheGet, cacheSet, createEmitter } from './cache';
import type { Language } from '../../types.ts';
import { registerLanguageChangeHandler } from '../../i18n/index.ts';

let currentLang: Language = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('gw2_overlay_lang') : null;
    if (saved === 'en' || saved === 'de') return saved;
  } catch {
    /* ignore */
  }
  return 'en';
})();

registerLanguageChangeHandler((newLang) => {
  void setItemLanguage(newLang);
});

function getCacheKey(lang: Language): string {
  return `items:${lang}:v1`;
}

export const LANG = currentLang;
const TTL_MS = 14 * 24 * 3600 * 1000;

interface ApiItem {
  id: number;
  name: string;
  icon?: string;
  rarity: Rarity;
  type: string;
  level: number;
  description?: string;
  flags?: string[];
  vendor_value?: number;
  chat_link?: string;
  details?: { type?: string };
}

const items = new Map<number, GameItem>();
const missing = new Set<number>();
const requested = new Set<number>();
const emitter = createEmitter();
let version = 0;
let loadError: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getItemLanguage(): Language {
  return currentLang;
}

export async function setItemLanguage(lang: Language): Promise<void> {
  if (currentLang === lang) return;
  currentLang = lang;
  items.clear();
  missing.clear();
  requested.clear();
  const entry = await cacheGet<{ items: GameItem[]; missing: number[] }>(getCacheKey(lang));
  if (entry && Date.now() - entry.savedAt < TTL_MS) {
    entry.value.items.forEach((i) => items.set(i.id, i));
    entry.value.missing.forEach((i) => missing.add(i));
  }
  version++;
  emitter.emit();
}

const ready: Promise<void> = (async () => {
  const entry = await cacheGet<{ items: GameItem[]; missing: number[] }>(getCacheKey(currentLang));
  if (entry && Date.now() - entry.savedAt < TTL_MS) {
    entry.value.items.forEach((i) => items.set(i.id, i));
    entry.value.missing.forEach((i) => missing.add(i));
    version++;
    emitter.emit();
  }
})();

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void cacheSet(getCacheKey(currentLang), { items: [...items.values()], missing: [...missing] });
  }, 1500);
}

function convert(a: ApiItem): GameItem {
  return {
    id: a.id,
    name: a.name,
    icon: a.icon,
    rarity: a.rarity,
    type: a.type,
    level: a.level,
    description: a.description,
    flags: a.flags ?? [],
    vendorValue: a.vendor_value ?? 0,
    weaponType: a.type === 'Weapon' ? a.details?.type : undefined,
    chatLink: a.chat_link,
  };
}

let batchQueue: number[] = [];
let batchPromise: Promise<void> | null = null;

export async function ensureItems(ids: readonly number[]): Promise<void> {
  await ready;
  const need = ids.filter((id) => id > 0 && !items.has(id) && !missing.has(id) && !requested.has(id));
  if (!need.length) return;
  need.forEach((id) => {
    requested.add(id);
    batchQueue.push(id);
  });

  if (!batchPromise) {
    batchPromise = Promise.resolve().then(async () => {
      const toFetch = [...new Set(batchQueue)];
      batchQueue = [];
      batchPromise = null;
      if (!toFetch.length) return;
      const res = await fetchByIds<ApiItem>('items', toFetch, { lang: currentLang });
      res.items.forEach((a) => items.set(a.id, convert(a)));
      if (res.error) {
        loadError = res.error;
        toFetch.forEach((id) => requested.delete(id)); // retry later
      } else {
        loadError = null;
        toFetch.filter((id) => !items.has(id)).forEach((id) => missing.add(id));
      }
      version++;
      scheduleSave();
      emitter.emit();
    });
  }
  return batchPromise;
}

export function getItem(id: number): GameItem | undefined {
  return items.get(id);
}
export function getAllItems(): ReadonlyMap<number, GameItem> {
  return items;
}
export function itemLoadError(): string | null {
  return loadError;
}

export function useItems(ids: readonly number[]): {
  get: (id: number) => GameItem | undefined;
  map: ReadonlyMap<number, GameItem>;
  error: string | null;
  version: number;
} {
  const v = useSyncExternalStore(emitter.subscribe, () => version);
  const key = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(','), [ids]);
  useEffect(() => {
    if (key) void ensureItems(key.split(',').map(Number));
  }, [key]);
  return { get: getItem, map: items, error: loadError, version: v };
}

/** GW2-Beschreibungen enthalten Markup (<c=@flavor>…</c>, <br>) */
export function cleanDescription(desc: string | undefined): string {
  if (!desc) return '';
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?c(=@?[\w#]+)?>/gi, '')
    .replace(/\u0007/g, '• ')
    .trim();
}
