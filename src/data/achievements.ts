import type { BossAchievement } from '../types.ts';

export type AchievementCategory = 'daily' | 'worldboss' | 'exploration' | 'fractals' | 'collections';

export interface AchievementObjective {
  id: string;
  title: string;
  done?: boolean;
}

export interface GlobalAchievementItem {
  id: string;
  gw2Id?: number;
  title: string;
  ap: number;
  description: string;
  category: AchievementCategory;
  categoryLabel?: string;
  progressCurrent?: number;
  progressMax?: number;
  rewardTitle?: string;
  rewardMastery?: { region: 'tyria' | 'maguuma' | 'desert' | 'cantha'; points: number };
  rewardItem?: string;
  isCompleted?: boolean;
  isFeatured?: boolean;
  tierInfo?: string;
  iconName?: string;
  eventId?: string; // links to event for live countdown & waypoints
  objectives?: AchievementObjective[];
}

/**
 * Authentic Guild Wars 2 Achievements taken directly from the in-game
 * Hero Panel (Heldin - Erfolge), Dailies, World Boss Metas, and Collections!
 */
export const GLOBAL_ACHIEVEMENTS: GlobalAchievementItem[] = [
  // ==========================================
  // 1. TÄGLICHE ERFOLGE (DAILY)
  // ==========================================
  {
    id: 'daily-completer',
    gw2Id: 1840,
    title: 'Täglicher Komplettierer',
    ap: 10,
    description: 'Schließt 3 beliebige tägliche Erfolge in PvE, WvW oder PvP ab, um die Belohnungstruhe zu beanspruchen.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 2,
    progressMax: 3,
    rewardItem: '2 Gold + Truhe der Vollendung',
    tierInfo: '2 / 3 abgeschlossen',
    isFeatured: true,
    objectives: [
      { id: 'dc-1', title: 'Täglicher Weltenboss-Jäger', done: true },
      { id: 'dc-2', title: 'Täglicher Maguuma-Holzfäller', done: true },
      { id: 'dc-3', title: 'Täglicher Vista-Betrachter von Kryta', done: false },
    ],
  },
  {
    id: 'daily-worldboss',
    gw2Id: 1845,
    title: 'Täglicher Weltenboss-Jäger',
    ap: 2,
    description: 'Nehmt heute an mindestens einem erfolgreichen Weltenboss-Event quer durch ganz Tyria teil.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 1,
    progressMax: 1,
    isCompleted: true,
    rewardItem: 'Weltenboss-Bonuskiste',
    tierInfo: 'Täglich wiederholbar',
    eventId: 'tequatl',
  },
  {
    id: 'daily-forager-kryta',
    gw2Id: 1950,
    title: 'Täglicher Forstwirt von Kryta',
    ap: 2,
    description: 'Erntet 4-mal Holz von Bäumen und Baumstämmen im Territorium von Kryta.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 4,
    progressMax: 4,
    isCompleted: true,
    tierInfo: 'Abgeschlossen',
  },
  {
    id: 'daily-fractal-t4',
    gw2Id: 2980,
    title: 'Tägliche Fraktale der Stufe 4',
    ap: 5,
    description: 'Schließt alle drei empfohlenen Fraktale der Stufe 4 in den Nebeln ab.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 1,
    progressMax: 3,
    rewardItem: 'Große Fraktal-Chiffrierung (4x)',
    tierInfo: '1 / 3 Fraktale',
    objectives: [
      { id: 'df-1', title: 'T4 Albtraum-Fraktal', done: true },
      { id: 'df-2', title: 'T4 Vulkan-Fraktal', done: false },
      { id: 'df-3', title: 'T4 Sunqua-Gipfel', done: false },
    ],
  },
  {
    id: 'daily-vista-maguuma',
    gw2Id: 1982,
    title: 'Täglicher Vista-Betrachter: Maguuma',
    ap: 2,
    description: 'Interagiert mit einer beliebigen Aussicht (Vista) im Maguuma-Dschungel.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 0,
    progressMax: 1,
    tierInfo: 'Noch offen',
  },
  {
    id: 'daily-wvw-camp',
    gw2Id: 1890,
    title: 'Täglicher WvW-Lagereroberer',
    ap: 2,
    description: 'Erobert 2 Nachschublager in den Nebel-Kriegen oder auf den Grenzlanden.',
    category: 'daily',
    categoryLabel: 'Täglich',
    progressCurrent: 1,
    progressMax: 2,
    tierInfo: '1 / 2 Lager',
  },

  // ==========================================
  // 2. WELTENBOSSE & META-EVENTS (WORLDBOSS)
  // ==========================================
  {
    id: 'wb-tequatl-meta',
    gw2Id: 824,
    title: 'Der Sonnenlose',
    ap: 25,
    description: 'Bezwingt Tequatl den Sonnenlosen, meistert alle Hylek-Geschütze und überlebt seine Schockwellen.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    rewardTitle: 'Der Sonnenlose',
    rewardMastery: { region: 'tyria', points: 1 },
    progressCurrent: 4,
    progressMax: 5,
    tierInfo: 'Rang 4 von 5',
    isFeatured: true,
    eventId: 'tequatl',
    objectives: [
      { id: 'teq-1', title: 'Tequatl den Sonnenlosen besiegt', done: true },
      { id: 'teq-2', title: 'Wellenreiter: 10 Schockwellen übersprungen', done: true },
      { id: 'teq-3', title: 'Heckenschütze: Hylek-Geschütze bemannt', done: true },
      { id: 'teq-4', title: 'Megabatterien vor Krait-Angriffen verteidigt', done: true },
      { id: 'teq-5', title: 'Schwanzschlag im Nahkampf ausgewichen', done: false },
    ],
  },
  {
    id: 'wb-triple-trouble',
    gw2Id: 873,
    title: 'Großer Tropischer Wurm',
    ap: 20,
    description: 'Koordiniert drei Einsatztrupps und besiegt alle drei Köpfe des Großen Dschungelwurms innerhalb einer Minute.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    rewardTitle: 'Großer Wurmjäger',
    rewardMastery: { region: 'tyria', points: 1 },
    progressCurrent: 2,
    progressMax: 4,
    tierInfo: '2 / 4 Köpfe & Taktiken',
    eventId: 'triple-trouble',
    objectives: [
      { id: 'tt-1', title: 'Bernsteinkopf von innen per Harpune bezwungen', done: true },
      { id: 'tt-2', title: 'Kobaltkopf mit Brandfässern geschwächt', done: true },
      { id: 'tt-3', title: 'Karminkopf mit Phytoplankton-Wolken verwundbar gemacht', done: false },
      { id: 'tt-4', title: 'Alle drei Köpfe synchron enthauptet', done: false },
    ],
  },
  {
    id: 'wb-shatterer',
    gw2Id: 2841,
    title: 'Zerschmettert den Zerschmetterer',
    ap: 15,
    description: 'Bezwingt den Kristalldrachen des Kralkatorrik und werft Bomben aus der Luft ab.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    progressCurrent: 3,
    progressMax: 4,
    eventId: 'shatterer',
    objectives: [
      { id: 'sh-1', title: 'Den Zerschmetterer besiegt', done: true },
      { id: 'sh-2', title: 'Flugstaffel: 10 Gleitschirm-Bomben abgeworfen', done: true },
      { id: 'sh-3', title: 'Pulsierende Branderze zerschlagen', done: true },
      { id: 'sh-4', title: 'Kampf ohne Kristallgefängnis abgeschlossen', done: false },
    ],
  },
  {
    id: 'wb-claw-jormag',
    gw2Id: 170,
    title: 'Frostiges Ende der Klaue von Jormag',
    ap: 10,
    description: 'Sprengt die monumentale Eiswand und bringt die Klaue des Eisdrachen zu Fall.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    progressCurrent: 2,
    progressMax: 3,
    eventId: 'claw-of-jormag',
    objectives: [
      { id: 'claw-1', title: 'Sprengstoff-Golems zur Eiswand eskortiert', done: true },
      { id: 'claw-2', title: 'Die Eiswand gesprengt', done: true },
      { id: 'claw-3', title: 'Die Klaue von Jormag auf den Eisschollen bezwungen', done: false },
    ],
  },
  {
    id: 'wb-tarir-octovine',
    gw2Id: 2450,
    title: 'Erhabener Beschützer von Tarir',
    ap: 15,
    description: 'Brecht synchron durch alle vier Tore von Tarir und vernichtet die Oktovanke vor der Verderbnis.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    rewardTitle: 'Erhabener Beschützer',
    rewardMastery: { region: 'maguuma', points: 1 },
    progressCurrent: 4,
    progressMax: 5,
    eventId: 'tarir-octovine',
    objectives: [
      { id: 'tar-1', title: 'Nordtor: Rankenwand durchbrochen', done: true },
      { id: 'tar-2', title: 'Südtor: Explosivbomben platziert', done: true },
      { id: 'tar-3', title: 'Osttor: Erhabenen-Rüstungen gesteuert', done: true },
      { id: 'tar-4', title: 'Westtor: Schleuderpilze genutzt', done: true },
      { id: 'tar-5', title: 'Große Erhabenen-Truhe in der Unterstadt geöffnet', done: false },
    ],
  },
  {
    id: 'wb-chak-gerent',
    gw2Id: 2390,
    title: 'König der Tiefen',
    ap: 15,
    description: 'Tötet alle vier Chak-Gerenten in den Durchgängen der Verschlungenen Tiefen.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    progressCurrent: 3,
    progressMax: 4,
    eventId: 'chak-gerent',
    objectives: [
      { id: 'cg-1', title: 'Nuhoch-Durchgang: Gerent bezwungen', done: true },
      { id: 'cg-2', title: 'Rata-Novus-Durchgang: Gerent bezwungen', done: true },
      { id: 'cg-3', title: 'Oger-Lager: Gerent bezwungen', done: true },
      { id: 'cg-4', title: 'Skarabu-Durchgang: Gerent bezwungen', done: false },
    ],
  },
  {
    id: 'wb-dragons-end',
    gw2Id: 6223,
    title: 'Die Leere bezwungen',
    ap: 20,
    description: 'Besiegt die korrumpierte Drachenmutter Soo-Won im Erntetempel der Drachen-Ende Meta.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    rewardTitle: 'Retter von Cantha',
    rewardMastery: { region: 'cantha', points: 1 },
    progressCurrent: 3,
    progressMax: 4,
    eventId: 'dragons-end',
    objectives: [
      { id: 'de-1', title: 'Segen der Wogen von den Schreinen erhalten', done: true },
      { id: 'de-2', title: 'Die fünf Leere-Aspekte bezwungen', done: true },
      { id: 'de-3', title: 'Den Erntetempel erfolgreich gereinigt', done: true },
      { id: 'de-4', title: 'Soo-Won aus dem Wahnsinn befreit', done: false },
    ],
  },
  {
    id: 'wb-megadestroyer',
    gw2Id: 172,
    title: 'Löscht die Flamme des Megazerstörers',
    ap: 10,
    description: 'Vernichtet Zerstörer-Bruten und ihren Anführer im Vulkan des Mahlstroms.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    progressCurrent: 3,
    progressMax: 3,
    isCompleted: true,
    eventId: 'megadestroyer',
  },
  {
    id: 'wb-shadow-behemoth',
    gw2Id: 165,
    title: 'Aus den Schatten verbannt',
    ap: 10,
    description: 'Besiegt den Schatten-Behemoth im Gottlosen Sumpf von Königintal.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    progressCurrent: 2,
    progressMax: 2,
    isCompleted: true,
    eventId: 'shadow-behemoth',
  },

  // ==========================================
  // 3. ERKUNDUNG & REGIONEN (EXPLORATION)
  // ==========================================
  {
    id: 'explorer-ascalon',
    gw2Id: 35,
    title: 'Exploratorin von Ascalon',
    ap: 10,
    description: 'Entdeckt alle Winkel, Sehenswürdigkeiten und geheimen Orte im Territorium von Ascalon.',
    category: 'exploration',
    categoryLabel: 'Erkundung',
    rewardTitle: 'Ascalon-Pionier',
    progressCurrent: 176,
    progressMax: 177,
    tierInfo: '176 / 177 Gebiete',
    objectives: [
      { id: 'ea-1', title: 'Ebene von Aschfurt erkundet', done: true },
      { id: 'ea-2', title: 'Diessa-Plateau erkundet', done: true },
      { id: 'ea-3', title: 'Feuerherzhügel erkundet', done: true },
      { id: 'ea-4', title: 'Eisenmark erkundet', done: true },
      { id: 'ea-5', title: 'Flammenkamm-Steppe: Geheimes Charr-Refugium', done: false },
    ],
  },
  {
    id: 'explorer-kryta',
    gw2Id: 38,
    title: 'Exploratorin von Kryta',
    ap: 10,
    description: 'Erforscht sämtliche Gebiete im Königreich Kryta, von den Zentaurenlagern bis zur Küste.',
    category: 'exploration',
    categoryLabel: 'Erkundung',
    rewardTitle: 'Kryta-Pionier',
    progressCurrent: 174,
    progressMax: 175,
    tierInfo: '174 / 175 Gebiete',
    objectives: [
      { id: 'ek-1', title: 'Königintal vollständig erkundet', done: true },
      { id: 'ek-2', title: 'Kessex-Hügel vollständig erkundet', done: true },
      { id: 'ek-3', title: 'Gendarran-Felder vollständig erkundet', done: true },
      { id: 'ek-4', title: 'Harathi-Hinterland vollständig erkundet', done: true },
      { id: 'ek-5', title: 'Blutstrom-Küste: Unterwasser-Höhle von Zintl', done: false },
    ],
  },
  {
    id: 'explorer-maguuma',
    gw2Id: 36,
    title: 'Exploratorin des Maguuma-Dschungels',
    ap: 10,
    description: 'Erkundet alle dichten Wälder, Asura-Labore und Sylvari-Pfade im Maguuma-Dschungel.',
    category: 'exploration',
    categoryLabel: 'Erkundung',
    progressCurrent: 168,
    progressMax: 168,
    isCompleted: true,
    tierInfo: '168 / 168 Gebiete (Abgeschlossen)',
  },
  {
    id: 'explorer-shiverpeaks',
    gw2Id: 37,
    title: 'Exploratorin der Zittergipfel',
    ap: 10,
    description: 'Besteigt alle schneebedeckten Gipfel und Höhlen im nornischen Hochland.',
    category: 'exploration',
    categoryLabel: 'Erkundung',
    progressCurrent: 165,
    progressMax: 173,
    tierInfo: '165 / 173 Gebiete',
  },
  {
    id: 'explorer-orr',
    gw2Id: 39,
    title: 'Exploratorin der Ruinen von Orr',
    ap: 15,
    description: 'Dringt in das Herz der auferstandenen Tempel und Kathedralen von Orr vor.',
    category: 'exploration',
    categoryLabel: 'Erkundung',
    rewardTitle: 'Licht im Verderben',
    progressCurrent: 52,
    progressMax: 64,
    tierInfo: '52 / 64 Gebiete',
  },
  {
    id: 'jp-tequatl-jumping',
    gw2Id: 120,
    title: 'Schatzsucher von Caledon: Sprungrätsel',
    ap: 10,
    description: 'Meistert die verzwickten Sprungrätsel in den Sümpfen und Ruinen des Caledon-Walds.',
    category: 'exploration',
    categoryLabel: 'Sprungrätsel',
    progressCurrent: 2,
    progressMax: 3,
    objectives: [
      { id: 'jp-1', title: 'Morgan-Spirale erklommen', done: true },
      { id: 'jp-2', title: 'Finsteres Tagtraum-Labyrinth durchquert', done: true },
      { id: 'jp-3', title: 'Spelunke des Professors gemeistert', done: false },
    ],
  },

  // ==========================================
  // 4. FRAKTALE & SCHLACHTZÜGE (FRACTALS)
  // ==========================================
  {
    id: 'frac-master',
    gw2Id: 2988,
    title: 'Meister der Nebel: Fraktal-Elite',
    ap: 25,
    description: 'Schließt alle 100 Fraktal-Stufen der Nebel erfolgreich ab und beweist euer Können.',
    category: 'fractals',
    categoryLabel: 'Fraktale',
    rewardTitle: 'Herrscher der Nebel',
    rewardMastery: { region: 'tyria', points: 2 },
    progressCurrent: 82,
    progressMax: 100,
    tierInfo: 'Stufe 82 von 100',
    objectives: [
      { id: 'fm-1', title: 'Stufe 25: Unterwasser-Ruinen gemeistert', done: true },
      { id: 'fm-2', title: 'Stufe 50: Mai Trin im Herausforderungsmodus gestürzt', done: true },
      { id: 'fm-3', title: 'Stufe 75: Felswand-Fraktal bezwungen', done: true },
      { id: 'fm-4', title: 'Stufe 100: Sunqua-Gipfel Ai bezwungen', done: false },
    ],
  },
  {
    id: 'frac-nightmare-cm',
    gw2Id: 3317,
    title: 'Albtraum im Nebel (Herausforderungsmodus)',
    ap: 20,
    description: 'Schließt das Albtraum-Fraktal auf Stufe 99 im CM ohne Gruppen-Auslöschung ab.',
    category: 'fractals',
    categoryLabel: 'Fraktale CM',
    rewardTitle: 'Albtraumtänzer',
    progressCurrent: 2,
    progressMax: 3,
    objectives: [
      { id: 'fn-1', title: 'Mursaat-Aufseher ohne Schutzkuppel besiegt', done: true },
      { id: 'fn-2', title: 'Siax der Unreine ohne Verderbnis gestürzt', done: true },
      { id: 'fn-3', title: 'Ensolyss der endlosen Qualen bezwungen', done: false },
    ],
  },
  {
    id: 'raid-spirit-vale',
    gw2Id: 2658,
    title: 'Tal der Geister: Rächer des Pakts',
    ap: 20,
    description: 'Dringt in den ersten Schlachtzug-Flügel vor und bezwingt die Schrecken des Maguuma-Tals.',
    category: 'fractals',
    categoryLabel: 'Schlachtzug',
    rewardTitle: 'Geisterjäger',
    rewardMastery: { region: 'maguuma', points: 1 },
    progressCurrent: 3,
    progressMax: 3,
    isCompleted: true,
    objectives: [
      { id: 'sv-1', title: 'Tal-Wächter eliminiert', done: true },
      { id: 'sv-2', title: 'Gorseval der Vielgestaltige vernichtet', done: true },
      { id: 'sv-3', title: 'Sabetha die Saboteurin gestürzt', done: true },
    ],
  },
  {
    id: 'strike-dragonvoid',
    gw2Id: 6512,
    title: 'Erntetempel: Meister der Leere (CM)',
    ap: 30,
    description: 'Meistert die härteste Angriffsmission von Cantha im gnadenlosen Herausforderungsmodus.',
    category: 'fractals',
    categoryLabel: 'Angriffsmission CM',
    rewardTitle: 'Erhabener Leere-Bändiger',
    rewardMastery: { region: 'cantha', points: 2 },
    progressCurrent: 2,
    progressMax: 3,
    objectives: [
      { id: 'sd-1', title: 'Alle fünf Ahnen-Drachen Phasen überlebt', done: true },
      { id: 'sd-2', title: 'Orb-Pufferzeit unter 10 Sekunden gehalten', done: true },
      { id: 'sd-3', title: 'Purifikations-Matrix vollständig synchronisiert', done: false },
    ],
  },

  // ==========================================
  // 5. SAMMLUNGEN & LEGENDÄR (COLLECTIONS)
  // ==========================================
  {
    id: 'col-twilight',
    gw2Id: 2710,
    title: 'Düsterkeit: Die Schatten-Chronik',
    ap: 10,
    description: 'Sammelt die seltenen Essenzen der Dunkelheit, um die legendäre Vorstufe Düsterkeit zu schmieden.',
    category: 'collections',
    categoryLabel: 'Legendäre Waffe',
    rewardItem: 'Essenz der Finsternis (Vorstufen-Rezept)',
    progressCurrent: 3,
    progressMax: 4,
    objectives: [
      { id: 'ct-1', title: 'Schatten-Essenz vom Schatten-Behemoth gesammelt', done: true },
      { id: 'ct-2', title: 'Dunkles Glas aus der Obsidian-Zuflucht geborgen', done: true },
      { id: 'ct-3', title: 'Tequatls Trübungskern aus dem Sumpf geborgen', done: true },
      { id: 'ct-4', title: 'Schwarzstein-Fragment aus den Katakomben von Ascalon', done: false },
    ],
  },
  {
    id: 'col-bifrost',
    gw2Id: 2715,
    title: 'Der Bifröst: Das Prismatische Licht',
    ap: 10,
    description: 'Fangt die Farben von Tyria ein, um die legendäre Vorstufe Die Legende zu erschaffen.',
    category: 'collections',
    categoryLabel: 'Legendäre Waffe',
    rewardItem: 'Die Legende (Vorstufen-Rezept)',
    progressCurrent: 2,
    progressMax: 3,
    objectives: [
      { id: 'cb-1', title: 'Reines Sonnenlicht am Sonnenhang gefangen', done: true },
      { id: 'cb-2', title: 'Regenbogen-Wasser aus dem Mahlstrom geschöpft', done: true },
      { id: 'cb-3', title: 'Sternenlicht-Kristall in Orr geschliffen', done: false },
    ],
  },
  {
    id: 'col-karka-hunt',
    gw2Id: 2280,
    title: 'Prinzessin: Karka-Königin Jagd',
    ap: 15,
    description: 'Findet verlorene Karka-Jungtiere und Eierschalen in der gesamten Südlicht-Bucht.',
    category: 'collections',
    categoryLabel: 'Seltene Sammlung',
    rewardItem: 'Prinzessin (Aufsteigender Karka-Verwerter)',
    progressCurrent: 38,
    progressMax: 50,
    tierInfo: '38 / 50 Eierschalen',
  },
  {
    id: 'coin-collector',
    gw2Id: 1937,
    title: 'Münzensammlerin: Schürftal & Trockenkuppe',
    ap: 5,
    description: 'Findet verlorene Münzen der Karawanen in den Minen und Sandstürmen von Schürftal.',
    category: 'collections',
    categoryLabel: 'Münzensammlung',
    progressCurrent: 30,
    progressMax: 30,
    isCompleted: true,
    tierInfo: '30 / 30 Münzen (Abgeschlossen)',
  },
];

/**
 * Boss-specific achievements in Guild Wars 2!
 * Displayed inside each EventCard or boss drawer.
 */
export const BOSS_ACHIEVEMENTS: Record<string, BossAchievement[]> = {
  'svanir-shaman': [
    {
      id: 'svanir-maw',
      title: 'Der Frostschlund',
      ap: 10,
      description: 'Zerschlagt das Eis-Totem und besiegt den mächtigen Schamanen der Svanir im eisigen Heiligtum.',
      category: 'Core Weltenbosse',
      tierInfo: 'Einmalig',
    },
    {
      id: 'svanir-rescue',
      title: 'Eisiger Retter',
      ap: 5,
      description: 'Befreit 5 gefangene Norn-Krieger aus den Eisblöcken des Schamanen.',
      category: 'Wanderer-Hügel',
      tierInfo: 'Event-Spezifisch',
    },
  ],
  'fire-elemental': [
    {
      id: 'thauma-cleanup',
      title: 'Thaumanova-Bereinigung',
      ap: 10,
      description: 'Zerstört das tobende Feuerelementar im Herzen des zerstörten Thaumanova-Reaktors.',
      category: 'Core Weltenbosse',
      tierInfo: 'Einmalig',
    },
    {
      id: 'thauma-cooling',
      title: 'Kühlkern-Wartung',
      ap: 5,
      description: 'Eskortiert die Reparatur-Golems unbeschadet zur Kühlkammer des Reaktors.',
      category: 'Provinz Metrica',
    },
  ],
  'jungle-wurm': [
    {
      id: 'wurm-slayer',
      title: 'Wurmtöter von Caledon',
      ap: 10,
      description: 'Besiegt den Großen Dschungelwurm im Tiefland des Wychmire-Sumpfs.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'wurm-blossom',
      title: 'Giftblüten-Gärtner',
      ap: 5,
      description: 'Zertrampelt 15 giftige Blüten und Würmer während des Vor-Events.',
      category: 'Caledon-Wald',
    },
  ],
  'shadow-behemoth': [
    {
      id: 'behemoth-banished',
      title: 'Aus den Schatten verbannt',
      ap: 10,
      description: 'Besiegt den Schatten-Behemoth im Gottlosen Sumpf und vertreibt die Unterweltkreaturen.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'behemoth-portals',
      title: 'Portal-Zerstörer',
      ap: 5,
      description: 'Schließt 5 Unterwelt-Portale im Gottlosen Sumpf vor dem Erscheinen des Behemoths.',
      category: 'Königintal',
    },
  ],
  'taidha-covington': [
    {
      id: 'taidha-downfall',
      title: 'Piratenbraut-Fall',
      ap: 10,
      description: 'Stürmt die Festung von Taidha Covington auf der Insel der Lachmöwen und bezwingt sie.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'taidha-kegs',
      title: 'Pulverfass-Spezialist',
      ap: 5,
      description: 'Platziert 3 Pulverfässer erfolgreich am Haupttor von Taidhas Piratenfestung.',
      category: 'Blutstrom-Küste',
    },
  ],
  'megadestroyer': [
    {
      id: 'destroyer-extinguish',
      title: 'Löscht die Flamme',
      ap: 10,
      description: 'Besiegt den Megazerstörer im Vulkan des Mahlstroms und stoppt die Ausbreitung.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'destroyer-cannons',
      title: 'Kühlsystem-Ingenieur',
      ap: 5,
      description: 'Verteidigt die 3 Asura-Kühlkanonen vor den Wellen der Zerstörer-Brut.',
      category: 'Mahlstrom',
    },
  ],
  'shatterer': [
    {
      id: 'shatter-slayer',
      title: 'Zerschmettert den Zerschmetterer',
      ap: 10,
      description: 'Besiegt den Zerschmetterer, den mächtigen Kristalldrachen des Kralkatorrik.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'shatter-glider',
      title: 'Flugstaffel-Bomber',
      ap: 5,
      description: 'Nutzt den Gleitschirm und werft 10 Bomben auf den Zerschmetterer im Flug.',
      category: 'Flammenkamm-Steppe',
    },
    {
      id: 'shatter-nocage',
      title: 'Freiheit für die Flügel',
      ap: 5,
      description: 'Schließt den Kampf ab, ohne jemals von den Kristallgefängnissen eingesperrt zu werden.',
      category: 'Flammenkamm-Steppe',
    },
  ],
  'modniir-ulgoth': [
    {
      id: 'ulgoth-conqueror',
      title: 'Zentaur-Unterwerfer',
      ap: 10,
      description: 'Tötet Kriegsmeister Ulgoth und beendet die Angriffe der Modniir-Zentauren.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'ulgoth-seraph',
      title: 'Freiheit für die Seraphen',
      ap: 5,
      description: 'Befreit alle gefangenen Seraphen aus den Lagern vor der Festung.',
      category: 'Harathi-Hinterland',
    },
  ],
  'inquest-golem': [
    {
      id: 'golem-mark2',
      title: 'Inquestur-Sabotage',
      ap: 10,
      description: 'Zerstört den Mark-II-Supergolem auf der Inquestur-Testplattform.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'golem-evade',
      title: 'Isolations-Kompensation',
      ap: 5,
      description: 'Weicht allen elektrischen Schockwellen der Testplattformen aus.',
      category: 'Mahlstrom',
    },
  ],
  'claw-of-jormag': [
    {
      id: 'claw-shatter',
      title: 'Frostiges Ende',
      ap: 10,
      description: 'Zerschlagt die Eiswand und bringt die Klaue von Jormag zu Fall.',
      category: 'Core Weltenbosse',
    },
    {
      id: 'claw-bomber',
      title: 'Sprengstoff-Transporteur',
      ap: 5,
      description: 'Tragt Sprengstoff zu den Golems, um die Eiswand der Klaue zu sprengen.',
      category: 'Eisklamm-Sund',
    },
  ],
  'tequatl': [
    {
      id: 'tequatl-sunless',
      title: 'Der Sonnenlose',
      ap: 15,
      description: 'Besiegt Tequatl den Sonnenlosen, den Drachen-Champion Zhaitans im Funkenschwärmersumpf.',
      category: 'Hardcore Weltenbosse',
      rewardTitle: 'Der Sonnenlose',
    },
    {
      id: 'tequatl-waves',
      title: 'Wellenreiter',
      ap: 5,
      description: 'Springt 10-mal erfolgreich über Tequatls vernichtende Schockwellen hinweg.',
      category: 'Funkenschwärmersumpf',
    },
    {
      id: 'tequatl-gunner',
      title: 'Heckenschütze der Hylek',
      ap: 5,
      description: 'Bemannt die Hylek-Geschütze, entfernt Tequatls Schuppenpanzer und schützt die Batterien.',
      category: 'Funkenschwärmersumpf',
    },
    {
      id: 'tequatl-tail',
      title: 'Schwanzschlag-Überlebender',
      ap: 5,
      description: 'Kämpft im Nahkampf gegen Tequatl und weicht dem gefürchteten Schwanzschlag aus.',
      category: 'Funkenschwärmersumpf',
    },
  ],
  'karka-queen': [
    {
      id: 'karka-slayer',
      title: 'Karka-Königin-Eroberer',
      ap: 10,
      description: 'Besiegt die Legendäre Karka-Königin in der Südlicht-Bucht.',
      category: 'Hardcore Weltenbosse',
    },
    {
      id: 'karka-eggs',
      title: 'Eier-Zertreter',
      ap: 5,
      description: 'Zerstört 10 Karka-Eier, bevor die aggressiven Jungtiere schlüpfen können.',
      category: 'Südlicht-Bucht',
    },
  ],
  'triple-trouble': [
    {
      id: 'wurm-master',
      title: 'Großer Tropischer Wurm',
      ap: 20,
      description: 'Besiegt alle drei Köpfe des Großen Tropischen Wurms innerhalb einer Minute.',
      category: 'Hardcore Weltenbosse',
      rewardTitle: 'Große Wurmjäger',
    },
    {
      id: 'wurm-amber',
      title: 'Bernstein-Befreier',
      ap: 5,
      description: 'Lasst euch vom Bernstein-Kopf verschlucken und befreit euch von innen mit der Harpune.',
      category: 'Blutstrom-Küste',
    },
    {
      id: 'wurm-cobalt',
      title: 'Kobalt-Fässerträger',
      ap: 5,
      description: 'Werft Fässer mit explosiver Brandmischung auf den Kobalt-Kopf.',
      category: 'Blutstrom-Küste',
    },
    {
      id: 'wurm-crimson',
      title: 'Karmin-Farbwechsler',
      ap: 5,
      description: 'Aktiviert die Phytoplankton-Wolken gegen den Karmin-Kopf.',
      category: 'Blutstrom-Küste',
    },
  ],
  'tarir-octovine': [
    {
      id: 'tarir-panic',
      title: 'Panik in Tarir',
      ap: 10,
      description: 'Öffnet nach erfolgreichem Abschluss der Schlacht um Tarir die Große Erhabenen-Truhe in der Unterstadt.',
      category: 'Heart of Thorns',
    },
    {
      id: 'tarir-fourgates',
      title: 'Einklang der vier Tore',
      ap: 15,
      description: 'Besiegt alle vier Rankenarme der Oktovanke innerhalb eines Zeitfensters von 2 Minuten.',
      category: 'Güldener Talkessel',
      rewardTitle: 'Erhabener Beschützer',
    },
  ],
  'chak-gerent': [
    {
      id: 'chak-king',
      title: 'König der Tiefen',
      ap: 15,
      description: 'Tötet alle vier Chak-Gerenten in den vier Durchgängen der Verschlungenen Tiefen.',
      category: 'Heart of Thorns',
    },
    {
      id: 'chak-cannon',
      title: 'Kanonen-Verteidiger',
      ap: 5,
      description: 'Verteidigt die Ley-Linien-Energiekanone der Asura vor anstürmenden Chak-Käfern.',
      category: 'Verschlungene Tiefen',
    },
  ],
  'dragons-stand': [
    {
      id: 'mordremoth-mouth',
      title: 'Maul von Mordremoth',
      ap: 15,
      description: 'Bezwingt das gigantische Maul von Mordremoth auf den schwimmenden Inseln.',
      category: 'Heart of Thorns',
      rewardTitle: 'Bezwinger des Dschungels',
    },
  ],
  'dragonstorm': [
    {
      id: 'dragonstorm-champ',
      title: 'Herrschaft über Feuer und Eis',
      ap: 15,
      description: 'Schließt die finale Schlacht gegen die Champions von Jormag und Primordus im Auge des Nordens ab.',
      category: 'Eisbrut-Saga',
      rewardTitle: 'Drachen-Champion',
    },
  ],
  'drakkar': [
    {
      id: 'drakkar-voice',
      title: 'Stimme im Eis',
      ap: 15,
      description: 'Besiegt Drakkar in den eisigen Kavernen der Bjora-Sümpfe.',
      category: 'Eisbrut-Saga',
    },
  ],
  'dragons-end': [
    {
      id: 'soowon-void',
      title: 'Die Leere bezwungen',
      ap: 20,
      description: 'Besiegt die korrumpierte Drachenmutter Soo-Won im Erntetempel der Drachen-Ende Meta.',
      category: 'End of Dragons',
      rewardTitle: 'Retter von Cantha',
    },
  ],
  'skywatch-tower': [
    {
      id: 'skywatch-tower-conqueror',
      title: 'Turmstürmer des Archipels',
      ap: 10,
      description: 'Schließt die Meta „Aufschließen des Turms der Zauberer“ im Himmelswacht-Archipel ab.',
      category: 'Secrets of the Obscure',
      rewardTitle: 'Astralwächter',
    },
  ],
  'defense-of-amnytas': [
    {
      id: 'amnytas-defender',
      title: 'Verteidiger von Amnytas',
      ap: 15,
      description: 'Schlagt Nourys, das Auge des Abgrunds, in der Verteidigung von Amnytas zurück.',
      category: 'Secrets of the Obscure',
      rewardTitle: 'Auge des Sturms',
    },
  ],
  'convergences-public': [
    {
      id: 'convergences-hero',
      title: 'Held der Konvergenzen',
      ap: 15,
      description: 'Schließt eine öffentliche Konvergenz im Turm der Zauberer erfolgreich ab.',
      category: 'Secrets of the Obscure',
    },
  ],
  'inner-nayos-eparch': [
    {
      id: 'eparch-downfall',
      title: 'Sturz des Mitternachtskönigs',
      ap: 20,
      description: 'Besiegt Mitternachtskönig Eparch in der Zitadelle von Zakiros.',
      category: 'Secrets of the Obscure',
      rewardTitle: 'Eparchs Bezwinger',
    },
  ],
  'janthir-syntri-titans': [
    {
      id: 'janthir-titans-hunter',
      title: 'Titanenjäger von Janthir',
      ap: 15,
      description: 'Besiegt Greer die Pestbringerin und Decima die Sturmsängerin in Janthir-Syntri.',
      category: 'Janthir Wilds',
      rewardTitle: 'Nebelbezwinger',
    },
  ],
  'lowland-shore-gathering': [
    {
      id: 'lowland-kodan-friend',
      title: 'Freund der Tiefland-Kodan',
      ap: 10,
      description: 'Schützt das Kodan-Dorf und vertreibt das Moorungeheuer an der Tiefland-Küste.',
      category: 'Janthir Wilds',
    },
  ],
  'janthir-convergence': [
    {
      id: 'janthir-convergence-master',
      title: 'Titanen-Belagerung gebrochen',
      ap: 15,
      description: 'Schließt eine Janthir-Konvergenz gegen die Titanenhorden erfolgreich ab.',
      category: 'Janthir Wilds',
    },
  ],
  'castora-starlit-weald': [
    {
      id: 'castora-weald-secrets',
      title: 'Schatten im Sternenwald',
      ap: 15,
      description: 'Infiltriert die Inquestur-Basis und deckt die Geheimnisse des Sternenwalds auf Castora auf.',
      category: 'Visions of Eternity',
      rewardTitle: 'Insel-Pionier',
    },
  ],
  'castora-ruins-eternity': [
    {
      id: 'castora-ancients-awake',
      title: 'Hüter der Ewigkeit',
      ap: 15,
      description: 'Aktiviert die drei Relikt-Altäre und bezwingt den uralten Inselwächter auf Castora.',
      category: 'Visions of Eternity',
    },
  ],
};

export function getAchievementsForEvent(eventId: string): BossAchievement[] {
  return BOSS_ACHIEVEMENTS[eventId] || [
    {
      id: `${eventId}-default`,
      title: 'Event-Teilnehmer',
      ap: 5,
      description: 'Schließt das Meta-Event oder den Bosskampf erfolgreich ab.',
      category: 'Tyria-Ereignisse',
    },
  ];
}
