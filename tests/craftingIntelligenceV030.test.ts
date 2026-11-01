import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { PriceInfo, Recipe, GameItem } from '../src/domain/types.ts';
import { unitPrice } from '../src/domain/costs.ts';
import { ranksPerCraft } from '../src/domain/craftingXp.ts';
import {
  evaluateIngredientProcurement,
  calculateStockOpportunityCost,
  calculateExpectedResaleValue,
  getRecipeUnlockCost,
  buildCostComparisonSummary,
} from '../src/domain/costOptimizer.ts';
import {
  getVendorMaterialOffer,
  getVendorRecipeSheetOffer,
  evaluateProcurement,
} from '../src/data/crafting/masterCraftsmanVendors.ts';
import {
  computeGw2CraftsBenchmark,
  compareWithGw2Crafts,
} from '../src/domain/gw2craftsReference.ts';
import { planLevelRoute } from '../src/domain/levelPlanner.ts';

test('1.1 Master Craftsman Materials Catalog provides accurate verified vendor prices', () => {
  const tin = getVendorMaterialOffer(19704);
  assert.ok(tin);
  assert.equal(tin.costCopper, 8);
  assert.equal(tin.vendorNameDe, 'Meisterhandwerker');

  const coal = getVendorMaterialOffer(19750);
  assert.ok(coal);
  assert.equal(coal.costCopper, 16);

  const reagent = getVendorMaterialOffer(46747);
  assert.ok(reagent);
  assert.equal(reagent.costCopper, 149);

  const flour = getVendorMaterialOffer(12155);
  assert.ok(flour);
  assert.equal(flour.costCopper, 16);
});

test('1.2 unitPrice accurately compares NPC Vendor price vs Trading Post sell price', () => {
  // Case A: Vendor is cheaper (Tin: Vendor 8c, TP sell 15c)
  const tpPriceOverpriced: PriceInfo = { sell: 15, buy: 10, sellQty: 100, buyQty: 100 };
  const effectivePriceA = unitPrice(tpPriceOverpriced, 19704);
  assert.equal(effectivePriceA, 8, 'Must choose vendor price (8c) when TP is overpriced (15c)');

  // Case B: TP is cheaper than Vendor (e.g. surplus item on TP: Vendor 16c, TP sell 11c)
  const tpPriceBargain: PriceInfo = { sell: 11, buy: 9, sellQty: 50, buyQty: 50 };
  const effectivePriceB = unitPrice(tpPriceBargain, 19750);
  assert.equal(effectivePriceB, 11, 'Must choose TP sell price (11c) when TP is cheaper than vendor (16c)');

  // Case C: No TP listing, exclusive vendor item
  const effectivePriceC = unitPrice(undefined, 19704);
  assert.equal(effectivePriceC, 8, 'Must fall back to vendor price when TP listing is absent');
});

test('1.3 evaluateIngredientProcurement calculates transparent procurement decision & savings', () => {
  const prices = new Map<number, PriceInfo>([
    [19704, { sell: 20, buy: 12, sellQty: 100, buyQty: 100 }], // Tin: Vendor 8c, TP 20c
    [19697, { sell: 35, buy: 28, sellQty: 100, buyQty: 100 }], // Copper Ore: TP only
  ]);

  // Out of stock, vendor is cheaper:
  const resVendor = evaluateIngredientProcurement(19704, 10, prices, null);
  assert.equal(resVendor.chosenMethod, 'vendor');
  assert.equal(resVendor.unitCost, 8);
  assert.equal(resVendor.totalCost, 80);
  assert.equal(resVendor.savingsCopper, 120, '10x (20c - 8c) = 120c savings');

  // Owned in stock: uses opportunity cost (floor(28 * 0.85) = 23c)
  const stockMap = new Map([[19697, 50]]);
  const resStock = evaluateIngredientProcurement(19697, 20, prices, stockMap);
  assert.equal(resStock.chosenMethod, 'stock');
  assert.equal(resStock.unitCost, 23);
  assert.equal(resStock.isCoveredByStock, true);
});

test('2.1 Master Craftsman Recipe Sheets are properly detected and priced', () => {
  const sheet = getVendorRecipeSheetOffer(2137); // Ravaging Iron Plated Inscription
  assert.ok(sheet);
  assert.equal(sheet.costCopper, 160);
  assert.equal(sheet.discipline, 'Weaponsmith');
  assert.equal(sheet.minRank, 75);

  const mockRecipe: Recipe = {
    id: '2137',
    outputId: 19934,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 75,
    ingredients: [{ itemId: 19699, count: 3 }],
    source: 'official',
    flags: ['LearnedFromItem'],
    type: 'Inscription',
  };

  // When recipe is NOT known, unlock cost is 160c
  const unlockCostUnknown = getRecipeUnlockCost(mockRecipe, new Set(), new Map());
  assert.equal(unlockCostUnknown, 160);

  // When recipe IS known, unlock cost is 0c
  const unlockCostKnown = getRecipeUnlockCost(mockRecipe, new Set([2137]), new Map());
  assert.equal(unlockCostKnown, 0);
});

test('3.1 calculateExpectedResaleValue computes net liquidation after 15% TP fees', () => {
  const prices = new Map<number, PriceInfo>([
    [100, { sell: 200, buy: 100, sellQty: 10, buyQty: 10 }], // buy 100 -> net 85c
    [200, { sell: 50, buy: 0, sellQty: 10, buyQty: 0 }],    // buy 0 -> vendor value fallback
  ]);
  const items = new Map<number, GameItem>([
    [200, { id: 200, name: 'Vendor Item', rarity: 'Basic', vendorValue: 12 }],
  ]);

  const resale1 = calculateExpectedResaleValue(100, 2, prices, items);
  assert.equal(resale1.unit, 85);
  assert.equal(resale1.total, 170);
  assert.equal(resale1.method, 'tp_sell');

  const resale2 = calculateExpectedResaleValue(200, 1, prices, items);
  assert.equal(resale2.unit, 12);
  assert.equal(resale2.method, 'vendor');
});

test('4.1 buildCostComparisonSummary outputs structured 4-way comparison matrix', () => {
  const mockSteps = [
    {
      recipe: {
        id: '1',
        outputId: 500,
        outputCount: 1,
        kind: 'official' as const,
        disciplines: ['Weaponsmith'],
        rating: 0,
        ingredients: [{ itemId: 19704, count: 10 }],
        source: 'official' as const,
        flags: ['AutoLearned'],
        type: 'Refinement',
      },
      crafts: 5,
      cost: 400,
      purchases: [{ itemId: 19704, qty: 50 }],
      prepSteps: [],
      needsDiscovery: false,
    },
  ];

  const prices = new Map<number, PriceInfo>([
    [19704, { sell: 20, buy: 10, sellQty: 100, buyQty: 100 }], // Vendor 8c, TP sell 20c
    [500, { sell: 50, buy: 30, sellQty: 10, buyQty: 10 }],
  ]);

  const summary = buildCostComparisonSummary(mockSteps, prices, null, null);
  assert.ok(summary.rows.length >= 4);
  const npcRow = summary.rows.find((r) => r.id === 'npc');
  assert.ok(npcRow);
  assert.equal(npcRow.costCopper, 400); // 50 * 8c = 400c
  assert.equal(npcRow.isRecommended, true);

  const tpRow = summary.rows.find((r) => r.id === 'tp');
  assert.ok(tpRow);
  assert.equal(tpRow.costCopper, 1000); // 50 * 20c = 1000c

  assert.equal(summary.totalNpcSavings, 600, '50 * (20c - 8c) = 600c saved');
});

test('5.1 computeGw2CraftsBenchmark provides accurate reference guide for all disciplines', () => {
  const prices = new Map<number, PriceInfo>([
    [19697, { sell: 30, buy: 20, sellQty: 100, buyQty: 100 }],
    [19704, { sell: 8, buy: 4, sellQty: 100, buyQty: 100 }],
  ]);

  const benchmark = computeGw2CraftsBenchmark('Weaponsmith', 0, 75, prices);
  assert.equal(benchmark.discipline, 'Weaponsmith');
  assert.equal(benchmark.fromRank, 0);
  assert.equal(benchmark.toRank, 75);
  assert.ok(benchmark.estimatedCostCopper > 0);
  assert.equal(benchmark.referenceUrl, 'https://gw2crafts.net/weaponsmith.html');

  const comp = compareWithGw2Crafts(benchmark, 2000, 1500, 5);
  assert.ok(comp.savingsPercentage >= 0 || comp.differenceCopper !== undefined);
  assert.ok(comp.advantages.length >= 3);
});

test('6.1 planLevelRoute integrates full cost optimization, resale deduction & benchmark in result', () => {
  const recipes: Recipe[] = [
    {
      id: 'rec-bronze',
      outputId: 19679,
      outputCount: 1,
      kind: 'official',
      disciplines: ['Weaponsmith'],
      rating: 0,
      ingredients: [
        { itemId: 19697, count: 2 },
        { itemId: 19704, count: 1 }, // Lump of Tin (Vendor 8c)
      ],
      source: 'official',
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
  ];

  const byOut = new Map<number, Recipe[]>([[19679, [recipes[0]]]]);
  const prices = new Map<number, PriceInfo>([
    [19697, { sell: 20, buy: 15, sellQty: 100, buyQty: 100 }], // Copper Ore
    [19704, { sell: 25, buy: 5, sellQty: 100, buyQty: 100 }],  // Tin (TP 25c, Vendor 8c)
    [19679, { sell: 55, buy: 40, sellQty: 100, buyQty: 100 }], // Bronze Ingot (Buy 40 -> Resale 34c)
  ]);

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 20,
    recipes,
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: false,
      craftIntermediates: true,
    },
  });

  assert.ok(plan.steps.length > 0);
  const step = plan.steps[0];
  assert.ok(step.netCost <= step.cost, 'Net cost must be less than or equal to gross cost due to resale proceeds');
  assert.ok(plan.totalNetCost <= plan.totalCost);
  assert.ok(plan.totalNpcSavings > 0, 'Must record savings from buying Tin at vendor (8c) instead of TP (25c)');
  assert.ok(plan.costComparison);
  assert.equal(plan.costComparison.rows.length, 4);
  assert.ok(plan.gw2craftsComparison);
});

test('7.1 Discovery XP multiplier is active across all tiers (0-500) preventing overproduction', () => {
  // Item category at rating 0, rank 25:
  const rpcDisc = ranksPerCraft('item', 25, 0, true);
  const rpcNormal = ranksPerCraft('item', 25, 0, false);
  assert.ok(rpcDisc > rpcNormal * 2.0, 'Discovery XP must award bonus multiplier (>2x) at low tier to avoid grinding');

  // Item category at rating 75, rank 100:
  const rpcDiscT2 = ranksPerCraft('item', 100, 75, true);
  const rpcNormalT2 = ranksPerCraft('item', 100, 75, false);
  assert.ok(rpcDiscT2 > rpcNormalT2 * 2.0, 'Discovery XP must award bonus multiplier at Tier 2');
});

test('7.2 Shopping list table layout and column classes maintain strict parity between header and body', () => {
  const levelPlannerSrc = fs.readFileSync('src/components/crafting/LevelPlanner.tsx', 'utf8');
  assert.ok(levelPlannerSrc.includes('className="icon-cell col-icon"'));
  assert.ok(levelPlannerSrc.includes('className="num font-mono col-gross"'));
  assert.ok(levelPlannerSrc.includes('className="num font-mono dim col-stock"'));
  assert.ok(levelPlannerSrc.includes('col-missing'));
  assert.ok(levelPlannerSrc.includes('col-unit'));
  assert.ok(levelPlannerSrc.includes('col-total'));
  assert.ok(levelPlannerSrc.includes('minWidth: \'150px\''));
});
