/**
 * Level planner for crafting disciplines.
 *
 * Inputs originate exclusively from the official API (recipes, prices) and optionally from account
 * (known recipes). The crafted quantity per rank is an ESTIMATE (see craftingXp.ts).
 *
 * Approach:
 *  1. For each rank N in the target range, select among eligible recipes the one with
 *     lowest material cost per rank gained (with hysteresis against flickering).
 *  2. Consecutive ranks with the same recipe are consolidated into a single step.
 *  3. Ingredients are – if allowed and cheaper – resolved via intermediate components
 *     (own recipes in the same discipline), otherwise bought.
 *  4. Ranks without an eligible recipe are reported as a GAP (rather than fabricated).
 */
import type { PriceInfo, Recipe } from './types.ts';
import { categoryOf, ranksPerCraft } from './craftingXp.ts';
import type { XpCategory } from './craftingXp.ts';
import { unitPrice } from './costs.ts';

export interface PlannerOptions {
  /** Allow discovery recipes (without AutoLearned/LearnedFromItem flags) */
  allowDiscovery: boolean;
  /** Self-craft intermediate components if cheaper than buying */
  craftIntermediates: boolean;
  /** Recipes known to account (API: /v2/account/recipes), if available */
  knownRecipeIds?: ReadonlySet<number> | null;
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

interface Acq {
  unit: number | null;
  via: 'buy' | 'craft' | 'unknown';
  recipe?: Recipe;
}

const HYSTERESIS = 1.15;
const CRAFT_PREFERENCE = 0.98;

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

  const isLearned = (r: Recipe): boolean =>
    Boolean(r.flags?.includes('AutoLearned')) || (known !== null && known.has(Number(r.id)));
  const isDiscovery = (r: Recipe): boolean =>
    !r.flags?.includes('AutoLearned') && !r.flags?.includes('LearnedFromItem');
  const isUsable = (r: Recipe): boolean =>
    isLearned(r) || (options.allowDiscovery && isDiscovery(r));

  // Candidates for leveling steps
  const candidates: { recipe: Recipe; category: XpCategory }[] = [];
  for (const r of recipes) {
    if (!r.disciplines.includes(discipline)) continue;
    const category = categoryOf(r.type);
    if (!category || !isUsable(r)) continue;
    candidates.push({ recipe: r, category });
  }
  candidates.sort((a, b) => a.recipe.rating - b.recipe.rating);

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
        if (!r.disciplines.includes(discipline) || r.rating > rank || !isUsable(r)) continue;
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
    for (const ing of c.recipe.ingredients) {
      const a = acq(ing.itemId, rank, 0, new Set());
      if (a.unit === null) {
        unknown++;
        cost += 50;
      } else {
        cost += a.unit * ing.count;
      }
    }
    // Efficient Leveling: Recipes crafted more than 25 ranks above unlock
    // lose experience rapidly in GW2 (yellow/green recipes). Age penalty encourages new tier recipes:
    const age = rank - c.recipe.rating;
    const agePenalty = age > 25 ? 1 + (age - 25) * 0.2 : 1;
    return { recipe: c.recipe, category: c.category, costPerRank: (cost * agePenalty) / rpc, unknown };
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
      needsDiscovery: !isLearned(rs.recipe),
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
