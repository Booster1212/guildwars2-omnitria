import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_CRAFT_ITEMS,
  isDailyCraftCompleted,
  getDailyCraftSummary,
  calculateDailyCraftProfit,
} from '../src/domain/dailyCrafting.ts';
import { FEATURE_INFO, type AccountData } from '../src/data/gw2/account.ts';
import { TRANSLATIONS } from '../src/i18n/index.ts';

// ============================================================================
// 1. Daily Timegated Crafting Tracker Unit & Domain Tests
// ============================================================================
test('1.1 DAILY_CRAFT_ITEMS catalog includes all core daily timegated crafts', () => {
  assert.ok(DAILY_CRAFT_ITEMS.length >= 9, 'Must define at least 9 daily timegated crafts');

  const ids = DAILY_CRAFT_ITEMS.map((d) => d.id);
  assert.ok(ids.includes('deldrimor_steel_ingot'), 'Missing deldrimor_steel_ingot');
  assert.ok(ids.includes('bolt_of_damask'), 'Missing bolt_of_damask');
  assert.ok(ids.includes('elonian_leather_square'), 'Missing elonian_leather_square');
  assert.ok(ids.includes('spiritwood_plank'), 'Missing spiritwood_plank');
  assert.ok(ids.includes('charged_quartz_crystal'), 'Missing charged_quartz_crystal');
  assert.ok(ids.includes('grow_lamp'), 'Missing grow_lamp');
  assert.ok(ids.includes('clay_pot'), 'Missing clay_pot');
  assert.ok(ids.includes('heat_stone'), 'Missing heat_stone');
  assert.ok(ids.includes('plate_of_meaty_plant_food'), 'Missing plate_of_meaty_plant_food');
});

test('1.2 isDailyCraftCompleted accurately evaluates completion status against account set', () => {
  const completed = new Set(['deldrimor_steel_ingot', 'charged_quartz_crystal']);
  assert.equal(isDailyCraftCompleted('deldrimor_steel_ingot', completed), true);
  assert.equal(isDailyCraftCompleted('charged_quartz_crystal', completed), true);
  assert.equal(isDailyCraftCompleted('bolt_of_damask', completed), false);
  assert.equal(isDailyCraftCompleted('spiritwood_plank', null), false);
  assert.equal(isDailyCraftCompleted('grow_lamp', undefined), false);
});

test('1.3 getDailyCraftSummary accurately aggregates progress and remaining counts', () => {
  const completed = new Set(['deldrimor_steel_ingot', 'bolt_of_damask', 'clay_pot']);
  const summary = getDailyCraftSummary(completed);

  assert.equal(summary.total, DAILY_CRAFT_ITEMS.length);
  assert.equal(summary.completed, 3);
  assert.equal(summary.remaining, DAILY_CRAFT_ITEMS.length - 3);

  const emptySummary = getDailyCraftSummary(null);
  assert.equal(emptySummary.completed, 0);
  assert.equal(emptySummary.remaining, DAILY_CRAFT_ITEMS.length);
});

test('1.4 calculateDailyCraftProfit deducts 15% Trading Post transaction fee from output value', () => {
  const deldrimorDef = DAILY_CRAFT_ITEMS.find((d) => d.id === 'deldrimor_steel_ingot')!;
  assert.ok(deldrimorDef);

  // Mock prices:
  // Deldrimor Steel Ingot (46738) sell = 40,000 copper (4g)
  // Mithril Ingot (19684) = 50c each x 50 = 2,500c
  // Glob of Ectoplasm (19721) = 2,000c x 1 = 2,000c
  // Thermocatalytic Reagent (46747) = 149c (NPC vendor price cheaper than TP 1496c)
  // Total ingredient cost = 2,500 + 2,000 + 149 = 4,649c
  // Output after 15% fee = 40,000 * 0.85 = 34,000c
  // Expected profit = 34,000 - 4,649 = 29,351c
  const mockPrices = new Map([
    [46738, { sell: 40000, buy: 35000, sellQty: 100, buyQty: 100 }],
    [19684, { sell: 50, buy: 45, sellQty: 100, buyQty: 100 }],
    [19721, { sell: 2000, buy: 1800, sellQty: 100, buyQty: 100 }],
    [46747, { sell: 1496, buy: 1496, sellQty: 100, buyQty: 100 }],
  ]);

  const { outputValue, ingredientCost, estimatedProfit } = calculateDailyCraftProfit(deldrimorDef, mockPrices);
  assert.equal(outputValue, 40000);
  assert.equal(ingredientCost, 4649);
  assert.equal(estimatedProfit, 29351);
});

// ============================================================================
// 2. Account Features & Trading Post Delivery Configuration
// ============================================================================
test('2.1 FEATURE_INFO includes dailyCrafting and delivery with valid scopes', () => {
  assert.ok('dailyCrafting' in FEATURE_INFO, 'dailyCrafting must be in FEATURE_INFO');
  assert.equal(FEATURE_INFO.dailyCrafting.scope, 'progression');

  assert.ok('delivery' in FEATURE_INFO, 'delivery must be in FEATURE_INFO');
  assert.equal(FEATURE_INFO.delivery.scope, 'tradingpost');
});

test('2.2 Mock AccountData with delivery and dailyCrafting maintains backward compatibility', () => {
  const account: AccountData = {
    syncedAt: Date.now(),
    accountName: 'Hero.1234',
    permissions: ['account', 'progression', 'tradingpost', 'unlocks'],
    stock: [[19721, 50]],
    breakdown: { 19721: [50, 0, 0, 0] },
    wallet: [[1, 500000]],
    knownRecipes: [100, 200],
    armory: [[30689, 1]], // Eternity unlocked
    dailyCrafting: ['deldrimor_steel_ingot'],
    delivery: {
      coins: 250000, // 25g
      items: [[19721, 10]],
    },
    crafting: { Weaponsmith: { rating: 500, character: 'Warrior' } },
    errors: {},
  };

  assert.equal(account.dailyCrafting?.length, 1);
  assert.equal(account.delivery?.coins, 250000);
  assert.equal(account.armory?.[0][0], 30689);
});

// ============================================================================
// 3. Localization Parity for Newly Added Keys
// ============================================================================
test('3.1 All new legendary, dailyCrafting, and delivery keys maintain 100% DE/EN parity', () => {
  const keysToCheck = [
    'legendary.hideUnlocked',
    'legendary.unlockedBanner',
    'dailyCrafting.title',
    'dailyCrafting.desc',
    'dailyCrafting.done',
    'dailyCrafting.ready',
    'dailyCrafting.estProfit',
    'dailyCrafting.allDone',
    'dailyCrafting.summary',
    'delivery.badge',
    'delivery.tooltip',
    'delivery.copiedWaypoint',
  ];

  for (const k of keysToCheck) {
    assert.ok(k in TRANSLATIONS.de, `Key ${k} must exist in TRANSLATIONS.de`);
    assert.ok(k in TRANSLATIONS.en, `Key ${k} must exist in TRANSLATIONS.en`);
  }
});

// ============================================================================
// 4. Expanded Legendary Armory (Rings, Trinkets, Back, Relic, Armor)
// ============================================================================
test('4.1 EXTRA_LEGENDARY_ITEMS covers rings, accessories, amulets, backpacks, relic, and armor', async () => {
  const { EXTRA_LEGENDARY_ITEMS } = await import('../src/data/community/legendaryTrinketsAndArmor.ts');
  const ids = EXTRA_LEGENDARY_ITEMS.map((item) => item.id);

  // Rings
  assert.ok(ids.includes(91234), 'Missing Coalescence (91234)');
  assert.ok(ids.includes(92991), 'Missing Conflux (92991)');

  // Accessories
  assert.ok(ids.includes(81908), 'Missing Aurora (81908)');
  assert.ok(ids.includes(91048), 'Missing Vision (91048)');

  // Amulets
  assert.ok(ids.includes(95380), "Missing Prismatic Champion's Regalia (95380)");
  assert.ok(ids.includes(92437), 'Missing Transcendence (92437)');

  // Backpacks
  assert.ok(ids.includes(79590), 'Missing Ad Infinitum (79590)');
  assert.ok(ids.includes(77705), 'Missing The Ascension (77705)');
  assert.ok(ids.includes(81706), 'Missing Warbringer (81706)');

  // Relic
  assert.ok(ids.includes(101582), 'Missing Legendary Relic (101582)');

  // Obsidian Armor pieces (SotO)
  assert.ok(ids.includes(101755), 'Missing Obsidian Heavy Helm (101755)');
  assert.ok(ids.includes(101700), 'Missing Obsidian Medium Cowl (101700)');
  assert.ok(ids.includes(101786), 'Missing Obsidian Light Hood (101786)');

  // Envoy Armor pieces (Raid)
  assert.ok(ids.includes(80384), 'Missing Perfected Envoy Helm (80384)');
  assert.ok(ids.includes(80252), 'Missing Perfected Envoy Cap (80252)');
  assert.ok(ids.includes(80277), 'Missing Perfected Envoy Cowl (80277)');
});

test('4.2 categoryOfSlot properly classifies weapon, trinket, back, and armor slots', async () => {
  const { categoryOfSlot } = await import('../src/domain/legendary.ts');

  assert.equal(categoryOfSlot('oneHand'), 'weapons');
  assert.equal(categoryOfSlot('twoHand'), 'weapons');
  assert.equal(categoryOfSlot('offHand'), 'weapons');
  assert.equal(categoryOfSlot('aquatic'), 'weapons');

  assert.equal(categoryOfSlot('ring'), 'trinkets');
  assert.equal(categoryOfSlot('accessory'), 'trinkets');
  assert.equal(categoryOfSlot('amulet'), 'trinkets');
  assert.equal(categoryOfSlot('relic'), 'trinkets');

  assert.equal(categoryOfSlot('back'), 'back');

  assert.equal(categoryOfSlot('armorHeavy'), 'armor');
  assert.equal(categoryOfSlot('armorMedium'), 'armor');
  assert.equal(categoryOfSlot('armorLight'), 'armor');
});

test('4.3 createLegendaryModel merges non-weapon legendaries with valid recipes', async () => {
  const { createLegendaryModel } = await import('../src/domain/legendary.ts');
  const { EXTRA_LEGENDARY_ITEMS, EXTRA_LEGENDARY_RECIPES } = await import('../src/data/community/legendaryTrinketsAndArmor.ts');

  const dummyDataset = {
    meta: {
      source: 'test',
      license: 'MIT',
      commit: '123',
      commitDate: '2026-01-01',
      syncedAt: '2026-01-01',
      note: 'test',
    },
    weapons: [{ id: 30689, name: 'Eternity', type: 'Greatsword', gen: 1 }],
    recipes: [],
    items: {},
  };

  const model = createLegendaryModel(dummyDataset, [], EXTRA_LEGENDARY_ITEMS, EXTRA_LEGENDARY_RECIPES);

  // Check weapon + extra items count
  assert.ok(model.weapons.length > EXTRA_LEGENDARY_ITEMS.length);

  // Coalescence recipe verification
  const coal = model.weapons.find((w) => w.id === 91234);
  assert.ok(coal, 'Coalescence must exist in model');
  assert.equal(coal.hasRecipe, true);
  const coalRecipe = model.recipeFor(91234);
  assert.ok(coalRecipe, 'Coalescence recipe must be registered in model');
  assert.equal(coalRecipe.kind, 'mf');
  assert.equal(coalRecipe.ingredients.length, 4);

  // Aurora recipe verification
  const aurora = model.weapons.find((w) => w.id === 81908);
  assert.ok(aurora, 'Aurora must exist in model');
  assert.equal(aurora.hasRecipe, true);
  const auroraRecipe = model.recipeFor(81908);
  assert.ok(auroraRecipe, 'Aurora recipe must be registered');

  // Legendary Relic verification
  const relic = model.weapons.find((w) => w.id === 101582);
  assert.ok(relic, 'Legendary Relic must exist in model');
  assert.equal(relic.hasRecipe, true);
});

test('4.4 Category and slot localization keys maintain 100% DE/EN parity', () => {
  const keys = [
    'legendary.category.all',
    'legendary.category.weapons',
    'legendary.category.trinkets',
    'legendary.category.back',
    'legendary.category.armor',
    'legendary.slot.ring',
    'legendary.slot.accessory',
    'legendary.slot.amulet',
    'legendary.slot.relic',
    'legendary.slot.armorHeavy',
    'legendary.slot.armorMedium',
    'legendary.slot.armorLight',
  ];

  for (const k of keys) {
    assert.ok(k in TRANSLATIONS.de, `Key ${k} must exist in TRANSLATIONS.de`);
    assert.ok(k in TRANSLATIONS.en, `Key ${k} must exist in TRANSLATIONS.en`);
  }
});

// ============================================================================
// 5. Spatial Navigation, Chat Link Encoding & UX Innovations
// ============================================================================
test('5.1 encodeItemChatCode produces official GW2 base64 in-game chat links', async () => {
  const { encodeItemChatCode } = await import('../src/data/external.ts');

  // Glob of Ectoplasm (ID: 19721) -> [&AgEJTQAA]
  const ectoLink = encodeItemChatCode(19721);
  assert.equal(ectoLink, '[&AgEJTQAA]', 'Glob of Ectoplasm chat code must match [&AgEJTQAA]');

  // Deldrimor Steel Ingot (ID: 46738) -> [&AgGStgAA]
  const deldrimorLink = encodeItemChatCode(46738);
  assert.equal(deldrimorLink, '[&AgGStgAA]', 'Deldrimor Steel Ingot chat code must match [&AgGStgAA]');
});

test('5.2 calculateSpatialWayfinding computes live distances and directional headings', async () => {
  const { calculateSpatialWayfinding, EVENT_CONTINENT_COORDS } = await import('../src/data/gw2/mumble.ts');
  const { EVENTS } = await import('../src/data/events.ts');

  assert.ok(EVENT_CONTINENT_COORDS['svanir-shaman'], 'Svanir Shaman coords must be registered');
  for (const ev of EVENTS) {
    assert.ok(EVENT_CONTINENT_COORDS[ev.id], `Event ${ev.id} must have authentic continent coordinates`);
  }

  const [svanirX, svanirY] = EVENT_CONTINENT_COORDS['svanir-shaman'];

  // Player located 1000m south of Svanir Shaman, camera looking North (rotation = 0)
  const wayfinding = calculateSpatialWayfinding('svanir-shaman', svanirX, svanirY + 1000, 0);
  assert.ok(wayfinding);
  assert.equal(wayfinding.distanceLabel, '1.0 km');
  assert.equal(wayfinding.arrow, '⬆'); // Ahead / North
  assert.equal(wayfinding.cardinal, 'N');
  assert.equal(wayfinding.angleDeg, 0);

  // Player located 4000m south, camera looking East (rotation = PI/2)
  const wayfindingRot = calculateSpatialWayfinding('svanir-shaman', svanirX, svanirY + 4000, Math.PI / 2);
  assert.ok(wayfindingRot);
  assert.equal(wayfindingRot.distanceLabel, '4.0 km');
  assert.equal(wayfindingRot.arrow, '⬅'); // Left relative to facing East
  assert.equal(wayfindingRot.angleDeg, 270);

  // Player with North-locked minimap (compassRotation = 0) but 3D camera facing West (camFrontX = -1, camFrontZ = 0)
  const wayfindingCam = calculateSpatialWayfinding('svanir-shaman', svanirX, svanirY + 500, 0, -1, 0);
  assert.ok(wayfindingCam);
  assert.equal(wayfindingCam.distanceLabel, '500 m');
  assert.equal(wayfindingCam.arrow, '➡'); // Target is North, which is to the Right when facing West
  assert.equal(wayfindingCam.angleDeg, 90);
});

test('5.3 Spatial, World Map Dimming and Daily Crafting keys maintain 100% DE/EN parity', () => {
  const keys = [
    'settings.mumbleAutoMapDim',
    'settings.mumbleAutoMapDimHint',
    'dailyCrafting.filterAll',
    'dailyCrafting.filterReady',
    'dailyCrafting.filterDone',
    'dailyCrafting.catRefinement',
    'dailyCrafting.catSpecial',
    'dailyCrafting.accountBound',
    'dailyCrafting.recipeBtn',
    'dailyCrafting.toggleManual',
  ];

  for (const k of keys) {
    assert.ok(k in TRANSLATIONS.de, `Key ${k} must exist in TRANSLATIONS.de`);
    assert.ok(k in TRANSLATIONS.en, `Key ${k} must exist in TRANSLATIONS.en`);
  }
});
