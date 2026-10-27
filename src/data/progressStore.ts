/**
 * Personal progress (Legendary Weapons, Crafting).
 *
 * Persistence (redundant, ensuring nothing is lost):
 *   1. localStorage (existing app architecture, prefix "gw2_overlay_")
 *   2. In Electron additionally a JSON file in user data directory (via IPC), independent of origin
 *      (file:// vs. Dev-Server). On startup, the newer state wins (`savedAt`).
 *
 * Schema is versioned; unknown/newer versions are backed up instead of overwritten.
 */
import { useSyncExternalStore } from 'react';
import { createEmitter } from './gw2/cache.ts';

const KEY = 'gw2_overlay_progress_v1';
const BACKUP_KEY = 'gw2_overlay_progress_backup';
export const SCHEMA_VERSION = 1;

export interface LegendaryProgress {
  /** Components marked as completed (path key) */
  doneNodes: string[];
  /** Base materials marked as fully owned */
  doneMaterials: number[];
  /** Items that are purchased instead of crafted */
  buyItems: number[];
}

export interface CraftingProgress {
  target: number;
  /** Manually set starting rank (if API rank is unavailable) */
  start: number | null;
  doneSteps: string[];
  allowDiscovery: boolean;
  craftIntermediates: boolean;
}

export interface ProgressState {
  version: number;
  savedAt: number;
  tracked: number[];
  legendary: Record<string, LegendaryProgress>;
  crafting: Record<string, CraftingProgress>;
  /** Total account completions per event ID (e.g. 'tequatl': 15) */
  eventCompletions: Record<string, number>;
  /** Last registered completion on UTC day via API or manual (e.g. 'tequatl': '2026-10-24') */
  dailyCompletedDates: Record<string, string>;
}

export const DEFAULT_CRAFTING: CraftingProgress = {
  target: 400,
  start: null,
  doneSteps: [],
  allowDiscovery: false,
  craftIntermediates: false,
};

const emptyLegendary = (): LegendaryProgress => ({ doneNodes: [], doneMaterials: [], buyItems: [] });

function fresh(): ProgressState {
  return {
    version: SCHEMA_VERSION,
    savedAt: 0,
    tracked: [],
    legendary: {},
    crafting: {},
    eventCompletions: {},
    dailyCompletedDates: {},
  };
}

interface ElectronStore {
  readStore?: (name: string) => Promise<string | null>;
  writeStore?: (name: string, json: string) => void;
}
const electron = (): ElectronStore | undefined =>
  typeof window !== 'undefined'
    ? (window as unknown as { electronAPI?: ElectronStore }).electronAPI
    : undefined;

function sanitize(raw: unknown): ProgressState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<ProgressState>;
  if (typeof o.version !== 'number' || o.version > SCHEMA_VERSION) return null;
  const s = fresh();
  s.savedAt = typeof o.savedAt === 'number' ? o.savedAt : 0;
  if (Array.isArray(o.tracked)) s.tracked = o.tracked.filter((n) => typeof n === 'number');
  if (o.legendary && typeof o.legendary === 'object') {
    for (const [k, v] of Object.entries(o.legendary)) {
      s.legendary[k] = { ...emptyLegendary(), ...(v as Partial<LegendaryProgress>) };
    }
  }
  if (o.crafting && typeof o.crafting === 'object') {
    for (const [k, v] of Object.entries(o.crafting)) {
      s.crafting[k] = {
        ...DEFAULT_CRAFTING,
        ...(v as Partial<CraftingProgress>),
        allowDiscovery: false,
        craftIntermediates: false,
      };
    }
  }
  if (o.eventCompletions && typeof o.eventCompletions === 'object') {
    for (const [k, v] of Object.entries(o.eventCompletions)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        s.eventCompletions[k] = Math.max(0, Math.round(v));
      }
    }
  }
  if (o.dailyCompletedDates && typeof o.dailyCompletedDates === 'object') {
    for (const [k, v] of Object.entries(o.dailyCompletedDates)) {
      if (typeof v === 'string') {
        s.dailyCompletedDates[k] = v;
      }
    }
  }
  return s;
}

function loadLocal(): ProgressState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    const s = (parsed ? sanitize(parsed) : null) ?? fresh();

    // On restart: Reset all checkmarks (doneSteps) to 0
    // AND keep both options (intermediates/discoveries) inactive
    for (const discipline of Object.keys(s.crafting)) {
      s.crafting[discipline].doneSteps = [];
      s.crafting[discipline].allowDiscovery = false;
      s.crafting[discipline].craftIntermediates = false;
    }

    // Pull level for discipline directly from cached account data
    try {
      const rawAccount = typeof localStorage !== 'undefined' ? localStorage.getItem('gw2_overlay_account_data_v1') : null;
      if (rawAccount) {
        const acc = JSON.parse(rawAccount);
        if (acc && acc.crafting && typeof acc.crafting === 'object') {
          for (const [disc, info] of Object.entries(acc.crafting)) {
            const rating = (info as { rating?: number })?.rating;
            if (typeof rating === 'number') {
              if (!s.crafting[disc]) {
                const target = disc === 'Jeweler' ? 400 : (rating >= 400 ? 500 : 400);
                s.crafting[disc] = { ...DEFAULT_CRAFTING, start: rating, target, doneSteps: [], allowDiscovery: false, craftIntermediates: false };
              } else {
                s.crafting[disc].start = rating;
                s.crafting[disc].doneSteps = [];
                s.crafting[disc].allowDiscovery = false;
                s.crafting[disc].craftIntermediates = false;
                if (s.crafting[disc].target <= rating) {
                  s.crafting[disc].target = disc === 'Jeweler'
                    ? Math.max(400, rating)
                    : (rating >= 400 ? 500 : Math.min(500, Math.max(rating + 25, 400)));
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Account-Crafting-Level konnte bei Neustart nicht ausgelesen werden', e);
    }

    // Update localStorage on restart
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY, JSON.stringify(s));
      }
    } catch {
      /* ignorieren */
    }

    return s;
  } catch (e) {
    console.error('Fortschritt konnte nicht geladen werden', e);
  }
  return fresh();
}

const emitter = createEmitter();
let state: ProgressState = loadLocal();
let mirrorTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  // Optionen niemals aktiv im LocalStore persistieren
  const sanitizedCrafting: Record<string, CraftingProgress> = {};
  for (const [disc, cp] of Object.entries(state.crafting)) {
    sanitizedCrafting[disc] = {
      ...cp,
      allowDiscovery: false,
      craftIntermediates: false,
    };
  }
  state = { ...state, crafting: sanitizedCrafting, savedAt: Date.now() };
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch (e) {
    console.error('Fortschritt konnte nicht gespeichert werden', e);
  }
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => electron()?.writeStore?.('progress', json), 400);
}

function update(fn: (s: ProgressState) => ProgressState) {
  state = fn(state);
  persist();
  emitter.emit();
}

// Datei-Spiegel beim Start abgleichen
void (async () => {
  try {
    const json = await electron()?.readStore?.('progress');
    if (!json) {
      if (state.savedAt > 0) electron()?.writeStore?.('progress', JSON.stringify(state));
      return;
    }
    const mirror = sanitize(JSON.parse(json));
    if (mirror && mirror.savedAt > state.savedAt) {
      for (const discipline of Object.keys(mirror.crafting)) {
        mirror.crafting[discipline].doneSteps = [];
        mirror.crafting[discipline].allowDiscovery = false;
        mirror.crafting[discipline].craftIntermediates = false;
      }
      state = mirror;
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        /* ignorieren */
      }
      emitter.emit();
    }
  } catch (e) {
    console.error('Datei-Spiegel nicht lesbar', e);
  }
})();

export function getProgress(): ProgressState {
  return state;
}
export function useProgress(): ProgressState {
  return useSyncExternalStore(emitter.subscribe, getProgress);
}

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const progressActions = {
  toggleTracked(weaponId: number) {
    update((s) => ({ ...s, tracked: toggle(s.tracked, weaponId) }));
  },
  isTracked(weaponId: number) {
    return state.tracked.includes(weaponId);
  },
  legendary(weaponId: number): LegendaryProgress {
    return state.legendary[String(weaponId)] ?? emptyLegendary();
  },
  toggleNodeDone(weaponId: number, key: string) {
    update((s) => {
      const cur = s.legendary[String(weaponId)] ?? emptyLegendary();
      return { ...s, legendary: { ...s.legendary, [weaponId]: { ...cur, doneNodes: toggle(cur.doneNodes, key) } } };
    });
  },
  toggleMaterialDone(weaponId: number, itemId: number) {
    update((s) => {
      const cur = s.legendary[String(weaponId)] ?? emptyLegendary();
      return { ...s, legendary: { ...s.legendary, [weaponId]: { ...cur, doneMaterials: toggle(cur.doneMaterials, itemId) } } };
    });
  },
  toggleBuy(weaponId: number, itemId: number) {
    update((s) => {
      const cur = s.legendary[String(weaponId)] ?? emptyLegendary();
      return { ...s, legendary: { ...s.legendary, [weaponId]: { ...cur, buyItems: toggle(cur.buyItems, itemId) } } };
    });
  },
  clearBuyItems(weaponId: number) {
    update((s) => {
      const cur = s.legendary[String(weaponId)] ?? emptyLegendary();
      return { ...s, legendary: { ...s.legendary, [weaponId]: { ...cur, buyItems: [] } } };
    });
  },
  resetLegendary(weaponId: number) {
    update((s) => ({ ...s, legendary: { ...s.legendary, [weaponId]: emptyLegendary() } }));
  },
  crafting(discipline: string): CraftingProgress {
    return state.crafting[discipline] ?? DEFAULT_CRAFTING;
  },
  setCrafting(discipline: string, patch: Partial<CraftingProgress>) {
    update((s) => ({
      ...s,
      crafting: { ...s.crafting, [discipline]: { ...(s.crafting[discipline] ?? DEFAULT_CRAFTING), ...patch } },
    }));
  },
  toggleStepDone(discipline: string, key: string) {
    update((s) => {
      const cur = s.crafting[discipline] ?? DEFAULT_CRAFTING;
      return { ...s, crafting: { ...s.crafting, [discipline]: { ...cur, doneSteps: toggle(cur.doneSteps, key) } } };
    });
  },
  resetDisciplineCheckmarks(discipline: string) {
    update((s) => {
      const cur = s.crafting[discipline] ?? DEFAULT_CRAFTING;
      return { ...s, crafting: { ...s.crafting, [discipline]: { ...cur, doneSteps: [] } } };
    });
  },
  resetAllCraftingCheckmarks() {
    update((s) => {
      const nextCrafting: Record<string, CraftingProgress> = {};
      for (const [k, v] of Object.entries(s.crafting)) {
        nextCrafting[k] = { ...v, doneSteps: [] };
      }
      return { ...s, crafting: nextCrafting };
    });
  },
  syncAccountRatings(craftingRatings: Record<string, { rating: number; character: string }> | null) {
    if (!craftingRatings) return;
    update((s) => {
      const nextCrafting = { ...s.crafting };
      for (const [disc, info] of Object.entries(craftingRatings)) {
        const cur = nextCrafting[disc] ?? DEFAULT_CRAFTING;
        let target = cur.target;
        if (target <= info.rating) {
          target = disc === 'Jeweler'
            ? Math.max(400, info.rating)
            : (info.rating >= 400 ? 500 : Math.min(500, Math.max(info.rating + 25, 400)));
        }
        nextCrafting[disc] = {
          ...cur,
          start: info.rating,
          target,
          doneSteps: [],
        };
      }
      return { ...s, crafting: nextCrafting };
    });
  },

  // ==========================================
  // EVENT COMPLETIONS ACTIONS (ACCOUNT-WEIT)
  // ==========================================
  getEventCompletions(eventId: string): number {
    return state.eventCompletions[eventId] ?? 0;
  },

  recordEventCompletion(eventId: string, delta = 1): number {
    let nextVal = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    update((s) => {
      const cur = s.eventCompletions[eventId] ?? 0;
      nextVal = Math.max(0, cur + delta);
      const nextDates = { ...s.dailyCompletedDates };
      if (delta > 0) {
        nextDates[eventId] = todayStr;
      }
      return {
        ...s,
        eventCompletions: { ...s.eventCompletions, [eventId]: nextVal },
        dailyCompletedDates: nextDates,
      };
    });
    return nextVal;
  },

  setEventCompletions(eventId: string, count: number) {
    update((s) => ({
      ...s,
      eventCompletions: { ...s.eventCompletions, [eventId]: Math.max(0, Math.round(count)) },
    }));
  },

  isEventCompletedToday(
    eventId: string,
    worldBosses: string[] = [],
    mapChests: string[] = [],
  ): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (state.dailyCompletedDates[eventId] === todayStr) {
      return true;
    }
    const wbKey = EVENT_TO_WORLD_BOSS_API_MAP[eventId];
    if (wbKey && worldBosses.includes(wbKey)) {
      return true;
    }
    const chestKey = EVENT_TO_MAP_CHEST_API_MAP[eventId];
    if (chestKey && mapChests.includes(chestKey)) {
      return true;
    }
    return false;
  },

  syncApiCompletions(
    worldBosses: string[] = [],
    mapChests: string[] = [],
    achievements?: Map<number, { repeated?: number; done?: boolean }>,
    todayUtcDateStr = new Date().toISOString().slice(0, 10),
  ) {
    update((s) => {
      const nextCompletions = { ...s.eventCompletions };
      const nextDates = { ...s.dailyCompletedDates };
      let changed = false;

      // 1. Core world bosses killed today
      for (const wbId of worldBosses) {
        const eventId = WORLD_BOSS_API_MAP[wbId];
        if (eventId) {
          if (nextDates[eventId] !== todayUtcDateStr) {
            nextDates[eventId] = todayUtcDateStr;
            nextCompletions[eventId] = (nextCompletions[eventId] ?? 0) + 1;
            changed = true;
          }
        }
      }

      // 2. Meta chests (Hero's Choice Chests) opened today
      for (const chestId of mapChests) {
        const eventId = MAP_CHEST_API_MAP[chestId];
        if (eventId) {
          if (nextDates[eventId] !== todayUtcDateStr) {
            nextDates[eventId] = todayUtcDateStr;
            nextCompletions[eventId] = (nextCompletions[eventId] ?? 0) + 1;
            changed = true;
          }
        }
      }

      // 3. Wiederholbare Erfolge (API repeated counts als Mindestwert)
      if (achievements) {
        for (const [eventId, gw2Id] of Object.entries(EVENT_ACHIEVEMENT_MAP)) {
          const ach = achievements.get(gw2Id);
          if (ach) {
            const minCount = (ach.repeated ?? 0) + (ach.done ? 1 : 0);
            if (minCount > (nextCompletions[eventId] ?? 0)) {
              nextCompletions[eventId] = minCount;
              changed = true;
            }
          }
        }
      }

      if (!changed) return s;
      return {
        ...s,
        eventCompletions: nextCompletions,
        dailyCompletedDates: nextDates,
      };
    });
  },
};

export const progressStore = progressActions;

// ==========================================
// MAPPINGS BETWEEN GW2 API AND EVENT IDS
// ==========================================
export const WORLD_BOSS_API_MAP: Record<string, string> = {
  'svanir_shaman_chief': 'svanir-shaman',
  'fire_elemental': 'fire-elemental',
  'great_jungle_wurm': 'jungle-wurm',
  'shadow_behemoth': 'shadow-behemoth',
  'admiral_taidha_covington': 'taidha-covington',
  'megadestroyer': 'megadestroyer',
  'the_shatterer': 'shatterer',
  'modniir_ulgoth': 'modniir-ulgoth',
  'inquest_golem_mark_ii': 'inquest-golem',
  'claw_of_jormag': 'claw-of-jormag',
  'tequatl_the_sunless': 'tequatl',
  'karka_queen': 'karka-queen',
  'triple_trouble_wurm': 'triple-trouble',
};

export const EVENT_TO_WORLD_BOSS_API_MAP: Record<string, string> = {
  'svanir-shaman': 'svanir_shaman_chief',
  'fire-elemental': 'fire_elemental',
  'jungle-wurm': 'great_jungle_wurm',
  'shadow-behemoth': 'shadow_behemoth',
  'taidha-covington': 'admiral_taidha_covington',
  'megadestroyer': 'megadestroyer',
  'shatterer': 'the_shatterer',
  'modniir-ulgoth': 'modniir_ulgoth',
  'inquest-golem': 'inquest_golem_mark_ii',
  'claw-of-jormag': 'claw_of_jormag',
  'tequatl': 'tequatl_the_sunless',
  'karka-queen': 'karka_queen',
  'triple-trouble': 'triple_trouble_wurm',
};

export const MAP_CHEST_API_MAP: Record<string, string> = {
  'auric_basin_heros_choice_chest': 'tarir-octovine',
  'tangled_depths_heros_choice_chest': 'chak-gerent',
  'verdant_brink_heros_choice_chest': 'verdant-brink-night',
  'dragons_stand_heros_choice_chest': 'dragons-stand',
  'crystal_oasis_heros_choice_chest': 'choya-pinata',
  'the_desolation_heros_choice_chest': 'maws-of-torment',
  'domain_of_vabbi_heros_choice_chest': 'serpents-ire',
};

export const EVENT_TO_MAP_CHEST_API_MAP: Record<string, string> = {
  'tarir-octovine': 'auric_basin_heros_choice_chest',
  'chak-gerent': 'tangled_depths_heros_choice_chest',
  'verdant-brink-night': 'verdant_brink_heros_choice_chest',
  'dragons-stand': 'dragons_stand_heros_choice_chest',
  'choya-pinata': 'crystal_oasis_heros_choice_chest',
  'maws-of-torment': 'the_desolation_heros_choice_chest',
  'serpents-ire': 'domain_of_vabbi_heros_choice_chest',
};

export const EVENT_ACHIEVEMENT_MAP: Record<string, number> = {
  'tequatl': 824,
  'triple-trouble': 873,
  'shatterer': 2841,
  'claw-of-jormag': 170,
  'shadow-behemoth': 165,
  'inquest-golem': 172,
  'tarir-octovine': 2450,
  'chak-gerent': 2390,
  'choya-pinata': 3858,
  'maws-of-torment': 3861,
  'serpents-ire': 3864,
  'dragonstorm': 5882,
  'drakkar': 5122,
  'dragons-end': 6223,
  'janthir-syntri-titans': 8190,
  'castora-ruins-eternity': 8195,
  'cathedral-of-zephyrs': 1736,
  'cathedral-of-eternal-radiance': 1961,
};
