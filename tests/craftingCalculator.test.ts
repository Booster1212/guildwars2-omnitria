import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCraftingPlan,
  createDisciplineRecipeProvider,
  isRecipeDiscovery,
  type CraftingRecipeProvider,
  type TargetCraftItem,
} from '../src/domain/craftingCalculator.ts';
import { planLevelRoute } from '../src/domain/levelPlanner.ts';
import { splitCoins } from '../src/domain/costs.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';

// Hilfsfunktion zum Erstellen von Test-Rezepten
const makeRecipe = (
  id: string,
  outId: number,
  outCount: number,
  ingredients: [number, number][],
  disciplines: string[] = ['Weaponsmith'],
): Recipe => ({
  id,
  outputId: outId,
  outputCount: outCount,
  kind: 'official',
  disciplines,
  rating: 0,
  ingredients: ingredients.map(([itemId, count]) => ({ itemId, count })),
  source: 'official',
  flags: ['AutoLearned'],
});

const makeProvider = (recipes: Recipe[]): CraftingRecipeProvider => ({
  recipeFor: (id) => recipes.find((r) => r.outputId === id),
});

// ============================================================================
// Test 1: Ein Endprodukt ohne herstellbare Zwischenprodukte
// ============================================================================
test('1. Ein Endprodukt ohne herstellbare Zwischenprodukte', () => {
  // Rezept: 1x Bronze-Barren (100) = 10x Kupfererz (10) + 1x Zinnbrocken (11)
  const recipes = [makeRecipe('r-barren', 100, 1, [[10, 10], [11, 1]])];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 100, count: 5, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider);

  assert.equal(result.trees.length, 1);
  const root = result.trees[0];
  assert.equal(root.itemId, 100);
  assert.equal(root.craftRuns, 5);
  assert.equal(root.children.length, 2);

  // Zutat 1: Kupfererz
  const copper = root.children.find((c) => c.itemId === 10);
  assert.ok(copper);
  assert.equal(copper.grossDemand, 50); // 5 * 10
  assert.equal(copper.netDemand, 50);
  assert.equal(copper.children.length, 0); // Blatt
  assert.equal(copper.isCraftable, false);

  // Zutat 2: Zinnbrocken
  const tin = root.children.find((c) => c.itemId === 11);
  assert.ok(tin);
  assert.equal(tin.grossDemand, 5); // 5 * 1
  assert.equal(tin.netDemand, 5);
  assert.equal(tin.children.length, 0);

  // Aggregierte Materialien
  const matCopper = result.materials.find((m) => m.itemId === 10);
  assert.equal(matCopper?.grossDemand, 50);
  assert.equal(matCopper?.role, 'base_material');

  const matTin = result.materials.find((m) => m.itemId === 11);
  assert.equal(matTin?.grossDemand, 5);
  assert.equal(matTin?.role, 'base_material');
});

// ============================================================================
// Test 2: An end product with multiple levels of intermediate components
// ============================================================================
test('2. Ein Endprodukt mit mehreren Ebenen von Zwischenprodukten', () => {
  // Schwert (1000) -> Klinge (500) -> Barren (100) -> Erz (10)
  // 1x Schwert = 1x Klinge + 1x Heft (501)
  // 1x Klinge = 2x Barren
  // 1x Barren = 2x Erz
  const recipes = [
    makeRecipe('r-schwert', 1000, 1, [[500, 1]]),
    makeRecipe('r-klinge', 500, 1, [[100, 2]]),
    makeRecipe('r-barren', 100, 1, [[10, 2]]),
  ];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 1000, count: 3, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider);

  // 3x Schwert -> 3x Klinge -> 6x Barren -> 12x Erz
  const root = result.trees[0];
  assert.equal(root.craftRuns, 3);

  const klinge = root.children[0];
  assert.equal(klinge.itemId, 500);
  assert.equal(klinge.grossDemand, 3);
  assert.equal(klinge.craftRuns, 3);

  const barren = klinge.children[0];
  assert.equal(barren.itemId, 100);
  assert.equal(barren.grossDemand, 6);
  assert.equal(barren.craftRuns, 6);

  const erz = barren.children[0];
  assert.equal(erz.itemId, 10);
  assert.equal(erz.grossDemand, 12);
  assert.equal(erz.netDemand, 12);
  assert.equal(erz.children.length, 0);

  const matErz = result.materials.find((m) => m.itemId === 10);
  assert.equal(matErz?.grossDemand, 12);
});

// ============================================================================
// Test 3: Same base material required in multiple recipe branches
// ============================================================================
test('3. Dasselbe Grundmaterial wird in mehreren Rezeptzweigen benötigt', () => {
  // Dagger (1) requires Blade (2) and Hilt (3)
  // Klinge (2) braucht 3x Eisenbarren (10)
  // Griff (3) braucht 2x Eisenbarren (10)
  // Eisenbarren (10) braucht 3x Eisenerz (20)
  const recipes = [
    makeRecipe('r-dolch', 1, 1, [[2, 1], [3, 1]]),
    makeRecipe('r-klinge', 2, 1, [[10, 3]]),
    makeRecipe('r-griff', 3, 1, [[10, 2]]),
    makeRecipe('r-barren', 10, 1, [[20, 3]]),
  ];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 1, count: 2, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider);

  // 2 Dolche -> 2 Klingen (6 Barren) + 2 Griffe (4 Barren) = 10 Barren insgesamt
  // 10 Barren -> 30 Eisenerz
  const matBarren = result.materials.find((m) => m.itemId === 10);
  assert.equal(matBarren?.grossDemand, 10);
  assert.equal(matBarren?.craftRuns, 10);

  const matErz = result.materials.find((m) => m.itemId === 20);
  assert.equal(matErz?.grossDemand, 30);
  assert.equal(matErz?.netDemand, 30);

  // No duplicate counting in materials
  const erzEntries = result.materials.filter((m) => m.itemId === 20);
  assert.equal(erzEntries.length, 1);
});

// ============================================================================
// Test 4: Ein Rezept erzeugt mehrere Einheiten pro Herstellung
// ============================================================================
test('4. Ein Rezept erzeugt mehrere Einheiten pro Herstellung', () => {
  // Example: Route requires 11 units of an intermediate product,
  // recipe produces 5 units per craft -> 3 craft runs required
  // Recipe intermediate (50) produces 5 units from 2 units raw material (99)
  const recipes = [
    makeRecipe('r-ziel', 1, 1, [[50, 11]]),
    makeRecipe('r-zp', 50, 5, [[99, 2]]),
  ];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 1, count: 1, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider);

  const root = result.trees[0];
  const zpNode = root.children[0];
  assert.equal(zpNode.itemId, 50);
  assert.equal(zpNode.grossDemand, 11);
  assert.equal(zpNode.craftRuns, 3); // Math.ceil(11 / 5) = 3 runs!

  const rawNode = zpNode.children[0];
  assert.equal(rawNode.itemId, 99);
  assert.equal(rawNode.grossDemand, 6); // 3 runs * 2 = 6 units
  assert.equal(rawNode.netDemand, 6);

  const matRaw = result.materials.find((m) => m.itemId === 99);
  assert.equal(matRaw?.grossDemand, 6);
  assert.equal(matRaw?.netDemand, 6);
});

// ============================================================================
// Test 5: Inventory stock covers part of the demand
// ============================================================================
test('5. Der Materialbestand deckt einen Teil des Bedarfs', () => {
  // Endprodukt braucht 20 Rohmaterial (10). Nutzer besitzt 8 Einheiten.
  const recipes = [makeRecipe('r-item', 1, 1, [[10, 20]])];
  const provider = makeProvider(recipes);

  const stock = new Map([[10, 8]]);
  const targets: TargetCraftItem[] = [{ itemId: 1, count: 1, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider, { stock });

  const mat = result.materials.find((m) => m.itemId === 10);
  assert.ok(mat);
  assert.equal(mat.grossDemand, 20); // Gesamtbedarf
  assert.equal(mat.stock, 8);        // Vorhanden
  assert.equal(mat.stockUsed, 8);    // Allocated from stock
  assert.equal(mat.netDemand, 12);   // Fehlend
});

// ============================================================================
// Test 6: A completed intermediate is bought instead of self-crafted
// ============================================================================
test('6. Ein fertiges Zwischenprodukt wird gekauft statt selbst hergestellt', () => {
  // End product (1) requires intermediate (50), which can be crafted from ore (10).
  const recipes = [
    makeRecipe('r-end', 1, 1, [[50, 4]]),
    makeRecipe('r-zp', 50, 1, [[10, 5]]),
  ];
  const provider = makeProvider(recipes);

  // Strategy A: Self-craft (default)
  const resCraft = calculateCraftingPlan([{ itemId: 1, count: 1, recipe: recipes[0] }], provider, {
    strategy: 'all_craft',
  });
  assert.ok(resCraft.materials.some((m) => m.itemId === 10)); // Erz ist im Plan enthalten

  // Strategie B: Fertige Zwischenprodukte kaufen
  const resBuy = calculateCraftingPlan([{ itemId: 1, count: 1, recipe: recipes[0] }], provider, {
    strategy: 'all_buy',
  });
  const zpMaterial = resBuy.materials.find((m) => m.itemId === 50);
  assert.ok(zpMaterial);
  assert.equal(zpMaterial.action, 'buy');
  assert.equal(zpMaterial.netDemand, 4);
  // Ore (10) must NOT appear in plan!
  assert.equal(resBuy.materials.some((m) => m.itemId === 10), false);

  // Strategy C: Combined with targeted override
  const itemOverrides = new Map<number, 'craft' | 'buy'>([[50, 'buy']]);
  const resCustom = calculateCraftingPlan([{ itemId: 1, count: 1, recipe: recipes[0] }], provider, {
    strategy: 'custom',
    itemOverrides,
  });
  assert.equal(resCustom.materials.some((m) => m.itemId === 10), false);
  assert.equal(resCustom.materials.find((m) => m.itemId === 50)?.action, 'buy');
});

// ============================================================================
// Test 7: Part of an intermediate component is in stock and the rest must be crafted
// ============================================================================
test('7. Ein Teil eines Zwischenprodukts ist vorhanden und der Rest muss hergestellt werden', () => {
  // Route requires 11 units of intermediate (50). Recipe for intermediate produces 5 units from 2x ingredient (99).
  // User owns 3 units of intermediate (50).
  // Net demand for intermediate = 11 - 3 = 8 units.
  // Required runs for intermediate = Math.ceil(8 / 5) = 2 runs.
  // Ingredient cost for these 2 runs = 2 * 2 = 4 units of ingredient (99).
  const recipes = [
    makeRecipe('r-ziel', 1, 1, [[50, 11]]),
    makeRecipe('r-zp', 50, 5, [[99, 2]]),
  ];
  const provider = makeProvider(recipes);

  const stock = new Map([[50, 3]]);
  const targets: TargetCraftItem[] = [{ itemId: 1, count: 1, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider, { stock });

  const root = result.trees[0];
  const zpNode = root.children[0];
  assert.equal(zpNode.itemId, 50);
  assert.equal(zpNode.grossDemand, 11);
  assert.equal(zpNode.fromStock, 3);
  assert.equal(zpNode.netDemand, 8);
  assert.equal(zpNode.craftRuns, 2); // 2 runs cover 10 units (>= 8)!

  const rawNode = zpNode.children[0];
  assert.equal(rawNode.itemId, 99);
  assert.equal(rawNode.grossDemand, 4); // 2 runs * 2 = 4 units
  assert.equal(rawNode.netDemand, 4);

  const matZp = result.materials.find((m) => m.itemId === 50);
  assert.equal(matZp?.grossDemand, 15); // In gross pass without stock: 3 runs * 5 = 15
  assert.equal(matZp?.stock, 3);
  assert.equal(matZp?.stockUsed, 3);
  assert.equal(matZp?.craftRuns, 2);

  const matRaw = result.materials.find((m) => m.itemId === 99);
  assert.equal(matRaw?.grossDemand, 6); // Brutto 6
  assert.equal(matRaw?.netDemand, 4);   // Netto 4
});

// ============================================================================
// Test 8: A recipe dependency is missing
// ============================================================================
test('8. Eine Rezeptabhängigkeit fehlt', () => {
  // End product requires ingredient 9999 for which no recipe exists
  const recipes = [makeRecipe('r-unvollstaendig', 1, 1, [[9999, 5]])];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 1, count: 1, recipe: recipes[0] }];
  const result = calculateCraftingPlan(targets, provider);

  assert.equal(result.hasMissingRecipes, true);
  const leaf = result.trees[0].children[0];
  assert.equal(leaf.itemId, 9999);
  assert.equal(leaf.missingRecipe, true);
  assert.equal(leaf.isCraftable, false);
  assert.equal(leaf.netDemand, 5);

  const mat = result.materials.find((m) => m.itemId === 9999);
  assert.ok(mat);
  assert.equal(mat.role, 'base_material');
  assert.equal(mat.isCraftable, false);
});

// ============================================================================
// Test 9: A recipe cycle is detected
// ============================================================================
test('9. Ein Rezeptzyklus wird erkannt', () => {
  // A (1) -> B (2) -> A (1) (Endlosschleife)
  const recipes = [
    makeRecipe('r-a', 1, 1, [[2, 1]]),
    makeRecipe('r-b', 2, 1, [[1, 1]]),
  ];
  const provider = makeProvider(recipes);

  const targets: TargetCraftItem[] = [{ itemId: 1, count: 1, recipe: recipes[0] }];
  // Must not crash and must flag cycle
  const result = calculateCraftingPlan(targets, provider);

  assert.equal(result.hasCycles, true);
  const root = result.trees[0];
  assert.equal(root.children[0].itemId, 2);
  const cycleNode = root.children[0].children[0];
  assert.equal(cycleNode.itemId, 1);
  assert.equal(cycleNode.cyclic, true);
  assert.equal(cycleNode.children.length, 0); // Recursion stopped safely
});

// ============================================================================
// Test 10: Changing leveling route correctly updates totals
// ============================================================================
test('10. Eine Änderung der Levelroute aktualisiert die Gesamtsummen korrekt', () => {
  const recipes = [
    makeRecipe('r-stufe1', 1, 1, [[10, 5]]),
    makeRecipe('r-stufe2', 2, 1, [[10, 8], [20, 2]]),
  ];
  const provider = makeProvider(recipes);

  // Route A: Rank 0-25 only (Step 1: 2x Item 1)
  const routeA: TargetCraftItem[] = [{ itemId: 1, count: 2, recipe: recipes[0], stepKey: 'st-1' }];
  const resultA = calculateCraftingPlan(routeA, provider);
  assert.equal(resultA.materials.find((m) => m.itemId === 10)?.grossDemand, 10);
  assert.equal(resultA.materials.some((m) => m.itemId === 20), false);

  // Route B: Extension to rank 50 (Step 1: 2x Item 1 + Step 2: 3x Item 2)
  const routeB: TargetCraftItem[] = [
    { itemId: 1, count: 2, recipe: recipes[0], stepKey: 'st-1' },
    { itemId: 2, count: 3, recipe: recipes[1], stepKey: 'st-2' },
  ];
  const resultB = calculateCraftingPlan(routeB, provider);

  // Material 10 is summed from both steps: 2*5 + 3*8 = 34
  assert.equal(resultB.materials.find((m) => m.itemId === 10)?.grossDemand, 34);
  // Material 20 added from step 2: 3*2 = 6
  assert.equal(resultB.materials.find((m) => m.itemId === 20)?.grossDemand, 6);
  assert.equal(resultB.trees.length, 2);
});

// ============================================================================
// Test 11: End product is a discovery recipe (needsDiscovery and requiredForDiscovery)
// ============================================================================
test('11. Endprodukt ist ein Entdeckungsrezept und markiert Zutaten als requiredForDiscovery', () => {
  // Discovery recipe for an iron sword: neither AutoLearned nor LearnedFromItem
  const discRecipe: Recipe = {
    ...makeRecipe('r-disc-schwert', 5000, 1, [[10, 2], [20, 1]]),
    flags: [],
  };
  const provider = makeProvider([discRecipe]);

  assert.equal(isRecipeDiscovery(discRecipe), true);

  const targets: TargetCraftItem[] = [
    { itemId: 5000, count: 1, recipe: discRecipe, needsDiscovery: true, stepKey: 'step-disc' },
  ];
  const result = calculateCraftingPlan(targets, provider, { allowDiscovery: true });

  // 1. Tree check
  assert.equal(result.trees.length, 1);
  const root = result.trees[0];
  assert.equal(root.itemId, 5000);
  assert.equal(root.needsDiscovery, true);
  assert.equal(root.action, 'craft');

  // 2. Materialbeschaffungsliste
  const endProd = result.materials.find((m) => m.itemId === 5000);
  assert.ok(endProd);
  assert.equal(endProd.role, 'end_product');
  assert.equal(endProd.needsDiscovery, true);
  assert.equal(endProd.grossDemand, 1);
  assert.equal(endProd.netDemand, 1);

  // 3. Base ingredients for discovery
  const mat10 = result.materials.find((m) => m.itemId === 10);
  assert.ok(mat10);
  assert.equal(mat10.role, 'base_material');
  assert.equal(mat10.needsDiscovery, false);
  assert.equal(mat10.requiredForDiscovery, true);
  assert.equal(mat10.grossDemand, 2);

  const mat20 = result.materials.find((m) => m.itemId === 20);
  assert.ok(mat20);
  assert.equal(mat20.requiredForDiscovery, true);

  // 4. Totals
  assert.equal(result.totals.totalDiscoveryCount, 1);
});

// ============================================================================
// Test 12: Zwischenprodukt erfordert Entdeckungsrezept (z. B. Insignie / Inschrift)
// ============================================================================
test('12. Zwischenprodukt erfordert Entdeckungsrezept: Auflösung bei allowDiscovery = true vs false', () => {
  // Finished armor (1000, AutoLearned) requires lining (101, AutoLearned) and insignia (2050, Discovery)
  // Insignia 2050 requires jute (30) and spool (31)
  const armorRecipe = makeRecipe('r-armor', 1000, 1, [[101, 1], [2050, 1]]);
  const paddingRecipe = makeRecipe('r-padding', 101, 1, [[30, 2]]);
  const insigniaDiscoveryRecipe: Recipe = {
    ...makeRecipe('r-insignia-disc', 2050, 1, [[30, 3], [31, 1]]),
    flags: [], // Discovery!
  };

  const recipes = [armorRecipe, paddingRecipe, insigniaDiscoveryRecipe];
  const byOutput = new Map<number, Recipe[]>();
  recipes.forEach((r) => {
    byOutput.set(r.outputId, [...(byOutput.get(r.outputId) ?? []), r]);
  });

  const prices = new Map<number, PriceInfo>([
    [2050, { sell: 50, buy: 40 } as PriceInfo],
  ]);

  // Fall A: allowDiscovery = true
  const providerWithDisc = createDisciplineRecipeProvider(byOutput, 'Weaponsmith', {
    allowDiscovery: true,
  });
  const targetsA: TargetCraftItem[] = [{ itemId: 1000, count: 1, recipe: armorRecipe }];
  const resultA = calculateCraftingPlan(targetsA, providerWithDisc, {
    allowDiscovery: true,
    prices,
  });

  // Insignia 2050 is crafted and flagged as discovery
  const treeRootA = resultA.trees[0];
  const insigniaNodeA = treeRootA.children.find((c) => c.itemId === 2050);
  assert.ok(insigniaNodeA);
  assert.equal(insigniaNodeA.action, 'craft');
  assert.equal(insigniaNodeA.needsDiscovery, true);

  // In Materialbeschaffungsliste
  const matInsigniaA = resultA.materials.find((m) => m.itemId === 2050);
  assert.ok(matInsigniaA);
  assert.equal(matInsigniaA.role, 'intermediate');
  assert.equal(matInsigniaA.needsDiscovery, true);

  // Ingredients of insignia marked as requiredForDiscovery
  const mat31 = resultA.materials.find((m) => m.itemId === 31);
  assert.ok(mat31);
  assert.equal(mat31.requiredForDiscovery, true);

  // Fall B: allowDiscovery = false
  const providerWithoutDisc = createDisciplineRecipeProvider(byOutput, 'Weaponsmith', {
    allowDiscovery: false,
  });
  const targetsB: TargetCraftItem[] = [{ itemId: 1000, count: 1, recipe: armorRecipe }];
  const resultB = calculateCraftingPlan(targetsB, providerWithoutDisc, {
    allowDiscovery: false,
    prices,
  });

  const treeRootB = resultB.trees[0];
  const insigniaNodeB = treeRootB.children.find((c) => c.itemId === 2050);
  assert.ok(insigniaNodeB);
  // Without discovery permission recipe cannot be discovered/crafted -> purchase action
  assert.equal(insigniaNodeB.action, 'buy');
  assert.equal(insigniaNodeB.needsDiscovery, false);
});

// ============================================================================
// Test 13: Known recipe in account removes discovery requirement
// ============================================================================
test('13. Account-bekanntes Rezept hebt needsDiscovery auf', () => {
  const discRecipe: Recipe = {
    ...makeRecipe('r-known-disc', 7000, 1, [[10, 1]]),
    id: '4242',
    flags: [],
  };
  const provider = makeProvider([discRecipe]);

  // If account already unlocked the recipe (ID 4242)
  const known = new Set([4242]);
  assert.equal(isRecipeDiscovery(discRecipe, known), false);

  const targets: TargetCraftItem[] = [
    { itemId: 7000, count: 1, recipe: discRecipe, needsDiscovery: false },
  ];
  const result = calculateCraftingPlan(targets, provider, {
    allowDiscovery: true,
    knownRecipeIds: known,
  });

  assert.equal(result.trees[0].needsDiscovery, false);
  const mat = result.materials.find((m) => m.itemId === 7000);
  assert.equal(mat?.needsDiscovery, false);
  assert.equal(result.totals.totalDiscoveryCount, 0);
});

// ============================================================================
// Test 14: Untradable, unpriced intermediate recipe resolves to craft when craftIntermediates is true
// ============================================================================
test('14. Accountgebundenes Zwischenprodukt wird bei craftIntermediates rekursiv hergestellt statt gekauft', () => {
  // Recipe for Marauder Inscription (output: 76361), LearnedFromItem, untradable
  const rInscription: Recipe = {
    ...makeRecipe('r-inscr', 76361, 1, [[12988, 5], [19721, 5]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: ['LearnedFromItem'],
    type: 'Inscription',
  };

  // Recipe for Trident using the Marauder Inscription
  const rTrident: Recipe = {
    ...makeRecipe('r-trident', 75144, 1, [[76361, 1], [13004, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: ['AutoLearned'],
    type: 'Trident',
  };

  const byOut = new Map<number, Recipe[]>([
    [76361, [rInscription]],
    [75144, [rTrident]],
  ]);

  // Prices: 76361 has NO price (account-bound / untradable), but 12988 and 19721 have prices
  const prices = new Map<number, PriceInfo>([
    [12988, { sell: 200, buy: 150, sellQty: 100, buyQty: 100 }],
    [19721, { sell: 3000, buy: 2500, sellQty: 100, buyQty: 100 }],
    [13004, { sell: 100, buy: 80, sellQty: 100, buyQty: 100 }],
  ]);

  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 400,
    toRank: 410,
    recipes: [rInscription, rTrident],
    recipesByOutput: byOut,
    prices,
    options: {
      craftIntermediates: true,
      allowDiscovery: false,
    },
  });

  // Untradable intermediate 76361 must NOT be in purchases (Einkaufsliste)
  assert.equal(plan.purchases.has(76361), false, 'Accountgebundene Inschrift darf nicht auf der Einkaufsliste stehen');
  // Its craftable components must be in purchases instead
  assert.ok(plan.purchases.has(12988), 'Dübel müssen gekauft werden');
  assert.ok(plan.purchases.has(19721), 'Ektoplasmakugeln müssen gekauft werden');
  // It must be registered as an intermediate craft
  assert.ok(plan.intermediates.some((im) => im.recipe.id === 'r-inscr'), 'Inschrift muss als Zwischenprodukt hergestellt werden');
});

// ============================================================================
// Test 15: Level planner avoids recipes with unowned untradable materials (e.g. Bloodstone Dust)
// ============================================================================
test('15. Levelplaner bevorzugt handelbare Rezepte vor nicht besessenen accountgebundenen Materialien', () => {
  // Candidate A: Normal weapon using tradeable components (cost ~5000 copper)
  const rTradeableWeapon: Recipe = {
    ...makeRecipe('r-normal-weapon', 50000, 1, [[100, 1], [200, 1]]),
    disciplines: ['Artificer'],
    rating: 450,
    flags: ['AutoLearned'],
    type: 'Staff',
  };

  // Candidate B: Ascended refinement requiring 100 Bloodstone Dust (46731, untradable)
  const rBloodstoneBrick: Recipe = {
    ...makeRecipe('r-brick', 46736, 1, [[46731, 100], [46747, 10]]),
    disciplines: ['Artificer'],
    rating: 450,
    flags: ['AutoLearned'],
    type: 'Refinement',
  };

  const byOut = new Map<number, Recipe[]>([
    [50000, [rTradeableWeapon]],
    [46736, [rBloodstoneBrick]],
  ]);

  const prices = new Map<number, PriceInfo>([
    [100, { sell: 2500, buy: 2000, sellQty: 100, buyQty: 100 }],
    [200, { sell: 2500, buy: 2000, sellQty: 100, buyQty: 100 }],
    // 46731 has NO price (Bloodstone Dust is account-bound)
  ]);

  // When player has 0 Bloodstone Dust in stock:
  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 450,
    toRank: 460,
    recipes: [rTradeableWeapon, rBloodstoneBrick],
    recipesByOutput: byOut,
    prices,
    options: {
      craftIntermediates: true,
      allowDiscovery: false,
      stock: new Map(), // 0 Bloodstone Dust
    },
  });

  // Planner must pick tradeable weapon, NOT Bloodstone Brick!
  assert.ok(plan.steps.some((st) => st.recipe.id === 'r-normal-weapon'), 'Handelbare Waffe muss gewählt werden');
  assert.equal(plan.steps.some((st) => st.recipe.id === 'r-brick'), false, 'Blutsteinziegel darf ohne Bestand nicht gewählt werden');
  assert.equal(plan.purchases.has(46731), false, 'Blutsteinstaub darf nicht auf der Einkaufsliste landen');
});

// ============================================================================
// Test 16: Level planner ab Rang 470 empfiehlt aktiv einmalige Entdeckungsrezepte (1 Craft je Rezept)
// ============================================================================
test('16. Levelplaner ab Rang 470 empfiehlt aktiv einmalige Entdeckungsrezepte mit Bonus-EP', () => {
  // Erstelle 5 exotische Entdeckungsrezepte (Rating 400, keine AutoLearned-Flags)
  const discRecipes: Recipe[] = [1, 2, 3, 4, 5].map((i) => ({
    ...makeRecipe(`r-disc-${i}`, 8000 + i, 1, [[100, 1], [200, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [], // Entdeckung (weder AutoLearned noch LearnedFromItem)
    type: 'Staff',
  }));

  const byOut = new Map<number, Recipe[]>();
  for (const r of discRecipes) {
    byOut.set(r.outputId, [r]);
  }

  const prices = new Map<number, PriceInfo>([
    [100, { sell: 1000, buy: 800, sellQty: 50, buyQty: 50 }],
    [200, { sell: 1200, buy: 900, sellQty: 50, buyQty: 50 }],
  ]);

  // Route von 470 bis 476 planen (auch wenn allowDiscovery = false ist!)
  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 470,
    toRank: 476,
    recipes: discRecipes,
    recipesByOutput: byOut,
    prices,
    options: {
      craftIntermediates: true,
      allowDiscovery: false, // Ab 470 werden Entdeckungen aktiv genutzt, um Lücken zu vermeiden
    },
  });

  // Es dürfen keine Lücken entstehen
  assert.equal(plan.gaps.length, 0, 'Keine Lücken im Plan ab 470 mit Entdeckungen');
  assert.ok(plan.steps.length >= 2, 'Schritte müssen geplant worden sein');

  // Jeder Schritt muss genau 1 Craft haben und als Entdeckung markiert sein
  const usedRecipeIds = new Set<string>();
  for (const step of plan.steps) {
    assert.equal(step.crafts, 1, `Schritt ${step.key} muss genau 1 Craft haben`);
    assert.equal(step.needsDiscovery, true, `Schritt ${step.key} muss als needsDiscovery markiert sein`);
    assert.equal(step.reasonKey, 'planner.reason.discoveryBonusXp');
    assert.equal(usedRecipeIds.has(step.recipe.id), false, `Rezept ${step.recipe.id} darf nicht mehrfach zur Entdeckung empfohlen werden`);
    usedRecipeIds.add(step.recipe.id);
  }
});

// ============================================================================
// Test 17: Bereits entdeckte Rezepte (knownRecipeIds & doneStepKeys) werden korrekt erfasst
// ============================================================================
test('17. Bereits entdeckte Rezepte via knownRecipeIds und doneStepKeys werden nicht erneut empfohlen', () => {
  const rDisc1: Recipe = {
    ...makeRecipe('1001', 9001, 1, [[100, 1]]),
    disciplines: ['Weaponsmith'],
    rating: 400,
    flags: [],
    type: 'Sword',
  };
  const rDisc2: Recipe = {
    ...makeRecipe('1002', 9002, 1, [[100, 1]]),
    disciplines: ['Weaponsmith'],
    rating: 400,
    flags: [],
    type: 'Dagger',
  };
  const rDisc3: Recipe = {
    ...makeRecipe('1003', 9003, 1, [[100, 1]]),
    disciplines: ['Weaponsmith'],
    rating: 400,
    flags: [],
    type: 'Greatsword',
  };

  const byOut = new Map<number, Recipe[]>([
    [9001, [rDisc1]],
    [9002, [rDisc2]],
    [9003, [rDisc3]],
  ]);

  const prices = new Map<number, PriceInfo>([
    [100, { sell: 500, buy: 400, sellQty: 100, buyQty: 100 }],
  ]);

  // Fall A: rDisc1 (1001) ist im Spiel-Account schon bekannt (/v2/account/recipes),
  // rDisc2 (1002) wurde bereits als erledigter Schritt (doneStepKeys) markiert
  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 470,
    toRank: 472,
    recipes: [rDisc1, rDisc2, rDisc3],
    recipesByOutput: byOut,
    prices,
    options: {
      craftIntermediates: false,
      allowDiscovery: true,
      knownRecipeIds: new Set([1001]),
      doneStepKeys: new Set(['1002']),
    },
  });

  // rDisc1 & rDisc2 dürfen NICHT als neuer Entdeckungsschritt empfohlen werden
  const firstStep = plan.steps[0];
  assert.ok(firstStep, 'Ein Schritt muss vorhanden sein');
  assert.equal(firstStep.recipe.id, '1003', 'Nur das unentdeckte Rezept 1003 darf gewählt werden');
  assert.equal(firstStep.crafts, 1);
  assert.equal(firstStep.needsDiscovery, true);
});

// ============================================================================
// Test 18: Leveling 0-470 bleibt vollständig unberührt (keine Entdeckungen ohne allowDiscovery)
// ============================================================================
test('18. Leveling unter Rang 470 bleibt unverändert und beachtet allowDiscovery strikt', () => {
  const rAuto: Recipe = {
    ...makeRecipe('r-auto-low', 3001, 1, [[10, 2]]),
    disciplines: ['Tailor'],
    rating: 100,
    flags: ['AutoLearned'],
    type: 'Boots',
  };
  const rDisc: Recipe = {
    ...makeRecipe('r-disc-low', 3002, 1, [[10, 1]]), // Günstiger, aber Entdeckung
    disciplines: ['Tailor'],
    rating: 100,
    flags: [],
    type: 'Boots',
  };

  const byOut = new Map<number, Recipe[]>([
    [3001, [rAuto]],
    [3002, [rDisc]],
  ]);
  const prices = new Map<number, PriceInfo>([
    [10, { sell: 100, buy: 80, sellQty: 100, buyQty: 100 }],
  ]);

  // Wenn allowDiscovery = false unter Rang 470:
  const plan = planLevelRoute({
    discipline: 'Tailor',
    fromRank: 100,
    toRank: 105,
    recipes: [rAuto, rDisc],
    recipesByOutput: byOut,
    prices,
    options: {
      craftIntermediates: false,
      allowDiscovery: false,
    },
  });

  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].recipe.id, 'r-auto-low', 'Unter 470 darf bei allowDiscovery=false nur AutoLearned gewählt werden');
  assert.equal(plan.steps[0].needsDiscovery, false);
});

// ============================================================================
// Test 19: Erfassung und Filterung entdeckter Rezepte in der UI (Stats & Filter)
// ============================================================================
test('19. Entdeckungsstatus (Stats & Filter) erfasst entdeckte Rezepte via Charakter-API und lokalem Fortschritt', async () => {
  const { computeDiscoveryStats, filterDiscoveryRecipes } = await import('../src/domain/discovery.ts');

  const disc1: Recipe = {
    ...makeRecipe('101', 5001, 1, [[10, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Staff',
  };
  const disc2: Recipe = {
    ...makeRecipe('102', 5002, 1, [[10, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Focus',
  };
  const disc3: Recipe = {
    ...makeRecipe('103', 5003, 1, [[10, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Scepter',
  };
  const recipes = [disc1, disc2, disc3];

  // Set mit entdeckten Rezepten: 101 aus Charakter-API, 102 aus lokalem doneSteps
  const effectiveKnown = new Set<number>([101, 102]);

  // 1. Stats-Berechnung
  const stats = computeDiscoveryStats(recipes, 'Artificer', effectiveKnown, 400, 500);
  assert.equal(stats.total, 3, 'Gesamtzahl muss 3 sein');
  assert.equal(stats.discovered, 2, '2 Rezepte müssen als entdeckt erkannt werden');
  assert.equal(stats.undiscovered, 1, '1 Rezept muss als unentdeckt übrig bleiben');
  assert.equal(stats.pctDiscovered, 67, 'Fortschritt muss 67% betragen');

  // 2. Filter: Nur unentdeckte
  const undiscoveredOnly = filterDiscoveryRecipes(recipes, {
    discipline: 'Artificer',
    minRating: 400,
    maxRating: 500,
    status: 'undiscovered',
    knownRecipeIds: effectiveKnown,
  });
  assert.equal(undiscoveredOnly.length, 1);
  assert.equal(undiscoveredOnly[0].id, '103');

  // 3. Filter: Nur bereits entdeckte
  const discoveredOnly = filterDiscoveryRecipes(recipes, {
    discipline: 'Artificer',
    minRating: 400,
    maxRating: 500,
    status: 'discovered',
    knownRecipeIds: effectiveKnown,
  });
  assert.equal(discoveredOnly.length, 2);
  assert.deepEqual(discoveredOnly.map((r) => r.id), ['101', '102']);
});

// ============================================================================
// Test 20: Verhindere Herstellungen: Infinity und Gesamtkosten: NaN
// ============================================================================
test('20. Levelroute bei aktiven Entdeckungsrezepten erzeugt niemals Infinity oder NaN', () => {
  // Rating 400 Entdeckungsrezepte und Veredelungsrezepte
  const rDisc1: Recipe = {
    ...makeRecipe('d-1', 9101, 1, [[100, 1], [200, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Staff',
  };
  const rDisc2: Recipe = {
    ...makeRecipe('d-2', 9102, 1, [[100, 1], [200, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Focus',
  };
  const rDisc3: Recipe = {
    ...makeRecipe('d-3', 9103, 1, [[100, 1], [200, 1]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Scepter',
  };
  const rRefine: Recipe = {
    ...makeRecipe('r-ref', 9200, 1, [[50, 2]]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: ['AutoLearned'],
    type: 'Refinement',
  };

  const byOut = new Map<number, Recipe[]>([
    [9101, [rDisc1]],
    [9102, [rDisc2]],
    [9103, [rDisc3]],
    [9200, [rRefine]],
  ]);

  const prices = new Map<number, PriceInfo>([
    [100, { sell: 500, buy: 400, sellQty: 100, buyQty: 100 }],
    [200, { sell: 500, buy: 400, sellQty: 100, buyQty: 100 }],
    [50, { sell: 50, buy: 40, sellQty: 100, buyQty: 100 }],
  ]);

  // Plane von Rang 424 bis 500 mit allowDiscovery = true
  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 424,
    toRank: 440,
    recipes: [rDisc1, rDisc2, rDisc3, rRefine],
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  assert.ok(Number.isFinite(plan.totalCost), 'Gesamtkosten müssen endlich sein');
  assert.equal(Number.isNaN(plan.totalCost), false, 'Gesamtkosten dürfen nicht NaN sein');
  assert.ok(Number.isFinite(plan.totalCrafts), 'Herstellungen müssen endlich sein');
  assert.equal(Number.isNaN(plan.totalCrafts), false, 'Herstellungen dürfen nicht NaN sein');

  for (const st of plan.steps) {
    assert.ok(Number.isFinite(st.crafts), `Schritt ${st.key} crafts darf nicht Infinity sein`);
    assert.ok(Number.isFinite(st.cost), `Schritt ${st.key} cost darf nicht Infinity sein`);
    assert.equal(Number.isNaN(st.cost), false, `Schritt ${st.key} cost darf nicht NaN sein`);
  }

  // Coin-Aufteilung prüfen
  const coins = splitCoins(plan.totalCost);
  assert.ok(Number.isFinite(coins.gold), 'Gold darf nicht Infinity sein');
  assert.ok(Number.isFinite(coins.silver), 'Silber darf nicht Infinity sein');
  assert.ok(Number.isFinite(coins.copper), 'Kupfer darf nicht Infinity sein');
  assert.equal(Number.isNaN(coins.gold), false, 'Gold darf nicht NaN sein');
  assert.equal(Number.isNaN(coins.silver), false, 'Silber darf nicht NaN sein');
  assert.equal(Number.isNaN(coins.copper), false, 'Kupfer darf nicht NaN sein');
});

// ============================================================================
// Test 23: Leveling unter 470 erzeugt keine Flut an 1-Craft-Entdeckungen
// ============================================================================
test('23. Leveling 0-470 behält gebündeltes Bulk-Crafting bei und erzeugt keine 1-Craft-Entdeckungsflut', () => {
  const rRefine = {
    ...makeRecipe('r-bronze', 10, 1, [[1, 2]]),
    disciplines: ['Weaponsmith'],
    rating: 0,
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rComp = {
    ...makeRecipe('r-inscr', 20, 1, [[10, 2]]),
    disciplines: ['Weaponsmith'],
    rating: 0,
    flags: ['AutoLearned'],
    type: 'Component',
  };
  const weapons: Recipe[] = [];
  for (let i = 0; i < 20; i++) {
    weapons.push({
      ...makeRecipe(`w-${i}`, 100 + i, 1, [[20, 2]]),
      disciplines: ['Weaponsmith'],
      rating: 0,
      flags: [],
      type: 'Weapon',
    });
  }

  const byOut = new Map<number, Recipe[]>([
    [10, [rRefine]],
    [20, [rComp]],
  ]);
  weapons.forEach((w) => byOut.set(w.outputId, [w]));
  const prices = new Map<number, PriceInfo>([[1, { sell: 2, buy: 2 } as PriceInfo]]);

  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 25,
    recipes: [rRefine, rComp, ...weapons],
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  // Unter Rang 470 darf trotz allowDiscovery=true KEINE Flut an 20 1-Craft-Schritten entstehen!
  assert.ok(plan.steps.length <= 2, `Schritte sollen gebündelt sein (max 2), erhalten: ${plan.steps.length}`);
  assert.equal(plan.steps[0].recipe.type, 'Refinement', 'Tier-Start 0-25 muss Refinement wählen');
  assert.equal(plan.steps[0].needsDiscovery, false);
});

// ============================================================================
// Test 24: Ascended accountgebundene Materialien werden nicht für Leveling vorgeschlagen
// ============================================================================
test('24. Ascended accountgebundene Materialien (Blutsteinstaub, Obsidianscherben) werden nicht vorgeschlagen', () => {
  const rBloodstoneBrick: Recipe = {
    ...makeRecipe('r-bloodstone-brick', 46725, 1, [
      [46731, 100], // Pile of Bloodstone Dust
      [19925, 2],   // Obsidian Shard
      [46747, 10],  // Thermocatalytic Reagent
    ]),
    disciplines: ['Artificer'],
    rating: 450,
    flags: ['AutoLearned'],
    type: 'Refinement',
  };
  const rPearlStaff: Recipe = {
    ...makeRecipe('r-pearl-staff', 50001, 1, [
      [19701, 2], // Orichalcum Ingot
      [19900, 1], // Inscription
    ]),
    disciplines: ['Artificer'],
    rating: 400,
    flags: [],
    type: 'Staff',
  };

  const byOut = new Map<number, Recipe[]>([
    [46725, [rBloodstoneBrick]],
    [50001, [rPearlStaff]],
  ]);
  const prices = new Map<number, PriceInfo>([
    [19701, { sell: 50, buy: 40 } as PriceInfo],
    [19900, { sell: 100, buy: 80 } as PriceInfo],
  ]);

  const plan = planLevelRoute({
    discipline: 'Artificer',
    fromRank: 450,
    toRank: 475,
    recipes: [rBloodstoneBrick, rPearlStaff],
    recipesByOutput: byOut,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  const usesBloodstone = plan.steps.some((s) => s.recipe.id === 'r-bloodstone-brick');
  assert.equal(usesBloodstone, false, 'Blutstein-Ziegel darf niemals als Leveling-Rezept gewählt werden');
  assert.equal(plan.purchases.has(46731), false, 'Blutsteinstaub darf nicht auf der Einkaufsliste landen');
});
