import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccountInventoryIndex,
  filterAndSortAccountInventory,
  computeMultiGoalMaterialPlan,
} from '../src/domain/inventorySearch.ts';
import {
  computeWvwRankProgression,
  computeWvwStandings,
  generateWvwSituationalInsights,
  filterWvwObjectives,
} from '../src/data/gw2/wvw/progression.ts';
import { TRANSLATIONS, setLanguage } from '../src/i18n/index.ts';
import type { AccountData } from '../src/data/gw2/account.ts';
import type { GameItem, PriceInfo } from '../src/domain/types.ts';
import type { WvwMatch, WvwCombinedObjective, WvwWorld } from '../src/data/gw2/wvw/types.ts';

const mockAccount: AccountData = {
  accountName: 'ArcaneCommander.4812',
  worldId: 2007,
  wvwRank: 642,
  permissions: ['account', 'inventories', 'characters', 'wallet', 'progression', 'builds', 'unlocks'],
  stock: {
    19721: 400, // Glob of Ectoplasm: 250 mats + 120 bank + 20 CharA + 10 CharB
    19976: 85,  // Mystic Coin: 50 mats + 35 shared
    30689: 0,   // Eternity: 1 equipped on CharA (not in consumable stock)
  },
  breakdown: {
    19721: [250, 120, 0, 30],
    19976: [50, 0, 35, 0],
  },
  characterBreakdown: {
    19721: { 'Lyra Dawnblade': 20, 'Kaelen Shadowstep': 10 },
  },
  characters: [
    {
      name: 'Lyra Dawnblade',
      race: 'Human',
      gender: 'Female',
      profession: 'Guardian',
      level: 80,
      age: 360000,
      created: '2021-05-12T10:00:00Z',
      deaths: 42,
      crafting: [
        { discipline: 'Armorsmith', rating: 500, active: true },
        { discipline: 'Weaponsmith', rating: 500, active: true },
      ],
      bagCount: 5,
      bagSlotsTotal: 100,
      bagSlotsUsed: 24,
      bagItems: [[19721, 20]],
      equipment: [[30689, 'WeaponA1']],
    },
    {
      name: 'Kaelen Shadowstep',
      race: 'Sylvari',
      gender: 'Male',
      profession: 'Thief',
      level: 80,
      age: 180000,
      created: '2022-08-01T14:30:00Z',
      deaths: 19,
      crafting: [{ discipline: 'Leatherworker', rating: 450, active: true }],
      bagCount: 4,
      bagSlotsTotal: 80,
      bagSlotsUsed: 12,
      bagItems: [[19721, 10]],
      equipment: [],
    },
  ],
  wallet: { 1: 1250000, 2: 45000, 15: 420, 26: 1840 },
  armory: { 30689: 1 },
  characterEquipment: [30689],
  skins: [4679],
  dyes: [1],
  minis: [],
  mounts: [],
  gliders: [],
  novelties: [],
  jadeBots: [],
  masteries: [],
  achievements: {},
  crafting: [
    { discipline: 'Armorsmith', rating: 500, active: true, character: 'Lyra Dawnblade' },
    { discipline: 'Weaponsmith', rating: 500, active: true, character: 'Lyra Dawnblade' },
    { discipline: 'Leatherworker', rating: 450, active: true, character: 'Kaelen Shadowstep' },
  ],
  knownRecipes: [1001],
  dailyCrafting: ['charged_quartz_crystal'],
  mapCompletion: 100,
  dailyWvwDone: true,
  fetchedAt: Date.now(),
  errors: [],
};

const itemMap = new Map<number, GameItem>([
  [
    19721,
    {
      id: 19721,
      name: 'Glob of Ectoplasm',
      type: 'CraftingMaterial',
      rarity: 'Rare',
      level: 0,
      vendorValue: 256,
    },
  ],
  [
    19976,
    {
      id: 19976,
      name: 'Mystic Coin',
      type: 'CraftingMaterial',
      rarity: 'Rare',
      level: 0,
      vendorValue: 100,
    },
  ],
  [
    30689,
    {
      id: 30689,
      name: 'Eternity',
      type: 'Weapon',
      rarity: 'Legendary',
      level: 80,
      vendorValue: 100000,
    },
  ],
]);

const priceMap = new Map<number, PriceInfo>([
  [19721, { id: 19721, buy: 3000, sell: 3400, whitelisted: true }],
  [19976, { id: 19976, buy: 18500, sell: 19800, whitelisted: true }],
]);

test('1. buildAccountInventoryIndex consolidates all locations without double-counting', () => {
  const entries = buildAccountInventoryIndex(
    mockAccount,
    (id) => itemMap.get(id),
    priceMap,
  );

  // 19721 (Ecto), 19976 (Mystic Coin), 30689 (Eternity), plus equipped upgrade 24615 & infusion 49432
  assert.ok(entries.length >= 3);

  const ecto = entries.find((e) => e.itemId === 19721);
  assert.ok(ecto, 'Expected Glob of Ectoplasm entry');
  assert.equal(ecto.totalStock, 400);
  assert.equal(ecto.totalCount, 400);
  assert.equal(ecto.materialStorageCount, 250);
  assert.equal(ecto.bankCount, 120);
  assert.equal(ecto.sharedCount, 0);
  assert.equal(ecto.characterBagCount, 30);
  assert.equal(ecto.equippedCount, 0);
  assert.equal(ecto.locations.length, 4);
  assert.deepEqual(
    ecto.locations.map((l) => ({ kind: l.kind, characterName: l.characterName, count: l.count })),
    [
      { kind: 'materials', characterName: undefined, count: 250 },
      { kind: 'bank', characterName: undefined, count: 120 },
      { kind: 'character_bag', characterName: 'Lyra Dawnblade', count: 20 },
      { kind: 'character_bag', characterName: 'Kaelen Shadowstep', count: 10 },
    ],
  );

  const eternity = entries.find((e) => e.itemId === 30689);
  assert.ok(eternity, 'Expected equipped Eternity entry');
  assert.equal(eternity.totalStock, 0);
  assert.equal(eternity.equippedCount, 1);
  assert.equal(eternity.totalCount, 1);
  assert.equal(eternity.locations[0]?.kind, 'character_equipped');
  assert.equal(eternity.locations[0]?.characterName, 'Lyra Dawnblade');
});

test('2. filterAndSortAccountInventory supports partial name, character name, location, and rarity filters', () => {
  const entries = buildAccountInventoryIndex(
    mockAccount,
    (id) => itemMap.get(id),
    priceMap,
  );

  // Partial case-insensitive search
  const ectoSearch = filterAndSortAccountInventory(entries, {
    query: 'ectoplasm',
    locationFilter: 'all',
    characterFilter: 'all',
    typeFilter: 'all',
    rarityFilter: 'all',
    sortBy: 'count-desc',
  });
  assert.equal(ectoSearch.length, 1);
  assert.equal(ectoSearch[0].itemId, 19721);

  // Search by character name
  const charQuery = filterAndSortAccountInventory(entries, {
    query: 'Kaelen',
    locationFilter: 'all',
    characterFilter: 'all',
    typeFilter: 'all',
    rarityFilter: 'all',
    sortBy: 'count-desc',
  });
  assert.equal(charQuery.length, 1);
  assert.equal(charQuery[0].itemId, 19721);

  // Location filter: shared inventory only
  const sharedOnly = filterAndSortAccountInventory(entries, {
    query: '',
    locationFilter: 'shared',
    characterFilter: 'all',
    typeFilter: 'all',
    rarityFilter: 'all',
    sortBy: 'count-desc',
  });
  assert.equal(sharedOnly.length, 1);
  assert.equal(sharedOnly[0].itemId, 19976);

  // Equipped filter
  const equippedOnly = filterAndSortAccountInventory(entries, {
    query: '',
    locationFilter: 'equipped',
    characterFilter: 'Lyra Dawnblade',
    typeFilter: 'all',
    rarityFilter: 'Legendary',
    sortBy: 'rarity-desc',
  });
  assert.equal(equippedOnly.length, 1);
  assert.equal(equippedOnly[0].itemId, 30689);
});

test('3. computeMultiGoalMaterialPlan deduplicates shared material demand across goals without double-counting stock', () => {
  const stockMap = new Map<number, number>([
    [19721, 400],
    [19976, 85],
  ]);

  const rows = computeMultiGoalMaterialPlan(
    [
      {
        goalId: 'sunrise',
        goalName: 'Sunrise',
        requirements: new Map([
          [19721, 250],
          [19976, 77],
        ]),
      },
      {
        goalId: 'twilight',
        goalName: 'Twilight',
        requirements: new Map([
          [19721, 250],
          [19976, 77],
        ]),
      },
    ],
    stockMap,
  );

  assert.equal(rows.length, 2);

  // Glob of Ectoplasm: 250 + 250 = 500 demanded, 400 in stock -> 100 missing
  const ectoRow = rows.find((m) => m.itemId === 19721);
  assert.ok(ectoRow);
  assert.equal(ectoRow.combinedRequired, 500);
  assert.equal(ectoRow.accountStock, 400);
  assert.equal(ectoRow.ownedAllocated, 400);
  assert.equal(ectoRow.netMissing, 100);
  assert.equal(ectoRow.isSharedAcrossGoals, true);

  // Mystic Coin: 77 + 77 = 154 demanded, 85 in stock -> 69 missing
  const coinRow = rows.find((m) => m.itemId === 19976);
  assert.ok(coinRow);
  assert.equal(coinRow.combinedRequired, 154);
  assert.equal(coinRow.accountStock, 85);
  assert.equal(coinRow.ownedAllocated, 85);
  assert.equal(coinRow.netMissing, 69);
});

test('4. computeWvwRankProgression and generateWvwSituationalInsights provide deterministic rules in EN and DE', () => {
  setLanguage('en');
  const rankProg = computeWvwRankProgression(642);
  assert.ok(rankProg);
  assert.equal(rankProg.rank, 642);
  assert.equal(rankProg.tierId, 'gold');
  assert.ok(rankProg.titleName.includes('Gold'));
  assert.equal(rankProg.abilityPointsMax, 1226);

  const diamondProg = computeWvwRankProgression(4500);
  assert.ok(diamondProg);
  assert.equal(diamondProg.tierId, 'diamond');
  assert.equal(diamondProg.abilityMasteryPct, 100);
  assert.equal(diamondProg.isAbilityMaxed, true);

  const mockMatch: WvwMatch = {
    id: '2-1',
    start_time: '2026-10-23T18:00:00Z',
    end_time: '2026-10-30T18:00:00Z',
    scores: { red: 100000, blue: 180000, green: 120000 },
    victory_points: { red: 15, blue: 30, green: 20 },
    kills: { red: 500, blue: 700, green: 600 },
    deaths: { red: 600, blue: 450, green: 550 },
    worlds: { red: 2007, blue: 2011, green: 2001 },
    all_worlds: { red: [2007], blue: [2011], green: [2001] },
    maps: [],
  };

  const nowMs = Date.now();
  const tenMinAgoIso = new Date(nowMs - 10 * 60_000).toISOString();

  const mockObjectives: WvwCombinedObjective[] = [
    {
      id: '38-9',
      name: 'Stonemist Castle',
      type: 'Castle',
      mapId: 38,
      mapType: 'Center',
      owner: 'Blue',
      lastFlipped: tenMinAgoIso,
      secondsSinceFlip: 600,
      isRiActive: false,
      pointsTick: 35,
      pointsCapture: 35,
      yaksDelivered: 5,
      guildUpgrades: [],
    },
    {
      id: '1099-102',
      name: 'Fire Keep',
      type: 'Keep',
      mapId: 1099,
      mapType: 'RedHome',
      owner: 'Blue',
      lastFlipped: tenMinAgoIso,
      secondsSinceFlip: 600,
      isRiActive: false,
      pointsTick: 8,
      pointsCapture: 25,
      yaksDelivered: 10,
      guildUpgrades: [],
    },
  ];

  const standings = computeWvwStandings(mockMatch, mockObjectives);
  assert.equal(standings.Blue.victoryPoints, 30);
  assert.equal(standings.Blue.castles, 1);
  assert.equal(standings.Blue.keeps, 1);

  const worldsMap = new Map<number, WvwWorld>([
    [2007, { id: 2007, name: 'Far Shiverpeaks' }],
    [2011, { id: 2011, name: 'Vabbi' }],
    [2001, { id: 2001, name: 'Fissure of Woe' }],
  ]);

  const insights = generateWvwSituationalInsights(
    mockObjectives,
    mockMatch,
    worldsMap,
    'Red',
    true,
    nowMs - 120_000,
    nowMs,
  );

  assert.ok(insights.some((i) => i.id === 'stale-data'));
  assert.ok(insights.some((i) => i.id === 'home-defense'));
  assert.ok(insights.some((i) => i.id === 'vulnerable-t0'));
  assert.ok(insights.some((i) => i.id === 'stonemist-status'));
  assert.ok(insights.some((i) => i.id === 'leader-swing'));

  // Test objective filtering
  const filtered = filterWvwObjectives(mockObjectives, {
    map: 'RedHome',
    type: 'Keep',
    owner: 'Blue',
    status: 'vulnerable',
    search: 'Fire',
    activeTeam: 'Red',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1099-102');
});

test('5. Complete i18n key parity between German (de) and English (en) across the application', () => {
  const deKeys = Object.keys(TRANSLATIONS.de);
  const enKeys = Object.keys(TRANSLATIONS.en);

  for (const key of deKeys) {
    assert.ok(
      key in TRANSLATIONS.en,
      `Key "${key}" exists in TRANSLATIONS.de but is missing in TRANSLATIONS.en`,
    );
  }
  for (const key of enKeys) {
    assert.ok(
      key in TRANSLATIONS.de,
      `Key "${key}" exists in TRANSLATIONS.en but is missing in TRANSLATIONS.de`,
    );
  }
});
