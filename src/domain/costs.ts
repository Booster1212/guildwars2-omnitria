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

export function unitPrice(price: PriceInfo | undefined): number | null {
  if (!price) return null;
  return price.sell > 0 ? price.sell : null;
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
    const unit = unitPrice(prices.get(itemId));
    let line: CostLine;
    if (unit !== null && !isUntradable(item)) {
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
