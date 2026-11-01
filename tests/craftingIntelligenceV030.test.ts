import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { PriceInfo, Recipe, GameItem } from '../src/domain/types.ts';
import { unitPrice } from '../src/domain/costs.ts';
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
import { CURATED_DISCOVERIES } from '../src/data/crafting/curatedDiscoveries.ts';
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

test('7.1 Max Cost Efficiency mode prioritizes bulk refinements at tier start (0-25)', () => {
  const recipes: Recipe[] = [
    {
      id: 'rec-bronze',
      outputId: 19679,
      outputCount: 1,
      kind: 'official',
      disciplines: ['Weaponsmith'],
      rating: 0,
      ingredients: [{ itemId: 19697, count: 2 }, { itemId: 19704, count: 1 }],
      source: 'official',
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
    {
      id: 'rec-shield-boss',
      outputId: 13000,
      outputCount: 1,
      kind: 'official',
      disciplines: ['Weaponsmith'],
      rating: 0,
      ingredients: [{ itemId: 19679, count: 2 }],
      source: 'official',
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'rec-shield',
      outputId: 15197,
      outputCount: 1,
      kind: 'official',
      disciplines: ['Weaponsmith'],
      rating: 0,
      ingredients: [{ itemId: 13000, count: 2 }, { itemId: 19887, count: 1 }],
      source: 'official',
      flags: ['AutoLearned'],
      type: 'Shield',
    },
  ];

  const byOut = new Map<number, Recipe[]>();
  recipes.forEach((r) => byOut.set(r.outputId, [r]));
  const prices = new Map<number, PriceInfo>([
    [19697, { sell: 20, buy: 15, sellQty: 100, buyQty: 100 }],
    [19704, { sell: 8, buy: 4, sellQty: 100, buyQty: 100 }],
    [19887, { sell: 200, buy: 150, sellQty: 100, buyQty: 100 }],
  ]);

  const planCost = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 20,
    recipes,
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
      mode: 'cost',
    },
  });

  assert.ok(planCost.steps.length > 0);
  assert.equal(planCost.steps[0].recipe.type, 'Refinement', 'Tier start in cost mode must choose Refinement over equipment');
  assert.equal(planCost.steps[0].recipe.outputId, 19679, 'Must refine Bronze Ingots at rank 0');
});

test('7.2 All 8 crafting disciplines run cleanly and sanely in Max Cost Efficiency mode', () => {
  const disciplines = [
    'Weaponsmith',
    'Armorsmith',
    'Huntsman',
    'Artificer',
    'Tailor',
    'Leatherworker',
    'Jeweler',
    'Chef',
  ] as const;

  // Build byOutput lookup from curated discoveries
  const byOut = new Map<number, Recipe[]>();
  for (const r of CURATED_DISCOVERIES) {
    const list = byOut.get(r.outputId) ?? [];
    list.push(r);
    byOut.set(r.outputId, list);
  }

  // Realistic fallback price map (10 copper each if not known)
  const prices = new Map<number, PriceInfo>();
  for (const r of CURATED_DISCOVERIES) {
    prices.set(r.outputId, { sell: 50, buy: 30, sellQty: 100, buyQty: 100 });
    for (const ing of r.ingredients) {
      prices.set(ing.itemId, { sell: 15, buy: 10, sellQty: 100, buyQty: 100 });
    }
  }

  for (const disc of disciplines) {
    const target = disc === 'Jeweler' ? 400 : 500;
    const plan = planLevelRoute({
      discipline: disc,
      fromRank: 0,
      toRank: target,
      recipes: CURATED_DISCOVERIES,
      recipesByOutput: byOut,
      prices,
      options: {
        allowDiscovery: true,
        craftIntermediates: true,
        mode: 'cost',
      },
    });
    assert.ok(plan, `Plan for ${disc} must compute without throwing`);

    // Verify overproduction guards:
    for (const step of plan.steps) {
      assert.ok(
        step.crafts <= 35,
        `Step for ${disc} (${step.recipe.type} rating ${step.recipe.rating} ranks ${step.fromRank}->${step.toRank}) crafts count ${step.crafts} must not exceed 35 (no runaways)`,
      );
    }

    // Verify shopping list totals: no item should have runaway requirements (e.g. 13,000 logs)
    for (const [itemId, qty] of plan.purchases) {
      assert.ok(
        qty < 2500,
        `Material ${itemId} in discipline ${disc} shopping quantity ${qty} must not exceed runaway threshold (screenshot had 13,992)`,
      );
    }
  }
});

test('7.3 README.md changelog is collapsible with <details> and shows at most 3 latest versions', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.ok(readme.includes('<details open>'));
  assert.ok(readme.includes('<summary><b>v0.3.1'));
  assert.ok(readme.includes('<summary><b>v0.3.0'));
  assert.ok(readme.includes('<summary><b>v0.2.9'));
  // Ensure older versions like v0.2.7 are NOT expanded as top-level sections
  assert.ok(!readme.includes('<summary><b>v0.2.7'));
});

test('8.1 Grouped Discovery & Subsequent Production unites discovery and repeat crafting without double counting', () => {
  const daggerRecipe: Recipe = {
    id: 'dagger-mighty-bronze',
    outputId: 11111,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 25,
    ingredients: [
      { itemId: 19679, count: 2 }, // Bronze Ingot
      { itemId: 12988, count: 1 }, // Mighty Bronze Inscription
    ],
    source: 'official',
    flags: [], // Undiscovered recipe!
    type: 'Dagger',
  };

  const byOut = new Map<number, Recipe[]>([[11111, [daggerRecipe]]]);
  const prices = new Map<number, PriceInfo>([
    [19679, { sell: 20, buy: 15, sellQty: 100, buyQty: 100 }],
    [12988, { sell: 50, buy: 35, sellQty: 100, buyQty: 100 }],
    [11111, { sell: 40, buy: 25, sellQty: 100, buyQty: 100 }],
  ]);

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 25,
    toRank: 35,
    recipes: [daggerRecipe],
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: false,
      mode: 'cost',
    },
  });

  // Exactly ONE grouped operation step must be generated
  assert.equal(plan.steps.length, 1, 'Discovery and repeat production must be unified into ONE step');
  const step = plan.steps[0];
  assert.equal(step.isDiscoveryCombined, true, 'Step must be flagged as combined discovery operation');
  assert.equal(step.needsDiscovery, true);
  assert.equal(step.discoveryCrafts, 1, 'Initial discovery must be exactly 1 craft');
  assert.ok(step.repeatCrafts !== undefined && step.repeatCrafts > 0, 'Must have repeat crafts');
  assert.equal(
    step.crafts,
    step.discoveryCrafts + step.repeatCrafts,
    'Total crafts must strictly equal discovery + repeat crafts',
  );

  // Material transparency without double counting:
  assert.ok(step.discoveryIngredients && step.discoveryIngredients.length === 2);
  assert.ok(step.repeatIngredients && step.repeatIngredients.length === 2);
  assert.equal(
    step.discoveryIngredients[0].qty,
    2, // 1x discovery * 2 Bronze Ingots
    'Discovery ingredients must reflect 1x craft',
  );
  assert.equal(
    step.repeatIngredients[0].qty,
    step.repeatCrafts * 2, // repeatCrafts * 2 Bronze Ingots
    'Repeat ingredients must reflect repeatCrafts count',
  );
  assert.equal(
    step.ingredients[0].qty,
    step.crafts * 2,
    'Combined ingredients must equal total crafts * per-craft count (zero double-counting)',
  );
  assert.equal(step.reasonKey, 'planner.reason.discoverAndCraft');
});

test('8.2 Discipline Maximum Ranks are enforced accurately (Jeweler 400)', () => {
  const jewelerRecipe: Recipe = {
    id: 'jeweler-exotic',
    outputId: 99999,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Jeweler'],
    rating: 375,
    ingredients: [{ itemId: 19685, count: 2 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Ring',
  };

  const byOut = new Map<number, Recipe[]>([[99999, [jewelerRecipe]]]);
  const prices = new Map<number, PriceInfo>([
    [19685, { sell: 100, buy: 80, sellQty: 100, buyQty: 100 }],
    [99999, { sell: 150, buy: 100, sellQty: 100, buyQty: 100 }],
  ]);

  const plan = planLevelRoute({
    discipline: 'Jeweler',
    fromRank: 400,
    toRank: 500, // Requesting beyond maximum
    recipes: [jewelerRecipe],
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  // Jeweler does not support ranks above 400 in GW2; planner must cap at 400 and not fabricate steps
  assert.equal(plan.steps.length, 0, 'No steps can be planned above Jeweler 400 cap');
});

test('8.3 Precursor weapon collection items and uncraftable account-bound components are excluded', () => {
  const precursorRecipe: Recipe = {
    id: 'cauterizer-rodgort',
    outputId: 50605,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 400,
    ingredients: [
      { itemId: 50342, count: 1 }, // 50342 Ineffable Inscription (unbuyable, uncraftable, not in stock)
      { itemId: 19712, count: 3 },
    ],
    source: 'official',
    flags: [],
    type: 'Weapon',
  };

  const items = new Map<number, GameItem>([
    [50605, { id: 50605, name: 'Handcrafted Cauterizer', rarity: 'Exotic' }],
  ]);

  const byOut = new Map<number, Recipe[]>([[50605, [precursorRecipe]]]);
  const prices = new Map<number, PriceInfo>([
    [19712, { sell: 200, buy: 150, sellQty: 100, buyQty: 100 }],
  ]);

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 425,
    toRank: 450,
    recipes: [precursorRecipe],
    recipesByOutput: byOut,
    prices,
    items,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
      mode: 'cost',
    },
  });

  // Precursor recipes must never be suggested as ordinary leveling steps!
  const hasPrecursorStep = plan.steps.some((s) => s.recipe.id === 'cauterizer-rodgort');
  assert.equal(hasPrecursorStep, false, 'Handcrafted Cauterizer precursor must be excluded from leveling route');
});

