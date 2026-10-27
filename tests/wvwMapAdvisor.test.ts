import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMapOpportunities } from '../src/data/gw2/wvw/mapAdvisor.ts';
import { resolveTeamNames, getOwnerDisplayName, detectPlayerTeamFromWorld } from '../src/data/gw2/wvw/teamUtils.ts';
import type { WvwCombinedObjective, WvwMatch, WvwWorld } from '../src/data/gw2/wvw/types.ts';

test('1. resolveTeamNames liest Hauptwelt und verbundene Welten sauber aus', () => {
  const worldsMap = new Map<number, WvwWorld>([
    [2007, { id: 2007, name: 'Ferne Zittergipfel', population: 'Full' }],
    [2203, { id: 2203, name: 'Elonaspitze [DE]', population: 'Medium' }],
    [2011, { id: 2011, name: 'Vaabi', population: 'VeryHigh' }],
  ]);

  const mockMatch: Partial<WvwMatch> = {
    id: '2-1',
    worlds: { red: 2007, blue: 2011, green: 2001 },
    all_worlds: {
      red: [12007, 2203, 2007],
      blue: [2011],
      green: [2001],
    },
  };

  const redInfo = resolveTeamNames('Red', mockMatch as WvwMatch, worldsMap);
  assert.equal(redInfo.mainName, 'Ferne Zittergipfel');
  assert.deepEqual(redInfo.linkedNames, ['Elonaspitze [DE]']);
  assert.equal(redInfo.fullName, 'Ferne Zittergipfel (+ Elonaspitze [DE])');

  const ownerLabel = getOwnerDisplayName('Red', mockMatch as WvwMatch, worldsMap, 'de');
  assert.equal(ownerLabel, 'Rot (Ferne Zittergipfel)');
});

test('2. detectPlayerTeamFromWorld erkennt Gastwelten und Hostwelten', () => {
  const mockMatch: Partial<WvwMatch> = {
    id: '2-1',
    worlds: { red: 2007, blue: 2011, green: 2001 },
    all_worlds: {
      red: [12007, 2203, 2007],
      blue: [2011],
      green: [2001],
    },
  };

  assert.equal(detectPlayerTeamFromWorld(2007, mockMatch as WvwMatch), 'Red');
  assert.equal(detectPlayerTeamFromWorld(2203, mockMatch as WvwMatch), 'Red');
  assert.equal(detectPlayerTeamFromWorld(2011, mockMatch as WvwMatch), 'Blue');
  assert.equal(detectPlayerTeamFromWorld(9999, mockMatch as WvwMatch), null);
});

test('3. evaluateMapOpportunities empfiehlt EBG bei offenem Steinnebel-Schloss', () => {
  const mockObjectives: WvwCombinedObjective[] = [
    {
      id: 'center-smc',
      name: 'Schloss Steinnebel',
      type: 'Castle',
      mapType: 'Center',
      mapId: 38,
      owner: 'Blue',
      pointsTick: 35,
      pointsCapture: 35,
      lastFlipped: new Date(Date.now() - 3600 * 1000),
      secondsSinceFlip: 3600,
      isRiActive: false,
      riSecondsRemaining: 0,
      claimedBy: null,
      claimedAt: null,
      yaksDelivered: 0,
      guildUpgrades: [],
    },
    {
      id: 'center-camp1',
      name: 'Speldan-Kahlschlag',
      type: 'Camp',
      mapType: 'Center',
      mapId: 38,
      owner: 'Blue',
      pointsTick: 5,
      pointsCapture: 5,
      lastFlipped: new Date(Date.now() - 600 * 1000),
      secondsSinceFlip: 600,
      isRiActive: false,
      riSecondsRemaining: 0,
      claimedBy: null,
      claimedAt: null,
      yaksDelivered: 0,
      guildUpgrades: [],
    },
    {
      id: 'center-tower1',
      name: 'Mendons Lücke',
      type: 'Tower',
      mapType: 'Center',
      mapId: 38,
      owner: 'Green',
      pointsTick: 10,
      pointsCapture: 10,
      lastFlipped: new Date(Date.now() - 600 * 1000),
      secondsSinceFlip: 600,
      isRiActive: false,
      riSecondsRemaining: 0,
      claimedBy: null,
      claimedAt: null,
      yaksDelivered: 0,
      guildUpgrades: [],
    },
  ];

  const recs = evaluateMapOpportunities(mockObjectives, 'Red', []);
  assert.ok(recs.length === 4);
  const best = recs[0];
  assert.equal(best.mapType, 'Center');
  assert.ok(best.score >= 45);
  assert.ok(best.reasonsDe.some((r) => r.includes('Steinnebel-Schloss')));
});
