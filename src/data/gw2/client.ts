/**
 * Shared client for official GW2 API (https://api.guildwars2.com/v2).
 *
 *  - utilizes the existing transport `gw2ApiGet` (Electron IPC or browser fetch)
 *  - limits concurrency and throughput (API rate limit: 600 requests/minute)
 *  - deduplicates identical ongoing requests
 *  - retries on 429/5xx/network errors with backoff
 *  - loads large ID lists in batches of 200 (API maximum)
 */
export const API_BASE = 'https://api.guildwars2.com/v2';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function gw2ApiGet<T>(url: string): Promise<ApiResult<T>> {
  const electronApi = (window as unknown as {
    electronAPI?: { fetchGw2Api?: (u: string) => Promise<ApiResult<T>> };
  }).electronAPI;

  if (electronApi?.fetchGw2Api) {
    return await electronApi.fetchGw2Api(url);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      let errText = res.statusText;
      try {
        const j = await res.json();
        if (j && j.text) errText = j.text;
      } catch (e) {}
      return { ok: false, status: res.status, error: errText };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Netzwerkfehler';
    return { ok: false, status: 0, error: msg };
  }
}

const MAX_CONCURRENT = 4;
const MIN_INTERVAL_MS = 130; // ~460 Anfragen/Minute, bleibt unter dem Limit
let active = 0;
let lastStart = 0;
const waiters: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((res) => waiters.push(res));
  active++;
  const wait = lastStart + MIN_INTERVAL_MS - Date.now();
  lastStart = Math.max(Date.now(), lastStart + MIN_INTERVAL_MS);
  if (wait > 0) await sleep(wait);
}
function release(): void {
  active--;
  waiters.shift()?.();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const inflight = new Map<string, Promise<ApiResult<unknown>>>();

export interface GetOptions {
  token?: string;
  retries?: number;
}

export function buildUrl(path: string, query: Record<string, string | number | undefined> = {}, token?: string): string {
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%2C/g, ',')}`);
  if (token) q.push(`access_token=${encodeURIComponent(token.trim())}`);
  return `${API_BASE}/${path}${q.length ? `?${q.join('&')}` : ''}`;
}

export function apiGet<T>(url: string, opts: GetOptions = {}): Promise<ApiResult<T>> {
  const existing = inflight.get(url);
  if (existing) return existing as Promise<ApiResult<T>>;
  const p = (async () => {
    const retries = opts.retries ?? 3;
    let last: ApiResult<T> = { ok: false, status: 0, error: 'unbekannt' };
    for (let attempt = 0; attempt <= retries; attempt++) {
      await acquire();
      try {
        last = await gw2ApiGet<T>(url);
      } finally {
        release();
      }
      if (last.ok) return last;
      const retryable = last.status === 0 || last.status === 429 || last.status >= 500;
      if (!retryable || attempt === retries) break;
      await sleep((last.status === 429 ? 2000 : 600) * 2 ** attempt);
    }
    return last;
  })().finally(() => inflight.delete(url));
  inflight.set(url, p as Promise<ApiResult<unknown>>);
  return p;
}

export interface BatchResult<T> {
  items: T[];
  /** Error if a batch ultimately failed (404 = unknown IDs is NOT considered an error) */
  error?: string;
}

/** Loads `endpoint?ids=…` in batches. 404/206 (unknown IDs) are tolerated. */
export async function fetchByIds<T>(
  endpoint: string,
  ids: readonly (number | string)[],
  query: Record<string, string | number | undefined> = {},
  token?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchResult<T>> {
  const unique = [...new Set(ids)];
  const chunks: (number | string)[][] = [];
  for (let i = 0; i < unique.length; i += 200) chunks.push(unique.slice(i, i + 200));
  const out: T[] = [];
  let error: string | undefined;
  let done = 0;
  await Promise.all(
    chunks.map(async (chunk) => {
      const res = await apiGet<T[]>(buildUrl(endpoint, { ...query, ids: chunk.join(',') }, token));
      if (res.ok && Array.isArray(res.data)) out.push(...res.data);
      else if (res.status !== 404) error = res.error ?? `HTTP ${res.status}`;
      done++;
      onProgress?.(done, chunks.length);
    }),
  );
  return { items: out, error };
}

/** Human-readable error message for an API error */
export function describeApiError(res: { status: number; error?: string }, scope?: string): string {
  if (res.status === 401) return 'API-Schlüssel ungültig oder abgelaufen.';
  if (res.status === 403) {
    return scope
      ? `Dem API-Schlüssel fehlt die Berechtigung „${scope}“.`
      : 'Dem API-Schlüssel fehlt eine benötigte Berechtigung.';
  }
  if (res.status === 429) return 'Zu viele Anfragen an die GW2-API (Rate-Limit). Bitte kurz warten.';
  if (res.status === 0) return 'Keine Verbindung zur GW2-API (offline oder blockiert).';
  if (res.status >= 500) return 'Die GW2-API ist derzeit nicht erreichbar (Serverfehler).';
  return res.error || `API-Fehler (${res.status})`;
}
