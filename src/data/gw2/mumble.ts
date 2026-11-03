import { useSyncExternalStore } from 'react';
import type { WorldEvent } from '../../types';

export interface MumbleIdentity {
  name?: string;
  profession?: number; // 1: Guardian, 2: Warrior, 3: Engineer, 4: Ranger, 5: Thief, 6: Elementalist, 7: Mesmer, 8: Necromancer, 9: Revenant
  spec?: number;
  race?: number; // 0: Asura, 1: Charr, 2: Human, 3: Norn, 4: Sylvari
  map_id?: number;
  world_id?: number;
  team_color_id?: number;
  commander?: boolean;
  fov?: number;
  uisz?: number;
}

export interface MumbleData {
  connected: boolean;
  tick?: number;
  mapId?: number;
  mapType?: number;
  shardId?: number;
  instance?: number;
  buildId?: number;
  uiState?: number;
  isMapOpen?: boolean;
  isInCombat?: boolean;
  gameHasFocus?: boolean;
  compassWidth?: number;
  compassHeight?: number;
  compassRotation?: number;
  playerX?: number;
  playerY?: number;
  identity?: MumbleIdentity;
}

export const MUMBLE_PROFESSIONS: Record<number, { en: string; de: string }> = {
  1: { en: 'Guardian', de: 'Wächter' },
  2: { en: 'Warrior', de: 'Krieger' },
  3: { en: 'Engineer', de: 'Ingenieur' },
  4: { en: 'Ranger', de: 'Waldläufer' },
  5: { en: 'Thief', de: 'Dieb' },
  6: { en: 'Elementalist', de: 'Elementarmagier' },
  7: { en: 'Mesmer', de: 'Mesmer' },
  8: { en: 'Necromancer', de: 'Nekromant' },
  9: { en: 'Revenant', de: 'Widergänger' },
};

export const MUMBLE_RACES: Record<number, { en: string; de: string }> = {
  0: { en: 'Asura', de: 'Asura' },
  1: { en: 'Charr', de: 'Charr' },
  2: { en: 'Human', de: 'Mensch' },
  3: { en: 'Norn', de: 'Norn' },
  4: { en: 'Sylvari', de: 'Sylvari' },
};

export function getProfessionName(id?: number, lang: 'de' | 'en' = 'de'): string | null {
  if (id === undefined || !MUMBLE_PROFESSIONS[id]) return null;
  return MUMBLE_PROFESSIONS[id][lang];
}

export function getRaceName(id?: number, lang: 'de' | 'en' = 'de'): string | null {
  if (id === undefined || !MUMBLE_RACES[id]) return null;
  return MUMBLE_RACES[id][lang];
}

/** Official GW2 Map IDs mapped to primary zone names */
export const GW2_MAP_ZONE_MAP: Record<number, { de: string; en: string }> = {
  // Core Tyria & Capital Cities
  15: { de: 'Königintal', en: 'Queensdale' },
  17: { de: 'Harathi-Hinterland', en: 'Harathi Hinterlands' },
  18: { de: 'Götterfels', en: "Divinity's Reach" },
  19: { de: 'Ebenen von Aschfurt', en: 'Plains of Ashford' },
  20: { de: 'Flammenkamm-Steppen', en: 'Blazeridge Steppes' },
  21: { de: 'Felder der Verwüstung', en: 'Fields of Ruin' },
  22: { de: 'Feuerherzhügel', en: 'Fireheart Rise' },
  23: { de: 'Kessex-Hügel', en: 'Kessex Hills' },
  24: { de: 'Gendarran-Felder', en: 'Gendarran Fields' },
  25: { de: 'Eisenmark', en: 'Iron Marches' },
  26: { de: 'Dredgehaunt-Klippen', en: 'Dredgehaunt Cliffs' },
  27: { de: 'Lornars Pass', en: "Lornar's Pass" },
  28: { de: 'Wanderer-Hügel', en: 'Wayfarer Foothills' },
  29: { de: 'Baumgrenzen-Fälle', en: 'Timberline Falls' },
  30: { de: 'Eisklamm-Sunde', en: 'Frostgorge Sound' },
  31: { de: 'Schneekuhlen-Höhen', en: 'Snowden Drifts' },
  32: { de: 'Diessa-Plateau', en: 'Diessa Plateau' },
  34: { de: 'Caledon-Wald', en: 'Caledon Forest' },
  35: { de: 'Provinz Metrica', en: 'Metrica Province' },
  39: { de: 'Mahlstromgipfel', en: 'Mount Maelstrom' },
  50: { de: 'Löwenstein', en: "Lion's Arch" },
  51: { de: 'Meerenge der Verwüstung', en: 'Straits of Devastation' },
  53: { de: 'Funkenschwärmersumpf', en: 'Sparkfly Fen' },
  54: { de: 'Brisban-Wildnis', en: 'Brisban Wildlands' },
  62: { de: 'Fluchküste', en: 'Cursed Shore' },
  65: { de: 'Malchors Sprung', en: "Malchor's Leap" },
  73: { de: 'Blutstrom-Küste', en: 'Bloodtide Coast' },
  91: { de: 'Der Hain', en: 'The Grove' },
  139: { de: 'Rata Sum', en: 'Rata Sum' },
  218: { de: 'Schwarze Zitadelle', en: 'Black Citadel' },
  326: { de: 'Hoelbrak', en: 'Hoelbrak' },
  873: { de: 'Südlicht-Bucht', en: 'Southsun Cove' },
  988: { de: 'Trockenkuppe', en: 'Dry Top' },
  1015: { de: 'Die Silberwüste', en: 'The Silverwastes' },
  1206: { de: 'Nebelperre-Heiligtum', en: 'Mistlock Sanctuary' },

  // Heart of Thorns
  1041: { de: 'Widerstand des Drachen', en: "Dragon's Stand" },
  1043: { de: 'Güldener Talkessel', en: 'Auric Basin' },
  1045: { de: 'Verschlungene Tiefen', en: 'Tangled Depths' },
  1052: { de: 'Grasgrüne Schwelle', en: 'Verdant Brink' },

  // Path of Fire & Living World Season 4
  1210: { de: 'Kristall-Oase', en: 'Crystal Oasis' },
  1211: { de: 'Wüsten-Hochland', en: 'Desert Highlands' },
  1226: { de: 'Das Ödland', en: 'The Desolation' },
  1228: { de: 'Elon-Flusslande', en: 'Elon Riverlands' },
  1248: { de: 'Domäne Vabbi', en: 'Domain of Vabbi' },
  1263: { de: 'Domäne Istan', en: 'Domain of Istan' },
  1301: { de: 'Jahai-Klippen', en: 'Jahai Bluffs' },
  1310: { de: 'Donnerkopf-Gipfel', en: 'Thunderhead Peaks' },

  // Icebrood Saga
  1330: { de: 'Grothmar-Tal', en: 'Grothmar Valley' },
  1343: { de: 'Bjora-Sümpfe', en: 'Bjora Marches' },
  1370: { de: 'Auge des Nordens', en: 'Eye of the North' },
  1371: { de: 'Nieselwald-Küste', en: 'Drizzlewood Coast' },

  // End of Dragons
  1422: { de: 'Das Drachen-Ende', en: "Dragon's End" },
  1428: { de: 'Steinwiese', en: 'Arborstone' },
  1438: { de: 'Neu-Kaineng', en: 'New Kaineng City' },
  1442: { de: 'Provinz Seitung', en: 'Seitung Province' },
  1452: { de: 'Echowald-Wildnis', en: 'The Echovald Wilds' },
  1490: { de: 'Die Tiefen von Gyala', en: 'Gyala Delve' },

  // Secrets of the Obscure
  1489: { de: 'Himmelswacht-Archipel', en: 'Skywatch Archipelago' }, // Instance alias
  1509: { de: 'Turm der Zauberer', en: "The Wizard's Tower" },
  1510: { de: 'Himmelswacht-Archipel', en: 'Skywatch Archipelago' },
  1517: { de: 'Amnytas', en: 'Amnytas' },
  1526: { de: 'Inneres Nayos', en: 'Inner Nayos' },

  // Janthir Wilds & Visions of Eternity
  1538: { de: 'Janthir-Syntri', en: 'Janthir Syntri' }, // Instance alias
  1550: { de: 'Tiefland-Küste', en: 'Lowland Shore' },
  1554: { de: 'Janthir-Syntri', en: 'Janthir Syntri' },
  1574: { de: 'Bava Nisos', en: 'Bava Nisos' },
};

/**
 * Checks whether an event occurs on the given player's map ID.
 */
export function isEventOnMap(event: WorldEvent, currentMapId?: number): boolean {
  if (!currentMapId || currentMapId <= 0) return false;

  // Direct mapId match
  if (event.mapId !== undefined && event.mapId === currentMapId) {
    return true;
  }

  // Zone name comparison
  const mapZone = GW2_MAP_ZONE_MAP[currentMapId];
  if (!mapZone) return false;

  const eventZoneDe = event.zone.toLowerCase();
  const eventZoneEn = (event.zoneEn || '').toLowerCase();
  const knownDe = mapZone.de.toLowerCase();
  const knownEn = mapZone.en.toLowerCase();

  return (
    eventZoneDe.includes(knownDe) ||
    knownDe.includes(eventZoneDe) ||
    (eventZoneEn.length > 0 && (eventZoneEn.includes(knownEn) || knownEn.includes(eventZoneEn)))
  );
}

// Global in-memory state store for reactive MumbleLink updates
let currentMumbleData: MumbleData = { connected: false };
let lastNotifiedAt = 0;
const listeners = new Set<() => void>();

function notifyMumbleListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_) {}
  });
}

/**
 * Returns true if the incoming update contains semantically meaningful changes
 * for the UI (combat state, map ID, character name/profession, window focus, connection).
 * Ignoring pure coordinate/tick jitter prevents up to 20 re-renders per second.
 */
function hasSemanticMumbleChange(prev: MumbleData, next: MumbleData): boolean {
  if (prev.connected !== next.connected) return true;
  if (prev.isInCombat !== next.isInCombat) return true;
  if (prev.mapId !== next.mapId) return true;
  if (prev.isMapOpen !== next.isMapOpen) return true;
  if (prev.gameHasFocus !== next.gameHasFocus) return true;
  if (prev.identity?.name !== next.identity?.name) return true;
  if (prev.identity?.profession !== next.identity?.profession) return true;
  if (prev.identity?.spec !== next.identity?.spec) return true;
  return false;
}

function updateMumbleData(next: MumbleData) {
  const prev = currentMumbleData;
  currentMumbleData = next;

  const now = Date.now();
  // Fire immediately if state changed (combat, map, character), or throttle heartbeats to 1s
  if (hasSemanticMumbleChange(prev, next) || now - lastNotifiedAt >= 1000) {
    lastNotifiedAt = now;
    notifyMumbleListeners();
  }
}

// Initial setup with electronAPI bridge
if (typeof window !== 'undefined') {
  const electron = (window as unknown as {
    electronAPI?: {
      mumble?: {
        getData: () => Promise<MumbleData>;
        onUpdate: (cb: (data: MumbleData) => void) => () => void;
      };
    };
  }).electronAPI;

  if (electron?.mumble) {
    electron.mumble.getData().then((data) => {
      if (data) updateMumbleData(data);
    }).catch(() => {});

    electron.mumble.onUpdate((data) => {
      if (data) updateMumbleData(data);
    });
  }
}

/**
 * Subscribes to live MumbleLink telemetry data using React's useSyncExternalStore.
 */
export function useMumbleLink(): MumbleData {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => currentMumbleData,
    () => ({ connected: false }),
  );
}

