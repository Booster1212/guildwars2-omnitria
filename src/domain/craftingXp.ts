/**
 * Näherungsmodell für Handwerks-Erfahrung.
 *
 * WICHTIG – Grenze der Datenquellen:
 *   Die offizielle GW2-API liefert weder die Handwerks-XP je Rezept noch den XP-Stand innerhalb eines Ranges.
 *   Dieses Modell folgt der in der Community dokumentierten Wiki-Formel
 *
 *       xp_gewinn(N) = xp_benötigt(N+1) · multiplikator · (1 − (N − min_rang) / spanne)
 *
 *   Da der Gewinn proportional zum Bedarf der jeweiligen Stufe ist, kürzt sich xp_benötigt heraus:
 *   Pro Herstellung werden  multiplikator · (1 − (N − min_rang) / spanne)  Ränge gewonnen.
 *
 *   Bewusst NICHT modelliert (konservativ = eher mehr Herstellungen als nötig):
 *   Entdeckungs-Bonus, Qualitäts-Boni (Meisterwerk/Selten), kritische Erfolge, Tageslimits.
 *   Die Formel konnte hier nicht gegen die Spieldaten verifiziert werden -> in der UI als "Schätzung" markiert.
 */

export type XpCategory = 'refinement' | 'component' | 'item';

export const XP_MODEL: Record<XpCategory, { multiplier: number; span: number }> = {
  refinement: { multiplier: 0.3, span: 25 },
  component: { multiplier: 0.6, span: 25 },
  item: { multiplier: 1.4, span: 40 },
};

/** Rezepttypen der API, die für die Levelroute NICHT in Frage kommen */
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
]);

export function categoryOf(recipeType: string | undefined): XpCategory | null {
  if (!recipeType) return null;
  if (EXCLUDED_TYPES.has(recipeType)) return null;
  if (recipeType.startsWith('Refinement') || recipeType === 'IngredientCooking') return 'refinement';
  if (['Component', 'Insignia', 'Inscription', 'Seasoning'].includes(recipeType)) return 'component';
  return 'item';
}

/** Gewonnene Ränge pro Herstellung bei aktuellem Rang `rank` (0 = keine XP mehr / noch nicht freigeschaltet) */
export function ranksPerCraft(category: XpCategory, rank: number, minRating: number): number {
  if (rank < minRating) return 0;
  const { multiplier, span } = XP_MODEL[category];
  const f = 1 - (rank - minRating) / span;
  return f > 0 ? multiplier * f : 0;
}
