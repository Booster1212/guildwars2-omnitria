import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLevelRoute } from '../src/domain/levelPlanner.ts';
import { calculateCraftingPlan, createDisciplineRecipeProvider } from '../src/domain/craftingCalculator.ts';
import { KNOWN_VENDOR_PRICES } from '../src/domain/costs.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';

/**
 * Builds a realistic synthetic recipe ecosystem with authentic 25-rank sub-brackets.
 */
function buildAuditRecipeEcosystem(discipline = 'Weaponsmith') {
  const recipes: Recipe[] = [];
  const byOutput = new Map<number, Recipe[]>();
  const prices = new Map<number, PriceInfo>();

  const subRanks = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475];

  for (const rating of subRanks) {
    const rawId = Math.floor(rating / 75) * 100 + 10;
    const refinedId = Math.floor(rating / 75) * 100 + 50;
    const compId = rating * 10 + 1;
    const wepAutoId = rating * 10 + 2;

    // Refinement only at tier starts (0, 75, 150, 225, 300, 400)
    if (rating % 75 === 0 || rating === 400) {
      const rRefine: Recipe = {
        id: `${discipline}-ref-${rating}`,
        outputId: refinedId,
        outputCount: 1,
        disciplines: [discipline],
        rating,
        ingredients: [{ itemId: rawId, count: 2 }],
        flags: ['AutoLearned'],
        type: 'Refinement',
      };
      recipes.push(rRefine);
      byOutput.set(refinedId, [rRefine]);
      prices.set(rawId, { sell: 20, buy: 15 } as PriceInfo);
      prices.set(refinedId, { sell: 55, buy: 45 } as PriceInfo);
    }

    // Component at each 25-rank bracket
    const rComp: Recipe = {
      id: `${discipline}-comp-${rating}`,
      outputId: compId,
      outputCount: 1,
      disciplines: [discipline],
      rating,
      ingredients: [{ itemId: refinedId, count: 2 }],
      flags: ['AutoLearned'],
      type: 'Component',
    };
    recipes.push(rComp);
    byOutput.set(compId, [rComp]);
    prices.set(compId, { sell: 120, buy: 100 } as PriceInfo);

    // AutoLearned Weapon
    const rWepAuto: Recipe = {
      id: `${discipline}-wep-auto-${rating}`,
      outputId: wepAutoId,
      outputCount: 1,
      disciplines: [discipline],
      rating,
      ingredients: [{ itemId: compId, count: 2 }],
      flags: ['AutoLearned'],
      type: 'Weapon',
    };
    recipes.push(rWepAuto);
    byOutput.set(wepAutoId, [rWepAuto]);
    prices.set(wepAutoId, { sell: 300, buy: 250 } as PriceInfo);

    // Discovery Weapons (3 per sub-bracket)
    for (let d = 0; d < 3; d++) {
      const discId = rating * 10 + 3 + d;
      const rWepDisc: Recipe = {
        id: `${discipline}-wep-disc-${rating}-${d}`,
        outputId: discId,
        outputCount: 1,
        disciplines: [discipline],
        rating,
        ingredients: [{ itemId: compId, count: 2 }],
        flags: [],
        type: 'Weapon',
      };
      recipes.push(rWepDisc);
      byOutput.set(discId, [rWepDisc]);
      prices.set(discId, { sell: 300, buy: 250 } as PriceInfo);
    }
  }

  // Exotic Tier 400–500 discoveries
  for (let i = 0; i < 35; i++) {
    const exoId = 9000 + i;
    const rExo: Recipe = {
      id: `${discipline}-exo-${i}`,
      outputId: exoId,
      outputCount: 1,
      disciplines: [discipline],
      rating: 400,
      ingredients: [{ itemId: 4001, count: 2 }], // uses rank 400 component
      flags: [],
      type: 'Weapon',
    };
    recipes.push(rExo);
    byOutput.set(exoId, [rExo]);
    prices.set(exoId, { sell: 2000, buy: 1500 } as PriceInfo);
  }

  return { recipes, byOutput, prices };
}

// ============================================================================
// SCENARIO 1: Profession 0–400 with Empty Inventory
// ============================================================================
test('Scenario 1: Profession 0-400 empty inventory across all three modes', () => {
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  const planA = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 400,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'buy_everything', allowDiscovery: true },
  });

  const planB = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 400,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'craft_everything', allowDiscovery: true },
  });

  const planC = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 400,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid', allowDiscovery: true },
  });

  assert.equal(planA.gaps.length, 0, 'Mode A must have 0 gaps');
  assert.equal(planB.gaps.length, 0, 'Mode B must have 0 gaps');
  assert.equal(planC.gaps.length, 0, 'Mode C must have 0 gaps');

  // Mode A: Buy Everything invariant -> prepSteps must be EMPTY for buyable items
  for (const st of planA.steps) {
    assert.equal(st.prepSteps.length, 0, `Mode A must not generate prepSteps for step ${st.key}`);
  }

  // Mode B: Craft Everything invariant -> prepSteps exist for multi-tier components
  const hasPrepB = planB.steps.some((st) => st.prepSteps.length > 0);
  assert.ok(hasPrepB, 'Mode B must generate intermediate prepSteps');

  // 7-tier Material Accounting exists and is populated
  assert.ok(planA.materials.length > 0, 'Plan A has materials');
  assert.ok(planB.materials.length > 0, 'Plan B has materials');
  assert.ok(planC.materials.length > 0, 'Plan C has materials');
});

// ============================================================================
// SCENARIO 2: Profession 400–500 with Empty Inventory
// ============================================================================
test('Scenario 2: Profession 400-500 empty inventory with authentic discovery XP', () => {
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 400,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid', allowDiscovery: true },
  });

  assert.equal(plan.gaps.length, 0, 'Must level from 400 to 500 without gaps');
  for (const st of plan.steps) {
    assert.ok(st.fromRank >= 400, `Step ${st.key} must be at rank >= 400`);
    assert.ok(st.recipe.rating >= 400, `Recipe ${st.recipe.id} must be rating >= 400`);
  }
  assert.ok(plan.steps.length > 0, 'Generated steps');
});

// ============================================================================
// SCENARIO 3: Starting Level 450 (450–500)
// ============================================================================
test('Scenario 3: Starting level 450 (450-500) only crafts high tier recipes', () => {
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 450,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid', allowDiscovery: true },
  });

  assert.equal(plan.gaps.length, 0);
  for (const st of plan.steps) {
    assert.ok(st.fromRank >= 450, `Step fromRank ${st.fromRank} must be >= 450`);
    assert.ok(st.toRank <= 500, `Step toRank ${st.toRank} must be <= 500`);
  }
});

// ============================================================================
// SCENARIO 4: Large Raw Material Inventory
// ============================================================================
test('Scenario 4: Large raw material inventory', () => {
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  // Stock has 1000 raw iron ore (itemId 10), 0 refined ingots (itemId 50)
  const stock = new Map<number, number>([[10, 1000]]);

  const planA = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 75,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'buy_everything', stock },
  });

  const planB = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 75,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'craft_everything', stock },
  });

  // Mode A: Does NOT manufacture Refined Ingots from raw ore when Refined Ingots are needed
  for (const st of planA.steps) {
    assert.equal(st.prepSteps.length, 0, 'Mode A must have 0 prepSteps');
  }

  // Mode B: Consumes raw ore to manufacture Refined Ingots, consuming from stock
  const rawMatB = planB.materials.find((m) => m.itemId === 10);
  assert.ok(rawMatB);
  assert.ok(rawMatB.stockConsumed > 0, 'Mode B must consume owned raw ore from inventory');
});

// ============================================================================
// SCENARIO 5: Large Intermediate Product Inventory (Intermediate Inventory Blindness Fix)
// ============================================================================
test('Scenario 5: Large intermediate product inventory (Fixes Blindness)', () => {
  // Test from rank 25 to 50, where Weapon requires Component (compId 251), which requires Refined Ingot (refinedId 50)
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  // Player owns 200 of Refined Ingot (refinedId 50), 0 of raw ore (rawId 10)
  const stock = new Map<number, number>([[50, 200]]);

  const planB = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 25,
    toRank: 50,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'craft_everything', stock },
  });

  // The owned Refined Ingot (itemId 50) must be consumed directly from stock
  const ingMat = planB.materials.find((m) => m.itemId === 50);
  assert.ok(ingMat, 'Refined Ingot must be in materials ledger');
  assert.ok(ingMat.stockConsumed > 0, 'Refined Ingot stock must be consumed');

  // Since player owns 200 Refined Ingots (exceeding the ~112 needed), no raw ore (itemId 10) should be bought for them!
  const rawMat = planB.materials.find((m) => m.itemId === 10);
  const rawBought = rawMat ? rawMat.remainingToBuy : 0;
  assert.equal(rawBought, 0, 'No raw ore should be bought when intermediate stock covers requirements');
});

// ============================================================================
// SCENARIO 6: No Owned Materials (7-Tier Accounting)
// ============================================================================
test('Scenario 6: No owned materials adheres to strict 7-tier accounting', () => {
  const { recipes, byOutput, prices } = buildAuditRecipeEcosystem();

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 75,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid', stock: new Map() },
  });

  for (const m of plan.materials) {
    assert.equal(m.ownedStock, 0, `Item ${m.itemId} ownedStock must be 0`);
    assert.equal(m.stockConsumed, 0, `Item ${m.itemId} stockConsumed must be 0`);
    assert.equal(m.netDeficit, m.grossDemand, `Item ${m.itemId} netDeficit must equal grossDemand`);
    if (m.action === 'buy') {
      assert.equal(m.remainingToBuy, m.netDeficit, `Item ${m.itemId} remainingToBuy must equal netDeficit`);
    }
  }
});

// ============================================================================
// SCENARIO 7: Expensive Intermediate Products
// ============================================================================
test('Scenario 7: Expensive intermediate products (Mode C chooses craft)', () => {
  // Intermediate (itemId 100) sells on TP for 10,000 copper.
  // Raw material (itemId 10) sells for 10 copper. Recipe: 2x 10 -> 1x 100 (craft cost = 20 copper).
  const rRefine: Recipe = {
    id: 'exp-refine',
    outputId: 100,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rFinal: Recipe = {
    id: 'exp-final',
    outputId: 500,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 20,
    ingredients: [{ itemId: 100, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Component',
  };

  const prices = new Map<number, PriceInfo>([
    [10, { sell: 10, buy: 8 } as PriceInfo],
    [100, { sell: 10_000, buy: 8_000 } as PriceInfo],
    [500, { sell: 30_000, buy: 20_000 } as PriceInfo],
  ]);

  const byOutput = new Map<number, Recipe[]>([
    [100, [rRefine]],
    [500, [rFinal]],
  ]);

  const planC = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 20,
    toRank: 40,
    recipes: [rRefine, rFinal],
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid' },
  });

  // Mode C should craft itemId 100 instead of paying 10,000 copper!
  const purchasesC = Array.from(planC.purchases.keys());
  assert.ok(purchasesC.includes(10), 'Mode C must buy cheap raw materials');
  assert.ok(!purchasesC.includes(100), 'Mode C must NOT buy ridiculously expensive intermediate');
});

// ============================================================================
// SCENARIO 8: Cheap Intermediate Products (Dumping on TP)
// ============================================================================
test('Scenario 8: Cheap intermediate products (Mode C chooses buy to save gold)', () => {
  // Intermediate (itemId 100) sells on TP for 5 copper (dumping).
  // Raw materials (itemId 10) sell for 500 copper each. Recipe: 2x 10 -> 1x 100 (craft cost = 1000 copper).
  const rRefine: Recipe = {
    id: 'cheap-refine',
    outputId: 100,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rFinal: Recipe = {
    id: 'cheap-final',
    outputId: 500,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 20,
    ingredients: [{ itemId: 100, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Component',
  };

  const prices = new Map<number, PriceInfo>([
    [10, { sell: 500, buy: 400 } as PriceInfo],
    [100, { sell: 5, buy: 4 } as PriceInfo], // Huge bargain on TP!
    [500, { sell: 2000, buy: 1500 } as PriceInfo],
  ]);

  const byOutput = new Map<number, Recipe[]>([
    [100, [rRefine]],
    [500, [rFinal]],
  ]);

  const planC = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 20,
    toRank: 40,
    recipes: [rRefine, rFinal],
    recipesByOutput: byOutput,
    prices,
    options: { strategy: 'optimal_hybrid' },
  });

  // Mode C should buy itemId 100 directly for 5 copper and save hundreds of copper!
  const purchasesC = Array.from(planC.purchases.keys());
  assert.ok(purchasesC.includes(100), 'Mode C must buy cheap intermediate on TP');
  assert.ok(!purchasesC.includes(10), 'Mode C must NOT craft from 500 copper raw materials');
});

// ============================================================================
// SCENARIO 9: Crafting Cheaper Than Purchasing
// ============================================================================
test('Scenario 9: Crafting cheaper than purchasing benchmark', () => {
  const rRefine: Recipe = {
    id: 's9-refine',
    outputId: 100,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rFinal: Recipe = {
    id: 's9-final',
    outputId: 500,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 10,
    ingredients: [{ itemId: 100, count: 1 }],
    flags: ['AutoLearned'],
    type: 'Component',
  };

  const prices = new Map<number, PriceInfo>([
    [10, { sell: 10, buy: 8 } as PriceInfo],
    [100, { sell: 50, buy: 40 } as PriceInfo], // Buy = 50, Craft = 20
  ]);

  const provider = createDisciplineRecipeProvider(new Map([[100, [rRefine]], [500, [rFinal]]]), 'Weaponsmith');
  const result = calculateCraftingPlan([{ itemId: 500, count: 5, recipe: rFinal }], provider, {
    strategy: 'optimal_hybrid',
    prices,
  });

  const mat100 = result.materials.find((m) => m.itemId === 100);
  assert.ok(mat100);
  assert.equal(mat100.action, 'craft', 'Must select craft when crafting is cheaper');
});

// ============================================================================
// SCENARIO 10: Purchasing Cheaper Than Crafting
// ============================================================================
test('Scenario 10: Purchasing cheaper than crafting benchmark', () => {
  const rRefine: Recipe = {
    id: 's10-refine',
    outputId: 100,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rFinal: Recipe = {
    id: 's10-final',
    outputId: 500,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 10,
    ingredients: [{ itemId: 100, count: 1 }],
    flags: ['AutoLearned'],
    type: 'Component',
  };

  const prices = new Map<number, PriceInfo>([
    [10, { sell: 100, buy: 80 } as PriceInfo], // Craft = 200
    [100, { sell: 20, buy: 15 } as PriceInfo], // Buy = 20
  ]);

  const provider = createDisciplineRecipeProvider(new Map([[100, [rRefine]], [500, [rFinal]]]), 'Weaponsmith');
  const result = calculateCraftingPlan([{ itemId: 500, count: 5, recipe: rFinal }], provider, {
    strategy: 'optimal_hybrid',
    prices,
  });

  const mat100 = result.materials.find((m) => m.itemId === 100);
  assert.ok(mat100);
  assert.equal(mat100.action, 'buy', 'Must select buy when purchasing is cheaper');
});

// ============================================================================
// SCENARIO 11: Materials Available Through Vendors
// ============================================================================
test('Scenario 11: Materials available through vendors use vendor price caps', () => {
  // Item 19792 (Spool of Jute Thread) is a vendor item costing 8 copper
  assert.ok(KNOWN_VENDOR_PRICES.has(19792), 'Vendor catalog must contain Jute Thread');
  const vendorCost = KNOWN_VENDOR_PRICES.get(19792)!;
  assert.equal(vendorCost, 8, 'Jute Thread vendor price must be 8 copper');

  // Even if TP price is inflated to 100 copper, vendor price must be respected
  const prices = new Map<number, PriceInfo>([
    [19792, { sell: 100, buy: 80 } as PriceInfo],
  ]);

  const rFinal: Recipe = {
    id: 's11-cloth',
    outputId: 999,
    outputCount: 1,
    disciplines: ['Tailor'],
    rating: 0,
    ingredients: [{ itemId: 19792, count: 10 }],
    flags: ['AutoLearned'],
    type: 'Refinement',
  };

  const plan = planLevelRoute({
    discipline: 'Tailor',
    fromRank: 0,
    toRank: 25,
    recipes: [rFinal],
    recipesByOutput: new Map([[999, [rFinal]]]),
    prices,
    options: { strategy: 'optimal_hybrid' },
  });

  const threadMat = plan.materials.find((m) => m.itemId === 19792);
  assert.ok(threadMat);
  assert.equal(threadMat.unitPrice, 8, 'Unit price must be vendor 8 copper, not TP 100 copper');
});

// ============================================================================
// SCENARIO 12: Mixed Inventory with Partially Completed Requirements & Multi-Yield
// ============================================================================
test('Scenario 12: Mixed inventory with partially completed requirements & multi-yield surplus', () => {
  // Recipe produces 5 items per craft
  const rBatch: Recipe = {
    id: 's12-batch',
    outputId: 200,
    outputCount: 5,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    flags: ['AutoLearned'],
    type: 'Component',
  };
  const rFinal: Recipe = {
    id: 's12-final',
    outputId: 500,
    outputCount: 1,
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 200, count: 12 }], // Needs 12 of itemId 200
    flags: ['AutoLearned'],
    type: 'Weapon',
  };

  const prices = new Map<number, PriceInfo>([
    [10, { sell: 10, buy: 8 } as PriceInfo],
    [200, { sell: 50, buy: 40 } as PriceInfo],
    [500, { sell: 200, buy: 150 } as PriceInfo],
  ]);

  // Player owns 5 of itemId 200 in stock
  const stock = new Map<number, number>([[200, 5]]);

  const provider = createDisciplineRecipeProvider(new Map([[200, [rBatch]], [500, [rFinal]]]), 'Weaponsmith');
  const result = calculateCraftingPlan([{ itemId: 500, count: 1, recipe: rFinal }], provider, {
    strategy: 'craft_everything',
    stock,
    prices,
  });

  const mat200 = result.materials.find((m) => m.itemId === 200);
  assert.ok(mat200);
  // Owned: 5, Gross: 12
  assert.equal(mat200.stock, 5, 'stock must be 5');
  assert.equal(mat200.stockUsed, 5, 'stockUsed must be 5');
  // For manufactured items, craftRuns * outputCount = 2 * 5 = 10 produced
  assert.equal(mat200.manufactured, 10, 'manufactured must be 10 (2 crafts * 5 yield)');
  assert.equal(mat200.intermediateYield, 3, 'intermediateYield surplus must be 3 (10 produced - 7 net deficit)');
  assert.equal(mat200.remainingToBuy, 0, 'remainingToBuy must be 0 for intermediate product');
});
