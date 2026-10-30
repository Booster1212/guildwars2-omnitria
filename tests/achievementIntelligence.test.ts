import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateObtainableAp,
  enrichAchievement,
  scoreAchievement,
  generateRecommendations,
  filterAndSortAchievements,
  calculateAccountTotalAp,
  calculateApMilestones,
  getNearlyCompletedAchievements,
  getRecentlyCompletedAchievements,
} from '../src/domain/achievementIntelligence.ts';
import type {
  AchievementDefinition,
  AccountAchievementProgress,
} from '../src/domain/achievementIntelligence.ts';
import {
  BASE_ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_CATEGORIES,
} from '../src/data/gw2/achievements/achievementCatalog.ts';

// ============================================================================
// 1. AP Calculation & Reward Caps Tests
// ============================================================================
test('1.1 calculateObtainableAp accurately handles non-repeatable tiered achievements', () => {
  const tieredDef: AchievementDefinition = {
    id: 101,
    name: 'Slayer of Beasts',
    nameEn: 'Slayer of Beasts',
    description: 'Defeat ferocious beasts',
    descriptionEn: 'Defeat ferocious beasts',
    requirement: 'Defeat 100 beasts',
    requirementEn: 'Defeat 100 beasts',
    flags: ['Permanent'],
    tiers: [
      { count: 10, points: 5 },
      { count: 50, points: 10 },
      { count: 100, points: 15 },
    ],
    categoryId: 1,
    categoryName: 'Slayer',
    categoryNameEn: 'Slayer',
    groupId: 'slayer',
    groupName: 'Slayer',
    groupNameEn: 'Slayer',
    requiredCount: 100,
  };

  // Case A: 0 progress (Guest or Unstarted)
  const resUnstarted = calculateObtainableAp(tieredDef, undefined);
  assert.equal(resUnstarted.totalRewardAp, 30);
  assert.equal(resUnstarted.earnedAp, 0);
  assert.equal(resUnstarted.obtainableAp, 30);
  assert.equal(resUnstarted.isCapped, false);

  // Case B: Partial progress - reached tier 1 (count = 25)
  const accountProgressTier1: AccountAchievementProgress = {
    id: 101,
    current: 25,
    max: 100,
    done: false,
  };
  const resTier1 = calculateObtainableAp(tieredDef, accountProgressTier1);
  assert.equal(resTier1.earnedAp, 5); // earned tier 1 points
  assert.equal(resTier1.obtainableAp, 25); // remaining 10 + 15
  assert.equal(resTier1.isCapped, false);

  // Case C: Reached tier 2 (count = 75)
  const accountProgressTier2: AccountAchievementProgress = {
    id: 101,
    current: 75,
    max: 100,
    done: false,
  };
  const resTier2 = calculateObtainableAp(tieredDef, accountProgressTier2);
  assert.equal(resTier2.earnedAp, 15); // tier 1 (5) + tier 2 (10)
  assert.equal(resTier2.obtainableAp, 15); // remaining tier 3 (15)

  // Case D: Completed (done: true)
  const accountProgressDone: AccountAchievementProgress = {
    id: 101,
    current: 100,
    max: 100,
    done: true,
  };
  const resDone = calculateObtainableAp(tieredDef, accountProgressDone);
  assert.equal(resDone.earnedAp, 30);
  assert.equal(resDone.obtainableAp, 0);
  assert.equal(resDone.isCapped, true);
});

test('1.2 calculateObtainableAp enforces pointCap for repeatable achievements (Agent of Entropy)', () => {
  // Agent of Entropy (ID 439): 2 AP per cycle, pointCap: 250
  const agentOfEntropy: AchievementDefinition = {
    id: 439,
    name: 'Agent der Entropie',
    nameEn: 'Agent of Entropy',
    description: 'Verwertet Gegenstände, um Glück zu erlangen.',
    descriptionEn: 'Salvage items to generate luck.',
    requirement: 'Verwertet 200 Gegenstände.',
    requirementEn: 'Salvage 200 items.',
    flags: ['Repeatable', 'Permanent'],
    tiers: [{ count: 200, points: 2 }],
    pointCap: 250,
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 200,
  };

  // Case A: Fresh account (0 repeats)
  const resFresh = calculateObtainableAp(agentOfEntropy, undefined);
  assert.equal(resFresh.totalRewardAp, 250);
  assert.equal(resFresh.earnedAp, 0);
  assert.equal(resFresh.obtainableAp, 250);
  assert.equal(resFresh.isCapped, false);

  // Case B: Account with 10 completed cycles (20 AP earned)
  const account10Repeats: AccountAchievementProgress = {
    id: 439,
    current: 50,
    max: 200,
    done: false,
    repeated: 10,
  };
  const res10 = calculateObtainableAp(agentOfEntropy, account10Repeats);
  assert.equal(res10.earnedAp, 20); // 10 * 2
  assert.equal(res10.obtainableAp, 230); // 250 - 20
  assert.equal(res10.isCapped, false);

  // Case C: Account with 125 completed cycles (250 AP earned = cap reached)
  const accountCapped: AccountAchievementProgress = {
    id: 439,
    current: 120,
    max: 200,
    done: false,
    repeated: 125,
  };
  const resCapped = calculateObtainableAp(agentOfEntropy, accountCapped);
  assert.equal(resCapped.earnedAp, 250);
  assert.equal(resCapped.obtainableAp, 0);
  assert.equal(resCapped.isCapped, true);

  // Case D: Account with >125 cycles (beyond cap, no further AP)
  const accountOverCapped: AccountAchievementProgress = {
    id: 439,
    current: 199,
    max: 200,
    done: false,
    repeated: 300,
  };
  const resOverCapped = calculateObtainableAp(agentOfEntropy, accountOverCapped);
  assert.equal(resOverCapped.earnedAp, 250);
  assert.equal(resOverCapped.obtainableAp, 0);
  assert.equal(resOverCapped.isCapped, true);
});

// ============================================================================
// 2. Enrichment & Guest Mode Tests
// ============================================================================
test('2.1 enrichAchievement correctly produces transparent metrics in Guest Mode (no API key)', () => {
  const item = BASE_ACHIEVEMENT_CATALOG[0];
  const enriched = enrichAchievement(item, undefined);

  assert.equal(enriched.definition.id, item.id);
  assert.equal(enriched.isDone, false);
  assert.equal(enriched.currentProgress, 0);
  assert.equal(enriched.progressFraction, 0);
  assert.equal(enriched.progressStatus, 'unstarted');
  assert.ok(enriched.obtainableAp > 0, 'Guest mode must show full obtainable AP');
});

test('2.2 enrichAchievement correctly marks completed and in-progress items with account data', () => {
  const multiStepDef: AchievementDefinition = {
    id: 991,
    name: 'Multi Step Slayer',
    nameEn: 'Multi Step Slayer',
    description: 'Step test',
    descriptionEn: 'Step test',
    requirement: 'Step test',
    requirementEn: 'Step test',
    flags: ['Permanent'],
    tiers: [{ count: 10, points: 10 }],
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 10,
  };

  const accountProgress: AccountAchievementProgress = {
    id: 991,
    current: 5,
    max: 10,
    done: false,
  };

  const enriched = enrichAchievement(multiStepDef, accountProgress);
  assert.equal(enriched.isDone, false);
  assert.equal(enriched.progressStatus, 'in_progress');
  assert.ok(enriched.progressFraction > 0 && enriched.progressFraction < 1);
  assert.equal(enriched.remainingCount, 5);
});

test('2.3 enrichAchievement accurately identifies completed achievements even when API omits current/bits', () => {
  const multiStepDef: AchievementDefinition = {
    id: 991,
    name: 'Multi Step Slayer',
    nameEn: 'Multi Step Slayer',
    description: 'Step test',
    descriptionEn: 'Step test',
    requirement: 'Step test',
    requirementEn: 'Step test',
    flags: ['Permanent'],
    tiers: [{ count: 10, points: 10 }],
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 10,
    bits: [
      { type: 'Text', text: 'Step 1' },
      { type: 'Text', text: 'Step 2' },
    ],
  };

  // Case A: ArenaNet API returns done: true with current and bits omitted
  const progressOmitted: AccountAchievementProgress = {
    id: 991,
    done: true,
  };
  const enrichedDone = enrichAchievement(multiStepDef, progressOmitted);
  assert.equal(enrichedDone.isDone, true, 'isDone must be true');
  assert.equal(enrichedDone.progressStatus, 'completed', 'progressStatus must be completed');
  assert.equal(enrichedDone.currentProgress, 10, 'currentProgress must equal maxProgress (10)');
  assert.equal(enrichedDone.progressFraction, 1.0, 'progressFraction must be 1.0 (100%)');
  assert.equal(enrichedDone.remainingCount, 0, 'remainingCount must be 0 for completed achievement');
  assert.equal(enrichedDone.remainingObjectives.length, 0, 'remainingObjectives must be empty');
  assert.equal(enrichedDone.obtainableAp, 0, 'obtainableAp must be 0 for completed achievement');
  assert.equal(enrichedDone.earnedAp, 10, 'earnedAp must be full reward (10)');

  // Case B: ArenaNet API returns current == max (10/10) with done: false (or omitted)
  const progressFullCount: AccountAchievementProgress = {
    id: 991,
    current: 10,
    max: 10,
    done: false,
  };
  const enrichedFull = enrichAchievement(multiStepDef, progressFullCount);
  assert.equal(enrichedFull.isDone, true, 'isDone must be true when current >= max');
  assert.equal(enrichedFull.progressStatus, 'completed');
  assert.equal(enrichedFull.progressFraction, 1.0);
  assert.equal(enrichedFull.remainingCount, 0);
});

// ============================================================================
// 3. Recommendation Strategies & Explainability Tests
// ============================================================================
test('3.1 scoreAchievement produces explainable rationales in DE and EN', () => {
  const multiStepDef: AchievementDefinition = {
    id: 992,
    name: 'Rationale Test',
    nameEn: 'Rationale Test',
    description: 'Rationale test',
    descriptionEn: 'Rationale test',
    requirement: 'Rationale test',
    requirementEn: 'Rationale test',
    flags: ['Permanent'],
    tiers: [{ count: 10, points: 10 }],
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 10,
  };

  const accountProgress: AccountAchievementProgress = {
    id: 992,
    current: 9,
    max: 10,
    done: false,
  };

  const enriched = enrichAchievement(multiStepDef, accountProgress);
  const recEn = scoreAchievement(enriched, 'quickWins', 'en');
  const recDe = scoreAchievement(enriched, 'quickWins', 'de');

  assert.ok(recEn.score > 0);
  assert.ok(recEn.reasonEn.length > 0, 'Must have English reason');
  assert.ok(recDe.reasonDe.length > 0, 'Must have German reason');
  assert.ok(recEn.reasonEn.includes('remaining') || recEn.reasonEn.includes('complete') || recEn.reasonEn.includes('step'));
  assert.ok(recDe.reasonDe.includes('verbleibend') || recDe.reasonDe.includes('Erfolg') || recDe.reasonDe.includes('Schritt'));
});

test('3.2 generateRecommendations ranks Quick Wins ahead of barely started tasks', () => {
  const defNearDone: AchievementDefinition = {
    id: 901,
    name: 'Near Done Task',
    nameEn: 'Near Done Task',
    description: 'Near done',
    descriptionEn: 'Near done',
    requirement: 'Near done',
    requirementEn: 'Near done',
    flags: ['Permanent'],
    tiers: [{ count: 10, points: 10 }],
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 10,
  };

  const defBarelyStarted: AchievementDefinition = {
    id: 902,
    name: 'Barely Started Task',
    nameEn: 'Barely Started Task',
    description: 'Barely started',
    descriptionEn: 'Barely started',
    requirement: 'Barely started',
    requirementEn: 'Barely started',
    flags: ['Permanent'],
    tiers: [{ count: 100, points: 10 }],
    categoryId: 1,
    categoryName: 'General',
    categoryNameEn: 'General',
    groupId: 'general',
    groupName: 'General',
    groupNameEn: 'General',
    requiredCount: 100,
  };

  const enrichedNearDone = enrichAchievement(defNearDone, {
    id: 901,
    current: 9,
    max: 10,
    done: false,
  });

  const enrichedBarelyStarted = enrichAchievement(defBarelyStarted, {
    id: 902,
    current: 1,
    max: 100,
    done: false,
  });

  const recs = generateRecommendations([enrichedBarelyStarted, enrichedNearDone], 'quickWins', 'en');
  assert.ok(recs.length > 0);
  assert.equal(recs[0].achievement.definition.id, 901, 'Quick Wins must rank 90% completion first');
});

test('3.3 generateRecommendations filters out completed achievements with 0 obtainable AP', () => {
  const item = BASE_ACHIEVEMENT_CATALOG[0];
  const enrichedDone = enrichAchievement(item, {
    id: item.id,
    current: 10,
    max: 10,
    done: true,
  });

  const recs = generateRecommendations([enrichedDone], 'bestNext', 'en');
  assert.equal(recs.length, 0, 'Completed achievements must not be recommended');
});

// ============================================================================
// 4. Filtering and Category Exploration Tests
// ============================================================================
test('4.1 filterAndSortAchievements supports query, group, category, and status filters', () => {
  const enrichedList = BASE_ACHIEVEMENT_CATALOG.slice(0, 10).map((a, idx) =>
    enrichAchievement(a, idx === 0 ? { id: a.id, current: 10, max: 10, done: true } : undefined)
  );

  // Status completed
  const completedOnly = filterAndSortAchievements(enrichedList, {
    statusFilter: 'completed',
  });
  assert.equal(completedOnly.length, 1);
  assert.equal(completedOnly[0].isDone, true);

  // Status unstarted
  const unstartedOnly = filterAndSortAchievements(enrichedList, {
    statusFilter: 'unstarted',
  });
  assert.equal(unstartedOnly.length, 9);

  // Text query search
  const firstItem = enrichedList[0].definition;
  const queryResult = filterAndSortAchievements(enrichedList, {
    query: firstItem.name.slice(0, 5),
  });
  assert.ok(queryResult.length > 0);
  assert.equal(queryResult[0].definition.id, firstItem.id);
});

// ============================================================================
// 5. Account Total AP & Cap Breakdown Tests
// ============================================================================
test('5.1 calculateAccountTotalAp calculates actual Total AP accurately with 15,000 daily/monthly cap', () => {
  // Case A: Account with daily AP = 8,000, monthly AP = 5,000 (combined = 13,000, not capped)
  const accountInfo = {
    id: 'test-account-id',
    name: 'Player.1234',
    world: 1001,
    commander: true,
    created: '2012-08-25T00:00:00Z',
    access: ['GuildWars2', 'HeartOfThorns', 'PathOfFire', 'EndOfDragons'],
    daily_ap: 8000,
    monthly_ap: 5000,
    wvw_rank: 50,
    fractal_level: 100,
  };

  const enrichedItems = [
    {
      definition: BASE_ACHIEVEMENT_CATALOG[0],
      currentProgress: 10,
      maxProgress: 10,
      progressFraction: 1,
      progressStatus: 'completed' as const,
      isDone: true,
      earnedAp: 25,
      obtainableAp: 0,
      totalRewardAp: 25,
      isCapped: false,
      isRepeatable: false,
      remainingCount: 0,
      remainingObjectives: [],
      remainingObjectivesEn: [],
    },
    {
      definition: BASE_ACHIEVEMENT_CATALOG[1],
      currentProgress: 5,
      maxProgress: 10,
      progressFraction: 0.5,
      progressStatus: 'in_progress' as const,
      isDone: false,
      earnedAp: 10,
      obtainableAp: 15,
      totalRewardAp: 25,
      isCapped: false,
      isRepeatable: false,
      remainingCount: 5,
      remainingObjectives: [],
      remainingObjectivesEn: [],
    },
  ];

  const breakdown = calculateAccountTotalAp(accountInfo, enrichedItems);
  assert.equal(breakdown.dailyAp, 8000);
  assert.equal(breakdown.monthlyAp, 5000);
  assert.equal(breakdown.dailyMonthlyCombined, 13000);
  assert.equal(breakdown.isDailyMonthlyCapped, false);
  assert.equal(breakdown.permanentAchievementsAp, 35); // 25 + 10
  assert.equal(breakdown.totalAp, 13035);

  // Case B: Account with daily AP = 12,000, monthly AP = 5,000 (combined = 17,000 -> capped at 15,000)
  const cappedAccount = {
    ...accountInfo,
    daily_ap: 12000,
    monthly_ap: 5000,
  };
  const cappedBreakdown = calculateAccountTotalAp(cappedAccount, enrichedItems);
  assert.equal(cappedBreakdown.dailyAp, 12000);
  assert.equal(cappedBreakdown.monthlyAp, 5000);
  assert.equal(cappedBreakdown.dailyMonthlyCombined, 15000);
  assert.equal(cappedBreakdown.isDailyMonthlyCapped, true);
  assert.equal(cappedBreakdown.permanentAchievementsAp, 35);
  assert.equal(cappedBreakdown.totalAp, 15035);

  // Case C: Guest mode (no accountInfo)
  const guestBreakdown = calculateAccountTotalAp(null, enrichedItems);
  assert.equal(guestBreakdown.dailyAp, 0);
  assert.equal(guestBreakdown.monthlyAp, 0);
  assert.equal(guestBreakdown.dailyMonthlyCombined, 0);
  assert.equal(guestBreakdown.isDailyMonthlyCapped, false);
  assert.equal(guestBreakdown.permanentAchievementsAp, 35);
  assert.equal(guestBreakdown.totalAp, 35);
});

// ============================================================================
// 6. AP Milestones & Summary Intelligence (Hero Panel Alignment)
// ============================================================================
test('6.1 calculateApMilestones computes exact 500-AP milestones matching in-game Hero panel', () => {
  // Case A: Account AP = 1,801 (exact user screenshot)
  const milestones1801 = calculateApMilestones(1801, 5);
  assert.equal(milestones1801.length, 5);
  assert.equal(milestones1801[0].ap, 2000);
  assert.equal(milestones1801[0].pointsRemaining, 199);
  assert.equal(milestones1801[0].isSpecial, false);

  assert.equal(milestones1801[1].ap, 2500);
  assert.equal(milestones1801[1].pointsRemaining, 699);
  assert.equal(milestones1801[1].isSpecial, true, '2,500 AP is an ornate milestone chest');

  assert.equal(milestones1801[2].ap, 3000);
  assert.equal(milestones1801[2].pointsRemaining, 1199);

  assert.equal(milestones1801[3].ap, 3500);
  assert.equal(milestones1801[3].pointsRemaining, 1699);

  assert.equal(milestones1801[4].ap, 4000);
  assert.equal(milestones1801[4].pointsRemaining, 2199);

  // Case B: Exactly at milestone (2,000 AP)
  const milestones2000 = calculateApMilestones(2000, 3);
  assert.equal(milestones2000[0].ap, 2500);
  assert.equal(milestones2000[0].pointsRemaining, 500);
});

test('6.2 getNearlyCompletedAchievements prioritizes high completion % matching user screenshot', () => {
  const ascalonDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 101) || BASE_ACHIEVEMENT_CATALOG[0];
  const maguumaDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 102) || BASE_ACHIEVEMENT_CATALOG[1];
  const miningDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 6585) || BASE_ACHIEVEMENT_CATALOG[2];
  const lowProgressDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 1) || BASE_ACHIEVEMENT_CATALOG[3];

  const enrichedList = [
    enrichAchievement(ascalonDef, { id: ascalonDef.id, current: 176, max: 177, done: false }), // 99.43%
    enrichAchievement(maguumaDef, { id: maguumaDef.id, current: 163, max: 167, done: false }), // 97.60%
    enrichAchievement(miningDef, { id: miningDef.id, current: 52, max: 54, done: false }),      // 96.29%
    enrichAchievement(lowProgressDef, { id: lowProgressDef.id, current: 50, max: 1000, done: false }), // 5.0%
  ];

  const nearly = getNearlyCompletedAchievements(enrichedList, 3);
  assert.equal(nearly.length, 3);
  assert.equal(nearly[0].definition.id, ascalonDef.id, '176/177 (99.4%) must be #1');
  assert.equal(nearly[1].definition.id, maguumaDef.id, '163/167 (97.6%) must be #2');
  assert.equal(nearly[2].definition.id, miningDef.id, '52/54 (96.3%) must be #3');
});

test('6.3 getRecentlyCompletedAchievements filters to completed achievements', () => {
  const tequatlDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 908) || BASE_ACHIEVEMENT_CATALOG[0];
  const utilityDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 1729) || BASE_ACHIEVEMENT_CATALOG[1];
  const pendingDef = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === 101) || BASE_ACHIEVEMENT_CATALOG[2];

  const enrichedList = [
    enrichAchievement(tequatlDef, { id: tequatlDef.id, current: 1, max: 1, done: true }),
    enrichAchievement(utilityDef, { id: utilityDef.id, current: 1, max: 1, done: true }),
    enrichAchievement(pendingDef, { id: pendingDef.id, current: 176, max: 177, done: false }),
  ];

  const recent = getRecentlyCompletedAchievements(enrichedList, 5);
  assert.equal(recent.length, 2);
  assert.ok(recent.every((a) => a.isDone));
});

// ============================================================================
// 7. Full Catalog & Official ArenaNet Render Icons Verification
// ============================================================================
test('7.1 Full Catalog covers 8,357 achievements across 19 groups and 360 categories', () => {
  assert.equal(BASE_ACHIEVEMENT_CATALOG.length, 8357, 'Must index all 8,357 achievements');
  assert.equal(ACHIEVEMENT_GROUPS.length, 19, 'Must define all 19 official groups');
  assert.equal(ACHIEVEMENT_CATEGORIES.length, 360, 'Must define all 360 official categories');

  // Verify group names
  const groupNames = ACHIEVEMENT_GROUPS.map((g) => g.name);
  assert.ok(groupNames.includes('Allgemein'));
  assert.ok(groupNames.includes('Chronik'));
  assert.ok(groupNames.includes('Charakter-Abenteuer-Leitfaden'));
  assert.ok(groupNames.includes('Sammlungen'));
  assert.ok(groupNames.includes('Fraktale der Nebel'));

  // 100% of categories have official ArenaNet Render icons
  const missingIcons = ACHIEVEMENT_CATEGORIES.filter((c) => !c.icon || !c.icon.startsWith('https://render.guildwars2.com/file/'));
  assert.equal(missingIcons.length, 0, 'All 360 categories must have official ArenaNet Render icons');
});

test('7.2 Authentic icons resolve correctly for user screenshot achievements', () => {
  // Screenshot achievements: 908, 1729, 1840, 101, 102, 6585
  const screenshotIds = [908, 1729, 1840, 101, 102, 6585];
  for (const id of screenshotIds) {
    const ach = BASE_ACHIEVEMENT_CATALOG.find((a) => a.id === id);
    assert.ok(ach, `Achievement ID ${id} must exist in catalog`);
    assert.ok(ach.name && ach.name.length > 0, `Achievement ID ${id} must have a German name`);
    assert.ok(ach.nameEn && ach.nameEn.length > 0, `Achievement ID ${id} must have an English name`);
    assert.ok(
      ach.icon && ach.icon.startsWith('https://render.guildwars2.com/file/'),
      `Achievement ID ${id} must have an official ArenaNet render icon: ${ach.icon}`
    );
  }
});

