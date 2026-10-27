/**
 * WvW Data Service
 *
 * Manages fetching, caching, and periodic polling of official
 * Guild Wars 2 WvW-API-Daten (/v2/wvw/matches, /v2/wvw/objectives, /v2/worlds, /v2/guild).
 */

import { apiGet, buildUrl } from '../client.ts';
import { cacheGet, cacheSet, createEmitter } from '../cache.ts';
import type {
  WvwMatch,
  WvwStaticObjective,
  WvwWorld,
  WvwGuild,
  WvwCombinedObjective,
  WvwObservedFlip,
  WvwObjectiveOwner,
} from './types.ts';
import { RI_DURATION_SECONDS } from './constants.ts';

const CACHE_KEY_OBJECTIVES_DE = 'wvw_static_objectives_de';
const CACHE_KEY_OBJECTIVES_EN = 'wvw_static_objectives_en';
const CACHE_KEY_WORLDS_DE = 'wvw_static_worlds_de';
const CACHE_KEY_WORLDS_EN = 'wvw_static_worlds_en';

// In-Memory-Speicher
let inMemoryObjectivesDe: Map<string, WvwStaticObjective> = new Map();
let inMemoryObjectivesEn: Map<string, WvwStaticObjective> = new Map();
let inMemoryWorldsDe: Map<number, WvwWorld> = new Map();
let inMemoryWorldsEn: Map<number, WvwWorld> = new Map();
const inMemoryGuilds: Map<string, WvwGuild> = new Map();

// Match-Zustand
let currentMatchId: string = '2-1'; // Default EU Match 1
let lastValidMatch: WvwMatch | null = null;
let lastSuccessfulFetch: Date | null = null;
let lastError: string | null = null;
let isFetchingMatch: boolean = false;

// Beobachtete Flips dieser Sitzung
let sessionFlips: WvwObservedFlip[] = [];

// Emitter for reactive subscriptions
const wvwEmitter = createEmitter();

// Polling-Timer
let pollIntervalMs: number = 30_000; // 30 Sekunden
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isPollingActive: boolean = false;

export interface WvwServiceSnapshot {
  matchId: string;
  match: WvwMatch | null;
  lastSuccessfulFetch: Date | null;
  lastError: string | null;
  isFetching: boolean;
  isPolling: boolean;
  pollIntervalMs: number;
  sessionFlips: WvwObservedFlip[];
  staticObjectivesCount: number;
  worldsCount: number;
}

// Referentially stable snapshot for useSyncExternalStore
let cachedSnapshot: WvwServiceSnapshot = {
  matchId: currentMatchId,
  match: null,
  lastSuccessfulFetch: null,
  lastError: null,
  isFetching: false,
  isPolling: false,
  pollIntervalMs: 30_000,
  sessionFlips: [],
  staticObjectivesCount: 0,
  worldsCount: 0,
};

function updateSnapshot(): void {
  cachedSnapshot = {
    matchId: currentMatchId,
    match: lastValidMatch,
    lastSuccessfulFetch,
    lastError,
    isFetching: isFetchingMatch,
    isPolling: isPollingActive,
    pollIntervalMs,
    sessionFlips,
    staticObjectivesCount: Math.max(inMemoryObjectivesDe.size, inMemoryObjectivesEn.size),
    worldsCount: Math.max(inMemoryWorldsDe.size, inMemoryWorldsEn.size),
  };
  wvwEmitter.emit();
}

/**
 * Fetches the list of all available match IDs.
 */
export async function fetchAvailableMatchIds(): Promise<string[]> {
  try {
    const res = await apiGet<string[]>(buildUrl('wvw/matches'));
    if (res.ok && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (e) {
    console.error('Fehler beim Abrufen der WvW-Matches-Liste:', e);
  }
  return ['2-1', '2-2', '2-3', '2-4', '2-5', '1-1', '1-2', '1-3', '1-4'];
}

/**
 * Loads all static objectives with coordinates and chat links (cached).
 */
export async function loadStaticObjectives(lang: 'de' | 'en' = 'de'): Promise<Map<string, WvwStaticObjective>> {
  const currentMap = lang === 'de' ? inMemoryObjectivesDe : inMemoryObjectivesEn;
  
  // 1. Bereits im Arbeitsspeicher?
  if (currentMap.size > 100) {
    return currentMap;
  }

  const cacheKey = lang === 'de' ? CACHE_KEY_OBJECTIVES_DE : CACHE_KEY_OBJECTIVES_EN;

  // 2. Im persistenten Cache (IndexedDB/Fallback)?
  try {
    const cached = await cacheGet<WvwStaticObjective[]>(cacheKey);
    if (cached && Array.isArray(cached.value) && cached.value.length > 50) {
      const map = new Map(cached.value.map((o) => [o.id, o]));
      if (lang === 'de') inMemoryObjectivesDe = map;
      else inMemoryObjectivesEn = map;
      updateSnapshot();
      return map;
    }
  } catch {
    /* Ignore cache errors */
  }

  // 3. Fetch from official API (/v2/wvw/objectives?ids=all&lang=...)
  try {
    const res = await apiGet<WvwStaticObjective[]>(buildUrl('wvw/objectives', { ids: 'all', lang }));
    if (res.ok && Array.isArray(res.data)) {
      const map = new Map(res.data.map((o) => [o.id, o]));
      if (lang === 'de') inMemoryObjectivesDe = map;
      else inMemoryObjectivesEn = map;
      void cacheSet(cacheKey, res.data);
      updateSnapshot();
      return map;
    }
  } catch (e) {
    console.warn(`Statische WvW-Ziele (${lang}) konnten nicht von API geladen werden:`, e);
  }

  return lang === 'de' ? inMemoryObjectivesDe : inMemoryObjectivesEn;
}

/**
 * Loads world names (e.g. Drakkar Lake, Kodash, etc.)
 */
export async function loadWorlds(lang: 'de' | 'en' = 'de'): Promise<Map<number, WvwWorld>> {
  const currentMap = lang === 'de' ? inMemoryWorldsDe : inMemoryWorldsEn;

  if (currentMap.size > 20) {
    return currentMap;
  }

  const cacheKey = lang === 'de' ? CACHE_KEY_WORLDS_DE : CACHE_KEY_WORLDS_EN;

  try {
    const cached = await cacheGet<WvwWorld[]>(cacheKey);
    if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
      const map = new Map(cached.value.map((w) => [w.id, w]));
      if (lang === 'de') inMemoryWorldsDe = map;
      else inMemoryWorldsEn = map;
      updateSnapshot();
      return map;
    }
  } catch {
    /* Ignore cache errors */
  }

  try {
    const res = await apiGet<WvwWorld[]>(buildUrl('worlds', { ids: 'all', lang }));
    if (res.ok && Array.isArray(res.data)) {
      const map = new Map(res.data.map((w) => [w.id, w]));
      if (lang === 'de') inMemoryWorldsDe = map;
      else inMemoryWorldsEn = map;
      void cacheSet(cacheKey, res.data);
      updateSnapshot();
      return map;
    }
  } catch (e) {
    console.warn(`WvW-Welten (${lang}) konnten nicht geladen werden:`, e);
  }

  return lang === 'de' ? inMemoryWorldsDe : inMemoryWorldsEn;
}

/**
 * Loads guild information for a claimed objective (name + tag).
 */
export async function getGuildInfo(guildId: string): Promise<WvwGuild | null> {
  if (!guildId) return null;
  const existing = inMemoryGuilds.get(guildId);
  if (existing) return existing;

  try {
    const res = await apiGet<{ id: string; name: string; tag: string }>(buildUrl(`guild/${guildId}`));
    if (res.ok && res.data) {
      const g: WvwGuild = { id: res.data.id, name: res.data.name, tag: res.data.tag };
      inMemoryGuilds.set(guildId, g);
      return g;
    }
  } catch {
    /* Unkritisch */
  }
  return null;
}

/**
 * Compares two match states and records newly observed ownership flips.
 */
function detectFlips(prevMatch: WvwMatch | null, newMatch: WvwMatch): void {
  if (!prevMatch) return;

  const prevOwners = new Map<string, WvwObjectiveOwner>();
  for (const m of prevMatch.maps) {
    for (const obj of m.objectives) {
      prevOwners.set(obj.id, obj.owner);
    }
  }

  const now = new Date();
  const addedFlips: WvwObservedFlip[] = [];

  for (const m of newMatch.maps) {
    for (const obj of m.objectives) {
      const oldOwner = prevOwners.get(obj.id);
      if (oldOwner && oldOwner !== obj.owner) {
        const staticMetaDe = inMemoryObjectivesDe.get(obj.id);
        const staticMetaEn = inMemoryObjectivesEn.get(obj.id);
        const name = staticMetaDe?.name || staticMetaEn?.name || obj.id;
        const nameEn = staticMetaEn?.name || staticMetaDe?.name || obj.id;
        const riExpiresAt = new Date(now.getTime() + RI_DURATION_SECONDS * 1000);

        addedFlips.push({
          id: `${obj.id}_${now.getTime()}`,
          objectiveId: obj.id,
          objectiveName: name,
          objectiveNameEn: nameEn,
          mapType: m.type,
          oldOwner,
          newOwner: obj.owner,
          timestamp: now,
          riExpiresAt,
        });
      }
    }
  }

  if (addedFlips.length > 0) {
    sessionFlips = [...addedFlips, ...sessionFlips].slice(0, 50); // maximum 50 flips in history
  }
}

/**
 * Fetches dynamic data of selected match.
 */
export async function refreshMatchData(matchId = currentMatchId): Promise<WvwMatch | null> {
  isFetchingMatch = true;
  lastError = null;
  updateSnapshot();

  try {
    const res = await apiGet<WvwMatch>(buildUrl(`wvw/matches/${matchId}`));
    if (res.ok && res.data && res.data.id) {
      detectFlips(lastValidMatch, res.data);
      lastValidMatch = res.data;
      lastSuccessfulFetch = new Date();
      currentMatchId = matchId;

      // Collect missing guild IDs and batch-fetch them
      const neededGuildIds: string[] = [];
      for (const m of res.data.maps) {
        for (const obj of m.objectives) {
          if (obj.claimed_by && !inMemoryGuilds.has(obj.claimed_by) && !neededGuildIds.includes(obj.claimed_by)) {
            neededGuildIds.push(obj.claimed_by);
          }
        }
      }

      if (neededGuildIds.length > 0) {
        void Promise.all(neededGuildIds.map((gid) => getGuildInfo(gid))).then((results) => {
          if (results.some(Boolean)) {
            updateSnapshot();
          }
        });
      }
    } else {
      lastError = res.error || `HTTP ${res.status}`;
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'Netzwerkfehler';
  } finally {
    isFetchingMatch = false;
    updateSnapshot();
  }

  return lastValidMatch;
}

/**
 * Merges static metadata with current live state of each objective.
 */
export function buildCombinedObjectives(
  match: WvwMatch | null,
  staticObjs: Map<string, WvwStaticObjective>,
): WvwCombinedObjective[] {
  if (!match) return [];
  const list: WvwCombinedObjective[] = [];
  const now = Date.now();

  for (const m of match.maps) {
    for (const live of m.objectives) {
      const meta = staticObjs.get(live.id);

      let lastFlipped: Date | null = null;
      let secondsSinceFlip: number | null = null;
      let isRiActive = false;
      let riSecondsRemaining = 0;

      if (live.last_flipped) {
        const flipTime = new Date(live.last_flipped).getTime();
        if (!isNaN(flipTime)) {
          lastFlipped = new Date(flipTime);
          secondsSinceFlip = Math.max(0, Math.floor((now - flipTime) / 1000));
          if (secondsSinceFlip < RI_DURATION_SECONDS) {
            isRiActive = true;
            riSecondsRemaining = RI_DURATION_SECONDS - secondsSinceFlip;
          }
        }
      }

      let claimedAt: Date | null = null;
      if (live.claimed_at) {
        const ct = new Date(live.claimed_at).getTime();
        if (!isNaN(ct)) claimedAt = new Date(ct);
      }

      const guildInfo = live.claimed_by ? inMemoryGuilds.get(live.claimed_by) ?? null : null;

      list.push({
        id: live.id,
        name: meta?.name || live.id,
        nameEn: inMemoryObjectivesEn.get(live.id)?.name || meta?.name || live.id,
        type: live.type,
        mapType: m.type,
        mapId: m.id,
        owner: live.owner,
        pointsTick: live.points_tick ?? 0,
        pointsCapture: live.points_capture ?? 0,
        lastFlipped,
        secondsSinceFlip,
        isRiActive,
        riSecondsRemaining,
        claimedBy: live.claimed_by ?? null,
        claimedAt,
        guildInfo,
        yaksDelivered: live.yaks_delivered ?? 0,
        guildUpgrades: live.guild_upgrades ?? [],
        coord: meta?.coord,
        labelCoord: meta?.label_coord,
        marker: meta?.marker,
        chatLink: meta?.chat_link,
      });
    }
  }

  return list;
}

/**
 * Starts automatic polling for WvW match data.
 */
export function startWvwPolling(matchId?: string, intervalMs = 30_000): void {
  if (matchId) currentMatchId = matchId;
  pollIntervalMs = Math.max(15_000, intervalMs);

  stopWvwPolling();
  isPollingActive = true;

  // Immediately fetch once
  void refreshMatchData(currentMatchId);

  pollTimer = setInterval(() => {
    void refreshMatchData(currentMatchId);
  }, pollIntervalMs);
}

/**
 * Stops polling.
 */
export function stopWvwPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPollingActive = false;
  updateSnapshot();
}

/**
 * Sets the selected match and immediately refreshes data.
 */
export function setMatchId(matchId: string): void {
  if (currentMatchId === matchId && lastValidMatch) return;
  currentMatchId = matchId;
  void refreshMatchData(matchId);
}

/**
 * Hook-compatible getter for entire current WvW service state.
 * Returns referentially stable snapshot to prevent re-render loops in useSyncExternalStore.
 */
export function getWvwServiceSnapshot(): WvwServiceSnapshot {
  return cachedSnapshot;
}

export const subscribeWvwService = wvwEmitter.subscribe;
export const getCachedObjectivesMap = (lang: 'de' | 'en' = 'de') => {
  const map = lang === 'de' ? inMemoryObjectivesDe : inMemoryObjectivesEn;
  if (map.size > 0) return map;
  return inMemoryObjectivesDe.size > 0 ? inMemoryObjectivesDe : inMemoryObjectivesEn;
};
export const getCachedWorldsMap = (lang: 'de' | 'en' = 'de') => {
  const map = lang === 'de' ? inMemoryWorldsDe : inMemoryWorldsEn;
  if (map.size > 0) return map;
  return inMemoryWorldsDe.size > 0 ? inMemoryWorldsDe : inMemoryWorldsEn;
};
