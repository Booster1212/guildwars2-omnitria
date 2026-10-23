/**
 * Rekursive Auflösung von Herstellungsketten.
 *
 * Reine Berechnung (keine UI, keine Netzwerkzugriffe) -> testbar mit `node --test`.
 *
 * Regeln:
 *  - Bedarf gleicher Materialien wird über ALLE Äste hinweg aggregiert (BOM).
 *  - Vorhandener Bestand wird als gemeinsamer Pool von oben nach unten (Tiefensuche, Rezeptreihenfolge)
 *    verbraucht -> kein Material wird doppelt als "vorhanden" gezählt.
 *  - Zufallsrezepte (`recipe.yield < 1`) benötigen im Erwartungswert mehr Herstellungen.
 *  - Als erledigt markierte Knoten (`doneNodes`) tragen nichts mehr zum Bedarf bei.
 *  - `buyItems`: Gegenstände, die der Nutzer kaufen statt herstellen will (Knoten wird zum Blatt).
 */
import type { Recipe } from './types.ts';

export interface RecipeProvider {
  recipeFor(itemId: number): Recipe | undefined;
}

export interface TreeNode {
  /** Pfadschlüssel (Artikel-IDs von der Wurzel, mit ">" getrennt). Stabil für "erledigt"-Markierungen. */
  key: string;
  itemId: number;
  depth: number;
  /** Gesamtbedarf an diesem Knoten (vor Bestandsabzug) */
  demand: number;
  /** Durch Bestand gedeckt */
  fromStock: number;
  /** Nach Bestand noch offen */
  missing: number;
  /** Benötigte Herstellungen (Erwartungswert bei Zufallsrezepten) */
  crafts: number;
  recipe?: Recipe;
  children: TreeNode[];
  /** Vom Nutzer als erledigt markiert */
  done: boolean;
  /** Trägt nicht zum Bedarf bei (erledigt oder bereits durch Bestand gedeckt) */
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
  /** Fehlende Menge nach Bestand/Markierungen */
  missing: number;
  /** Aus Zufallsrezepten stammende Menge oder Berechnung (Schätzung) */
  estimated: boolean;
}

export interface CraftEntry {
  recipe: Recipe;
  /** Anzahl Herstellungen (Erwartungswert bei Zufallsrezepten) */
  count: number;
  random: boolean;
}

export interface TreeOptions {
  /** Vorhandene Bestände je Item-ID (null = unbekannt) */
  stock?: ReadonlyMap<number, number> | null;
  doneNodes?: ReadonlySet<string>;
  /** Blatt-Materialien, die der Nutzer als vollständig vorhanden markiert hat */
  doneMaterials?: ReadonlySet<number>;
  buyItems?: ReadonlySet<number>;
  maxDepth?: number;
}

export interface TreeResult {
  root: TreeNode;
  bom: Map<number, BomEntry>;
  /** Herstellungen nach Rezept-ID (nur Netto, also nach Bestand) */
  crafts: Map<string, CraftEntry>;
  /** Fortschritt des Wurzelknotens 0..1 */
  progress: number;
  /** Anzahl direkter Komponenten (Kinder der Wurzel) und davon abgeschlossene */
  components: { total: number; complete: number };
  /** Enthält Zufallsrezepte -> Mengen sind Schätzungen */
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
    const recipe = cyclic || bought || depth >= opts.maxDepth ? undefined : provider.recipeFor(itemId);

    // Bestand verbrauchen (nur für nicht stumme Knoten)
    let fromStock = 0;
    if (!muted && opts.stock) {
      const avail = pool.get(itemId) ?? 0;
      fromStock = Math.min(demand, avail);
      if (fromStock > 0) pool.set(itemId, avail - fromStock);
    }

    let missing = muted ? 0 : demand - fromStock;
    if (!recipe && !muted && opts.doneMaterials.has(itemId)) {
      // Blatt wurde manuell als "vollständig" markiert
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
        // Alle darunterliegenden Mengen sind Schätzungen
        const mark = (n: TreeNode) => {
          estimated.add(n.itemId);
          n.children.forEach(mark);
        };
        node.children.forEach(mark);
      }
    } else if (!muted && missing > 0) {
      total.set(itemId, (total.get(itemId) ?? 0) + missing);
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
  // Pass 2: Netto (mit Bestand und erledigten Schritten)
  const net = runPass(rootItemId, rootCount, provider, {
    stock: options.stock ?? null,
    doneNodes: options.doneNodes ?? new Set<string>(),
    ...common,
  });

  computeProgress(net.root);

  const bom = new Map<number, BomEntry>();
  for (const [itemId, totalQty] of gross.total) {
    bom.set(itemId, {
      itemId,
      total: totalQty,
      missing: net.total.get(itemId) ?? 0,
      estimated: gross.estimated.has(itemId),
    });
  }
  // Material, das nur im Netto-Pass auftaucht (kann nicht passieren, aber robust bleiben)
  for (const [itemId, qty] of net.total) {
    if (!bom.has(itemId)) bom.set(itemId, { itemId, total: qty, missing: qty, estimated: net.estimated.has(itemId) });
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

/** Alle Knoten flach (Tiefensuche) – für Suche/Statistik */
export function flattenTree(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}
