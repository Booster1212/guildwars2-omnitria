/**
 * Recursive resolution of crafting chains.
 *
 * Pure calculation (no UI, no network calls) -> testable with `node --test`.
 *
 * Rules:
 *  - Demand for identical materials is aggregated across ALL branches (BOM).
 *  - Inventory stock is consumed as a shared pool top-to-bottom (depth-first, recipe order)
 *    -> no material is counted as "owned" more than once.
 *  - RNG recipes (`recipe.yield < 1`) require more crafts on expected average.
 *  - Nodes marked as completed (`doneNodes`) no longer contribute to demand.
 *  - `buyItems`: Items the user chooses to buy rather than craft (node becomes leaf).
 */
import type { Recipe } from './types.ts';

export interface RecipeProvider {
  recipeFor(itemId: number): Recipe | undefined;
}

export interface TreeNode {
  /** Path key (item IDs from root, separated by ">"). Stable for "completed" flags. */
  key: string;
  itemId: number;
  depth: number;
  /** Gesamtbedarf an diesem Knoten (vor Bestandsabzug) */
  demand: number;
  /** Durch Bestand gedeckt */
  fromStock: number;
  /** Remaining after inventory stock */
  missing: number;
  /** Required crafts (expected value for RNG recipes) */
  crafts: number;
  recipe?: Recipe;
  /** Indicates whether a crafting recipe exists for this node (regardless of whether user toggled direct buy) */
  canCraft: boolean;
  children: TreeNode[];
  /** Vom Nutzer als erledigt markiert */
  done: boolean;
  /** Does not contribute to demand (completed or already covered by stock) */
  muted: boolean;
  cyclic: boolean;
  /** Nutzer will diesen Gegenstand kaufen statt herstellen */
  bought: boolean;
  random: boolean;
  /** 0..1 */
  progress: number;
}

export interface BomEntry {
  itemId: number;
  /** Gesamtbedarf ohne Bestand/Markierungen */
  total: number;
  /** Missing quantity after inventory stock / checkmarks */
  missing: number;
  /** Quantity or calculation originating from RNG recipes (estimate) */
  estimated: boolean;
}

export interface CraftEntry {
  recipe: Recipe;
  /** Number of crafts (expected value for RNG recipes) */
  count: number;
  random: boolean;
}

export interface TreeOptions {
  /** Owned inventory per item ID (null = unknown) */
  stock?: ReadonlyMap<number, number> | null;
  doneNodes?: ReadonlySet<string>;
  /** Leaf materials user has marked as fully owned */
  doneMaterials?: ReadonlySet<number>;
  buyItems?: ReadonlySet<number>;
  maxDepth?: number;
}

export interface TreeResult {
  root: TreeNode;
  bom: Map<number, BomEntry>;
  /** Crafts by recipe ID (net only, i.e. after inventory stock) */
  crafts: Map<string, CraftEntry>;
  /** Fortschritt des Wurzelknotens 0..1 */
  progress: number;
  /** Number of direct components (root children) and completed count */
  components: { total: number; complete: number };
  /** Contains RNG recipes -> quantities are estimates */
  hasRandom: boolean;
}

interface PassResult {
  root: TreeNode;
  total: Map<number, number>;
  estimated: Set<number>;
  crafts: Map<string, CraftEntry>;
}

const EPS = 1e-9;

function runPass(
  rootItemId: number,
  rootCount: number,
  provider: RecipeProvider,
  opts: {
    stock: ReadonlyMap<number, number> | null;
    doneNodes: ReadonlySet<string>;
    doneMaterials: ReadonlySet<number>;
    buyItems: ReadonlySet<number>;
    maxDepth: number;
  },
): PassResult {
  const pool = new Map<number, number>(opts.stock ?? []);
  const total = new Map<number, number>();
  const estimated = new Set<number>();
  const crafts = new Map<string, CraftEntry>();

  const visit = (
    itemId: number,
    demand: number,
    path: number[],
    parentMuted: boolean,
    depth: number,
  ): TreeNode => {
    const key = path.length ? `${path.join('>')}>${itemId}` : String(itemId);
    const done = opts.doneNodes.has(key);
    const muted = parentMuted || done;
    const cyclic = path.includes(itemId);
    const bought = depth > 0 && opts.buyItems.has(itemId);
    const rawRecipe = provider.recipeFor(itemId);
    const canCraft = Boolean(rawRecipe && !cyclic);
    const recipe = cyclic || bought || depth >= opts.maxDepth ? undefined : rawRecipe;

    // Bestand ermitteln
    let fromStock = 0;
    if (!muted && opts.stock) {
      if (recipe) {
        // Zwischenprodukte verbrauchen den Pool sequenziell, um Unterbedarf korrekt zu reduzieren
        const avail = pool.get(itemId) ?? 0;
        fromStock = Math.min(demand, avail);
        if (fromStock > 0) pool.set(itemId, avail - fromStock);
      } else {
        // Leaf materials: each node shows actual account inventory for this step
        const totalStock = opts.stock.get(itemId) ?? 0;
        fromStock = Math.min(demand, totalStock);
      }
    }

    let missing = muted ? 0 : Math.max(0, demand - fromStock);
    if (!recipe && !muted && opts.doneMaterials.has(itemId)) {
      // Leaf was manually marked as "complete"
      fromStock = demand;
      missing = 0;
    }

    const node: TreeNode = {
      key,
      itemId,
      depth,
      demand,
      fromStock,
      missing,
      crafts: 0,
      recipe,
      canCraft,
      children: [],
      done,
      muted,
      cyclic,
      bought,
      random: Boolean(recipe && recipe.yield !== undefined && recipe.yield < 1),
      progress: 1,
    };

    if (recipe) {
      const perCraft = recipe.outputCount * (recipe.yield ?? 1);
      const demandCrafts = Math.ceil(demand / perCraft - EPS);
      const neededCrafts = muted ? 0 : Math.ceil(missing / perCraft - EPS);
      node.crafts = neededCrafts;
      const childMuted = muted || neededCrafts === 0;
      const mult = neededCrafts > 0 ? neededCrafts : demandCrafts;
      if (neededCrafts > 0) {
        const prev = crafts.get(recipe.id);
        crafts.set(recipe.id, {
          recipe,
          count: (prev?.count ?? 0) + neededCrafts,
          random: node.random,
        });
      }
      node.children = recipe.ingredients.map((ing) =>
        visit(ing.itemId, ing.count * mult, [...path, itemId], childMuted, depth + 1),
      );
      if (node.random && !muted) {
        // All descendant quantities are estimates
        const mark = (n: TreeNode) => {
          estimated.add(n.itemId);
          n.children.forEach(mark);
        };
        node.children.forEach(mark);
      }
    } else if (!muted) {
      total.set(itemId, (total.get(itemId) ?? 0) + demand);
    }
    return node;
  };

  const root = visit(rootItemId, rootCount, [], false, 0);
  return { root, total, estimated, crafts };
}

function computeProgress(node: TreeNode): number {
  node.children.forEach(computeProgress);
  if (node.muted) {
    node.progress = 1;
    return node.progress;
  }
  if (node.demand <= 0) {
    node.progress = 1;
    return node.progress;
  }
  const f = Math.min(1, node.fromStock / node.demand);
  if (!node.recipe) {
    node.progress = f;
    return f;
  }
  const childAvg = node.children.length
    ? node.children.reduce((s, c) => s + c.progress, 0) / node.children.length
    : 1;
  node.progress = f + (1 - f) * childAvg;
  return node.progress;
}

export function buildTree(
  rootItemId: number,
  rootCount: number,
  provider: RecipeProvider,
  options: TreeOptions = {},
): TreeResult {
  const common = {
    doneMaterials: options.doneMaterials ?? new Set<number>(),
    buyItems: options.buyItems ?? new Set<number>(),
    maxDepth: options.maxDepth ?? 14,
  };
  // Pass 1: Gesamtbedarf (ohne Bestand, ohne Markierungen)
  const gross = runPass(rootItemId, rootCount, provider, {
    stock: null,
    doneNodes: new Set<string>(),
    doneMaterials: new Set<number>(),
    buyItems: common.buyItems,
    maxDepth: common.maxDepth,
  });
  // Pass 2: Net (with inventory stock and completed steps)
  const net = runPass(rootItemId, rootCount, provider, {
    stock: options.stock ?? null,
    doneNodes: options.doneNodes ?? new Set<string>(),
    ...common,
  });

  computeProgress(net.root);

  const bom = new Map<number, BomEntry>();
  for (const [itemId, totalQty] of gross.total) {
    const activeDemand = net.total.get(itemId) ?? 0;
    const stockQty = options.stock?.get(itemId) ?? 0;
    const isDoneMat = options.doneMaterials?.has(itemId);
    const missing = isDoneMat || activeDemand === 0 ? 0 : Math.max(0, activeDemand - stockQty);
    bom.set(itemId, {
      itemId,
      total: totalQty,
      missing,
      estimated: gross.estimated.has(itemId),
    });
  }
  // Material appearing only in net pass (cannot occur, but kept for robustness)
  for (const [itemId, qty] of net.total) {
    if (!bom.has(itemId)) {
      const stockQty = options.stock?.get(itemId) ?? 0;
      const isDoneMat = options.doneMaterials?.has(itemId);
      const missing = isDoneMat || qty === 0 ? 0 : Math.max(0, qty - stockQty);
      bom.set(itemId, { itemId, total: qty, missing, estimated: net.estimated.has(itemId) });
    }
  }

  const comps = net.root.children;
  const complete = comps.filter((c) => c.progress >= 1 - EPS).length;
  const hasRandom = [...gross.crafts.values()].some((c) => c.random);

  return {
    root: net.root,
    bom,
    crafts: net.crafts,
    progress: net.root.progress,
    components: { total: comps.length, complete },
    hasRandom,
  };
}

/** All nodes flattened (depth-first search) – for search/statistics */
export function flattenTree(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}
