import type { WorldEvent, Language } from '../types.ts';
import type { Gw2DailyProgression, Gw2WizardsVaultObjective } from '../data/gw2Api.ts';
import {
  EVENT_TO_WORLD_BOSS_API_MAP,
  EVENT_TO_MAP_CHEST_API_MAP,
  progressActions,
} from '../data/progressStore.ts';

export interface EventDailyWeeklyMatch {
  eventId: string;
  isDaily: boolean;
  isWeekly: boolean;
  dailyCompleted: boolean;
  weeklyCompleted: boolean;
  dailySource: 'wizards_vault' | 'daily_rotation' | null;
  weeklySource: 'wizards_vault' | 'weekly_rotation' | null;
  dailyObjective?: Gw2WizardsVaultObjective;
  weeklyObjective?: Gw2WizardsVaultObjective;
  dailyLabel: string;
  dailyTooltip: string;
  weeklyLabel: string;
  weeklyTooltip: string;
  hasDailyBonusChest: boolean;
}

/**
 * Deterministic UTC day index (resets at 00:00 UTC)
 */
export function getUtcDayIndex(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

/**
 * Deterministic GW2 weekly reset index (resets Monday 07:30 UTC)
 */
export function getGw2WeekIndex(date: Date = new Date()): number {
  // 1970-01-05 07:30:00 UTC was a Monday at 07:30 UTC
  const epochMonday730 = Date.UTC(1970, 0, 5, 7, 30, 0);
  const diffMs = date.getTime() - epochMonday730;
  return Math.floor(diffMs / (7 * 86_400_000));
}

/**
 * Specific event keyword rules for matching Wizard's Vault Daily & Weekly objective titles (EN & DE)
 */
const EVENT_TITLE_KEYWORDS: Record<string, string[]> = {
  'svanir-shaman': ['svanir shaman', 'svanir-schamane', 'frozen maw', 'frostgipfel', 'schamanen-oberhaupt'],
  'fire-elemental': ['fire elemental', 'feuerelementar', 'thaumanova'],
  'jungle-wurm': ['great jungle wurm', 'großer dschungelwurm', 'großen dschungelwurm', 'caledon wurm'],
  'shadow-behemoth': ['shadow behemoth', 'schatten-behemoth'],
  'taidha-covington': ['taidha covington', 'admiral taidha'],
  'megadestroyer': ['megadestroyer', 'megazerstörer'],
  'shatterer': ['the shatterer', 'den zerschmetterer', 'der zerschmetterer'],
  'modniir-ulgoth': ['modniir ulgoth', 'ulgoth'],
  'inquest-golem': ['inquest golem mark ii', 'inquestur-golem typ ii', 'golem mark ii', 'golem typ ii'],
  'claw-of-jormag': ['claw of jormag', 'klaue von jormag'],
  'tequatl': ['tequatl'],
  'karka-queen': ['karka queen', 'karka-königin'],
  'triple-trouble': ['triple trouble', 'dreifacher ärger', 'großer tropischer wurm'],
  'ley-line-anomaly': ['ley-line anomaly', 'ley-linien-anomalie'],
  'verdant-brink-night': ['night and the enemy', 'nacht und der feind', 'verdant brink', 'grasgrüne schwelle'],
  'tarir-octovine': ['octovine', 'güldenen kessel', 'battle in tarir', 'schlacht in tarir', 'auric basin'],
  'chak-gerent': ['chak gerent', 'chak-potenten', 'king of the jungle', 'könig des dschungels', 'tangled depths'],
  'dragons-stand': ["dragon's stand", 'widerstand des drachen', 'mouth of mordremoth', 'maul von mordremoth'],
  'choya-pinata': ['choya pinata', 'choya-piñata', 'casino blitz', 'kasino-blitz'],
  'augury-rock': ['doppelganger', 'doppelgänger', 'path to ascension', 'weg zum aufstieg'],
  'maws-of-torment': ['maws of torment', 'schlund der qualen'],
  'junundu-rising': ['junundu rising', 'aufstand der junundu'],
  'serpents-ire': ["serpent's ire", 'zorn der schlange'],
  'forged-with-fire': ['forged with fire', 'im feuer geschmiedet', 'hounds of balthazar'],
  'grothmar-metal-concert': ['metal legion', 'grothmar'],
  'drakkar': ['drakkar', 'champion of the ice dragon', 'champion des eisdrachen'],
  'drizzlewood-south': ['drizzlewood', 'nieselwald'],
  'drizzlewood-north': ['frost citadel', 'frostzitadelle'],
  'dragonstorm': ['dragonstorm', 'drachensturm'],
  'seitung-aetherblade': ['aetherblade assault', 'ätherklingen-angriff', 'seitung'],
  'kaineng-blackout': ['kaineng blackout', 'kaineng-stromausfall', 'new kaineng', 'neu-kaineng'],
  'echovald-gang-war': ['gang war of echovald', 'gangs of echovald', 'bandenkrieg von echowald', 'echovald'],
  'dragons-end': ['battle for the jade sea', 'schlacht um das jademeer', "dragon's end", 'drachen-ende'],
  'gyala-delve': ['gyala delve', 'gyala-senke'],
  'skywatch-archipelago': ["unlocking the wizard's tower", 'turm des zauberers', 'skywatch', 'himmelswacht'],
  'amnytas-defense': ['defense of amnytas', 'verteidigung von amnytas', 'amnytas'],
  'soto-convergences': ['convergence', 'konvergenz'],
  'nayos-heitors-gate': ['heitor', 'inner nayos', 'inneres nayos'],
  'nayos-fleshy-tower': ['fangs that gnash', 'knaebelag', 'zähne, die knirschen'],
  'janthir-syntri-titans': ['of mists and monsters', 'von nebeln und monstern', 'janthir syntri', 'greer', 'decima'],
  'janthir-bava-nisos': ['bava nisos', 'titanic voyage'],
};

/**
 * Region / map keyword rules for matching broader Wizard's Vault objectives
 */
const REGION_EVENT_MATCHERS: Array<{
  keywords: string[];
  matchEvent: (ev: WorldEvent) => boolean;
}> = [
  {
    keywords: ['world boss', 'weltenboss', 'weltboss'],
    matchEvent: (ev) => ev.category === 'core' || ev.category === 'hardcore',
  },
  {
    keywords: ['heart of maguuma', 'herz von maguuma'],
    matchEvent: (ev) => ev.category === 'hot',
  },
  {
    keywords: ['crystal desert', 'kristallwüste'],
    matchEvent: (ev) => ev.category === 'pof',
  },
  {
    keywords: ['cantha'],
    matchEvent: (ev) => ev.category === 'eod',
  },
  {
    keywords: ['horn of maguuma', 'horn von maguuma'],
    matchEvent: (ev) => ev.category === 'soto',
  },
  {
    keywords: ['janthir'],
    matchEvent: (ev) => ev.category === 'janthir',
  },
  {
    keywords: ['kryta'],
    matchEvent: (ev) =>
      ev.id === 'shadow-behemoth' ||
      ev.id === 'modniir-ulgoth' ||
      ev.id === 'taidha-covington' ||
      ev.id === 'triple-trouble' ||
      ev.id === 'karka-queen',
  },
  {
    keywords: ['ascalon'],
    matchEvent: (ev) => ev.id === 'shatterer',
  },
  {
    keywords: ['shiverpeak', 'zittergipfel'],
    matchEvent: (ev) =>
      ev.id === 'svanir-shaman' ||
      ev.id === 'claw-of-jormag' ||
      ev.id === 'drakkar' ||
      ev.id === 'dragonstorm',
  },
  {
    keywords: ['maguuma jungle', 'maguuma-dschungel'],
    matchEvent: (ev) =>
      ev.id === 'fire-elemental' ||
      ev.id === 'jungle-wurm' ||
      ev.id === 'megadestroyer' ||
      ev.id === 'inquest-golem' ||
      ev.id === 'tequatl',
  },
  {
    keywords: ['orr', 'ruins of orr', 'ruinen von orr'],
    matchEvent: (ev) =>
      ev.id.startsWith('cathedral-') || ev.id === 'gates-of-arah',
  },
];

function doesObjectiveMatchEvent(obj: Gw2WizardsVaultObjective, event: WorldEvent): boolean {
  const titleLower = (obj.title || '').toLowerCase();
  if (!titleLower) return false;

  // 1. Direct boss / meta keyword match
  const eventKeywords = EVENT_TITLE_KEYWORDS[event.id];
  if (eventKeywords && eventKeywords.some((kw) => titleLower.includes(kw))) {
    return true;
  }

  // 2. Direct zone name match
  const zoneDe = (event.zone || '').toLowerCase();
  const zoneEn = (event.zoneEn || '').toLowerCase();
  if ((zoneDe.length >= 5 && titleLower.includes(zoneDe)) || (zoneEn.length >= 5 && titleLower.includes(zoneEn))) {
    return true;
  }

  // 3. Regional event objective match (only if objective mentions events / bosses / metas)
  const isEventRelated =
    titleLower.includes('event') ||
    titleLower.includes('boss') ||
    titleLower.includes('meta') ||
    titleLower.includes('convergence') ||
    titleLower.includes('konvergenz');

  if (isEventRelated) {
    for (const rule of REGION_EVENT_MATCHERS) {
      if (rule.keywords.some((kw) => titleLower.includes(kw)) && rule.matchEvent(event)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Pools for deterministic Daily & Weekly rotation spotlights (ensures every day & week
 * highlights relevant high-value Daily & Weekly events even without an API key,
 * or alongside Wizard's Vault objectives)
 */
const DAILY_CORE_BOSS_ROTATION = [
  'tequatl',
  'shatterer',
  'claw-of-jormag',
  'shadow-behemoth',
  'fire-elemental',
  'svanir-shaman',
  'jungle-wurm',
  'megadestroyer',
  'inquest-golem',
  'modniir-ulgoth',
  'taidha-covington',
  'karka-queen',
];

const DAILY_META_ROTATION = [
  'tarir-octovine',
  'chak-gerent',
  'choya-pinata',
  'dragonstorm',
  'seitung-aetherblade',
  'kaineng-blackout',
  'echovald-gang-war',
  'amnytas-defense',
  'skywatch-archipelago',
  'janthir-syntri-titans',
];

const WEEKLY_SPOTLIGHT_POOLS: string[][] = [
  ['soto-convergences', 'tarir-octovine', 'tequatl', 'janthir-syntri-titans'],
  ['dragonstorm', 'chak-gerent', 'triple-trouble', 'dragons-end'],
  ['soto-convergences', 'drakkar', 'karka-queen', 'echovald-gang-war'],
  ['janthir-syntri-titans', 'choya-pinata', 'shatterer', 'amnytas-defense'],
];

export function getDailyRotationEventIds(now: Date = new Date()): Set<string> {
  const dayIdx = Math.abs(getUtcDayIndex(now));
  const boss1 = DAILY_CORE_BOSS_ROTATION[dayIdx % DAILY_CORE_BOSS_ROTATION.length];
  const boss2 = DAILY_CORE_BOSS_ROTATION[(dayIdx * 5 + 3) % DAILY_CORE_BOSS_ROTATION.length];
  const meta1 = DAILY_META_ROTATION[dayIdx % DAILY_META_ROTATION.length];
  const meta2 = DAILY_META_ROTATION[(dayIdx * 3 + 2) % DAILY_META_ROTATION.length];

  return new Set<string>([
    'ley-line-anomaly', // Daily guaranteed Mystic Coin
    boss1,
    boss2,
    meta1,
    meta2,
  ]);
}

export function getWeeklyRotationEventIds(now: Date = new Date()): Set<string> {
  const weekIdx = Math.abs(getGw2WeekIndex(now));
  const pool = WEEKLY_SPOTLIGHT_POOLS[weekIdx % WEEKLY_SPOTLIGHT_POOLS.length];
  return new Set<string>(pool);
}

/**
 * Evaluates a single WorldEvent for Daily and Weekly highlight status.
 */
export function evaluateEventDailyWeekly(
  event?: WorldEvent | null,
  dailyProgression?: Gw2DailyProgression | null,
  lang: Language = 'de',
  now: Date = new Date(),
): EventDailyWeeklyMatch {
  if (!event || !event.id) {
    return {
      eventId: '',
      isDaily: false,
      isWeekly: false,
      dailyCompleted: false,
      weeklyCompleted: false,
      dailySource: null,
      weeklySource: null,
      dailyLabel: '',
      dailyTooltip: '',
      weeklyLabel: '',
      weeklyTooltip: '',
      hasDailyBonusChest: false,
    };
  }

  const dailyObjs = Array.isArray(dailyProgression?.wizardsVault?.objectives)
    ? dailyProgression.wizardsVault.objectives
    : [];
  const weeklyObjs = Array.isArray(dailyProgression?.wizardsVaultWeekly?.objectives)
    ? dailyProgression.wizardsVaultWeekly.objectives
    : [];

  const matchedDailyObj = dailyObjs.find((o) => o && doesObjectiveMatchEvent(o, event));
  const matchedWeeklyObj = weeklyObjs.find((o) => o && doesObjectiveMatchEvent(o, event));

  const dailyRotationIds = getDailyRotationEventIds(now);
  const weeklyRotationIds = getWeeklyRotationEventIds(now);

  const isCompletedToday = progressActions.isEventCompletedToday(
    event.id,
    dailyProgression?.worldBosses,
    dailyProgression?.mapChests,
  );

  const hasDailyBonusChest = Boolean(
    EVENT_TO_WORLD_BOSS_API_MAP[event.id] ||
      EVENT_TO_MAP_CHEST_API_MAP[event.id] ||
      event.id === 'ley-line-anomaly',
  );

  // Determine Daily status
  let isDaily = false;
  let dailySource: 'wizards_vault' | 'daily_rotation' | null = null;
  let dailyCompleted = isCompletedToday;
  let dailyLabel = '';
  let dailyTooltip = '';

  if (matchedDailyObj) {
    isDaily = true;
    dailySource = 'wizards_vault';
    const objDone = matchedDailyObj.progress_current >= matchedDailyObj.progress_complete || matchedDailyObj.claimed;
    dailyCompleted = objDone || isCompletedToday;
    dailyLabel =
      lang === 'en'
        ? `DAILY +${matchedDailyObj.acclaim} AA`
        : `DAILY +${matchedDailyObj.acclaim} AA`;
    dailyTooltip =
      lang === 'en'
        ? `Wizard's Vault Daily: ${matchedDailyObj.title} (${matchedDailyObj.progress_current}/${matchedDailyObj.progress_complete} • +${matchedDailyObj.acclaim} Astral Acclaim)`
        : `Gewölbe des Zauberers (Täglich): ${matchedDailyObj.title} (${matchedDailyObj.progress_current}/${matchedDailyObj.progress_complete} • +${matchedDailyObj.acclaim} Astral-Ruhm)`;
  } else if (dailyRotationIds.has(event.id)) {
    isDaily = true;
    dailySource = 'daily_rotation';
    dailyLabel =
      event.id === 'ley-line-anomaly'
        ? (lang === 'en' ? 'DAILY MYSTIC COIN' : 'DAILY MYSTISCHE MÜNZE')
        : (lang === 'en' ? 'DAILY' : 'TÄGLICH');
    dailyTooltip =
      event.id === 'ley-line-anomaly'
        ? (lang === 'en'
            ? 'Daily Priority Event: Grants 1 guaranteed Mystic Coin per day'
            : 'Tägliches Pflicht-Event: Gewährt 1 garantierte Mystische Münze pro Tag')
        : (lang === 'en'
            ? 'Today\'s Daily Event Spotlight (Daily Bonus Chest & Astral Acclaim)'
            : 'Heutiges Täglich-Highlight (Tägliche Bonus-Truhe & Astral-Ruhm)');
  }

  // Determine Weekly status
  let isWeekly = false;
  let weeklySource: 'wizards_vault' | 'weekly_rotation' | null = null;
  let weeklyCompleted = false;
  let weeklyLabel = '';
  let weeklyTooltip = '';

  if (matchedWeeklyObj) {
    isWeekly = true;
    weeklySource = 'wizards_vault';
    weeklyCompleted =
      matchedWeeklyObj.progress_current >= matchedWeeklyObj.progress_complete || matchedWeeklyObj.claimed;
    weeklyLabel =
      lang === 'en'
        ? `WEEKLY +${matchedWeeklyObj.acclaim} AA`
        : `WEEKLY +${matchedWeeklyObj.acclaim} AA`;
    weeklyTooltip =
      lang === 'en'
        ? `Wizard's Vault Weekly: ${matchedWeeklyObj.title} (${matchedWeeklyObj.progress_current}/${matchedWeeklyObj.progress_complete} • +${matchedWeeklyObj.acclaim} Astral Acclaim)`
        : `Gewölbe des Zauberers (Wöchentlich): ${matchedWeeklyObj.title} (${matchedWeeklyObj.progress_current}/${matchedWeeklyObj.progress_complete} • +${matchedWeeklyObj.acclaim} Astral-Ruhm)`;
  } else if (weeklyRotationIds.has(event.id)) {
    isWeekly = true;
    weeklySource = 'weekly_rotation';
    weeklyCompleted = false;
    weeklyLabel = lang === 'en' ? 'WEEKLY' : 'WÖCHENTLICH';
    weeklyTooltip =
      lang === 'en'
        ? 'This Week\'s Featured Endgame Meta / Boss Objective'
        : 'Wöchentliches Endgame-Meta- & Boss-Ziel dieser Woche';
  }

  return {
    eventId: event.id,
    isDaily,
    isWeekly,
    dailyCompleted,
    weeklyCompleted,
    dailySource,
    weeklySource,
    dailyObjective: matchedDailyObj,
    weeklyObjective: matchedWeeklyObj,
    dailyLabel,
    dailyTooltip,
    weeklyLabel,
    weeklyTooltip,
    hasDailyBonusChest,
  };
}

