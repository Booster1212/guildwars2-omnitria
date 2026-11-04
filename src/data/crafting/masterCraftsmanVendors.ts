import type { DisciplineId, PriceInfo } from '../../domain/types.ts';

/**
 * Master Craftsman (Berufslehrer / Meisterhandwerker) and NPC Vendor Data.
 *
 * In Guild Wars 2, Master Craftsmen in major cities (Divinity's Reach, Lion's Arch,
 * Black Citadel, Rata Sum, The Grove, Hoelbrak) sell crafting ingredients, refinement
 * catalysts, and recipe sheets directly for coins or karma.
 *
 * This module manages vendor offerings data-driven across all 8 disciplines,
 * enabling rigorous price comparisons against Trading Post listings.
 */

export interface VendorMaterialOffer {
  itemId: number;
  nameDe: string;
  nameEn: string;
  costCopper: number;
  costKarma?: number;
  disciplines: readonly DisciplineId[];
  minRank: number;
  vendorNameDe: string;
  vendorNameEn: string;
  isAvailableOnTp: boolean;
}

export interface VendorRecipeSheetOffer {
  /** Recipe ID in official GW2 API */
  recipeId: number;
  /** Sheet item ID consumed to unlock this recipe */
  sheetItemId?: number;
  outputItemId: number;
  nameDe: string;
  nameEn: string;
  discipline: DisciplineId;
  minRank: number;
  costCopper: number;
  costKarma?: number;
  vendorNameDe: string;
  vendorNameEn: string;
}

export type ProcurementMethod = 'vendor' | 'tp_sell' | 'tp_buy' | 'stock' | 'craft';

export interface ProcurementEvaluation {
  itemId: number;
  method: ProcurementMethod;
  unitPrice: number;
  vendorPrice: number | null;
  tpSellPrice: number | null;
  tpBuyPrice: number | null;
  savingsVsAlternative: number;
  rationaleDe: string;
  rationaleEn: string;
}

/**
 * Official Master Craftsman Material Catalog.
 * Prices verified against the official Guild Wars 2 game data.
 */
export const MASTER_CRAFTSMAN_MATERIALS: readonly VendorMaterialOffer[] = [
  // --- Universal & Metal Disciplines (Weaponsmith, Armorsmith, Artificer) ---
  {
    itemId: 19704,
    nameDe: 'Klumpen Zinn',
    nameEn: 'Lump of Tin',
    costCopper: 8,
    disciplines: ['Weaponsmith', 'Armorsmith', 'Artificer'],
    minRank: 0,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19750,
    nameDe: 'Klumpen Kohle',
    nameEn: 'Lump of Coal',
    costCopper: 16,
    disciplines: ['Weaponsmith', 'Armorsmith', 'Artificer', 'Huntsman'],
    minRank: 150,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19924,
    nameDe: 'Klumpen Primordium',
    nameEn: 'Lump of Primordium',
    costCopper: 48,
    disciplines: ['Weaponsmith', 'Armorsmith', 'Artificer', 'Huntsman'],
    minRank: 400,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 46747,
    nameDe: 'Thermokatalytische Reagenz',
    nameEn: 'Thermocatalytic Reagent',
    costCopper: 149,
    disciplines: ['Weaponsmith', 'Armorsmith', 'Artificer', 'Huntsman', 'Leatherworker', 'Tailor'],
    minRank: 450,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },

  // --- Cloth & Leather Thread Disciplines (Tailor, Leatherworker, Armorsmith) ---
  {
    itemId: 19792,
    nameDe: 'Spule Jutefaden',
    nameEn: 'Spool of Jute Thread',
    costCopper: 8,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 0,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19789,
    nameDe: 'Spule Wollfaden',
    nameEn: 'Spool of Wool Thread',
    costCopper: 16,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 75,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19794,
    nameDe: 'Spule Baumwollfaden',
    nameEn: 'Spool of Cotton Thread',
    costCopper: 24,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 150,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19793,
    nameDe: 'Spule Leinenfaden',
    nameEn: 'Spool of Linen Thread',
    costCopper: 32,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 225,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19791,
    nameDe: 'Spule Seidenfaden',
    nameEn: 'Spool of Silk Thread',
    costCopper: 48,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 300,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 19790,
    nameDe: 'Spule Gazefaden',
    nameEn: 'Spool of Gossamer Thread',
    costCopper: 64,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 400,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: true,
  },
  {
    itemId: 13010,
    nameDe: 'Schwache Rune der Taschenherstellung',
    nameEn: 'Minor Rune of Holding',
    costCopper: 200,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 75,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: false,
  },
  {
    itemId: 13006,
    nameDe: 'Rune der Taschenherstellung',
    nameEn: 'Rune of Holding',
    costCopper: 1480,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 150,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: false,
  },
  {
    itemId: 13007,
    nameDe: 'Beachtliche Rune der Taschenherstellung',
    nameEn: 'Major Rune of Holding',
    costCopper: 5000,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 225,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: false,
  },
  {
    itemId: 13008,
    nameDe: 'Überlegene Rune der Taschenherstellung',
    nameEn: 'Superior Rune of Holding',
    costCopper: 20000,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 300,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: false,
  },
  {
    itemId: 13009,
    nameDe: 'Große Rune der Taschenherstellung',
    nameEn: 'Supreme Rune of Holding',
    costCopper: 100000,
    disciplines: ['Tailor', 'Leatherworker', 'Armorsmith'],
    minRank: 400,
    vendorNameDe: 'Meisterhandwerker',
    vendorNameEn: 'Master Craftsman',
    isAvailableOnTp: false,
  },

  // --- Chef Basics (Meisterkoch & Händler) ---
  {
    itemId: 12136,
    nameDe: 'Beutel Mehl',
    nameEn: 'Bag of Flour',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12156,
    nameDe: 'Krug Wasser',
    nameEn: 'Jug of Water',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12155,
    nameDe: 'Beutel Zucker',
    nameEn: 'Bag of Sugar',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12152,
    nameDe: 'Paket Hefe',
    nameEn: 'Packet of Yeast',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12158,
    nameDe: 'Glas Pflanzenöl',
    nameEn: 'Jar of Vegetable Oil',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12153,
    nameDe: 'Paket Salz',
    nameEn: 'Packet of Salt',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12151,
    nameDe: 'Paket Backpulver',
    nameEn: 'Packet of Baking Powder',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12157,
    nameDe: 'Flasche Essig',
    nameEn: 'Jar of Vinegar',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12159,
    nameDe: 'Käsestück',
    nameEn: 'Cheese Wedge',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12271,
    nameDe: 'Flasche Sojasoße',
    nameEn: 'Bottle of Soy Sauce',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12137,
    nameDe: 'Glas Buttermilch',
    nameEn: 'Glass of Buttermilk',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12145,
    nameDe: 'Reisbällchen',
    nameEn: 'Rice Ball',
    costCopper: 16,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12132,
    nameDe: 'Laib Brot',
    nameEn: 'Loaf of Bread',
    costCopper: 48,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Meisterkoch',
    vendorNameEn: 'Master Chef',
    isAvailableOnTp: true,
  },
  {
    itemId: 12144,
    nameDe: 'Schneetrüffel',
    nameEn: 'Snow Truffle',
    costCopper: 40,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Händler',
    vendorNameEn: 'Vendor',
    isAvailableOnTp: true,
  },
  {
    itemId: 19676,
    nameDe: 'Eisiger Runenstein',
    nameEn: 'Icy Runestone',
    costCopper: 10000,
    disciplines: ['Weaponsmith', 'Armorsmith', 'Artificer', 'Huntsman', 'Leatherworker', 'Tailor', 'Jeweler'],
    minRank: 400,
    vendorNameDe: 'Rojan der Reumütige',
    vendorNameEn: 'Rojan the Penitent',
    isAvailableOnTp: false,
  },

  // --- Chef Karma & Ingredient Vendors ---
  {
    itemId: 12138,
    nameDe: 'Butterstück',
    nameEn: 'Stick of Butter',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler (Meisterkoch)',
    vendorNameEn: 'Karma Vendor (Master Chef)',
    isAvailableOnTp: true,
  },
  {
    itemId: 12235,
    nameDe: 'Paprika',
    nameEn: 'Bell Pepper',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler (Meisterkoch)',
    vendorNameEn: 'Karma Vendor (Master Chef)',
    isAvailableOnTp: true,
  },
  {
    itemId: 12234,
    nameDe: 'Vanilleschote',
    nameEn: 'Vanilla Bean',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler (Meisterkoch)',
    vendorNameEn: 'Karma Vendor (Master Chef)',
    isAvailableOnTp: true,
  },
  {
    itemId: 12236,
    nameDe: 'Schwarzes Pfefferkorn',
    nameEn: 'Black Peppercorn',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler',
    vendorNameEn: 'Karma Vendor',
    isAvailableOnTp: true,
  },
  {
    itemId: 12248,
    nameDe: 'Thymianblatt',
    nameEn: 'Thyme Leaf',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler',
    vendorNameEn: 'Karma Vendor',
    isAvailableOnTp: true,
  },
  {
    itemId: 12246,
    nameDe: 'Petersilienblatt',
    nameEn: 'Parsley Leaf',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler',
    vendorNameEn: 'Karma Vendor',
    isAvailableOnTp: true,
  },
  {
    itemId: 12240,
    nameDe: 'Selleriestange',
    nameEn: 'Celery Stalk',
    costCopper: 14,
    costKarma: 35,
    disciplines: ['Chef'],
    minRank: 0,
    vendorNameDe: 'Karma-Händler',
    vendorNameEn: 'Karma Vendor',
    isAvailableOnTp: true,
  },
] as const;

/**
 * Fast lookup maps for Master Craftsman materials.
 */
const VENDOR_MATERIAL_BY_ID = new Map<number, VendorMaterialOffer>();
for (const m of MASTER_CRAFTSMAN_MATERIALS) {
  VENDOR_MATERIAL_BY_ID.set(m.itemId, m);
}

/**
 * Common Master Craftsman Recipe Sheets.
 * These recipes have the API flag `LearnedFromItem` and require buying a Recipe Sheet.
 */
export const MASTER_CRAFTSMAN_RECIPE_SHEETS: readonly VendorRecipeSheetOffer[] = [
  // --- Inscriptions (Weaponsmith, Huntsman, Artificer) ---
  {
    recipeId: 204,
    outputItemId: 19934,
    nameDe: 'Verheerende eisenbeschlagene Inschrift',
    nameEn: 'Ravaging Iron Imbued Inscription',
    discipline: 'Weaponsmith',
    minRank: 75,
    costCopper: 160,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },
  {
    recipeId: 205,
    outputItemId: 19935,
    nameDe: 'Verjüngende eisenbeschlagene Inschrift',
    nameEn: 'Rejuvenating Iron Imbued Inscription',
    discipline: 'Weaponsmith',
    minRank: 75,
    costCopper: 160,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },
  {
    recipeId: 211,
    outputItemId: 19941,
    nameDe: 'Verheerende stahlbeschlagene Inschrift',
    nameEn: 'Ravaging Steel Imbued Inscription',
    discipline: 'Weaponsmith',
    minRank: 150,
    costCopper: 320,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },
  {
    recipeId: 212,
    outputItemId: 19942,
    nameDe: 'Verjüngende stahlbeschlagene Inschrift',
    nameEn: 'Rejuvenating Steel Imbued Inscription',
    discipline: 'Weaponsmith',
    minRank: 150,
    costCopper: 320,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },
  {
    recipeId: 218,
    outputItemId: 19948,
    nameDe: 'Aasfressende dunkelstahlbeschlagene Inschrift',
    nameEn: 'Carrion Darksteel Imbued Inscription',
    discipline: 'Weaponsmith',
    minRank: 225,
    costCopper: 480,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },
  {
    recipeId: 219,
    outputItemId: 19949,
    nameDe: 'Klerikale dunkelstahlbeschlagene Inschrift',
    nameEn: "Cleric's Darksteel Imbued Inscription",
    discipline: 'Weaponsmith',
    minRank: 225,
    costCopper: 480,
    vendorNameDe: 'Meister-Waffenschmied',
    vendorNameEn: 'Master Weaponsmith',
  },

  // --- Insignias (Armorsmith, Leatherworker, Tailor) ---
  {
    recipeId: 225,
    outputItemId: 19955,
    nameDe: 'Verheerende aufwendige Woll-Insignie',
    nameEn: 'Ravaging Intricate Wool Insignia',
    discipline: 'Armorsmith',
    minRank: 75,
    costCopper: 160,
    vendorNameDe: 'Meister-Rüstungsschmied',
    vendorNameEn: 'Master Armorsmith',
  },
  {
    recipeId: 227,
    outputItemId: 19957,
    nameDe: 'Gewetzte aufwendige Woll-Insignie',
    nameEn: 'Honed Intricate Wool Insignia',
    discipline: 'Armorsmith',
    minRank: 75,
    costCopper: 160,
    vendorNameDe: 'Meister-Rüstungsschmied',
    vendorNameEn: 'Master Armorsmith',
  },
  {
    recipeId: 235,
    outputItemId: 19965,
    nameDe: 'Jägerische aufwendige Baumwoll-Insignie',
    nameEn: "Hunter's Intricate Cotton Insignia",
    discipline: 'Armorsmith',
    minRank: 150,
    costCopper: 320,
    vendorNameDe: 'Meister-Rüstungsschmied',
    vendorNameEn: 'Master Armorsmith',
  },
  {
    recipeId: 237,
    outputItemId: 19967,
    nameDe: 'Kräftige aufwendige Baumwoll-Insignie',
    nameEn: 'Vigorous Intricate Cotton Insignia',
    discipline: 'Armorsmith',
    minRank: 150,
    costCopper: 320,
    vendorNameDe: 'Meister-Rüstungsschmied',
    vendorNameEn: 'Master Armorsmith',
  },
] as const;

const VENDOR_RECIPE_BY_ID = new Map<number, VendorRecipeSheetOffer>();
for (const r of MASTER_CRAFTSMAN_RECIPE_SHEETS) {
  VENDOR_RECIPE_BY_ID.set(r.recipeId, r);
}

/**
 * Returns the vendor material offer if the item is sold by a Master Craftsman or NPC.
 */
export function getVendorMaterialOffer(itemId: number): VendorMaterialOffer | undefined {
  return VENDOR_MATERIAL_BY_ID.get(itemId);
}

/**
 * Returns the vendor recipe sheet offer if the recipe requires a sheet sold by Master Craftsman.
 */
export function getVendorRecipeSheetOffer(recipeId: number): VendorRecipeSheetOffer | undefined {
  return VENDOR_RECIPE_BY_ID.get(recipeId);
}

/**
 * Returns all item IDs sold by Master Craftsmen or NPC cooking vendors.
 */
export function getAllVendorItemIds(): number[] {
  return Array.from(VENDOR_MATERIAL_BY_ID.keys());
}

/**
 * Compares procurement options for a crafting ingredient:
 * Master Craftsman NPC vs. Trading Post Instant Buy vs. Trading Post Buy Order vs. Stock.
 *
 * Crucial rule: Never assume NPC is always cheaper or TP is always cheaper.
 * We calculate the actual prices dynamically!
 */
export function evaluateProcurement(
  itemId: number,
  tpPrice: PriceInfo | undefined,
  stockCount = 0,
): ProcurementEvaluation {
  const vendor = getVendorMaterialOffer(itemId);
  const vendorPrice = vendor ? vendor.costCopper : null;
  const tpSell = tpPrice && tpPrice.sell > 0 ? tpPrice.sell : null;
  const tpBuy = tpPrice && tpPrice.buy > 0 ? tpPrice.buy : null;

  // If in stock, calculate opportunity cost: what would the player net if they sold it on TP?
  // After 15% TP fees (5% listing + 10% exchange), net is floor(tpBuy * 0.85) or vendor value.
  const opportunityCost = tpBuy !== null ? Math.max(1, Math.floor(tpBuy * 0.85)) : (vendorPrice ?? 1);

  // Compare available cash buy options
  const buyCandidates: { method: ProcurementMethod; price: number }[] = [];
  if (vendorPrice !== null) {
    buyCandidates.push({ method: 'vendor', price: vendorPrice });
  }
  if (tpSell !== null) {
    buyCandidates.push({ method: 'tp_sell', price: tpSell });
  }

  buyCandidates.sort((a, b) => a.price - b.price);
  const bestCashOption = buyCandidates[0] ?? { method: 'tp_sell' as ProcurementMethod, price: tpSell ?? 0 };

  // If player has enough in stock, stock option has its opportunity cost
  if (stockCount > 0) {
    const savings = bestCashOption.price - opportunityCost;
    return {
      itemId,
      method: 'stock',
      unitPrice: opportunityCost,
      vendorPrice,
      tpSellPrice: tpSell,
      tpBuyPrice: tpBuy,
      savingsVsAlternative: Math.max(0, savings),
      rationaleDe: `Vorhanden im Inventar/Lager (Opp.-Kosten: ${opportunityCost}c vs. Neukauf: ${bestCashOption.price}c)`,
      rationaleEn: `In stock (Opp. cost: ${opportunityCost}c vs. purchase: ${bestCashOption.price}c)`,
    };
  }

  // No stock: compare Vendor vs TP
  if (vendorPrice !== null && tpSell !== null) {
    if (vendorPrice < tpSell) {
      const savings = tpSell - vendorPrice;
      return {
        itemId,
        method: 'vendor',
        unitPrice: vendorPrice,
        vendorPrice,
        tpSellPrice: tpSell,
        tpBuyPrice: tpBuy,
        savingsVsAlternative: savings,
        rationaleDe: `Kauf beim Meisterhandwerker günstiger als Handelsposten (-${savings}c pro Stück)`,
        rationaleEn: `Master Craftsman NPC is cheaper than Trading Post (-${savings}c each)`,
      };
    } else if (tpSell < vendorPrice) {
      const savings = vendorPrice - tpSell;
      return {
        itemId,
        method: 'tp_sell',
        unitPrice: tpSell,
        vendorPrice,
        tpSellPrice: tpSell,
        tpBuyPrice: tpBuy,
        savingsVsAlternative: savings,
        rationaleDe: `Handelsposten Sofortkauf ist günstiger als Händlerpreis (-${savings}c pro Stück)`,
        rationaleEn: `Trading Post instant buy is cheaper than NPC vendor (-${savings}c each)`,
      };
    } else {
      return {
        itemId,
        method: 'vendor',
        unitPrice: vendorPrice,
        vendorPrice,
        tpSellPrice: tpSell,
        tpBuyPrice: tpBuy,
        savingsVsAlternative: 0,
        rationaleDe: 'Händlerpreis und Handelsposten-Sofortkauf sind preisgleich',
        rationaleEn: 'Vendor price and Trading Post instant buy are identical',
      };
    }
  }

  if (vendorPrice !== null) {
    return {
      itemId,
      method: 'vendor',
      unitPrice: vendorPrice,
      vendorPrice,
      tpSellPrice: null,
      tpBuyPrice: null,
      savingsVsAlternative: 0,
      rationaleDe: 'Exklusiv beim Meisterhandwerker / Händler erhältlich',
      rationaleEn: 'Exclusively available at Master Craftsman / NPC vendor',
    };
  }

  return {
    itemId,
    method: 'tp_sell',
    unitPrice: tpSell ?? 0,
    vendorPrice: null,
    tpSellPrice: tpSell,
    tpBuyPrice: tpBuy,
    savingsVsAlternative: 0,
    rationaleDe: 'Beschaffung über Handelsposten',
    rationaleEn: 'Procured via Trading Post',
  };
}
