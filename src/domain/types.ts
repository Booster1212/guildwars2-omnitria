/**
 * Common domain types for Crafting & Legendary Weapons.
 *
 * Data provenance (strictly separated, see docs/DATA_SOURCES.md):
 *   - "official"  : official GW2 API (Items, Recipes, Prices, Account)
 *   - "community" : vendored, vetted community dataset (Mystic Forge recipes & origin tags only)
 *   - "derived"   : calculated (sums, estimates, planner)
 */

export type Rarity =
  | 'Junk'
  | 'Basic'
  | 'Fine'
  | 'Masterwork'
  | 'Rare'
  | 'Exotic'
  | 'Ascended'
  | 'Legendary';

export interface GameItem {
  id: number;
  name: string;
  icon?: string;
  rarity: Rarity;
  type: string;
  level: number;
  description?: string;
  flags: string[];
  vendorValue: number;
  /** Weapons only: official weapon type (e.g. "Greatsword") */
  weaponType?: string;
  chatLink?: string;
}

export interface Ingredient {
  itemId: number;
  count: number;
}

export type RecipeKind = 'mf' | 'craft' | 'vendor' | 'official';

export interface Recipe {
  id: string;
  outputId: number;
  outputCount: number;
  kind: RecipeKind;
  disciplines: string[];
  rating: number;
  ingredients: Ingredient[];
  /** Expected success rate for RNG recipes (0..1). Missing = deterministic. */
  yield?: number;
  vendor?: string;
  source: 'official' | 'community';
  /** Official recipes only: API flags (AutoLearned, LearnedFromItem) */
  flags?: string[];
  /** Official recipes only: API recipe type (Refinement, Component, …) */
  type?: string;
}

export interface PriceInfo {
  /** Sofortkauf-Preis (niedrigstes Angebot), 0 = kein Angebot */
  sell: number;
  /** Highest buy order, 0 = no demand */
  buy: number;
  sellQty: number;
  buyQty: number;
}

export type DisciplineId =
  | 'Armorsmith'
  | 'Weaponsmith'
  | 'Artificer'
  | 'Jeweler'
  | 'Leatherworker'
  | 'Tailor'
  | 'Chef'
  | 'Huntsman';

export function isUntradable(item: GameItem | undefined): boolean {
  if (!item) return false;
  return item.flags.includes('AccountBound') || item.flags.includes('SoulbindOnAcquire');
}
