import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCraftingPlan,
  createDisciplineRecipeProvider,
  isRecipeDiscovery,
  type CraftingRecipeProvider,
  type TargetCraftItem,
} from '../src/domain/craftingCalculator.ts';
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
