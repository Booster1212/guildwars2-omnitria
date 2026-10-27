import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS, setLanguage, getLanguage, t } from '../src/i18n/index.ts';
import { generateTacticalRecommendations } from '../src/data/gw2/wvw/advisor.ts';
import { evaluateMapOpportunities } from '../src/data/gw2/wvw/mapAdvisor.ts';
import { resolveTeamNames, getOwnerDisplayName, formatMatchOptionLabel } from '../src/data/gw2/wvw/teamUtils.ts';
import { ADVISOR_PRESETS, DEFAULT_ADVISOR_WEIGHTS } from '../src/data/gw2/wvw/constants.ts';
import type {
  WvwMatch,
  WvwCombinedObjective,
  AdvisorConfig,
  WvwWorld,
} from '../src/data/gw2/wvw/types.ts';

const mockMatch: WvwMatch = {
  id: '2-1',
  start_time: '2026-10-23T18:00:00Z',
  end_time: '2026-10-30T18:00:00Z',
  scores: { red: 100000, blue: 180000, green: 120000 },
  victory_points: { red: 15, blue: 30, green: 20 },
  kills: { red: 500, blue: 700, green: 600 },
  deaths: { red: 600, blue: 450, green: 550 },
  worlds: { red: 2007, blue: 2011, green: 2001 },
  all_worlds: { red: [2007, 2002], blue: [2011], green: [2001] },
  maps: [
    {
      id: 38,
      type: 'Center',
      scores: { red: 30000, blue: 60000, green: 40000 },
      objectives: [],
    },
  ],
};

const mockWorldsMap = new Map<number, WvwWorld>([
  [2007, { id: 2007, name: 'Far Shiverpeaks' }],
  [2002, { id: 2002, name: 'Desolation' }],
  [2011, { id: 2011, name: 'Vabbi' }],
  [2001, { id: 2001, name: 'Fissure of Woe' }],
]);

const defaultConfig: AdvisorConfig = {
  weights: { ...DEFAULT_ADVISOR_WEIGHTS },
  preset: 'balanced',
  playerTeam: 'Red',
  ignoredObjectiveIds: [],
  pinnedObjectiveIds: [],
  filterMap: 'all',
  filterType: 'all',
};

test('1. Every WvW key in German has an exact corresponding English translation in TRANSLATIONS', () => {
  const deKeys = Object.keys(TRANSLATIONS.de).filter((k) => k.startsWith('wvw.'));
  const enKeys = Object.keys(TRANSLATIONS.en).filter((k) => k.startsWith('wvw.'));

  assert.ok(deKeys.length >= 70, `Expected at least 70 WvW translation keys, found ${deKeys.length}`);
  
  for (const key of deKeys) {
    const enVal = (TRANSLATIONS.en as Record<string, string>)[key];
    assert.ok(enVal, `Missing English translation for key: ${key}`);
    assert.notEqual(enVal.trim(), '', `Empty English translation for key: ${key}`);
  }

  assert.equal(deKeys.length, enKeys.length, 'All German and English WvW keys must match 1:1');
});

test('2. t() resolves English WvW strings when language is set to English', () => {
  setLanguage('en');
  assert.equal(getLanguage(), 'en');

  assert.equal(t('wvw.title'), 'WvW Tactical Assistant (Alpha)');
  assert.equal(t('wvw.tabAdvisor'), 'Tactical Advisor');
  assert.equal(t('wvw.tabMap'), 'Tactical Map');
  assert.equal(t('wvw.tabDashboard'), 'Match Dashboard');
  assert.equal(t('wvw.tabFlips'), 'Observed Flips');
  assert.equal(t('wvw.castle'), 'Castle');
  assert.equal(t('wvw.keep'), 'Keep');
  assert.equal(t('wvw.tower'), 'Tower');
  assert.equal(t('wvw.camp'), 'Camp');
  assert.equal(t('wvw.filterMap'), 'Map');
  assert.equal(t('wvw.filterType'), 'Type');
  assert.equal(t('wvw.filterOwner'), 'Owner');
  assert.equal(t('wvw.resetFilters'), 'Reset filters');
  assert.equal(t('wvw.done'), 'Done');
});

test('3. Tactical recommendations generate proper English reasons and uncertainty notes', () => {
  const castle: WvwCombinedObjective = {
    id: 'smc',
    name: 'Steinnebel-Schloss',
    nameEn: 'Stonemist Castle',
    type: 'Castle',
    mapType: 'Center',
    mapId: 38,
    owner: 'Blue',
    pointsTick: 12,
    pointsCapture: 25,
    lastFlipped: new Date(Date.now() - 600 * 1000), // 10 min ago (T0)
    secondsSinceFlip: 600,
    isRiActive: false,
    riSecondsRemaining: 0,
    claimedBy: null,
    claimedAt: null,
    yaksDelivered: 5,
    guildUpgrades: [],
  };

  const result = generateTacticalRecommendations([castle], mockMatch, defaultConfig, [], 'en');
  assert.equal(result.topRecommendations.length, 1);
  const rec = result.topRecommendations[0];

  assert.ok(Array.isArray(rec.reasonsEn), 'rec.reasonsEn must be defined');
  assert.ok(rec.reasonsEn.length > 0, 'rec.reasonsEn must have entries');

  // Verify English phrasing
  const reasonsText = rec.reasons.join(' ');
  assert.ok(
    reasonsText.includes('Stonemist Castle') || reasonsText.includes('Supreme strategic priority'),
    `Expected English castle reason, got: ${reasonsText}`,
  );
  assert.ok(
    reasonsText.includes('Held by match leader') || reasonsText.includes('Flipped 10m ago'),
    `Expected English swing/vulnerability reason, got: ${reasonsText}`,
  );

  // Check English uncertainty notes
  assert.ok(Array.isArray(rec.uncertaintyNotesEn), 'uncertaintyNotesEn must be defined');
  const uncertaintyText = rec.uncertaintyNotes.join(' ');
  assert.ok(
    uncertaintyText.includes('public API') || uncertaintyText.includes('scout locally'),
    `Expected English uncertainty disclaimer, got: ${uncertaintyText}`,
  );
});

test('4. Map advisor opportunities generate authentic English map names, badges, and reasons', () => {
  const objectives: WvwCombinedObjective[] = [
    {
      id: 'smc',
      name: 'Stonemist Castle',
      type: 'Castle',
      mapType: 'Center',
      mapId: 38,
      owner: 'Blue',
      pointsTick: 12,
      pointsCapture: 25,
      lastFlipped: new Date(Date.now() - 600 * 1000),
      secondsSinceFlip: 600,
      isRiActive: false,
      riSecondsRemaining: 0,
      claimedBy: null,
      claimedAt: null,
      yaksDelivered: 5,
      guildUpgrades: [],
    },
  ];

  const mapRecs = evaluateMapOpportunities(objectives, 'Red', [], mockMatch);
  assert.equal(mapRecs.length, 4);

  const ebg = mapRecs.find((m) => m.mapType === 'Center');
  assert.ok(ebg);
  assert.equal(ebg.mapNameEn, 'Eternal Battlegrounds (EBG)');
  assert.ok(ebg.badgeEn.length > 0);
  assert.ok(ebg.reasonsEn.length > 0);
  assert.ok(
    ebg.reasonsEn.some((r) => r.includes('Stonemist Castle (SMC) open') || r.includes('fresh T0')),
    `Expected English SMC reason, got: ${ebg.reasonsEn.join('; ')}`,
  );
});

test('5. resolveTeamNames and getOwnerDisplayName produce English names when lang is en', () => {
  const redNames = resolveTeamNames('Red', mockMatch, mockWorldsMap);
  assert.equal(redNames.mainName, 'Far Shiverpeaks');
  assert.deepEqual(redNames.linkedNames, ['Desolation']);
  assert.equal(redNames.fullName, 'Far Shiverpeaks (+ Desolation)');

  const ownerEn = getOwnerDisplayName('Red', mockMatch, mockWorldsMap, 'en');
  assert.equal(ownerEn, 'Red (Far Shiverpeaks)');

  const neutralEn = getOwnerDisplayName('Neutral', mockMatch, mockWorldsMap, 'en');
  assert.equal(neutralEn, 'Neutral');

  const matchLabel = formatMatchOptionLabel('2-1', mockMatch, mockWorldsMap);
  assert.equal(matchLabel, 'EU T1: Far Shiverpeaks / Vabbi / Fissure of Woe');
});

test('6. Advisor presets have complete English labels and descriptions', () => {
  for (const [key, preset] of Object.entries(ADVISOR_PRESETS)) {
    assert.ok(preset.labelEn && preset.labelEn.trim().length > 0, `Preset ${key} missing labelEn`);
    assert.ok(preset.descEn && preset.descEn.trim().length > 0, `Preset ${key} missing descEn`);
  }
});
