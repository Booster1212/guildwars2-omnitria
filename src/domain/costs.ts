/**
 * Cost calculation based on Trading Post prices (official API: /v2/commerce/prices).
 *
 * Reported price is the INSTANT BUY price (lowest sell listing). Fees (15%) play no role when purchasing.
 * Items without sell listings or non-tradeable items do NOT factor into the sum; they are reported separately
 * so that no false completeness is implied.
 */
import type { GameItem, PriceInfo } from './types.ts';
import { isUntradable } from './types.ts';
import { getVendorMaterialOffer } from '../data/crafting/masterCraftsmanVendors.ts';

export interface CostLine {
  itemId: number;
  qty: number;
  unit: number | null;
  cost: number | null;
  reason?: 'untradable' | 'no-listing' | 'unknown';
}

export interface CostSummary {
  /** Summe aller bepreisbaren Positionen (Kupfer) */
  total: number;
  lines: Map<number, CostLine>;
  pricedCount: number;
  /** Items for which no price could be determined */
  unpriced: CostLine[];
}

/** Known vendor prices in copper (e.g. Chef and Master Craftsman ingredients) */
export const KNOWN_VENDOR_PRICES: ReadonlyMap<number, number> = new Map([
  // Chef ingredients from Master Craftsman (official vendor prices in copper)
  [12136, 16], // Beutel Mehl (Bag of Flour)
  [12156, 16], // Krug Wasser (Jug of Water)
  [12155, 16], // Beutel Zucker (Bag of Sugar)
  [12152, 16], // Paket Hefe (Packet of Yeast)
  [12158, 16], // Glas Pflanzenöl (Jar of Vegetable Oil)
  [12153, 16], // Paket Salz (Packet of Salt)
  [12151, 16], // Paket Backpulver (Packet of Baking Powder)
  [12157, 16], // Flasche Essig (Jar of Vinegar)
  [12159, 16], // Käsestück (Cheese Wedge)
  [12271, 16], // Flasche Sojasoße (Bottle of Soy Sauce)
  [12137, 16], // Glas Buttermilch (Glass of Buttermilk)
  [12145, 16], // Reisbällchen (Rice Ball)
  [12132, 48], // Laib Brot (Loaf of Bread - self-crafting or vendor)
  [12144, 40], // Schneetrüffel (Snow Truffle)

  // Chef Karma & NPC ingredients
  [12138, 14], // Butterstück (Stick of Butter)
  [12235, 14], // Paprika (Bell Pepper)
  [12234, 14], // Vanilleschote (Vanilla Bean)
  [12236, 14], // Schwarzes Pfefferkorn (Black Peppercorn)
  [12248, 14], // Thymianblatt (Thyme Leaf)
  [12246, 14], // Petersilienblatt (Parsley Leaf)
  [12240, 14], // Selleriestange (Celery Stalk)

  // Master Craftsman basic ingredients (all disciplines)
  [19704, 8],   // Klumpen Zinn (Lump of Tin)
  [19750, 16],  // Klumpen Kohle (Lump of Coal)
  [19924, 48],  // Klumpen Primordium (Lump of Primordium)
  [46747, 149], // Thermokatalytische Reagenz (Thermocatalytic Reagent)
  [19792, 8],   // Spule Jutefaden (Spool of Jute Thread)
  [19789, 16],  // Spule Wollfaden (Spool of Wool Thread)
  [19794, 24],  // Spule Baumwollfaden (Spool of Cotton Thread)
  [19793, 32],  // Spule Leinenfaden (Spool of Linen Thread)
  [19791, 48],  // Spule Seidenfaden (Spool of Silk Thread)
  [19790, 64],  // Spule Gazefaden (Spool of Gossamer Thread)

  // Master Craftsman Runes of Holding (Taschenrunen)
  [13010, 200],    // Schwache Rune der Tasche (Minor Rune of Holding – 2 Silver)
  [13006, 1480],   // Rune der Tasche (Rune of Holding – 14 Silver 80 Copper)
  [13007, 5000],   // Beachtliche Rune der Tasche (Major Rune of Holding – 50 Silver)
  [13008, 20000],  // Große Rune der Tasche (Greater Rune of Holding – 2 Gold)
  [13009, 100000], // Überlegene Rune der Tasche (Superior Rune of Holding – 10 Gold)

  // Legendary components with fixed vendor prices (official vendor prices in copper)
  [19676, 10000], // Eisiger Runenstein (Icy Runestone – 1 Gold from Rojan the Penitent)
]);

export function unitPrice(price: PriceInfo | undefined, itemId?: number): number | null {
  const vendorOffer = itemId !== undefined ? getVendorMaterialOffer(itemId) : undefined;
  const vendorPrice = vendorOffer ? vendorOffer.costCopper : (itemId !== undefined ? KNOWN_VENDOR_PRICES.get(itemId) ?? null : null);
  const tpSell = price && price.sell > 0 ? price.sell : null;
  const tpBuy = price && price.buy > 0 ? price.buy : null;

  if (vendorPrice !== null && tpSell !== null) {
    // Both available: take the truly cheaper option (NPC vs TP comparison)!
    return Math.min(vendorPrice, tpSell);
  }
  if (vendorPrice !== null) return vendorPrice;
  if (tpSell !== null) return tpSell;
  if (tpBuy !== null) return tpBuy;
  return null;
}

export function estimateCosts(
  needs: Iterable<{ itemId: number; qty: number }>,
  prices: ReadonlyMap<number, PriceInfo>,
  items: ReadonlyMap<number, GameItem>,
): CostSummary {
  const lines = new Map<number, CostLine>();
  let total = 0;
  let pricedCount = 0;
  const unpriced: CostLine[] = [];
  for (const { itemId, qty } of needs) {
    if (qty <= 0) continue;
    const item = items.get(itemId);
    const unit = unitPrice(prices.get(itemId), itemId);
    const isVendorKnown = KNOWN_VENDOR_PRICES.has(itemId);
    let line: CostLine;
    if (unit !== null && (!isUntradable(item) || isVendorKnown)) {
      line = { itemId, qty, unit, cost: unit * qty };
      total += unit * qty;
      pricedCount++;
    } else {
      line = {
        itemId,
        qty,
        unit: null,
        cost: null,
        reason: isUntradable(item) ? 'untradable' : prices.has(itemId) ? 'no-listing' : 'unknown',
      };
      unpriced.push(line);
    }
    lines.set(itemId, line);
  }
  return { total, lines, pricedCount, unpriced };
}

/** Kupfer -> { gold, silver, copper } */
export function splitCoins(copper: number): { gold: number; silver: number; copper: number } {
  if (!Number.isFinite(copper) || Number.isNaN(copper)) {
    return { gold: 0, silver: 0, copper: 0 };
  }
  const c = Math.max(0, Math.round(copper));
  return { gold: Math.floor(c / 10000), silver: Math.floor((c % 10000) / 100), copper: c % 100 };
}
