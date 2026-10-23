/**
 * Persistenter Cache für statische Spieldaten (IndexedDB) mit Fallback auf Speicher.
 * Persönliche Fortschritte liegen NICHT hier, sondern in progressStore (localStorage + Datei-Spiegel).
 */
const DB_NAME = 'gw2-overlay-cache';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, { value: unknown; savedAt: number }>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export interface CacheEntry<T> {
  value: T;
  savedAt: number;
}

export async function cacheGet<T>(key: string): Promise<CacheEntry<T> | undefined> {
  const db = await openDb();
  if (!db) return memory.get(key) as CacheEntry<T> | undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as CacheEntry<T> | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  const entry = { value, savedAt: Date.now() };
  const db = await openDb();
  if (!db) {
    memory.set(key, entry);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        memory.set(key, entry);
        resolve();
      };
    } catch {
      memory.set(key, entry);
      resolve();
    }
  });
}

export async function cacheDelete(key: string): Promise<void> {
  memory.delete(key);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Minimaler externer Store für useSyncExternalStore */
export function createEmitter() {
  const listeners = new Set<() => void>();
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit() {
      listeners.forEach((l) => l());
    },
  };
}
