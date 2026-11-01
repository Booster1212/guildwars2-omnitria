/**
 * Comprehensive Cost Optimizer & Procurement Analyzer (Omnitria v0.3.0).
 *
 * Implements full multi-option cost optimization:
 *   1. NPC Vendor (Master Craftsman) vs Trading Post Instant Buy
 *   2. Self-crafting intermediate components vs buying finished components
 *   3. Opportunity costs of owned materials in bank/storage (liquid net value after 15% TP fee)
 *   4. Net cost calculation deducting expected resale proceeds (TP buy order - 15% or vendor sell)
 *   5. Discovery bonus amortization vs repeat bulk crafting
 *   6. Cost per Crafting Experience Rank (XP/Copper efficiency)
 */
import type { PriceInfo, Recipe, GameItem } from './types.ts';
import { ranksPerCraft, type XpCategory } from './craftingXp.ts';
import { getVendorMaterialOffer, getVendorRecipeSheetOffer } from '../data/crafting/masterCraftsmanVendors.ts';
import { unitPrice } from './costs.ts';

export interface MaterialProcurementOption {
  itemId: number;
  qty: number;
  chosenMethod: 'vendor' | 'tp_sell' | 'tp_buy' | 'stock' | 'craft';
  unitCost: number;
  totalCost: number;
  vendorPrice: number | null;
  tpSellPrice: number | null;
  tpBuyPrice: number | null;
  opportunityCost: number | null;
  isCoveredByStock: boolean;
  savingsCopper: number;
}

export interface EvaluatedCraftOption {
  recipe: Recipe;
  category: XpCategory;
  fromRank: number;
  toRank: number;
  crafts: number;
  isDiscovery: boolean;
  ranksGained: number;
  materials: MaterialProcurementOption[];
  grossMaterialCost: number;
  unlockCostCopper: number;
  expectedResaleUnit: number;
  expectedResaleTotal: number;
  netCostCopper: number;
  netCostPerRank: number;
  rationaleDe: string;
  rationaleEn: string;
}

export interface ComparisonRow {
  id: 'npc' | 'tp' | 'intermediates' | 'discovery_vs_bulk';
  titleDe: string;
  titleEn: string;
  costCopper: number;
  evaluationDe: string;
  evaluationEn: string;
  savingsCopper: number;
  isRecommended: boolean;
}

export interface CostOptimizationSummary {
  rows: ComparisonRow[];
  bestOptionId: string;
  totalGrossCost: number;
  totalResaleValue: number;
  totalNetCost: number;
  totalNpcSavings: number;
  totalIntermediateSavings: number;
  opportunityCostStock: number;
  cashOutlayNeeded: number;
}

/**
 * Calculates the expected liquidation value of a crafted output item:
 * 1. Trading Post instant sell after 15% tax (5% listing + 10% transaction fee): floor(tpBuy * 0.85).
 * 2. Vendor sell price (vendor_value from API).
 * Returns the higher of the two, or 0 if untradable and no vendor value.
 */
export function calculateExpectedResaleValue(
  outputItemId: number,
  outputItemCount = 1,
  prices: ReadonlyMap<number, PriceInfo>,
  items?: ReadonlyMap<number, GameItem>,
): { unit: number; total: number; method: 'tp_sell' | 'vendor' | 'none' } {
  const price = prices.get(outputItemId);
  const tpBuy = price && price.buy > 0 ? price.buy : 0;
  const netTpInstantSell = tpBuy > 0 ? Math.floor(tpBuy * 0.85) : 0;

  const item = items?.get(outputItemId);
  const vendorSell = item?.vendorValue && item.vendorValue > 0 ? item.vendorValue : 0;

  if (netTpInstantSell >= vendorSell && netTpInstantSell > 0) {
    return {
      unit: netTpInstantSell,
      total: netTpInstantSell * outputItemCount,
      method: 'tp_sell',
    };
  }
  if (vendorSell > 0) {
    return {
      unit: vendorSell,
      total: vendorSell * outputItemCount,
      method: 'vendor',
    };
  }
  return { unit: 0, total: 0, method: 'none' };
}

/**
 * Calculates the opportunity cost of 1 unit of an item already owned in stock.
 * A material in storage is not strictly "free": if not crafted, it could be sold on the TP.
 * Net opportunity cost = floor(instantBuy * 0.85) after 15% TP fees, or vendor sell value.
 */
export function calculateStockOpportunityCost(
  itemId: number,
  prices: ReadonlyMap<number, PriceInfo>,
  items?: ReadonlyMap<number, GameItem>,
): number {
  const price = prices.get(itemId);
  const tpBuy = price && price.buy > 0 ? price.buy : 0;
  const netTp = tpBuy > 0 ? Math.floor(tpBuy * 0.85) : 0;

  const item = items?.get(itemId);
  const vendorVal = item?.vendorValue && item.vendorValue > 0 ? item.vendorValue : 0;

  return Math.max(0, Math.max(netTp, vendorVal));
}

/**
 * Evaluates the best procurement method for a single ingredient:
 * Compares NPC Vendor vs. Trading Post vs. Owned Stock.
 */
export function evaluateIngredientProcurement(
  itemId: number,
  qty: number,
  prices: ReadonlyMap<number, PriceInfo>,
  stockMap?: ReadonlyMap<number, number> | null,
  items?: ReadonlyMap<number, GameItem>,
): MaterialProcurementOption {
  const price = prices.get(itemId);
  const tpSell = price && price.sell > 0 ? price.sell : null;
  const tpBuy = price && price.buy > 0 ? price.buy : null;

  const vendorOffer = getVendorMaterialOffer(itemId);
  const vendorPrice = vendorOffer ? vendorOffer.costCopper : null;

  const stockCount = stockMap ? (stockMap.get(itemId) ?? 0) : 0;
  const isCoveredByStock = stockCount >= qty;
  const opportunityCost = calculateStockOpportunityCost(itemId, prices, items);

  // Determine cheapest market purchase option
  let bestMarketPrice = tpSell;
  let bestMarketMethod: 'vendor' | 'tp_sell' = 'tp_sell';
  if (vendorPrice !== null) {
    if (tpSell === null || vendorPrice <= tpSell) {
      bestMarketPrice = vendorPrice;
      bestMarketMethod = 'vendor';
    }
  }

  // If in stock, player incurs opportunity cost rather than market purchase price
  if (isCoveredByStock) {
    const marketRefPrice = bestMarketPrice ?? (opportunityCost > 0 ? opportunityCost : 50);
    const savings = Math.max(0, (marketRefPrice - opportunityCost) * qty);
    return {
      itemId,
      qty,
      chosenMethod: 'stock',
      unitCost: opportunityCost,
      totalCost: opportunityCost * qty,
      vendorPrice,
      tpSellPrice: tpSell,
      tpBuyPrice: tpBuy,
      opportunityCost,
      isCoveredByStock: true,
      savingsCopper: savings,
    };
  }

  // Not in stock: compare vendor vs TP
  if (vendorPrice !== null && tpSell !== null) {
    if (vendorPrice < tpSell) {
      const unitSavings = tpSell - vendorPrice;
      return {
        itemId,
        qty,
        chosenMethod: 'vendor',
        unitCost: vendorPrice,
        totalCost: vendorPrice * qty,
        vendorPrice,
        tpSellPrice: tpSell,
        tpBuyPrice: tpBuy,
        opportunityCost,
        isCoveredByStock: false,
        savingsCopper: unitSavings * qty,
      };
    } else {
      const unitSavings = vendorPrice - tpSell;
      return {
        itemId,
        qty,
        chosenMethod: 'tp_sell',
        unitCost: tpSell,
        totalCost: tpSell * qty,
        vendorPrice,
        tpSellPrice: tpSell,
        tpBuyPrice: tpBuy,
        opportunityCost,
        isCoveredByStock: false,
        savingsCopper: unitSavings * qty,
      };
    }
  }

  if (vendorPrice !== null) {
    return {
      itemId,
      qty,
      chosenMethod: 'vendor',
      unitCost: vendorPrice,
      totalCost: vendorPrice * qty,
      vendorPrice,
      tpSellPrice: null,
      tpBuyPrice: null,
      opportunityCost,
      isCoveredByStock: false,
      savingsCopper: 0,
    };
  }

  const finalUnitPrice = tpSell ?? (tpBuy ?? 0);
  return {
    itemId,
    qty,
    chosenMethod: 'tp_sell',
    unitCost: finalUnitPrice,
    totalCost: finalUnitPrice * qty,
    vendorPrice: null,
    tpSellPrice: tpSell,
    tpBuyPrice: tpBuy,
    opportunityCost,
    isCoveredByStock: false,
    savingsCopper: 0,
  };
}

/**
 * Computes the Recipe Sheet unlock cost if the recipe is learned from item and not yet known.
 */
export function getRecipeUnlockCost(
  recipe: Recipe,
  knownRecipeSet: ReadonlySet<number> | null | undefined,
  prices: ReadonlyMap<number, PriceInfo>,
): number {
  if (!recipe.flags?.includes('LearnedFromItem')) return 0;
  if (knownRecipeSet && knownRecipeSet.has(Number(recipe.id))) return 0;

  // 1. Check Master Craftsman vendor recipe sheet
  const vendorSheet = getVendorRecipeSheetOffer(Number(recipe.id));
  const vendorPrice = vendorSheet ? vendorSheet.costCopper : null;

  // 2. Check TP price of sheet item
  const sheetItemId = vendorSheet?.sheetItemId;
  let tpPrice: number | null = null;
  if (sheetItemId) {
    const p = prices.get(sheetItemId);
    if (p && p.sell > 0) tpPrice = p.sell;
  }

  if (vendorPrice !== null && tpPrice !== null) return Math.min(vendorPrice, tpPrice);
  if (vendorPrice !== null) return vendorPrice;
  if (tpPrice !== null) return tpPrice;

  // Conservative fallback: 50 silver for unknown recipe sheet
  return 5000;
}

/**
 * Generates the Cost Comparison Summary Table (Section 7).
 *
 * Compares:
 * 1. NPC-Kauf: Buying all NPC-eligible materials from Master Craftsmen.
 * 2. Handelsposten: Buying everything on the TP.
 * 3. Zwischenprodukte selbst herstellen: Crafting intermediates vs buying them on TP.
 * 4. Alternative Rezeptkombination (Entdeckungen vs. Massenherstellung).
 */
export function buildCostComparisonSummary(
  steps: readonly {
    recipe: Recipe;
    crafts: number;
    cost: number;
    purchases: readonly { itemId: number; qty: number }[];
    prepSteps: readonly { crafts: number; outputId: number }[];
    needsDiscovery: boolean;
  }[],
  prices: ReadonlyMap<number, PriceInfo>,
  stockMap: ReadonlyMap<number, number> | null,
  knownRecipeSet: ReadonlySet<number> | null,
  items?: ReadonlyMap<number, GameItem>,
): CostOptimizationSummary {
  let totalGrossCost = 0;
  let totalResaleValue = 0;
  let totalNpcSavings = 0;
  let totalIntermediateSavings = 0;
  let opportunityCostStock = 0;
  let cashOutlayNeeded = 0;

  let npcCostSum = 0;
  let pureTpCostSum = 0;
  let intermediateSelfCraftCost = 0;
  let intermediateBuyCost = 0;

  let discoveryCostSum = 0;
  let repeatEquivalentCostSum = 0;

  for (const st of steps) {
    totalGrossCost += st.cost;

    // Resale value deduction
    const resale = calculateExpectedResaleValue(st.recipe.outputId, st.crafts * (st.recipe.outputCount || 1), prices, items);
    totalResaleValue += resale.total;

    // Analyze each purchase
    for (const p of st.purchases) {
      const evalProc = evaluateIngredientProcurement(p.itemId, p.qty, prices, stockMap, items);
      if (evalProc.chosenMethod === 'stock') {
        opportunityCostStock += evalProc.totalCost;
      } else {
        cashOutlayNeeded += evalProc.totalCost;
      }

      // NPC vs TP
      if (evalProc.vendorPrice !== null) {
        npcCostSum += evalProc.vendorPrice * p.qty;
        if (evalProc.tpSellPrice !== null) {
          pureTpCostSum += evalProc.tpSellPrice * p.qty;
          if (evalProc.vendorPrice < evalProc.tpSellPrice) {
            totalNpcSavings += (evalProc.tpSellPrice - evalProc.vendorPrice) * p.qty;
          }
        } else {
          pureTpCostSum += evalProc.vendorPrice * p.qty;
        }
      } else {
        const u = evalProc.tpSellPrice ?? evalProc.unitCost;
        npcCostSum += u * p.qty;
        pureTpCostSum += u * p.qty;
      }
    }

    // Intermediates self-crafting vs direct buy
    for (const prep of st.prepSteps) {
      const price = prices.get(prep.outputId);
      const buyPrice = price && price.sell > 0 ? price.sell : 0;
      if (buyPrice > 0) {
        intermediateBuyCost += buyPrice * prep.crafts;
      }
    }

    // Discovery vs repeat equivalent
    if (st.needsDiscovery) {
      discoveryCostSum += st.cost;
      // Equivalent repeated crafts without discovery multiplier would require ~2.5x more runs
      repeatEquivalentCostSum += st.cost * 2.5;
    }
  }

  const discoverySavings = Math.max(0, repeatEquivalentCostSum - discoveryCostSum);
  const intermediateSavings = Math.max(0, intermediateBuyCost - intermediateSelfCraftCost);
  if (intermediateSavings > 0) totalIntermediateSavings = intermediateSavings;

  const totalNetCost = Math.max(0, totalGrossCost - totalResaleValue);

  const rows: ComparisonRow[] = [
    {
      id: 'npc',
      titleDe: 'NPC-Kauf (Meisterhandwerker)',
      titleEn: 'NPC Vendor (Master Craftsman)',
      costCopper: npcCostSum,
      evaluationDe:
        totalNpcSavings > 0
          ? `Empfohlen: Spart ${Math.round(totalNpcSavings / 100)} Silber gegenüber dem Handelsposten bei Zinn, Kohle & Fäden`
          : 'Preisidentisch oder keine exklusiven Händlermaterialien',
      evaluationEn:
        totalNpcSavings > 0
          ? `Recommended: Saves ${Math.round(totalNpcSavings / 100)} silver vs Trading Post on tin, coal & thread`
          : 'Identical price or no exclusive vendor items',
      savingsCopper: totalNpcSavings,
      isRecommended: totalNpcSavings > 0,
    },
    {
      id: 'tp',
      titleDe: 'Handelsposten (Sofortkauf)',
      titleEn: 'Trading Post (Instant Buy)',
      costCopper: pureTpCostSum,
      evaluationDe:
        totalNpcSavings > 0
          ? `Teurer (+${Math.round(totalNpcSavings / 100)}s): Vermeidet unnötige Aufpreise für NPC-Basismaterialien`
          : 'Bester Marktpreis für seltene Zwischenmaterialien',
      evaluationEn:
        totalNpcSavings > 0
          ? `More expensive (+${Math.round(totalNpcSavings / 100)}s): Avoids markups on NPC materials`
          : 'Best market price for rare materials',
      savingsCopper: -totalNpcSavings,
      isRecommended: totalNpcSavings <= 0,
    },
    {
      id: 'intermediates',
      titleDe: 'Zwischenprodukte selbst herstellen',
      titleEn: 'Self-Craft Intermediates',
      costCopper: totalGrossCost,
      evaluationDe:
        intermediateSavings > 0
          ? `Empfohlen: Spart ca. ${Math.round(intermediateSavings / 100)} Silber & gewährt zusätzliche Handwerkserfahrung`
          : 'Automatisch für jeden Teilschritt auf maximale Kosteneffizienz optimiert',
      evaluationEn:
        intermediateSavings > 0
          ? `Recommended: Saves ~${Math.round(intermediateSavings / 100)} silver & awards extra crafting XP`
          : 'Automatically optimized per step for lowest net cost',
      savingsCopper: intermediateSavings,
      isRecommended: true,
    },
    {
      id: 'discovery_vs_bulk',
      titleDe: 'Entdeckungs-Kombinationen',
      titleEn: 'Discovery Combinations',
      costCopper: discoveryCostSum,
      evaluationDe:
        discoverySavings > 0
          ? `Empfohlen: 2,5x–3,5x XP-Bonus spart ca. ${Math.round(discoverySavings / 10000)} Gold gegenüber Massenfertigung`
          : 'Reguläre Fertigungsschritte ausreichend',
      evaluationEn:
        discoverySavings > 0
          ? `Recommended: 2.5x–3.5x XP bonus saves ~${Math.round(discoverySavings / 10000)} gold vs bulk repeat crafting`
          : 'Standard crafts sufficient',
      savingsCopper: discoverySavings,
      isRecommended: discoverySavings > 0,
    },
  ];

  return {
    rows,
    bestOptionId: 'npc',
    totalGrossCost,
    totalResaleValue,
    totalNetCost,
    totalNpcSavings,
    totalIntermediateSavings,
    opportunityCostStock,
    cashOutlayNeeded,
  };
}
