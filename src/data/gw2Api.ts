/**
 * Guild Wars 2 Official API Service
 * Endpoint: https://api.guildwars2.com/v2
 */

export interface Gw2AccountInfo {
  id: string;
  name: string;
  age: number;
  world: number;
  guilds: string[];
  created: string;
  access: string[];
  commander: boolean;
  fractal_level?: number;
  daily_ap?: number;
  monthly_ap?: number;
  wvw_rank?: number;
}

export interface Gw2AccountAchievement {
  id: number;
  current?: number;
  max?: number;
  done: boolean;
  repeated?: number;
  unlocked?: boolean;
  bits?: number[];
}

export interface Gw2WizardsVaultObjective {
  id: number;
  title: string;
  track: 'PvE' | 'PvP' | 'WvW' | string;
  acclaim: number;
  progress_current: number;
  progress_complete: number;
  claimed: boolean;
}

export interface Gw2WizardsVaultDaily {
  meta_progress_current: number;
  meta_progress_complete: number;
  meta_reward_item_id?: number;
  meta_reward_astral?: number;
  meta_reward_claimed: boolean;
  objectives: Gw2WizardsVaultObjective[];
}

export interface Gw2DailyProgression {
  worldBosses: string[]; // Boss IDs killed today, e.g. "tequatl_the_sunless"
  mapChests: string[];   // Meta chest IDs opened today, e.g. "auric_basin_heros_choice_chest"
  wizardsVault: Gw2WizardsVaultDaily | null;
  wizardsVaultWeekly?: Gw2WizardsVaultDaily | null;
  lastSynced: number;
}

export type DailyProgressionData = Gw2DailyProgression;

export interface Gw2ApiState {
  apiKey: string;
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  account: Gw2AccountInfo | null;
  achievements: Map<number, Gw2AccountAchievement>;
  dailyProgression: Gw2DailyProgression | null;
  lastSynced: Date | null;
}

const STORAGE_KEY_API_KEY = 'gw2_overlay_api_key';
const STORAGE_KEY_ACCOUNT = 'gw2_overlay_account_cache';
const STORAGE_KEY_ACHIEVEMENTS = 'gw2_overlay_achievements_cache';
const STORAGE_KEY_DAILY = 'gw2_overlay_daily_cache';

export interface SafeCredentialsBridge {
  isAvailable: () => Promise<boolean>;
  saveApiKey: (key: string) => Promise<{ success: boolean; encrypted?: boolean; error?: string }>;
  getApiKey: () => Promise<{ success: boolean; apiKey?: string | null; error?: string }>;
  clearApiKey: () => Promise<{ success: boolean; error?: string }>;
}

export function getSafeCredentials(): SafeCredentialsBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { electronAPI?: { safeCredentials?: SafeCredentialsBridge } }).electronAPI?.safeCredentials;
}

export async function storeApiKeySecurely(apiKey: string): Promise<boolean> {
  const safe = getSafeCredentials();
  if (safe) {
    try {
      const avail = await safe.isAvailable();
      if (avail) {
        const res = await safe.saveApiKey(apiKey);
        if (res.success) {
          try { localStorage.removeItem(STORAGE_KEY_API_KEY); } catch (_) {}
          return true;
        }
      }
    } catch (e) {
      console.warn('[Credentials] SafeStorage save fallback:', e);
    }
  }
  try {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  } catch (_) {}
  return false;
}

export async function retrieveApiKeySecurely(): Promise<string> {
  const safe = getSafeCredentials();
  if (safe) {
    try {
      const avail = await safe.isAvailable();
      if (avail) {
        const res = await safe.getApiKey();
        if (res.success && res.apiKey) {
          return res.apiKey;
        }
      }
    } catch (e) {
      console.warn('[Credentials] SafeStorage retrieval failed:', e);
    }
  }
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
  } catch (_) {
    return '';
  }
}

export async function clearApiKeySecurely(): Promise<void> {
  const safe = getSafeCredentials();
  if (safe) {
    try {
      await safe.clearApiKey();
    } catch (_) {}
  }
  try {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  } catch (_) {}
}

/**
 * Check if two timestamps belong to the same UTC day (GW2 reset is 00:00 UTC)
 */
export function isSameUtcDay(t1: number, t2: number): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

import { apiGet, buildUrl, gw2ApiGet } from './gw2/client.ts';
export { gw2ApiGet };

/**
 * Validate an API key and fetch account info
 */
export async function validateApiKey(apiKey: string): Promise<{
  success: boolean;
  account?: Gw2AccountInfo;
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, error: 'Bitte gib einen gültigen API-Schlüssel ein.' };
  }

  const url = buildUrl('account', {}, cleanKey);
  const res = await apiGet<Gw2AccountInfo>(url);

  if (!res.ok || !res.data) {
    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Ungültiger API-Schlüssel oder fehlende Berechtigung (account).' };
    }
    return { success: false, error: res.error || `API-Fehler (${res.status})` };
  }

  return { success: true, account: res.data };
}

/**
 * Fetch all account achievements for the given key
 */
export async function fetchAccountAchievements(apiKey: string): Promise<{
  success: boolean;
  achievements?: Gw2AccountAchievement[];
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, error: 'Kein API-Schlüssel angegeben.' };
  }

  const url = buildUrl('account/achievements', {}, cleanKey);
  const res = await apiGet<Gw2AccountAchievement[]>(url);

  if (!res.ok || !res.data) {
    return { success: false, error: res.error || 'Fehler beim Laden der Account-Erfolge (Berechtigung "progression" erforderlich).' };
  }

  return { success: true, achievements: res.data };
}

/**
 * Fetch defeated world bosses for the authenticated account today (since daily reset)
 */
export async function fetchAccountWorldBosses(apiKey: string): Promise<{
  success: boolean;
  worldBosses?: string[];
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, error: 'Kein API-Schlüssel.' };

  const url = buildUrl('account/worldbosses', {}, cleanKey);
  const res = await apiGet<string[]>(url);

  if (!res.ok || !Array.isArray(res.data)) {
    return { success: false, error: res.error || 'Fehler beim Laden der getöteten Weltenbosse (Berechtigung "progression").' };
  }
  return { success: true, worldBosses: res.data };
}

/**
 * Fetch opened meta-event map chests (Hero's Choice Chests) today
 */
export async function fetchAccountMapChests(apiKey: string): Promise<{
  success: boolean;
  mapChests?: string[];
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, error: 'Kein API-Schlüssel.' };

  const url = buildUrl('account/mapchests', {}, cleanKey);
  const res = await apiGet<string[]>(url);

  if (!res.ok || !Array.isArray(res.data)) {
    return { success: false, error: res.error || 'Fehler beim Laden der Meta-Truhen (Berechtigung "progression").' };
  }
  return { success: true, mapChests: res.data };
}

/**
 * Fetch Wizard's Vault daily objectives and completion status (replaced old daily achievements)
 */
export async function fetchAccountWizardsVaultDaily(apiKey: string): Promise<{
  success: boolean;
  wizardsVault?: Gw2WizardsVaultDaily;
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, error: 'Kein API-Schlüssel.' };

  const url = buildUrl('account/wizardsvault/daily', {}, cleanKey);
  const res = await apiGet<Gw2WizardsVaultDaily>(url);

  if (!res.ok || !res.data) {
    return { success: false, error: res.error || 'Fehler beim Laden des Gewölbes des Zauberers.' };
  }
  return { success: true, wizardsVault: res.data };
}

/**
 * Fetch Wizard's Vault weekly objectives and completion status
 */
export async function fetchAccountWizardsVaultWeekly(apiKey: string): Promise<{
  success: boolean;
  wizardsVaultWeekly?: Gw2WizardsVaultDaily;
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, error: 'Kein API-Schlüssel.' };

  const url = buildUrl('account/wizardsvault/weekly', {}, cleanKey);
  const res = await apiGet<Gw2WizardsVaultDaily>(url);

  if (!res.ok || !res.data) {
    return { success: false, error: res.error || 'Fehler beim Laden der wöchentlichen Ziele des Gewölbes.' };
  }
  return { success: true, wizardsVaultWeekly: res.data };
}

/**
 * Fetch all account progression data concurrently (account, achievements, world bosses, map chests, wizards vault)
 */
export async function fetchAllAccountProgression(apiKey: string): Promise<{
  account: Gw2AccountInfo | null;
  achievements: Gw2AccountAchievement[];
  dailyProgression: Gw2DailyProgression;
  errors: string[];
}> {
  const errors: string[] = [];
  const [accRes, achRes, wbRes, mcRes, wvRes, wvWeeklyRes] = await Promise.allSettled([
    validateApiKey(apiKey),
    fetchAccountAchievements(apiKey),
    fetchAccountWorldBosses(apiKey),
    fetchAccountMapChests(apiKey),
    fetchAccountWizardsVaultDaily(apiKey),
    fetchAccountWizardsVaultWeekly(apiKey),
  ]);

  let account: Gw2AccountInfo | null = null;
  let achievements: Gw2AccountAchievement[] = [];
  let worldBosses: string[] = [];
  let mapChests: string[] = [];
  let wizardsVault: Gw2WizardsVaultDaily | null = null;
  let wizardsVaultWeekly: Gw2WizardsVaultDaily | null = null;

  if (accRes.status === 'fulfilled' && accRes.value.success && accRes.value.account) {
    account = accRes.value.account;
  } else if (accRes.status === 'fulfilled' && accRes.value.error) {
    errors.push(accRes.value.error);
  }

  if (achRes.status === 'fulfilled' && achRes.value.success && achRes.value.achievements) {
    achievements = achRes.value.achievements;
  } else if (achRes.status === 'fulfilled' && achRes.value.error) {
    errors.push(achRes.value.error);
  }

  if (wbRes.status === 'fulfilled' && wbRes.value.success && wbRes.value.worldBosses) {
    worldBosses = wbRes.value.worldBosses;
  }

  if (mcRes.status === 'fulfilled' && mcRes.value.success && mcRes.value.mapChests) {
    mapChests = mcRes.value.mapChests;
  }

  if (wvRes.status === 'fulfilled' && wvRes.value.success && wvRes.value.wizardsVault) {
    wizardsVault = wvRes.value.wizardsVault;
  }

  if (wvWeeklyRes.status === 'fulfilled' && wvWeeklyRes.value.success && wvWeeklyRes.value.wizardsVaultWeekly) {
    wizardsVaultWeekly = wvWeeklyRes.value.wizardsVaultWeekly;
  }

  const dailyProgression: Gw2DailyProgression = {
    worldBosses,
    mapChests,
    wizardsVault,
    wizardsVaultWeekly,
    lastSynced: Date.now(),
  };

  saveCachedApiData(apiKey, account, achievements, dailyProgression);

  return { account, achievements, dailyProgression, errors };
}

/**
 * Save cached API key and data in localStorage
 */
export function saveCachedApiData(
  apiKey: string,
  account: Gw2AccountInfo | null,
  achievements: Gw2AccountAchievement[],
  dailyProgression?: Gw2DailyProgression | null,
) {
  try {
    void storeApiKeySecurely(apiKey);
    if (account) {
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    }
    if (achievements && achievements.length > 0) {
      // Store complete representation including repeated, bits, and unlocked!
      const compact = achievements.map(a => ({
        id: a.id,
        current: a.current,
        max: a.max,
        done: a.done,
        repeated: a.repeated,
        bits: a.bits,
        unlocked: a.unlocked,
      }));
      localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(compact));
    }
    if (dailyProgression) {
      localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyProgression));
    }
  } catch (e) {
    console.error('Failed to save API cache', e);
  }
}

/**
 * Load cached API key and data from localStorage
 */
export function loadCachedApiData(): {
  apiKey: string;
  account: Gw2AccountInfo | null;
  achievements: Map<number, Gw2AccountAchievement>;
  dailyProgression: Gw2DailyProgression | null;
} {
  let apiKey = '';
  let account: Gw2AccountInfo | null = null;
  const map = new Map<number, Gw2AccountAchievement>();
  let dailyProgression: Gw2DailyProgression | null = null;

  try {
    apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
    const rawAccount = localStorage.getItem(STORAGE_KEY_ACCOUNT);
    if (rawAccount) {
      account = JSON.parse(rawAccount);
    }
    const rawAch = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
    if (rawAch) {
      const parsed: Gw2AccountAchievement[] = JSON.parse(rawAch);
      parsed.forEach(a => map.set(a.id, a));
    }
    const rawDaily = localStorage.getItem(STORAGE_KEY_DAILY);
    if (rawDaily) {
      const parsed: Gw2DailyProgression = JSON.parse(rawDaily);
      // If the cache is from a previous UTC day, daily boss/meta clears have reset!
      if (parsed.lastSynced && isSameUtcDay(parsed.lastSynced, Date.now())) {
        dailyProgression = parsed;
      } else {
        // Retain weekly vault reference if present, but daily worldbosses/mapchests/daily vault have reset today
        dailyProgression = {
          worldBosses: [],
          mapChests: [],
          wizardsVault: null,
          wizardsVaultWeekly: parsed.wizardsVaultWeekly ?? null,
          lastSynced: parsed.lastSynced,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load API cache', e);
  }

  return { apiKey, account, achievements: map, dailyProgression };
}
