/**
 * Achievement Intelligence Domain
 *
 * Core ranking engine, AP calculations, repeatable caps,
 * explainable recommendation scoring, and categorization for Guild Wars 2 achievements.
 */

export interface AchievementTier {
  count: number;
  points: number;
}

export interface AchievementReward {
  type: 'Item' | 'Title' | 'Mastery' | 'Coins' | string;
  id?: number;
  count?: number;
  region?: 'Tyria' | 'Maguuma' | 'Desert' | 'Cantha' | string;
}

export interface AchievementBit {
  type: 'Text' | 'Item' | 'Minipet' | 'Skin' | string;
  id?: number;
  text?: string;
  textEn?: string;
}

export interface AchievementDefinition {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  requirement: string;
  requirementEn: string;
  lockedText?: string;
  lockedTextEn?: string;
  icon?: string;
  flags: string[]; // 'Pvp', 'Daily', 'Weekly', 'Repeatable', 'Hidden', 'RequiresUnlock', 'Permanent'
  tiers: AchievementTier[];
  pointCap?: number; // Capped AP reward for repeatable achievements
  prerequisites?: number[];
  rewards?: AchievementReward[];
  bits?: AchievementBit[];
  categoryId: number;
  categoryName: string;
  categoryNameEn: string;
  groupId: string;
  groupName: string;
  groupNameEn: string;
  requiredCount: number;
  eventId?: string; // Optional link to live world boss / meta event
  waypoint?: string;
  zone?: string;
  zoneEn?: string;
}

export interface AccountAchievementProgress {
  id: number;
  current?: number;
  max?: number;
  done: boolean;
  repeated?: number;
  unlocked?: boolean;
  bits?: number[];
}

export interface EnrichedAchievement {
  definition: AchievementDefinition;
  userProgress?: AccountAchievementProgress;
  isDone: boolean;
  isUnlocked: boolean;
  progressStatus: 'completed' | 'in_progress' | 'unstarted';
  currentProgress: number;
  maxProgress: number;
  progressFraction: number; // 0.0 - 1.0
  remainingCount: number;
  totalRewardAp: number;
  earnedAp: number;
  obtainableAp: number;
  isRepeatable: boolean;
  isCapped: boolean;
  repeatCount: number;
  pointCap?: number;
  completedBits: Set<number>;
  remainingObjectives: string[];
  remainingObjectivesEn: string[];
  prerequisitesMet: boolean;
  unmetPrerequisiteIds: number[];
}

export type RecommendationStrategy =
  | 'bestNext'
  | 'efficiency'
  | 'quickWins'
  | 'highestReward'
  | 'continueProgress';

export interface AchievementRecommendation {
  achievement: EnrichedAchievement;
  score: number;
  rank: number;
  strategy: RecommendationStrategy;
  reasonDe: string;
  reasonEn: string;
  effortIndicatorDe: string;
  effortIndicatorEn: string;
  isPersonalized: boolean;
}

/**
 * Calculates total possible AP, currently earned AP, and remaining obtainable AP
 * accurately respecting tiers, repetition counts, and reward caps.
 */
export function calculateObtainableAp(
  def: AchievementDefinition,
  progress?: AccountAchievementProgress,
): {
  totalRewardAp: number;
  earnedAp: number;
  obtainableAp: number;
  isCapped: boolean;
  currentTierIndex: number;
} {
  const sumTierPoints = def.tiers.reduce((acc, t) => acc + (t.points || 0), 0);
  const totalRewardAp = sumTierPoints;
  const isRepeatable = def.flags.includes('Repeatable');
  const pointCap = def.pointCap;

  if (!progress) {
    // Unauthenticated or unstarted
    const maxPossible = isRepeatable && pointCap !== undefined ? pointCap : totalRewardAp;
    return {
      totalRewardAp: maxPossible,
      earnedAp: 0,
      obtainableAp: maxPossible,
      isCapped: false,
      currentTierIndex: -1,
    };
  }

  if (!isRepeatable) {
    if (progress.done) {
      return {
        totalRewardAp,
        earnedAp: totalRewardAp,
        obtainableAp: 0,
        isCapped: true,
        currentTierIndex: def.tiers.length - 1,
      };
    }

    // Sum points for tiers completed so far
    let earnedSoFar = 0;
    let currentTierIndex = -1;
    const currentCount = progress.current ?? 0;
    for (let i = 0; i < def.tiers.length; i++) {
      if (currentCount >= def.tiers[i].count) {
        earnedSoFar += def.tiers[i].points || 0;
        currentTierIndex = i;
      }
    }

    const obtainableAp = Math.max(0, totalRewardAp - earnedSoFar);
    return {
      totalRewardAp,
      earnedAp: earnedSoFar,
      obtainableAp,
      isCapped: obtainableAp === 0,
      currentTierIndex,
    };
  }

  // Repeatable Achievement
  const repeated = progress.repeated || 0;
  let inCycleEarned = 0;
  let currentTierIndex = -1;
  const currentCount = progress.current ?? 0;
  for (let i = 0; i < def.tiers.length; i++) {
    if (currentCount >= def.tiers[i].count) {
      inCycleEarned += def.tiers[i].points || 0;
      currentTierIndex = i;
    }
  }

  const rawTotalEarned = repeated * totalRewardAp + inCycleEarned;

  if (pointCap !== undefined) {
    const earnedAp = Math.min(pointCap, rawTotalEarned);
    const obtainableAp = Math.max(0, pointCap - earnedAp);
    const isCapped = earnedAp >= pointCap;
    return {
      totalRewardAp: pointCap,
      earnedAp,
      obtainableAp,
      isCapped,
      currentTierIndex,
    };
  }

  // Infinite repeatable without cap
  return {
    totalRewardAp,
    earnedAp: rawTotalEarned,
    obtainableAp: totalRewardAp,
    isCapped: false,
    currentTierIndex,
  };
}

/**
 * Enriches static achievement definition with live account progress.
 */
export function enrichAchievement(
  def: AchievementDefinition,
  progress?: AccountAchievementProgress,
  allUserAchievements?: Map<number, AccountAchievementProgress>,
): EnrichedAchievement {
  const isRepeatable = def.flags.includes('Repeatable');
  const isDone = Boolean(progress?.done);
  const isUnlocked = progress?.unlocked !== false; // default true if omitted

  const maxProgress = progress?.max || def.requiredCount || (def.tiers.length > 0 ? def.tiers[def.tiers.length - 1].count : 1);
  const currentProgress = progress ? Math.min(progress.current || 0, maxProgress) : 0;
  const progressFraction = maxProgress > 0 ? Math.min(1.0, currentProgress / maxProgress) : (isDone ? 1.0 : 0.0);

  const { totalRewardAp, earnedAp, obtainableAp, isCapped } = calculateObtainableAp(def, progress);

  let progressStatus: 'completed' | 'in_progress' | 'unstarted' = 'unstarted';
  if (isDone || (isRepeatable && isCapped)) {
    progressStatus = 'completed';
  } else if (currentProgress > 0 || (progress && isUnlocked && !isDone)) {
    progressStatus = 'in_progress';
  }

  const completedBits = new Set<number>(progress?.bits || []);
  const remainingObjectives: string[] = [];
  const remainingObjectivesEn: string[] = [];

  if (def.bits && def.bits.length > 0) {
    def.bits.forEach((bit, idx) => {
      if (!completedBits.has(idx)) {
        const textDe = bit.text || bit.textEn || `Teilziel ${idx + 1}`;
        const textEn = bit.textEn || bit.text || `Objective ${idx + 1}`;
        remainingObjectives.push(textDe);
        remainingObjectivesEn.push(textEn);
      }
    });
  }

  const remainingCount = def.bits && def.bits.length > 0
    ? remainingObjectives.length
    : Math.max(0, maxProgress - currentProgress);

  // Check prerequisites
  const unmetPrerequisiteIds: number[] = [];
  if (def.prerequisites && def.prerequisites.length > 0 && allUserAchievements) {
    for (const prereqId of def.prerequisites) {
      const p = allUserAchievements.get(prereqId);
      if (!p || !p.done) {
        unmetPrerequisiteIds.push(prereqId);
      }
    }
  }
  const prerequisitesMet = unmetPrerequisiteIds.length === 0;

  return {
    definition: def,
    userProgress: progress,
    isDone: isDone || isCapped,
    isUnlocked,
    progressStatus,
    currentProgress,
    maxProgress,
    progressFraction,
    remainingCount,
    totalRewardAp,
    earnedAp,
    obtainableAp,
    isRepeatable,
    isCapped,
    repeatCount: progress?.repeated || 0,
    pointCap: def.pointCap,
    completedBits,
    remainingObjectives,
    remainingObjectivesEn,
    prerequisitesMet,
    unmetPrerequisiteIds,
  };
}

/**
 * Score an enriched achievement based on a specific strategy.
 * Every recommendation produces an explainable justification.
 */
export function scoreAchievement(
  ach: EnrichedAchievement,
  strategy: RecommendationStrategy,
  lang: 'de' | 'en' = 'en',
): AchievementRecommendation {
  const isPersonalized = Boolean(ach.userProgress);
  let score = 0;
  let reasonDe = '';
  let reasonEn = '';
  let effortIndicatorDe = '';
  let effortIndicatorEn = '';

  const { obtainableAp, remainingCount, progressFraction, isDone, isCapped, prerequisitesMet } = ach;

  // Fully completed or capped achievements get 0 score
  if (isDone || isCapped || obtainableAp <= 0) {
    return {
      achievement: ach,
      score: -1,
      rank: 0,
      strategy,
      reasonDe: 'Bereits vollständig abgeschlossen.',
      reasonEn: 'Already fully completed.',
      effortIndicatorDe: 'Abgeschlossen',
      effortIndicatorEn: 'Completed',
      isPersonalized,
    };
  }

  const apBonus = obtainableAp * 2.0;
  const prereqPenalty = prerequisitesMet ? 0 : 50;

  switch (strategy) {
    case 'bestNext': {
      // Central algorithm: balances obtainable AP, remaining objectives, proximity to completion, and accessibility
      const proximityScore = progressFraction * 35;
      const lowRemainingBonus = remainingCount > 0 && remainingCount <= 3 ? (4 - remainingCount) * 15 : 0;
      const efficiencyBonus = (obtainableAp / Math.max(1, remainingCount)) * 5;

      score = Math.max(0, apBonus + proximityScore + lowRemainingBonus + efficiencyBonus - prereqPenalty);

      if (remainingCount <= 2 && progressFraction >= 0.5) {
        reasonDe = `Empfohlen, da nur noch ${remainingCount} Ziel(e) fehlen und noch ${obtainableAp} Erfolgspunkte erhältlich sind.`;
        reasonEn = `Recommended because you are close to completion (${remainingCount} objective(s) left) and can earn ${obtainableAp} AP.`;
      } else if (obtainableAp >= 15) {
        reasonDe = `Empfohlen wegen der hohen Ausbeute von ${obtainableAp} Erfolgspunkten bei moderatem Restaufwand.`;
        reasonEn = `Recommended due to high payout of ${obtainableAp} AP with manageable remaining effort.`;
      } else if (progressFraction > 0) {
        reasonDe = `Empfohlen, um angefangenen Fortschritt (${Math.round(progressFraction * 100)}%) fortzusetzen und ${obtainableAp} AP zu sichern.`;
        reasonEn = `Recommended to continue active progress (${Math.round(progressFraction * 100)}%) and secure ${obtainableAp} AP.`;
      } else {
        reasonDe = `Empfohlen: Attraktiver Einstiegserfolg mit ${obtainableAp} erreichbaren Erfolgspunkten.`;
        reasonEn = `Recommended: High-value achievement offering ${obtainableAp} obtainable achievement points.`;
      }

      effortIndicatorDe = remainingCount <= 3 ? `Geringer Restaufwand: ${remainingCount} Ziel(e)` : `Gemessen: ${remainingCount} Ziel(e) verbleibend`;
      effortIndicatorEn = remainingCount <= 3 ? `Low effort: ${remainingCount} objective(s)` : `Measured: ${remainingCount} objective(s) remaining`;
      break;
    }

    case 'efficiency': {
      // AP-to-effort ratio: rewards per remaining objective
      const ratio = obtainableAp / Math.max(1, remainingCount);
      score = Math.max(0, ratio * 20 + obtainableAp - prereqPenalty);

      const ratioFormatted = ratio.toFixed(1);
      reasonDe = `Beste Effizienz: ${ratioFormatted} AP pro verbleibendem Ziel (${obtainableAp} AP für ${remainingCount} Schritt(e)).`;
      reasonEn = `Best Efficiency: ${ratioFormatted} AP per remaining objective (${obtainableAp} AP for ${remainingCount} step(s)).`;

      effortIndicatorDe = `Effizienz: ${ratioFormatted} AP/Ziel`;
      effortIndicatorEn = `Efficiency: ${ratioFormatted} AP/obj`;
      break;
    }

    case 'quickWins': {
      // Prioritizes achievements closest to completion with fewest remaining steps
      const proximityWeight = progressFraction * 60;
      const invertedRemaining = Math.max(0, 100 - remainingCount * 12);
      score = Math.max(0, invertedRemaining * 2 + proximityWeight + obtainableAp - prereqPenalty);

      reasonDe = `Schneller Erfolg: Nur noch ${remainingCount} Schritt(e) bis zum Abschluss (${obtainableAp} AP Belohnung).`;
      reasonEn = `Quick Win: Only ${remainingCount} step(s) to finish (${obtainableAp} AP reward).`;

      effortIndicatorDe = `Nur noch ${remainingCount} Schritt(e)`;
      effortIndicatorEn = `Only ${remainingCount} step(s) left`;
      break;
    }

    case 'highestReward': {
      // Ranks by total remaining obtainable AP
      score = Math.max(0, obtainableAp * 10 + progressFraction * 15 - prereqPenalty);

      reasonDe = `Höchste Belohnung: Bietet ${obtainableAp} erreichbare Erfolgspunkte (Gesamtwert: ${ach.totalRewardAp} AP).`;
      reasonEn = `Highest Reward: Awards ${obtainableAp} obtainable AP (total value: ${ach.totalRewardAp} AP).`;

      effortIndicatorDe = `Verfügbar: ${obtainableAp} AP`;
      effortIndicatorEn = `Obtainable: ${obtainableAp} AP`;
      break;
    }

    case 'continueProgress': {
      // Focuses on active in-progress achievements
      if (progressFraction <= 0) {
        score = 0;
        reasonDe = 'Noch nicht begonnen.';
        reasonEn = 'Not started yet.';
      } else {
        score = Math.max(0, progressFraction * 80 + obtainableAp * 2 - prereqPenalty);
        const pct = Math.round(progressFraction * 100);
        reasonDe = `In Arbeit: Bereits ${pct}% abgeschlossen (${ach.currentProgress}/${ach.maxProgress}) mit ${obtainableAp} verbleibenden AP.`;
        reasonEn = `In progress: Already ${pct}% complete (${ach.currentProgress}/${ach.maxProgress}) with ${obtainableAp} AP remaining.`;
      }

      effortIndicatorDe = `${Math.round(progressFraction * 100)}% abgeschlossen`;
      effortIndicatorEn = `${Math.round(progressFraction * 100)}% complete`;
      break;
    }
  }

  return {
    achievement: ach,
    score,
    rank: 0,
    strategy,
    reasonDe,
    reasonEn,
    effortIndicatorDe,
    effortIndicatorEn,
    isPersonalized,
  };
}

/**
 * Generates ranked recommendations for an achievement collection under a given strategy.
 */
export function generateRecommendations(
  achievements: EnrichedAchievement[],
  strategy: RecommendationStrategy,
  lang: 'de' | 'en' = 'en',
  limit: number = 50,
): AchievementRecommendation[] {
  const scored = achievements
    .map((ach) => scoreAchievement(ach, strategy, lang))
    .filter((r) => r.score > 0);

  // Tie-breaking: score desc -> obtainable AP desc -> remainingCount asc -> name asc
  scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    if (b.achievement.obtainableAp !== a.achievement.obtainableAp) {
      return b.achievement.obtainableAp - a.achievement.obtainableAp;
    }
    if (a.achievement.remainingCount !== b.achievement.remainingCount) {
      return a.achievement.remainingCount - b.achievement.remainingCount;
    }
    const nameA = lang === 'en' ? a.achievement.definition.nameEn : a.achievement.definition.name;
    const nameB = lang === 'en' ? b.achievement.definition.nameEn : b.achievement.definition.name;
    return nameA.localeCompare(nameB);
  });

  const capped = scored.slice(0, limit);
  capped.forEach((rec, idx) => {
    rec.rank = idx + 1;
  });

  return capped;
}

export interface AchievementFilterOptions {
  query?: string;
  groupId?: string;
  categoryId?: number;
  statusFilter?: 'all' | 'in_progress' | 'unstarted' | 'completed';
  minAp?: number;
  maxAp?: number;
  sortBy?: 'score' | 'ap-desc' | 'ap-asc' | 'progress-desc' | 'name-asc';
  strategy?: RecommendationStrategy;
  lang?: 'de' | 'en';
}

/**
 * Filter and sort achievements for category exploration.
 */
export function filterAndSortAchievements(
  achievements: EnrichedAchievement[],
  options: AchievementFilterOptions,
): EnrichedAchievement[] {
  const {
    query = '',
    groupId = 'all',
    categoryId,
    statusFilter = 'all',
    minAp,
    maxAp,
    sortBy = 'ap-desc',
    lang = 'en',
  } = options;

  const q = query.trim().toLowerCase();

  return achievements
    .filter((ach) => {
      // Query search on name, description, category, and objectives
      if (q) {
        const d = ach.definition;
        const nameMatch = d.name.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q);
        const descMatch = d.description.toLowerCase().includes(q) || d.descriptionEn.toLowerCase().includes(q);
        const catMatch = d.categoryName.toLowerCase().includes(q) || d.categoryNameEn.toLowerCase().includes(q);
        const groupMatch = d.groupName.toLowerCase().includes(q) || d.groupNameEn.toLowerCase().includes(q);
        const objMatch = ach.remainingObjectives.some((o) => o.toLowerCase().includes(q)) ||
          ach.remainingObjectivesEn.some((o) => o.toLowerCase().includes(q));

        if (!nameMatch && !descMatch && !catMatch && !groupMatch && !objMatch) {
          return false;
        }
      }

      // Group filter
      if (groupId !== 'all' && ach.definition.groupId !== groupId) {
        return false;
      }

      // Category filter
      if (categoryId !== undefined && categoryId !== 0 && ach.definition.categoryId !== categoryId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ach.progressStatus !== statusFilter) {
        return false;
      }

      // AP range
      if (minAp !== undefined && ach.obtainableAp < minAp) return false;
      if (maxAp !== undefined && ach.obtainableAp > maxAp) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ap-desc') return b.obtainableAp - a.obtainableAp;
      if (sortBy === 'ap-asc') return a.obtainableAp - b.obtainableAp;
      if (sortBy === 'progress-desc') return b.progressFraction - a.progressFraction;
      if (sortBy === 'name-asc') {
        const nameA = lang === 'en' ? a.definition.nameEn : a.definition.name;
        const nameB = lang === 'en' ? b.definition.nameEn : b.definition.name;
        return nameA.localeCompare(nameB);
      }
      return b.obtainableAp - a.obtainableAp;
    });
}

export interface AccountApBreakdown {
  totalAp: number;
  dailyAp: number;
  monthlyAp: number;
  dailyMonthlyCombined: number;
  dailyMonthlyCap: number;
  isDailyMonthlyCapped: boolean;
  permanentAchievementsAp: number;
  obtainableApRemaining: number;
}

/**
 * Calculates live account achievement point totals and cap breakdowns
 * conforming to Guild Wars 2's combined 15,000 Daily/Monthly AP ceiling.
 */
export function calculateAccountTotalAp(
  accountInfo?: { daily_ap?: number; monthly_ap?: number } | null,
  enrichedAchievements: EnrichedAchievement[] = [],
): AccountApBreakdown {
  const dailyAp = accountInfo?.daily_ap || 0;
  const monthlyAp = accountInfo?.monthly_ap || 0;
  const dailyMonthlyCombined = Math.min(15000, dailyAp + monthlyAp);
  const isDailyMonthlyCapped = dailyMonthlyCombined >= 15000;
  const permanentAchievementsAp = enrichedAchievements.reduce((sum, a) => sum + (a.earnedAp || 0), 0);
  const obtainableApRemaining = enrichedAchievements.reduce((sum, a) => sum + (a.obtainableAp || 0), 0);
  const totalAp = dailyMonthlyCombined + permanentAchievementsAp;

  return {
    totalAp,
    dailyAp,
    monthlyAp,
    dailyMonthlyCombined,
    dailyMonthlyCap: 15000,
    isDailyMonthlyCapped,
    permanentAchievementsAp,
    obtainableApRemaining,
  };
}
