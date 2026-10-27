import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTacticalRecommendations } from '../src/data/gw2/wvw/advisor.ts';
import { DEFAULT_ADVISOR_WEIGHTS } from '../src/data/gw2/wvw/constants.ts';
import type {
  WvwMatch,
  WvwCombinedObjective,
  AdvisorConfig,
} from '../src/data/gw2/wvw/types.ts';

// Synthetische Testdaten
const mockMatch: WvwMatch = {
  id: '2-1',
  start_time: '2026-10-23T18:00:00Z',
  end_time: '2026-10-30T18:00:00Z',
  scores: { red: 100000, blue: 180000, green: 120000 }, // Blue leads comfortably!
  victory_points: { red: 15, blue: 30, green: 20 },
  kills: { red: 500, blue: 700, green: 600 },
  deaths: { red: 600, blue: 450, green: 550 },
  worlds: { red: 2007, blue: 2011, green: 2001 },
  all_worlds: { red: [2007], blue: [2011], green: [2001] },
  maps: [],
};

const makeObj = (partial: Partial<WvwCombinedObjective>): WvwCombinedObjective => ({
  id: 'obj-1',
  name: 'Test Objekt',
  type: 'Tower',
  mapType: 'Center',
  mapId: 38,
  owner: 'Blue',
  pointsTick: 4,
  pointsCapture: 4,
  lastFlipped: new Date(Date.now() - 3600 * 1000), // vor 1 Stunde
  secondsSinceFlip: 3600,
  isRiActive: false,
  riSecondsRemaining: 0,
  claimedBy: null,
  claimedAt: null,
  guildInfo: null,
  yaksDelivered: 10,
  guildUpgrades: [],
  coord: [10000, 10000, 0],
  ...partial,
});

const defaultConfig: AdvisorConfig = {
  weights: { ...DEFAULT_ADVISOR_WEIGHTS },
  preset: 'balanced',
  playerTeam: 'Red',
  ignoredObjectiveIds: [],
  pinnedObjectiveIds: [],
  filterMap: 'all',
  filterType: 'all',
};

// ============================================================================
// Test 1: Base priority & objective hierarchy
// ============================================================================
test('1. Schloss Steinnebel hat höheren Basiswert als ein einzelnes Lager', () => {
  const castle = makeObj({ id: 'castle', type: 'Castle', pointsTick: 12, owner: 'Blue' });
  const camp = makeObj({ id: 'camp', type: 'Camp', pointsTick: 2, owner: 'Blue' });

  const result = generateTacticalRecommendations([castle, camp], mockMatch, defaultConfig, 'de');
  assert.equal(result.topRecommendations.length, 2);
  assert.equal(result.topRecommendations[0].objective.id, 'castle');
  assert.ok(result.topRecommendations[0].priorityScore > result.topRecommendations[1].priorityScore);
});

// ============================================================================
// Test 2: Righteous Indignation (RI) drastically penalizes priority
// ============================================================================
test('2. Ziel unter RI (Rechtschaffene Entrüstung) erhält massive Strafe und überschreitet 25 nicht', () => {
  const normalTower = makeObj({ id: 't-normal', type: 'Tower', isRiActive: false });
  const riTower = makeObj({
    id: 't-ri',
    type: 'Tower',
    isRiActive: true,
    riSecondsRemaining: 240,
    secondsSinceFlip: 60,
  });

  const result = generateTacticalRecommendations([riTower, normalTower], mockMatch, defaultConfig, 'de');
  assert.equal(result.topRecommendations[0].objective.id, 't-normal');

  const riRec = result.allRanked.find((r) => r.objective.id === 't-ri');
  assert.ok(riRec);
  assert.ok(riRec.priorityScore <= 25, `RI-Score sollte <= 25 sein, war ${riRec.priorityScore}`);
  assert.ok(riRec.reasons.some((r) => r.includes('Rechtschaffene Entrüstung') || r.includes('RI')));
});

// ============================================================================
// Test 3: Spitzenreiter-Bonus (Leader Swing)
// ============================================================================
test('3. Ziele des führenden Teams (Blue) erhalten höheren Leader-Swing als Ziele des Tabellendritten (Green)', () => {
  // MockMatch: Blue leads (180,000) against Green (120,000) and Red (100,000)
  const blueTower = makeObj({ id: 't-blue', type: 'Tower', owner: 'Blue' });
  const greenTower = makeObj({ id: 't-green', type: 'Tower', owner: 'Green' });

  const result = generateTacticalRecommendations([greenTower, blueTower], mockMatch, defaultConfig, 'de');
  const blueRec = result.allRanked.find((r) => r.objective.id === 't-blue')!;
  const greenRec = result.allRanked.find((r) => r.objective.id === 't-green')!;

  assert.ok(
    blueRec.factors.leaderSwing > greenRec.factors.leaderSwing,
    `Blue Leader Swing (${blueRec.factors.leaderSwing}) sollte > Green (${greenRec.factors.leaderSwing}) sein`,
  );
});

// ============================================================================
// Test 4: Frischer T0-Zustand (Post-RI Verwundbarkeitsfenster)
// ============================================================================
test('4. Frischer T0-Zustand (10 Min nach Flip) erhält Verwundbarkeitsbonus', () => {
  const freshT0 = makeObj({ id: 'fresh', secondsSinceFlip: 600, isRiActive: false });
  const fortifiedT3 = makeObj({
    id: 't3',
    secondsSinceFlip: 7200,
    isRiActive: false,
    guildUpgrades: [1, 2, 3],
  });

  const result = generateTacticalRecommendations([freshT0, fortifiedT3], mockMatch, defaultConfig, 'de');
  const freshRec = result.allRanked.find((r) => r.objective.id === 'fresh')!;
  const t3Rec = result.allRanked.find((r) => r.objective.id === 't3')!;

  assert.ok(
    freshRec.factors.vulnerability > t3Rec.factors.vulnerability,
    'Frisch geflipptes T0-Ziel muss höheren Verwundbarkeitswert aufweisen',
  );
});

// ============================================================================
// Test 5: Ignorieren & Pinnen (Favoriten)
// ============================================================================
test('5. Ignoriertes Ziel wird genullt; Gepinntes Ziel erhält Vorrang', () => {
  const obj1 = makeObj({ id: 'obj-1', type: 'Tower' });
  const obj2 = makeObj({ id: 'obj-2', type: 'Camp' });

  const configWithActions: AdvisorConfig = {
    ...defaultConfig,
    ignoredObjectiveIds: ['obj-1'],
    pinnedObjectiveIds: ['obj-2'],
  };

  const result = generateTacticalRecommendations([obj1, obj2], mockMatch, configWithActions, 'de');
  assert.equal(result.topRecommendations[0].objective.id, 'obj-2');
  assert.ok(result.topRecommendations[0].isPinned);

  const ignored = result.allRanked.find((r) => r.objective.id === 'obj-1')!;
  assert.equal(ignored.priorityScore, 0);
  assert.ok(ignored.isIgnored);
});

// ============================================================================
// Test 6: Filtering by map and type
// ============================================================================
test('6. Filter schließt nicht zutreffende Karten oder Typen sauber aus', () => {
  const ebgTower = makeObj({ id: 'ebg-t', mapType: 'Center', type: 'Tower' });
  const redCamp = makeObj({ id: 'red-c', mapType: 'RedHome', type: 'Camp' });
  const blueKeep = makeObj({ id: 'blue-k', mapType: 'BlueHome', type: 'Keep' });

  const mapFilterConfig: AdvisorConfig = {
    ...defaultConfig,
    filterMap: 'Center',
    filterType: 'Tower',
  };

  const result = generateTacticalRecommendations([ebgTower, redCamp, blueKeep], mockMatch, mapFilterConfig, 'de');
  assert.equal(result.allRanked.length, 1);
  assert.equal(result.allRanked[0].objective.id, 'ebg-t');
});

// ============================================================================
// Test 7: Friendly objectives are not recommended for assault
// ============================================================================
test('7. Eigene Ziele (playerTeam === Red) werden von Angriffsempfehlungen ausgeschlossen', () => {
  const ownKeep = makeObj({ id: 'own-keep', owner: 'Red', type: 'Keep' });
  const enemyCamp = makeObj({ id: 'enemy-camp', owner: 'Blue', type: 'Camp' });

  const result = generateTacticalRecommendations([ownKeep, enemyCamp], mockMatch, defaultConfig, 'de');
  assert.equal(result.allRanked.length, 1);
  assert.equal(result.allRanked[0].objective.id, 'enemy-camp');
});
