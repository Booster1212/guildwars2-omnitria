import { t, getLanguage } from '../../../i18n/index.ts';
import type {
  WvwCombinedObjective,
  WvwMatch,
  WvwMapType,
  WvwObjectiveType,
  WvwTeam,
  WvwObjectiveOwner,
  WvwWorld,
} from './types.ts';
import { getOwnerDisplayName } from './teamUtils.ts';

export interface WvwRankProgression {
  rank: number;
  tierId: 'bronze' | 'silver' | 'gold' | 'platinum' | 'mithril' | 'diamond';
  tierName: string;
  titleName: string;
  currentTierStart: number;
  nextTierRank: number | null;
  nextTierName: string | null;
  tierProgressPct: number;
  /** All WvW ability lines require 1,226 total WvW ability points (unlocked at Rank 1,226) */
  abilityPointsEarned: number;
  abilityPointsMax: number;
  abilityMasteryPct: number;
  isAbilityMaxed: boolean;
}

interface RankTierDef {
  id: WvwRankProgression['tierId'];
  min: number;
  max: number;
  step: number;
  en: string;
  de: string;
}

const RANK_TIERS: RankTierDef[] = [
  { id: 'bronze', min: 1, max: 149, step: 10, en: 'Bronze', de: 'Bronze' },
  { id: 'silver', min: 150, max: 619, step: 30, en: 'Silver', de: 'Silber' },
  { id: 'gold', min: 620, max: 1394, step: 50, en: 'Gold', de: 'Gold' },
  { id: 'platinum', min: 1395, max: 2544, step: 75, en: 'Platinum', de: 'Platin' },
  { id: 'mithril', min: 2545, max: 4094, step: 100, en: 'Mithril', de: 'Mithril' },
  { id: 'diamond', min: 4095, max: 10000, step: 150, en: 'Diamond', de: 'Diamant' },
];

const SUB_TITLES: { en: string; de: string }[] = [
  { en: 'Invader', de: 'Eindringling' },
  { en: 'Assaulter', de: 'Stürmer' },
  { en: 'Raider', de: 'Plünderer' },
  { en: 'Recruit', de: 'Rekrut' },
  { en: 'Scout', de: 'Späher' },
  { en: 'Soldier', de: 'Soldat' },
  { en: 'Squire', de: 'Knappe' },
  { en: 'Footman', de: 'Fußsoldat' },
  { en: 'Knight', de: 'Ritter' },
  { en: 'Major', de: 'Major' },
  { en: 'Colonel', de: 'Oberst' },
  { en: 'General', de: 'General' },
  { en: 'Veteran', de: 'Veteran' },
  { en: 'Champion', de: 'Champion' },
  { en: 'Legend', de: 'Legende' },
];

export const WVW_ABILITY_MASTERY_CAP = 1226;

/**
 * Computes official Guild Wars 2 WvW rank title, prestige bracket, and mastery progress.
 */
export function computeWvwRankProgression(rawRank: number | undefined | null): WvwRankProgression {
  const rank = Math.max(1, Math.floor(rawRank ?? 1));
  const lang = getLanguage();

  let tierIdx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (rank >= RANK_TIERS[i].min) {
      tierIdx = i;
    }
  }

  const tier = RANK_TIERS[tierIdx];
  const nextTier = tierIdx + 1 < RANK_TIERS.length ? RANK_TIERS[tierIdx + 1] : null;
  const offsetInTier = Math.max(0, rank - tier.min);
  const subIdx = Math.min(SUB_TITLES.length - 1, Math.floor(offsetInTier / tier.step));
  const subTitle = SUB_TITLES[subIdx];

  const tierName = lang === 'en' ? tier.en : tier.de;
  const subTitleName = lang === 'en' ? subTitle.en : subTitle.de;
  const titleName =
    rank >= 10000
      ? lang === 'en'
        ? 'God of WvW (Diamond Legend)'
        : 'Gott des WvW (Diamant-Legende)'
      : `${tierName} ${subTitleName}`;

  const tierSpan = Math.max(1, (nextTier ? nextTier.min : 10000) - tier.min);
  const tierProgressPct =
    rank >= 10000
      ? 100
      : Math.min(100, Math.max(0, Math.round(((rank - tier.min) / tierSpan) * 100)));

  const abilityPointsEarned = Math.min(WVW_ABILITY_MASTERY_CAP, rank);
  const abilityMasteryPct = Math.min(
    100,
    Math.round((abilityPointsEarned / WVW_ABILITY_MASTERY_CAP) * 100),
  );

  return {
    rank,
    tierId: tier.id,
    tierName,
    titleName,
    currentTierStart: tier.min,
    nextTierRank: nextTier ? nextTier.min : rank < 10000 ? 10000 : null,
    nextTierName: nextTier
      ? lang === 'en'
        ? nextTier.en
        : nextTier.de
      : rank < 10000
      ? lang === 'en'
        ? 'Rank 10,000 Cap'
        : 'Rang 10.000 Maximum'
      : null,
    tierProgressPct,
    abilityPointsEarned,
    abilityPointsMax: WVW_ABILITY_MASTERY_CAP,
    abilityMasteryPct,
    isAbilityMaxed: rank >= WVW_ABILITY_MASTERY_CAP,
  };
}

export interface WvwTeamStandingsRow {
  team: WvwTeam;
  victoryPoints: number;
  score: number;
  ppt: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  castles: number;
  keeps: number;
  towers: number;
  camps: number;
}

/**
 * Computes live standings, PPT income, K/D ratio, and structure counts per team.
 */
export function computeWvwStandings(
  match: WvwMatch | null,
  objectives: readonly WvwCombinedObjective[],
): Record<WvwTeam, WvwTeamStandingsRow> {
  const teams: WvwTeam[] = ['Red', 'Blue', 'Green'];
  const result = {} as Record<WvwTeam, WvwTeamStandingsRow>;

  for (const team of teams) {
    const key = team.toLowerCase() as 'red' | 'blue' | 'green';
    const victoryPoints = match?.victory_points?.[key] ?? 0;
    const score = match?.scores?.[key] ?? 0;
    const kills = match?.kills?.[key] ?? 0;
    const deaths = match?.deaths?.[key] ?? 0;
    const kdRatio = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills;

    let ppt = 0;
    let castles = 0;
    let keeps = 0;
    let towers = 0;
    let camps = 0;

    for (const o of objectives) {
      if (o.owner !== team) continue;
      ppt += o.pointsTick || 0;
      if (o.type === 'Castle') castles++;
      else if (o.type === 'Keep') keeps++;
      else if (o.type === 'Tower') towers++;
      else if (o.type === 'Camp') camps++;
    }

    result[team] = {
      team,
      victoryPoints,
      score,
      ppt,
      kills,
      deaths,
      kdRatio,
      castles,
      keeps,
      towers,
      camps,
    };
  }

  return result;
}

export interface WvwSituationalInsight {
  id: string;
  kind: 'stale' | 'home_defense' | 'vulnerable_t0' | 'stonemist' | 'leader_swing';
  severity: 'warn' | 'good' | 'info';
  title: string;
  detail: string;
  targetMap?: WvwMapType;
  objectiveIds?: string[];
}

/**
 * Generates deterministic, rule-based situational insights from live WvW match and objective data.
 */
export function generateWvwSituationalInsights(
  objectives: readonly WvwCombinedObjective[],
  match: WvwMatch | null,
  worldsMap: Map<number, WvwWorld>,
  activeTeam: WvwTeam,
  isStale: boolean,
  lastUpdatedAt: Date | number | null,
  nowMs: number = Date.now(),
): WvwSituationalInsight[] {
  const insights: WvwSituationalInsight[] = [];
  const lang = getLanguage();

  // 1. Data freshness / staleness alert
  if (isStale) {
    const updatedMs =
      lastUpdatedAt instanceof Date
        ? lastUpdatedAt.getTime()
        : typeof lastUpdatedAt === 'number'
        ? lastUpdatedAt
        : null;
    const ageSec = updatedMs ? Math.max(0, Math.round((nowMs - updatedMs) / 1000)) : null;
    insights.push({
      id: 'stale-data',
      kind: 'stale',
      severity: 'warn',
      title: t('wvw.insight.staleTitle'),
      detail:
        ageSec !== null
          ? t('wvw.insight.staleDetailAge', { sec: ageSec })
          : t('wvw.insight.staleDetailNoSync'),
    });
  }

  if (!match || objectives.length === 0) {
    return insights;
  }

  // 2. Home Borderland defense check
  const homeMap: WvwMapType =
    activeTeam === 'Red' ? 'RedHome' : activeTeam === 'Blue' ? 'BlueHome' : 'GreenHome';
  const enemyFortificationsOnHome = objectives.filter(
    (o) =>
      o.mapType === homeMap &&
      (o.type === 'Keep' || o.type === 'Tower') &&
      o.owner !== activeTeam &&
      o.owner !== 'Neutral',
  );

  if (enemyFortificationsOnHome.length > 0) {
    const sampleNames = enemyFortificationsOnHome
      .slice(0, 3)
      .map((o) => (lang === 'en' && o.nameEn ? o.nameEn : o.name))
      .join(', ');
    insights.push({
      id: 'home-defense',
      kind: 'home_defense',
      severity: 'warn',
      title: t('wvw.insight.homeBreachTitle', { count: enemyFortificationsOnHome.length }),
      detail: t('wvw.insight.homeBreachDetail', { names: sampleNames }),
      targetMap: homeMap,
      objectiveIds: enemyFortificationsOnHome.map((o) => o.id),
    });
  } else {
    insights.push({
      id: 'home-secure',
      kind: 'home_defense',
      severity: 'good',
      title: t('wvw.insight.homeSecureTitle'),
      detail: t('wvw.insight.homeSecureDetail'),
      targetMap: homeMap,
    });
  }

  // 3. Vulnerable T0 enemy structures (flipped 5..20 minutes ago, RI expired)
  const vulnerableTargets = objectives.filter((o) => {
    if (o.owner === activeTeam || o.owner === 'Neutral') return false;
    if (o.type !== 'Castle' && o.type !== 'Keep' && o.type !== 'Tower') return false;
    const sec = o.secondsSinceFlip;
    if (sec === null || sec === undefined) return false;
    return sec >= 300 && sec <= 1200;
  });

  if (vulnerableTargets.length > 0) {
    const topNames = vulnerableTargets
      .slice(0, 3)
      .map((o) => (lang === 'en' && o.nameEn ? o.nameEn : o.name))
      .join(', ');
    insights.push({
      id: 'vulnerable-t0',
      kind: 'vulnerable_t0',
      severity: 'good',
      title: t('wvw.insight.vulnerableTitle', { count: vulnerableTargets.length }),
      detail: t('wvw.insight.vulnerableDetail', { names: topNames }),
      objectiveIds: vulnerableTargets.map((o) => o.id),
    });
  }

  // 4. Stonemist Castle (38-9) status in Eternal Battlegrounds
  const stonemist = objectives.find((o) => o.type === 'Castle' || o.id === '38-9');
  if (stonemist) {
    const ownerName = getOwnerDisplayName(stonemist.owner, match, worldsMap, lang);
    const isOurCastle = stonemist.owner === activeTeam;
    insights.push({
      id: 'stonemist-status',
      kind: 'stonemist',
      severity: isOurCastle ? 'good' : 'info',
      title: t('wvw.insight.stonemistTitle', { owner: ownerName }),
      detail: isOurCastle
        ? t('wvw.insight.stonemistOurs', { ppt: stonemist.pointsTick || 35 })
        : t('wvw.insight.stonemistEnemy', { owner: ownerName, ppt: stonemist.pointsTick || 35 }),
      targetMap: 'Center',
      objectiveIds: [stonemist.id],
    });
  }

  // 5. Match Standings / Leader Swing Insight
  const standings = computeWvwStandings(match, objectives);
  const enemies = (['Red', 'Blue', 'Green'] as WvwTeam[]).filter((c) => c !== activeTeam);
  const leadingEnemy = enemies.sort((a, b) => {
    const vpDiff = standings[b].victoryPoints - standings[a].victoryPoints;
    if (vpDiff !== 0) return vpDiff;
    return standings[b].score - standings[a].score;
  })[0];

  if (leadingEnemy) {
    const leaderName = getOwnerDisplayName(leadingEnemy, match, worldsMap, lang);
    const leaderMetrics = standings[leadingEnemy];
    insights.push({
      id: 'leader-swing',
      kind: 'leader_swing',
      severity: 'info',
      title: t('wvw.insight.leaderTitle', { team: leaderName }),
      detail: t('wvw.insight.leaderDetail', {
        team: leaderName,
        vp: leaderMetrics.victoryPoints,
        ppt: leaderMetrics.ppt,
      }),
    });
  }

  return insights;
}

export type WvwOwnerFilter = 'all' | 'enemy' | 'own' | WvwObjectiveOwner;
export type WvwStatusFilter = 'all' | 'vulnerable' | 'ri' | 'claimed' | 'pinned';

export interface WvwObjectiveBrowserFilter {
  map: WvwMapType | 'all' | string;
  type: WvwObjectiveType | 'all' | string;
  owner: WvwOwnerFilter;
  status: WvwStatusFilter;
  search: string;
  activeTeam: WvwTeam;
  pinnedIds?: ReadonlySet<string> | readonly string[];
}

/**
 * Filters WvW objectives by map, objective type, owner, status, and text query.
 */
export function filterWvwObjectives(
  objectives: readonly WvwCombinedObjective[],
  filter: WvwObjectiveBrowserFilter,
): WvwCombinedObjective[] {
  const {
    map,
    type,
    owner,
    status,
    search,
    activeTeam,
    pinnedIds,
  } = filter;

  const pinnedSet =
    pinnedIds instanceof Set
      ? pinnedIds
      : Array.isArray(pinnedIds)
      ? new Set(pinnedIds)
      : new Set<string>();
  const q = search.trim().toLowerCase();

  return objectives.filter((obj) => {
    if (map && map !== 'all' && obj.mapType !== map) return false;
    if (type && type !== 'all' && obj.type !== type) return false;

    if (owner === 'enemy') {
      if (obj.owner === activeTeam || obj.owner === 'Neutral') return false;
    } else if (owner === 'own') {
      if (obj.owner !== activeTeam) return false;
    } else if (owner && owner !== 'all') {
      if (obj.owner !== owner) return false;
    }

    if (status && status !== 'all') {
      const elapsedSec = obj.secondsSinceFlip ?? Infinity;

      if (status === 'ri' && !obj.isRiActive) return false;
      if (status === 'vulnerable' && (obj.isRiActive || elapsedSec < 300 || elapsedSec > 1200)) {
        return false;
      }
      if (status === 'claimed' && !obj.claimedBy) return false;
      if (status === 'pinned' && !pinnedSet.has(obj.id)) return false;
    }

    if (q) {
      const matchesName = obj.name.toLowerCase().includes(q);
      const matchesNameEn = obj.nameEn ? obj.nameEn.toLowerCase().includes(q) : false;
      const matchesId = obj.id.toLowerCase().includes(q);
      const matchesType = obj.type.toLowerCase().includes(q);
      const matchesGuild =
        obj.guildInfo?.name.toLowerCase().includes(q) ||
        obj.guildInfo?.tag.toLowerCase().includes(q) ||
        false;
      if (!matchesName && !matchesNameEn && !matchesId && !matchesType && !matchesGuild) {
        return false;
      }
    }

    return true;
  });
}
