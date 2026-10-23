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
  /** Optional resolver for item names (cached from /v2/items) */
  getItemName?: (id: number) => string | undefined;
  /** Optional resolver for localized recipe types */
  getRecipeTypeName?: (type: string) => string | undefined;
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
    getItemName,
    getRecipeTypeName,
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
      // 1. Output item name
      const outName = getItemName?.(r.outputId)?.toLowerCase();
      const matchesOutName = Boolean(outName && outName.includes(normalizedSearch));

      // 2. Ingredient names
      let matchesIngredients = false;
      if (getItemName) {
        for (const ing of r.ingredients) {
          const ingName = getItemName(ing.itemId)?.toLowerCase();
          if (ingName && ingName.includes(normalizedSearch)) {
            matchesIngredients = true;
            break;
          }
        }
      }

      // 3. Recipe type (internal e.g. "Greatsword" or localized e.g. "Großschwert")
      const matchesType = Boolean(r.type?.toLowerCase().includes(normalizedSearch));
      const locTypeName = getRecipeTypeName && r.type ? getRecipeTypeName(r.type)?.toLowerCase() : undefined;
      const matchesLocType = Boolean(locTypeName && locTypeName.includes(normalizedSearch));

      // 4. IDs (recipe ID, output ID, or ingredient IDs)
      const matchesId =
        String(r.id).includes(normalizedSearch) ||
        String(r.outputId).includes(normalizedSearch) ||
        r.ingredients.some((ing) => String(ing.itemId).includes(normalizedSearch));

      if (!matchesOutName && !matchesIngredients && !matchesType && !matchesLocType && !matchesId) {
        return false;
      }
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
