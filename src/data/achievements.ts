import type { BossAchievement } from '../types.ts';

export type AchievementCategory = 'worldboss' | 'hot' | 'pof' | 'icedragon' | 'eod' | 'soto' | 'janthir';

export interface AchievementObjective {
  id: string;
  title: string;
  titleEn?: string;
  done?: boolean;
}

export interface GlobalAchievementItem {
  id: string;
  gw2Id?: number;
  title: string;
  titleEn?: string;
  ap: number;
  description: string;
  descriptionEn?: string;
  category: AchievementCategory;
  categoryLabel?: string;
  categoryLabelEn?: string;
  progressCurrent?: number;
  progressMax?: number;
  rewardTitle?: string;
  rewardTitleEn?: string;
  rewardMastery?: { region: 'tyria' | 'maguuma' | 'desert' | 'cantha'; points: number };
  rewardItem?: string;
  rewardItemEn?: string;
  isCompleted?: boolean;
  isFeatured?: boolean;
  tierInfo?: string;
  tierInfoEn?: string;
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
  // 1. CORE WELTENBOSSE (WORLDBOSS)
  // ==========================================
  {
    id: 'daily-worldboss',
    gw2Id: 1845,
    title: 'Täglicher Weltenboss-Jäger',
    titleEn: 'Daily World Boss Hunter',
    ap: 2,
    description: 'Nehmt heute an mindestens einem erfolgreichen Weltenboss-Event quer durch ganz Tyria teil.',
    descriptionEn: 'Participate in at least one successful world boss event across Tyria today.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    progressMax: 1,
    rewardItem: 'Weltenboss-Bonuskiste',
    rewardItemEn: 'World Boss Bonus Chest',
    tierInfo: 'Täglich wiederholbar',
    tierInfoEn: 'Daily repeatable',
    isFeatured: true,
    eventId: 'tequatl',
  },
  {
    id: 'wb-tequatl-meta',
    gw2Id: 824,
    title: 'Der Sonnenlose',
    titleEn: 'The Sunless',
    ap: 25,
    description: 'Bezwingt Tequatl den Sonnenlosen, meistert alle Hylek-Geschütze und überlebt seine Schockwellen.',
    descriptionEn: 'Defeat Tequatl the Sunless, master all Hylek turrets, and survive shockwaves.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    rewardTitle: 'Der Sonnenlose',
    rewardTitleEn: 'The Sunless',
    rewardMastery: { region: 'tyria', points: 1 },
    progressMax: 5,
    isFeatured: true,
    eventId: 'tequatl',
    objectives: [
      { id: 'teq-1', title: 'Tequatl den Sonnenlosen besiegt', titleEn: 'Defeated Tequatl the Sunless', done: false },
      { id: 'teq-2', title: 'Wellenreiter: 10 Schockwellen übersprungen', titleEn: 'Wave Rider: Jumped 10 shockwaves', done: false },
      { id: 'teq-3', title: 'Heckenschütze: Hylek-Geschütze bemannt', titleEn: 'Tail Gunner: Manned Hylek turrets', done: false },
      { id: 'teq-4', title: 'Megabatterien vor Krait-Angriffen verteidigt', titleEn: 'Defended mega-batteries from Krait attacks', done: false },
      { id: 'teq-5', title: 'Schwanzschlag im Nahkampf ausgewichen', titleEn: 'Evaded tail swipe in melee', done: false },
    ],
  },
  {
    id: 'wb-triple-trouble',
    gw2Id: 873,
    title: 'Großer Tropischer Wurm',
    titleEn: 'Triple Trouble',
    ap: 20,
    description: 'Koordiniert drei Einsatztrupps und besiegt alle drei Köpfe des Großen Dschungelwurms innerhalb einer Minute.',
    descriptionEn: 'Coordinate three squads and defeat all three heads of the Great Jungle Wurm within one minute.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    rewardTitle: 'Großer Wurmjäger',
    rewardTitleEn: 'Great Wurm Hunter',
    rewardMastery: { region: 'tyria', points: 1 },
    progressMax: 4,
    eventId: 'triple-trouble',
    objectives: [
      { id: 'tt-1', title: 'Bernsteinkopf von innen per Harpune bezwungen', titleEn: 'Amber head defeated from inside with harpoons', done: false },
      { id: 'tt-2', title: 'Kobaltkopf mit Brandfässern geschwächt', titleEn: 'Cobalt head weakened with explosive kegs', done: false },
      { id: 'tt-3', title: 'Karminkopf mit Phytoplankton-Wolken verwundbar gemacht', titleEn: 'Crimson head made vulnerable with phytoplankton', done: false },
      { id: 'tt-4', title: 'Alle drei Köpfe synchron enthauptet', titleEn: 'All three heads decapitated synchronously', done: false },
    ],
  },
  {
    id: 'wb-shatterer',
    gw2Id: 2841,
    title: 'Zerschmettert den Zerschmetterer',
    titleEn: 'Smash the Shatterer',
    ap: 15,
    description: 'Bezwingt den Kristalldrachen des Kralkatorrik und werft Bomben aus der Luft ab.',
    descriptionEn: 'Defeat Kralkatorrik\'s crystal dragon champion and drop glider bombs from the air.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    progressMax: 4,
    eventId: 'shatterer',
    objectives: [
      { id: 'sh-1', title: 'Den Zerschmetterer besiegt', titleEn: 'Defeated the Shatterer', done: false },
      { id: 'sh-2', title: 'Flugstaffel: 10 Gleitschirm-Bomben abgeworfen', titleEn: 'Flight Squadron: Dropped 10 glider bombs', done: false },
      { id: 'sh-3', title: 'Pulsierende Branderze zerschlagen', titleEn: 'Smashed pulsating Branded crystals', done: false },
      { id: 'sh-4', title: 'Kampf ohne Kristallgefängnis abgeschlossen', titleEn: 'Completed encounter without being imprisoned', done: false },
    ],
  },
  {
    id: 'wb-claw-jormag',
    gw2Id: 170,
    title: 'Frostiges Ende der Klaue von Jormag',
    titleEn: 'Frosty End for the Claw of Jormag',
    ap: 10,
    description: 'Sprengt die monumentale Eiswand und bringt die Klaue des Eisdrachen zu Fall.',
    descriptionEn: 'Detonate the massive ice wall and bring down the Claw of the ice dragon.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    progressMax: 3,
    eventId: 'claw-of-jormag',
    objectives: [
      { id: 'claw-1', title: 'Sprengstoff-Golems zur Eiswand eskortiert', titleEn: 'Escorted explosive golems to the ice wall', done: false },
      { id: 'claw-2', title: 'Die Eiswand gesprengt', titleEn: 'Detonated the ice wall', done: false },
      { id: 'claw-3', title: 'Die Klaue von Jormag auf den Eisschollen bezwungen', titleEn: 'Defeated the Claw of Jormag on the ice floes', done: false },
    ],
  },
  {
    id: 'wb-shadow-behemoth',
    gw2Id: 165,
    title: 'Aus den Schatten verbannt',
    titleEn: 'Banished from the Shadows',
    ap: 10,
    description: 'Besiegt den Schatten-Behemoth im Gottlosen Sumpf von Königintal.',
    descriptionEn: 'Defeat the Shadow Behemoth in the Godlost Swamp of Queensdale.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    progressMax: 2,
    eventId: 'shadow-behemoth',
    objectives: [
      { id: 'sb-1', title: 'Schatten-Portale geschlossen', titleEn: 'Closed shadow portals', done: false },
      { id: 'sb-2', title: 'Schatten-Behemoth besiegt', titleEn: 'Defeated Shadow Behemoth', done: false },
    ],
  },
  {
    id: 'wb-megadestroyer',
    gw2Id: 172,
    title: 'Löscht die Flamme des Megazerstörers',
    titleEn: 'Extinguish the Megadestroyer',
    ap: 10,
    description: 'Vernichtet Zerstörer-Bruten und ihren Anführer im Vulkan des Mahlstroms.',
    descriptionEn: 'Destroy the Destroyer spawns and their leader in the Mount Maelstrom volcano.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    progressMax: 2,
    eventId: 'megadestroyer',
  },
  {
    id: 'wb-svanir-shaman',
    title: 'Der Frostschlund',
    titleEn: 'The Frozen Maw',
    ap: 10,
    description: 'Zerschlagt das Eis-Totem und besiegt den mächtigen Schamanen der Svanir im eisigen Heiligtum.',
    descriptionEn: 'Smash the ice totem and defeat the powerful Svanir shaman in the frozen sanctuary.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'svanir-shaman',
  },
  {
    id: 'wb-fire-elemental',
    title: 'Thaumanova-Bereinigung',
    titleEn: 'Thaumanova Clean-up',
    ap: 10,
    description: 'Zerstört das tobende Feuerelementar im Herzen des zerstörten Thaumanova-Reaktors.',
    descriptionEn: 'Destroy the raging Fire Elemental at the heart of the shattered reactor.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'fire-elemental',
  },
  {
    id: 'wb-jungle-wurm',
    title: 'Wurmtöter von Caledon',
    titleEn: 'Wurm Slayer of Caledon',
    ap: 10,
    description: 'Besiegt den Großen Dschungelwurm im Tiefland des Wychmire-Sumpfs.',
    descriptionEn: 'Defeat the Great Jungle Wurm in the lowlands of Wychmire Swamp.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'jungle-wurm',
  },
  {
    id: 'wb-taidha-covington',
    title: 'Piratenbraut-Fall',
    titleEn: 'Pirate Queen\'s Downfall',
    ap: 10,
    description: 'Stürmt die Festung von Taidha Covington auf der Insel der Lachmöwen und bezwingt sie.',
    descriptionEn: 'Storm Taidha Covington\'s fortress on Laughing Gull Island and defeat her.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'taidha-covington',
  },
  {
    id: 'wb-inquest-golem',
    title: 'Inquestur-Sabotage',
    titleEn: 'Inquest Sabotage',
    ap: 10,
    description: 'Zerstört den Mark-II-Supergolem auf der Inquestur-Testplattform im Mahlstrom.',
    descriptionEn: 'Shut down the Inquest Golem Mark II on the Mount Maelstrom platform.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'inquest-golem',
  },
  {
    id: 'wb-modniir-ulgoth',
    title: 'Ulgoths Untergang',
    titleEn: 'Ulgoth\'s Fall',
    ap: 10,
    description: 'Stürmt das Lager der Zentauren und bezwingt Kriegsfürst Ulgoth in den Harathi-Hinterländern.',
    descriptionEn: 'Defeat Warlord Ulgoth the Modniir high champion in Harathi Hinterlands.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'modniir-ulgoth',
  },
  {
    id: 'wb-karka-queen',
    title: 'Karka-Königin-Eroberer',
    titleEn: 'Karka Queen Conqueror',
    ap: 10,
    description: 'Besiegt die Legendäre Karka-Königin in der Südlicht-Bucht.',
    descriptionEn: 'Shatter the armored carapace of the ancient Karka Queen in Southsun Cove.',
    category: 'worldboss',
    categoryLabel: 'Weltenbosse',
    categoryLabelEn: 'World Bosses',
    eventId: 'karka-queen',
  },

  // ==========================================
  // 2. HEART OF THORNS (HOT)
  // ==========================================
  {
    id: 'wb-tarir-octovine',
    gw2Id: 2450,
    title: 'Erhabener Beschützer von Tarir',
    titleEn: 'Exalted Protector of Tarir',
    ap: 15,
    description: 'Brecht synchron durch alle vier Tore von Tarir und vernichtet die Oktovanke vor der Verderbnis.',
    descriptionEn: 'Breach through all four gates of Tarir in sync and eliminate the Octovine before corruption spreads.',
    category: 'hot',
    categoryLabel: 'Heart of Thorns',
    categoryLabelEn: 'Heart of Thorns',
    rewardTitle: 'Erhabener Beschützer',
    rewardTitleEn: 'Exalted Protector',
    rewardMastery: { region: 'maguuma', points: 1 },
    progressMax: 5,
    eventId: 'tarir-octovine',
    objectives: [
      { id: 'tar-1', title: 'Nordtor: Rankenwand durchbrochen', titleEn: 'North Gate: Breached vine wall', done: false },
      { id: 'tar-2', title: 'Südtor: Explosivbomben platziert', titleEn: 'South Gate: Placed explosive bombs', done: false },
      { id: 'tar-3', title: 'Osttor: Erhabenen-Rüstungen gesteuert', titleEn: 'East Gate: Piloted Exalted armors', done: false },
      { id: 'tar-4', title: 'Westtor: Schleuderpilze genutzt', titleEn: 'West Gate: Used bouncing mushrooms', done: false },
      { id: 'tar-5', title: 'Große Erhabenen-Truhe in der Unterstadt geöffnet', titleEn: 'Opened Grand Exalted Chest in the lower city', done: false },
    ],
  },
  {
    id: 'wb-chak-gerent',
    gw2Id: 2390,
    title: 'König der Tiefen',
    titleEn: 'King of the Depths',
    ap: 15,
    description: 'Tötet alle vier Chak-Gerenten in den Durchgängen der Verschlungenen Tiefen.',
    descriptionEn: 'Slay all four Chak Gerents across the lanes of Tangled Depths.',
    category: 'hot',
    categoryLabel: 'Heart of Thorns',
    categoryLabelEn: 'Heart of Thorns',
    progressMax: 4,
    eventId: 'chak-gerent',
    objectives: [
      { id: 'cg-1', title: 'Nuhoch-Durchgang: Gerent bezwungen', titleEn: 'Nuhoch Lane: Gerent defeated', done: false },
      { id: 'cg-2', title: 'Rata-Novus-Durchgang: Gerent bezwungen', titleEn: 'Rata Novus Lane: Gerent defeated', done: false },
      { id: 'cg-3', title: 'Oger-Lager: Gerent bezwungen', titleEn: 'Ogre Lane: Gerent defeated', done: false },
      { id: 'cg-4', title: 'Skarabu-Durchgang: Gerent bezwungen', titleEn: 'SCAR Lane: Gerent defeated', done: false },
    ],
  },
  {
    id: 'wb-verdant-brink',
    title: 'Herrscher des Baldachins',
    titleEn: 'Canopy Bosses',
    ap: 15,
    description: 'Besiegt alle fünf legendären Nachtbosse im Baldachin des Grasgrünen Grabens.',
    descriptionEn: 'Defeat all five legendary canopy bosses in Verdant Brink at night.',
    category: 'hot',
    categoryLabel: 'Heart of Thorns',
    categoryLabelEn: 'Heart of Thorns',
    rewardTitle: 'Krone des Dschungels',
    rewardTitleEn: 'Crown of the Jungle',
    eventId: 'verdant-brink-night',
  },
  {
    id: 'wb-dragons-stand',
    title: 'Reich des Drachen: Mordremoths Ende',
    titleEn: 'Dragon\'s Stand: End of Mordremoth',
    ap: 20,
    description: 'Führt alle drei Pakt-Lanes an den Rand des Dschungels und enthauptet den Mund von Mordremoth.',
    descriptionEn: 'Advance all three lanes in Dragon\'s Stand and decapitate the Mouth of Mordremoth.',
    category: 'hot',
    categoryLabel: 'Heart of Thorns',
    categoryLabelEn: 'Heart of Thorns',
    rewardTitle: 'Dschungel-Eroberer',
    rewardTitleEn: 'Jungle Conqueror',
    eventId: 'dragons-stand',
  },

  // ==========================================
  // 3. PATH OF FIRE (POF)
  // ==========================================
  {
    id: 'wb-choya-pinata',
    gw2Id: 3858,
    title: 'Festliche Piñata',
    titleEn: 'Festive Piñata',
    ap: 10,
    description: 'Zerschlagt die festliche Choya-Piñata nach dem Kasino-Blitz im Kristall-Oase Basar.',
    descriptionEn: 'Defeat the Choya Piñata at the conclusion of the Casino Blitz in Amnoon.',
    category: 'pof',
    categoryLabel: 'Path of Fire',
    categoryLabelEn: 'Path of Fire',
    eventId: 'choya-pinata',
  },
  {
    id: 'wb-maws-of-torment',
    gw2Id: 3861,
    title: 'Tormentor-Bezwinger',
    titleEn: 'Tormentor Slayer',
    ap: 10,
    description: 'Schließt die Meta „Schlünde der Qual“ in der Einöde ab und schlagt die Dämonen zurück.',
    descriptionEn: 'Defeat the demonic incursions pouring out of the Maws of Torment.',
    category: 'pof',
    categoryLabel: 'Path of Fire',
    categoryLabelEn: 'Path of Fire',
    eventId: 'maws-of-torment',
  },
  {
    id: 'wb-serpents-ire',
    gw2Id: 3864,
    title: 'Schlangenzorn-Eindämmung',
    titleEn: "Serpent's Ire Suppressor",
    ap: 15,
    description: 'Bezwingt Ysshi Hessani und Pekka Volt im Schlangenzorn der Domäne Vabbi.',
    descriptionEn: "Defeat Ysshi Hessani and Pekka Volt in the Serpent's Ire meta in Domain of Vabbi.",
    category: 'pof',
    categoryLabel: 'Path of Fire',
    categoryLabelEn: 'Path of Fire',
    rewardTitle: 'Zorn-Bändiger',
    rewardTitleEn: 'Wrath Tamer',
    eventId: 'serpents-ire',
  },

  // ==========================================
  // 4. EISBRUT-SAGA (ICEDRAGON)
  // ==========================================
  {
    id: 'wb-dragonstorm',
    gw2Id: 5882,
    title: 'Sturm auf die Champions',
    titleEn: 'Dragonstorm Champion',
    ap: 15,
    description: 'Kämpft an der Seite von Braham und Ryland, schwächt Jormag und Primordus und bannt die Drachenmagie.',
    descriptionEn: 'Confront the clash of Jormag and Primordus alongside champions of the elder races.',
    category: 'icedragon',
    categoryLabel: 'Eisbrut-Saga',
    categoryLabelEn: 'Icebrood Saga',
    rewardTitle: 'Drachen-Champion',
    rewardTitleEn: 'Stormbreaker',
    progressMax: 3,
    eventId: 'dragonstorm',
    objectives: [
      { id: 'ds-1', title: 'Aurenes Prismen aufgeladen', titleEn: 'Charged Aurene\'s prismatic forces', done: false },
      { id: 'ds-2', title: 'Champions von Primordus und Jormag bezwungen', titleEn: 'Defeated champions of Primordus and Jormag', done: false },
      { id: 'ds-3', title: 'Drachensturm-Meta erfolgreich abgeschlossen', titleEn: 'Successfully completed Dragonstorm meta', done: false },
    ],
  },
  {
    id: 'wb-drakkar',
    gw2Id: 5122,
    title: 'Stimme im Eis',
    titleEn: 'Voice in the Ice Broken',
    ap: 15,
    description: 'Zerstört die Eisschollen der Bjora-Sümpfe und bringt Drakkar, die Kreatur aus der Tiefe, zum Schweigen.',
    descriptionEn: 'Shatter Drakkar\'s icy protection and eliminate the Whisper of Jormag in Bjora Marches.',
    category: 'icedragon',
    categoryLabel: 'Eisbrut-Saga',
    categoryLabelEn: 'Icebrood Saga',
    rewardTitle: 'Eisbrecher',
    rewardTitleEn: 'Icebreaker',
    progressMax: 3,
    eventId: 'drakkar',
    objectives: [
      { id: 'drk-1', title: 'Raben-Schreine im Kampf aktiviert', titleEn: 'Activated Raven shrines during combat', done: false },
      { id: 'drk-2', title: 'Gefallene Geisterchampions in der Schattensphäre bezwungen', titleEn: 'Defeated fallen spirit champions in shadow realm', done: false },
      { id: 'drk-3', title: 'Drakkar auf dem Eissee besiegt', titleEn: 'Defeated Drakkar on the frozen lake', done: false },
    ],
  },

  // ==========================================
  // 5. END OF DRAGONS (EOD)
  // ==========================================
  {
    id: 'wb-dragons-end',
    gw2Id: 6223,
    title: 'Die Leere bezwungen',
    titleEn: 'The Void Subdued',
    ap: 20,
    description: 'Besiegt die korrumpierte Drachenmutter Soo-Won im Erntetempel der Drachen-Ende Meta.',
    descriptionEn: 'Defeat the corrupted dragon mother Soo-Won at the Harvest Temple in Dragon\'s End.',
    category: 'eod',
    categoryLabel: 'End of Dragons',
    categoryLabelEn: 'End of Dragons',
    rewardTitle: 'Retter von Cantha',
    rewardTitleEn: 'Savior of Cantha',
    rewardMastery: { region: 'cantha', points: 1 },
    progressMax: 4,
    eventId: 'dragons-end',
    objectives: [
      { id: 'de-1', title: 'Segen der Wogen von den Schreinen erhalten', titleEn: 'Received Blessing of the Waves from shrines', done: false },
      { id: 'de-2', title: 'Die fünf Leere-Aspekte bezwungen', titleEn: 'Defeated all five Void aspects', done: false },
      { id: 'de-3', title: 'Den Erntetempel erfolgreich gereinigt', titleEn: 'Successfully purified the Harvest Temple', done: false },
      { id: 'de-4', title: 'Soo-Won aus dem Wahnsinn befreit', titleEn: 'Freed Soo-Won from madness', done: false },
    ],
  },
  {
    id: 'wb-aetherblade-assault',
    title: 'Aetherklingen-Ende',
    titleEn: 'Aetherblade Downfall',
    ap: 10,
    description: 'Verteidigt die Provinz Seitung gegen Renyak und die feindlichen Luftschiff-Angreifer.',
    descriptionEn: 'Defend Seitung Province and triumph over Renyak and his sky assault forces.',
    category: 'eod',
    categoryLabel: 'End of Dragons',
    categoryLabelEn: 'End of Dragons',
    eventId: 'aetherblade-assault',
  },
  {
    id: 'wb-kaineng-blackout',
    title: 'Stromausfall in Neu-Kaineng',
    titleEn: 'New Kaineng Blackout',
    ap: 10,
    description: 'Überladet die Energie-Relais und bezwingt das korrumpierte Jade-Konstrukt im Ministerium.',
    descriptionEn: 'Overload corrupted energy relays and defeat the rogue Jade construct.',
    category: 'eod',
    categoryLabel: 'End of Dragons',
    categoryLabelEn: 'End of Dragons',
    eventId: 'kaineng-blackout',
  },
  {
    id: 'wb-gangs-of-echovald',
    title: 'Bandenkrieg des Echowalds',
    titleEn: 'Gangs of Echovald',
    ap: 10,
    description: 'Befreit Fort Aspenwood von den Kriegern der Jadebruderschaft und der Amatatsu-Schmuggler.',
    descriptionEn: 'Liberate Fort Aspenwood from the Jade Brotherhood and Speaker forces.',
    category: 'eod',
    categoryLabel: 'End of Dragons',
    categoryLabelEn: 'End of Dragons',
    eventId: 'gangs-of-echovald',
  },

  // ==========================================
  // 5. SECRETS OF THE OBSCURE (SOTO)
  // ==========================================
  {
    id: 'wb-skywatch-tower',
    title: 'Turmstürmer des Archipels',
    titleEn: 'Tower of Wisdom',
    ap: 10,
    description: 'Schließt die Meta „Aufschließen des Turms der Zauberer“ im Himmelswacht-Archipel ab.',
    descriptionEn: 'Reclaim the shattered islands of Skywatch Archipelago from Kryptis incursions.',
    category: 'soto',
    categoryLabel: 'Secrets of the Obscure',
    categoryLabelEn: 'Secrets of the Obscure',
    rewardTitle: 'Astralwächter',
    eventId: 'skywatch-tower',
  },
  {
    id: 'wb-defense-of-amnytas',
    title: 'Verteidiger von Amnytas',
    titleEn: 'Bastion of Amnytas',
    ap: 15,
    description: 'Schlagt Nourys, das Auge des Abgrunds, in der Verteidigung von Amnytas zurück.',
    descriptionEn: 'Defend the World Spire of the Astral Ward against deep realm invaders.',
    category: 'soto',
    categoryLabel: 'Secrets of the Obscure',
    categoryLabelEn: 'Secrets of the Obscure',
    rewardTitle: 'Auge des Sturms',
    eventId: 'defense-of-amnytas',
  },
  {
    id: 'wb-convergences-public',
    title: 'Held der Konvergenzen',
    titleEn: 'Hero of the Convergences',
    ap: 15,
    description: 'Schließt eine öffentliche Konvergenz im Turm der Zauberer erfolgreich ab.',
    descriptionEn: 'Close rift fractures and defeat legendary Kryptis champions.',
    category: 'soto',
    categoryLabel: 'Secrets of the Obscure',
    categoryLabelEn: 'Secrets of the Obscure',
    eventId: 'convergences-public',
  },
  {
    id: 'wb-inner-nayos-eparch',
    title: 'Sturz des Mitternachtskönigs',
    titleEn: 'Ruler Over Midnight',
    ap: 20,
    description: 'Besiegt Mitternachtskönig Eparch in der Zitadelle von Zakiros.',
    descriptionEn: 'Enter the citadel of Zakiros and defeat the Midnight King Eparch.',
    category: 'soto',
    categoryLabel: 'Secrets of the Obscure',
    categoryLabelEn: 'Secrets of the Obscure',
    rewardTitle: 'Eparchs Bezwinger',
    eventId: 'inner-nayos-eparch',
  },

  // ==========================================
  // 6. JANTHIR WILDS & ZUKUNFT (JANTHIR)
  // ==========================================
  {
    id: 'wb-janthir-syntri-titans',
    title: 'Titanen-Dämmerung von Janthir',
    titleEn: 'Dawn of the Titans',
    ap: 20,
    description: 'Besiegt die Ur-Titanen Greer und Decima in der Syntri-Ebene von Janthir Wilds.',
    descriptionEn: 'Bring down primeval titans Greer and Decima across the wildlands of Janthir.',
    category: 'janthir',
    categoryLabel: 'Janthir & Zukunft',
    categoryLabelEn: 'Janthir & Future',
    rewardTitle: 'Titanen-Jäger',
    eventId: 'janthir-syntri-titans',
  },
  {
    id: 'wb-lowland-shore-gathering',
    title: 'Hüter des Tieflands',
    titleEn: 'Lowland Warden',
    ap: 15,
    description: 'Sichert die Kodan-Heimstätten an der Tiefland-Küste und bezwingt die Nebelkreaturen.',
    descriptionEn: 'Defend the Kodan steadings along the Lowland Shore against wandering mist horrors.',
    category: 'janthir',
    categoryLabel: 'Janthir & Zukunft',
    categoryLabelEn: 'Janthir & Future',
    eventId: 'lowland-shore-gathering',
  },
  {
    id: 'wb-janthir-convergence',
    title: 'Mond-Invasion abgewehrt',
    titleEn: 'Bale Moon Breaker',
    ap: 20,
    description: 'Schließt die Janthir-Konvergenz ab und bezwingt die verdorbenen Titanen-Bruten.',
    descriptionEn: 'Repel the cosmic incursions of the Bale Moon convergence in Janthir.',
    category: 'janthir',
    categoryLabel: 'Janthir & Zukunft',
    categoryLabelEn: 'Janthir & Future',
    eventId: 'janthir-convergence',
  },
  {
    id: 'wb-castora-prime',
    gw2Id: 8190,
    title: 'Schatten im Sternenwald',
    titleEn: 'Secrets of the Starlit Weald',
    ap: 15,
    description: 'Infiltriert die Inquestur-Basis und deckt die Geheimnisse des Sternenwalds auf Castora auf.',
    descriptionEn: 'Unravel the mysteries and ancient celestial energies across the shores of Castora.',
    category: 'janthir',
    categoryLabel: 'Janthir & Zukunft',
    categoryLabelEn: 'Janthir & Future',
    rewardTitle: 'Insel-Pionier',
    rewardTitleEn: 'Isle Pioneer',
    eventId: 'castora-starlit-weald',
  },
  {
    id: 'wb-castora-ruins-eternity',
    gw2Id: 8195,
    title: 'Erwachen der Ewigkeit',
    titleEn: 'Awakening of Eternity',
    ap: 15,
    description: 'Aktiviert die drei Relikt-Altäre in den Tempelruinen von Castora und bannt die uralten astralen Anomalien.',
    descriptionEn: 'Activate the three relic altars in the temple ruins of Castora and banish the astral anomalies.',
    category: 'janthir',
    categoryLabel: 'Janthir & Zukunft',
    categoryLabelEn: 'Janthir & Future',
    rewardTitle: 'Hüter der Ewigkeit',
    rewardTitleEn: 'Guardian of Eternity',
    eventId: 'castora-ruins-eternity',
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
      titleEn: 'The Frozen Maw',
      ap: 10,
      description: 'Zerschlagt das Eis-Totem und besiegt den mächtigen Schamanen der Svanir im eisigen Heiligtum.',
      descriptionEn: 'Smash the ice totem and defeat the powerful Svanir shaman in the frozen sanctuary.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
      tierInfo: 'Einmalig',
      tierInfoEn: 'One-time',
    },
    {
      id: 'svanir-rescue',
      title: 'Eisiger Retter',
      titleEn: 'Icy Rescuer',
      ap: 5,
      description: 'Befreit 5 gefangene Norn-Krieger aus den Eisblöcken des Schamanen.',
      descriptionEn: 'Free 5 captured Norn warriors from the shaman\'s ice blocks.',
      category: 'Wanderer-Hügel',
      categoryEn: 'Wayfarer Foothills',
      tierInfo: 'Event-Spezifisch',
      tierInfoEn: 'Event-Specific',
    },
  ],
  'fire-elemental': [
    {
      id: 'thauma-cleanup',
      title: 'Thaumanova-Bereinigung',
      titleEn: 'Thaumanova Clean-up',
      ap: 10,
      description: 'Zerstört das tobende Feuerelementar im Herzen des zerstörten Thaumanova-Reaktors.',
      descriptionEn: 'Destroy the raging Fire Elemental at the heart of the shattered reactor.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
      tierInfo: 'Einmalig',
      tierInfoEn: 'One-time',
    },
    {
      id: 'thauma-cooling',
      title: 'Kühlkern-Wartung',
      titleEn: 'Cooling Core Maintenance',
      ap: 5,
      description: 'Eskortiert die Reparatur-Golems unbeschadet zur Kühlkammer des Reaktors.',
      descriptionEn: 'Escort repair golems safely to the reactor cooling chamber.',
      category: 'Provinz Metrica',
      categoryEn: 'Metrica Province',
    },
  ],
  'jungle-wurm': [
    {
      id: 'wurm-slayer',
      title: 'Wurmtöter von Caledon',
      titleEn: 'Wurm Slayer of Caledon',
      ap: 10,
      description: 'Besiegt den Großen Dschungelwurm im Tiefland des Wychmire-Sumpfs.',
      descriptionEn: 'Defeat the Great Jungle Wurm in the lowlands of Wychmire Swamp.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'wurm-blossom',
      title: 'Giftblüten-Gärtner',
      titleEn: 'Toxic Blossom Gardener',
      ap: 5,
      description: 'Zertrampelt 15 giftige Blüten und Würmer während des Vor-Events.',
      descriptionEn: 'Trample 15 toxic blossoms and worms during the pre-event.',
      category: 'Caledon-Wald',
      categoryEn: 'Caledon Forest',
    },
  ],
  'shadow-behemoth': [
    {
      id: 'behemoth-banished',
      title: 'Aus den Schatten verbannt',
      titleEn: 'Banished from the Shadows',
      ap: 10,
      description: 'Besiegt den Schatten-Behemoth im Gottlosen Sumpf und vertreibt die Unterweltkreaturen.',
      descriptionEn: 'Defeat the Shadow Behemoth in the Godlost Swamp and banish underworld creatures.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'behemoth-portals',
      title: 'Portal-Zerstörer',
      titleEn: 'Portal Destroyer',
      ap: 5,
      description: 'Schließt 5 Unterwelt-Portale im Gottlosen Sumpf vor dem Erscheinen des Behemoths.',
      descriptionEn: 'Close 5 underworld portals in Godlost Swamp before the Behemoth arrives.',
      category: 'Königintal',
      categoryEn: 'Queensdale',
    },
  ],
  'taidha-covington': [
    {
      id: 'taidha-downfall',
      title: 'Piratenbraut-Fall',
      titleEn: 'Pirate Queen\'s Downfall',
      ap: 10,
      description: 'Stürmt die Festung von Taidha Covington auf der Insel der Lachmöwen und bezwingt sie.',
      descriptionEn: 'Storm Taidha Covington\'s fortress on Laughing Gull Island and defeat her.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'taidha-kegs',
      title: 'Pulverfass-Spezialist',
      titleEn: 'Powder Keg Specialist',
      ap: 5,
      description: 'Platziert 3 Pulverfässer erfolgreich am Haupttor von Taidhas Piratenfestung.',
      descriptionEn: 'Successfully place 3 powder kegs at the main gate of Taidha\'s pirate fortress.',
      category: 'Blutstrom-Küste',
      categoryEn: 'Bloodtide Coast',
    },
  ],
  'megadestroyer': [
    {
      id: 'destroyer-extinguish',
      title: 'Löscht die Flamme',
      titleEn: 'Extinguish the Flame',
      ap: 10,
      description: 'Besiegt den Megazerstörer im Vulkan des Mahlstroms und stoppt die Ausbreitung.',
      descriptionEn: 'Defeat the Megadestroyer inside the Mount Maelstrom caldera.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'destroyer-cannons',
      title: 'Kühlsystem-Ingenieur',
      titleEn: 'Cooling System Engineer',
      ap: 5,
      description: 'Verteidigt die 3 Asura-Kühlkanonen vor den Wellen der Zerstörer-Brut.',
      descriptionEn: 'Defend the 3 Asura cooling cannons against waves of Destroyer spawns.',
      category: 'Mahlstrom',
      categoryEn: 'Mount Maelstrom',
    },
  ],
  'shatterer': [
    {
      id: 'shatter-slayer',
      title: 'Zerschmettert den Zerschmetterer',
      titleEn: 'Smash the Shatterer',
      ap: 10,
      description: 'Besiegt den Zerschmetterer, den mächtigen Kristalldrachen des Kralkatorrik.',
      descriptionEn: 'Defeat the Shatterer, Kralkatorrik\'s crystal dragon champion.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'shatter-glider',
      title: 'Flugstaffel-Bomber',
      titleEn: 'Air Superiority',
      ap: 5,
      description: 'Nutzt den Gleitschirm und werft 10 Bomben auf den Zerschmetterer im Flug.',
      descriptionEn: 'Hit the Shatterer with glider bombs 5 times during flight.',
      category: 'Flammenkamm-Steppe',
      categoryEn: 'Blazeridge Steppes',
    },
    {
      id: 'shatter-nocage',
      title: 'Freiheit für die Flügel',
      titleEn: 'Freedom Fighter',
      ap: 5,
      description: 'Schließt den Kampf ab, ohne jemals von den Kristallgefängnissen eingesperrt zu werden.',
      descriptionEn: 'Complete the encounter without getting caught in a crystal prison.',
      category: 'Flammenkamm-Steppe',
      categoryEn: 'Challenge',
    },
  ],
  'modniir-ulgoth': [
    {
      id: 'ulgoth-conqueror',
      title: 'Zentaur-Unterwerfer',
      titleEn: 'Ulgoth Conqueror',
      ap: 10,
      description: 'Tötet Kriegsmeister Ulgoth und beendet die Angriffe der Modniir-Zentauren.',
      descriptionEn: 'Overcome the War Chief of the Harathi Centaurs in the Kingsgate arena.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'ulgoth-seraph',
      title: 'Freiheit für die Seraphen',
      titleEn: 'Seraph Ally',
      ap: 5,
      description: 'Befreit alle gefangenen Seraphen aus den Lagern vor der Festung.',
      descriptionEn: 'Defend Kingsgate with the Seraph forces.',
      category: 'Harathi-Hinterland',
      categoryEn: 'Harathi Hinterlands',
    },
  ],
  'inquest-golem': [
    {
      id: 'golem-mark2',
      title: 'Inquestur-Sabotage',
      titleEn: 'Inquest Sabotage',
      ap: 10,
      description: 'Zerstört den Mark-II-Supergolem auf der Inquestur-Testplattform.',
      descriptionEn: 'Shut down the Inquest Golem Mark II on the Mount Maelstrom platform.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'golem-evade',
      title: 'Isolations-Kompensation',
      titleEn: 'Electric Dodger',
      ap: 5,
      description: 'Weicht allen elektrischen Schockwellen der Testplattformen aus.',
      descriptionEn: 'Avoid all electrified floor tiles throughout the encounter.',
      category: 'Mahlstrom',
      categoryEn: 'Mount Maelstrom',
    },
  ],
  'claw-of-jormag': [
    {
      id: 'claw-shatter',
      title: 'Frostiges Ende',
      titleEn: 'Ice Breaker',
      ap: 10,
      description: 'Zerschlagt die Eiswand und bringt die Klaue von Jormag zu Fall.',
      descriptionEn: 'Bring down the ice shield wall defending the Claw of Jormag.',
      category: 'Core Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'claw-bomber',
      title: 'Sprengstoff-Transporteur',
      titleEn: 'Explosives Specialist',
      ap: 5,
      description: 'Tragt Sprengstoff zu den Golems, um die Eiswand der Klaue zu sprengen.',
      descriptionEn: 'Deliver corrupted ice charges safely to the ice pillars.',
      category: 'Eisklamm-Sund',
      categoryEn: 'Frostgorge Sound',
    },
  ],
  'tequatl': [
    {
      id: 'tequatl-sunless',
      title: 'Der Sonnenlose',
      titleEn: 'Tequatl the Sunless',
      ap: 15,
      description: 'Besiegt Tequatl den Sonnenlosen, den Drachen-Champion Zhaitans im Funkenschwärmersumpf.',
      descriptionEn: 'Defeat Tequatl in the Splintered Coast without letting the batteries fall.',
      category: 'Hardcore Weltenbosse',
      categoryEn: 'Core World Bosses',
      rewardTitle: 'Der Sonnenlose',
      rewardTitleEn: 'The Sunless',
    },
    {
      id: 'tequatl-waves',
      title: 'Wellenreiter',
      titleEn: 'Wave Rider',
      ap: 5,
      description: 'Springt 10-mal erfolgreich über Tequatls vernichtende Schockwellen hinweg.',
      descriptionEn: 'Jump over 10 tidal shockwaves during the encounter.',
      category: 'Funkenschwärmersumpf',
      categoryEn: 'Sparkfly Fen',
    },
    {
      id: 'tequatl-gunner',
      title: 'Heckenschütze der Hylek',
      titleEn: 'Hylek Turret Gunner',
      ap: 5,
      description: 'Bemannt die Hylek-Geschütze, entfernt Tequatls Schuppenpanzer und schützt die Batterien.',
      descriptionEn: 'Man the Megalaser turrets and remove dragon scales.',
      category: 'Funkenschwärmersumpf',
      categoryEn: 'Sparkfly Fen',
    },
    {
      id: 'tequatl-tail',
      title: 'Schwanzschlag-Überlebender',
      titleEn: 'Tail Flail Dodger',
      ap: 5,
      description: 'Kämpft im Nahkampf gegen Tequatl und weicht dem gefürchteten Schwanzschlag aus.',
      descriptionEn: 'Dodge Tequatl\'s sweeping tail strike in melee combat.',
      category: 'Funkenschwärmersumpf',
      categoryEn: 'Sparkfly Fen',
    },
  ],
  'karka-queen': [
    {
      id: 'karka-slayer',
      title: 'Karka-Königin-Eroberer',
      titleEn: 'Karka Queen Conqueror',
      ap: 10,
      description: 'Besiegt die Legendäre Karka-Königin in der Südlicht-Bucht.',
      descriptionEn: 'Shatter the armored carapace of the ancient Karka Queen in Southsun Cove.',
      category: 'Hardcore Weltenbosse',
      categoryEn: 'Core World Bosses',
    },
    {
      id: 'karka-eggs',
      title: 'Eier-Zertreter',
      titleEn: 'Nest Pillager',
      ap: 5,
      description: 'Zerstört 10 Karka-Eier, bevor die aggressiven Jungtiere schlüpfen können.',
      descriptionEn: 'Collect 10 karka eggs and disrupt the breeding grounds.',
      category: 'Südlicht-Bucht',
      categoryEn: 'Southsun Cove',
    },
  ],
  'triple-trouble': [
    {
      id: 'wurm-master',
      title: 'Großer Tropischer Wurm',
      titleEn: 'Great Jungle Wurm Master',
      ap: 20,
      description: 'Besiegt alle drei Köpfe des Großen Tropischen Wurms innerhalb einer Minute.',
      descriptionEn: 'Defeat all three heads in the Bloodtide Coast in coordinated strikes.',
      category: 'Hardcore Weltenbosse',
      categoryEn: 'Core World Bosses',
      rewardTitle: 'Große Wurmjäger',
      rewardTitleEn: 'Great Wurm Hunter',
    },
    {
      id: 'wurm-amber',
      title: 'Bernstein-Befreier',
      titleEn: 'Amber Devourer',
      ap: 5,
      description: 'Lasst euch vom Bernstein-Kopf verschlucken und befreit euch von innen mit der Harpune.',
      descriptionEn: 'Enter the Amber wurm\'s belly and spear its stomach walls.',
      category: 'Blutstrom-Küste',
      categoryEn: 'Bloodtide Coast',
    },
    {
      id: 'wurm-cobalt',
      title: 'Kobalt-Fässerträger',
      titleEn: 'Cobalt Demolitionist',
      ap: 5,
      description: 'Werft Fässer mit explosiver Brandmischung auf den Kobalt-Kopf.',
      descriptionEn: 'Deploy explosive powder kegs onto the Cobalt wurm\'s head.',
      category: 'Blutstrom-Küste',
      categoryEn: 'Bloodtide Coast',
    },
    {
      id: 'wurm-crimson',
      title: 'Karmin-Farbwechsler',
      titleEn: 'Crimson Toxicologist',
      ap: 5,
      description: 'Aktiviert die Phytoplankton-Wolken gegen den Karmin-Kopf.',
      descriptionEn: 'Gather phytoplankton essence to break the Crimson wurm\'s armor.',
      category: 'Blutstrom-Küste',
      categoryEn: 'Bloodtide Coast',
    },
  ],
  'tarir-octovine': [
    {
      id: 'tarir-panic',
      title: 'Panik in Tarir',
      titleEn: 'Exalted Savior',
      ap: 10,
      description: 'Öffnet nach erfolgreichem Abschluss der Schlacht um Tarir die Große Erhabenen-Truhe in der Unterstadt.',
      descriptionEn: 'Breach all four outer gates and defeat the Octovine before the time expires.',
      category: 'Heart of Thorns',
      categoryEn: 'Heart of Thorns',
    },
    {
      id: 'tarir-fourgates',
      title: 'Einklang der vier Tore',
      titleEn: 'Gatekeeper of Tarir',
      ap: 15,
      description: 'Besiegt alle vier Rankenarme der Oktovanke innerhalb eines Zeitfensters von 2 Minuten.',
      descriptionEn: 'Defend the golden city of Tarir across all four directional gates.',
      category: 'Güldener Talkessel',
      categoryEn: 'Auric Basin',
      rewardTitle: 'Erhabener Beschützer',
    },
  ],
  'chak-gerent': [
    {
      id: 'chak-king',
      title: 'König der Tiefen',
      titleEn: 'Chak Gerent Slayer',
      ap: 15,
      description: 'Tötet alle vier Chak-Gerenten in den vier Durchgängen der Verschlungenen Tiefen.',
      descriptionEn: 'Defeat all four Gerents across Nuhoch, Rata Novus, Ogre, and SCAR lanes.',
      category: 'Heart of Thorns',
      categoryEn: 'Heart of Thorns',
    },
    {
      id: 'chak-cannon',
      title: 'Kanonen-Verteidiger',
      titleEn: 'Cannon Calibrator',
      ap: 5,
      description: 'Verteidigt die Ley-Linien-Energiekanone der Asura vor anstürmenden Chak-Käfern.',
      descriptionEn: 'Protect the energy batteries to charge the Ley-line cannon.',
      category: 'Verschlungene Tiefen',
      categoryEn: 'Tangled Depths',
    },
  ],
  'dragons-stand': [
    {
      id: 'mordremoth-mouth',
      title: 'Maul von Mordremoth',
      titleEn: 'Mouth of Mordremoth',
      ap: 15,
      description: 'Bezwingt das gigantische Maul von Mordremoth auf den schwimmenden Inseln.',
      descriptionEn: 'Drive the pact forces to the central platform and decapitate the jungle dragon.',
      category: 'Heart of Thorns',
      categoryEn: 'Heart of Thorns',
      rewardTitle: 'Bezwinger des Dschungels',
      rewardTitleEn: 'Dragonslayer',
    },
  ],
  'dragonstorm': [
    {
      id: 'dragonstorm-champ',
      title: 'Herrschaft über Feuer und Eis',
      titleEn: 'Dragonstorm Champion',
      ap: 15,
      description: 'Schließt die finale Schlacht gegen die Champions von Jormag und Primordus im Auge des Nordens ab.',
      descriptionEn: 'Face the clash between Jormag and Primordus and claim victory with Aurene.',
      category: 'Eisbrut-Saga',
      categoryEn: 'Icebrood Saga',
      rewardTitle: 'Drachen-Champion',
      rewardTitleEn: 'Stormbreaker',
    },
  ],
  'drakkar': [
    {
      id: 'drakkar-voice',
      title: 'Stimme im Eis',
      titleEn: 'Voice in the Ice Broken',
      ap: 15,
      description: 'Besiegt Drakkar in den eisigen Kavernen der Bjora-Sümpfe.',
      descriptionEn: 'Uncover the whispers in Bjora Marches and banish the horror of Drakkar.',
      category: 'Eisbrut-Saga',
      categoryEn: 'Icebrood Saga',
    },
  ],
  'dragons-end': [
    {
      id: 'soowon-void',
      title: 'Die Leere bezwungen',
      titleEn: 'Defender of Cantha',
      ap: 20,
      description: 'Besiegt die korrumpierte Drachenmutter Soo-Won im Erntetempel der Drachen-Ende Meta.',
      descriptionEn: 'Cleanse the Harvest Temple and triumph over the Dragonvoid and Soo-Won.',
      category: 'End of Dragons',
      categoryEn: 'End of Dragons',
      rewardTitle: 'Retter von Cantha',
      rewardTitleEn: 'Savior of Cantha',
    },
  ],
  'skywatch-tower': [
    {
      id: 'skywatch-tower-conqueror',
      title: 'Turmstürmer des Archipels',
      titleEn: 'Tower of Wisdom',
      ap: 10,
      description: 'Schließt die Meta „Aufschließen des Turms der Zauberer“ im Himmelswacht-Archipel ab.',
      descriptionEn: 'Reclaim the shattered islands of Skywatch Archipelago from Kryptis incursions.',
      category: 'Secrets of the Obscure',
      categoryEn: 'Secrets of the Obscure',
      rewardTitle: 'Astralwächter',
    },
  ],
  'defense-of-amnytas': [
    {
      id: 'amnytas-defender',
      title: 'Verteidiger von Amnytas',
      titleEn: 'Bastion of Amnytas',
      ap: 15,
      description: 'Schlagt Nourys, das Auge des Abgrunds, in der Verteidigung von Amnytas zurück.',
      descriptionEn: 'Defend the World Spire of the Astral Ward against deep realm invaders.',
      category: 'Secrets of the Obscure',
      categoryEn: 'Secrets of the Obscure',
      rewardTitle: 'Auge des Sturms',
      rewardTitleEn: 'Astral Ward Defender',
    },
  ],
  'convergences-public': [
    {
      id: 'convergences-hero',
      title: 'Held der Konvergenzen',
      titleEn: 'Hero of the Convergences',
      ap: 15,
      description: 'Schließt eine öffentliche Konvergenz im Turm der Zauberer erfolgreich ab.',
      descriptionEn: 'Close rift fractures and defeat legendary Kryptis champions.',
      category: 'Secrets of the Obscure',
      categoryEn: 'Secrets of the Obscure',
    },
  ],
  'inner-nayos-eparch': [
    {
      id: 'eparch-downfall',
      title: 'Sturz des Mitternachtskönigs',
      titleEn: 'Ruler Over Midnight',
      ap: 20,
      description: 'Besiegt Mitternachtskönig Eparch in der Zitadelle von Zakiros.',
      descriptionEn: 'Enter the citadel of Zakiros and defeat the Midnight King Eparch.',
      category: 'Secrets of the Obscure',
      categoryEn: 'Secrets of the Obscure',
      rewardTitle: 'Eparchs Bezwinger',
      rewardTitleEn: 'Conqueror of Midnight',
    },
  ],
  'janthir-syntri-titans': [
    {
      id: 'janthir-titans-hunter',
      title: 'Titanenjäger von Janthir',
      titleEn: 'Titan Hunter of Syntri',
      ap: 15,
      description: 'Besiegt Greer die Pestbringerin und Decima die Sturmsängerin in Janthir-Syntri.',
      descriptionEn: 'Hunt and subdue the roaming primeval Titans across Janthir Syntri.',
      category: 'Janthir Wilds',
      categoryEn: 'Janthir Wilds',
      rewardTitle: 'Nebelbezwinger',
      rewardTitleEn: 'Titan Hunter',
    },
  ],
  'lowland-shore-gathering': [
    {
      id: 'lowland-kodan-friend',
      title: 'Freund der Tiefland-Kodan',
      titleEn: 'Friend of the Lowland Kodan',
      ap: 10,
      description: 'Schützt das Kodan-Dorf und vertreibt das Moorungeheuer an der Tiefland-Küste.',
      descriptionEn: 'Aid the Lowland Kodan with their harvests, warclaw training, and ancient trials.',
      category: 'Janthir Wilds',
      categoryEn: 'Janthir Wilds',
    },
  ],
  'janthir-convergence': [
    {
      id: 'janthir-convergence-master',
      title: 'Titanen-Belagerung gebrochen',
      titleEn: 'Master of Janthir Convergence',
      ap: 15,
      description: 'Schließt eine Janthir-Konvergenz gegen die Titanenhorden erfolgreich ab.',
      descriptionEn: 'Lead the assault into the corrupted Janthir rifts and eliminate primeval threats.',
      category: 'Janthir Wilds',
      categoryEn: 'Janthir Wilds',
    },
  ],
  'castora-starlit-weald': [
    {
      id: 'castora-weald-secrets',
      title: 'Schatten im Sternenwald',
      titleEn: 'Secrets of the Starlit Weald',
      ap: 15,
      description: 'Infiltriert die Inquestur-Basis und deckt die Geheimnisse des Sternenwalds auf Castora auf.',
      descriptionEn: 'Unravel the mysteries and ancient celestial energies across the shores of Castora.',
      category: 'Visions of Eternity',
      categoryEn: 'Visions of Eternity',
      rewardTitle: 'Insel-Pionier',
      rewardTitleEn: 'Isle Pioneer',
    },
  ],
  'castora-ruins-eternity': [
    {
      id: 'castora-ancients-awake',
      title: 'Hüter der Ewigkeit',
      titleEn: 'Guardian of Eternity',
      ap: 15,
      description: 'Aktiviert die drei Relikt-Altäre und bezwingt den uralten Inselwächter auf Castora.',
      descriptionEn: 'Activate the three relic altars and defeat the primeval isle keeper on Castora.',
      category: 'Visions of Eternity',
      categoryEn: 'Visions of Eternity',
    },
  ],
  'verdant-brink-night': [
    {
      id: 'vb-canopy-bosses',
      title: 'Herrscher des Baldachins',
      titleEn: 'Canopy Bosses',
      ap: 15,
      description: 'Besiegt alle fünf legendären Nachtbosse im Baldachin des Grasgrünen Grabens.',
      descriptionEn: 'Defeat all five legendary canopy bosses in Verdant Brink at night.',
      category: 'Heart of Thorns',
      categoryEn: 'Heart of Thorns',
      rewardTitle: 'Krone des Dschungels',
      rewardTitleEn: 'Crown of the Jungle',
    },
    {
      id: 'vb-camp-rescuer',
      title: 'Retter der Pakt-Lager',
      titleEn: 'Pact Camp Rescuer',
      ap: 5,
      description: 'Verteidigt und sichert alle Pakt-Lager bis zum Erreichen der Sicherheitsstufe 4.',
      descriptionEn: 'Defend and secure all Pact rally points to Tier 4 security.',
      category: 'Heart of Thorns',
      categoryEn: 'Heart of Thorns',
    },
  ],
  'choya-pinata': [
    {
      id: 'pinata-slayer',
      title: 'Festliche Piñata',
      titleEn: 'Festive Piñata',
      ap: 10,
      description: 'Zerschlagt die festliche Choya-Piñata nach dem Kasino-Blitz in Amnoon.',
      descriptionEn: 'Defeat the Choya Piñata at the conclusion of the Casino Blitz in Amnoon.',
      category: 'Path of Fire',
      categoryEn: 'Path of Fire',
    },
    {
      id: 'pinata-coins',
      title: 'Kasino-Münzsammler',
      titleEn: 'Casino Blitz Coin Collector',
      ap: 5,
      description: 'Sammelt 30 verlorene Kasino-Münzen während des Kasino-Blitz-Rundgangs.',
      descriptionEn: 'Collect 30 lost casino coins during the Casino Blitz event rounds.',
      category: 'Path of Fire',
      categoryEn: 'Path of Fire',
    },
  ],
  'maws-of-torment': [
    {
      id: 'maws-conqueror',
      title: 'Tormentor-Bezwinger',
      titleEn: 'Tormentor Slayer',
      ap: 10,
      description: 'Schließt die Meta „Schlünde der Qual“ in der Einöde ab und schlagt die Dämonen zurück.',
      descriptionEn: 'Defeat the demonic incursions pouring out of the Maws of Torment.',
      category: 'Path of Fire',
      categoryEn: 'Path of Fire',
    },
    {
      id: 'maws-portal-breaker',
      title: 'Reich der Pein-Versiegler',
      titleEn: 'Realm of Torment Ward',
      ap: 5,
      description: 'Zerstört 3 Portalhüter der Geschmiedeten vor dem Haupttor der Verzweiflung.',
      descriptionEn: 'Destroy 3 Forged portal keepers before the main gate of despair.',
      category: 'Path of Fire',
      categoryEn: 'Path of Fire',
    },
  ],
  'serpents-ire': [
    {
      id: 'serpents-ire-suppressor',
      title: 'Schlangenzorn-Eindämmung',
      titleEn: "Serpent's Ire Suppressor",
      ap: 15,
      description: 'Bezwingt Ysshi Hessani und Pekka Volt im Schlangenzorn der Domäne Vabbi.',
      descriptionEn: "Defeat Ysshi Hessani and Pekka Volt in the Serpent's Ire meta in Domain of Vabbi.",
      category: 'Path of Fire',
      categoryEn: 'Path of Fire',
      rewardTitle: 'Zorn-Bändiger',
      rewardTitleEn: 'Wrath Tamer',
    },
  ],
  'aetherblade-assault': [
    {
      id: 'aetherblade-downfall',
      title: 'Aetherklingen-Ende',
      titleEn: 'Aetherblade Downfall',
      ap: 10,
      description: 'Verteidigt die Provinz Seitung gegen Renyak und die feindlichen Luftschiff-Angreifer.',
      descriptionEn: 'Defend Seitung Province and triumph over Renyak and his sky assault forces.',
      category: 'End of Dragons',
      categoryEn: 'End of Dragons',
    },
  ],
  'kaineng-blackout': [
    {
      id: 'kaineng-power-restored',
      title: 'Stromausfall in Neu-Kaineng',
      titleEn: 'New Kaineng Blackout',
      ap: 10,
      description: 'Überladet die Energie-Relais und bezwingt das korrumpierte Jade-Konstrukt im Ministerium.',
      descriptionEn: 'Overload corrupted energy relays and defeat the rogue Jade construct.',
      category: 'End of Dragons',
      categoryEn: 'End of Dragons',
    },
  ],
  'gangs-of-echovald': [
    {
      id: 'echovald-gang-war',
      title: 'Bandenkrieg des Echowalds',
      titleEn: 'Gangs of Echovald',
      ap: 10,
      description: 'Befreit Fort Aspenwood von den Kriegern der Jadebruderschaft und der Amatatsu-Schmuggler.',
      descriptionEn: 'Liberate Fort Aspenwood from the Jade Brotherhood and Speaker forces.',
      category: 'End of Dragons',
      categoryEn: 'End of Dragons',
    },
  ],
};

export function getAchievementsForEvent(eventId: string): BossAchievement[] {
  return BOSS_ACHIEVEMENTS[eventId] || [];
}

export function getAchievementTitle(
  item: { title: string; titleEn?: string },
  lang: 'de' | 'en'
): string {
  return lang === 'en' ? (item.titleEn || item.title) : item.title;
}

export function getAchievementDesc(
  item: { description: string; descriptionEn?: string },
  lang: 'de' | 'en'
): string {
  return lang === 'en' ? (item.descriptionEn || item.description) : item.description;
}

export function getAchievementCategoryLabel(
  item: GlobalAchievementItem,
  lang: 'de' | 'en'
): string {
  if (lang === 'en') {
    return item.categoryLabelEn || item.categoryLabel || item.category;
  }
  return item.categoryLabel || item.category;
}

export function getAchievementTierInfo(
  item: { tierInfo?: string; tierInfoEn?: string },
  lang: 'de' | 'en'
): string | undefined {
  if (lang === 'en') {
    return item.tierInfoEn || item.tierInfo;
  }
  return item.tierInfo;
}

export function getAchievementRewardTitle(
  item: { rewardTitle?: string; rewardTitleEn?: string },
  lang: 'de' | 'en'
): string | undefined {
  if (lang === 'en') {
    return item.rewardTitleEn || item.rewardTitle;
  }
  return item.rewardTitle;
}

export function getAchievementRewardItem(
  item: GlobalAchievementItem,
  lang: 'de' | 'en'
): string | undefined {
  if (lang === 'en') {
    return item.rewardItemEn || item.rewardItem;
  }
  return item.rewardItem;
}

export function getObjectiveTitle(
  obj: AchievementObjective,
  lang: 'de' | 'en'
): string {
  return lang === 'en' ? (obj.titleEn || obj.title) : obj.title;
}
