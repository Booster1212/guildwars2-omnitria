/**
 * Approximation model for crafting experience.
 *
 * IMPORTANT – Data Source Limitation:
 *   The official GW2 API provides neither crafting XP per recipe nor XP progress within a rank.
 *   This model follows the wiki formula documented by the community:
 *
 *       xp_gain(N) = xp_required(N+1) · multiplier · (1 − (N − min_rank) / span)
 *
 *   Since gain is proportional to the tier requirement, xp_required cancels out:
 *   Per craft,  multiplier · (1 − (N − min_rank) / span)  ranks are gained.
 *
 *   Deliberately NOT modeled (conservative = rather more crafts than needed):
 *   Discovery bonus, quality bonuses (Masterwork/Rare), critical successes, daily limits.
 *   The formula could not be verified against raw game data here -> marked in UI as "Estimate".
 */

export type XpCategory = 'refinement' | 'component' | 'item';

export const XP_MODEL: Record<XpCategory, { multiplier: number; span: number }> = {
  refinement: { multiplier: 0.3, span: 25 },
  component: { multiplier: 0.6, span: 25 },
  item: { multiplier: 1.4, span: 40 },
};

/** API recipe types that do NOT qualify for leveling routes */
const EXCLUDED_TYPES = new Set([
  'Bulk',
  'Dye',
  'GuildDecoration',
  'LegendaryComponent',
  'GuildConsumable',
  'GuildConsumableWvw',
  'Backpack',
  'Potion',
  'Consumable',
  'RefinementEctoplasm',
  'RefinementObsidian',
]);

export function categoryOf(recipeType: string | undefined): XpCategory | null {
  if (!recipeType) return null;
  if (EXCLUDED_TYPES.has(recipeType)) return null;
  if (recipeType.startsWith('Refinement') || recipeType === 'IngredientCooking') return 'refinement';
  if (['Component', 'Insignia', 'Inscription', 'Seasoning'].includes(recipeType)) return 'component';
  return 'item';
}

/** Ranks gained per craft at current rank `rank` (0 = no more XP / not yet unlocked) */
export function ranksPerCraft(
  category: XpCategory,
  rank: number,
  minRating: number,
  isDiscovery = false,
): number {
  if (rank < minRating) return 0;
  const { multiplier, span } = XP_MODEL[category];
  const f = 1 - (rank - minRating) / span;

  // Leveling 0-470 remains unchanged.
  // For Master / Exotic Tier (minRating >= 400, rank >= 450/470):
  // In GW2, discovering an exotic item awards full discovery XP across the 400-500 tier (~2.0 to 2.5 levels per discovery),
  // even when standard crafts have decayed to 0.
  if (isDiscovery) {
    if (minRating >= 400 && category === 'item') {
      const tierF = Math.max(0.62, 1 - (rank - minRating) / 120);
      return multiplier * tierF * 2.5; // ~2.17 ranks at 475, ~3.5 at 400
    }
    if (f <= 0) return 0;
    return multiplier * f * 2.5;
  }

  if (f <= 0) return 0;
  return multiplier * f;
}
