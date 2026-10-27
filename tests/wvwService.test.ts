import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCombinedObjectives } from '../src/data/gw2/wvw/wvwService.ts';
import type {
  WvwMatch,
  WvwStaticObjective,
} from '../src/data/gw2/wvw/types.ts';

const mockStatic: Map<string, WvwStaticObjective> = new Map([
  [
    '38-9',
    {
      id: '38-9',
      name: 'Schloss Steinnebel',
      type: 'Castle',
      map_type: 'Center',
      map_id: 38,
      coord: [10500, 14500, 0],
      chat_link: '[&DAkAAAAmAAAA]',
    },
  ],
  [
    '38-20',
    {
      id: '38-20',
      name: 'Veloka-Hang',
      type: 'Tower',
      map_type: 'Center',
      map_id: 38,
      coord: [11090, 13488, 0],
      chat_link: '[&DBQAAAAmAAAA]',
    },
  ],
]);

test('1. buildCombinedObjectives verbindet statische Metadaten mit Live-Zustand', () => {
  const match: WvwMatch = {
    id: '2-1',
    start_time: '2026-10-23T18:00:00Z',
    end_time: '2026-10-30T18:00:00Z',
    scores: { red: 100, blue: 200, green: 150 },
    kills: { red: 10, blue: 20, green: 15 },
    deaths: { red: 15, blue: 10, green: 12 },
    worlds: { red: 2007, blue: 2011, green: 2001 },
    all_worlds: { red: [2007], blue: [2011], green: [2001] },
    maps: [
      {
        id: 38,
        type: 'Center',
        scores: { red: 50, blue: 100, green: 80 },
        objectives: [
          {
            id: '38-9',
            type: 'Castle',
            owner: 'Blue',
            last_flipped: new Date(Date.now() - 120 * 1000).toISOString(), // vor 2 Min
            points_tick: 12,
            points_capture: 12,
            claimed_by: '21F23263-062B-44A7-B002-4409883B2D6B',
          },
          {
            id: '38-20',
            type: 'Tower',
            owner: 'Red',
            points_tick: 4,
          },
        ],
      },
    ],
  };

  const combined = buildCombinedObjectives(match, mockStatic);
  assert.equal(combined.length, 2);

  const castle = combined.find((o) => o.id === '38-9')!;
  assert.equal(castle.name, 'Schloss Steinnebel');
  assert.equal(castle.owner, 'Blue');
  assert.equal(castle.pointsTick, 12);
  assert.equal(castle.chatLink, '[&DAkAAAAmAAAA]');
  assert.ok(castle.coord);
  assert.equal(castle.isRiActive, true, 'Sollte RI aktiv haben, da vor 2 Min geflippt');
  assert.ok(castle.riSecondsRemaining > 100 && castle.riSecondsRemaining <= 180);

  const tower = combined.find((o) => o.id === '38-20')!;
  assert.equal(tower.name, 'Veloka-Hang');
  assert.equal(tower.owner, 'Red');
  assert.equal(tower.lastFlipped, null);
  assert.equal(tower.secondsSinceFlip, null);
  assert.equal(tower.isRiActive, false);
});

test('2. buildCombinedObjectives stürzt bei null Match nicht ab', () => {
  const combined = buildCombinedObjectives(null, mockStatic);
  assert.deepEqual(combined, []);
});
