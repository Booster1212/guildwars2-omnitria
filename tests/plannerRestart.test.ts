import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLevelRoute } from '../src/domain/levelPlanner.ts';
import {
  calculateCraftingPlan,
  createDisciplineRecipeProvider,
  type TargetCraftItem,
} from '../src/domain/craftingCalculator.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';

test('Levelplaner Neustart-Szenario: Entdeckungsrezepte und Zwischenprodukte aktiviert', () => {
  // Rezept 1: Refinement (AutoLearned)
  const rRefine: Recipe = {
    id: 'r1',
    outputId: 10,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 1, count: 2 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Refinement',
  };

  // Rezept 2: Zwischenprodukt-Komponente (AutoLearned)
  const rComp: Recipe = {
    id: 'r2',
    outputId: 20,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 2 }],
    source: 'official',
    flags: ['AutoLearned'],
    type: 'Component',
  };

  // Rezept 3: Entdeckungsrezept als Zwischenprodukt (z. B. spezielle Inschrift / Discovery)
  const rDiscIntermediate: Recipe = {
    id: 'r3',
    outputId: 30,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [{ itemId: 10, count: 1 }, { itemId: 2, count: 1 }],
    source: 'official',
    flags: [], // Entdeckungsrezept!
    type: 'Inscription',
  };

  // Rezept 4: Endprodukt-Waffe (Entdeckungsrezept)
  const rWeapon: Recipe = {
    id: 'r4',
    outputId: 40,
    outputCount: 1,
    kind: 'official',
    disciplines: ['Weaponsmith'],
    rating: 0,
    ingredients: [
      { itemId: 20, count: 2 },
      { itemId: 30, count: 1 },
    ],
    source: 'official',
    flags: [], // Entdeckungsrezept!
    type: 'Sword',
  };

  const recipes = [rRefine, rComp, rDiscIntermediate, rWeapon];
  const byOutput = new Map<number, Recipe[]>();
  recipes.forEach((r) => byOutput.set(r.outputId, [...(byOutput.get(r.outputId) ?? []), r]));

  const prices = new Map<number, PriceInfo>([
    [1, { sell: 5, buy: 4, sellQty: 100, buyQty: 100 }],
    [2, { sell: 10, buy: 8, sellQty: 100, buyQty: 100 }],
    [10, { sell: 20, buy: 15, sellQty: 100, buyQty: 100 }],
    [20, { sell: 50, buy: 40, sellQty: 100, buyQty: 100 }],
    [30, { sell: 60, buy: 50, sellQty: 100, buyQty: 100 }],
    [40, { sell: 200, buy: 160, sellQty: 100, buyQty: 100 }],
  ]);

  // 1. Calculate leveling route with both checkboxes enabled
  const plan = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 25,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  assert.ok(plan.steps.length > 0, 'Route darf nicht leer sein');
  assert.equal(plan.gaps.length, 0, 'Es dürfen keine Lücken entstehen');

  // 2. Rekursive Materialbedarfsberechnung
  const provider = createDisciplineRecipeProvider(byOutput, 'Weaponsmith', {
    allowDiscovery: true,
    maxRating: 25,
  });

  const targets: TargetCraftItem[] = plan.steps.map((st) => ({
    itemId: st.recipe.outputId,
    count: st.crafts,
    recipe: st.recipe,
    stepKey: st.key,
  }));

  const calc = calculateCraftingPlan(targets, provider, {
    strategy: 'all_craft',
    prices,
  });

  assert.ok(calc.trees.length > 0, 'Baum darf nicht leer sein');
  assert.ok(calc.materials.length > 0, 'Materialtabelle darf nicht leer sein');

  // End product must have positive requirements (not 0)
  const endMat = calc.materials.find((m) => m.role === 'end_product');
  if (endMat) {
    assert.ok(endMat.grossDemand > 0, 'Endprodukt Bruttobedarf muss > 0 sein');
    assert.ok(endMat.netDemand > 0, 'Endprodukt Nettobedarf muss > 0 sein');
    assert.ok(endMat.craftRuns > 0, 'Endprodukt CraftRuns muss > 0 sein');
  }

  // Intermediate product requirements must be positive
  const interMat = calc.materials.find((m) => m.role === 'intermediate');
  if (interMat) {
    assert.ok(interMat.grossDemand > 0, 'Zwischenprodukt Bruttobedarf muss > 0 sein');
    assert.ok(interMat.netDemand > 0, 'Zwischenprodukt Nettobedarf muss > 0 sein');
    assert.ok(interMat.craftRuns > 0, 'Zwischenprodukt CraftRuns muss > 0 sein');
  }

  // Basismaterial muss positiv sein
  const baseMat = calc.materials.find((m) => m.role === 'base_material');
  assert.ok(baseMat, 'Mindestens ein Basismaterial muss vorhanden sein');
  assert.ok(baseMat.grossDemand > 0);
  assert.ok(baseMat.netDemand > 0);
});

test('Neustart-Verhalten: Haken auf 0 und Optionen (allowDiscovery/craftIntermediates) inaktiv', async () => {
  const { DEFAULT_CRAFTING } = await import('../src/data/progressStore.ts');
  assert.equal(DEFAULT_CRAFTING.allowDiscovery, false, 'allowDiscovery muss default false sein');
  assert.equal(DEFAULT_CRAFTING.craftIntermediates, false, 'craftIntermediates muss default false sein');
  assert.deepEqual(DEFAULT_CRAFTING.doneSteps, [], 'doneSteps muss default leer sein');
});

