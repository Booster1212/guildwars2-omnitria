/**
 * Persönlicher Fortschritt (Legendäre Waffen, Handwerk).
 *
 * Persistenz (zweifach, damit nichts verloren geht):
 *   1. localStorage (bestehende Architektur der App, Präfix "gw2_overlay_")
 *   2. In Electron zusätzlich eine JSON-Datei im Benutzerdatenordner (über IPC), unabhängig vom Origin
 *      (file:// vs. Dev-Server). Beim Start gewinnt der neuere Stand (`savedAt`).
 *
 * Schema ist versioniert; unbekannte/neuere Versionen werden gesichert statt überschrieben.
 */
import { useSyncExternalStore } from 'react';
import { createEmitter } from './gw2/cache';

const KEY = 'gw2_overlay_progress_v1';
const BACKUP_KEY = 'gw2_overlay_progress_backup';
export const SCHEMA_VERSION = 1;

export interface LegendaryProgress {
  /** Als erledigt markierte Komponenten (Pfadschlüssel) */
  doneNodes: string[];
  /** Als vollständig vorhanden markierte Basismaterialien */
  doneMaterials: number[];
  /** Gegenstände, die gekauft statt hergestellt werden */
  buyItems: number[];
}

export interface CraftingProgress {
  target: number;
  /** Manuell gesetzter Startrang (falls API-Rang nicht verfügbar) */
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
}

export const DEFAULT_CRAFTING: CraftingProgress = {
  target: 400,
  start: null,
  doneSteps: [],
  allowDiscovery: false,
  craftIntermediates: true,
};

const emptyLegendary = (): LegendaryProgress => ({ doneNodes: [], doneMaterials: [], buyItems: [] });

function fresh(): ProgressState {
  return { version: SCHEMA_VERSION, savedAt: 0, tracked: [], legendary: {}, crafting: {} };
}

interface ElectronStore {
  readStore?: (name: string) => Promise<string | null>;
  writeStore?: (name: string, json: string) => void;
}
const electron = (): ElectronStore | undefined =>
  (window as unknown as { electronAPI?: ElectronStore }).electronAPI;

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
      s.crafting[k] = { ...DEFAULT_CRAFTING, ...(v as Partial<CraftingProgress>) };
    }
  }
  return s;
}

function loadLocal(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw);
    const s = sanitize(parsed);
    if (s) return s;
    localStorage.setItem(BACKUP_KEY, raw); // unbekannte Version -> sichern
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
};
