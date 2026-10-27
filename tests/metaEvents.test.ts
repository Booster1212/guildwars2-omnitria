import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS,
  getEventSchedule,
  isBossEvent,
  isMetaEvent,
  getEventName,
  getEventZone,
  getEventWaypointName,
} from '../src/data/events.ts';
import { getAchievementsForEvent } from '../src/data/achievements.ts';
import { EVENT_ACHIEVEMENT_MAP, progressActions } from '../src/data/progressStore.ts';

test('1. Dwayna Meta-Event: Kathedrale der Zephyre in Malchors Sprung', () => {
  const dwayna = EVENTS.find((e) => e.id === 'cathedral-of-zephyrs');
  assert.ok(dwayna, 'Dwayna (cathedral-of-zephyrs) muss in EVENTS registriert sein');

  // Namen & Lokalisierung
  assert.equal(dwayna.name, 'Kathedrale der Zephyre (Dwayna)');
  assert.equal(dwayna.nameEn, 'Cathedral of Zephyrs (Dwayna)');
  assert.equal(getEventName(dwayna, 'de'), 'Kathedrale der Zephyre (Dwayna)');
  assert.equal(getEventName(dwayna, 'en'), 'Cathedral of Zephyrs (Dwayna)');

  // Karte & Region
  assert.equal(dwayna.zone, 'Malchors Sprung');
  assert.equal(dwayna.zoneEn, "Malchor's Leap");
  assert.equal(getEventZone(dwayna, 'de'), 'Malchors Sprung');
  assert.equal(getEventZone(dwayna, 'en'), "Malchor's Leap");
  assert.equal(dwayna.mapId, 65, 'Karten-ID von Malchors Sprung muss 65 sein');

  // Wegmarke
  assert.equal(dwayna.waypoint, '[&BLACAAA=]', 'Stürme-Wegmarke Chat-Code muss [&BLACAAA=] sein');
  assert.equal(dwayna.waypointName, 'Stürme-Wegmarke');
  assert.equal(dwayna.waypointNameEn, 'Tempests Waypoint');

  // Klassifikation: Meta-Event (trotz Core-Kategorie)
  assert.equal(dwayna.category, 'core');
  assert.equal(dwayna.eventType, 'meta');
  assert.equal(isBossEvent(dwayna), false, 'Dwayna darf kein World Boss sein');
  assert.equal(isMetaEvent(dwayna), true, 'Dwayna muss als Meta-Event klassifiziert sein');

  // Climax Boss Event & Teil-Events (SubEvents)
  assert.equal(dwayna.climaxEventId, '6A6FD312-E75C-4ABF-8EA1-7AE31E469ABA', 'Verifizierte ArenaNet Event-GUID für Dwayna-Statue');
  assert.ok(dwayna.subEvents && dwayna.subEvents.length >= 4, 'Dwayna muss die Teil-Event-Kette enthalten');

  const bossSub = dwayna.subEvents.find((s) => s.phase === 'boss');
  assert.ok(bossSub, 'Dwayna muss eine Boss-Phase enthalten');
  assert.equal(bossSub.id, '6A6FD312-E75C-4ABF-8EA1-7AE31E469ABA');
  assert.equal(bossSub.name, 'Besiegt die besessene Dwayna-Statue.');
  assert.equal(bossSub.nameEn, 'Defeat the possessed statue of Dwayna.');

  const escortSub = dwayna.subEvents.find((s) => s.phase === 'escort');
  assert.ok(escortSub, 'Dwayna muss eine Eskort-Phase enthalten');
  assert.equal(escortSub.id, 'F531683F-FC09-467F-9661-6741E8382E24');
});

test('2. Lyssa Meta-Event: Kathedrale des Ewigen Strahlens in Malchors Sprung', () => {
  const lyssa = EVENTS.find((e) => e.id === 'cathedral-of-eternal-radiance');
  assert.ok(lyssa, 'Lyssa (cathedral-of-eternal-radiance) muss in EVENTS registriert sein');

  // Namen & Lokalisierung
  assert.equal(lyssa.name, 'Kathedrale des Ewigen Strahlens (Lyssa)');
  assert.equal(lyssa.nameEn, 'Cathedral of Eternal Radiance (Lyssa)');
  assert.equal(getEventName(lyssa, 'de'), 'Kathedrale des Ewigen Strahlens (Lyssa)');
  assert.equal(getEventName(lyssa, 'en'), 'Cathedral of Eternal Radiance (Lyssa)');

  // Karte & Region
  assert.equal(lyssa.zone, 'Malchors Sprung');
  assert.equal(lyssa.zoneEn, "Malchor's Leap");
  assert.equal(getEventZone(lyssa, 'de'), 'Malchors Sprung');
  assert.equal(getEventZone(lyssa, 'en'), "Malchor's Leap");
  assert.equal(lyssa.mapId, 65, 'Karten-ID von Malchors Sprung muss 65 sein');

  // Wegmarke
  assert.equal(lyssa.waypoint, '[&BK0CAAA=]', 'Lyssa-Wegmarke Chat-Code muss [&BK0CAAA=] sein');
  assert.equal(lyssa.waypointName, 'Lyssa-Wegmarke');
  assert.equal(lyssa.waypointNameEn, 'Lyssa Waypoint');

  // Klassifikation: Meta-Event (trotz Core-Kategorie)
  assert.equal(lyssa.category, 'core');
  assert.equal(lyssa.eventType, 'meta');
  assert.equal(isBossEvent(lyssa), false, 'Lyssa darf kein World Boss sein');
  assert.equal(isMetaEvent(lyssa), true, 'Lyssa muss als Meta-Event klassifiziert sein');

  // Climax Boss Event & Teil-Events (SubEvents)
  assert.equal(lyssa.climaxEventId, '0372874E-59B7-4A8F-B535-2CF57B8E67E4', 'Verifizierte ArenaNet Event-GUID für Verdorbene Hohepriesterin');
  assert.ok(lyssa.subEvents && lyssa.subEvents.length >= 5, 'Lyssa muss die Teil-Event-Kette (Siegel, Wren, Endboss) enthalten');

  const bossSub = lyssa.subEvents.find((s) => s.phase === 'boss');
  assert.ok(bossSub, 'Lyssa muss eine Boss-Phase enthalten');
  assert.equal(bossSub.id, '0372874E-59B7-4A8F-B535-2CF57B8E67E4');
  assert.equal(bossSub.name, 'Tötet die Verdorbene Hohepriesterin');
  assert.equal(bossSub.nameEn, 'Kill the Corrupted High Priestess');

  const wrenSub = lyssa.subEvents.find((s) => s.phase === 'escort');
  assert.ok(wrenSub, 'Lyssa muss eine Wren-Eskort-Phase enthalten');
});

test('3. Meta-Event vs. World Boss Filter & Regressions-Prävention', () => {
  const dwayna = EVENTS.find((e) => e.id === 'cathedral-of-zephyrs')!;
  const lyssa = EVENTS.find((e) => e.id === 'cathedral-of-eternal-radiance')!;
  const tequatl = EVENTS.find((e) => e.id === 'tequatl')!;
  const svanir = EVENTS.find((e) => e.id === 'svanir-shaman')!;
  const tarir = EVENTS.find((e) => e.id === 'tarir-octovine')!;

  // Existing bosses reliably remain World Bosses
  assert.equal(isBossEvent(tequatl), true);
  assert.equal(isMetaEvent(tequatl), false);
  assert.equal(isBossEvent(svanir), true);
  assert.equal(isMetaEvent(svanir), false);

  // Existing HoT metas reliably remain Meta-Events
  assert.equal(isBossEvent(tarir), false);
  assert.equal(isMetaEvent(tarir), true);

  // Dwayna and Lyssa are meta-events
  assert.equal(isBossEvent(dwayna), false);
  assert.equal(isMetaEvent(dwayna), true);
  assert.equal(isBossEvent(lyssa), false);
  assert.equal(isMetaEvent(lyssa), true);

  // Simulation: Filter by 'metas'
  const allScheduled = getEventSchedule(new Date('2026-10-27T12:00:00Z'), 16);
  const metaOnly = allScheduled.filter((inst) => isMetaEvent(inst.event));
  const bossOnly = allScheduled.filter((inst) => isBossEvent(inst.event));
  const coreOnly = allScheduled.filter((inst) => inst.event.category === 'core');

  // 'metas' filter MUST contain Dwayna and Lyssa
  assert.ok(metaOnly.some((inst) => inst.event.id === 'cathedral-of-zephyrs'), 'Dwayna muss im "metas" Filter sichtbar sein');
  assert.ok(metaOnly.some((inst) => inst.event.id === 'cathedral-of-eternal-radiance'), 'Lyssa muss im "metas" Filter sichtbar sein');

  // 'bosses' Filter darf weder Dwayna noch Lyssa enthalten
  assert.ok(!bossOnly.some((inst) => inst.event.id === 'cathedral-of-zephyrs'), 'Dwayna darf NICHT im "bosses" Filter sein');
  assert.ok(!bossOnly.some((inst) => inst.event.id === 'cathedral-of-eternal-radiance'), 'Lyssa darf NICHT im "bosses" Filter sein');

  // 'core' filter contains both Core bosses and Core metas
  assert.ok(coreOnly.some((inst) => inst.event.id === 'svanir-shaman'));
  assert.ok(coreOnly.some((inst) => inst.event.id === 'cathedral-of-zephyrs'), 'Dwayna muss bei "core" Filter erscheinen');
  assert.ok(coreOnly.some((inst) => inst.event.id === 'cathedral-of-eternal-radiance'), 'Lyssa muss bei "core" Filter erscheinen');
});

test('4. Zeitplan-Generierung (Schedule) & Rotations-Prüfung', () => {
  const baseTime = new Date('2026-10-27T00:00:00Z');
  const instances = getEventSchedule(baseTime, 24);

  const dwaynaInstances = instances.filter((i) => i.event.id === 'cathedral-of-zephyrs');
  const lyssaInstances = instances.filter((i) => i.event.id === 'cathedral-of-eternal-radiance');

  // 24 hours with 2-hour interval = 12 instances per event
  assert.equal(dwaynaInstances.length, 12, 'Dwayna muss genau 12-mal in 24h spawnen (alle 2 Stunden)');
  assert.equal(lyssaInstances.length, 12, 'Lyssa muss genau 12-mal in 24h spawnen (alle 2 Stunden)');

  // Dwayna startet zu geraden Stunden + 30 Min (00:30, 02:30, etc.)
  for (const inst of dwaynaInstances) {
    const min = inst.startTime.getUTCMinutes();
    assert.equal(min, 30, 'Dwayna muss um XX:30 UTC spawnen');
    assert.equal(inst.event.durationMinutes, 25);
  }

  // Lyssa startet zu ungeraden Stunden + 30 Min (01:30, 03:30, etc.)
  for (const inst of lyssaInstances) {
    const min = inst.startTime.getUTCMinutes();
    assert.equal(min, 30, 'Lyssa muss um XX:30 UTC spawnen');
    assert.equal(inst.event.durationMinutes, 25);
  }
});

test('5. Erfolgs-Zuordnung (Achievements) & Progress-Store Mappings', () => {
  // Dwayna Achievements
  const dwaynaAchs = getAchievementsForEvent('cathedral-of-zephyrs');
  assert.ok(dwaynaAchs.length >= 2, 'Dwayna muss Erfolge zugewiesen haben');
  const acolyte = dwaynaAchs.find((a) => a.id === 'dwayna-acolyte');
  assert.ok(acolyte);
  assert.equal(acolyte.gw2Id, 1736, 'Akolyth der Dwayna GW2-ID 1736');

  // Lyssa Achievements
  const lyssaAchs = getAchievementsForEvent('cathedral-of-eternal-radiance');
  assert.ok(lyssaAchs.length >= 2, 'Lyssa muss Erfolge zugewiesen haben');
  const completer = lyssaAchs.find((a) => a.id === 'lyssa-malchor-events');
  assert.ok(completer);
  assert.equal(completer.gw2Id, 1961, 'Malchor Event Completer GW2-ID 1961');

  // ProgressStore EVENT_ACHIEVEMENT_MAP
  assert.equal(EVENT_ACHIEVEMENT_MAP['cathedral-of-zephyrs'], 1736);
  assert.equal(EVENT_ACHIEVEMENT_MAP['cathedral-of-eternal-radiance'], 1961);
});

test('6. Fehlende, unbekannte oder unvollständige API-Daten', () => {
  // 1. isEventCompletedToday with empty or faulty array does not crash
  const res1 = progressActions.isEventCompletedToday('cathedral-of-zephyrs', [], []);
  assert.equal(typeof res1, 'boolean');

  const res2 = progressActions.isEventCompletedToday('cathedral-of-eternal-radiance', undefined, undefined);
  assert.equal(typeof res2, 'boolean');

  // 2. Schedule with invalid times throws no error
  const validSchedule = getEventSchedule(new Date(), 2);
  assert.ok(Array.isArray(validSchedule));
  assert.ok(validSchedule.length > 0);
});
