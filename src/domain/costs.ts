/**
 * Kostenberechnung auf Basis von Handelsgesellschafts-Preisen (offizielle API: /v2/commerce/prices).
 *
 * Ausgewiesen wird der SOFORTKAUF-Preis (niedrigstes Angebot). Gebühren (15 %) spielen beim Einkauf keine Rolle.
 * Items ohne Angebot oder nicht handelbare Items fließen NICHT in die Summe ein, sondern werden separat
 * ausgewiesen, damit keine falsche Vollständigkeit vorgetäuscht wird.
 */
import type { GameItem, PriceInfo } from './types.ts';
import { isUntradable } from './types.ts';

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
  /** Positionen, für die kein Preis ermittelt werden konnte */
  unpriced: CostLine[];
}

/** Bekannte Händlerpreise in Kupfer (z. B. Koch- und Handwerksmeister-Zutaten) */
export const KNOWN_VENDOR_PRICES: ReadonlyMap<number, number> = new Map([
  // Koch-Zutaten vom Meisterkoch (offizielle Händlerpreise in Kupfer)
  [12156, 16], // Krug Wasser (Jug of Water)
  [12155, 16], // Beutel Mehl (Bag of Flour)
  [12158, 16], // Paket Hefe (Packet of Yeast)
  [12153, 16], // Paket Salz (Packet of Salt)
  [12151, 16], // Paket Backpulver (Packet of Baking Powder)
  [12157, 16], // Flasche Essig (Bottle of Vinegar)
  [12159, 16], // Flasche Sojasoße (Bottle of Soy Sauce)
  [12240, 16], // Glas Buttermilch (Glass of Buttermilk)
  [12337, 16], // Beutel Zucker (Bag of Sugar)
  [12338, 16], // Flasche einfacher Sirup (Bottle of Simple Syrup)
  [12176, 16], // Beutel Maismehl (Bag of Cornmeal)
  [12165, 35], // Stück Butter (Stick of Butter - Karma/Vendor)
  [12166, 35], // Käsestück (Cheese Wedge - Karma/Vendor)
  [12177, 35], // Paprika (Bell Pepper - Karma/Vendor)
  [12178, 35], // Vanilleschote (Vanilla Bean - Karma/Vendor)
  [12134, 16], // Scheibe Käse (Cheese Slice)
  [12144, 40], // Schneetrüffel (Snow Truffle)
  [12145, 16], // Reisbällchen (Rice Ball)
  [12132, 48], // Brotlaib (Loaf of Bread - Eigenherstellung aus 16c Wasser + 16c Mehl + 16c Hefe)

  // Handwerksmeister-Basiskomponenten (alle Disziplinen)
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

  // Legendäre Komponenten mit festen Händlerpreisen (offizielle Händlerpreise in Kupfer)
  [19676, 10000], // Eisiger Runenstein (Icy Runestone) – 1 Gold (10.000 Kupfer) bei Rojan dem Büßer
]);

export function unitPrice(price: PriceInfo | undefined, itemId?: number): number | null {
  if (price && price.sell > 0) return price.sell;
  if (itemId !== undefined && KNOWN_VENDOR_PRICES.has(itemId)) {
    return KNOWN_VENDOR_PRICES.get(itemId)!;
  }
  if (price && price.buy > 0) return price.buy;
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
  const c = Math.max(0, Math.round(copper));
  return { gold: Math.floor(c / 10000), silver: Math.floor((c % 10000) / 100), copper: c % 100 };
}
