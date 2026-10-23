import { useSyncExternalStore } from 'react';
import type { Language } from '../types.ts';

const STORAGE_KEY = 'gw2_overlay_lang';

let currentLang: Language = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'en' || saved === 'de') return saved;
  } catch {
    /* ignore */
  }
  return 'de';
})();

function createEmitter() {
  const listeners = new Set<() => void>();
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit() {
      listeners.forEach((l) => l());
    },
  };
}

const emitter = createEmitter();
let onLanguageChange: ((lang: Language) => void) | null = null;

export function registerLanguageChangeHandler(fn: (lang: Language) => void) {
  onLanguageChange = fn;
}

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  if (lang !== 'de' && lang !== 'en') return;
  if (currentLang === lang) return;
  currentLang = lang;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    /* ignore */
  }
  if (onLanguageChange) {
    try {
      onLanguageChange(lang);
    } catch {
      /* ignore */
    }
  }
  emitter.emit();
}

export function useLanguage(): Language {
  return useSyncExternalStore(emitter.subscribe, getLanguage);
}

export const TRANSLATIONS = {
  de: {
    // Navigation
    'nav.events': 'Eventübersicht',
    'nav.waypoints': 'Wegmarken',
    'nav.achievements': 'Erfolge',
    'nav.crafting': 'Handwerk & Berufe',
    'nav.legendary': 'Legendäre Waffen',
    'nav.settings': 'Einstellungen',
    'nav.compact': 'Kompaktansicht',
    'nav.widget': 'In-Game Modus',
    'nav.pin': 'Immer im Vordergrund',
    'nav.clickthrough': 'Durchklick-Modus',

    // Events
    'events.searchPlaceholder': 'Event oder Gebiet suchen...',
    'events.all': 'Alle',
    'events.active': 'Aktiv / Bald',
    'events.bosses': 'Weltbosse',
    'events.metas': 'Meta-Events',
    'events.sortTime': 'Zeit (Nächste zuerst)',
    'events.sortGrouped': 'Typ gruppiert (Bosse / Metas)',
    'events.sortBossesFirst': 'Weltbosse zuerst',
    'events.sortMetasFirst': 'Meta-Events zuerst',
    'events.activeBadge': 'AKTIV',
    'events.in': 'in',
    'events.endsIn': 'Restzeit',
    'events.sendChat': 'Im Chat posten',
    'events.copyWaypoint': 'Wegmarke kopieren',
    'events.showMap': 'Auf Karte',
    'events.copied': 'Kopiert!',
    'events.loot': 'Beute & Belohnungen',
    'events.tactics': 'Taktik & Hinweise',
    'events.achievements': 'Erfolge',
    'events.empty': 'Keine Events gefunden für deine Auswahl.',
    'events.resetFilter': 'Filter zurücksetzen',
    'events.groupBosses': 'Weltbosse (Core & Hardcore)',
    'events.groupMetas': 'Meta-Events (Erweiterungen)',
    'events.teleportWaypoint': 'Wegmarke Teleport',

    // Waypoints
    'waypoints.title': 'Wegmarken-Verzeichnis',
    'waypoints.subtitle': 'Schnellzugriff auf alle Event- und Weltboss-Wegmarken Tyrias',
    'waypoints.searchPlaceholder': 'Wegmarke, Gebiet oder Boss suchen...',
    'waypoints.colCode': 'Code',
    'waypoints.colName': 'Wegmarken-Name',
    'waypoints.colZone': 'Gebiet / Zone',
    'waypoints.colEvents': 'Zugehörige Events / Bosse',
    'waypoints.colActions': 'Aktionen',
    'waypoints.empty': 'Keine Wegmarken für diesen Suchbegriff gefunden.',
    'waypoints.copy': 'Kopieren',
    'waypoints.chat': 'Chat',
    'waypoints.statusCount': '{count} Wegmarken verfügbar (Klick auf den Code kopiert direkt ins Spiel)',

    // Achievements
    'achievements.title': 'Heldin • Erfolge',
    'achievements.searchPlaceholder': 'Erfolge, Titel, Ziele durchsuchen...',
    'achievements.all': 'Alle',
    'achievements.watchlist': 'Verfolgt',
    'achievements.daily': 'Täglich',
    'achievements.worldboss': 'Weltenbosse',
    'achievements.exploration': 'Erkundung',
    'achievements.fractals': 'Fraktale & Raids',
    'achievements.collections': 'Sammlungen',
    'achievements.statusAll': 'Alle Status',
    'achievements.statusInProgress': 'In Arbeit',
    'achievements.statusCompleted': 'Abgeschlossen',
    'achievements.statOverlay': 'Erfolge in Omnitria:',
    'achievements.statAvailableAp': 'Verfügbare AP:',
    'achievements.statDailyAp': 'Tägliche AP:',
    'achievements.emptyTitle': 'Keine Erfolge gefunden',
    'achievements.emptyWatchlist': 'Du hast noch keine Erfolge auf deiner Watchlist. Klicke auf den Stern bei einem beliebigen Erfolg, um ihn hier zu verfolgen.',
    'achievements.emptyFilter': 'Passe die Filter oder den Suchbegriff an, um passende Erfolge anzuzeigen.',
    'achievements.resetFilter': 'Filter zurücksetzen',
    'achievements.objectives': 'Teilziele',
    'achievements.titleReward': 'Titel:',
    'achievements.mastery': 'Beherrschung',
    'achievements.nowActive': 'Jetzt aktiv',
    'achievements.inTime': 'in {time}',
    'achievements.chat': 'Chat',
    'achievements.waypoint': 'Wegmarke',
    'achievements.backToEvents': 'Zurück zur Event-Tafel',
    'achievements.synced': 'Synchronisiert mit Spielaccount',
    'achievements.apiHint': 'Tipp: Trage deinen GW2 API-Schlüssel in den Optionen ein, um deine persönlichen Erfolge live abzugleichen.',
    'achievements.commander': 'Kommandeur',

    // Crafting
    'crafting.title': 'Handwerk & Berufe',
    'crafting.disciplines': 'Handwerksberufe',
    'crafting.disciplinesCount': '{count} Disziplinen',
    'crafting.manuallySet': 'Manuell gesetzt',
    'crafting.levelZero': 'Stufe 0',
    'crafting.target': 'Ziel: {rank}',
    'crafting.plannerTab': 'Interaktiver Levelplaner',
    'crafting.discoveryTab': '✨ Entdeckungsrezepte',
    'crafting.recipesTab': 'Erlernte / Relevante Rezepte',
    'crafting.rankOf': 'Rang {rank} von {max}',
    'crafting.noCharacter': 'Kein Charakter mit diesem Beruf verknüpft',
    'crafting.tier': 'Rangstufe:',
    'crafting.jumpToRank': 'Zu Rang {rank} springen',
    'crafting.statusAll': 'Alle',
    'crafting.statusUndiscovered': 'Unentdeckt',
    'crafting.statusDiscovered': 'Entdeckt',
    'crafting.searchPlaceholder': 'Gegenstand oder Typ suchen...',
    'crafting.sortRatingAsc': 'Rang: aufsteigend',
    'crafting.sortRatingDesc': 'Rang: absteigend',
    'crafting.sortCostAsc': 'Herstellungskosten: günstigste',
    'crafting.sortUndiscoveredFirst': 'Unentdeckt zuerst',
    'crafting.guideTitle': 'Entdeckungs-Assistent',
    'crafting.guideBonus': '+100 % bis +200 % Bonus-Erfahrung bei Erstentdeckung',
    'crafting.formulaLabel': 'Kombination im Entdeckungsfenster:',
    'crafting.primary': '1. Primärteil:',
    'crafting.secondary': '2. Sekundärteil:',
    'crafting.modifier': '3. Veredler / Modifikator:',
    'crafting.tip': 'Tipp:',
    'crafting.statusBannerTitle': 'Entdeckungsstatus',
    'crafting.recipesFound': 'Entdeckungsrezepte gefunden',
    'crafting.materialValue': 'Materialwert:',
    'crafting.pricesLoading': 'Preise laden...',
    'crafting.chatCode': 'Chatcode',
    'crafting.details': 'Details',
    'crafting.inStock': 'Lager:',
    'crafting.missing': 'Fehlt im Lager',
    'crafting.prev': 'Vorherige',
    'crafting.next': 'Nächste',
    'crafting.fromRank': 'Von Rang:',
    'crafting.toRank': 'Bis Rang:',
    'crafting.allowDiscovery': 'Entdeckungsrezepte zulassen (+Bonus-EP)',
    'crafting.craftIntermediates': 'Zwischenprodukte selbst herstellen',
    'crafting.stepsTab': 'Level-Schritte',
    'crafting.shoppingTab': 'Einkaufsliste',
    'crafting.intermediatesTab': 'Zwischenprodukte',
    'crafting.totalCost': 'Gesamtkosten:',
    'crafting.recipesIntro': 'Zeigt Rezepte für {disc} bis Rang {rank}. Klicke auf ein Ergebnis oder eine Zutat für Details.',
    'crafting.discoveryRequired': 'Entdeckungsrezept erforderlich (an der Station erforschen)',
    'crafting.discoveryBonusPill': '+100%–200% Bonus-EP',
    'crafting.discoveryCombineInstruction': 'Im 2. Reiter der Station (Entdeckung) kombinieren:',
    'crafting.discoveryRepeatNote': 'Danach noch {count}× regulär im 1. Reiter herstellen',
    'crafting.discoverySingleCraftNote': '1× Entdeckung genügt für diesen Rangschritt',
    'crafting.searchNoResultsInTier': 'Keine Entdeckungen in Stufe „{tier}“ gefunden.',
    'crafting.searchCrossTierHits': '{count} passende Entdeckungen in anderen Stufen vorhanden.',
    'crafting.searchShowAllTiers': 'In allen Stufen suchen ({count})',
    'crafting.searchReset': 'Suche zurücksetzen',
    'crafting.noSearchResults': 'Keine Entdeckungsrezepte für diese Suchanfrage gefunden.',

    // Legendary
    'legendary.title': 'Legendäre Waffen & Rüstkammer',
    'legendary.allGens': 'Alle Generationen',
    'legendary.gen1': 'Generation 1 (Core)',
    'legendary.gen2': 'Generation 2 (HoT & PoF)',
    'legendary.gen3': 'Generation 3 (Aurene / EoD)',
    'legendary.gen4': 'Generation 4 (Janthir)',
    'legendary.allSlots': 'Alle Waffentypen',
    'legendary.slotOneHand': 'Einhandwaffen',
    'legendary.slotTwoHand': 'Zweihandwaffen',
    'legendary.slotOffHand': 'Nebenhandwaffen',
    'legendary.slotAquatic': 'Unterwasserwaffen',
    'legendary.trackedOnly': 'Verfolgt ({count})',
    'legendary.pinnedHeader': 'Verfolgte Waffen ({count})',
    'legendary.allWeaponsHeader': 'Alle Waffen ({count})',
    'legendary.searchPlaceholder': 'Waffe oder Typ suchen...',
    'legendary.unlockedInArmory': 'In Rüstkammer freigeschaltet',
    'legendary.progress': 'Fortschritt',
    'legendary.craftTree': 'Komponenten-Baum',
    'legendary.materialsBom': 'Materialien & BOM ({count})',
    'legendary.collections': 'Sammlungen',
    'legendary.notes': 'Hinweise & Herkunft',
    'legendary.track': 'Verfolgen',
    'legendary.tracking': 'Verfolgt',
    'legendary.reset': 'Zurücksetzen',
    'legendary.stepsDone': '{done} / {total} Hauptstufen fertig',
    'legendary.treeHint': 'Hierarchischer Herstellungsbaum: Markiere erledigte Teilkomponenten oder schalte auf „Kauf“ um, wenn du einen Gegenstand direkt über die Handelsgesellschaft beziehen möchtest.',
    'legendary.demand': 'Bedarf:',
    'legendary.storage': 'Lager:',
    'legendary.open': 'Offen:',
    'legendary.craftTimes': '({count}× herstellen)',
    'legendary.buyOption': 'Kaufen',
    'legendary.craftOption': 'Herstellen',
    'legendary.estimate': 'Schätzung',
    'legendary.purchase': 'Kauf',
    'legendary.allMaterials': 'Alle Materialien ({count})',
    'legendary.stillMissing': 'Noch fehlend ({count})',
    'legendary.complete': 'Vollständig vorhanden ({count})',
    'legendary.missingBuyCost': 'Offene Zukaufkosten:',
    'legendary.colDone': 'Erledigt',
    'legendary.colIcon': 'Icon',
    'legendary.colMaterial': 'Material',
    'legendary.colTotal': 'Gesamt',
    'legendary.colStorage': 'Lager',
    'legendary.colMissing': 'Fehlend',
    'legendary.colBuyNow': 'Sofortkauf',
    'legendary.colTotalCost': 'Gesamtkosten',
    'legendary.colSources': 'Beschaffungswege',

    // Settings
    'settings.title': 'Omnitria • Einstellungen',
    'settings.language': 'Sprache / Language',
    'settings.languageDesc': 'Wähle die Sprache für die Benutzeroberfläche, Gegenstandsnamen und Event-Timer.',
    'settings.german': 'Deutsch',
    'settings.english': 'English',
    'settings.apiKey': 'Guild Wars 2 API-Schlüssel (Erfolge live synchronisieren)',
    'settings.apiKeyDesc': 'Verbinde deinen offiziellen ArenaNet API-Schlüssel, um deinen echten Account-Namen, Erfolgspunkte und den Status deiner Weltenboss-Erfolge live in Omnitria anzuzeigen.',
    'settings.hideKey': 'Schlüssel verbergen',
    'settings.showKey': 'Schlüssel im Klartext anzeigen',
    'settings.sync': 'Synchronisieren',
    'settings.checking': 'Prüfe...',
    'settings.connected': 'Verbunden mit Account:',
    'settings.achievementsSynced': '{count} Account-Erfolge synchronisiert',
    'settings.commander': 'Kommandeur',
    'settings.noKeyActive': 'Noch kein API-Schlüssel aktiv. Omnitria zeigt Standard-Erfolge an.',
    'settings.createKeyLink': 'Eigenen API-Schlüssel auf account.arena.net erstellen',
    'settings.createKeyHint': '(Empfohlene Berechtigungen: account, progression, inventories, characters, wallet, unlocks)',
    'settings.faqTitle': 'Wie oft aktualisiert die Guild Wars 2 API?',
    'settings.faqTp': 'Handelsposten (TP-Preise):',
    'settings.faqTpDesc': 'ArenaNet-Server cachen TP-Preise für 1–5 Minuten (Cache-Header 300s). Omnitria fragt Preise bei Bedarf ab und puffert sie 15 Minuten lokal.',
    'settings.faqAcc': 'Account-Fortschritt & Erfolge:',
    'settings.faqAccDesc': 'ArenaNet-Server aktualisieren Account-Endpunkte alle 5 Minuten. Omnitria synchronisiert automatisch bei Start und alle 15 Minuten im Hintergrund (oder sofort per Klick auf „Synchronisieren“).',
    'settings.faqTimers': 'Event- & Weltenboss-Timer:',
    'settings.faqTimersDesc': 'Laufen in Echtzeit (sekundengenau). Basiert auf dem deterministischen 2-Stunden-Rotationszyklus von Tyria (völlig unabhängig von API-Latenzen).',
    'settings.faqImages': 'Bilder & Item-Katalog:',
    'settings.faqImagesDesc': 'Statische Daten & Grafiken von render.guildwars2.com werden dauerhaft für 14 Tage lokal gecacht und automatisch nachgeladen.',
    'settings.chatTemplate': 'Format der kopierten Chat-Nachricht',
    'settings.chatTemplateDesc': 'Dieses Format wird bei Klick auf „Nachricht senden“ direkt in den GW2-Kartenchat geschrieben:',
    'settings.tmplStandardTitle': 'Standard (Empfohlen für Karten- & Squad-Chat)',
    'settings.tmplCompactTitle': 'Kompakte Kurzform',
    'settings.tmplWaypointTitle': 'Nur Wegmarken-Code (Minimal)',
    'settings.tmplDetailedTitle': 'Detailliert mit Kategorie & Zone',
    'settings.opacity': 'Hintergrund-Deckkraft & Transparenz',
    'settings.opacityTransparent': '30% (Transparent)',
    'settings.opacitySolid': '100% (Solide)',
    'settings.sound': 'Audio & Sound-Feedback',
    'settings.soundDesc': 'Akustisches Glockenspiel beim Senden von Wegmarken abspielen',
    'settings.hotkeys': 'Tastaturkürzel & Bildschirmposition',
    'settings.hotkeyOverlay': 'Omnitria schnell ein- / ausblenden:',
    'settings.hotkeyClickthrough': 'Klick-Durchlässigkeit (Maus durchklicken):',
    'settings.resetPos': 'Standardposition über Chat (Unten-Links) wiederherstellen',
    'settings.doneClose': 'Fertig & Schließen',
  },
  en: {
    // Navigation
    'nav.events': 'Event Timers',
    'nav.waypoints': 'Waypoints',
    'nav.achievements': 'Achievements',
    'nav.crafting': 'Crafting & Disciplines',
    'nav.legendary': 'Legendary Weapons',
    'nav.settings': 'Settings',
    'nav.compact': 'Compact View',
    'nav.widget': 'In-Game Widget',
    'nav.pin': 'Always on Top',
    'nav.clickthrough': 'Click-Through Mode',

    // Events
    'events.searchPlaceholder': 'Search event or zone...',
    'events.all': 'All',
    'events.active': 'Active / Soon',
    'events.bosses': 'World Bosses',
    'events.metas': 'Meta Events',
    'events.sortTime': 'Time (Next first)',
    'events.sortGrouped': 'Grouped (Bosses / Metas)',
    'events.sortBossesFirst': 'World Bosses first',
    'events.sortMetasFirst': 'Meta Events first',
    'events.activeBadge': 'ACTIVE',
    'events.in': 'in',
    'events.endsIn': 'ends in',
    'events.sendChat': 'Post to Chat',
    'events.copyWaypoint': 'Copy Waypoint',
    'events.showMap': 'Show on Map',
    'events.copied': 'Copied!',
    'events.loot': 'Loot & Highlights',
    'events.tactics': 'Tactics & Tips',
    'events.achievements': 'Achievements',
    'events.empty': 'No events found matching your filter.',
    'events.resetFilter': 'Reset Filter',
    'events.groupBosses': 'World Bosses (Core & Hardcore)',
    'events.groupMetas': 'Meta Events (Expansions)',
    'events.teleportWaypoint': 'Waypoint Teleport',

    // Waypoints
    'waypoints.title': 'Waypoint Directory',
    'waypoints.subtitle': 'Quick access to all event and world boss waypoints across Tyria',
    'waypoints.searchPlaceholder': 'Search waypoint, zone or boss...',
    'waypoints.colCode': 'Code',
    'waypoints.colName': 'Waypoint Name',
    'waypoints.colZone': 'Zone / Map',
    'waypoints.colEvents': 'Associated Events / Bosses',
    'waypoints.colActions': 'Actions',
    'waypoints.empty': 'No waypoints found for this search query.',
    'waypoints.copy': 'Copy',
    'waypoints.chat': 'Chat',
    'waypoints.statusCount': '{count} waypoints available (Click code to copy directly into game)',

    // Achievements
    'achievements.title': 'Hero • Achievements',
    'achievements.searchPlaceholder': 'Search achievements, titles, objectives...',
    'achievements.all': 'All',
    'achievements.watchlist': 'Watchlist',
    'achievements.daily': 'Daily',
    'achievements.worldboss': 'World Bosses',
    'achievements.exploration': 'Exploration',
    'achievements.fractals': 'Fractals & Raids',
    'achievements.collections': 'Collections',
    'achievements.statusAll': 'All Status',
    'achievements.statusInProgress': 'In Progress',
    'achievements.statusCompleted': 'Completed',
    'achievements.statOverlay': 'Omnitria Achievements:',
    'achievements.statAvailableAp': 'Available AP:',
    'achievements.statDailyAp': 'Daily AP:',
    'achievements.emptyTitle': 'No achievements found',
    'achievements.emptyWatchlist': 'You have no achievements on your watchlist. Click the star on any achievement to track it here.',
    'achievements.emptyFilter': 'Adjust filters or search query to view matching achievements.',
    'achievements.resetFilter': 'Reset Filter',
    'achievements.objectives': 'Objectives',
    'achievements.titleReward': 'Title:',
    'achievements.mastery': 'Mastery',
    'achievements.nowActive': 'Active now',
    'achievements.inTime': 'in {time}',
    'achievements.chat': 'Chat',
    'achievements.waypoint': 'Waypoint',
    'achievements.backToEvents': 'Back to Event Timers',
    'achievements.synced': 'Synchronized with game account',
    'achievements.apiHint': 'Tip: Enter your GW2 API key in Settings to sync your account achievements live.',
    'achievements.commander': 'Commander',

    // Crafting
    'crafting.title': 'Crafting & Disciplines',
    'crafting.disciplines': 'Crafting Disciplines',
    'crafting.disciplinesCount': '{count} Disciplines',
    'crafting.manuallySet': 'Manually set',
    'crafting.levelZero': 'Level 0',
    'crafting.target': 'Target: {rank}',
    'crafting.plannerTab': 'Interactive Level Planner',
    'crafting.discoveryTab': '✨ Discovery Recipes',
    'crafting.recipesTab': 'Learned / Relevant Recipes',
    'crafting.rankOf': 'Rank {rank} of {max}',
    'crafting.noCharacter': 'No character linked with this discipline',
    'crafting.tier': 'Crafting Tier:',
    'crafting.jumpToRank': 'Jump to Rank {rank}',
    'crafting.statusAll': 'All',
    'crafting.statusUndiscovered': 'Undiscovered',
    'crafting.statusDiscovered': 'Discovered',
    'crafting.searchPlaceholder': 'Search item or type...',
    'crafting.sortRatingAsc': 'Rank: ascending',
    'crafting.sortRatingDesc': 'Rank: descending',
    'crafting.sortCostAsc': 'Crafting cost: lowest',
    'crafting.sortUndiscoveredFirst': 'Undiscovered first',
    'crafting.guideTitle': 'Discovery Assistant',
    'crafting.guideBonus': '+100% to +200% bonus XP on first discovery',
    'crafting.formulaLabel': 'Discovery panel combination:',
    'crafting.primary': '1. Primary component:',
    'crafting.secondary': '2. Secondary component:',
    'crafting.modifier': '3. Modifier / Inscription:',
    'crafting.tip': 'Tip:',
    'crafting.statusBannerTitle': 'Discovery Status',
    'crafting.recipesFound': 'discovery recipes found',
    'crafting.materialValue': 'Material value:',
    'crafting.pricesLoading': 'Loading prices...',
    'crafting.chatCode': 'Chat link',
    'crafting.details': 'Details',
    'crafting.inStock': 'Storage:',
    'crafting.missing': 'Missing in storage',
    'crafting.prev': 'Previous',
    'crafting.next': 'Next',
    'crafting.fromRank': 'From Rank:',
    'crafting.toRank': 'To Rank:',
    'crafting.allowDiscovery': 'Allow discovery recipes (+Bonus XP)',
    'crafting.craftIntermediates': 'Craft intermediate components',
    'crafting.stepsTab': 'Level Steps',
    'crafting.shoppingTab': 'Shopping List',
    'crafting.intermediatesTab': 'Intermediate Components',
    'crafting.totalCost': 'Total Cost:',
    'crafting.recipesIntro': 'Shows recipes for {disc} up to rank {rank}. Click on an item or ingredient for details.',
    'crafting.discoveryRequired': 'Discovery Recipe Required (Research at station)',
    'crafting.discoveryBonusPill': '+100%–200% Bonus XP',
    'crafting.discoveryCombineInstruction': 'Combine in 2nd station tab (Discovery):',
    'crafting.discoveryRepeatNote': 'Then craft {count}× normally in 1st tab',
    'crafting.discoverySingleCraftNote': '1× discovery is sufficient for this rank step',
    'crafting.searchNoResultsInTier': 'No discoveries found in tier "{tier}".',
    'crafting.searchCrossTierHits': '{count} matching discoveries found in other tiers.',
    'crafting.searchShowAllTiers': 'Search across all tiers ({count})',
    'crafting.searchReset': 'Reset search',
    'crafting.noSearchResults': 'No discovery recipes found matching your search.',

    // Legendary
    'legendary.title': 'Legendary Weapons & Armory',
    'legendary.allGens': 'All Generations',
    'legendary.gen1': 'Generation 1 (Core)',
    'legendary.gen2': 'Generation 2 (HoT & PoF)',
    'legendary.gen3': 'Generation 3 (Aurene / EoD)',
    'legendary.gen4': 'Generation 4 (Janthir)',
    'legendary.allSlots': 'All Weapon Types',
    'legendary.slotOneHand': 'One-Handed Weapons',
    'legendary.slotTwoHand': 'Two-Handed Weapons',
    'legendary.slotOffHand': 'Off-Hand Weapons',
    'legendary.slotAquatic': 'Aquatic Weapons',
    'legendary.trackedOnly': 'Tracked ({count})',
    'legendary.pinnedHeader': 'Tracked Weapons ({count})',
    'legendary.allWeaponsHeader': 'All Weapons ({count})',
    'legendary.searchPlaceholder': 'Search weapon or type...',
    'legendary.unlockedInArmory': 'Unlocked in Armory',
    'legendary.progress': 'Progress',
    'legendary.craftTree': 'Component Tree',
    'legendary.materialsBom': 'Materials & BOM ({count})',
    'legendary.collections': 'Collections',
    'legendary.notes': 'Notes & Sources',
    'legendary.track': 'Track',
    'legendary.tracking': 'Tracked',
    'legendary.reset': 'Reset',
    'legendary.stepsDone': '{done} / {total} main stages done',
    'legendary.treeHint': 'Hierarchical craft tree: Mark finished sub-components or toggle to "Buy" if you want to purchase an item directly on the Trading Post.',
    'legendary.demand': 'Demand:',
    'legendary.storage': 'Storage:',
    'legendary.open': 'Missing:',
    'legendary.craftTimes': '({count}× craft)',
    'legendary.buyOption': 'Buy directly',
    'legendary.craftOption': 'Craft yourself',
    'legendary.estimate': 'Estimate',
    'legendary.purchase': 'Purchase',
    'legendary.allMaterials': 'All Materials ({count})',
    'legendary.stillMissing': 'Still Missing ({count})',
    'legendary.complete': 'Fully in Stock ({count})',
    'legendary.missingBuyCost': 'Missing Purchase Cost:',
    'legendary.colDone': 'Done',
    'legendary.colIcon': 'Icon',
    'legendary.colMaterial': 'Material',
    'legendary.colTotal': 'Total',
    'legendary.colStorage': 'Storage',
    'legendary.colMissing': 'Missing',
    'legendary.colBuyNow': 'Buy Now',
    'legendary.colTotalCost': 'Total Cost',
    'legendary.colSources': 'Acquisition',

    // Settings
    'settings.title': 'Omnitria • Settings',
    'settings.language': 'Language / Sprache',
    'settings.languageDesc': 'Choose the display language for the user interface, item names, and event timers.',
    'settings.german': 'Deutsch',
    'settings.english': 'English',
    'settings.apiKey': 'Guild Wars 2 API Key (Live Sync Achievements)',
    'settings.apiKeyDesc': 'Connect your official ArenaNet API key to display your real account name, achievement points, and world boss progression live in Omnitria.',
    'settings.hideKey': 'Hide key',
    'settings.showKey': 'Show key',
    'settings.sync': 'Synchronize',
    'settings.checking': 'Checking...',
    'settings.connected': 'Connected to account:',
    'settings.achievementsSynced': '{count} account achievements synchronized',
    'settings.commander': 'Commander',
    'settings.noKeyActive': 'No API key active yet. Omnitria displays default achievements.',
    'settings.createKeyLink': 'Create your own API key on account.arena.net',
    'settings.createKeyHint': '(Recommended permissions: account, progression, inventories, characters, wallet, unlocks)',
    'settings.faqTitle': 'How often does the Guild Wars 2 API update?',
    'settings.faqTp': 'Trading Post (TP Prices):',
    'settings.faqTpDesc': 'ArenaNet servers cache TP prices for 1–5 minutes (300s cache header). Omnitria queries on demand and caches locally for 15 minutes.',
    'settings.faqAcc': 'Account Progress & Achievements:',
    'settings.faqAccDesc': 'ArenaNet servers refresh account endpoints every 5 minutes. Omnitria syncs on startup and every 15 minutes in the background (or immediately when clicking "Synchronize").',
    'settings.faqTimers': 'Event & World Boss Timers:',
    'settings.faqTimersDesc': 'Run in real-time (second-accurate). Based on the deterministic 2-hour rotation cycle of Tyria (completely independent of API latency).',
    'settings.faqImages': 'Images & Item Catalog:',
    'settings.faqImagesDesc': 'Static data & graphics from render.guildwars2.com are cached locally for 14 days and reloaded automatically.',
    'settings.chatTemplate': 'Copied Chat Message Format',
    'settings.chatTemplateDesc': 'This format is sent directly to the GW2 map chat when clicking "Post to Chat":',
    'settings.tmplStandardTitle': 'Standard (Recommended for Map & Squad Chat)',
    'settings.tmplCompactTitle': 'Compact Short Form',
    'settings.tmplWaypointTitle': 'Waypoint Code Only (Minimal)',
    'settings.tmplDetailedTitle': 'Detailed with Category & Zone',
    'settings.opacity': 'Background Opacity & Transparency',
    'settings.opacityTransparent': '30% (Transparent)',
    'settings.opacitySolid': '100% (Solid)',
    'settings.sound': 'Audio & Sound Feedback',
    'settings.soundDesc': 'Play chime sound when sending waypoints to chat',
    'settings.hotkeys': 'Keyboard Shortcuts & Window Position',
    'settings.hotkeyOverlay': 'Toggle Omnitria visibility:',
    'settings.hotkeyClickthrough': 'Click-through mode (Mouse click-through):',
    'settings.resetPos': 'Reset to default position above chat (Bottom-Left)',
    'settings.doneClose': 'Done & Close',
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)['de'];

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const lang = getLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.de;
  let text: string = (dict as Record<string, string>)[key] || (TRANSLATIONS.de as Record<string, string>)[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}

export function useTranslation() {
  const lang = useLanguage();
  return {
    t: (key: TranslationKey, params?: Record<string, string | number>) => t(key, params),
    lang,
    setLanguage,
  };
}
