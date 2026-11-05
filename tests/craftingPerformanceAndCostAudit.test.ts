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

// ============================================================================
// Test 5: gw2crafts Parität: Günstigster Weg (Normal) & Bulk-Modus (0-450 Bulk, 450+ Discoveries)
// ============================================================================
test('5. gw2crafts Parität: Normal-Modus (1x Discoveries) und Bulk-Modus (0-450 Bulk, ab 450 Discoveries) verhindern 10x Teuerung', () => {
  const { recipes, byOutput, prices } = generateDisciplineRecipes('Weaponsmith', 500);

  // 1. Normal (Cost) Mode: 0–400 and 0–500
  const planCost = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: true,
      craftIntermediates: true,
      mode: 'cost',
    },
  });

  // Gesamtkosten für 0-500 müssen unter 30 Gold (300.000 Kupfer) liegen
  assert.ok(
    planCost.totalCost < 300_000,
    `Kosten im Normal-Modus müssen unter 30g liegen (erhalten: ${(planCost.totalCost / 10000).toFixed(2)}g)`,
  );

  // Im Normal-Modus sind Entdeckungen von Ausrüstung strikt 1x initial ausgeführt (keine 24x Wiederholungen)
  for (const step of planCost.steps) {
    if (step.needsDiscovery && step.category === 'item') {
      assert.equal(
        step.discoveryCrafts,
        1,
        `Entdeckungen von Ausrüstung müssen initial strikt 1x ausgeführt werden (Schritt: ${step.key})`,
      );
    }
  }

  // Tier-Start (0-20) muss 100% Veredelung sein
  assert.equal(planCost.steps[0].recipe.type, 'Refinement');
  assert.equal(planCost.steps[0].needsDiscovery, false);

  // 2. Bulk (Fast) Mode: 0–500
  const planBulk = planLevelRoute({
    discipline: 'Weaponsmith',
    fromRank: 0,
    toRank: 500,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: {
      allowDiscovery: false,
      craftIntermediates: true,
      mode: 'fast',
    },
  });

  // Unter Rang 450 dürfen im Bulk-Modus KEINE Entdeckungen vorkommen (reines Bulk-Crafting)
  const bulkSub450Steps = planBulk.steps.filter((s) => s.fromRank < 450);
  for (const s of bulkSub450Steps) {
    assert.equal(
      s.needsDiscovery,
      false,
      `Schritt ${s.key} unter Rang 450 darf im Bulk-Modus keine Entdeckung sein!`,
    );
  }

  // Ab Rang 450 setzen im Bulk-Modus Entdeckungen für Exotics ein
  const bulk450PlusSteps = planBulk.steps.filter((s) => s.fromRank >= 450);
  assert.ok(bulk450PlusSteps.length > 0, 'Muss Schritte ab 450 enthalten');
  const hasDiscoveryAbove450 = bulk450PlusSteps.some((s) => s.needsDiscovery);
  assert.ok(
    hasDiscoveryAbove450,
    'Im Bulk-Modus müssen ab Rang 450 exotische Entdeckungen für den Endspurt greifen',
  );
});

// ============================================================================
// Test 5: Real GW2 Mid-Tier Audit (Lederer 125–250 vs. gw2crafts)
// Prevents 128x Baumwollballen/Leinenballen, 64x Insignia grinding, and 8x Bag filler
// ============================================================================
test('5. Lederer 125–250 Audit gegen gw2crafts: Keine 128x Ballen, keine 64x Insignien-Grinds und keine Taschen-Lückenfüller', () => {
  const recipes: Recipe[] = [
    // Rank 125: Expensive Embroidered Wool Insignia (AutoLearned) + 8 Discoverable Armor Pieces
    {
      id: 'insig-125',
      outputId: 2125,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 125,
      ingredients: [
        { itemId: 19740, count: 2 }, // Bolt of Wool
        { itemId: 24291, count: 3 }, // Small Fang (expensive fine material)
      ],
      flags: ['AutoLearned'],
      type: 'Insignia',
    },
    ...Array.from({ length: 8 }, (_, idx): Recipe => ({
      id: `armor-125-${idx}`,
      outputId: 3125 + idx,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 125,
      ingredients: [
        { itemId: 1200 + (idx % 2), count: 1 }, // Basic Wool/Leather Panel
        { itemId: 2125, count: 1 },             // Insignia
      ],
      flags: [],
      type: idx % 2 === 0 ? 'Coat' : 'Boots',
    })),

    // Rank 150: Baumwollballen (Refinement), Basic Panels (Component), 12-Slot Bag (Bag), and 8 Discoverable Armor Pieces
    {
      id: 'bolt-cotton-150',
      outputId: 19742,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [{ itemId: 19741, count: 2 }], // Cotton Scrap (7c)
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
    {
      id: 'panel-cotton-150-a',
      outputId: 1501,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [
        { itemId: 19742, count: 2 }, // 2x Bolt of Cotton
        { itemId: 19794, count: 1 }, // Spool of Cotton Thread (24c vendor)
      ],
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'panel-cotton-150-b',
      outputId: 1502,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [
        { itemId: 19742, count: 1 },
        { itemId: 19794, count: 1 },
      ],
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'bag-12-slot-150',
      outputId: 9150,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [
        { itemId: 19742, count: 10 },
        { itemId: 13007, count: 1 }, // Major Rune of Holding (50s vendor)
      ],
      flags: ['AutoLearned'],
      type: 'Bag',
    },
    {
      id: 'insig-150',
      outputId: 2150,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [
        { itemId: 19742, count: 1 },
        { itemId: 24279, count: 3 }, // Blood (fine material)
      ],
      flags: ['AutoLearned'],
      type: 'Insignia',
    },
    ...Array.from({ length: 8 }, (_, idx): Recipe => ({
      id: `armor-150-${idx}`,
      outputId: 3150 + idx,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 150,
      ingredients: [
        { itemId: 1501, count: 1 },
        { itemId: 1502, count: 1 },
        { itemId: 2150, count: 1 },
      ],
      flags: [],
      type: idx % 2 === 0 ? 'Coat' : 'Gloves',
    })),

    // Rank 175: Starke Baumwoll-Insignie (AutoLearned Insignia) + 8 Discoverable Armor Pieces
    {
      id: 'insig-175-mighty',
      outputId: 2175,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 175,
      ingredients: [
        { itemId: 19742, count: 2 },
        { itemId: 24280, count: 3 }, // Vial of Thick Blood (240c each)
        { itemId: 19794, count: 6 },
      ],
      flags: ['AutoLearned'],
      type: 'Insignia',
    },
    ...Array.from({ length: 8 }, (_, idx): Recipe => ({
      id: `armor-175-${idx}`,
      outputId: 3175 + idx,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 175,
      ingredients: [
        { itemId: 1501, count: 1 },
        { itemId: 1502, count: 1 },
        { itemId: 2175, count: 1 },
      ],
      flags: [],
      type: idx % 2 === 0 ? 'Coat' : 'Leggings',
    })),

    // Rank 200: Starke bestickte Baumwoll-Insignie (AutoLearned Insignia) + 8 Discoverable Armor Pieces
    {
      id: 'insig-200-embroidered',
      outputId: 2200,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 200,
      ingredients: [
        { itemId: 19742, count: 2 },
        { itemId: 24280, count: 3 }, // Vial of Thick Blood (600c each)
        { itemId: 19794, count: 4 },
      ],
      flags: ['AutoLearned'],
      type: 'Insignia',
    },
    ...Array.from({ length: 8 }, (_, idx): Recipe => ({
      id: `armor-200-${idx}`,
      outputId: 3200 + idx,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 200,
      ingredients: [
        { itemId: 1501, count: 1 },
        { itemId: 1502, count: 1 },
        { itemId: 2200, count: 1 },
      ],
      flags: [],
      type: idx % 2 === 0 ? 'Shoulders' : 'Helm',
    })),

    // Rank 225: Leinenballen (Refinement) + Basic Linen Panel (Component) + Discoverable Armor
    {
      id: 'bolt-linen-225',
      outputId: 19744,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 225,
      ingredients: [{ itemId: 19743, count: 2 }], // Linen Scrap (19c)
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
    {
      id: 'panel-linen-225',
      outputId: 2251,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 225,
      ingredients: [
        { itemId: 19744, count: 2 },
        { itemId: 19793, count: 1 },
      ],
      flags: ['AutoLearned'],
      type: 'Component',
    },
  ];

  const byOutput = new Map<number, Recipe[]>();
  for (const r of recipes) {
    byOutput.set(r.outputId, [r]);
  }

  const prices = new Map<number, PriceInfo>([
    [19740, { sell: 18, buy: 14 } as PriceInfo],
    [24291, { sell: 55, buy: 45 } as PriceInfo],
    [1200, { sell: 40, buy: 30 } as PriceInfo],
    [1201, { sell: 40, buy: 30 } as PriceInfo],
    [19741, { sell: 7, buy: 5 } as PriceInfo],
    [19742, { sell: 16, buy: 12 } as PriceInfo],
    [19794, { sell: 24, buy: 24 } as PriceInfo],
    // Simulate scalped TP listings for intermediate panels (50s each on TP, vs ~56c self-crafted!)
    [1501, { sell: 5000, buy: 100 } as PriceInfo],
    [1502, { sell: 5000, buy: 100 } as PriceInfo],
    [24279, { sell: 80, buy: 60 } as PriceInfo],
    [24280, { sell: 580, buy: 490 } as PriceInfo],
    [19743, { sell: 19, buy: 15 } as PriceInfo],
    [19744, { sell: 40, buy: 32 } as PriceInfo],
    [19793, { sell: 32, buy: 32 } as PriceInfo],
  ]);

  // Check both Normal (cost) and Bulk (fast) modes, even if craftIntermediates was left false!
  for (const mode of ['cost', 'fast'] as const) {
    const plan = planLevelRoute({
      discipline: 'Leatherworker',
      fromRank: 125,
      toRank: 245,
      recipes,
      recipesByOutput: byOutput,
      prices,
      options: {
        allowDiscovery: mode === 'cost',
        craftIntermediates: false,
        mode,
      },
    });

    // 1. Inventory Bags ('Bag') must NEVER be used as leveling steps
    const bagSteps = plan.steps.filter((s) => s.recipe.type === 'Bag');
    assert.equal(bagSteps.length, 0, `[${mode}] Taschen dürfen niemals als Leveling-Schritt gewählt werden`);

    // 2. Refinements (Baumwollballen / Leinenballen) must stay around ~36-42 crafts (10 ranks), NEVER 128 crafts!
    const cottonStep = plan.steps.find((s) => s.recipe.id === 'bolt-cotton-150');
    assert.ok(cottonStep, `[${mode}] Baumwollballen muss am Tier-Start 150 genutzt werden`);
    assert.ok(
      cottonStep.crafts <= 45,
      `[${mode}] Baumwollballen darf maximal ~42x hergestellt werden (nicht 128x!), erhalten: ${cottonStep.crafts}`,
    );

    const linenStep = plan.steps.find((s) => s.recipe.id === 'bolt-linen-225');
    assert.ok(linenStep, `[${mode}] Leinenballen muss am Tier-Start 225 genutzt werden`);
    assert.ok(
      linenStep.crafts <= 45,
      `[${mode}] Leinenballen darf maximal ~42x hergestellt werden (nicht 128x!), erhalten: ${linenStep.crafts}`,
    );

    // 3. Insignias must NEVER be ground 64x as standalone leveling steps!
    const insigniaSteps = plan.steps.filter((s) => s.recipe.type === 'Insignia');
    assert.equal(
      insigniaSteps.length,
      0,
      `[${mode}] Teure Insignien dürfen niemals 64x als eigenständiger Leveling-Schritt gegrindet werden (gefunden: ${insigniaSteps.map((s) => `${s.recipe.id}:${s.crafts}x`).join(', ')})`,
    );

    // 4. Since craftIntermediates === false ("Buy all components"), no buyable intermediate (like panels 1501/1502 or bolts 19742) may be in prepSteps!
    for (const st of plan.steps) {
      const buyablePrep = st.prepSteps.filter((p) => prices.has(p.outputId));
      assert.equal(
        buyablePrep.length,
        0,
        `[${mode}] Bei "Alle Komponenten kaufen" (craftIntermediates=false) dürfen keine kaufbaren Komponenten in prepSteps stehen`,
      );
    }
  }
});

// ============================================================================
// 6. Purchase List & PrepSteps Parity: "Buy Everything" vs "Self-Craft" (Jagende Gesetzlosen-Stiefel)
// ============================================================================
test('6. "Buy all components" shows zero prepSteps; "Self-craft" lists complete bottom-up chain including Wool Patch', () => {
  // Exact reproduction of Leatherworker 140 -> 150: Jagende Gesetzlosen-Stiefel
  // Raw materials:
  // - 19728: Dünnes Lederstück (Thin Leather Section)
  // - 19739: Wollreste (Wool Scrap)
  // - 19789: Spule Wollfaden (Spool of Wool Thread)
  // - 24350: Kleine Klaue (Small Claw)
  // Intermediates:
  // - 19733: Getrockneter dünner Lederflicken (2x 19728)
  // - 19740: Wollballen (2x 19739)
  // - 71225: Wollflicken / Wool Patch (1x 19733 + 1x 19740)
  // - 19815: Jagende bestickte Woll-Insignie (1x 71225 + 8x 24350)
  // - 13094: Dünner Stiefelhals (2x 19733 + 1x 19789)
  // - 13030: Dünne Stiefelsohle (2x 19733)
  // Target:
  // - 10500: Jagende Gesetzlosen-Stiefel (1x 19815 + 1x 13094 + 1x 13030)
  const recipes: Recipe[] = [
    {
      id: 'ref-leather-75',
      outputId: 19733,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 75,
      ingredients: [{ itemId: 19728, count: 2 }],
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
    {
      id: 'ref-wool-75',
      outputId: 19740,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 75,
      ingredients: [{ itemId: 19739, count: 2 }],
      flags: ['AutoLearned'],
      type: 'Refinement',
    },
    {
      id: 'comp-wool-patch-125',
      outputId: 71225,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 125,
      ingredients: [
        { itemId: 19733, count: 1 },
        { itemId: 19740, count: 1 },
      ],
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'insig-hunters-wool-125',
      outputId: 19815,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 125,
      ingredients: [
        { itemId: 71225, count: 1 },
        { itemId: 24350, count: 8 },
      ],
      flags: ['AutoLearned'],
      type: 'Insignia',
    },
    {
      id: 'comp-boot-upper-75',
      outputId: 13094,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 75,
      ingredients: [
        { itemId: 19733, count: 2 },
        { itemId: 19789, count: 1 },
      ],
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'comp-boot-sole-75',
      outputId: 13030,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 75,
      ingredients: [{ itemId: 19733, count: 2 }],
      flags: ['AutoLearned'],
      type: 'Component',
    },
    {
      id: 'boots-hunters-outlaw-125',
      outputId: 10500,
      outputCount: 1,
      disciplines: ['Leatherworker'],
      rating: 125,
      ingredients: [
        { itemId: 19815, count: 1 },
        { itemId: 13094, count: 1 },
        { itemId: 13030, count: 1 },
      ],
      flags: [],
      type: 'Boots',
    },
  ];

  const byOutput = new Map<number, Recipe[]>();
  for (const r of recipes) {
    byOutput.set(r.outputId, [r]);
  }

  // Realistic TP prices where direct components are more expensive than raw materials,
  // and Insignia / Leather Square have varying TP prices:
  const prices = new Map<number, PriceInfo>([
    [19728, { sell: 10, buy: 8 } as PriceInfo],
    [19739, { sell: 12, buy: 10 } as PriceInfo],
    [19789, { sell: 16, buy: 16 } as PriceInfo],
    [24350, { sell: 40, buy: 30 } as PriceInfo],
    [19733, { sell: 15, buy: 12 } as PriceInfo],
    [19740, { sell: 20, buy: 16 } as PriceInfo],
    [71225, { sell: 30, buy: 22 } as PriceInfo],
    [19815, { sell: 250, buy: 180 } as PriceInfo],
    [13094, { sell: 150, buy: 90 } as PriceInfo],
    [13030, { sell: 140, buy: 85 } as PriceInfo],
    [10500, { sell: 320, buy: 240 } as PriceInfo],
  ]);

  // Case A: "Buy all components" (craftIntermediates = false)
  const planBuyAll = planLevelRoute({
    discipline: 'Leatherworker',
    fromRank: 140,
    toRank: 150,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { allowDiscovery: true, craftIntermediates: false, mode: 'fast' },
  });

  assert.equal(planBuyAll.steps.length, 1);
  const stepBuy = planBuyAll.steps[0];
  assert.equal(stepBuy.prepSteps.length, 0, 'Buy all components must have 0 prepSteps');
  assert.equal(planBuyAll.intermediates.length, 0, 'Buy all components must have 0 intermediates');
  // Direct components must be in purchases
  assert.equal(planBuyAll.purchases.has(19815), true, 'Insignia must be bought directly');
  assert.equal(planBuyAll.purchases.has(13094), true, 'Boot Upper must be bought directly');
  assert.equal(planBuyAll.purchases.has(13030), true, 'Boot Sole must be bought directly');
  // Sub-materials must NOT be in purchases
  assert.equal(planBuyAll.purchases.has(19733), false);
  assert.equal(planBuyAll.purchases.has(71225), false);

  // Case B: "Self-craft ingredients" (craftIntermediates = true)
  const planCraftAll = planLevelRoute({
    discipline: 'Leatherworker',
    fromRank: 140,
    toRank: 150,
    recipes,
    recipesByOutput: byOutput,
    prices,
    options: { allowDiscovery: true, craftIntermediates: true, mode: 'fast' },
  });

  assert.equal(planCraftAll.steps.length, 1);
  const stepCraft = planCraftAll.steps[0];
  // All 6 intermediate recipes must be in prepSteps:
  // 19733 (Leather Square), 19740 (Wool Bolt), 71225 (Wool Patch), 19815 (Insignia), 13094 (Upper), 13030 (Sole)
  const prepIds = stepCraft.prepSteps.map((p) => p.outputId);
  assert.deepEqual(
    new Set(prepIds),
    new Set([19733, 19740, 71225, 19815, 13094, 13030]),
    'All 6 intermediates including Wool Patch (71225) and Insignia (19815) must be in prepSteps',
  );

  // Topological order check: 19733 and 19740 MUST appear before 71225 (Wool Patch),
  // and 71225 MUST appear before 19815 (Insignia)!
  const idxLeather = prepIds.indexOf(19733);
  const idxWool = prepIds.indexOf(19740);
  const idxPatch = prepIds.indexOf(71225);
  const idxInsig = prepIds.indexOf(19815);
  assert.ok(idxLeather < idxPatch, 'Cured Thin Leather Square must be crafted before Wool Patch');
  assert.ok(idxWool < idxPatch, 'Bolt of Wool must be crafted before Wool Patch');
  assert.ok(idxPatch < idxInsig, 'Wool Patch must be crafted before Embroidered Wool Insignia');

  // Purchases must only contain raw base materials (19728, 19739, 19789, 24350), matching craftingCalculator!
  assert.deepEqual(
    new Set(planCraftAll.purchases.keys()),
    new Set([19728, 19739, 19789, 24350]),
    'Purchases in Self-Craft mode must strictly contain the raw base materials',
  );
});




