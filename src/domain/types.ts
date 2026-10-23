/**
 * Gemeinsame Domänentypen für Handwerk & Legendäre Waffen.
 *
 * Datenherkunft (bewusst getrennt, siehe docs/DATENQUELLEN.md):
 *   - "official"  : offizielle GW2-API (Items, Rezepte, Preise, Account)
 *   - "community" : vendorter, geprüfter Community-Datensatz (nur Mystische-Schmiede-Rezepte & Herkunfts-Tags)
 *   - "derived"   : berechnet (Summen, Schätzungen, Planer)
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
  /** Nur bei Waffen: offizieller Waffentyp (z. B. "Greatsword") */
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
  /** Erwarteter Erfolgsanteil bei Zufallsrezepten (0..1). Fehlt = deterministisch. */
  yield?: number;
  vendor?: string;
  source: 'official' | 'community';
  /** Nur offizielle Rezepte: API-Flags (AutoLearned, LearnedFromItem) */
  flags?: string[];
  /** Nur offizielle Rezepte: API-Rezepttyp (Refinement, Component, …) */
  type?: string;
}

export interface PriceInfo {
  /** Sofortkauf-Preis (niedrigstes Angebot), 0 = kein Angebot */
  sell: number;
  /** Höchstes Kaufgesuch, 0 = keine Nachfrage */
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
