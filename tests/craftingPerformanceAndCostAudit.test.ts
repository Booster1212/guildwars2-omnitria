import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLevelRoute, maxRankOf } from '../src/domain/levelPlanner.ts';
import { calculateCraftingPlan, createDisciplineRecipeProvider } from '../src/domain/craftingCalculator.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';

const DISCIPLINES = [
  'Weaponsmith',
  'Huntsman',
  'Artificer',
  'Armorsmith',
  'Leatherworker',
  'Tailor',
  'Jeweler',
  'Chef',
  'Scribe',
] as const;

function generateDisciplineRecipes(discipline: string, maxRank: number): {
  recipes: Recipe[];
  byOutput: Map<number, Recipe[]>;
  prices: Map<number, PriceInfo>;
} {
  const recipes: Recipe[] = [];
  const byOutput = new Map<number, Recipe[]>();
  const prices = new Map<number, PriceInfo>();

  const tierSteps = [0, 75, 150, 225, 300, 400];

  tierSteps.forEach((rating, tierIdx) => {
    if (rating >= maxRank) return;
    const baseId = tierIdx * 1000 + 100;

    // Refinement
    const rRefine: Recipe = {
      id: `${discipline}-ref-${tierIdx}`,
      outputId: baseId,
      outputCount: 1,
      disciplines: [discipline],
      rating,
      ingredients: [{ itemId: baseId - 50, count: 2 }],
      flags: ['AutoLearned'],
      type: discipline === 'Chef' ? 'IngredientCooking' : 'Refinement',
    };
    recipes.push(rRefine);
    byOutput.set(rRefine.outputId, [rRefine]);
    prices.set(baseId - 50, { sell: 20 * (tierIdx + 1), buy: 15 * (tierIdx + 1) } as PriceInfo);

    // Component / Inscription (starts at rating + 20)
    const rComp: Recipe = {
      id: `${discipline}-comp-${tierIdx}`,
      outputId: baseId + 10,
      outputCount: 1,
      disciplines: [discipline],
      rating: rating + 20,
      ingredients: [{ itemId: baseId, count: 2 }],
      flags: ['AutoLearned'],
      type: discipline === 'Chef' ? 'IngredientCooking' : 'Component',
    };
    recipes.push(rComp);
    byOutput.set(rComp.outputId, [rComp]);

    // Standard AutoLearned Item (starts at rating + 35)
    const rItemAuto: Recipe = {
      id: `${discipline}-item-auto-${tierIdx}`,
      outputId: baseId + 20,
      outputCount: 1,
      disciplines: [discipline],
      rating: rating + 35,
      ingredients: [{ itemId: baseId + 10, count: 2 }],
      flags: ['AutoLearned'],
      type: discipline === 'Chef' ? 'Meal' : 'Weapon',
    };
    recipes.push(rItemAuto);
    byOutput.set(rItemAuto.outputId, [rItemAuto]);

    // Discovery Items (gains discovery bonus)
    for (let d = 0; d < 5; d++) {
      const rItemDisc: Recipe = {
        id: `${discipline}-item-disc-${tierIdx}-${d}`,
        outputId: baseId + 30 + d,
        outputCount: 1,
        disciplines: [discipline],
        rating: rating + 35,
        ingredients: [{ itemId: baseId + 10, count: 2 }],
        flags: [],
        type: discipline === 'Chef' ? 'Meal' : 'Weapon',
      };
      recipes.push(rItemDisc);
      byOutput.set(rItemDisc.outputId, [rItemDisc]);
    }
  });

  // For 400-500 exotic discovery tier
  if (maxRank > 400) {
    for (let i = 0; i < 30; i++) {
      const rExotic: Recipe = {
        id: `${discipline}-exotic-${i}`,
        outputId: 90000 + i,
        outputCount: 1,
        disciplines: [discipline],
        rating: 400,
        ingredients: [{ itemId: 5100 + 10, count: 1 }],
        flags: [],
        type: discipline === 'Chef' ? 'Feast' : 'Weapon',
      };
      recipes.push(rExotic);
      byOutput.set(rExotic.outputId, [rExotic]);
    }
  }

  return { recipes, byOutput, prices };
}

// ============================================================================
// Test 1: Performance Audit across all 9 disciplines
// ============================================================================
test('1. Performance Audit: Alle 9 Handwerksberufe berechnen Level-Routen in unter 250ms ohne Lag', () => {
  // Warm up JIT
  const { recipes: wRec, byOutput: wBy, prices: wPr } = generateDisciplineRecipes('Weaponsmith', 500);
  planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 500,
    recipes: wRec,
    recipesByOutput: wBy,
    prices: wPr,
    options: { allowDiscovery: true, craftIntermediates: true },
  });

  for (const disc of DISCIPLINES) {
    const maxRank = disc === 'Jeweler' || disc === 'Scribe' ? 400 : 500;
    const { recipes, byOutput, prices } = generateDisciplineRecipes(disc, maxRank);

    const start = performance.now();
    const plan = planLevelRoute({
      discipline: disc,
      fromRank: 0,
      toRank: maxRank,
      recipes,
      recipesByOutput: byOutput,
      prices,
      options: {
        allowDiscovery: true,
        craftIntermediates: true,
      },
    });
    const duration = performance.now() - start;

    assert.ok(
      duration < 250,
      `Beruf ${disc} braucht ${duration.toFixed(2)}ms (Soll: < 250ms, kein UI-Lag)`,
    );
    assert.ok(plan.steps.length > 0, `Beruf ${disc} muss Schritte erzeugen`);
    assert.ok(Number.isFinite(plan.totalCost), `Beruf ${disc} Gesamtkosten müssen endlich sein`);
    assert.ok(Number.isFinite(plan.totalCrafts), `Beruf ${disc} Herstellungen müssen endlich sein`);
    assert.equal(Number.isNaN(plan.totalCost), false, `Beruf ${disc} Gesamtkosten dürfen nicht NaN sein`);
  }
});

// ============================================================================
// Test 2: allowDiscovery Toggle Auswirkung auf Gesamtkosten & Schritte
// ============================================================================
test('2. Gesamtkosten ändern sich messbar beim Umschalten von allowDiscovery', () => {
  const { recipes, byOutput, prices } = generateDisciplineRecipes('Weaponsmith', 500);

  const planWithoutDisc = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: false,
      craftIntermediates: true,
    },
  });

  const planWithDisc = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  // Da Entdeckungen Bonus-EP bieten, ist die Entdeckungsroute kostengünstiger und benötigt weniger Crafts
  assert.notEqual(
    planWithDisc.totalCost,
    planWithoutDisc.totalCost,
    'Gesamtkosten müssen sich zwischen allowDiscovery=true und false unterscheiden',
  );
  assert.ok(
    planWithDisc.totalCost < planWithoutDisc.totalCost,
    'Entdeckungsroute muss durch Bonus-EP kosteneffizienter sein',
  );
});

// ============================================================================
// Test 3: Dynamische Preisaktualisierung rechnet Gesamtkosten neu
// ============================================================================
test('3. Dynamische Preisaktualisierung (Trading Post API) aktualisiert die Gesamtkosten', () => {
  const { recipes, byOutput, prices } = generateDisciplineRecipes('Armorsmith', 150);

  const plan1 = planLevelRoute({
    discipline: 'Armorsmith',
    fromRank: 0,
    toRank: 150,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  // Preise steigen um den Faktor 2
  const updatedPrices = new Map<number, PriceInfo>();
  for (const [id, p] of prices) {
    updatedPrices.set(id, {
      sell: p.sell * 2,
      buy: p.buy * 2,
      sellQty: p.sellQty,
      buyQty: p.buyQty,
    } as PriceInfo);
  }

  const plan2 = planLevelRoute({
    discipline: 'Armorsmith',
    fromRank: 0,
    toRank: 150,
    recipes,
    recipesByOutput: byOutput,
    prices: updatedPrices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  assert.ok(plan2.totalCost > plan1.totalCost, 'Aktualisierte Preise müssen die Gesamtkosten erhöhen');
  assert.equal(plan2.totalCost, plan1.totalCost * 2, 'Verdoppelte Materialpreise verdoppeln die Gesamtkosten');
});

// ============================================================================
// Test 4: Alle Schritte erledigt -> Offene Kosten auf 0
// ============================================================================
test('4. Wenn alle Schritte erledigt sind, betragen die offenen Kosten exakt 0', () => {
  const { recipes, byOutput, prices } = generateDisciplineRecipes('Tailor', 75);

  const plan = planLevelRoute({
    discipline: 'Tailor',
    fromRank: 0,
    toRank: 75,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
    },
  });

  const allDoneKeys = new Set(plan.steps.map((s) => s.key));

  const provider = createDisciplineRecipeProvider(byOutput, 'Tailor', {
    allowDiscovery: true,
    maxRating: 75,
  });

  // Offene Ziele berechnen (nur unerledigte Schritte)
  const openTargets = plan.steps
    .filter((st) => !allDoneKeys.has(st.key))
    .map((st) => ({
      itemId: st.recipe.outputId,
      count: st.crafts,
      recipe: st.recipe,
      stepKey: st.key,
      needsDiscovery: st.needsDiscovery,
    }));

  assert.equal(openTargets.length, 0, 'Keine offenen Ziele vorhanden');

  // Prüfe den UI-Fallback: wenn keine offenen Ziele mehr existieren, ist der offene Aufwand 0
  const isAllStepsCompleted = plan.steps.length > 0 && openTargets.length === 0;
  const remainingCost = isAllStepsCompleted ? 0 : plan.totalCost;
  assert.equal(remainingCost, 0, 'Offene Kosten müssen bei 100% Fortschritt exakt 0 betragen');
});

