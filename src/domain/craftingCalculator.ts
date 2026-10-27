/**
 * Recursive material requirement calculation for GW2 Crafting Planner.
 *
 * Pure domain logic (no UI, no network calls) -> fully testable with `node --test`.
 *
 * Core capabilities:
 *  - Recursive resolution of recipe trees down to base materials
 *  - Accurate accounting of recipe output quantities (rounding up / Math.ceil)
 *  - Multi-level aggregation of identical materials across all branches and steps
 *  - Distinction between:
 *      * Gross demand (theoretical total)
 *      * Inventory stock
 *      * Stock used / allocated
 *      * Net demand / missing after stock deduction
 *      * Required craft runs
 *      * Additional ingredients for these craft runs
 *      * Materials remaining to be procured
 *  - Strategy selection: 'all_craft' (self-craft), 'all_buy' (buy completed), 'custom' (combined)
 *  - Cycle detection preventing infinite recursion
 *  - Robust handling of missing or invalid recipe data
 */

import type { PriceInfo, Recipe } from './types.ts';
import { unitPrice } from './costs.ts';
import { resolveSources, type SourceInfo } from './sources.ts';

export type CraftingStrategy = 'all_craft' | 'all_buy' | 'custom';
export type ItemProcurement = 'craft' | 'buy';

export interface CraftingRecipeProvider {
  recipeFor(itemId: number): Recipe | undefined;
}

export interface TargetCraftItem {
  itemId: number;
  count: number;
  recipe?: Recipe;
  stepKey?: string;
  label?: string;
  needsDiscovery?: boolean;
}

export interface CraftingCalculatorOptions {
  strategy?: CraftingStrategy;
  itemOverrides?: ReadonlyMap<number, ItemProcurement> | ReadonlySet<number>;
  stock?: ReadonlyMap<number, number> | null;
  prices?: ReadonlyMap<number, PriceInfo>;
  maxDepth?: number;
  allowDiscovery?: boolean;
  knownRecipeIds?: ReadonlySet<number> | null;
}

export type NodeAction =
  | 'craft'
  | 'buy'
  | 'gather'
  | 'vendor'
  | 'drop'
  | 'salvage'
  | 'forge'
  | 'unlock'
  | 'unknown';

export interface CraftingTreeNode {
  id: string;
  itemId: number;
  depth: number;
  grossDemand: number;
  fromStock: number;
  netDemand: number;
  craftRuns: number;
  outputPerCraft: number;
  recipe?: Recipe;
  children: CraftingTreeNode[];
  action: NodeAction;
  isCraftable: boolean;
  cyclic: boolean;
  missingRecipe: boolean;
  unitPrice: number | null;
  lineCost: number | null;
  needsDiscovery: boolean;
}

export interface AggregatedMaterial {
  itemId: number;
  grossDemand: number;
  stock: number;
  stockUsed: number;
  netDemand: number;
  craftRuns: number;
  role: 'end_product' | 'intermediate' | 'base_material';
  action: NodeAction;
  isCraftable: boolean;
  unitPrice: number | null;
  totalCost: number | null;
  sourceInfo?: SourceInfo;
  needsDiscovery: boolean;
  requiredForDiscovery: boolean;
}

export interface CraftingCalculationResult {
  trees: CraftingTreeNode[];
  materials: AggregatedMaterial[];
  totals: {
    totalGrossItems: number;
    totalNetItems: number;
    totalCraftRuns: number;
    totalCost: number;
    unpricedCount: number;
    totalDiscoveryCount: number;
  };
  strategy: CraftingStrategy;
  hasCycles: boolean;
  hasMissingRecipes: boolean;
}

const EPS = 1e-9;

/**
 * Checks whether a recipe must be researched via the crafting discovery window.
 * Discovery recipes have neither AutoLearned nor LearnedFromItem flags and are not yet known to the account.
 */
export function isRecipeDiscovery(
  recipe?: Recipe,
  knownRecipeIds?: ReadonlySet<number> | null,
): boolean {
  if (!recipe) return false;
  if (recipe.flags?.includes('AutoLearned')) return false;
  if (recipe.flags?.includes('LearnedFromItem')) return false;
  if (
    knownRecipeIds !== null &&
    knownRecipeIds !== undefined &&
    knownRecipeIds.has(Number(recipe.id))
  ) {
    return false;
  }
  return true;
}

/**
 * Creates a provider for recipes of a specific crafting discipline.
 */
export function createDisciplineRecipeProvider(
  recipesByOutput: ReadonlyMap<number, readonly Recipe[]>,
  discipline?: string,
  options: {
    allowDiscovery?: boolean;
    knownRecipeIds?: ReadonlySet<number> | null;
    maxRating?: number;
  } = {},
): CraftingRecipeProvider {
  const isLearned = (r: Recipe): boolean =>
    Boolean(r.flags?.includes('AutoLearned')) ||
    (options.knownRecipeIds !== null &&
      options.knownRecipeIds !== undefined &&
      options.knownRecipeIds.has(Number(r.id)));

  const isDiscovery = (r: Recipe): boolean =>
    !r.flags?.includes('AutoLearned') && !r.flags?.includes('LearnedFromItem');

  const isUsable = (r: Recipe): boolean =>
    isLearned(r) || (Boolean(options.allowDiscovery) && isDiscovery(r));

  return {
    recipeFor(itemId: number): Recipe | undefined {
      const candidates = recipesByOutput.get(itemId);
      if (!candidates || candidates.length === 0) return undefined;

      if (!discipline) {
        return candidates[0];
      }

      // Filter recipes for this discipline
      const filtered = candidates.filter((r) => {
        if (!r.disciplines.includes(discipline)) return false;
        if (options.maxRating !== undefined && r.rating > options.maxRating) return false;
        return isUsable(r);
      });

      if (filtered.length === 0) {
        return undefined;
      }

      // Prefer auto-learned recipes and lower ranks
      return [...filtered].sort((a, b) => {
        const aAuto = a.flags?.includes('AutoLearned') ? 0 : 1;
        const bAuto = b.flags?.includes('AutoLearned') ? 0 : 1;
        if (aAuto !== bAuto) return aAuto - bAuto;
        return a.rating - b.rating;
      })[0];
    },
  };
}

/**
 * Checks based on strategy and user preferences whether an intermediate component should be self-crafted.
 */
function shouldCraftIntermediate(
  itemId: number,
  strategy: CraftingStrategy,
  itemOverrides?: ReadonlyMap<number, ItemProcurement> | ReadonlySet<number>,
): boolean {
  if (itemOverrides) {
    if (itemOverrides instanceof Set) {
      if (itemOverrides.has(itemId)) return false; // In Buy-Set -> Kaufen
    } else {
      const override = (itemOverrides as ReadonlyMap<number, ItemProcurement>).get(itemId);
      if (override === 'buy') return false;
      if (override === 'craft') return true;
    }
  }

  if (strategy === 'all_buy') return false;
  // 'all_craft' and default for 'custom': self-craft
  return true;
}

/**
 * Determines procurement action for a leaf node (non-crafting or buy).
 */
function determineLeafAction(itemId: number, price?: PriceInfo): NodeAction {
  const sources = resolveSources({ item: undefined, tags: [], price });
  if (sources.length > 0) {
    const k = sources[0].kind;
    if (k === 'trade') return 'buy';
    if (k === 'vendor') return 'vendor';
    if (k === 'gather') return 'gather';
    if (k === 'drop') return 'drop';
    if (k === 'salvage') return 'salvage';
    if (k === 'forge') return 'forge';
    if (k === 'unlock') return 'unlock';
  }
  return price && (price.sell > 0 || price.buy > 0) ? 'buy' : 'unknown';
}

/**
 * Main calculation: recursively resolves target items (e.g. steps in a leveling route).
 */
export function calculateCraftingPlan(
  targets: readonly TargetCraftItem[],
  provider: CraftingRecipeProvider,
  options: CraftingCalculatorOptions = {},
): CraftingCalculationResult {
  const strategy = options.strategy ?? 'all_craft';
  const maxDepth = options.maxDepth ?? 15;
  const prices = options.prices ?? new Map<number, PriceInfo>();

  let hasCycles = false;
  let hasMissingRecipes = false;

  const recipesUsed = new Map<number, Recipe>();
  const targetNeedsDiscoveryMap = new Map<number, boolean>();
  const targetGrossDemand = new Map<number, number>();

  targets.forEach((t) => {
    if (t.recipe) recipesUsed.set(t.itemId, t.recipe);
    if (t.needsDiscovery !== undefined) {
      targetNeedsDiscoveryMap.set(t.itemId, t.needsDiscovery);
    }
    targetGrossDemand.set(t.itemId, (targetGrossDemand.get(t.itemId) ?? 0) + t.count);
  });

  const discoveryItemIds = new Set<number>();
  const discoveryIngredientIds = new Set<number>();

  // =========================================================================
  // Pass 1: Theoretischer Gesamtbedarf (Gross) ohne Bestand / Markierungen
  // =========================================================================
  interface GrossNodeInfo {
    itemId: number;
    demand: number;
    craftRuns: number;
    recipe?: Recipe;
    isCraftable: boolean;
    cyclic: boolean;
    children: GrossNodeInfo[];
  }

  const grossTotals = new Map<number, number>();
  const grossCraftRuns = new Map<number, number>(); // itemId -> craft runs

  function visitGross(
    itemId: number,
    demand: number,
    path: number[],
    depth: number,
    presetRecipe?: Recipe,
    presetDiscovery?: boolean,
  ): GrossNodeInfo {
    const cyclic = path.includes(itemId);
    if (cyclic) hasCycles = true;

    const recipe = cyclic || depth >= maxDepth ? undefined : (presetRecipe ?? provider.recipeFor(itemId));
    if (recipe) recipesUsed.set(itemId, recipe);
    const isCraftable = Boolean(recipe && recipe.ingredients && recipe.ingredients.length > 0 && recipe.outputCount > 0);
    const doCraft = depth === 0 ? isCraftable : isCraftable && shouldCraftIntermediate(itemId, strategy, options.itemOverrides);

    const isDisc = doCraft && recipe
      ? (presetDiscovery ?? (targetNeedsDiscoveryMap.get(itemId) ?? isRecipeDiscovery(recipe, options.knownRecipeIds)))
      : false;

    if (isDisc && recipe) {
      discoveryItemIds.add(itemId);
      for (const ing of recipe.ingredients) {
        discoveryIngredientIds.add(ing.itemId);
      }
    }

    let craftRuns = 0;
    const children: GrossNodeInfo[] = [];

    if (doCraft && recipe) {
      const outputCount = Math.max(1, recipe.outputCount);
      craftRuns = Math.ceil(demand / outputCount - EPS);
      grossCraftRuns.set(itemId, (grossCraftRuns.get(itemId) ?? 0) + craftRuns);

      for (const ing of recipe.ingredients) {
        const childDemand = ing.count * craftRuns;
        children.push(visitGross(ing.itemId, childDemand, [...path, itemId], depth + 1));
      }
    } else {
      if (!isCraftable && depth > 0 && provider.recipeFor(itemId) === undefined) {
        hasMissingRecipes = true;
      }
      grossTotals.set(itemId, (grossTotals.get(itemId) ?? 0) + demand);
    }

    return { itemId, demand, craftRuns, recipe, isCraftable, cyclic, children };
  }

  // Run pass 1 for all target items
  targets.forEach((t) => {
    if (t.count > 0) {
      visitGross(t.itemId, t.count, [], 0, t.recipe, t.needsDiscovery);
    }
  });

  // =========================================================================
  // Pass 2: Net demand with inventory accounting and surplus reuse
  // =========================================================================
  const inventoryPool = new Map<number, number>(options.stock ?? []);
  const netMissingTotals = new Map<number, number>();
  const netCraftRuns = new Map<number, number>();
  const stockUsedPerItem = new Map<number, number>();

  function visitNet(
    itemId: number,
    demand: number,
    path: number[],
    depth: number,
    stepKey: string,
    presetRecipe?: Recipe,
    presetDiscovery?: boolean,
  ): CraftingTreeNode {
    const key = `${stepKey}:${path.length ? path.join('>') + '>' : ''}${itemId}`;
    const cyclic = path.includes(itemId);
    const recipe = cyclic || depth >= maxDepth ? undefined : (presetRecipe ?? provider.recipeFor(itemId));
    if (recipe) recipesUsed.set(itemId, recipe);
    const isCraftable = Boolean(recipe && recipe.ingredients && recipe.ingredients.length > 0 && recipe.outputCount > 0);
    const doCraft = depth === 0 ? isCraftable : isCraftable && shouldCraftIntermediate(itemId, strategy, options.itemOverrides);

    const isDisc = doCraft && recipe
      ? (presetDiscovery ?? (targetNeedsDiscoveryMap.get(itemId) ?? isRecipeDiscovery(recipe, options.knownRecipeIds)))
      : false;

    if (isDisc && recipe) {
      discoveryItemIds.add(itemId);
      for (const ing of recipe.ingredients) {
        discoveryIngredientIds.add(ing.itemId);
      }
    }

    // Bestand verbrauchen
    let fromStock = 0;
    if (options.stock) {
      const avail = inventoryPool.get(itemId) ?? 0;
      fromStock = Math.min(demand, avail);
      if (fromStock > 0) {
        inventoryPool.set(itemId, avail - fromStock);
        stockUsedPerItem.set(itemId, (stockUsedPerItem.get(itemId) ?? 0) + fromStock);
      }
    }

    const netDemand = Math.max(0, demand - fromStock);
    let craftRuns = 0;
    const children: CraftingTreeNode[] = [];
    let action: NodeAction = 'unknown';

    const p = prices.get(itemId);
    const up = unitPrice(p, itemId);

    if (doCraft && recipe) {
      action = 'craft';
      const outputCount = Math.max(1, recipe.outputCount);
      if (netDemand > 0) {
        craftRuns = Math.ceil(netDemand / outputCount - EPS);
        netCraftRuns.set(itemId, (netCraftRuns.get(itemId) ?? 0) + craftRuns);

        // Return surplus from rounding up back to the pool for subsequent branches/steps
        const produced = craftRuns * outputCount;
        const surplus = produced - netDemand;
        if (surplus > 0) {
          inventoryPool.set(itemId, (inventoryPool.get(itemId) ?? 0) + surplus);
        }

        // Calculate ingredients for these crafting runs
        for (const ing of recipe.ingredients) {
          const childDemand = ing.count * craftRuns;
          children.push(visitNet(ing.itemId, childDemand, [...path, itemId], depth + 1, stepKey));
        }
      }
    } else {
      // Non-craftable or user chose to buy intermediate component
      action = depth > 0 && isCraftable && !doCraft ? 'buy' : determineLeafAction(itemId, p);
      if (netDemand > 0) {
        netMissingTotals.set(itemId, (netMissingTotals.get(itemId) ?? 0) + netDemand);
      }
    }

    const lineCost = (action === 'buy' || (!isCraftable && depth > 0)) && up !== null ? up * netDemand : null;

    return {
      id: key,
      itemId,
      depth,
      grossDemand: demand,
      fromStock,
      netDemand,
      craftRuns,
      outputPerCraft: recipe?.outputCount ?? 1,
      recipe,
      children,
      action,
      isCraftable,
      cyclic,
      missingRecipe: !isCraftable && depth > 0 && provider.recipeFor(itemId) === undefined,
      unitPrice: up,
      lineCost,
      needsDiscovery: isDisc,
    };
  }

  const trees: CraftingTreeNode[] = targets.map((t, idx) => {
    const sKey = t.stepKey ?? `step-${idx}`;
    return visitNet(t.itemId, t.count, [], 0, sKey, t.recipe, t.needsDiscovery);
  });

  // =========================================================================
  // Aggregation aller Materialien
  // =========================================================================
  const allItemIds = new Set<number>();
  for (const [id] of grossTotals) allItemIds.add(id);
  for (const [id] of netMissingTotals) allItemIds.add(id);
  for (const [id] of grossCraftRuns) allItemIds.add(id);
  for (const [id] of netCraftRuns) allItemIds.add(id);
  targets.forEach((t) => allItemIds.add(t.itemId));

  const targetIdSet = new Set(targets.map((t) => t.itemId));

  const materials: AggregatedMaterial[] = [];
  let totalCost = 0;
  let unpricedCount = 0;
  let totalCraftRuns = 0;
  let totalGrossItems = 0;
  let totalNetItems = 0;

  for (const itemId of allItemIds) {
    const p = prices.get(itemId);
    const up = unitPrice(p, itemId);
    const stockQty = options.stock?.get(itemId) ?? 0;
    const stockUsed = stockUsedPerItem.get(itemId) ?? 0;

    const r = recipesUsed.get(itemId) ?? provider.recipeFor(itemId);
    const isCraftable = Boolean(r && r.ingredients && r.ingredients.length > 0 && r.outputCount > 0);
    const doCraft = shouldCraftIntermediate(itemId, strategy, options.itemOverrides);

    const isRoot = targetIdSet.has(itemId);
    let role: 'end_product' | 'intermediate' | 'base_material' = 'base_material';
    let action: NodeAction = 'unknown';

    if (isRoot) {
      role = 'end_product';
      action = 'craft';
    } else if (isCraftable && doCraft) {
      role = 'intermediate';
      action = 'craft';
    } else {
      role = 'base_material';
      action = isCraftable && !doCraft ? 'buy' : determineLeafAction(itemId, p);
    }

    const cRuns = netCraftRuns.get(itemId) ?? 0;
    const gRuns = grossCraftRuns.get(itemId) ?? 0;
    const grossDemand = isRoot && targetGrossDemand.has(itemId)
      ? targetGrossDemand.get(itemId)!
      : (action === 'craft' && r?.outputCount
          ? gRuns * r.outputCount
          : (grossTotals.get(itemId) ?? 0));
    const netDemand = action === 'craft' && r?.outputCount
      ? cRuns * r.outputCount
      : (netMissingTotals.get(itemId) ?? Math.max(0, grossDemand - stockUsed));

    let lineCost: number | null = null;
    if (action === 'buy' || role === 'base_material') {
      if (netDemand > 0) {
        if (up !== null) {
          lineCost = up * netDemand;
          totalCost += lineCost;
        } else {
          unpricedCount++;
        }
      }
    }

    totalCraftRuns += cRuns;
    totalGrossItems += grossDemand;
    totalNetItems += netDemand;

    const sources = resolveSources({ item: undefined, tags: [], price: p, recipe: r });
    const sourceInfo = sources[0];

    const needsDiscovery =
      discoveryItemIds.has(itemId) ||
      Boolean(action === 'craft' && isRecipeDiscovery(r, options.knownRecipeIds));
    const requiredForDiscovery = discoveryIngredientIds.has(itemId);

    materials.push({
      itemId,
      grossDemand,
      stock: stockQty,
      stockUsed,
      netDemand,
      craftRuns: cRuns,
      role,
      action,
      isCraftable,
      unitPrice: up,
      totalCost: lineCost,
      sourceInfo,
      needsDiscovery,
      requiredForDiscovery,
    });
  }

  // Sortierung: Endprodukte zuerst, dann Zwischenprodukte, dann Grundmaterialien; jeweils alphabetisch / ID
  const roleOrder: Record<string, number> = {
    end_product: 1,
    intermediate: 2,
    base_material: 3,
  };
  materials.sort((a, b) => {
    const diff = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
    if (diff !== 0) return diff;
    return b.grossDemand - a.grossDemand;
  });

  return {
    trees,
    materials,
    totals: {
      totalGrossItems,
      totalNetItems,
      totalCraftRuns,
      totalCost,
      unpricedCount,
      totalDiscoveryCount: discoveryItemIds.size,
    },
    strategy,
    hasCycles,
    hasMissingRecipes,
  };
}

/**
 * Collects all item IDs present in the plan (for preloading names & prices).
 */
export function collectPlanItemIds(result: CraftingCalculationResult): number[] {
  const ids = new Set<number>();
  for (const m of result.materials) ids.add(m.itemId);
  const walk = (node: CraftingTreeNode) => {
    ids.add(node.itemId);
    node.children.forEach(walk);
  };
  result.trees.forEach(walk);
  return Array.from(ids);
}

/**
 * Flattens the tree into a list (for counts or depth-first search).
 */
export function flattenCraftingTree(nodes: readonly CraftingTreeNode[]): CraftingTreeNode[] {
  const out: CraftingTreeNode[] = [];
  const walk = (n: CraftingTreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}
