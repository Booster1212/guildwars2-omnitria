import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planLevelRoute,
  groupStepsByStage,
  getNextRecommendedCraftingStep,
  buildCharacterProgressionPlan,
  invalidateCharacterProgressionCache,
} from '../src/domain/levelPlanner.ts';
import { progressActions, DEFAULT_CRAFTING } from '../src/data/progressStore.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';

// Minimal in-memory localStorage mock for Node test environment
function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
    writable: true,
  });
  return mock;
}

test('1. Recommendation Ordering Across Planning Modes (Crafting & Character Progression)', () => {
  invalidateCharacterProgressionCache();

  // Character at Level 12 withStarter Waypoints already completed so Story Ch1, Utility Lv11, and Novice Crafting compete
  const baseInput = {
    characterName: 'Aria Silverblade',
    characterLevel: 12,
    isLevelApiVerified: true,
    completedTaskIds: ['task_starter_waypoints'],
    skippedTaskIds: [],
    deferredTaskIds: [],
    accountAccess: ['GuildWars2', 'HeartOfThorns', 'PathOfFire'],
  };

  const fastPlan = buildCharacterProgressionPlan({
    ...baseInput,
    mode: 'fast',
  });
  const balancedPlan = buildCharacterProgressionPlan({
    ...baseInput,
    mode: 'balanced',
  });

  assert.ok(fastPlan.recommendedNextTask, 'Fast mode must recommend a next task');
  assert.ok(balancedPlan.recommendedNextTask, 'Balanced mode must recommend a next task');

  // In Fast mode at Lv 12, Story Ch1 (weight 96) outranks Utility Skills Lv11 (weight 88)
  assert.equal(fastPlan.recommendedNextTask.definition.id, 'task_story_ch1');
  assert.equal(fastPlan.recommendedNextTask.reasonKey, 'planner.taskReason.storyBurstXp');

  // In Balanced mode at Lv 12, Utility Skills Lv11 (weight 96 + milestone alignment) outranks Story Ch1
  assert.equal(balancedPlan.recommendedNextTask.definition.id, 'task_utility_skills_lv11');
  assert.equal(balancedPlan.recommendedNextTask.reasonKey, 'planner.taskReason.coreUtilityUnlock');

  // Level 80 character: compare Completionist vs Goal-oriented with tracked legendaries
  const lv80Base = {
    characterName: 'Commander Valen',
    characterLevel: 80,
    isLevelApiVerified: true,
    equippedSlotCount: 6, // auto-verifies task_lv80_exotic_gear
    completedTaskIds: [
      'task_starter_waypoints',
      'task_story_ch1',
      'task_story_ch2_ch3',
      'task_orr_exploration_story',
      'task_craft_novice',
      'task_craft_adept_300',
    ],
    skippedTaskIds: [],
    deferredTaskIds: [],
    accountAccess: ['GuildWars2', 'HeartOfThorns', 'PathOfFire', 'EndOfDragons'],
    trackedLegendaryCount: 2,
  };

  const completionistLv80 = buildCharacterProgressionPlan({
    ...lv80Base,
    mode: 'completionist',
  });
  const goalLv80 = buildCharacterProgressionPlan({
    ...lv80Base,
    mode: 'goal',
    targetMilestoneId: 'ms_lv80_mastery_legendary',
  });

  assert.equal(
    completionistLv80.recommendedNextTask?.definition.id,
    'task_world_completion_gift',
    'Completionist mode at Lv 80 should prioritize World Completion',
  );
  assert.equal(
    goalLv80.recommendedNextTask?.definition.id,
    'task_craft_master_400_500',
    'Goal-oriented mode with tracked legendaries should prioritize Master Crafting 400-500',
  );

  // Crafting mode differentiation: Fast/Completionist vs Balanced
  const rAutoCheap: Recipe = {
    id: 'r_auto',
    outputId: 100,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 1, count: 2 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Component',
  };
  const rDiscSlightlyMore: Recipe = {
    id: 'r_disc',
    outputId: 200,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 1, count: 18 }],
    source: 'official',
    flags: [], // Discovery recipe
    type: 'Sword',
  };
  const recipes = [rAutoCheap, rDiscSlightlyMore];
  const byOutput = new Map<number, Recipe[]>([
    [100, [rAutoCheap]],
    [200, [rDiscSlightlyMore]],
  ]);
  const prices = new Map<number, PriceInfo>([
    [1, { sell: 10, buy: 8, sellQty: 500, buyQty: 500 }],
  ]);

  const craftBalanced = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 25,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { allowDiscovery: true, craftIntermediates: false, mode: 'balanced' },
  });
  const craftCompletionist = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 25,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { allowDiscovery: true, craftIntermediates: false, mode: 'completionist' },
  });

  assert.equal(craftBalanced.steps[0].recipe.id, 'r_auto');
  assert.equal(craftCompletionist.steps[0].recipe.id, 'r_disc');
  assert.equal(craftCompletionist.steps[0].reasonKey, 'planner.reason.completionistDiscovery');
});

test('2. Completed, Skipped, and Deferred Tasks/Steps & Next Action Selection', () => {
  const r0: Recipe = {
    id: 'r0',
    outputId: 101,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Artificer'],
    rating: 0,
    ingredients: [{ itemId: 1, count: 1 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const r25: Recipe = {
    id: 'r25',
    outputId: 102,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Artificer'],
    rating: 25,
    ingredients: [{ itemId: 1, count: 1 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Component',
  };
  const r75: Recipe = {
    id: 'r75',
    outputId: 103,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Artificer'],
    rating: 75,
    ingredients: [{ itemId: 1, count: 1 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Scepter',
  };
  const recipes = [r0, r25, r75];
  const byOutput = new Map<number, Recipe[]>(recipes.map((r) => [r.outputId, [r]]));
  const prices = new Map<number, PriceInfo>([[1, { sell: 5, buy: 4, sellQty: 100, buyQty: 100 }]]);

  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 0,
    toRank: 100,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { allowDiscovery: false, craftIntermediates: false },
  });

  assert.equal(plan.steps.length, 3);
  const [step1, step2, step3] = plan.steps;

  // Stage grouping check (0-75 is novice, 75-150 is initiate)
  const stages = groupStepsByStage(plan.steps, [step1.key], [step2.key], [step3.key]);
  assert.equal(stages.length, 2);
  assert.equal(stages[0].id, 'novice');
  assert.equal(stages[0].completedCount, 1);
  assert.equal(stages[0].skippedCount, 1);
  assert.equal(stages[1].id, 'initiate');
  assert.equal(stages[1].deferredCount, 1);

  // Next recommended crafting step when step1 is done and step2 is deferred -> should pick step3 (open) before step2 (deferred)
  const nextWhenDeferred = getNextRecommendedCraftingStep(
    plan.steps,
    25,
    100,
    [step1.key],
    [],
    [step2.key],
  );
  assert.ok(nextWhenDeferred);
  assert.equal(nextWhenDeferred.step.key, step3.key);
  assert.equal(nextWhenDeferred.isDeferred, false);

  // When step3 is also skipped, only deferred step2 remains -> step2 is surfaced as deferred fallback
  const nextOnlyDeferredLeft = getNextRecommendedCraftingStep(
    plan.steps,
    25,
    100,
    [step1.key],
    [step3.key],
    [step2.key],
  );
  assert.ok(nextOnlyDeferredLeft);
  assert.equal(nextOnlyDeferredLeft.step.key, step2.key);
  assert.equal(nextOnlyDeferredLeft.isDeferred, true);
});

test('3. Prerequisite Handling & Expansion Access Restrictions', () => {
  invalidateCharacterProgressionCache();

  // Level 25 Free-to-Play character with NO completed prerequisites
  const f2pPlan = buildCharacterProgressionPlan({
    characterName: 'NewHero',
    characterLevel: 25,
    isLevelApiVerified: true,
    accountAccess: ['PlayForFree'],
    mode: 'balanced',
    completedTaskIds: [],
    skippedTaskIds: [],
    deferredTaskIds: [],
  });

  assert.equal(f2pPlan.accessStatusSummary, 'free_to_play');
  assert.ok(f2pPlan.counts.unavailableExpansion >= 5, 'All 5 expansion tasks must be marked unavailable');

  // Verify no expansion-locked task is available or recommended
  for (const t of f2pPlan.allTasks) {
    if (t.definition.requiredExpansion) {
      assert.equal(t.accessStatus, 'locked_expansion');
      assert.equal(t.isAvailable, false);
    }
  }

  // Verify `task_story_ch1` and `task_spec_slot1_lv21` are blocked by unmet prerequisite `task_starter_waypoints`
  const storyCh1 = f2pPlan.allTasks.find((t) => t.definition.id === 'task_story_ch1')!;
  assert.equal(storyCh1.isBlockedByPrereqs, true);
  assert.deepEqual(storyCh1.unmetPrerequisiteIds, ['task_starter_waypoints']);
  assert.equal(storyCh1.isAvailable, false);

  // Recommended next task must be an unblocked task (`task_starter_waypoints`)
  assert.equal(f2pPlan.recommendedNextTask?.definition.id, 'task_starter_waypoints');

  // Completing `task_starter_waypoints` unlocks `task_story_ch1` and `task_utility_skills_lv11`
  const unlockedPlan = buildCharacterProgressionPlan({
    characterName: 'NewHero',
    characterLevel: 25,
    isLevelApiVerified: true,
    accountAccess: ['PlayForFree'],
    mode: 'balanced',
    completedTaskIds: ['task_starter_waypoints'],
    skippedTaskIds: [],
    deferredTaskIds: [],
  });
  const storyAfter = unlockedPlan.allTasks.find((t) => t.definition.id === 'task_story_ch1')!;
  assert.equal(storyAfter.isBlockedByPrereqs, false);
  assert.equal(storyAfter.isAvailable, true);
});

test('4. Missing/Stale API Data Honesty vs API-Verified State', () => {
  invalidateCharacterProgressionCache();

  // When no API key is connected (accountAccess = null, isLevelApiVerified = false)
  const localOnlyPlan = buildCharacterProgressionPlan({
    characterName: null,
    characterLevel: 80,
    isLevelApiVerified: false,
    isCraftingApiVerified: false,
    craftingRank: 450,
    equippedSlotCount: 0,
    accountAccess: null,
    mode: 'balanced',
    completedTaskIds: ['task_starter_waypoints'],
    skippedTaskIds: [],
    deferredTaskIds: [],
  });

  assert.equal(localOnlyPlan.isLevelApiVerified, false);
  assert.equal(localOnlyPlan.accessStatusSummary, 'unknown');
  assert.equal(localOnlyPlan.counts.apiVerified, 0, 'Must never claim API verification when API is disconnected');
  assert.equal(localOnlyPlan.counts.localCompleted, 1);

  // When API is verified with craftingRank=450, equippedSlotCount=6, wizardsVaultDoneToday=true
  const apiVerifiedPlan = buildCharacterProgressionPlan({
    characterName: 'VerifiedHero',
    characterLevel: 80,
    isLevelApiVerified: true,
    isCraftingApiVerified: true,
    craftingRank: 450,
    equippedSlotCount: 6,
    wizardsVaultDoneToday: true,
    accountAccess: ['GuildWars2', 'HeartOfThorns'],
    mode: 'balanced',
    completedTaskIds: ['task_starter_waypoints'],
    skippedTaskIds: [],
    deferredTaskIds: [],
  });

  assert.equal(apiVerifiedPlan.isLevelApiVerified, true);
  assert.equal(apiVerifiedPlan.accessStatusSummary, 'verified');
  // Auto-verified via API: task_craft_novice (75), task_craft_adept_300 (300), task_craft_master_400_500 (400), task_lv80_exotic_gear (6 slots), task_daily_wizards_vault
  assert.equal(apiVerifiedPlan.counts.apiVerified, 5);
  assert.equal(apiVerifiedPlan.counts.localCompleted, 1);
});

test('5. Character Switching, State Isolation, Undo, Duplicate Prevention & Persistence Across Restarts/Refreshes', () => {
  const storage = installLocalStorageMock();
  storage.clear();
  progressActions.reloadFromStorage();

  // Verify DEFAULT_CRAFTING remains backward compatible
  assert.equal(DEFAULT_CRAFTING.allowDiscovery, false);
  assert.equal(DEFAULT_CRAFTING.craftIntermediates, false);
  assert.deepEqual(DEFAULT_CRAFTING.doneSteps, []);

  // Select Character A ("Rytlock") and complete tasks/steps
  progressActions.setSelectedCharacter('Rytlock');
  progressActions.setPlanningMode('fast');
  progressActions.setTaskStatus('Rytlock', 'task_starter_waypoints', 'completed');
  progressActions.setTaskStatus('Rytlock', 'task_starter_waypoints', 'completed'); // duplicate call
  progressActions.setStepStatus('Rytlock', 'Weaponsmith', '0-25-r1', 'completed');
  progressActions.setCharacterDiscipline('Rytlock', 'Weaponsmith', {
    allowDiscovery: true,
    craftIntermediates: true,
    target: 500,
  });

  // Select Character B ("Logan") and mark a different task skipped
  progressActions.setSelectedCharacter('Logan');
  progressActions.setTaskStatus('Logan', 'task_starter_waypoints', 'skipped');
  progressActions.setStepStatus('Logan', 'Weaponsmith', '0-25-r1', 'deferred');

  // Verify Character A and Character B states do not leak into each other
  const rytlockProg = progressActions.getCharacterProgress('Rytlock');
  const loganProg = progressActions.getCharacterProgress('Logan');

  assert.deepEqual(rytlockProg.completedTaskIds, ['task_starter_waypoints'], 'No duplicate task IDs');
  assert.deepEqual(rytlockProg.skippedTaskIds, []);
  assert.deepEqual(loganProg.completedTaskIds, []);
  assert.deepEqual(loganProg.skippedTaskIds, ['task_starter_waypoints']);

  const rytlockWs = progressActions.getCharacterDiscipline('Rytlock', 'Weaponsmith');
  const loganWs = progressActions.getCharacterDiscipline('Logan', 'Weaponsmith');
  assert.deepEqual(rytlockWs.doneSteps, ['0-25-r1']);
  assert.equal(rytlockWs.allowDiscovery, true);
  assert.deepEqual(loganWs.doneSteps, []);
  assert.deepEqual(loganWs.deferredSteps, ['0-25-r1']);

  // Account-wide planning mode remains separate from character switching
  assert.equal(progressActions.getPlannerPreferences().mode, 'fast');

  // Test Undo: undoing last action on Logan (`0-25-r1` deferred) restores it to `'open'`
  const undone = progressActions.undoLastPlannerAction();
  assert.ok(undone);
  assert.deepEqual(progressActions.getCharacterDiscipline('Logan', 'Weaponsmith').deferredSteps, []);

  // Simulate repeated API refresh (`syncAccountRatings`) -> must NOT erase doneSteps or preferences!
  progressActions.syncAccountRatings(
    { Weaponsmith: { rating: 150, character: 'Rytlock' } },
    [
      {
        name: 'Rytlock',
        level: 80,
        crafting: [{ discipline: 'Weaponsmith', rating: 150 }],
      },
    ],
  );

  const rytlockWsAfterSync = progressActions.getCharacterDiscipline('Rytlock', 'Weaponsmith');
  assert.deepEqual(
    rytlockWsAfterSync.doneSteps,
    ['0-25-r1'],
    'API sync must preserve user completed steps',
  );
  assert.equal(rytlockWsAfterSync.allowDiscovery, true);
  assert.equal(rytlockWsAfterSync.start, 150);

  // Simulate application restart by reloading from localStorage
  const reloaded = progressActions.reloadFromStorage();
  assert.equal(reloaded.plannerPreferences?.mode, 'fast');
  assert.deepEqual(
    reloaded.characterProgress?.['Rytlock']?.completedTaskIds,
    ['task_starter_waypoints'],
  );
  assert.deepEqual(
    reloaded.characterProgress?.['Rytlock']?.disciplines?.['Weaponsmith']?.doneSteps,
    ['0-25-r1'],
  );
});

test('6. Legacy Progress Migration & Backward Compatibility', () => {
  const storage = installLocalStorageMock();
  // Write legacy v1 JSON without plannerPreferences or characterProgress
  storage.setItem(
    'gw2_overlay_progress_v1',
    JSON.stringify({
      tracked: [101],
      legendary: {
        30684: { doneNodes: ['gift_mastery'], doneMaterials: [], buyItems: [] },
      },
      crafting: {
        Armorsmith: {
          target: 500,
          start: 125,
          doneSteps: ['step_legacy_1'],
          allowDiscovery: true,
          craftIntermediates: true,
        },
      },
    }),
  );

  const migrated = progressActions.reloadFromStorage();
  assert.deepEqual(migrated.tracked, [101]);
  assert.deepEqual(migrated.legendary[30684]?.doneNodes, ['gift_mastery']);
  assert.equal(migrated.crafting['Armorsmith']?.start, 125);
  assert.deepEqual(migrated.crafting['Armorsmith']?.doneSteps, ['step_legacy_1']);
  assert.equal(migrated.plannerPreferences?.mode, 'balanced');
  assert.deepEqual(migrated.characterProgress, {});
});
