import { WorldEvent, EventInstance, MessageTemplateType } from '../types';
import { getAchievementsForEvent } from './achievements';

export const EVENTS: WorldEvent[] = [
  // ==========================================
  // CORE WELTBOSSE
  // ==========================================
  {
    id: 'svanir-shaman',
    name: 'Svanir-Schamane (Frostgipfel)',
    nameEn: 'The Frozen Maw (Svanir Shaman)',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Wanderer-Hügel',
    level: 10,
    waypoint: '[&BMIDAAA=]',
    waypointName: 'Krawallmacher-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [0, 15],
      intervalHours: 2,
    },
    lootHighlights: ['Schamanen-Truhe', 'Seltene Ausrüstung (Ektoplasma)', 'Trophäen & Handwerksmaterialien'],
    tactics: 'Der Schamane beschwört Eisstürme und Frost-Elementare. Bleibe in Bewegung und nutze Fernkampf oder Feuerfertigkeiten.',
    iconType: 'elemental',
  },
  {
    id: 'fire-elemental',
    name: 'Feuerelementar (Thaumanova)',
    nameEn: 'Fire Elemental',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Provinz Metrica',
    level: 15,
    waypoint: '[&BEcAAAA=]',
    waypointName: 'Thaumanova-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [0, 45],
      intervalHours: 2,
    },
    lootHighlights: ['Feuer-Matrix-Truhe', 'Rote Funken', 'Seltene Ausrüstung'],
    tactics: 'Golems über die Brücke eskortieren, Schadensflächen auf dem Boden meiden und die Matrix-Kerne attackieren.',
    iconType: 'elemental',
  },
  {
    id: 'jungle-wurm',
    name: 'Großer Dschungelwurm',
    nameEn: 'Great Jungle Wurm',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Caledon-Wald',
    level: 15,
    waypoint: '[&BEEFAAA=]',
    waypointName: 'Zwielichtgarten-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [1, 15],
      intervalHours: 2,
    },
    lootHighlights: ['Dschungelwurm-Truhe', 'Giftige Drüsen', 'Handwerksrohstoffe'],
    tactics: 'Giftblüten im Sumpf schnell zertrampeln, damit sich keine giftigen Gaswolken ausbreiten, dann Kopf fokussieren.',
    iconType: 'wurm',
  },
  {
    id: 'shadow-behemoth',
    name: 'Schatten-Behemoth',
    nameEn: 'Shadow Behemoth',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Königintal',
    level: 15,
    waypoint: '[&BPcAAAA=]',
    waypointName: 'Sumpfwasser-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [1, 45],
      intervalHours: 2,
    },
    lootHighlights: ['Behemoth-Truhe', 'Garantierte Gelbe/Seltene Items', 'Schatten-Fragmente'],
    tactics: 'Zerstöre zuerst die Unterwelt-Portale im Gottlosen Sumpf. Sobald der Behemoth erscheint, attackiere Kopf und Hände.',
    iconType: 'dragon',
  },
  {
    id: 'taidha-covington',
    name: 'Admiralin Taidha Covington',
    nameEn: 'Admiral Taidha Covington',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Blutstrom-Küste',
    level: 50,
    waypoint: '[&BKgBAAA=]',
    waypointName: 'Lachmöwen-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [0, 0],
      intervalHours: 3,
    },
    lootHighlights: ['Taidhas Piratentruhe', 'Drachenit-Erz', 'Seltene Piraten-Waffen'],
    tactics: 'Trage Bombenfässer an die Galeerentore, weiche Mörserbeschuss aus und unterbrich Taidhas mächtige Schrotflinten-Attacken.',
    iconType: 'pirate',
  },
  {
    id: 'megadestroyer',
    name: 'Megazerstörer',
    nameEn: 'Megadestroyer',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Mahlstromgipfel',
    level: 66,
    waypoint: '[&BM0CAAA=]',
    waypointName: 'Aschfurt-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [0, 30],
      intervalHours: 3,
    },
    lootHighlights: ['Zerstörer-Kern-Truhe', 'Zerstörer-Magnetsteine', 'Drachenit-Erz'],
    tactics: 'Schütze die Asura-Kühlsysteme. Bei Verwundbarkeit CC einsetzen und dem flüssigen Lava-Ausstoß ausweichen.',
    iconType: 'elemental',
  },
  {
    id: 'shatterer',
    name: 'Der Zerschmetterer',
    nameEn: 'The Shatterer',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Flammenkamm-Steppen',
    level: 50,
    waypoint: '[&BE4DAAA=]',
    waypointName: 'Niedergang-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [1, 0],
      intervalHours: 3,
    },
    lootHighlights: ['Kristall-Drachentruhe', 'Gepulste Drachenit-Blöcke', 'Kristallisierte Drachen-Fragmente'],
    tactics: 'Nutze Mörser und Sprungkissen für Luftbomben. Wenn die Trotzleiste (Breakbar) erscheint, sofort alle Betäubungen einsetzen!',
    iconType: 'dragon',
  },
  {
    id: 'modniir-ulgoth',
    name: 'Modniir Ulgoth',
    nameEn: 'Modniir Ulgoth',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Harathi-Hinterland',
    level: 43,
    waypoint: '[&BLAAAAA=]',
    waypointName: 'Königssteige-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [1, 30],
      intervalHours: 3,
    },
    lootHighlights: ['Ulgoths Kriegstruhe', 'Zentauren-Vorräte', 'Große Mengen T4-T5 Leder'],
    tactics: 'Schlage die Zentauren-Camps Schritt für Schritt zurück. Im Kriegslager Ulgoth und seinen beschworenen Erdelementar trennen.',
    iconType: 'sword',
  },
  {
    id: 'inquest-golem',
    name: 'Inquestur-Golem Typ II',
    nameEn: 'Inquest Golem Mark II',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Mahlstromgipfel',
    level: 68,
    waypoint: '[&BNQCAAA=]',
    waypointName: 'Alter Ool-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'repeat',
      start: [2, 0],
      intervalHours: 3,
    },
    lootHighlights: ['Inquestur-Prototyp-Kiste', 'Matrix-Kerne', 'Aufgeladene Kerne & Magnetsteine'],
    tactics: 'Verlasse sofort die elektrifizierten Bodenplatten! Elektrische Entladungen werfen um und verursachen enormen Schaden.',
    iconType: 'golem',
  },
  {
    id: 'claw-of-jormag',
    name: 'Klaue von Jormag',
    nameEn: 'Claw of Jormag',
    category: 'core',
    categoryLabel: 'Core Weltboss',
    zone: 'Eisklamm-Sunde',
    level: 80,
    waypoint: '[&BHoCAAA=]',
    waypointName: 'Erdbeben-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [2, 30],
      intervalHours: 3,
    },
    lootHighlights: ['Gletscher-Truhe', 'Eisbrut-Verderbnis-Fragmente', 'Seltene Sigille & Runen'],
    tactics: 'Phase 1: Schutzwand aus Eis mit Flammenwerfern/Sprengstoff zerstören. Phase 2: Bombenträger-Golems zur betäubten Klaue eskortieren.',
    iconType: 'dragon',
  },

  // ==========================================
  // HARDCORE WELTBOSSE
  // ==========================================
  {
    id: 'tequatl',
    name: 'Tequatl der Sonnenlose',
    nameEn: 'Tequatl the Sunless',
    category: 'hardcore',
    categoryLabel: 'Hardcore Großboss',
    zone: 'Funkenschwärmersumpf',
    level: 65,
    waypoint: '[&BNwCAAA=]',
    waypointName: 'Splitterküsten-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'fixed',
      times: [
        [0, 0],
        [3, 0],
        [7, 0],
        [11, 30],
        [16, 0],
        [19, 0],
      ],
    },
    lootHighlights: ['Tequatls Schatzkiste', 'Aufgestiegene Sonnenlose Waffen', 'Mächtiges Drachenit-Erz'],
    tactics: 'Hütet die Hylek-Geschütze (Finger säubern, Schilde brechen, Büffs verteilen). Springt über die Schockwellen bei Tequats Stampfer!',
    iconType: 'dragon',
  },
  {
    id: 'karka-queen',
    name: 'Karka-Königin',
    nameEn: 'Karka Queen',
    category: 'hardcore',
    categoryLabel: 'Hardcore Großboss',
    zone: 'Südlicht-Bucht',
    level: 80,
    waypoint: '[&BNUGAAA=]',
    waypointName: 'Kielbruch-Wegmarke',
    durationMinutes: 15,
    schedule: {
      type: 'fixed',
      times: [
        [2, 0],
        [6, 0],
        [10, 30],
        [15, 0],
        [18, 0],
        [23, 0],
      ],
    },
    lootHighlights: ['Karka-Königin-Truhe', 'Wertvolle Karka-Panzer', 'Passiflora & T6-Blut'],
    tactics: 'Sammle siedende Karka-Eier auf und wirf sie auf die Königin, um ihre undurchdringliche Panzerung zu schmelzen.',
    iconType: 'karka',
  },
  {
    id: 'triple-trouble',
    name: 'Dreiköpfiger Tropischer Wurm',
    nameEn: 'Triple Trouble (Great Jungle Wurm)',
    category: 'hardcore',
    categoryLabel: 'Hardcore Großboss',
    zone: 'Blutstrom-Küste',
    level: 55,
    waypoint: '[&BKoBAAA=]',
    waypointName: 'Rebhuhn-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'fixed',
      times: [
        [1, 0],
        [4, 0],
        [8, 0],
        [12, 30],
        [17, 0],
        [20, 0],
      ],
    },
    lootHighlights: ['Große Wurmtruhe', 'Aufgestiegene Rüstungstruhen', 'Seltene Dreiköpfige Trophäen'],
    tactics: 'Erfordert 3 organisierte Kartengruppen (Bernstein, Kobalt, Purpur). Alle drei Köpfe müssen innerhalb von 60 Sek. fallen!',
    iconType: 'wurm',
  },

  // ==========================================
  // HEART OF THORNS (HoT) METAS
  // ==========================================
  {
    id: 'tarir-octovine',
    name: 'Angriff auf Tarir (Octovine)',
    nameEn: 'Battle in Tarir (Octovine)',
    category: 'hot',
    categoryLabel: 'HoT Meta-Event',
    zone: 'Güldener Talkessel',
    level: 80,
    waypoint: '[&BNYHAAA=]',
    waypointName: 'Vergessene-Stadt-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [1, 0],
      intervalHours: 2,
    },
    lootHighlights: ['Große Erhabenen-Schatzkammer', 'Aurillium-Währung', 'Massenhaft Ektoplasmakugeln & Gelbe Ausrüstung'],
    tactics: 'Vier Tore (Nord, Süd, Ost, West) müssen gleichzeitig die Octovine-Reben zerstören. Koordination über Kartenchat!',
    iconType: 'crystal',
  },
  {
    id: 'chak-gerent',
    name: 'Chak-Gerent (Ley-Linien-Zusammenfluss)',
    nameEn: 'Chak Gerent (Tangled Depths)',
    category: 'hot',
    categoryLabel: 'HoT Meta-Event',
    zone: 'Verschlungene Tiefen',
    level: 80,
    waypoint: '[&BPUHAAA=]',
    waypointName: 'Zusammenfluss-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 30],
      intervalHours: 2,
    },
    lootHighlights: ['Chak-Eiersack (Extrem wertvoll!)', 'Ley-Linien-Funken', 'HoT-Schlüssel & Truhen'],
    tactics: 'Kanonen mit Energie füllen, Sporen detonieren und den Vormarsch des Gerents in allen vier Gängen stoppen.',
    iconType: 'karka',
  },
  {
    id: 'verdant-brink-night',
    name: 'Grasgrüne Schwelle: Nachtbosse',
    nameEn: 'Verdant Brink: Night Bosses',
    category: 'hot',
    categoryLabel: 'HoT Meta-Event',
    zone: 'Grasgrüne Schwelle',
    level: 80,
    waypoint: '[&BO8HAAA=]',
    waypointName: 'Pakt-Lager-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 10],
      intervalHours: 2,
    },
    lootHighlights: ['Luftschiff-Fracht', 'Geflügelte Helme & Rüstung', 'Pakt-Krähen-Belohnungen'],
    tactics: 'Über Nacht alle fünf Champions in den Baumkronen bezwingen, um Stufe 4 für maximale Beute zu erreichen.',
    iconType: 'airship',
  },
  {
    id: 'dragons-stand',
    name: 'Widerstand des Drachen (Mordremoth)',
    nameEn: "Dragon's Stand (Mouth of Mordremoth)",
    category: 'hot',
    categoryLabel: 'HoT Meta-Event',
    zone: 'Widerstand des Drachen',
    level: 80,
    waypoint: '[&BBAIAAA=]',
    waypointName: 'Pakt-Basislager-Wegmarke',
    durationMinutes: 35,
    schedule: {
      type: 'repeat',
      start: [1, 30],
      intervalHours: 2,
    },
    lootHighlights: ['Mund von Mordremoth Kiste', 'Kristalline Erze', 'Noxious Pods & Rezepte'],
    tactics: 'Drei Pfade rücken gleichzeitig vor. Auf den Inseln Gleiter nutzen und die Blüten zerfetzen.',
    iconType: 'dragon',
  },

  // ==========================================
  // PATH OF FIRE (PoF) METAS
  // ==========================================
  {
    id: 'choya-pinata',
    name: 'Kasino-Blitz & Choya-Piñata',
    nameEn: 'Casino Blitz & Choya Pinata',
    category: 'pof',
    categoryLabel: 'PoF Meta-Event',
    zone: 'Kristall-Oase',
    level: 80,
    waypoint: '[&BLsKAAA=]',
    waypointName: 'Amnoon-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 20],
      intervalHours: 2,
    },
    lootHighlights: ['Festliche Choya-Piñata-Infusion (>8.000g)', 'Kasino-Münzen', 'Wüstenschätze'],
    tactics: 'Münzen im Kasino-Rennen einsammeln, danach die Choya-Piñata mit Choya-Prügeln durch Amnoon treiben!',
    iconType: 'choya',
  },
  {
    id: 'maws-of-torment',
    name: 'Schlund der Qualen',
    nameEn: 'Maws of Torment (The Desolation)',
    category: 'pof',
    categoryLabel: 'PoF Meta-Event',
    zone: 'Das Ödland',
    level: 80,
    waypoint: '[&BKMKAAA=]',
    waypointName: 'Dunkelstrom-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [1, 0],
      intervalHours: 2,
    },
    lootHighlights: ['Tormentierte Truhe', 'Vergessene Grabschätze', 'Geschmiedeten-Rüstung'],
    tactics: 'Belagere das Portal zur Unterwelt, eskortiere die Belagerungsmaschinen und besiege die Dämonen-Generäle.',
    iconType: 'portal',
  },
  {
    id: 'serpents-ire',
    name: "Schlangenüberfall (Serpent's Ire)",
    nameEn: "Serpent's Ire (Domain of Vabbi)",
    category: 'pof',
    categoryLabel: 'PoF Meta-Event',
    zone: 'Domäne Vabbi',
    level: 80,
    waypoint: '[&BO0KAAA=]',
    waypointName: 'Vehtendi-Akademie-Wegmarke',
    durationMinutes: 25,
    schedule: {
      type: 'repeat',
      start: [0, 30],
      intervalHours: 2,
    },
    lootHighlights: ['Große Vabbi-Schatzkiste', 'Pulsierende Verbrannte Magie', 'Seltene Wüstenornamente'],
    tactics: 'Erfordert CC-Koordination! Die Verheerten Branddrachen brechen und die Zeugen von Ysshi Hessani eliminieren.',
    iconType: 'shield',
  },

  // ==========================================
  // LIVING WORLD / END OF DRAGONS (EoD) & SOTO
  // ==========================================
  {
    id: 'dragonstorm',
    name: 'Drachensturm (Jormag & Primordus)',
    nameEn: 'Dragonstorm (Eye of the North)',
    category: 'eod',
    categoryLabel: 'Living World Boss',
    zone: 'Auge des Nordens',
    level: 80,
    waypoint: '[&BAkMAAA=]',
    waypointName: 'Auge des Nordens-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [1, 0],
      intervalHours: 2,
    },
    lootHighlights: ['Erinnerungen an Aurene', 'Drachenwaffen-Kisten', 'Tyrianische Verteidigungssiegel'],
    tactics: 'Aurenes Prismen aufladen, Frost- und Feuer-Champions abwehren und beide Altdrachen besiegen.',
    iconType: 'dragon',
  },
  {
    id: 'drakkar',
    name: 'Drakkar der Eisbrut',
    nameEn: 'Drakkar (Bjora Marches)',
    category: 'eod',
    categoryLabel: 'Living World Boss',
    zone: 'Bjora-Sümpfe',
    level: 80,
    waypoint: '[&BDkMAAA=]',
    waypointName: 'Stillwasser-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 5],
      intervalHours: 2,
    },
    lootHighlights: ['Drakkars Eistruhe', 'Geister-der-Wildnis-Segen', 'Aufgestiegene Eisbrut-Ausrüstung'],
    tactics: 'Raven-Schreine aktivieren, durch Geisterportale springen und Drakkar durch das Eis jagen.',
    iconType: 'dragon',
  },
  {
    id: 'aetherblade-assault',
    name: 'Ätherklingen-Angriff',
    nameEn: 'Aetherblade Assault (Seitung Province)',
    category: 'eod',
    categoryLabel: 'EoD Meta-Event',
    zone: 'Provinz Seitung',
    level: 80,
    waypoint: '[&BGUNAAA=]',
    waypointName: 'Seitung-Hafen-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [1, 30],
      intervalHours: 2,
    },
    lootHighlights: ['Kaiserliche Gunst', 'Schatzkisten der Kaiserin', 'Jade-Runenstein-Möglichkeit'],
    tactics: 'Schwere Ätherklingen-Luftschiffe bombardieren, Batterien deaktivieren und Renyak ausschalten.',
    iconType: 'airship',
  },
  {
    id: 'kaineng-blackout',
    name: 'Kaineng-Blackout (Neu-Kaineng)',
    nameEn: 'Kaineng Blackout (New Kaineng City)',
    category: 'eod',
    categoryLabel: 'EoD Meta-Event',
    zone: 'Neu-Kaineng',
    level: 80,
    waypoint: '[&BBkNAAA=]',
    waypointName: 'Gartenhöhen-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 0],
      intervalHours: 2,
    },
    lootHighlights: ['Kaineng-Versorgungsbehälter', 'Jade-Technologie-Fragmente', 'T6-Trophäen'],
    tactics: 'Stromausfall beheben, Befallene Ministeriums-Golems zerstören und den Jade-Reaktor sichern.',
    iconType: 'golem',
  },
  {
    id: 'gangs-of-echovald',
    name: 'Die Gangs von Echowald',
    nameEn: 'The Gangs of Echovald (Echovald Wilds)',
    category: 'eod',
    categoryLabel: 'EoD Meta-Event',
    zone: 'Echowald-Wildnis',
    level: 80,
    waypoint: '[&BO8MAAA=]',
    waypointName: 'Arboretum-Wegmarke',
    durationMinutes: 20,
    schedule: {
      type: 'repeat',
      start: [0, 30],
      intervalHours: 2,
    },
    lootHighlights: ['Jadebruderschaft-Vorräte', 'Krähen-Schmuggelgut', 'Alte Echowald-Schätze'],
    tactics: 'Schrottplatz gegen Angreifer verteidigen, Festung der Jadebruderschaft stürmen und Prototyp-Roboter zerlegen.',
    iconType: 'sword',
  },
  {
    id: 'dragons-end',
    name: 'Die Schlacht um das Drachen-Ende',
    nameEn: "The Battle for the Dragon's End",
    category: 'eod',
    categoryLabel: 'EoD Meta-Event',
    zone: 'Das Drachen-Ende',
    level: 80,
    waypoint: '[&BKIMAAA=]',
    waypointName: 'Vorbereitungslager-Wegmarke',
    durationMinutes: 30,
    schedule: {
      type: 'repeat',
      start: [1, 0],
      intervalHours: 2,
    },
    lootHighlights: ['Erinnerung an Soo-Won', 'Belagerungsschildkröten-Ei-Fortschritt', 'Legendäre Fragmente'],
    tactics: 'Höchste Koordination nötig: Alle 3 Schreine vorbereiten, Segnungen sammeln und Soo-Wons Verderbnis reinigen.',
    iconType: 'dragon',
  },
];

/**
 * Computes all upcoming and currently active World Events from reference time onwards.
 */
export function getEventSchedule(referenceDate: Date = new Date(), hoursAhead = 12): EventInstance[] {
  const instances: EventInstance[] = [];
  const refTime = referenceDate.getTime();
  const maxTime = refTime + hoursAhead * 60 * 60 * 1000;

  EVENTS.forEach((event) => {
    const candidateDays = [-1, 0, 1, 2];

    candidateDays.forEach((dayOffset) => {
      const baseDate = new Date(referenceDate);
      baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);

      if (event.schedule.type === 'fixed' && event.schedule.times) {
        event.schedule.times.forEach(([hour, minute]) => {
          const spawnDate = new Date(baseDate);
          spawnDate.setUTCHours(hour, minute, 0, 0);
          addCandidate(event, spawnDate, refTime, maxTime, instances);
        });
      } else if (event.schedule.type === 'repeat' && event.schedule.start && event.schedule.intervalHours) {
        const [startH, startM] = event.schedule.start;
        const interval = event.schedule.intervalHours;

        for (let h = startH; h < 24; h += interval) {
          const spawnDate = new Date(baseDate);
          spawnDate.setUTCHours(h, startM, 0, 0);
          addCandidate(event, spawnDate, refTime, maxTime, instances);
        }
      }
    });
  });

  // Sort by startTime ascending
  instances.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Deduplicate identical occurrences
  const uniqueInstances: EventInstance[] = [];
  const seenKeys = new Set<string>();

  for (const inst of instances) {
    const key = `${inst.event.id}_${inst.startTime.getTime()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueInstances.push(inst);
    }
  }

  return uniqueInstances;
}

function addCandidate(
  event: WorldEvent,
  spawnDate: Date,
  refTime: number,
  maxTime: number,
  output: EventInstance[]
) {
  const spawnTime = spawnDate.getTime();
  const endTime = spawnTime + event.durationMinutes * 60 * 1000;

  // We are interested in events that either ended recently (still active) or will start before maxTime
  if (endTime >= refTime && spawnTime <= maxTime) {
    const isActive = spawnTime <= refTime && refTime <= endTime;
    const startsInSeconds = Math.max(0, Math.floor((spawnTime - refTime) / 1000));
    const endsInSeconds = Math.max(0, Math.floor((endTime - refTime) / 1000));

    const eventWithAchievements: WorldEvent = {
      ...event,
      achievements: event.achievements || getAchievementsForEvent(event.id),
    };

    output.push({
      event: eventWithAchievements,
      startTime: spawnDate,
      endTime: new Date(endTime),
      isActive,
      startsInSeconds,
      endsInSeconds,
    });
  }
}

/**
 * Format remaining seconds into clean German countdown: e.g. "04m 12s", "1h 15m"
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00m 00s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  }
  return `${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
}

/**
 * Format short countdown for minimal space: e.g. "4m" or "1h"
 */
export function formatShortCountdown(seconds: number): string {
  if (seconds <= 0) return 'Jetzt';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Format local German clock time: e.g. "20:15 Uhr"
 */
export function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' Uhr';
}

/**
 * Generates the German chat announcement string to paste directly into Guild Wars 2:
 * User requirement: "where you can like just click and it sends Waypoint Tag + Remaining Time till event start/runs, but in german"
 */
export function formatGermanCallout(inst: EventInstance, template: MessageTemplateType = 'standard'): string {
  const { waypoint, name, zone, categoryLabel } = inst.event;

  const timeString = inst.isActive
    ? `Jetzt aktiv! (Restzeit: ${formatCountdown(inst.endsInSeconds)})`
    : `startet in ${formatCountdown(inst.startsInSeconds)}`;

  switch (template) {
    case 'compact':
      return `${waypoint} ${name} (${timeString})`;
    case 'waypointOnly':
      return waypoint;
    case 'detailed':
      return `${waypoint} [${categoryLabel}] ${name} (${zone}) - ${timeString}`;
    case 'standard':
    default:
      return `${waypoint} ${name} - ${timeString}`;
  }
}
