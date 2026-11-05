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
  doesCompassHaveRotation?: boolean;
  compassWidth?: number;
  compassHeight?: number;
  compassRotation?: number;
  playerX?: number;
  playerY?: number;
  mapCenterX?: number;
  mapCenterY?: number;
  mapScale?: number;
  camFrontX?: number;
  camFrontZ?: number;
  avatarX?: number;
  avatarZ?: number;
  avatarFrontX?: number;
  avatarFrontZ?: number;
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

/**
 * Canonical Guild Wars 2 continent coordinates for all 58 world bosses and meta events
 * (extracted from official ArenaNet /v2/continents PoI & Waypoint coordinates).
 */
export const EVENT_CONTINENT_COORDS: Record<string, [number, number]> = {
  // Core Tyria World Bosses & Orr Temples
  'svanir-shaman': [55804, 29098],
  'fire-elemental': [40841, 33722],
  'jungle-wurm': [42351, 32965],
  'great-jungle-wurm': [42351, 32965], // Legacy alias
  'shadow-behemoth': [44959, 30336],
  'taidha-covington': [48916, 33772],
  'megadestroyer': [51987, 39515],
  'shatterer': [62591, 29268],
  'modniir-ulgoth': [48809, 26175],
  'inquest-golem': [53918, 39300],
  'claw-of-jormag': [56298, 25884],
  'tequatl': [48648, 38361],
  'karka-queen': [45606, 36767],
  'triple-trouble': [49401, 34072],
  'cathedral-of-zephyrs': [44889, 40703],
  'cathedral-of-eternal-radiance': [45970, 40323],
  'ley-line-anomaly': [48552, 28867],
  'cathedral-of-glorious-anticipation': [47819, 40960],
  'cathedral-of-silence': [44209, 42598],
  'cathedral-of-verdance': [43954, 43173],
  'gates-of-arah': [44755, 44115],

  // Living World Season 1 & 2
  'silverwastes-vinewrath': [38451, 31737],
  'dry-top-sandstorm': [38299, 33089],
  'twisted-marionette': [57865, 21795],

  // Heart of Thorns
  'tarir-octovine': [34318, 33966],
  'tarir': [34318, 33966], // Legacy alias
  'chak-gerent': [37247, 35516],
  'verdant-brink-night': [35166, 31785],
  'dragons-stand': [36649, 36232],

  // Path of Fire & Living World Season 4
  'choya-pinata': [58615, 43743],
  'buried-treasure': [60677, 42149],
  'maws-of-torment': [59187, 50521],
  'junundu-rising': [61423, 51140],
  'augury-rock': [61075, 45581],
  'serpents-ire': [67376, 53931],
  'forged-with-fire': [64291, 53304],
  'palawadan-jewel': [57793, 61028],
  'death-branded-shatterer': [64762, 59142],
  'thunderhead-peaks': [58329, 35779],

  // Icebrood Saga
  'grothmar-metal-concert': [61288, 19612],
  'drakkar': [56616, 17815],
  'drizzlewood-south': [50992, 21878],
  'drizzlewood-north': [50444, 19441],
  'dragonstorm': [57865, 21795],

  // End of Dragons
  'aetherblade-assault': [23191, 101452],
  'kaineng-blackout': [26674, 99438],
  'gangs-of-echovald': [30896, 101005],
  'dragons-end': [33826, 102383],
  'gyala-delve': [37815, 103075],

  // Secrets of the Obscure
  'skywatch-tower': [24327, 23533],
  'defense-of-amnytas': [23898, 21159],
  'convergences-public': [24103, 22231],
  'inner-nayos-eparch': [22367, 23761],
  'nayos-heitors-gate': [21734, 22801],

  // Janthir Wilds & Visions of Eternity
  'lowland-shore-gathering': [42924, 22730],
  'janthir-syntri-titans': [40128, 14659],
  'janthir-convergence': [40825, 16638],
  'janthir-bava-nisos': [36051, 11654],
  'castora-starlit-weald': [42039, 22798],
  'castora-ruins-eternity': [42039, 22798],
};

/** Fallback continent centers by mapId */
export const MAP_CONTINENT_CENTERS: Record<number, [number, number]> = {
  15: [44416, 29248],
  17: [48384, 26752],
  20: [62336, 29248],
  24: [48896, 29184],
  28: [55424, 29952],
  30: [55424, 25088],
  34: [43520, 34560],
  35: [41024, 35200],
  39: [52864, 39680],
  50: [48970, 30918],
  51: [47872, 40576],
  53: [49024, 37632],
  62: [44544, 43904],
  65: [45312, 40576],
  73: [48640, 33664],
  873: [45824, 36736],
  988: [37760, 32640],
  1015: [38144, 30848],
  1041: [36352, 36992],
  1043: [34816, 33920],
  1045: [37248, 35456],
  1052: [33920, 31872],
  1210: [59816, 43584],
  1211: [59816, 41024],
  1226: [60032, 50752],
  1228: [60032, 46464],
  1248: [66048, 53952],
  1263: [57856, 61696],
  1301: [65364, 57976],
  1310: [57984, 35456],
  1330: [60992, 19392],
  1343: [56512, 18176],
  1370: [57792, 21824],
  1371: [50688, 20480],
  1422: [33792, 102400],
  1438: [27648, 99328],
  1442: [24576, 102400],
  1452: [30720, 101376],
  1490: [37376, 102912],
  1509: [24128, 22208],
  1510: [24256, 23488],
  1517: [23872, 21184],
  1526: [22016, 23296],
  1550: [42039, 22798],
  1554: [40555, 15984],
  1574: [36124, 11738],
};

export interface SpatialWayfinding {
  distanceLabel: string;
  distanceUnits: number;
  arrow: string;
  cardinal: string;
  compassCardinal: string;
  angleDeg: number;
  worldAngleDeg: number;
  turnInstructionEn: string;
  turnInstructionDe: string;
}

const TURN_INSTRUCTIONS_EN = [
  'Run Straight Ahead',
  'Bear Slightly Right',
  'Turn Right',
  'Turn Back Right',
  'Turn Around',
  'Turn Back Left',
  'Turn Left',
  'Bear Slightly Left',
];

const TURN_INSTRUCTIONS_DE = [
  'Geradeaus laufen',
  'Halbrechts halten',
  'Nach rechts laufen',
  'Schräg hinten rechts',
  'Umdrehen (Hinter dir)',
  'Schräg hinten links',
  'Nach links laufen',
  'Halblinks halten',
];

/**
 * Computes live spatial distance & compass heading relative to player 3D camera orientation
 * (using fCameraFront X/Z when available so North-locked minimaps still rotate the directional arrow).
 */
export function calculateSpatialWayfinding(
  eventId: string,
  playerX?: number,
  playerY?: number,
  compassRotation?: number,
  camFrontX?: number,
  camFrontZ?: number,
  mapId?: number
): SpatialWayfinding | null {
  if (playerX === undefined || playerY === undefined) return null;
  if (playerX === 0 && playerY === 0) return null;
  const coords = EVENT_CONTINENT_COORDS[eventId] ?? (mapId ? MAP_CONTINENT_CENTERS[mapId] : undefined);
  if (!coords) return null;

  const dx = coords[0] - playerX;
  const dy = coords[1] - playerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Convert game continent coords to human distance label
  const distLabel = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;

  // Angle from player to target clockwise from North (0 is North, PI/2 is East)
  let worldRad = Math.atan2(dx, -dy);
  if (worldRad < 0) worldRad += 2 * Math.PI;

  // Determine player camera heading clockwise from North:
  // Prefer 3D camera forward vector (fCameraFront X=East, Z=North) because compassRotation is 0 when minimap is locked to North.
  let headingRad = compassRotation ?? 0;
  if (
    camFrontX !== undefined &&
    camFrontZ !== undefined &&
    camFrontX * camFrontX + camFrontZ * camFrontZ > 0.0001
  ) {
    headingRad = Math.atan2(camFrontX, camFrontZ);
  }

  // Relative angle from player's camera direction to target
  let relRad = worldRad - headingRad;
  while (relRad < 0) relRad += 2 * Math.PI;
  while (relRad >= 2 * Math.PI) relRad -= 2 * Math.PI;

  const deg = (relRad * 180) / Math.PI;
  const worldDeg = (worldRad * 180) / Math.PI;
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const arrows = ['⬆', '↗', '➡', '↘', '⬇', '↙', '⬅', '↖'];
  const idx = Math.round(deg / 45) % 8;
  const compassIdx = Math.round(worldDeg / 45) % 8;

  return {
    distanceLabel: distLabel,
    distanceUnits: Math.round(dist),
    arrow: arrows[idx],
    cardinal: cardinals[idx],
    compassCardinal: cardinals[compassIdx],
    angleDeg: Math.round(deg) % 360,
    worldAngleDeg: Math.round(worldDeg) % 360,
    turnInstructionEn: TURN_INSTRUCTIONS_EN[idx],
    turnInstructionDe: TURN_INSTRUCTIONS_DE[idx],
  };
}

// Global in-memory state store for reactive MumbleLink updates
let currentMumbleData: MumbleData = { connected: false };
let lastNotifiedAt = 0;
let didRequestReaderUpgrade = false;
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

/**
 * Returns true if player position or 3D camera direction changed enough to update wayfinding arrows smoothly.
 */
function hasSpatialMumbleChange(prev: MumbleData, next: MumbleData): boolean {
  if (!next.connected) return false;
  if (Math.abs((prev.playerX ?? 0) - (next.playerX ?? 0)) >= 1.5) return true;
  if (Math.abs((prev.playerY ?? 0) - (next.playerY ?? 0)) >= 1.5) return true;
  if (Math.abs((prev.camFrontX ?? 0) - (next.camFrontX ?? 0)) >= 0.025) return true;
  if (Math.abs((prev.camFrontZ ?? 0) - (next.camFrontZ ?? 0)) >= 0.025) return true;
  if (Math.abs((prev.compassRotation ?? 0) - (next.compassRotation ?? 0)) >= 0.025) return true;
  return false;
}

function updateMumbleData(next: MumbleData) {
  const prev = currentMumbleData;
  currentMumbleData = next;

  const now = Date.now();
  // Fire immediately on state changes, at ~16 FPS (60ms) when moving/rotating camera, or 1s heartbeat when idle
  if (
    hasSemanticMumbleChange(prev, next) ||
    (hasSpatialMumbleChange(prev, next) && now - lastNotifiedAt >= 60) ||
    now - lastNotifiedAt >= 1000
  ) {
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
        restart?: () => Promise<{ ok: boolean }>;
        onUpdate: (cb: (data: MumbleData) => void) => () => void;
      };
    };
  }).electronAPI;

  if (electron?.mumble) {
    electron.mumble.getData().then((data) => {
      if (data) {
        if (data.connected && data.camFrontX === undefined && !didRequestReaderUpgrade) {
          didRequestReaderUpgrade = true;
          electron.mumble?.restart?.().catch(() => {});
        }
        updateMumbleData(data);
      }
    }).catch(() => {});

    electron.mumble.onUpdate((data) => {
      if (data) {
        if (data.connected && data.camFrontX === undefined && !didRequestReaderUpgrade) {
          didRequestReaderUpgrade = true;
          electron.mumble?.restart?.().catch(() => {});
        }
        updateMumbleData(data);
      }
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

