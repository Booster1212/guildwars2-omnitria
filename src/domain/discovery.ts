import type { DisciplineId, Recipe, PriceInfo } from './types';

export function isDiscoveryRecipe(r: Recipe): boolean {
  return !r.flags?.includes('AutoLearned') && !r.flags?.includes('LearnedFromItem');
}

export type DiscoveryStatusFilter = 'all' | 'undiscovered' | 'discovered';

export interface DiscoveryFilterOptions {
  discipline: DisciplineId;
  minRating?: number;
  maxRating?: number;
  type?: string;
  search?: string;
  status?: DiscoveryStatusFilter;
  knownRecipeIds?: ReadonlySet<number> | null;
}

export interface DiscoveryStats {
  total: number;
  discovered: number;
  undiscovered: number;
  pctDiscovered: number;
}

export function computeDiscoveryStats(
  recipes: readonly Recipe[],
  discipline: DisciplineId,
  knownRecipeIds: ReadonlySet<number> | null,
  minRating = 0,
  maxRating = 500,
): DiscoveryStats {
  let total = 0;
  let discovered = 0;

  for (const r of recipes) {
    if (!r.disciplines.includes(discipline)) continue;
    if (!isDiscoveryRecipe(r)) continue;
    if (r.rating < minRating || r.rating > maxRating) continue;

    total++;
    if (knownRecipeIds && knownRecipeIds.has(Number(r.id))) {
      discovered++;
    }
  }

  const undiscovered = Math.max(0, total - discovered);
  const pctDiscovered = total > 0 ? Math.round((discovered / total) * 100) : 0;

  return { total, discovered, undiscovered, pctDiscovered };
}

export function filterDiscoveryRecipes(
  recipes: readonly Recipe[],
  options: DiscoveryFilterOptions,
): Recipe[] {
  const {
    discipline,
    minRating = 0,
    maxRating = 500,
    type,
    search,
    status = 'all',
    knownRecipeIds,
  } = options;

  const normalizedSearch = search?.trim().toLowerCase();

  return recipes.filter((r) => {
    if (!r.disciplines.includes(discipline)) return false;
    if (!isDiscoveryRecipe(r)) return false;
    if (r.rating < minRating || r.rating > maxRating) return false;

    if (type && type !== 'all' && r.type !== type) return false;

    const isKnown = knownRecipeIds ? knownRecipeIds.has(Number(r.id)) : false;
    if (status === 'undiscovered' && knownRecipeIds && isKnown) return false;
    if (status === 'discovered' && knownRecipeIds && !isKnown) return false;

    if (normalizedSearch) {
      // Search matches recipe type or ID (names are looked up asynchronously)
      const matchesType = r.type?.toLowerCase().includes(normalizedSearch);
      const matchesId = String(r.id).includes(normalizedSearch) || String(r.outputId).includes(normalizedSearch);
      if (!matchesType && !matchesId) return false;
    }

    return true;
  });
}

/** Berechnet die voraussichtlichen Materialkosten für ein Rezept basierend auf TP-Preisen */
export function estimateRecipeCost(
  recipe: Recipe,
  prices: ReadonlyMap<number, PriceInfo>,
): { totalCost: number; hasUnpriced: boolean } {
  let totalCost = 0;
  let hasUnpriced = false;

  for (const ing of recipe.ingredients) {
    const p = prices.get(ing.itemId);
    if (p && p.sell > 0) {
      totalCost += p.sell * ing.count;
    } else {
      hasUnpriced = true;
    }
  }

  return { totalCost, hasUnpriced };
}
