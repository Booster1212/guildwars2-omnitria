import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTree } from '../src/domain/recipeTree.ts';
import type { RecipeProvider } from '../src/domain/recipeTree.ts';
import { createLegendaryModel } from '../src/domain/legendary.ts';
import type { CommunityDataset } from '../src/domain/legendary.ts';
import { estimateCosts, splitCoins } from '../src/domain/costs.ts';
import { ranksPerCraft, categoryOf } from '../src/domain/craftingXp.ts';
import { planLevelRoute, maxRankOf } from '../src/domain/levelPlanner.ts';
import { resolveSources } from '../src/domain/sources.ts';
import type { Recipe, PriceInfo } from '../src/domain/types.ts';
import {
  GLOBAL_ACHIEVEMENTS,
  BOSS_ACHIEVEMENTS,
  getAchievementTitle,
  getAchievementDesc,
  getAchievementCategoryLabel,
  getAchievementTierInfo,
} from '../src/data/achievements.ts';

const rec = (id: string, out: number, count: number, ing: [number, number][], extra: Partial<Recipe> = {}): Recipe => ({
  id,
  outputId: out,
  outputCount: count,
  kind: 'mf',
  disciplines: [],
  rating: 0,
  ingredients: ing.map(([itemId, c]) => ({ itemId, count: c })),
  source: 'community',
  ...extra,
});
const provider = (rs: Recipe[]): RecipeProvider => ({ recipeFor: (id) => rs.find((r) => r.outputId === id) });

test('Aggregation: gleiches Material in mehreren Ästen wird summiert', () => {
  // Waffe(1) = A(2) + B(3); A = 5x X(10); B = 3x X(10) + 2x Y(11)
  const p = provider([rec('w', 1, 1, [[2, 1], [3, 1]]), rec('a', 2, 1, [[10, 5]]), rec('b', 3, 1, [[10, 3], [11, 2]])]);
  const r = buildTree(1, 1, p);
  assert.equal(r.bom.get(10)!.total, 8);
  assert.equal(r.bom.get(11)!.total, 2);
  assert.equal(r.bom.size, 2);
});

test('Mengen multiplizieren sich entlang der Kette', () => {
  const p = provider([rec('w', 1, 1, [[2, 3]]), rec('a', 2, 1, [[3, 4]]), rec('b', 3, 2, [[4, 5]])]);
  const r = buildTree(1, 1, p);
  // 3x A -> 12x B; B liefert 2 pro Herstellung -> 6 Herstellungen -> 30x C
  assert.equal(r.bom.get(4)!.total, 30);
  assert.equal(r.crafts.get('b')!.count, 6);
});

test('Bestand wird als gemeinsamer Pool verbraucht (keine Doppelzählung)', () => {
  const p = provider([rec('w', 1, 1, [[2, 1], [3, 1]]), rec('a', 2, 1, [[10, 5]]), rec('b', 3, 1, [[10, 3]])]);
  const stock = new Map([[10, 6]]);
  const r = buildTree(1, 1, p, { stock });
  // Gesamtbedarf 8, vorhanden 6 -> fehlend 2 (nicht 0, nicht 5)
  assert.equal(r.bom.get(10)!.total, 8);
  assert.equal(r.bom.get(10)!.missing, 2);
});

test('Vorhandene Zwischenprodukte sparen Unterbedarf', () => {
  const p = provider([rec('w', 1, 1, [[2, 1]]), rec('a', 2, 1, [[10, 5]])]);
  const r = buildTree(1, 1, p, { stock: new Map([[2, 1]]) });
  assert.equal(r.bom.get(10)!.total, 5);
  assert.equal(r.bom.get(10)!.missing, 0);
  assert.equal(r.progress, 1);
});

test('Erledigte Knoten tragen nicht mehr zum Bedarf bei und aktualisieren den Fortschritt', () => {
  const p = provider([rec('w', 1, 1, [[2, 1], [3, 1]]), rec('a', 2, 1, [[10, 5]]), rec('b', 3, 1, [[11, 2]])]);
  const before = buildTree(1, 1, p);
  assert.equal(before.progress, 0);
  const after = buildTree(1, 1, p, { doneNodes: new Set(['1>2']) });
  assert.equal(after.bom.get(10)!.missing, 0);
  assert.equal(after.bom.get(10)!.total, 5);
  assert.equal(after.bom.get(11)!.missing, 2);
  assert.ok(Math.abs(after.progress - 0.5) < 1e-9);
  assert.deepEqual(after.components, { total: 2, complete: 1 });
});

test('Zufallsrezepte erhöhen die Herstellungen im Erwartungswert und werden markiert', () => {
  const p = provider([rec('w', 1, 1, [[2, 10]]), rec('c', 2, 10, [[3, 10]], { yield: 0.31 })]);
  const r = buildTree(1, 1, p);
  // 10 benötigt, 3.1 pro Herstellung -> 4 Herstellungen -> 40 Rohmaterial
  assert.equal(r.crafts.get('c')!.count, 4);
  assert.equal(r.bom.get(3)!.total, 40);
  assert.equal(r.bom.get(3)!.estimated, true);
  assert.equal(r.hasRandom, true);
});

test('Zyklen werden abgefangen', () => {
  const p = provider([rec('a', 1, 1, [[2, 1]]), rec('b', 2, 1, [[1, 1]])]);
  const r = buildTree(1, 1, p);
  assert.ok(r.bom.has(1));
});

test('buyItems macht Knoten zum Blatt', () => {
  const p = provider([rec('w', 1, 1, [[2, 1]]), rec('a', 2, 1, [[10, 5]])]);
  const r = buildTree(1, 1, p, { buyItems: new Set([2]) });
  assert.equal(r.bom.get(2)!.total, 1);
  assert.equal(r.bom.has(10), false);
});

test('Community-Datensatz: jede Waffe löst sich auf, Mengen sind positiv', () => {
  const ds = JSON.parse(readFileSync(new URL('../src/data/community/legendary-weapons.json', import.meta.url), 'utf8')) as CommunityDataset;
  const model = createLegendaryModel(ds);
  assert.ok(model.weapons.length >= 56);
  for (const w of model.weapons) {
    assert.ok(w.hasRecipe, `${w.nameEn} ohne Rezept`);
    const r = buildTree(w.id, 1, model);
    assert.ok(r.bom.size > 0, `${w.nameEn} ohne Materialien`);
    for (const e of r.bom.values()) assert.ok(e.total > 0 && Number.isFinite(e.total));
  }
  // Gen-1-Beispiel: 77 Kleeblätter stecken im Geschenk des Glücks
  const sunrise = model.weapons.find((w) => w.nameEn === 'Sunrise')!;
  const tree = buildTree(sunrise.id, 1, model);
  assert.ok(tree.bom.has(19675) || tree.crafts.size > 0);
});

test('Kosten: nicht handelbare/unbepreiste Positionen werden getrennt ausgewiesen', () => {
  const prices = new Map<number, PriceInfo>([[1, { sell: 150, buy: 100, sellQty: 5, buyQty: 5 }]]);
  const items = new Map([[2, { id: 2, name: 'x', rarity: 'Basic', type: '', level: 0, flags: ['AccountBound'], vendorValue: 0 } as never]]);
  const s = estimateCosts([{ itemId: 1, qty: 10 }, { itemId: 2, qty: 3 }, { itemId: 3, qty: 1 }], prices, items);
  assert.equal(s.total, 1500);
  assert.equal(s.unpriced.length, 2);
  assert.deepEqual(splitCoins(12345), { gold: 1, silver: 23, copper: 45 });
});

test('XP-Modell: Rang-Gewinn pro Herstellung', () => {
  assert.equal(categoryOf('Refinement'), 'refinement');
  assert.equal(categoryOf('Bulk'), null);
  assert.ok(Math.abs(ranksPerCraft('refinement', 100, 100) - 0.3) < 1e-9);
  assert.equal(ranksPerCraft('refinement', 125, 100), 0);
  assert.equal(ranksPerCraft('item', 99, 100), 0);
});

test('Levelplaner: Route ohne Lücken, Schritte lückenlos, Kosten/Materialien konsistent', () => {
  const r = (id: number, rating: number, type: string, ing: [number, number][], out: number) =>
    rec(String(id), out, 1, ing, { kind: 'official', source: 'official', disciplines: ['Armorsmith'], rating, flags: ['AutoLearned'], type });
  const recipes = [r(1, 0, 'Refinement', [[100, 2]], 200), r(2, 0, 'Component', [[200, 1]], 201), r(3, 20, 'Refinement', [[101, 3]], 202)];
  const byOut = new Map<number, Recipe[]>();
  recipes.forEach((x) => byOut.set(x.outputId, [...(byOut.get(x.outputId) ?? []), x]));
  const prices = new Map<number, PriceInfo>([
    [100, { sell: 10, buy: 9, sellQty: 1, buyQty: 1 }],
    [101, { sell: 12, buy: 9, sellQty: 1, buyQty: 1 }],
    [200, { sell: 50, buy: 9, sellQty: 1, buyQty: 1 }],
  ]);
  const plan = planLevelRoute({
    discipline: 'Armorsmith',
    fromRank: 0,
    toRank: 40,
    recipes,
    recipesByOutput: byOut,
    prices,
    options: { allowDiscovery: false, craftIntermediates: true },
  });
  assert.equal(plan.gaps.length, 0);
  assert.equal(plan.steps[0].fromRank, 0);
  assert.equal(plan.steps[plan.steps.length - 1].toRank, 40);
  for (let i = 1; i < plan.steps.length; i++) assert.equal(plan.steps[i].fromRank, plan.steps[i - 1].toRank);
  const sum = [...plan.purchases].reduce((s, [id, q]) => s + (prices.get(id)?.sell ?? 0) * q, 0);
  assert.equal(sum, plan.totalCost);
  assert.equal(maxRankOf('Armorsmith', recipes), 20);
});

test('Levelplaner: Lücken werden ausgewiesen statt erfunden', () => {
  const recipes = [rec('1', 5, 1, [[1, 1]], { kind: 'official', source: 'official', disciplines: ['Chef'], rating: 0, flags: ['AutoLearned'], type: 'Refinement' })];
  const plan = planLevelRoute({
    discipline: 'Chef', fromRank: 0, toRank: 100, recipes, recipesByOutput: new Map(), prices: new Map(),
    options: { allowDiscovery: false, craftIntermediates: false },
  });
  assert.ok(plan.gaps.length > 0);
});

test('Quellen: unbekannte Materialien werden als unbekannt gekennzeichnet', () => {
  const s = resolveSources({ item: undefined, tags: [] });
  assert.equal(s[0].origin, 'unknown');
  const t = resolveSources({ item: undefined, tags: ['trading_post', 'mystic_forge'] });
  assert.ok(t.some((x) => x.kind === 'forge') && t.some((x) => x.kind === 'trade'));
});

test('Entdeckungsrezepte: Filterung, Erkennung und Status-Berechnung', async () => {
  const { isDiscoveryRecipe, computeDiscoveryStats, filterDiscoveryRecipes, estimateRecipeCost } = await import('../src/domain/discovery.ts');

  const r1 = rec('101', 1001, 1, [[1, 1], [2, 1], [3, 1]], {
    disciplines: ['Weaponsmith'],
    rating: 0,
    type: 'Sword',
    flags: [],
  });
  const r2 = rec('102', 1002, 1, [[1, 2]], {
    disciplines: ['Weaponsmith'],
    rating: 0,
    type: 'Refinement',
    flags: ['AutoLearned'],
  });
  const r3 = rec('103', 1003, 1, [[4, 1]], {
    disciplines: ['Weaponsmith'],
    rating: 75,
    type: 'Sword',
    flags: ['LearnedFromItem'],
  });
  const r4 = rec('104', 1004, 1, [[1, 1], [2, 1], [3, 1]], {
    disciplines: ['Weaponsmith'],
    rating: 75,
    type: 'Dagger',
    flags: [],
  });

  // Flag check
  assert.equal(isDiscoveryRecipe(r1), true);
  assert.equal(isDiscoveryRecipe(r2), false);
  assert.equal(isDiscoveryRecipe(r3), false);
  assert.equal(isDiscoveryRecipe(r4), true);

  // Stats check with known recipe set
  const known = new Set([101]);
  const statsT1 = computeDiscoveryStats([r1, r2, r3, r4], 'Weaponsmith', known, 0, 74);
  assert.equal(statsT1.total, 1);
  assert.equal(statsT1.discovered, 1);
  assert.equal(statsT1.undiscovered, 0);
  assert.equal(statsT1.pctDiscovered, 100);

  const statsAll = computeDiscoveryStats([r1, r2, r3, r4], 'Weaponsmith', known, 0, 500);
  assert.equal(statsAll.total, 2);
  assert.equal(statsAll.discovered, 1);
  assert.equal(statsAll.undiscovered, 1);
  assert.equal(statsAll.pctDiscovered, 50);

  // Filter check
  const undiscoveredOnly = filterDiscoveryRecipes([r1, r2, r3, r4], {
    discipline: 'Weaponsmith',
    status: 'undiscovered',
    knownRecipeIds: known,
  });
  assert.equal(undiscoveredOnly.length, 1);
  assert.equal(undiscoveredOnly[0].id, '104');

  // Cost estimation
  const prices = new Map<number, PriceInfo>([
    [1, { sell: 20, buy: 15, sellQty: 10, buyQty: 10 }],
    [2, { sell: 35, buy: 30, sellQty: 10, buyQty: 10 }],
    [3, { sell: 50, buy: 40, sellQty: 10, buyQty: 10 }],
  ]);
  const cost = estimateRecipeCost(r1, prices);
  assert.equal(cost.totalCost, 105);
  assert.equal(cost.hasUnpriced, false);
});

test('Events: SotO, Janthir Wilds und Visions of Eternity sind im Zeitplan enthalten', async () => {
  const { getEventSchedule, EVENTS } = await import('../src/data/events.ts');

  // Verify all 3 categories exist in EVENTS
  const sotoEvents = EVENTS.filter((e) => e.category === 'soto');
  const janthirEvents = EVENTS.filter((e) => e.category === 'janthir');
  const voeEvents = EVENTS.filter((e) => e.category === 'voe');

  assert.ok(sotoEvents.length >= 4, 'Mindestens 4 SotO Events erwartet');
  assert.ok(janthirEvents.length >= 3, 'Mindestens 3 Janthir Events erwartet');
  assert.ok(voeEvents.length >= 2, 'Mindestens 2 VoE Events erwartet');

  // Verify schedule calculation contains them
  const ref = new Date('2026-10-23T12:00:00Z');
  const instances = getEventSchedule(ref, 6);

  const foundSoto = instances.some((i) => i.event.category === 'soto');
  const foundJanthir = instances.some((i) => i.event.category === 'janthir');
  const foundVoe = instances.some((i) => i.event.category === 'voe');

  assert.equal(foundSoto, true, 'SotO Event in 6h-Zeitplan gefunden');
  assert.equal(foundJanthir, true, 'Janthir Event in 6h-Zeitplan gefunden');
  assert.equal(foundVoe, true, 'VoE Event in 6h-Zeitplan gefunden');
});

test('i18n: Deutsch & Englisch Übersetzungen, Bezeichnungen und Chat-Callouts', async () => {
  const { t, getLanguage, setLanguage, TRANSLATIONS } = await import('../src/i18n/index.ts');
  const {
    formatCallout,
    EVENTS,
    getEventName,
    getEventZone,
    getEventWaypointName,
    getEventCategoryLabel,
  } = await import('../src/data/events.ts');
  const {
    getDisciplineName,
    getRarityName,
    getItemTypeName,
    getRecipeTypeName,
    getCraftingTiers,
    getDiscoveryGuide,
  } = await import('../src/components/common/labels.ts');

  // 0. Default language check
  assert.equal(getLanguage(), 'en', 'Default language after start is English');
  const sampleEvent = EVENTS.find((e) => e.id === 'tequatl')!;
  const inst = {
    event: sampleEvent,
    startTime: new Date('2026-10-23T12:00:00Z'),
    endTime: new Date('2026-10-23T12:15:00Z'),
    isActive: false,
    startsInSeconds: 300,
    endsInSeconds: 1200,
  };
  const defaultCallout = formatCallout(inst, 'standard');
  assert.ok(defaultCallout.includes('starts in'), 'Standard formatCallout ist Englisch');

  // 1. Language switching
  setLanguage('de');
  assert.equal(getLanguage(), 'de');
  assert.equal(t('nav.events'), 'Eventübersicht');
  assert.equal(t('nav.crafting'), 'Handwerk & Berufe');
  assert.equal(t('settings.language'), 'Sprache / Language');
  assert.ok(t('settings.title').includes('Omnitria'));
  assert.equal(t('settings.title').includes('HUD'), false);

  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(t('nav.events'), 'Event Timers');
  assert.equal(t('nav.crafting'), 'Crafting & Disciplines');
  assert.equal(t('settings.language'), 'Language / Sprache');
  assert.ok(t('settings.title').includes('Omnitria'));
  assert.equal(t('settings.title').includes('HUD'), false);

  // 2. Bilingual Discipline & Rarity labels
  assert.equal(getDisciplineName('Weaponsmith', 'de'), 'Waffenschmied');
  assert.equal(getDisciplineName('Weaponsmith', 'en'), 'Weaponsmith');
  assert.equal(getDisciplineName('Chef', 'de'), 'Koch');
  assert.equal(getDisciplineName('Chef', 'en'), 'Chef');

  assert.equal(getRarityName('Ascended', 'de'), 'Aufgestiegen');
  assert.equal(getRarityName('Ascended', 'en'), 'Ascended');
  assert.equal(getItemTypeName('Weapon', 'de'), 'Waffe');
  assert.equal(getItemTypeName('Weapon', 'en'), 'Weapon');
  assert.equal(getRecipeTypeName('Greatsword', 'de'), 'Großschwert');
  assert.equal(getRecipeTypeName('Greatsword', 'en'), 'Greatsword');

  // 3. Tiers & Discovery Guides
  const deTiers = getCraftingTiers('de');
  const enTiers = getCraftingTiers('en');
  assert.ok(deTiers[1].materials.includes('Kupfer'));
  assert.ok(enTiers[1].materials.includes('Copper'));

  const deGuide = getDiscoveryGuide('Weaponsmith', 'de');
  const enGuide = getDiscoveryGuide('Weaponsmith', 'en');
  assert.ok(deGuide.primary.includes('Klinge'));
  assert.ok(enGuide.primary.includes('Blade'));

  // 4. Bilingual Event, Zone, Waypoint and Callout generation
  assert.equal(getEventZone(sampleEvent, 'de'), 'Funkenschwärmersumpf');
  assert.equal(getEventZone(sampleEvent, 'en'), 'Sparkfly Fen');
  assert.equal(getEventWaypointName(sampleEvent, 'de'), 'Splitterküsten-Wegmarke');
  assert.equal(getEventWaypointName(sampleEvent, 'en'), 'Splintered Coast Waypoint');
  assert.equal(getEventCategoryLabel(sampleEvent, 'de'), 'Hardcore Großboss');
  assert.equal(getEventCategoryLabel(sampleEvent, 'en'), 'Hardcore World Boss');

  const deCallout = formatCallout(inst, 'standard', 'de');
  const enCallout = formatCallout(inst, 'standard', 'en');

  assert.ok(deCallout.includes('startet in'), 'Deutscher Callout enthält "startet in"');
  assert.ok(enCallout.includes('starts in'), 'Englischer Callout enthält "starts in"');
  assert.ok(enCallout.includes(sampleEvent.nameEn), 'Englischer Callout enthält englischen Namen');

  const deDetailed = formatCallout(inst, 'detailed', 'de');
  const enDetailed = formatCallout(inst, 'detailed', 'en');
  assert.ok(deDetailed.includes('Funkenschwärmersumpf') && deDetailed.includes('Hardcore Großboss'));
  assert.ok(enDetailed.includes('Sparkfly Fen') && enDetailed.includes('Hardcore World Boss'));

  // Reset back to en
  setLanguage('en');
});

test('Entdeckungsfilter: Suche nach Gegenstandsname, Zutat, Typ und Lokalisierung', async () => {
  const { filterDiscoveryRecipes, isDiscoveryRecipe } = await import('../src/domain/discovery.ts');
  const { getRecipeTypeName } = await import('../src/components/common/labels.ts');
  const { t, setLanguage } = await import('../src/i18n/index.ts');

  const mockRecipes: Recipe[] = [
    {
      id: 101,
      outputId: 2001, // Eisernes Großschwert
      outputCount: 1,
      type: 'Greatsword',
      rating: 150,
      disciplines: ['Weaponsmith'],
      flags: [],
      ingredients: [
        { itemId: 3001, count: 1 }, // Eisen-Klinge
        { itemId: 3002, count: 1 }, // Eisen-Griff
        { itemId: 3003, count: 1 }, // Verwüstende Eisen-Insignie
      ],
    },
    {
      id: 102,
      outputId: 2002, // Bronzener Dolch
      outputCount: 1,
      type: 'Dagger',
      rating: 25,
      disciplines: ['Weaponsmith'],
      flags: [],
      ingredients: [
        { itemId: 3010, count: 1 }, // Bronze-Klinge
        { itemId: 3011, count: 1 }, // Bronze-Griff
        { itemId: 3012, count: 1 }, // Bösartige Bronze-Insignie
      ],
    },
    {
      id: 103,
      outputId: 2003, // Jute-Stiefel (Autogelernt)
      outputCount: 1,
      type: 'Boots',
      rating: 0,
      disciplines: ['Tailor'],
      flags: ['AutoLearned'],
      ingredients: [{ itemId: 4001, count: 2 }],
    },
  ];

  const mockNames: Record<number, string> = {
    2001: 'Eisernes Großschwert',
    2002: 'Bronzener Dolch',
    2003: 'Jute-Stiefel',
    3001: 'Eisen-Großschwertklinge',
    3002: 'Eisen-Großschwertheft',
    3003: 'Verwüstende Eisen-Insignie',
    3010: 'Bronze-Dolchklinge',
    3011: 'Bronze-Dolchheft',
    3012: 'Bösartige Bronze-Insignie',
  };

  const getItemName = (id: number) => mockNames[id];
  const getLocTypeDe = (type: string) => getRecipeTypeName(type, 'de');
  const getLocTypeEn = (type: string) => getRecipeTypeName(type, 'en');

  // 1. isDiscoveryRecipe check
  assert.equal(isDiscoveryRecipe(mockRecipes[0]), true);
  assert.equal(isDiscoveryRecipe(mockRecipes[1]), true);
  assert.equal(isDiscoveryRecipe(mockRecipes[2]), false); // AutoLearned

  // 2. Suche nach Output-Gegenstandsname (deutsch)
  const hitsByName = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: 'Eisernes',
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(hitsByName.length, 1);
  assert.equal(hitsByName[0].id, 101);

  // 3. Suche nach Zutat (z. B. "Insignie" oder "Dolchklinge")
  const hitsByIng = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: 'Insignie',
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(hitsByIng.length, 2, 'Beide Rezepte enthalten eine Insignie');

  const hitsByDaggerBlade = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: 'Dolchklinge',
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(hitsByDaggerBlade.length, 1);
  assert.equal(hitsByDaggerBlade[0].id, 102);

  // 4. Suche nach lokalisiertem Rezepttyp (deutsch: "Großschwert", englisch: "Greatsword")
  const hitsByTypeDe = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: 'Großschwert',
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(hitsByTypeDe.length, 1);
  assert.equal(hitsByTypeDe[0].id, 101);

  const hitsByTypeEn = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: 'Greatsword',
    getItemName,
    getRecipeTypeName: getLocTypeEn,
  });
  assert.equal(hitsByTypeEn.length, 1);
  assert.equal(hitsByTypeEn[0].id, 101);

  // 5. Suche nach ID (Output oder Rezept-ID)
  const hitsById = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    search: '2002',
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(hitsById.length, 1);
  assert.equal(hitsById[0].id, 102);

  // 6. Tier/Rating Grenzen (z. B. Rang 0-74 filtert Rang 150 heraus)
  const tier1Only = filterDiscoveryRecipes(mockRecipes, {
    discipline: 'Weaponsmith',
    minRating: 0,
    maxRating: 74,
    getItemName,
    getRecipeTypeName: getLocTypeDe,
  });
  assert.equal(tier1Only.length, 1);
  assert.equal(tier1Only[0].id, 102);

  // 7. Lokalisierte Texte für Planer & Entdeckungssuche
  setLanguage('de');
  assert.ok(t('crafting.discoveryRequired').includes('Entdeckungsrezept'));
  assert.ok(t('crafting.discoveryCombineInstruction').includes('kombinieren'));
  assert.ok(t('crafting.searchNoResultsInTier', { tier: 'Stufe 1' }).includes('Stufe 1'));
  assert.ok(t('crafting.searchShowAllTiers', { count: 5 }).includes('5'));

  setLanguage('en');
  assert.ok(t('crafting.discoveryRequired').includes('Discovery Recipe'));
  assert.ok(t('crafting.discoveryCombineInstruction').includes('Discovery'));
  assert.ok(t('crafting.searchNoResultsInTier', { tier: 'Tier 1' }).includes('Tier 1'));
  assert.ok(t('crafting.searchShowAllTiers', { count: 5 }).includes('5'));
  setLanguage('en');
});

test('Erfolge: Zweisprachige Lokalisierung Deutsch & Englisch', () => {
  assert.equal(GLOBAL_ACHIEVEMENTS.length, 29);

  // Täglicher Komplettierer
  const dailyCompleter = GLOBAL_ACHIEVEMENTS.find((a) => a.id === 'daily-completer');
  assert.ok(dailyCompleter);
  assert.equal(getAchievementTitle(dailyCompleter, 'de'), 'Täglicher Komplettierer');
  assert.equal(getAchievementTitle(dailyCompleter, 'en'), 'Daily Completer');
  assert.ok(getAchievementDesc(dailyCompleter, 'en').includes('Complete any 3 daily achievements'));
  assert.ok(getAchievementDesc(dailyCompleter, 'de').includes('Schließt 3 beliebige tägliche Erfolge'));
  assert.equal(getAchievementCategoryLabel(dailyCompleter, 'de'), 'Täglich');
  assert.equal(getAchievementCategoryLabel(dailyCompleter, 'en'), 'Daily');

  // Täglicher Weltenboss-Jäger (Wiederholbar-Tag)
  const dailyWb = GLOBAL_ACHIEVEMENTS.find((a) => a.id === 'daily-worldboss');
  assert.ok(dailyWb);
  assert.equal(getAchievementTitle(dailyWb, 'de'), 'Täglicher Weltenboss-Jäger');
  assert.equal(getAchievementTitle(dailyWb, 'en'), 'Daily World Boss Hunter');
  assert.equal(getAchievementTierInfo(dailyWb, 'en'), 'Daily repeatable');
  assert.equal(getAchievementTierInfo(dailyWb, 'de'), 'Täglich wiederholbar');

  // Der Sonnenlose (Tequatl)
  const tequatl = GLOBAL_ACHIEVEMENTS.find((a) => a.id === 'wb-tequatl-meta');
  assert.ok(tequatl);
  assert.equal(getAchievementTitle(tequatl, 'de'), 'Der Sonnenlose');
  assert.equal(getAchievementTitle(tequatl, 'en'), 'The Sunless');
  assert.equal(getAchievementCategoryLabel(tequatl, 'en'), 'World Bosses');

  // Keine fixen Testdaten in den Basisdaten
  for (const ach of GLOBAL_ACHIEVEMENTS) {
    assert.equal(ach.isCompleted, undefined, `Erfolg ${ach.id} darf kein hardcodiertes isCompleted haben`);
    assert.equal(ach.progressCurrent, undefined, `Erfolg ${ach.id} darf kein hardcodiertes progressCurrent haben`);
    if (ach.objectives) {
      for (const obj of ach.objectives) {
        assert.notEqual(obj.done, true, `Teilziel ${obj.id} darf nicht standardmäßig erledigt sein`);
      }
    }
  }

  // Boss-Achievements (z.B. Drakkar, Shatterer)
  const drakkarBoss = BOSS_ACHIEVEMENTS['drakkar'];
  assert.ok(drakkarBoss && drakkarBoss.length > 0);
  assert.equal(drakkarBoss[0].title, 'Stimme im Eis');
  assert.equal(drakkarBoss[0].titleEn, 'Voice in the Ice Broken');
  assert.equal(drakkarBoss[0].categoryEn, 'Icebrood Saga');
});

test('Legendary & Quellen: Zweisprachige Lokalisierung Deutsch & Englisch', async () => {
  const { getGenerationLabel, getSlotLabel } = await import('../src/domain/legendary.ts');
  const { KIND_META, resolveSources } = await import('../src/domain/sources.ts');

  // Generationen
  assert.equal(getGenerationLabel(1, 'de').long, 'Generation 1 – Ursprüngliche Legendäre');
  assert.equal(getGenerationLabel(1, 'en').long, 'Generation 1 – Core Tyria');
  assert.equal(getGenerationLabel(2, 'en').long, 'Generation 2 – Heart of Thorns & Path of Fire');
  assert.equal(getGenerationLabel(3, 'en').long, "Generation 3 – Aurene's Variants");
  assert.equal(getGenerationLabel(15, 'en').long, 'Generation 4 – Janthir Wilds');

  // Slots
  assert.equal(getSlotLabel('oneHand', 'de'), 'Einhandwaffen');
  assert.equal(getSlotLabel('oneHand', 'en'), 'One-Handed');
  assert.equal(getSlotLabel('twoHand', 'en'), 'Two-Handed');
  assert.equal(getSlotLabel('offHand', 'en'), 'Off-Hand');
  assert.equal(getSlotLabel('aquatic', 'en'), 'Aquatic');

  // Quellen & Beschaffung
  assert.equal(KIND_META.gather.labelEn, 'Gatherable');
  assert.equal(KIND_META.drop.labelEn, 'Enemy Drop');
  assert.equal(KIND_META.salvage.labelEn, 'Salvage');
  assert.equal(KIND_META.craft.labelEn, 'Crafting');
  assert.equal(KIND_META.forge.labelEn, 'Mystic Forge');
  assert.equal(KIND_META.trade.labelEn, 'Trading Post');

  const sources = resolveSources({ item: undefined, tags: ['gathering', 'drop', 'salvage', 'mystic_forge'] });
  assert.ok(sources.every((s) => s.label && s.labelEn));
  assert.ok(sources.every((s) => s.detail && s.detailEn));
  const gatherSource = sources.find((s) => s.kind === 'gather');
  assert.equal(gatherSource?.label, 'Direkt sammelbar');
  assert.equal(gatherSource?.labelEn, 'Gatherable');
});

