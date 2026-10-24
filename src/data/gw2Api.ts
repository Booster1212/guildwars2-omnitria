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
  lastSynced: number;
}

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

  const url = `https://api.guildwars2.com/v2/account?access_token=${encodeURIComponent(cleanKey)}&_t=${Date.now()}`;
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
 * Fetch all account achievements for the given key (with cache busting)
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

  const url = `https://api.guildwars2.com/v2/account/achievements?access_token=${encodeURIComponent(cleanKey)}&_t=${Date.now()}`;
  const res = await gw2ApiGet<Gw2AccountAchievement[]>(url);

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

  const url = `https://api.guildwars2.com/v2/account/worldbosses?access_token=${encodeURIComponent(cleanKey)}&_t=${Date.now()}`;
  const res = await gw2ApiGet<string[]>(url);

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

  const url = `https://api.guildwars2.com/v2/account/mapchests?access_token=${encodeURIComponent(cleanKey)}&_t=${Date.now()}`;
  const res = await gw2ApiGet<string[]>(url);

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

  const url = `https://api.guildwars2.com/v2/account/wizardsvault/daily?access_token=${encodeURIComponent(cleanKey)}&_t=${Date.now()}`;
  const res = await gw2ApiGet<Gw2WizardsVaultDaily>(url);

  if (!res.ok || !res.data) {
    return { success: false, error: res.error || 'Fehler beim Laden des Gewölbes des Zauberers.' };
  }
  return { success: true, wizardsVault: res.data };
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
  const [accRes, achRes, wbRes, mcRes, wvRes] = await Promise.allSettled([
    validateApiKey(apiKey),
    fetchAccountAchievements(apiKey),
    fetchAccountWorldBosses(apiKey),
    fetchAccountMapChests(apiKey),
    fetchAccountWizardsVaultDaily(apiKey),
  ]);

  let account: Gw2AccountInfo | null = null;
  let achievements: Gw2AccountAchievement[] = [];
  let worldBosses: string[] = [];
  let mapChests: string[] = [];
  let wizardsVault: Gw2WizardsVaultDaily | null = null;

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

  const dailyProgression: Gw2DailyProgression = {
    worldBosses,
    mapChests,
    wizardsVault,
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
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
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
        // Retain wizardsVault reference if needed, but worldbosses/mapchests have reset today
        dailyProgression = {
          worldBosses: [],
          mapChests: [],
          wizardsVault: null,
          lastSynced: parsed.lastSynced,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load API cache', e);
  }

  return { apiKey, account, achievements: map, dailyProgression };
}
