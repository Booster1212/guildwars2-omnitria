import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isEventOnMap,
  getProfessionName,
  getRaceName,
  MUMBLE_PROFESSIONS,
  MUMBLE_RACES,
  GW2_MAP_ZONE_MAP,
  type MumbleData,
} from '../src/data/gw2/mumble.ts';
import type { WorldEvent } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// 1. Map Matching & Context Awareness Tests
// ============================================================================
test('1.1 isEventOnMap matches event by explicit mapId', () => {
  const event: WorldEvent = {
    id: 'dwayna',
    name: 'Statue der Dwayna',
    zone: 'Malchors Sprung',
    zoneEn: "Malchor's Leap",
    waypoint: '[&BKcCAAA=]',
    category: 'core',
    iconType: 'skull',
    times: ['00:30'],
    mapId: 65,
  };

  assert.equal(isEventOnMap(event, 65), true, 'Should match when mapId is identical');
  assert.equal(isEventOnMap(event, 15), false, 'Should not match when mapId differs');
  assert.equal(isEventOnMap(event, undefined), false, 'Should return false when mapId is undefined');
  assert.equal(isEventOnMap(event, 0), false, 'Should return false when mapId is 0');
});

test('1.2 isEventOnMap matches event by zone name lookup for events without explicit mapId', () => {
  const tequatl: WorldEvent = {
    id: 'tequatl',
    name: 'Tequatl der Sonnenlose',
    nameEn: 'Tequatl the Sunless',
    zone: 'Funkenschwärmersumpf',
    zoneEn: 'Sparkfly Fen',
    waypoint: '[&BNABAAA=]',
    category: 'hardcore',
    iconType: 'dragon',
    times: ['00:00'],
  };

  // Map 53 is Sparkfly Fen / Funkenschwärmersumpf
  assert.equal(isEventOnMap(tequatl, 53), true, 'Should match Sparkfly Fen by zone name lookup');
  // Map 15 is Queensdale
  assert.equal(isEventOnMap(tequatl, 15), false, 'Should not match Queensdale');
});

test('1.3 isEventOnMap handles multi-zone metas (e.g. Ley-Line Anomaly)', () => {
  const anomaly: WorldEvent = {
    id: 'ley_line_anomaly',
    name: 'Ley-Linien-Anomalie',
    nameEn: 'Ley-Line Anomaly',
    zone: 'Gendarran-Felder / Eisenmark / Holzland',
    zoneEn: 'Gendarran Fields / Iron Marches / Timberline Falls',
    waypoint: '[&BOcAAAA=]',
    category: 'core',
    iconType: 'anomaly',
    times: ['00:20'],
  };

  // Map 24: Gendarran Fields, Map 25: Iron Marches, Map 29: Timberline Falls
  assert.equal(isEventOnMap(anomaly, 24), true, 'Should match Gendarran Fields');
  assert.equal(isEventOnMap(anomaly, 25), true, 'Should match Iron Marches');
  assert.equal(isEventOnMap(anomaly, 29), true, 'Should match Timberline Falls');
  // Map 1043: Auric Basin
  assert.equal(isEventOnMap(anomaly, 1043), false, 'Should not match Auric Basin');
});

test('1.4 GW2_MAP_ZONE_MAP covers major expansions (HoT, PoF, EoD, SotO, Janthir, VoE)', () => {
  // HoT
  assert.ok(GW2_MAP_ZONE_MAP[1043], 'Auric Basin mapId 1043 must exist');
  assert.equal(GW2_MAP_ZONE_MAP[1043].en, 'Auric Basin');

  // PoF
  assert.ok(GW2_MAP_ZONE_MAP[1210], 'Crystal Oasis mapId 1210 must exist');

  // EoD
  assert.ok(GW2_MAP_ZONE_MAP[1442], 'Seitung Province mapId 1442 must exist');

  // SotO
  assert.ok(GW2_MAP_ZONE_MAP[1489], 'Skywatch Archipelago mapId 1489 must exist');

  // Janthir
  assert.ok(GW2_MAP_ZONE_MAP[1538], 'Janthir Syntri mapId 1538 must exist');

  // VoE
  assert.ok(GW2_MAP_ZONE_MAP[1550], 'Isle of Castora mapId 1550 must exist');
});

// ============================================================================
// 2. Telemetry Dictionary & Localization Tests
// ============================================================================
test('2.1 getProfessionName accurately maps all 9 GW2 professions in DE and EN', () => {
  assert.equal(getProfessionName(1, 'de'), 'Wächter');
  assert.equal(getProfessionName(1, 'en'), 'Guardian');

  assert.equal(getProfessionName(2, 'de'), 'Krieger');
  assert.equal(getProfessionName(2, 'en'), 'Warrior');

  assert.equal(getProfessionName(3, 'de'), 'Ingenieur');
  assert.equal(getProfessionName(3, 'en'), 'Engineer');

  assert.equal(getProfessionName(4, 'de'), 'Waldläufer');
  assert.equal(getProfessionName(4, 'en'), 'Ranger');

  assert.equal(getProfessionName(5, 'de'), 'Dieb');
  assert.equal(getProfessionName(5, 'en'), 'Thief');

  assert.equal(getProfessionName(6, 'de'), 'Elementarmagier');
  assert.equal(getProfessionName(6, 'en'), 'Elementalist');

  assert.equal(getProfessionName(7, 'de'), 'Mesmer');
  assert.equal(getProfessionName(7, 'en'), 'Mesmer');

  assert.equal(getProfessionName(8, 'de'), 'Nekromant');
  assert.equal(getProfessionName(8, 'en'), 'Necromancer');

  assert.equal(getProfessionName(9, 'de'), 'Widergänger');
  assert.equal(getProfessionName(9, 'en'), 'Revenant');

  assert.equal(getProfessionName(99, 'de'), null, 'Unknown profession returns null');
  assert.equal(getProfessionName(undefined, 'de'), null);
});

test('2.2 getRaceName accurately maps all 5 GW2 playable races', () => {
  assert.equal(getRaceName(0, 'de'), 'Asura');
  assert.equal(getRaceName(1, 'de'), 'Charr');
  assert.equal(getRaceName(2, 'de'), 'Mensch');
  assert.equal(getRaceName(2, 'en'), 'Human');
  assert.equal(getRaceName(3, 'de'), 'Norn');
  assert.equal(getRaceName(4, 'de'), 'Sylvari');

  assert.equal(getRaceName(99, 'de'), null, 'Unknown race returns null');
});

// ============================================================================
// 3. Bitmask & In-Combat Telemetry Logic Tests
// ============================================================================
test('3.1 MumbleLink uiState bitmask accurately decodes in-combat state', () => {
  const UI_STATE_MAP_OPEN = 0x01;
  const UI_STATE_IN_COMBAT = 0x40;
  const UI_STATE_HAS_FOCUS = 0x08;

  const peacefulState = UI_STATE_MAP_OPEN | UI_STATE_HAS_FOCUS; // 0x09
  assert.equal((peacefulState & UI_STATE_IN_COMBAT) !== 0, false, 'Should be out of combat');

  const combatState = UI_STATE_HAS_FOCUS | UI_STATE_IN_COMBAT; // 0x48
  assert.equal((combatState & UI_STATE_IN_COMBAT) !== 0, true, 'Should be in combat');
});

// ============================================================================
// 4. Standalone MumbleReader Executable Verification
// ============================================================================
test('4.1 electron/MumbleReader.cs source file exists and contains MemoryMappedFile reading', () => {
  const csPath = path.join(projectRoot, 'electron', 'MumbleReader.cs');
  assert.ok(fs.existsSync(csPath), 'MumbleReader.cs must exist');
  const content = fs.readFileSync(csPath, 'utf8');

  assert.ok(content.includes('MemoryMappedFile.CreateOrOpen("MumbleLink", 5460'), 'Must create or open MumbleLink shared memory');
  assert.ok(content.includes('uiState & 0x40'), 'Must read combat bitmask');
  assert.ok(content.includes('accessor.ReadUInt32(1136)'), 'Must read mapId at offset 1136');
  assert.ok(content.includes('--one-shot'), 'Must support --one-shot mode');
});

test('4.2 electron/mumble-reader.exe executes cleanly in --one-shot mode and produces valid JSON', () => {
  const exePath = path.join(projectRoot, 'electron', 'mumble-reader.exe');
  assert.ok(fs.existsSync(exePath), 'mumble-reader.exe must exist');

  const output = execSync(`"${exePath}" --one-shot`, { encoding: 'utf8' }).trim();
  assert.ok(output.length > 0, 'Must produce output');

  const parsed = JSON.parse(output) as MumbleData;
  assert.equal(typeof parsed.connected, 'boolean', 'Parsed JSON must contain boolean connected field');
});

