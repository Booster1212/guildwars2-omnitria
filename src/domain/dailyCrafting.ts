/**
 * Domain logic and catalog for Guild Wars 2 Account Daily Crafting (timegated items).
 * Endpoint: /v2/account/dailycrafting (scope: progression)
 */
import type { PriceInfo } from './types.ts';
import { unitPrice } from './costs.ts';

export interface DailyCraftDefinition {
  id: string; // API string identifier returned by /v2/account/dailycrafting
  outputItemId: number; // Final tradable or usable product
  timegatedItemId: number; // Daily component created
  discipline: string;
  rating: number;
  nameEn: string;
  nameDe: string;
  descriptionEn: string;
  descriptionDe: string;
  waypoint?: string;
  category?: 'refinement' | 'special';
  ingredients: { itemId: number; count: number }[];
}

export const DAILY_CRAFT_ITEMS: DailyCraftDefinition[] = [
  {
    id: 'deldrimor_steel_ingot',
    outputItemId: 46738, // Deldrimor Steel Ingot
    timegatedItemId: 46742, // Lump of Mithrillium
    discipline: 'Armorsmith / Weaponsmith / Huntsman',
    rating: 450,
    nameEn: 'Lump of Mithrillium (Deldrimor Steel)',
    nameDe: 'Brocken Mithrillium (Deldrimor-Stahl)',
    descriptionEn: 'Refined into Deldrimor Steel Ingot. Requires 50 Mithril Ingots, 1 Glob of Ectoplasm, 1 Thermocatalytic Reagent.',
    descriptionDe: 'Wird zu Deldrimor-Stahlbarren verarbeitet. Benötigt 50 Mithrilbarren, 1 Ektoplasmakugel, 1 Thermokatalytisches Reagenz.',
    category: 'refinement',
    ingredients: [
      { itemId: 19684, count: 50 }, // Mithril Ingot
      { itemId: 19721, count: 1 },  // Glob of Ectoplasm
      { itemId: 46747, count: 1 },  // Thermocatalytic Reagent
    ],
  },
  {
    id: 'bolt_of_damask',
    outputItemId: 46741, // Bolt of Damask
    timegatedItemId: 46740, // Spool of Silk Weaving Thread
    discipline: 'Tailor / Armorsmith / Leatherworker',
    rating: 450,
    nameEn: 'Spool of Silk Weaving Thread (Damask)',
    nameDe: 'Spule Seidenwebfaden (Damast)',
    descriptionEn: 'Refined into Bolt of Damask. Requires 100 Bolts of Silk, 1 Glob of Ectoplasm, 1 Thermocatalytic Reagent.',
    descriptionDe: 'Wird zu Damastballen verarbeitet. Benötigt 100 Seidenballen, 1 Ektoplasmakugel, 1 Thermokatalytisches Reagenz.',
    category: 'refinement',
    ingredients: [
      { itemId: 19748, count: 100 }, // Bolt of Silk
      { itemId: 19721, count: 1 },   // Glob of Ectoplasm
      { itemId: 46747, count: 1 },   // Thermocatalytic Reagent
    ],
  },
  {
    id: 'elonian_leather_square',
    outputItemId: 46739, // Elonian Leather Square
    timegatedItemId: 46745, // Spool of Thick Elonian Cord
    discipline: 'Leatherworker / Armorsmith / Tailor',
    rating: 450,
    nameEn: 'Spool of Thick Elonian Cord (Elonian Leather)',
    nameDe: 'Spule dicke elonische Kordel (Elonisches Leder)',
    descriptionEn: 'Refined into Elonian Leather Square. Requires 50 Cured Thick Leather Squares, 1 Glob of Ectoplasm, 1 Thermocatalytic Reagent.',
    descriptionDe: 'Wird zu Elonischem Lederflicken verarbeitet. Benötigt 50 Gehärtete dicke Lederflicken, 1 Ektoplasmakugel, 1 Thermokatalytisches Reagenz.',
    category: 'refinement',
    ingredients: [
      { itemId: 19729, count: 50 }, // Cured Thick Leather Square
      { itemId: 19721, count: 1 },  // Glob of Ectoplasm
      { itemId: 46747, count: 1 },  // Thermocatalytic Reagent
    ],
  },
  {
    id: 'spiritwood_plank',
    outputItemId: 46736, // Spiritwood Plank
    timegatedItemId: 46744, // Glob of Elder Spirit Residue
    discipline: 'Artificer / Huntsman / Weaponsmith',
    rating: 450,
    nameEn: 'Glob of Elder Spirit Residue (Spiritwood)',
    nameDe: 'Kugel uralter Geisterüberreste (Geistholz)',
    descriptionEn: 'Refined into Spiritwood Plank. Requires 50 Elder Wood Planks, 1 Glob of Ectoplasm, 1 Thermocatalytic Reagent.',
    descriptionDe: 'Wird zu Geistholz-Planke verarbeitet. Benötigt 50 Altholz-Planken, 1 Ektoplasmakugel, 1 Thermokatalytisches Reagenz.',
    category: 'refinement',
    ingredients: [
      { itemId: 19709, count: 50 }, // Elder Wood Plank
      { itemId: 19721, count: 1 },  // Glob of Ectoplasm
      { itemId: 46747, count: 1 },  // Thermocatalytic Reagent
    ],
  },
  {
    id: 'charged_quartz_crystal',
    outputItemId: 43772, // Charged Quartz Crystal
    timegatedItemId: 43772,
    discipline: 'Place of Power',
    rating: 0,
    nameEn: 'Charged Quartz Crystal',
    nameDe: 'Aufgeladener Quarzkristall',
    descriptionEn: 'Fused at any open-world Place of Power / Hero Challenge from 25 Quartz Crystals.',
    descriptionDe: 'Wird an einem beliebigen Ort der Macht / Heldenherausforderung aus 25 Quarzkristallen aufgeladen.',
    waypoint: '[&BCEDAAA=]', // Lion's Arch
    category: 'special',
    ingredients: [
      { itemId: 43773, count: 25 }, // Quartz Crystal
    ],
  },
  {
    id: 'grow_lamp',
    outputItemId: 66993, // Grow Lamp
    timegatedItemId: 66993,
    discipline: 'Jeweler',
    rating: 400,
    nameEn: 'Grow Lamp (Dry Top / Mawdrey)',
    nameDe: 'Wachstumslampe (Trockenkuppe / Mawdrey)',
    descriptionEn: 'Used for Mawdrey crafting and ascended collections. Crafted once per day.',
    descriptionDe: 'Für Mawdrey und aufgestiegene Sammlungen. Einmal täglich herstellbar.',
    category: 'special',
    ingredients: [
      { itemId: 43772, count: 1 },  // Charged Quartz Crystal
      { itemId: 19685, count: 10 }, // Orichalcum Ingot
      { itemId: 24522, count: 10 }, // Sunstone Nugget
    ],
  },
  {
    id: 'clay_pot',
    outputItemId: 66913, // Clay Pot
    timegatedItemId: 66913,
    discipline: 'Artificer',
    rating: 400,
    nameEn: 'Clay Pot',
    nameDe: 'Tontopf',
    descriptionEn: 'Formed from 25 Bricks of Clay at an Artificer station. Once per day.',
    descriptionDe: 'Wird aus 25 Tonziegeln an einer Konstrukteur-Station geformt. Einmal täglich.',
    category: 'special',
    ingredients: [
      { itemId: 66900, count: 25 }, // Brick of Clay
    ],
  },
  {
    id: 'heat_stone',
    outputItemId: 67015, // Heat Stone
    timegatedItemId: 67015,
    discipline: 'Armorsmith',
    rating: 400,
    nameEn: 'Heat Stone',
    nameDe: 'Hitzestein',
    descriptionEn: 'Daily heat stone forged with thermocatalytic reagents and elemental cores.',
    descriptionDe: 'Täglicher Hitzestein, geschmiedet mit Thermokatalytischen Reagenzien und Elementarkernen.',
    category: 'special',
    ingredients: [
      { itemId: 46747, count: 1 }, // Thermocatalytic Reagent
      { itemId: 19925, count: 1 }, // Obsidian Shard
    ],
  },
  {
    id: 'plate_of_meaty_plant_food',
    outputItemId: 66917, // Plate of Meaty Plant Food
    timegatedItemId: 66917,
    discipline: 'Huntsman',
    rating: 400,
    nameEn: 'Plate of Meaty Plant Food',
    nameDe: 'Teller mit fleischiger Pflanzennahrung',
    descriptionEn: 'Prepared daily with venoms and bones for Mawdrey cultivation.',
    descriptionDe: 'Täglich mit Giften und Knochen für die Aufzucht von Mawdrey zubereitet.',
    category: 'special',
    ingredients: [
      { itemId: 24294, count: 2 }, // Potent Venom Sac
      { itemId: 24295, count: 2 }, // Vial of Potent Blood
      { itemId: 24341, count: 2 }, // Large Bone
      { itemId: 24357, count: 2 }, // Pile of Incandescent Dust
    ],
  },
];

export function isDailyCraftCompleted(id: string, completedSet: ReadonlySet<string> | null | undefined): boolean {
  if (!completedSet) return false;
  return completedSet.has(id);
}

export function getDailyCraftSummary(completedSet: ReadonlySet<string> | null | undefined): {
  total: number;
  completed: number;
  remaining: number;
} {
  const total = DAILY_CRAFT_ITEMS.length;
  if (!completedSet) return { total, completed: 0, remaining: total };
  let completed = 0;
  for (const item of DAILY_CRAFT_ITEMS) {
    if (completedSet.has(item.id)) completed++;
  }
  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
  };
}

/**
 * Calculates estimated net market value and profit margin for a daily craft item.
 * Evaluates sell price of the output minus raw ingredient prices.
 */
export function calculateDailyCraftProfit(
  def: DailyCraftDefinition,
  prices: ReadonlyMap<number, PriceInfo>,
): {
  outputValue: number | null;
  ingredientCost: number | null;
  estimatedProfit: number | null;
} {
  const outP = prices.get(def.outputItemId);
  const outputValue = outP ? (outP.sell > 0 ? outP.sell : outP.buy) : null;

  let ingredientCost: number | null = 0;
  for (const ing of def.ingredients) {
    const p = unitPrice(prices.get(ing.itemId), ing.itemId);
    if (p === null) {
      ingredientCost = null;
      break;
    }
    ingredientCost += p * ing.count;
  }

  const estimatedProfit =
    outputValue !== null && ingredientCost !== null
      ? Math.round(outputValue * 0.85 - ingredientCost) // 15% TP transaction fee deduction
      : null;

  return {
    outputValue,
    ingredientCost,
    estimatedProfit,
  };
}

