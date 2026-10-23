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

export interface Gw2ApiState {
  apiKey: string;
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  account: Gw2AccountInfo | null;
  achievements: Map<number, Gw2AccountAchievement>;
  lastSynced: Date | null;
}

const STORAGE_KEY_API_KEY = 'gw2_overlay_api_key';
const STORAGE_KEY_ACCOUNT = 'gw2_overlay_account_cache';
const STORAGE_KEY_ACHIEVEMENTS = 'gw2_overlay_achievements_cache';

export async function gw2ApiGet<T>(url: string): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  // 1. In Electron, route through main process IPC (bypasses browser CORS and file:// CSP restrictions completely!)
  const electronApi = (window as unknown as {
    electronAPI?: { fetchGw2Api?: (u: string) => Promise<{ ok: boolean; status: number; data?: T; error?: string }> };
  }).electronAPI;

  if (electronApi?.fetchGw2Api) {
    return await electronApi.fetchGw2Api(url);
  }

  // 2. Direct browser fetch
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

  const url = `https://api.guildwars2.com/v2/account?access_token=${encodeURIComponent(cleanKey)}`;
  const res = await gw2ApiGet<Gw2AccountInfo>(url);

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

  const url = `https://api.guildwars2.com/v2/account/achievements?access_token=${encodeURIComponent(cleanKey)}`;
  const res = await gw2ApiGet<Gw2AccountAchievement[]>(url);

  if (!res.ok || !res.data) {
    return { success: false, error: res.error || 'Fehler beim Laden der Account-Erfolge (Berechtigung "progression" erforderlich).' };
  }

  return { success: true, achievements: res.data };
}

/**
 * Save cached API key and data in localStorage
 */
export function saveCachedApiData(apiKey: string, account: Gw2AccountInfo | null, achievements: Gw2AccountAchievement[]) {
  try {
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    if (account) {
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    }
    if (achievements && achievements.length > 0) {
      // Store compact representation to save localStorage space
      const compact = achievements.map(a => ({
        id: a.id,
        current: a.current,
        max: a.max,
        done: a.done,
      }));
      localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(compact));
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
} {
  let apiKey = '';
  let account: Gw2AccountInfo | null = null;
  const map = new Map<number, Gw2AccountAchievement>();

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
  } catch (e) {
    console.error('Failed to load API cache', e);
  }

  return { apiKey, account, achievements: map };
}
