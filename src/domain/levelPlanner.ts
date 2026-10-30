/**
 * Level planner for crafting disciplines & interactive character progression.
 *
 * Inputs originate from the official GW2 API (recipes, prices, character levels, discipline ratings,
 * account expansion access) and local per-character progress tracking.
 *
 * Crafting Approach:
 *  1. For each rank N in the target range, select among eligible recipes the one with the best
 *     mode-adjusted efficiency (cost per rank, XP speed, recipe discovery completion, or goal alignment)
 *     with hysteresis against flickering.
 *  2. Consecutive ranks with the same recipe are consolidated into a single step with stage grouping,
 *     effort estimates, expected benefit, and prerequisite metadata.
 *  3. Ingredients are – if allowed and cheaper – resolved via intermediate components
 *     (own recipes in the same discipline), otherwise bought.
 *  4. Ranks without an eligible recipe are reported as a GAP (rather than fabricated).
 *
 * Character Progression Approach:
 *  1. Evaluates curated GW2 progression tasks across exploration, hero points, story, equipment,
 *     crafting, and mastery preparation against the selected character's level, API-verified state,
 *     expansion ownership (/v2/account access), prerequisites, and user planning mode.
 *  2. Filters out completed, skipped, expansion-locked, or prerequisite-blocked tasks from active
 *     recommendations, deprioritizes deferred tasks, and surfaces the #1 Next Recommended Action
 *     with a transparent explanation, effort estimate, and expected progression benefit.
 */
import type { PriceInfo, Recipe } from './types.ts';
import { categoryOf, ranksPerCraft } from './craftingXp.ts';
import type { XpCategory } from './craftingXp.ts';
import { unitPrice } from './costs.ts';
import type { PlannerMode, TaskOrStepStatus } from '../data/progressStore.ts';

export type { PlannerMode, TaskOrStepStatus };

export type CraftingStageId =
  | 'novice'
  | 'initiate'
  | 'apprentice'
  | 'journeyman'
  | 'adept'
  | 'master';

export interface PlannerOptions {
  /** Allow discovery recipes (without AutoLearned/LearnedFromItem flags) */
  allowDiscovery: boolean;
  /** Self-craft intermediate components if cheaper than buying */
  craftIntermediates: boolean;
  /** Recipes known to account (API: /v2/account/recipes), if available */
  knownRecipeIds?: ReadonlySet<number> | null;
  /** Optional planning mode that adjusts candidate prioritization */
  mode?: PlannerMode;
  /** Optional account stock map to prioritize recipes with owned ingredients in goal/balanced modes */
  stock?: ReadonlyMap<number, number> | null;
  /** Optional set of recipe IDs or step keys skipped by the user */
  skippedRecipeIds?: ReadonlySet<string> | null;
  /** Optional set of goal item IDs (e.g. from tracked Legendaries) */
  goalItemIds?: ReadonlySet<number> | null;
}

export interface PlannerInput {
  discipline: string;
  fromRank: number;
  toRank: number;
  recipes: readonly Recipe[];
  recipesByOutput: ReadonlyMap<number, readonly Recipe[]>;
  prices: ReadonlyMap<number, PriceInfo>;
  options: PlannerOptions;
}

export interface StepMaterial {
  itemId: number;
  qty: number;
}

export interface StepPrepItem {
  recipe: Recipe;
  outputId: number;
  crafts: number;
  outputCount: number;
  depth: number;
  ingredients: StepMaterial[];
  needsDiscovery: boolean;
}

export interface StepPrerequisite {
  minRank: number;
  requiresDiscovery: boolean;
  requiresRecipeSheet: boolean;
  prepItemIds: number[];
}

export interface StepExpectedBenefit {
  ranksGained: number;
  fromRank: number;
  toRank: number;
  unlocksRecipe: boolean;
  reachesMilestone: number | null;
}

export interface PlanStep {
  key: string;
  recipe: Recipe;
  category: XpCategory;
  fromRank: number;
  toRank: number;
  crafts: number;
  /** Direct ingredients (already multiplied by number of craft runs) */
  ingredients: StepMaterial[];
  /** Vorbereitende Eigenherstellungsschritte in Produktionsreihenfolge (z.B. Seidenballen => Seiden-Insignie) */
  prepSteps: StepPrepItem[];
  /** Zu kaufende Basismaterialien dieses Schritts (inkl. Zwischenprodukt-Zutaten) */
  purchases: StepMaterial[];
  /** Total priceable purchases in copper */
  cost: number;
  unpricedCount: number;
  needsDiscovery: boolean;
  /** Tier stage grouping */
  stageId?: CraftingStageId;
  /** Transparent recommendation reason key */
  reasonKey?: string;
  /** Estimated effort in minutes at crafting station */
  estimatedMinutes?: number;
  /** Expected progression benefit */
  expectedBenefit?: StepExpectedBenefit;
  /** Prerequisite metadata */
  prerequisites?: StepPrerequisite;
}

export interface PlanGap {
  from: number;
  to: number;
}

export interface IntermediateCraft {
  recipe: Recipe;
  crafts: number;
}

export interface PlanResult {
  steps: PlanStep[];
  gaps: PlanGap[];
  /** Aggregierte Einkaufsliste */
  purchases: Map<number, number>;
  intermediates: IntermediateCraft[];
  totalCrafts: number;
  totalCost: number;
  unpricedItems: number[];
}

export interface CraftingStageGroup {
  id: CraftingStageId;
  fromRank: number;
  toRank: number;
  labelKey: string;
  steps: PlanStep[];
  completedCount: number;
  skippedCount: number;
  deferredCount: number;
  openCount: number;
}

export interface NextRecommendedStepInfo {
  step: PlanStep;
  status: TaskOrStepStatus;
  isDeferred: boolean;
  nextMilestoneRank: number;
  ranksToMilestone: number;
  reasonKey: string;
}

interface Acq {
  unit: number | null;
  via: 'buy' | 'craft' | 'unknown';
  recipe?: Recipe;
}

const HYSTERESIS = 1.15;

export const CRAFTING_TIER_MILESTONES = [75, 150, 225, 300, 400, 500] as const;

export function getCraftingStageId(rank: number): CraftingStageId {
  if (rank < 75) return 'novice';
  if (rank < 150) return 'initiate';
  if (rank < 225) return 'apprentice';
  if (rank < 300) return 'journeyman';
  if (rank < 400) return 'adept';
  return 'master';
}

export function getCraftingStageMeta(stageId: CraftingStageId): {
  id: CraftingStageId;
  fromRank: number;
  toRank: number;
  labelKey: string;
} {
  switch (stageId) {
    case 'novice':
      return { id: 'novice', fromRank: 0, toRank: 75, labelKey: 'planner.stage.novice' };
    case 'initiate':
      return { id: 'initiate', fromRank: 75, toRank: 150, labelKey: 'planner.stage.initiate' };
    case 'apprentice':
      return { id: 'apprentice', fromRank: 150, toRank: 225, labelKey: 'planner.stage.apprentice' };
    case 'journeyman':
      return { id: 'journeyman', fromRank: 225, toRank: 300, labelKey: 'planner.stage.journeyman' };
    case 'adept':
      return { id: 'adept', fromRank: 300, toRank: 400, labelKey: 'planner.stage.adept' };
    case 'master':
      return { id: 'master', fromRank: 400, toRank: 500, labelKey: 'planner.stage.master' };
  }
}

export function getNextCraftingMilestone(currentRank: number, maxRank = 500): number {
  for (const m of CRAFTING_TIER_MILESTONES) {
    if (m > currentRank && m <= maxRank) return m;
  }
  return maxRank;
}

export function maxRankOf(discipline: string, recipes: readonly Recipe[]): number {
  let max = 0;
  for (const r of recipes) {
    if (r.disciplines.includes(discipline) && r.rating > max) max = r.rating;
  }
  return Math.min(500, max);
}

export function planLevelRoute(input: PlannerInput): PlanResult {
  const { discipline, fromRank, toRank, recipes, recipesByOutput, prices, options } = input;
  const known = options.knownRecipeIds ?? null;
  const mode = options.mode;
  const stock = options.stock ?? null;
  const skippedIds = options.skippedRecipeIds ?? null;
  const goalItems = options.goalItemIds ?? null;

  const isLearned = (r: Recipe): boolean =>
    Boolean(r.flags?.includes('AutoLearned')) || (known !== null && known.has(Number(r.id)));
  const isDiscovery = (r: Recipe): boolean =>
    !r.flags?.includes('AutoLearned') && !r.flags?.includes('LearnedFromItem');
  const isUsable = (r: Recipe): boolean =>
    isLearned(r) || (options.allowDiscovery && isDiscovery(r));

  // Candidates for leveling steps
  const allCandidates: { recipe: Recipe; category: XpCategory }[] = [];
  for (const r of recipes) {
    if (!r.disciplines.includes(discipline)) continue;
    const category = categoryOf(r.type);
    if (!category || !isUsable(r)) continue;
    allCandidates.push({ recipe: r, category });
  }
  allCandidates.sort((a, b) => a.recipe.rating - b.recipe.rating || String(a.recipe.id).localeCompare(String(b.recipe.id)));

  // Filter out skipped recipes when non-skipped alternatives exist
  const nonSkippedCandidates = skippedIds && skippedIds.size > 0
    ? allCandidates.filter((c) => !skippedIds.has(String(c.recipe.id)))
    : allCandidates;
  const candidates = nonSkippedCandidates.length > 0 ? nonSkippedCandidates : allCandidates;

  // ---- Beschaffungsentscheidung je (Item, Rang) -----------------------------------------------
  const memo = new Map<string, Acq>();
  const acq = (itemId: number, rank: number, depth: number, stack: Set<number>): Acq => {
    const mk = `${itemId}@${rank}`;
    const cached = memo.get(mk);
    if (cached) return cached;
    const price = unitPrice(prices.get(itemId), itemId);
    let best: Acq = { unit: price, via: price !== null ? 'buy' : 'unknown' };
    if (options.craftIntermediates && depth < 8 && !stack.has(itemId)) {
      stack.add(itemId);
      for (const r of recipesByOutput.get(itemId) ?? []) {
        if (!r.disciplines.includes(discipline) || r.rating > rank) continue;
        // If the item cannot be bought on TP/vendor (price === null), crafting it is the only viable in-game path!
        // Otherwise, honor isUsable(r)
        if (!isUsable(r) && price !== null) continue;
        let sum = 0;
        let hasPricedIngredient = false;
        for (const ing of r.ingredients) {
          const a = acq(ing.itemId, rank, depth + 1, stack);
          if (a.unit !== null) {
            sum += a.unit * ing.count;
            hasPricedIngredient = true;
          }
        }
        const unit = hasPricedIngredient ? sum / Math.max(1, r.outputCount) : (price ?? null);
        // Bevorzuge Eigenherstellung ('craft') vor Kauf ('buy'), solange herstellbar
        if (best.via !== 'craft' || (unit !== null && (best.unit === null || unit < best.unit))) {
          best = { unit, via: 'craft', recipe: r };
        }
      }
      stack.delete(itemId);
    }
    memo.set(mk, best);
    return best;
  };

  // ---- Rezeptwahl je Rang ----------------------------------------------------------------------
  interface Choice {
    recipe: Recipe;
    category: XpCategory;
    costPerRank: number;
    unknown: number;
  }
  const evalCandidate = (c: { recipe: Recipe; category: XpCategory }, rank: number): Choice | null => {
    const isDisc = !isLearned(c.recipe);
    const rpc = ranksPerCraft(c.category, rank, c.recipe.rating, isDisc);
    if (rpc <= 0) return null;
    let cost = 0;
    let unknown = 0;
    let stockCoveredCount = 0;
    for (const ing of c.recipe.ingredients) {
      const a = acq(ing.itemId, rank, 0, new Set());
      const owned = stock ? (stock.get(ing.itemId) ?? 0) : 0;
      if (owned >= ing.count) {
        stockCoveredCount++;
      }
      if (a.unit === null) {
        const isCovered = owned >= ing.count;
        if (isCovered) {
          cost += 50;
        } else {
          unknown++;
          // Severe unbuyable penalty: this ingredient is unpriced and untradable on the TP/vendor,
          // and the player does not have it in stock. Prevent treating it as cheap 50 copper!
          cost += 250_000;
        }
      } else {
        cost += a.unit * ing.count;
      }
    }
    // Efficient Leveling: Recipes crafted more than 25 ranks above unlock
    // lose experience rapidly in GW2 (yellow/green recipes). Age penalty encourages new tier recipes:
    const age = rank - c.recipe.rating;
    const agePenalty = age > 25 ? 1 + (age - 25) * 0.2 : 1;
    let effectiveCostPerRank = (cost * agePenalty) / rpc;

    // Apply transparent mode-specific weighting when mode is specified
    if (mode === 'fast') {
      // Fast mode prioritizes high XP gain per craft (fewer craft runs, discovery bonus, item/component tier)
      const speedFactor = 1 / Math.max(0.15, rpc * rpc);
      effectiveCostPerRank = (Math.max(10, cost * 0.15) * agePenalty) * speedFactor;
    } else if (mode === 'completionist') {
      // Completionist mode prioritizes undiscovered recipes and equipment/item unlocks
      if (isDisc) {
        effectiveCostPerRank *= 0.35;
      } else if (c.category === 'item') {
        effectiveCostPerRank *= 0.7;
      }
    } else if (mode === 'goal') {
      // Goal mode prioritizes items/ingredients linked to tracked goals or owned in stock
      const matchesGoal =
        goalItems !== null &&
        (goalItems.has(c.recipe.outputId) || c.recipe.ingredients.some((i) => goalItems.has(i.itemId)));
      if (matchesGoal) {
        effectiveCostPerRank *= 0.4;
      }
      if (stockCoveredCount > 0 && c.recipe.ingredients.length > 0) {
        const stockRatio = stockCoveredCount / c.recipe.ingredients.length;
        effectiveCostPerRank *= 1 - stockRatio * 0.45;
      }
    } else if (mode === 'balanced') {
      // Balanced mode rewards stock coverage moderately while keeping low cost & discovery value
      if (stockCoveredCount > 0 && c.recipe.ingredients.length > 0) {
        const stockRatio = stockCoveredCount / c.recipe.ingredients.length;
        effectiveCostPerRank *= 1 - stockRatio * 0.2;
      }
    }

    return { recipe: c.recipe, category: c.category, costPerRank: effectiveCostPerRank, unknown };
  };

  interface RawStep {
    recipe: Recipe;
    category: XpCategory;
    fromRank: number;
    toRank: number;
    craftsExact: number;
  }
  const raw: RawStep[] = [];
  const gaps: PlanGap[] = [];
  let prev: RawStep | null = null;

  for (let n = fromRank; n < toRank; n++) {
    let best: Choice | null = null;
    let prevChoice: Choice | null = null;
    for (const c of candidates) {
      if (c.recipe.rating > n) break; // sortiert
      const ev = evalCandidate(c, n);
      if (!ev) continue;
      if (prev && c.recipe.id === prev.recipe.id) prevChoice = ev;
      const score = ev.costPerRank + ev.unknown * 150;
      const bestScore = best ? best.costPerRank + best.unknown * 150 : Infinity;
      if (!best || score < bestScore) {
        best = ev;
      }
    }
    if (!best) {
      const last = gaps[gaps.length - 1];
      if (last && last.to === n) last.to = n + 1;
      else gaps.push({ from: n, to: n + 1 });
      prev = null;
      continue;
    }
    let chosen = best;
    // Apply hysteresis against flickering only if previous recipe is within same 25-rank band
    if (
      prevChoice &&
      (n - prevChoice.recipe.rating <= 25) &&
      (prevChoice.costPerRank + prevChoice.unknown * 150) <= (best.costPerRank + best.unknown * 150) * HYSTERESIS
    ) {
      chosen = prevChoice;
    }
    const isStepFirstCraft = !prev || prev.recipe.id !== chosen.recipe.id;
    const isDisc = !isLearned(chosen.recipe) && isStepFirstCraft;
    const rpc = ranksPerCraft(chosen.category, n, chosen.recipe.rating, isDisc);
    if (prev && prev.recipe.id === chosen.recipe.id && prev.toRank === n) {
      prev.toRank = n + 1;
      prev.craftsExact += 1 / rpc;
    } else {
      prev = { recipe: chosen.recipe, category: chosen.category, fromRank: n, toRank: n + 1, craftsExact: 1 / rpc };
      raw.push(prev);
    }
  }

  // ---- Resolve ingredients ---------------------------------------------------------------------
  const purchases = new Map<number, number>();
  const intermediateMap = new Map<string, IntermediateCraft>();
  const unpriced = new Set<number>();
  const usedKeys = new Map<string, number>();

  const steps: PlanStep[] = raw.map((rs) => {
    const crafts = Math.max(1, Math.ceil(rs.craftsExact - 1e-9));
    const stepPurchases = new Map<number, number>();
    const stepPrepMap = new Map<string, StepPrepItem>();

    const resolve = (itemId: number, qty: number, rank: number, depth: number) => {
      const a = acq(itemId, rank, depth, new Set());
      if (a.via === 'craft' && a.recipe) {
        const outCount = Math.max(1, a.recipe.outputCount);
        const k = Math.ceil(qty / outCount - 1e-9);
        const ex = intermediateMap.get(a.recipe.id);
        intermediateMap.set(a.recipe.id, { recipe: a.recipe, crafts: (ex?.crafts ?? 0) + k });

        const prepEx = stepPrepMap.get(a.recipe.id);
        const currentCrafts = (prepEx?.crafts ?? 0) + k;
        stepPrepMap.set(a.recipe.id, {
          recipe: a.recipe,
          outputId: a.recipe.outputId,
          crafts: currentCrafts,
          outputCount: outCount,
          depth,
          ingredients: a.recipe.ingredients.map((ing) => ({
            itemId: ing.itemId,
            qty: ing.count * currentCrafts,
          })),
          needsDiscovery: !isLearned(a.recipe),
        });

        for (const ing of a.recipe.ingredients) {
          resolve(ing.itemId, ing.count * k, rank, depth + 1);
        }
      } else {
        stepPurchases.set(itemId, (stepPurchases.get(itemId) ?? 0) + qty);
        purchases.set(itemId, (purchases.get(itemId) ?? 0) + qty);
      }
    };
    const ingredients: StepMaterial[] = rs.recipe.ingredients.map((i) => ({ itemId: i.itemId, qty: i.count * crafts }));
    for (const ing of ingredients) resolve(ing.itemId, ing.qty, rs.fromRank, 0);

    // Sortierung in exakter Produktionsreihenfolge: tiefste Unterprodukte (z.B. Seidenballen) zuerst,
    // darauf aufbauende Zwischenprodukte (z.B. Seiden-Insignie) danach
    const prepSteps = Array.from(stepPrepMap.values()).sort((a, b) => b.depth - a.depth);

    let cost = 0;
    let unpricedCount = 0;
    for (const [itemId, qty] of stepPurchases) {
      const u = unitPrice(prices.get(itemId), itemId);
      if (u === null) {
        unpricedCount++;
        unpriced.add(itemId);
      } else cost += u * qty;
    }
    const base = rs.recipe.id;
    const n = (usedKeys.get(base) ?? 0) + 1;
    usedKeys.set(base, n);

    const needsDiscovery = !isLearned(rs.recipe);
    const prepCraftsTotal = prepSteps.reduce((acc, p) => acc + p.crafts, 0);
    const totalStationCrafts = crafts + prepCraftsTotal;
    const estimatedMinutes = Math.max(1, Math.ceil((totalStationCrafts * 2 + (needsDiscovery ? 15 : 0)) / 60));

    let reasonKey = 'planner.reason.costOptimal';
    if (needsDiscovery && mode === 'completionist') {
      reasonKey = 'planner.reason.completionistDiscovery';
    } else if (needsDiscovery) {
      reasonKey = 'planner.reason.discoveryBonusXp';
    } else if (mode === 'fast') {
      reasonKey = 'planner.reason.fastXpGain';
    } else if (mode === 'goal' && goalItems && (goalItems.has(rs.recipe.outputId) || rs.recipe.ingredients.some((i) => goalItems.has(i.itemId)))) {
      reasonKey = 'planner.reason.goalAligned';
    } else if (rs.category === 'refinement') {
      reasonKey = 'planner.reason.refinementTier';
    } else if (prepSteps.length > 0) {
      reasonKey = 'planner.reason.intermediateChain';
    }

    const crossedMilestone = CRAFTING_TIER_MILESTONES.find((m) => rs.fromRank < m && rs.toRank >= m) ?? null;

    return {
      key: n === 1 ? base : `${base}.${n}`,
      recipe: rs.recipe,
      category: rs.category,
      fromRank: rs.fromRank,
      toRank: rs.toRank,
      crafts,
      ingredients,
      prepSteps,
      purchases: [...stepPurchases].map(([itemId, qty]) => ({ itemId, qty })),
      cost,
      unpricedCount,
      needsDiscovery,
      stageId: getCraftingStageId(rs.fromRank),
      reasonKey,
      estimatedMinutes,
      expectedBenefit: {
        ranksGained: rs.toRank - rs.fromRank,
        fromRank: rs.fromRank,
        toRank: rs.toRank,
        unlocksRecipe: needsDiscovery,
        reachesMilestone: crossedMilestone,
      },
      prerequisites: {
        minRank: rs.recipe.rating,
        requiresDiscovery: needsDiscovery,
        requiresRecipeSheet: Boolean(rs.recipe.flags?.includes('LearnedFromItem')),
        prepItemIds: prepSteps.map((p) => p.outputId),
      },
    };
  });

  let totalCost = 0;
  for (const [itemId, qty] of purchases) {
    const u = unitPrice(prices.get(itemId), itemId);
    if (u !== null) totalCost += u * qty;
  }
  const totalCrafts =
    steps.reduce((s, st) => s + st.crafts, 0) + [...intermediateMap.values()].reduce((s, i) => s + i.crafts, 0);

  return {
    steps,
    gaps,
    purchases,
    intermediates: [...intermediateMap.values()],
    totalCrafts,
    totalCost,
    unpricedItems: [...unpriced],
  };
}

/**
 * Groups crafting steps into logical GW2 crafting tier stages (0-75, 75-150, 150-225, 225-300, 300-400, 400-500).
 */
export function groupStepsByStage(
  steps: readonly PlanStep[],
  doneSteps: readonly string[] = [],
  skippedSteps: readonly string[] = [],
  deferredSteps: readonly string[] = [],
): CraftingStageGroup[] {
  const doneSet = new Set(doneSteps);
  const skipSet = new Set(skippedSteps);
  const deferSet = new Set(deferredSteps);

  const stageOrder: CraftingStageId[] = ['novice', 'initiate', 'apprentice', 'journeyman', 'adept', 'master'];
  const byStage = new Map<CraftingStageId, PlanStep[]>();

  for (const st of steps) {
    const sid = st.stageId ?? getCraftingStageId(st.fromRank);
    const list = byStage.get(sid) ?? [];
    list.push(st);
    byStage.set(sid, list);
  }

  const groups: CraftingStageGroup[] = [];
  for (const sid of stageOrder) {
    const stageSteps = byStage.get(sid);
    if (!stageSteps || stageSteps.length === 0) continue;
    const meta = getCraftingStageMeta(sid);
    let completedCount = 0;
    let skippedCount = 0;
    let deferredCount = 0;
    let openCount = 0;
    for (const st of stageSteps) {
      if (doneSet.has(st.key)) completedCount++;
      else if (skipSet.has(st.key)) skippedCount++;
      else if (deferSet.has(st.key)) deferredCount++;
      else openCount++;
    }
    groups.push({
      id: sid,
      fromRank: stageSteps[0].fromRank,
      toRank: stageSteps[stageSteps.length - 1].toRank,
      labelKey: meta.labelKey,
      steps: stageSteps,
      completedCount,
      skippedCount,
      deferredCount,
      openCount,
    });
  }
  return groups;
}

/**
 * Identifies the immediate next recommended crafting step, skipping completed/skipped steps
 * and deprioritizing deferred steps.
 */
export function getNextRecommendedCraftingStep(
  steps: readonly PlanStep[],
  currentRank: number,
  targetRank: number,
  doneSteps: readonly string[] = [],
  skippedSteps: readonly string[] = [],
  deferredSteps: readonly string[] = [],
): NextRecommendedStepInfo | null {
  if (!steps.length) return null;
  const doneSet = new Set(doneSteps);
  const skipSet = new Set(skippedSteps);
  const deferSet = new Set(deferredSteps);

  const openEligible = steps.filter((st) => !doneSet.has(st.key) && !skipSet.has(st.key) && !deferSet.has(st.key));
  const deferredEligible = steps.filter((st) => !doneSet.has(st.key) && !skipSet.has(st.key) && deferSet.has(st.key));

  const chosen = openEligible[0] ?? deferredEligible[0] ?? null;
  if (!chosen) return null;

  const isDeferred = deferSet.has(chosen.key);
  const nextMilestoneRank = getNextCraftingMilestone(Math.max(currentRank, chosen.fromRank), targetRank);
  const ranksToMilestone = Math.max(0, nextMilestoneRank - chosen.fromRank);

  return {
    step: chosen,
    status: isDeferred ? 'deferred' : 'open',
    isDeferred,
    nextMilestoneRank,
    ranksToMilestone,
    reasonKey: chosen.reasonKey ?? 'planner.reason.costOptimal',
  };
}

/** All item IDs required by planner for prices/names (outputs + ingredients, 2 levels deep) */
export function collectPlannerItemIds(
  discipline: string,
  recipes: readonly Recipe[],
  recipesByOutput: ReadonlyMap<number, readonly Recipe[]>,
): number[] {
  const ids = new Set<number>();
  const addIngredients = (r: Recipe, depth: number) => {
    for (const ing of r.ingredients) {
      if (ids.has(ing.itemId) && depth > 0) continue;
      ids.add(ing.itemId);
      if (depth < 8) {
        for (const r2 of recipesByOutput.get(ing.itemId) ?? []) {
          if (r2.disciplines.includes(discipline)) addIngredients(r2, depth + 1);
        }
      }
    }
  };
  for (const r of recipes) {
    if (!r.disciplines.includes(discipline)) continue;
    if (!categoryOf(r.type)) continue;
    if (r.flags?.includes('LearnedFromItem')) continue;
    ids.add(r.outputId);
    addIngredients(r, 0);
  }
  return [...ids];
}

// ============================================================================
// CHARACTER LEVELING & PROGRESSION PLANNER ENGINE (LEVELS 1–80 & ENDGAME)
// ============================================================================

export type ProgressionCategory =
  | 'story'
  | 'exploration'
  | 'hero_points'
  | 'equipment'
  | 'crafting'
  | 'mastery';

export type ProgressionStageId =
  | 'stage_foundations'
  | 'stage_core_unlocks'
  | 'stage_midgame'
  | 'stage_endgame_prep'
  | 'stage_level80_mastery';

export type ExpansionAccessFlag =
  | 'GuildWars2'
  | 'HeartOfThorns'
  | 'PathOfFire'
  | 'EndOfDragons'
  | 'SecretsOfTheObscure'
  | 'JanthirWilds';

export type VerificationSource = 'api_verified' | 'local_tracked' | 'open';
export type AccessStatus = 'accessible' | 'locked_expansion' | 'unknown_access';

export interface CharacterMilestone {
  id: string;
  level: number;
  titleKey: string;
  benefitKey: string;
  category: ProgressionCategory;
}

export interface ProgressionTaskDefinition {
  id: string;
  stageId: ProgressionStageId;
  category: ProgressionCategory;
  minLevel: number;
  recommendedMaxLevel: number;
  /** If character level is at or above this threshold via API, milestone unlock is API-verified */
  autoVerifyAtLevel?: number;
  /** Optional crafting rating threshold that auto-verifies this task via API */
  autoVerifyAtCraftingRank?: number;
  /** Optional minimum equipped items count on character to auto-verify */
  autoVerifyEquippedSlots?: number;
  /** Optional daily API flag ('wizards_vault' | 'world_boss') */
  autoVerifyDailyFlag?: 'wizards_vault' | 'world_boss';
  titleKey: string;
  descKey: string;
  benefitKey: string;
  /** Estimated effort in minutes (null if open-ended) */
  effortMinutes: number | null;
  prerequisiteTaskIds: string[];
  requiredExpansion?: ExpansionAccessFlag;
  milestoneId?: string;
  /** Base priority weights per planning mode (transparent, explainable) */
  modeWeights: Record<PlannerMode, number>;
  /** Reason key per mode explaining why this task is prioritized */
  modeReasonKeys: Record<PlannerMode, string>;
}

export interface EvaluatedProgressionTask {
  definition: ProgressionTaskDefinition;
  status: TaskOrStepStatus;
  verificationSource: VerificationSource;
  accessStatus: AccessStatus;
  isAvailable: boolean;
  isBlockedByPrereqs: boolean;
  isBlockedByLevel: boolean;
  unmetPrerequisiteIds: string[];
  priorityScore: number;
  reasonKey: string;
  contributesToNextMilestone: boolean;
}

export interface ProgressionStageGroup {
  id: ProgressionStageId;
  labelKey: string;
  levelRangeLabel: string;
  tasks: EvaluatedProgressionTask[];
  completedCount: number;
  skippedCount: number;
  deferredCount: number;
  openCount: number;
}

export interface CharacterProgressionInput {
  characterName: string | null;
  characterLevel: number;
  isLevelApiVerified: boolean;
  characterProfession?: string | null;
  /** Highest or character-specific crafting rank */
  craftingRank?: number;
  isCraftingApiVerified?: boolean;
  equippedSlotCount?: number;
  /** Expansion flags from /v2/account (null if API key missing) */
  accountAccess?: readonly string[] | null;
  /** Daily progression verification flags */
  wizardsVaultDoneToday?: boolean;
  worldBossDoneToday?: boolean;
  /** Tracked legendary count for goal-oriented prioritization */
  trackedLegendaryCount?: number;
  /** User planning preferences & character-specific task states */
  mode: PlannerMode;
  targetMilestoneId?: string | null;
  completedTaskIds: readonly string[];
  skippedTaskIds: readonly string[];
  deferredTaskIds: readonly string[];
}

export interface CharacterProgressionPlan {
  characterName: string | null;
  characterLevel: number;
  isLevelApiVerified: boolean;
  accessStatusSummary: 'verified' | 'free_to_play' | 'unknown';
  ownedExpansions: string[];
  currentMilestone: CharacterMilestone;
  nextMilestone: CharacterMilestone;
  milestones: CharacterMilestone[];
  recommendedNextTask: EvaluatedProgressionTask | null;
  allTasks: EvaluatedProgressionTask[];
  stages: ProgressionStageGroup[];
  counts: {
    total: number;
    completed: number;
    apiVerified: number;
    localCompleted: number;
    skipped: number;
    deferred: number;
    remaining: number;
    blocked: number;
    unavailableExpansion: number;
  };
}

export const CHARACTER_MILESTONES: readonly CharacterMilestone[] = [
  {
    id: 'ms_lv10_story',
    level: 10,
    titleKey: 'planner.milestone.lv10.title',
    benefitKey: 'planner.milestone.lv10.benefit',
    category: 'story',
  },
  {
    id: 'ms_lv11_utility',
    level: 11,
    titleKey: 'planner.milestone.lv11.title',
    benefitKey: 'planner.milestone.lv11.benefit',
    category: 'hero_points',
  },
  {
    id: 'ms_lv21_spec1',
    level: 21,
    titleKey: 'planner.milestone.lv21.title',
    benefitKey: 'planner.milestone.lv21.benefit',
    category: 'hero_points',
  },
  {
    id: 'ms_lv30_elite',
    level: 30,
    titleKey: 'planner.milestone.lv30.title',
    benefitKey: 'planner.milestone.lv30.benefit',
    category: 'hero_points',
  },
  {
    id: 'ms_lv45_spec2',
    level: 45,
    titleKey: 'planner.milestone.lv45.title',
    benefitKey: 'planner.milestone.lv45.benefit',
    category: 'hero_points',
  },
  {
    id: 'ms_lv60_pact',
    level: 60,
    titleKey: 'planner.milestone.lv60.title',
    benefitKey: 'planner.milestone.lv60.benefit',
    category: 'equipment',
  },
  {
    id: 'ms_lv71_spec3',
    level: 71,
    titleKey: 'planner.milestone.lv71.title',
    benefitKey: 'planner.milestone.lv71.benefit',
    category: 'hero_points',
  },
  {
    id: 'ms_lv80_endgame',
    level: 80,
    titleKey: 'planner.milestone.lv80.title',
    benefitKey: 'planner.milestone.lv80.benefit',
    category: 'mastery',
  },
  {
    id: 'ms_lv80_mastery_legendary',
    level: 80,
    titleKey: 'planner.milestone.mastery.title',
    benefitKey: 'planner.milestone.mastery.benefit',
    category: 'mastery',
  },
];

export const CHARACTER_PROGRESSION_TASKS: readonly ProgressionTaskDefinition[] = [
  // Stage 1: Foundations (Lv 1–15)
  {
    id: 'task_starter_waypoints',
    stageId: 'stage_foundations',
    category: 'exploration',
    minLevel: 1,
    recommendedMaxLevel: 15,
    titleKey: 'planner.task.starterWaypoints.title',
    descKey: 'planner.task.starterWaypoints.desc',
    benefitKey: 'planner.task.starterWaypoints.benefit',
    effortMinutes: 15,
    prerequisiteTaskIds: [],
    milestoneId: 'ms_lv10_story',
    modeWeights: { fast: 92, balanced: 95, completionist: 98, goal: 85 },
    modeReasonKeys: {
      fast: 'planner.taskReason.fastExplorationXp',
      balanced: 'planner.taskReason.starterMobility',
      completionist: 'planner.taskReason.zoneCompletionStart',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_story_ch1',
    stageId: 'stage_foundations',
    category: 'story',
    minLevel: 10,
    recommendedMaxLevel: 19,
    titleKey: 'planner.task.storyCh1.title',
    descKey: 'planner.task.storyCh1.desc',
    benefitKey: 'planner.task.storyCh1.benefit',
    effortMinutes: 20,
    prerequisiteTaskIds: ['task_starter_waypoints'],
    milestoneId: 'ms_lv10_story',
    modeWeights: { fast: 98, balanced: 92, completionist: 88, goal: 90 },
    modeReasonKeys: {
      fast: 'planner.taskReason.storyBurstXp',
      balanced: 'planner.taskReason.storyAndGearReward',
      completionist: 'planner.taskReason.storyJournalProgress',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_utility_skills_lv11',
    stageId: 'stage_foundations',
    category: 'hero_points',
    minLevel: 11,
    recommendedMaxLevel: 25,
    titleKey: 'planner.task.utilityLv11.title',
    descKey: 'planner.task.utilityLv11.desc',
    benefitKey: 'planner.task.utilityLv11.benefit',
    effortMinutes: 12,
    prerequisiteTaskIds: ['task_starter_waypoints'],
    milestoneId: 'ms_lv11_utility',
    modeWeights: { fast: 88, balanced: 96, completionist: 94, goal: 92 },
    modeReasonKeys: {
      fast: 'planner.taskReason.combatSpeedUp',
      balanced: 'planner.taskReason.coreUtilityUnlock',
      completionist: 'planner.taskReason.heroChallengesMap',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_craft_novice',
    stageId: 'stage_foundations',
    category: 'crafting',
    minLevel: 1,
    recommendedMaxLevel: 30,
    autoVerifyAtCraftingRank: 75,
    titleKey: 'planner.task.craftNovice.title',
    descKey: 'planner.task.craftNovice.desc',
    benefitKey: 'planner.task.craftNovice.benefit',
    effortMinutes: 10,
    prerequisiteTaskIds: [],
    milestoneId: 'ms_lv21_spec1',
    modeWeights: { fast: 85, balanced: 84, completionist: 84, goal: 95 },
    modeReasonKeys: {
      fast: 'planner.taskReason.craftingFastXp',
      balanced: 'planner.taskReason.refineGatheredMats',
      completionist: 'planner.taskReason.disciplineUnlock',
      goal: 'planner.taskReason.craftingMilestoneGoal',
    },
  },

  // Stage 2: Core Systems (Lv 16–30)
  {
    id: 'task_spec_slot1_lv21',
    stageId: 'stage_core_unlocks',
    category: 'hero_points',
    minLevel: 21,
    recommendedMaxLevel: 40,
    titleKey: 'planner.task.specSlot1.title',
    descKey: 'planner.task.specSlot1.desc',
    benefitKey: 'planner.task.specSlot1.benefit',
    effortMinutes: 15,
    prerequisiteTaskIds: ['task_utility_skills_lv11'],
    milestoneId: 'ms_lv21_spec1',
    modeWeights: { fast: 90, balanced: 98, completionist: 92, goal: 94 },
    modeReasonKeys: {
      fast: 'planner.taskReason.majorDamageTrait',
      balanced: 'planner.taskReason.firstSpecializationLine',
      completionist: 'planner.taskReason.heroChallengesMap',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_story_ch2_ch3',
    stageId: 'stage_core_unlocks',
    category: 'story',
    minLevel: 20,
    recommendedMaxLevel: 39,
    titleKey: 'planner.task.storyCh2Ch3.title',
    descKey: 'planner.task.storyCh2Ch3.desc',
    benefitKey: 'planner.task.storyCh2Ch3.benefit',
    effortMinutes: 30,
    prerequisiteTaskIds: ['task_story_ch1'],
    milestoneId: 'ms_lv30_elite',
    modeWeights: { fast: 94, balanced: 90, completionist: 89, goal: 88 },
    modeReasonKeys: {
      fast: 'planner.taskReason.storyBurstXp',
      balanced: 'planner.taskReason.orderUnlockReward',
      completionist: 'planner.taskReason.storyJournalProgress',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_elite_skill_lv30',
    stageId: 'stage_core_unlocks',
    category: 'hero_points',
    minLevel: 30,
    recommendedMaxLevel: 50,
    titleKey: 'planner.task.eliteSkillLv30.title',
    descKey: 'planner.task.eliteSkillLv30.desc',
    benefitKey: 'planner.task.eliteSkillLv30.benefit',
    effortMinutes: 15,
    prerequisiteTaskIds: ['task_spec_slot1_lv21'],
    milestoneId: 'ms_lv30_elite',
    modeWeights: { fast: 89, balanced: 97, completionist: 91, goal: 93 },
    modeReasonKeys: {
      fast: 'planner.taskReason.combatSpeedUp',
      balanced: 'planner.taskReason.eliteSlotMilestone',
      completionist: 'planner.taskReason.heroChallengesMap',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },

  // Stage 3: Mid-Game & Specializations (Lv 31–60)
  {
    id: 'task_midgame_gear_refresh',
    stageId: 'stage_midgame',
    category: 'equipment',
    minLevel: 35,
    recommendedMaxLevel: 65,
    titleKey: 'planner.task.midgameGear.title',
    descKey: 'planner.task.midgameGear.desc',
    benefitKey: 'planner.task.midgameGear.benefit',
    effortMinutes: 10,
    prerequisiteTaskIds: [],
    milestoneId: 'ms_lv45_spec2',
    modeWeights: { fast: 86, balanced: 93, completionist: 80, goal: 85 },
    modeReasonKeys: {
      fast: 'planner.taskReason.combatSpeedUp',
      balanced: 'planner.taskReason.keepGearMatchedToLevel',
      completionist: 'planner.taskReason.keepGearMatchedToLevel',
      goal: 'planner.taskReason.keepGearMatchedToLevel',
    },
  },
  {
    id: 'task_spec_slot2_lv45',
    stageId: 'stage_midgame',
    category: 'hero_points',
    minLevel: 45,
    recommendedMaxLevel: 70,
    titleKey: 'planner.task.specSlot2.title',
    descKey: 'planner.task.specSlot2.desc',
    benefitKey: 'planner.task.specSlot2.benefit',
    effortMinutes: 20,
    prerequisiteTaskIds: ['task_elite_skill_lv30'],
    milestoneId: 'ms_lv45_spec2',
    modeWeights: { fast: 88, balanced: 96, completionist: 92, goal: 93 },
    modeReasonKeys: {
      fast: 'planner.taskReason.majorDamageTrait',
      balanced: 'planner.taskReason.secondSpecializationLine',
      completionist: 'planner.taskReason.heroChallengesMap',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_craft_adept_300',
    stageId: 'stage_midgame',
    category: 'crafting',
    minLevel: 30,
    recommendedMaxLevel: 79,
    autoVerifyAtCraftingRank: 300,
    titleKey: 'planner.task.craftAdept300.title',
    descKey: 'planner.task.craftAdept300.desc',
    benefitKey: 'planner.task.craftAdept300.benefit',
    effortMinutes: 15,
    prerequisiteTaskIds: ['task_craft_novice'],
    milestoneId: 'ms_lv60_pact',
    modeWeights: { fast: 95, balanced: 89, completionist: 90, goal: 96 },
    modeReasonKeys: {
      fast: 'planner.taskReason.craftingFastXp',
      balanced: 'planner.taskReason.refineGatheredMats',
      completionist: 'planner.taskReason.recipeCatalogProgress',
      goal: 'planner.taskReason.craftingMilestoneGoal',
    },
  },

  // Stage 4: Endgame Prep (Lv 61–79)
  {
    id: 'task_spec_slot3_lv71',
    stageId: 'stage_endgame_prep',
    category: 'hero_points',
    minLevel: 71,
    recommendedMaxLevel: 80,
    titleKey: 'planner.task.specSlot3.title',
    descKey: 'planner.task.specSlot3.desc',
    benefitKey: 'planner.task.specSlot3.benefit',
    effortMinutes: 20,
    prerequisiteTaskIds: ['task_spec_slot2_lv45'],
    milestoneId: 'ms_lv71_spec3',
    modeWeights: { fast: 90, balanced: 98, completionist: 95, goal: 95 },
    modeReasonKeys: {
      fast: 'planner.taskReason.majorDamageTrait',
      balanced: 'planner.taskReason.fullCoreBuildUnlock',
      completionist: 'planner.taskReason.heroChallengesMap',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },
  {
    id: 'task_orr_exploration_story',
    stageId: 'stage_endgame_prep',
    category: 'exploration',
    minLevel: 65,
    recommendedMaxLevel: 80,
    titleKey: 'planner.task.orrExploration.title',
    descKey: 'planner.task.orrExploration.desc',
    benefitKey: 'planner.task.orrExploration.benefit',
    effortMinutes: 35,
    prerequisiteTaskIds: ['task_story_ch2_ch3'],
    milestoneId: 'ms_lv80_endgame',
    modeWeights: { fast: 91, balanced: 92, completionist: 97, goal: 89 },
    modeReasonKeys: {
      fast: 'planner.taskReason.fastExplorationXp',
      balanced: 'planner.taskReason.endgameMapUnlock',
      completionist: 'planner.taskReason.worldCompletionProgress',
      goal: 'planner.taskReason.unlockNextMilestone',
    },
  },

  // Stage 5: Level 80 Mastery, Equipment & Expansion Progression
  {
    id: 'task_lv80_exotic_gear',
    stageId: 'stage_level80_mastery',
    category: 'equipment',
    minLevel: 80,
    recommendedMaxLevel: 80,
    autoVerifyEquippedSlots: 6,
    titleKey: 'planner.task.lv80ExoticGear.title',
    descKey: 'planner.task.lv80ExoticGear.desc',
    benefitKey: 'planner.task.lv80ExoticGear.benefit',
    effortMinutes: 20,
    prerequisiteTaskIds: [],
    milestoneId: 'ms_lv80_endgame',
    modeWeights: { fast: 96, balanced: 99, completionist: 90, goal: 95 },
    modeReasonKeys: {
      fast: 'planner.taskReason.lv80GearFoundation',
      balanced: 'planner.taskReason.lv80GearFoundation',
      completionist: 'planner.taskReason.lv80GearFoundation',
      goal: 'planner.taskReason.lv80GearFoundation',
    },
  },
  {
    id: 'task_craft_master_400_500',
    stageId: 'stage_level80_mastery',
    category: 'crafting',
    minLevel: 1,
    recommendedMaxLevel: 80,
    autoVerifyAtCraftingRank: 400,
    titleKey: 'planner.task.craftMaster400.title',
    descKey: 'planner.task.craftMaster400.desc',
    benefitKey: 'planner.task.craftMaster400.benefit',
    effortMinutes: 20,
    prerequisiteTaskIds: ['task_craft_adept_300'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 93, balanced: 92, completionist: 94, goal: 99 },
    modeReasonKeys: {
      fast: 'planner.taskReason.craftingFastXp',
      balanced: 'planner.taskReason.masterCraftingUnlock',
      completionist: 'planner.taskReason.recipeCatalogProgress',
      goal: 'planner.taskReason.legendaryCraftingPrereq',
    },
  },
  {
    id: 'task_daily_wizards_vault',
    stageId: 'stage_level80_mastery',
    category: 'mastery',
    minLevel: 80,
    recommendedMaxLevel: 80,
    autoVerifyDailyFlag: 'wizards_vault',
    titleKey: 'planner.task.wizardsVaultDaily.title',
    descKey: 'planner.task.wizardsVaultDaily.desc',
    benefitKey: 'planner.task.wizardsVaultDaily.benefit',
    effortMinutes: 15,
    prerequisiteTaskIds: [],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 94, balanced: 95, completionist: 91, goal: 97 },
    modeReasonKeys: {
      fast: 'planner.taskReason.dailyAcclaimEfficiency',
      balanced: 'planner.taskReason.dailyAcclaimEfficiency',
      completionist: 'planner.taskReason.dailyAcclaimEfficiency',
      goal: 'planner.taskReason.astralAcclaimMaterials',
    },
  },
  {
    id: 'task_world_completion_gift',
    stageId: 'stage_level80_mastery',
    category: 'exploration',
    minLevel: 80,
    recommendedMaxLevel: 80,
    titleKey: 'planner.task.worldCompletion.title',
    descKey: 'planner.task.worldCompletion.desc',
    benefitKey: 'planner.task.worldCompletion.benefit',
    effortMinutes: 45,
    prerequisiteTaskIds: ['task_orr_exploration_story'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 78, balanced: 86, completionist: 99, goal: 96 },
    modeReasonKeys: {
      fast: 'planner.taskReason.worldCompletionProgress',
      balanced: 'planner.taskReason.worldCompletionProgress',
      completionist: 'planner.taskReason.worldCompletionProgress',
      goal: 'planner.taskReason.giftOfExplorationGoal',
    },
  },
  {
    id: 'task_hot_elite_spec_mastery',
    stageId: 'stage_level80_mastery',
    category: 'hero_points',
    minLevel: 80,
    recommendedMaxLevel: 80,
    requiredExpansion: 'HeartOfThorns',
    titleKey: 'planner.task.hotEliteSpec.title',
    descKey: 'planner.task.hotEliteSpec.desc',
    benefitKey: 'planner.task.hotEliteSpec.benefit',
    effortMinutes: 30,
    prerequisiteTaskIds: ['task_lv80_exotic_gear'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 91, balanced: 94, completionist: 95, goal: 92 },
    modeReasonKeys: {
      fast: 'planner.taskReason.expansionHeroPointTrain',
      balanced: 'planner.taskReason.eliteSpecAndGliding',
      completionist: 'planner.taskReason.expansionMasteryCompletion',
      goal: 'planner.taskReason.eliteSpecAndGliding',
    },
  },
  {
    id: 'task_pof_mounts_elite_spec',
    stageId: 'stage_level80_mastery',
    category: 'mastery',
    minLevel: 80,
    recommendedMaxLevel: 80,
    requiredExpansion: 'PathOfFire',
    titleKey: 'planner.task.pofMounts.title',
    descKey: 'planner.task.pofMounts.desc',
    benefitKey: 'planner.task.pofMounts.benefit',
    effortMinutes: 25,
    prerequisiteTaskIds: ['task_lv80_exotic_gear'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 95, balanced: 96, completionist: 95, goal: 93 },
    modeReasonKeys: {
      fast: 'planner.taskReason.mountMobilityBoost',
      balanced: 'planner.taskReason.mountMobilityBoost',
      completionist: 'planner.taskReason.expansionMasteryCompletion',
      goal: 'planner.taskReason.mountMobilityBoost',
    },
  },
  {
    id: 'task_eod_jade_bot_mastery',
    stageId: 'stage_level80_mastery',
    category: 'mastery',
    minLevel: 80,
    recommendedMaxLevel: 80,
    requiredExpansion: 'EndOfDragons',
    titleKey: 'planner.task.eodJadeBot.title',
    descKey: 'planner.task.eodJadeBot.desc',
    benefitKey: 'planner.task.eodJadeBot.benefit',
    effortMinutes: 25,
    prerequisiteTaskIds: ['task_lv80_exotic_gear'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 87, balanced: 90, completionist: 93, goal: 94 },
    modeReasonKeys: {
      fast: 'planner.taskReason.jadeBotVitalityAndLoot',
      balanced: 'planner.taskReason.jadeBotVitalityAndLoot',
      completionist: 'planner.taskReason.expansionMasteryCompletion',
      goal: 'planner.taskReason.gen3LegendaryPrep',
    },
  },
  {
    id: 'task_soto_weaponmaster',
    stageId: 'stage_level80_mastery',
    category: 'mastery',
    minLevel: 80,
    recommendedMaxLevel: 80,
    requiredExpansion: 'SecretsOfTheObscure',
    titleKey: 'planner.task.sotoWeaponmaster.title',
    descKey: 'planner.task.sotoWeaponmaster.desc',
    benefitKey: 'planner.task.sotoWeaponmaster.benefit',
    effortMinutes: 25,
    prerequisiteTaskIds: ['task_lv80_exotic_gear'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 89, balanced: 91, completionist: 92, goal: 91 },
    modeReasonKeys: {
      fast: 'planner.taskReason.weaponmasterFlexibility',
      balanced: 'planner.taskReason.weaponmasterFlexibility',
      completionist: 'planner.taskReason.expansionMasteryCompletion',
      goal: 'planner.taskReason.weaponmasterFlexibility',
    },
  },
  {
    id: 'task_janthir_spear_homestead',
    stageId: 'stage_level80_mastery',
    category: 'mastery',
    minLevel: 80,
    recommendedMaxLevel: 80,
    requiredExpansion: 'JanthirWilds',
    titleKey: 'planner.task.janthirSpear.title',
    descKey: 'planner.task.janthirSpear.desc',
    benefitKey: 'planner.task.janthirSpear.benefit',
    effortMinutes: 25,
    prerequisiteTaskIds: ['task_lv80_exotic_gear'],
    milestoneId: 'ms_lv80_mastery_legendary',
    modeWeights: { fast: 88, balanced: 90, completionist: 92, goal: 92 },
    modeReasonKeys: {
      fast: 'planner.taskReason.landSpearAndHomestead',
      balanced: 'planner.taskReason.landSpearAndHomestead',
      completionist: 'planner.taskReason.expansionMasteryCompletion',
      goal: 'planner.taskReason.landSpearAndHomestead',
    },
  },
];

export const PROGRESSION_STAGE_META: Record<
  ProgressionStageId,
  { id: ProgressionStageId; labelKey: string; levelRangeLabel: string }
> = {
  stage_foundations: {
    id: 'stage_foundations',
    labelKey: 'planner.charStage.foundations',
    levelRangeLabel: 'Lv 1–15',
  },
  stage_core_unlocks: {
    id: 'stage_core_unlocks',
    labelKey: 'planner.charStage.coreUnlocks',
    levelRangeLabel: 'Lv 16–30',
  },
  stage_midgame: {
    id: 'stage_midgame',
    labelKey: 'planner.charStage.midgame',
    levelRangeLabel: 'Lv 31–60',
  },
  stage_endgame_prep: {
    id: 'stage_endgame_prep',
    labelKey: 'planner.charStage.endgamePrep',
    levelRangeLabel: 'Lv 61–79',
  },
  stage_level80_mastery: {
    id: 'stage_level80_mastery',
    labelKey: 'planner.charStage.level80Mastery',
    levelRangeLabel: 'Lv 80',
  },
};

const KNOWN_EXPANSION_FLAGS: ExpansionAccessFlag[] = [
  'HeartOfThorns',
  'PathOfFire',
  'EndOfDragons',
  'SecretsOfTheObscure',
  'JanthirWilds',
];

// Simple LRU/single-entry memoization cache for character progression plans
let cachedCharPlanKey: string | null = null;
let cachedCharPlanResult: CharacterProgressionPlan | null = null;

export function invalidateCharacterProgressionCache(): void {
  cachedCharPlanKey = null;
  cachedCharPlanResult = null;
}

/**
 * Evaluates and prioritizes character progression tasks for the selected character, level,
 * expansion access, and planning mode.
 */
export function buildCharacterProgressionPlan(input: CharacterProgressionInput): CharacterProgressionPlan {
  const cleanLevel = Math.max(1, Math.min(80, Math.round(input.characterLevel || 1)));
  const mode: PlannerMode = input.mode ?? 'balanced';
  const craftingRank = input.craftingRank ?? 0;
  const equippedSlots = input.equippedSlotCount ?? 0;
  const trackedLegendaries = input.trackedLegendaryCount ?? 0;

  const cacheKey = JSON.stringify({
    char: input.characterName ?? '__default__',
    lvl: cleanLevel,
    lvlVer: Boolean(input.isLevelApiVerified),
    prof: input.characterProfession ?? '',
    cRank: craftingRank,
    cVer: Boolean(input.isCraftingApiVerified),
    eq: equippedSlots,
    acc: input.accountAccess ? [...input.accountAccess].sort() : null,
    wv: Boolean(input.wizardsVaultDoneToday),
    wb: Boolean(input.worldBossDoneToday),
    leg: trackedLegendaries,
    mode,
    tms: input.targetMilestoneId ?? null,
    done: [...input.completedTaskIds].sort(),
    skip: [...input.skippedTaskIds].sort(),
    defer: [...input.deferredTaskIds].sort(),
  });

  if (cachedCharPlanKey === cacheKey && cachedCharPlanResult) {
    return cachedCharPlanResult;
  }

  const completedSet = new Set(input.completedTaskIds);
  const skippedSet = new Set(input.skippedTaskIds);
  const deferredSet = new Set(input.deferredTaskIds);
  const accessSet = input.accountAccess && input.accountAccess.length > 0 ? new Set(input.accountAccess) : null;

  const ownedExpansions = accessSet
    ? KNOWN_EXPANSION_FLAGS.filter((flag) => accessSet.has(flag))
    : [];

  const accessStatusSummary: CharacterProgressionPlan['accessStatusSummary'] = !accessSet
    ? 'unknown'
    : accessSet.has('PlayForFree') && ownedExpansions.length === 0
    ? 'free_to_play'
    : 'verified';

  // Determine current & next milestone
  const currentMilestone =
    [...CHARACTER_MILESTONES].reverse().find((m) => cleanLevel >= m.level) ?? CHARACTER_MILESTONES[0];

  const userTargetMilestone = input.targetMilestoneId
    ? CHARACTER_MILESTONES.find((m) => m.id === input.targetMilestoneId)
    : undefined;

  const nextMilestone =
    userTargetMilestone ??
    CHARACTER_MILESTONES.find((m) => m.level > cleanLevel) ??
    CHARACTER_MILESTONES[CHARACTER_MILESTONES.length - 1];

  // First pass: determine completion and verification status for each task
  const taskCompletionMap = new Map<string, { isDone: boolean; source: VerificationSource }>();

  for (const def of CHARACTER_PROGRESSION_TASKS) {
    let apiVerifiedDone = false;
    if (def.autoVerifyAtLevel !== undefined && input.isLevelApiVerified && cleanLevel >= def.autoVerifyAtLevel) {
      apiVerifiedDone = true;
    }
    if (def.autoVerifyAtCraftingRank !== undefined && input.isCraftingApiVerified && craftingRank >= def.autoVerifyAtCraftingRank) {
      apiVerifiedDone = true;
    }
    if (def.autoVerifyEquippedSlots !== undefined && input.isLevelApiVerified && cleanLevel >= 80 && equippedSlots >= def.autoVerifyEquippedSlots) {
      apiVerifiedDone = true;
    }
    if (def.autoVerifyDailyFlag === 'wizards_vault' && input.wizardsVaultDoneToday) {
      apiVerifiedDone = true;
    }
    if (def.autoVerifyDailyFlag === 'world_boss' && input.worldBossDoneToday) {
      apiVerifiedDone = true;
    }

    if (apiVerifiedDone) {
      taskCompletionMap.set(def.id, { isDone: true, source: 'api_verified' });
    } else if (completedSet.has(def.id)) {
      taskCompletionMap.set(def.id, { isDone: true, source: 'local_tracked' });
    } else {
      taskCompletionMap.set(def.id, { isDone: false, source: 'open' });
    }
  }

  // Second pass: evaluate prerequisites, expansion access, status, and transparent priority score
  const evaluatedTasks: EvaluatedProgressionTask[] = CHARACTER_PROGRESSION_TASKS.map((def) => {
    const comp = taskCompletionMap.get(def.id)!;
    let status: TaskOrStepStatus = 'open';
    if (comp.isDone) {
      status = 'completed';
    } else if (skippedSet.has(def.id)) {
      status = 'skipped';
    } else if (deferredSet.has(def.id)) {
      status = 'deferred';
    }

    // Check expansion access
    let accessStatus: AccessStatus = 'accessible';
    if (def.requiredExpansion) {
      if (!accessSet) {
        accessStatus = 'unknown_access';
      } else if (!accessSet.has(def.requiredExpansion)) {
        accessStatus = 'locked_expansion';
      }
    }

    // Check prerequisites
    const unmetPrerequisiteIds = def.prerequisiteTaskIds.filter(
      (prereqId) => !taskCompletionMap.get(prereqId)?.isDone,
    );
    const isBlockedByPrereqs = unmetPrerequisiteIds.length > 0;
    const isBlockedByLevel = cleanLevel < def.minLevel;
    const isAvailable =
      accessStatus !== 'locked_expansion' && !isBlockedByPrereqs && !isBlockedByLevel;

    const contributesToNextMilestone =
      def.milestoneId === nextMilestone.id ||
      def.milestoneId === currentMilestone.id ||
      (def.minLevel <= cleanLevel && def.recommendedMaxLevel >= cleanLevel && Boolean(def.milestoneId));

    // Calculate transparent priority score
    let score = def.modeWeights[mode] ?? 85;

    // Prerequisite unblocking check: does this task unblock a downstream task in the character's current level band?
    const unblocksActiveDownstream = CHARACTER_PROGRESSION_TASKS.some(
      (other) =>
        cleanLevel >= other.minLevel &&
        cleanLevel <= other.recommendedMaxLevel &&
        other.prerequisiteTaskIds.includes(def.id) &&
        !taskCompletionMap.get(other.id)?.isDone,
    );

    // 1. Level band relevance bonus (or active prerequisite blocker)
    if ((cleanLevel >= def.minLevel && cleanLevel <= def.recommendedMaxLevel) || unblocksActiveDownstream) {
      score += 18;
    } else if (cleanLevel > def.recommendedMaxLevel && def.minLevel < 80) {
      // Outleveled non-blocking starter task is still completable for unlocks/completionism, slightly lower urgency in fast mode
      score += mode === 'completionist' ? 10 : -8;
    }

    // 2. Milestone alignment bonus
    if (contributesToNextMilestone) {
      score += mode === 'goal' ? 22 : 12;
    }

    // 2b. Prerequisite unblocking bonus
    if (unblocksActiveDownstream) {
      score += 18;
    }

    // 3. Tracked Legendary goal synergy
    if (
      mode === 'goal' &&
      trackedLegendaries > 0 &&
      (def.id === 'task_craft_master_400_500' || def.id === 'task_world_completion_gift' || def.id === 'task_daily_wizards_vault')
    ) {
      score += 15;
    }

    // 4. Effort vs benefit efficiency adjustment
    if (mode === 'fast' && def.effortMinutes !== null && def.effortMinutes <= 15) {
      score += 8;
    }

    // 5. Deprioritize deferred tasks so active open tasks always come first
    if (status === 'deferred') {
      score -= 100;
    }

    // 6. Unavailable, blocked, completed, or skipped tasks cannot be recommended as next action
    if (!isAvailable || status === 'completed' || status === 'skipped') {
      score -= 1000;
    }

    const reasonKey =
      contributesToNextMilestone && mode === 'goal'
        ? 'planner.taskReason.unlockNextMilestone'
        : (def.modeReasonKeys[mode] ?? 'planner.taskReason.balancedDefault');

    return {
      definition: def,
      status,
      verificationSource: comp.source,
      accessStatus,
      isAvailable,
      isBlockedByPrereqs,
      isBlockedByLevel,
      unmetPrerequisiteIds,
      priorityScore: score,
      reasonKey,
      contributesToNextMilestone,
    };
  });

  // Identify #1 recommended next task among eligible tasks (available & not completed/skipped)
  const eligibleCandidates = evaluatedTasks
    .filter((t) => t.isAvailable && t.status !== 'completed' && t.status !== 'skipped')
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return a.definition.minLevel - b.definition.minLevel;
    });

  const recommendedNextTask = eligibleCandidates[0] ?? null;

  // Group into stages
  const stageOrder: ProgressionStageId[] = [
    'stage_foundations',
    'stage_core_unlocks',
    'stage_midgame',
    'stage_endgame_prep',
    'stage_level80_mastery',
  ];

  const stages: ProgressionStageGroup[] = stageOrder.map((sid) => {
    const meta = PROGRESSION_STAGE_META[sid];
    const stageTasks = evaluatedTasks.filter((t) => t.definition.stageId === sid);
    let completedCount = 0;
    let skippedCount = 0;
    let deferredCount = 0;
    let openCount = 0;
    for (const st of stageTasks) {
      if (st.status === 'completed') completedCount++;
      else if (st.status === 'skipped') skippedCount++;
      else if (st.status === 'deferred') deferredCount++;
      else openCount++;
    }
    return {
      id: sid,
      labelKey: meta.labelKey,
      levelRangeLabel: meta.levelRangeLabel,
      tasks: stageTasks,
      completedCount,
      skippedCount,
      deferredCount,
      openCount,
    };
  });

  let completed = 0;
  let apiVerified = 0;
  let localCompleted = 0;
  let skipped = 0;
  let deferred = 0;
  let remaining = 0;
  let blocked = 0;
  let unavailableExpansion = 0;

  for (const t of evaluatedTasks) {
    if (t.accessStatus === 'locked_expansion') {
      unavailableExpansion++;
      continue;
    }
    if (t.status === 'completed') {
      completed++;
      if (t.verificationSource === 'api_verified') apiVerified++;
      else localCompleted++;
    } else if (t.status === 'skipped') {
      skipped++;
    } else if (t.status === 'deferred') {
      deferred++;
      remaining++;
    } else {
      remaining++;
      if (t.isBlockedByPrereqs || t.isBlockedByLevel) {
        blocked++;
      }
    }
  }

  const result: CharacterProgressionPlan = {
    characterName: input.characterName,
    characterLevel: cleanLevel,
    isLevelApiVerified: Boolean(input.isLevelApiVerified),
    accessStatusSummary,
    ownedExpansions,
    currentMilestone,
    nextMilestone,
    milestones: [...CHARACTER_MILESTONES],
    recommendedNextTask,
    allTasks: evaluatedTasks,
    stages,
    counts: {
      total: evaluatedTasks.length - unavailableExpansion,
      completed,
      apiVerified,
      localCompleted,
      skipped,
      deferred,
      remaining,
      blocked,
      unavailableExpansion,
    },
  };

  cachedCharPlanKey = cacheKey;
  cachedCharPlanResult = result;
  return result;
}
