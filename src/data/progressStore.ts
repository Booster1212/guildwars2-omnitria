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

export type PlannerMode = 'fast' | 'balanced' | 'completionist' | 'goal';
export type TaskOrStepStatus = 'open' | 'completed' | 'skipped' | 'deferred';

export interface PlannerPreferences {
  mode: PlannerMode;
  selectedCharacter: string | null;
  onlyOpenSteps: boolean;
  strategy: 'all_craft' | 'all_buy' | 'custom';
}

export interface PlannerUndoEntry {
  id: string;
  scope: 'task' | 'step';
  targetId: string;
  discipline?: string;
  previousState: TaskOrStepStatus;
  newState: TaskOrStepStatus;
  timestamp: number;
}

export interface CharacterDisciplineProgress {
  target: number;
  start: number | null;
  doneSteps: string[];
  skippedSteps: string[];
  deferredSteps: string[];
  allowDiscovery: boolean;
  craftIntermediates: boolean;
}

export interface CharacterPlannerProgress {
  characterName: string;
  manualLevel: number;
  targetMilestoneId: string | null;
  completedTaskIds: string[];
  skippedTaskIds: string[];
  deferredTaskIds: string[];
  disciplines: Record<string, CharacterDisciplineProgress>;
  undoStack: PlannerUndoEntry[];
}

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
  skippedSteps?: string[];
  deferredSteps?: string[];
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
  /** Account-wide leveling planner preferences (separate from character state) */
  plannerPreferences: PlannerPreferences;
  /** Character-specific leveling & crafting progression keyed by character name */
  characterProgress: Record<string, CharacterPlannerProgress>;
}

export const DEFAULT_CRAFTING: CraftingProgress = {
  target: 400,
  start: null,
  doneSteps: [],
  allowDiscovery: false,
  craftIntermediates: false,
};

export const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  mode: 'balanced',
  selectedCharacter: null,
  onlyOpenSteps: false,
  strategy: 'all_craft',
};

export const DEFAULT_CHARACTER_KEY = '__default__';

export function createEmptyCharacterDiscipline(discipline?: string): CharacterDisciplineProgress {
  return {
    target: discipline === 'Jeweler' ? 400 : 500,
    start: null,
    doneSteps: [],
    skippedSteps: [],
    deferredSteps: [],
    allowDiscovery: false,
    craftIntermediates: true,
  };
}

export function createEmptyCharacterProgress(characterName = DEFAULT_CHARACTER_KEY): CharacterPlannerProgress {
  return {
    characterName,
    manualLevel: 1,
    targetMilestoneId: null,
    completedTaskIds: [],
    skippedTaskIds: [],
    deferredTaskIds: [],
    disciplines: {},
    undoStack: [],
  };
}

const emptyLegendary = (): LegendaryProgress => ({ doneNodes: [], doneMaterials: [], buyItems: [] });

function uniqueStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string' && item.trim() && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/** Ensures an ID appears in at most one of completed, skipped, or deferred lists (priority: completed > skipped > deferred) */
function normalizeMutuallyExclusiveLists(
  completedRaw: unknown,
  skippedRaw: unknown,
  deferredRaw: unknown,
): { completed: string[]; skipped: string[]; deferred: string[] } {
  const completed = uniqueStrings(completedRaw);
  const completedSet = new Set(completed);
  const skipped = uniqueStrings(skippedRaw).filter((id) => !completedSet.has(id));
  const skippedSet = new Set(skipped);
  const deferred = uniqueStrings(deferredRaw).filter((id) => !completedSet.has(id) && !skippedSet.has(id));
  return { completed, skipped, deferred };
}

function fresh(): ProgressState {
  return {
    version: SCHEMA_VERSION,
    savedAt: 0,
    tracked: [],
    legendary: {},
    crafting: {},
    eventCompletions: {},
    dailyCompletedDates: {},
    plannerPreferences: { ...DEFAULT_PLANNER_PREFERENCES },
    characterProgress: {},
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
  const ver = typeof o.version === 'number' ? o.version : SCHEMA_VERSION;
  if (ver > SCHEMA_VERSION) return null;
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
      const cp = v as Partial<CraftingProgress>;
      const norm = normalizeMutuallyExclusiveLists(cp?.doneSteps, cp?.skippedSteps, cp?.deferredSteps);
      s.crafting[k] = {
        ...DEFAULT_CRAFTING,
        ...cp,
        doneSteps: norm.completed,
        skippedSteps: norm.skipped,
        deferredSteps: norm.deferred,
        allowDiscovery: Boolean(cp?.allowDiscovery),
        craftIntermediates: Boolean(cp?.craftIntermediates),
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
  if (o.plannerPreferences && typeof o.plannerPreferences === 'object') {
    const pp = o.plannerPreferences as Partial<PlannerPreferences>;
    const validModes: PlannerMode[] = ['fast', 'balanced', 'completionist', 'goal'];
    const validStrategies = ['all_craft', 'all_buy', 'custom'] as const;
    s.plannerPreferences = {
      mode: validModes.includes(pp.mode as PlannerMode) ? (pp.mode as PlannerMode) : 'balanced',
      selectedCharacter: typeof pp.selectedCharacter === 'string' && pp.selectedCharacter.trim() ? pp.selectedCharacter.trim() : null,
      onlyOpenSteps: Boolean(pp.onlyOpenSteps),
      strategy: validStrategies.includes(pp.strategy as any) ? (pp.strategy as any) : 'all_craft',
    };
  }
  if (o.characterProgress && typeof o.characterProgress === 'object') {
    for (const [charKey, rawChar] of Object.entries(o.characterProgress)) {
      if (!rawChar || typeof rawChar !== 'object') continue;
      const cp = rawChar as Partial<CharacterPlannerProgress>;
      const taskNorm = normalizeMutuallyExclusiveLists(cp.completedTaskIds, cp.skippedTaskIds, cp.deferredTaskIds);
      const disciplines: Record<string, CharacterDisciplineProgress> = {};
      if (cp.disciplines && typeof cp.disciplines === 'object') {
        for (const [disc, rawDisc] of Object.entries(cp.disciplines)) {
          if (!rawDisc || typeof rawDisc !== 'object') continue;
          const dp = rawDisc as Partial<CharacterDisciplineProgress>;
          const stepNorm = normalizeMutuallyExclusiveLists(dp.doneSteps, dp.skippedSteps, dp.deferredSteps);
          disciplines[disc] = {
            ...createEmptyCharacterDiscipline(disc),
            ...dp,
            target: typeof dp.target === 'number' ? Math.max(1, Math.min(500, dp.target)) : (disc === 'Jeweler' ? 400 : 500),
            start: typeof dp.start === 'number' ? Math.max(0, Math.min(500, dp.start)) : null,
            doneSteps: stepNorm.completed,
            skippedSteps: stepNorm.skipped,
            deferredSteps: stepNorm.deferred,
            allowDiscovery: Boolean(dp.allowDiscovery),
            craftIntermediates: dp.craftIntermediates !== undefined ? Boolean(dp.craftIntermediates) : true,
          };
        }
      }
      const undoStack: PlannerUndoEntry[] = Array.isArray(cp.undoStack)
        ? cp.undoStack
            .filter(
              (u): u is PlannerUndoEntry =>
                Boolean(u && typeof u === 'object' && typeof u.targetId === 'string' && (u.scope === 'task' || u.scope === 'step')),
            )
            .slice(-25)
        : [];
      const manualLevel = typeof cp.manualLevel === 'number' && Number.isFinite(cp.manualLevel)
        ? Math.max(1, Math.min(80, Math.round(cp.manualLevel)))
        : 1;
      s.characterProgress[charKey] = {
        characterName: typeof cp.characterName === 'string' && cp.characterName.trim() ? cp.characterName : charKey,
        manualLevel,
        targetMilestoneId: typeof cp.targetMilestoneId === 'string' ? cp.targetMilestoneId : null,
        completedTaskIds: taskNorm.completed,
        skippedTaskIds: taskNorm.skipped,
        deferredTaskIds: taskNorm.deferred,
        disciplines,
        undoStack,
      };
    }
  }
  return s;
}

function loadLocal(): ProgressState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    const s = (parsed ? sanitize(parsed) : null) ?? fresh();

    // Pull level for discipline directly from cached account data without erasing user checkmarks
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
                s.crafting[disc] = {
                  ...DEFAULT_CRAFTING,
                  start: rating,
                  target,
                };
              } else {
                s.crafting[disc].start = rating;
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
  state = { ...state, savedAt: Date.now() };
  const json = JSON.stringify(state);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, json);
    }
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
      state = mirror;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(KEY, JSON.stringify(state));
        }
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

function resolveCharKey(charName?: string | null): string {
  const trimmed = charName?.trim();
  if (trimmed) return trimmed;
  return state.plannerPreferences?.selectedCharacter?.trim() || DEFAULT_CHARACTER_KEY;
}

function getStepCurrentStatus(dp: { doneSteps: string[]; skippedSteps?: string[]; deferredSteps?: string[] }, key: string): TaskOrStepStatus {
  if (dp.doneSteps.includes(key)) return 'completed';
  if (dp.skippedSteps?.includes(key)) return 'skipped';
  if (dp.deferredSteps?.includes(key)) return 'deferred';
  return 'open';
}

function getTaskCurrentStatus(cp: CharacterPlannerProgress, taskId: string): TaskOrStepStatus {
  if (cp.completedTaskIds.includes(taskId)) return 'completed';
  if (cp.skippedTaskIds.includes(taskId)) return 'skipped';
  if (cp.deferredTaskIds.includes(taskId)) return 'deferred';
  return 'open';
}

function applyStatusTransition(
  lists: { completed: string[]; skipped: string[]; deferred: string[] },
  id: string,
  nextStatus: TaskOrStepStatus,
): { completed: string[]; skipped: string[]; deferred: string[] } {
  const completed = lists.completed.filter((x) => x !== id);
  const skipped = lists.skipped.filter((x) => x !== id);
  const deferred = lists.deferred.filter((x) => x !== id);
  if (nextStatus === 'completed') completed.push(id);
  else if (nextStatus === 'skipped') skipped.push(id);
  else if (nextStatus === 'deferred') deferred.push(id);
  return { completed, skipped, deferred };
}

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
    update((s) => {
      const cur = s.crafting[discipline] ?? DEFAULT_CRAFTING;
      const updated = { ...cur, ...patch };
      const charKey = resolveCharKey();
      const charProg = s.characterProgress[charKey] ?? createEmptyCharacterProgress(charKey);
      const curCharDisc = charProg.disciplines[discipline] ?? createEmptyCharacterDiscipline(discipline);
      return {
        ...s,
        crafting: { ...s.crafting, [discipline]: updated },
        characterProgress: {
          ...s.characterProgress,
          [charKey]: {
            ...charProg,
            disciplines: {
              ...charProg.disciplines,
              [discipline]: {
                ...curCharDisc,
                ...(patch.target !== undefined ? { target: patch.target } : {}),
                ...(patch.start !== undefined ? { start: patch.start } : {}),
                ...(patch.doneSteps !== undefined ? { doneSteps: uniqueStrings(patch.doneSteps) } : {}),
                ...(patch.skippedSteps !== undefined ? { skippedSteps: uniqueStrings(patch.skippedSteps) } : {}),
                ...(patch.deferredSteps !== undefined ? { deferredSteps: uniqueStrings(patch.deferredSteps) } : {}),
                ...(patch.allowDiscovery !== undefined ? { allowDiscovery: patch.allowDiscovery } : {}),
                ...(patch.craftIntermediates !== undefined ? { craftIntermediates: patch.craftIntermediates } : {}),
              },
            },
          },
        },
      };
    });
  },
  toggleStepDone(discipline: string, key: string, characterName?: string | null) {
    const charKey = resolveCharKey(characterName);
    const charProg = state.characterProgress[charKey];
    const charDisc = charProg?.disciplines?.[discipline];
    const curSteps = charDisc ? charDisc.doneSteps : (state.crafting[discipline]?.doneSteps ?? []);
    const isCurrentlyDone = curSteps.includes(key);
    this.setStepStatus(charKey, discipline, key, isCurrentlyDone ? 'open' : 'completed');
  },
  resetDisciplineCheckmarks(discipline: string, characterName?: string | null) {
    update((s) => {
      const charKey = resolveCharKey(characterName);
      const cur = s.crafting[discipline] ?? DEFAULT_CRAFTING;
      const charProg = s.characterProgress[charKey] ?? createEmptyCharacterProgress(charKey);
      const charDisc = charProg.disciplines[discipline] ?? createEmptyCharacterDiscipline(discipline);
      return {
        ...s,
        crafting: {
          ...s.crafting,
          [discipline]: { ...cur, doneSteps: [], skippedSteps: [], deferredSteps: [] },
        },
        characterProgress: {
          ...s.characterProgress,
          [charKey]: {
            ...charProg,
            disciplines: {
              ...charProg.disciplines,
              [discipline]: {
                ...charDisc,
                doneSteps: [],
                skippedSteps: [],
                deferredSteps: [],
              },
            },
          },
        },
      };
    });
  },
  resetAllCraftingCheckmarks() {
    update((s) => {
      const nextCrafting: Record<string, CraftingProgress> = {};
      for (const [k, v] of Object.entries(s.crafting)) {
        nextCrafting[k] = { ...v, doneSteps: [], skippedSteps: [], deferredSteps: [] };
      }
      const nextChars: Record<string, CharacterPlannerProgress> = {};
      for (const [ck, cv] of Object.entries(s.characterProgress)) {
        const nextDiscs: Record<string, CharacterDisciplineProgress> = {};
        for (const [dk, dv] of Object.entries(cv.disciplines)) {
          nextDiscs[dk] = { ...dv, doneSteps: [], skippedSteps: [], deferredSteps: [] };
        }
        nextChars[ck] = { ...cv, disciplines: nextDiscs };
      }
      return { ...s, crafting: nextCrafting, characterProgress: nextChars };
    });
  },
  syncAccountRatings(
    craftingRatings: Record<string, { rating: number; character: string }> | null,
    characters?: { name: string; level?: number; crafting?: { discipline: string; rating: number }[] }[] | null,
  ) {
    if (!craftingRatings && !characters) return;
    update((s) => {
      const nextCrafting = { ...s.crafting };
      if (craftingRatings) {
        for (const [disc, info] of Object.entries(craftingRatings)) {
          const cur = nextCrafting[disc] ?? DEFAULT_CRAFTING;
          let target = cur.target;
          if (target <= info.rating) {
            target = disc === 'Jeweler'
              ? Math.max(400, info.rating)
              : (info.rating >= 400 ? 500 : Math.min(500, Math.max(info.rating + 25, 400)));
          }
          // Preserve existing doneSteps, skippedSteps, deferredSteps, and options on refresh!
          nextCrafting[disc] = {
            ...cur,
            start: info.rating,
            target,
          };
        }
      }

      const nextChars = { ...s.characterProgress };
      if (Array.isArray(characters)) {
        for (const ch of characters) {
          if (!ch?.name) continue;
          const curChar = nextChars[ch.name] ?? createEmptyCharacterProgress(ch.name);
          const nextDiscs = { ...curChar.disciplines };
          for (const cr of ch.crafting ?? []) {
            if (!cr?.discipline) continue;
            const curD = nextDiscs[cr.discipline] ?? createEmptyCharacterDiscipline(cr.discipline);
            let target = curD.target;
            if (target <= cr.rating) {
              target = cr.discipline === 'Jeweler'
                ? Math.max(400, cr.rating)
                : (cr.rating >= 400 ? 500 : Math.min(500, Math.max(cr.rating + 25, 400)));
            }
            nextDiscs[cr.discipline] = {
              ...curD,
              start: cr.rating,
              target,
            };
          }
          nextChars[ch.name] = {
            ...curChar,
            characterName: ch.name,
            manualLevel: typeof ch.level === 'number' ? Math.max(1, Math.min(80, ch.level)) : curChar.manualLevel,
            disciplines: nextDiscs,
          };
        }
      }

      return { ...s, crafting: nextCrafting, characterProgress: nextChars };
    });
  },

  // ==========================================
  // CHARACTER-SPECIFIC & PLANNER PREFERENCE ACTIONS
  // ==========================================
  getPlannerPreferences(): PlannerPreferences {
    return state.plannerPreferences ?? DEFAULT_PLANNER_PREFERENCES;
  },

  setPlannerPreferences(patch: Partial<PlannerPreferences>) {
    update((s) => ({
      ...s,
      plannerPreferences: {
        ...(s.plannerPreferences ?? DEFAULT_PLANNER_PREFERENCES),
        ...patch,
      },
    }));
  },

  setSelectedCharacter(characterName: string | null) {
    const clean = characterName && characterName.trim() ? characterName.trim() : null;
    update((s) => ({
      ...s,
      plannerPreferences: {
        ...(s.plannerPreferences ?? DEFAULT_PLANNER_PREFERENCES),
        selectedCharacter: clean,
      },
    }));
  },

  setPlanningMode(mode: PlannerMode) {
    update((s) => ({
      ...s,
      plannerPreferences: {
        ...(s.plannerPreferences ?? DEFAULT_PLANNER_PREFERENCES),
        mode,
      },
    }));
  },

  getCharacterProgress(characterName?: string | null): CharacterPlannerProgress {
    const key = resolveCharKey(characterName);
    return state.characterProgress[key] ?? createEmptyCharacterProgress(key);
  },

  getCharacterDiscipline(characterName: string | null | undefined, discipline: string): CharacterDisciplineProgress {
    const key = resolveCharKey(characterName);
    const charProg = state.characterProgress[key];
    if (charProg?.disciplines?.[discipline]) {
      return charProg.disciplines[discipline];
    }
    // Fallback to global crafting progress if migrating from legacy single-character state
    if (key === DEFAULT_CHARACTER_KEY && state.crafting[discipline]) {
      const legacy = state.crafting[discipline];
      return {
        target: legacy.target,
        start: legacy.start,
        doneSteps: [...(legacy.doneSteps ?? [])],
        skippedSteps: [...(legacy.skippedSteps ?? [])],
        deferredSteps: [...(legacy.deferredSteps ?? [])],
        allowDiscovery: Boolean(legacy.allowDiscovery),
        craftIntermediates: Boolean(legacy.craftIntermediates),
      };
    }
    return createEmptyCharacterDiscipline(discipline);
  },

  setCharacterDiscipline(
    characterName: string | null | undefined,
    discipline: string,
    patch: Partial<CharacterDisciplineProgress>,
  ) {
    update((s) => {
      const key = resolveCharKey(characterName);
      const charProg = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      const curDisc = charProg.disciplines[discipline] ?? createEmptyCharacterDiscipline(discipline);
      const nextDisc: CharacterDisciplineProgress = {
        ...curDisc,
        ...patch,
      };
      const norm = normalizeMutuallyExclusiveLists(nextDisc.doneSteps, nextDisc.skippedSteps, nextDisc.deferredSteps);
      nextDisc.doneSteps = norm.completed;
      nextDisc.skippedSteps = norm.skipped;
      nextDisc.deferredSteps = norm.deferred;

      const curGlobal = s.crafting[discipline] ?? DEFAULT_CRAFTING;
      return {
        ...s,
        crafting: {
          ...s.crafting,
          [discipline]: {
            ...curGlobal,
            target: nextDisc.target,
            start: nextDisc.start,
            doneSteps: nextDisc.doneSteps,
            skippedSteps: nextDisc.skippedSteps,
            deferredSteps: nextDisc.deferredSteps,
            allowDiscovery: nextDisc.allowDiscovery,
            craftIntermediates: nextDisc.craftIntermediates,
          },
        },
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...charProg,
            disciplines: {
              ...charProg.disciplines,
              [discipline]: nextDisc,
            },
          },
        },
      };
    });
  },

  setCharacterManualLevel(characterName: string | null | undefined, level: number) {
    const cleanLevel = Math.max(1, Math.min(80, Math.round(level || 1)));
    update((s) => {
      const key = resolveCharKey(characterName);
      const charProg = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      return {
        ...s,
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...charProg,
            manualLevel: cleanLevel,
          },
        },
      };
    });
  },

  setCharacterTargetMilestone(characterName: string | null | undefined, milestoneId: string | null) {
    update((s) => {
      const key = resolveCharKey(characterName);
      const charProg = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      return {
        ...s,
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...charProg,
            targetMilestoneId: milestoneId,
          },
        },
      };
    });
  },

  setStepStatus(
    characterName: string | null | undefined,
    discipline: string,
    stepKey: string,
    nextStatus: TaskOrStepStatus,
    recordUndo = true,
  ) {
    if (!stepKey) return;
    update((s) => {
      const key = resolveCharKey(characterName);
      const charProg = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      const curDisc = charProg.disciplines[discipline] ?? (
        key === DEFAULT_CHARACTER_KEY && s.crafting[discipline]
          ? {
              ...createEmptyCharacterDiscipline(discipline),
              target: s.crafting[discipline].target,
              start: s.crafting[discipline].start,
              doneSteps: [...(s.crafting[discipline].doneSteps ?? [])],
              skippedSteps: [...(s.crafting[discipline].skippedSteps ?? [])],
              deferredSteps: [...(s.crafting[discipline].deferredSteps ?? [])],
            }
          : createEmptyCharacterDiscipline(discipline)
      );
      const prevStatus = getStepCurrentStatus(curDisc, stepKey);
      if (prevStatus === nextStatus) return s;

      const updatedLists = applyStatusTransition(
        {
          completed: curDisc.doneSteps,
          skipped: curDisc.skippedSteps,
          deferred: curDisc.deferredSteps,
        },
        stepKey,
        nextStatus,
      );

      const nextUndoStack = recordUndo
        ? [
            ...charProg.undoStack.slice(-24),
            {
              id: `step:${discipline}:${stepKey}:${Date.now()}`,
              scope: 'step' as const,
              targetId: stepKey,
              discipline,
              previousState: prevStatus,
              newState: nextStatus,
              timestamp: Date.now(),
            },
          ]
        : charProg.undoStack;

      const curGlobal = s.crafting[discipline] ?? DEFAULT_CRAFTING;

      return {
        ...s,
        crafting: {
          ...s.crafting,
          [discipline]: {
            ...curGlobal,
            doneSteps: updatedLists.completed,
            skippedSteps: updatedLists.skipped,
            deferredSteps: updatedLists.deferred,
          },
        },
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...charProg,
            undoStack: nextUndoStack,
            disciplines: {
              ...charProg.disciplines,
              [discipline]: {
                ...curDisc,
                doneSteps: updatedLists.completed,
                skippedSteps: updatedLists.skipped,
                deferredSteps: updatedLists.deferred,
              },
            },
          },
        },
      };
    });
  },

  setTaskStatus(
    characterName: string | null | undefined,
    taskId: string,
    nextStatus: TaskOrStepStatus,
    recordUndo = true,
  ) {
    if (!taskId) return;
    update((s) => {
      const key = resolveCharKey(characterName);
      const charProg = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      const prevStatus = getTaskCurrentStatus(charProg, taskId);
      if (prevStatus === nextStatus) return s;

      const updatedLists = applyStatusTransition(
        {
          completed: charProg.completedTaskIds,
          skipped: charProg.skippedTaskIds,
          deferred: charProg.deferredTaskIds,
        },
        taskId,
        nextStatus,
      );

      const nextUndoStack = recordUndo
        ? [
            ...charProg.undoStack.slice(-24),
            {
              id: `task:${taskId}:${Date.now()}`,
              scope: 'task' as const,
              targetId: taskId,
              previousState: prevStatus,
              newState: nextStatus,
              timestamp: Date.now(),
            },
          ]
        : charProg.undoStack;

      return {
        ...s,
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...charProg,
            completedTaskIds: updatedLists.completed,
            skippedTaskIds: updatedLists.skipped,
            deferredTaskIds: updatedLists.deferred,
            undoStack: nextUndoStack,
          },
        },
      };
    });
  },

  toggleTaskCompleted(characterName: string | null | undefined, taskId: string) {
    const cp = this.getCharacterProgress(characterName);
    const cur = getTaskCurrentStatus(cp, taskId);
    this.setTaskStatus(characterName, taskId, cur === 'completed' ? 'open' : 'completed');
  },

  skipTask(characterName: string | null | undefined, taskId: string) {
    const cp = this.getCharacterProgress(characterName);
    const cur = getTaskCurrentStatus(cp, taskId);
    this.setTaskStatus(characterName, taskId, cur === 'skipped' ? 'open' : 'skipped');
  },

  deferTask(characterName: string | null | undefined, taskId: string) {
    const cp = this.getCharacterProgress(characterName);
    const cur = getTaskCurrentStatus(cp, taskId);
    this.setTaskStatus(characterName, taskId, cur === 'deferred' ? 'open' : 'deferred');
  },

  undoLastPlannerAction(characterName?: string | null): PlannerUndoEntry | null {
    const key = resolveCharKey(characterName);
    const charProg = state.characterProgress[key];
    if (!charProg || charProg.undoStack.length === 0) return null;
    const last = charProg.undoStack[charProg.undoStack.length - 1];
    update((s) => {
      const cp = s.characterProgress[key];
      if (!cp || cp.undoStack.length === 0) return s;
      const popped = cp.undoStack[cp.undoStack.length - 1];
      const remainingUndo = cp.undoStack.slice(0, -1);

      if (popped.scope === 'task') {
        const updatedLists = applyStatusTransition(
          {
            completed: cp.completedTaskIds,
            skipped: cp.skippedTaskIds,
            deferred: cp.deferredTaskIds,
          },
          popped.targetId,
          popped.previousState,
        );
        return {
          ...s,
          characterProgress: {
            ...s.characterProgress,
            [key]: {
              ...cp,
              completedTaskIds: updatedLists.completed,
              skippedTaskIds: updatedLists.skipped,
              deferredTaskIds: updatedLists.deferred,
              undoStack: remainingUndo,
            },
          },
        };
      } else {
        const disc = popped.discipline ?? 'Weaponsmith';
        const curDisc = cp.disciplines[disc] ?? createEmptyCharacterDiscipline(disc);
        const updatedLists = applyStatusTransition(
          {
            completed: curDisc.doneSteps,
            skipped: curDisc.skippedSteps,
            deferred: curDisc.deferredSteps,
          },
          popped.targetId,
          popped.previousState,
        );
        const curGlobal = s.crafting[disc] ?? DEFAULT_CRAFTING;
        return {
          ...s,
          crafting: {
            ...s.crafting,
            [disc]: {
              ...curGlobal,
              doneSteps: updatedLists.completed,
              skippedSteps: updatedLists.skipped,
              deferredSteps: updatedLists.deferred,
            },
          },
          characterProgress: {
            ...s.characterProgress,
            [key]: {
              ...cp,
              undoStack: remainingUndo,
              disciplines: {
                ...cp.disciplines,
                [disc]: {
                  ...curDisc,
                  doneSteps: updatedLists.completed,
                  skippedSteps: updatedLists.skipped,
                  deferredSteps: updatedLists.deferred,
                },
              },
            },
          },
        };
      }
    });
    return last;
  },

  resetCharacterTasks(characterName?: string | null) {
    update((s) => {
      const key = resolveCharKey(characterName);
      const cp = s.characterProgress[key] ?? createEmptyCharacterProgress(key);
      return {
        ...s,
        characterProgress: {
          ...s.characterProgress,
          [key]: {
            ...cp,
            completedTaskIds: [],
            skippedTaskIds: [],
            deferredTaskIds: [],
            undoStack: [],
          },
        },
      };
    });
  },

  /** Reloads state from localStorage (or raw serialized state) to support session restart verification */
  reloadFromStorage(rawOverride?: unknown): ProgressState {
    if (rawOverride !== undefined) {
      state = sanitize(rawOverride) ?? fresh();
      persist();
      emitter.emit();
      return state;
    }
    state = loadLocal();
    emitter.emit();
    return state;
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
    worldBosses?: string[] | null,
    mapChests?: string[] | null,
  ): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (state.dailyCompletedDates?.[eventId] === todayStr) {
      return true;
    }
    const wbKey = EVENT_TO_WORLD_BOSS_API_MAP[eventId];
    if (wbKey && Array.isArray(worldBosses) && worldBosses.includes(wbKey)) {
      return true;
    }
    const chestKey = EVENT_TO_MAP_CHEST_API_MAP[eventId];
    if (chestKey && Array.isArray(mapChests) && mapChests.includes(chestKey)) {
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
