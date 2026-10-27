/**
 * Smart Objective Advisor
 *
 * Rule-based tactical objective advisor for Guild Wars 2 WvW.
 * Computes transparent priority scores (0-100) for sensible next objectives
 * considering match standings, point values, vulnerability (RI / T0),
 * territorial control, and guild fortifications.
 */

import type {
  WvwCombinedObjective,
  WvwMatch,
  WvwTeam,
  AdvisorConfig,
  TacticalRecommendation,
  FactorBreakdown,
} from './types.ts';
import {
  OBJECTIVE_BASE_STRATEGIC_VALUES,
  HOME_MAP_FOR_TEAM,
} from './constants.ts';

/**
 * Determines placement and score difference across all three teams.
 */
function analyzeMatchStandings(match: WvwMatch, playerTeam: WvwTeam) {
  const teams: Array<{ team: WvwTeam; score: number; victoryPoints: number }> = [
    { team: 'Red', score: match.scores.red, victoryPoints: match.victory_points?.red ?? 0 },
    { team: 'Blue', score: match.scores.blue, victoryPoints: match.victory_points?.blue ?? 0 },
    { team: 'Green', score: match.scores.green, victoryPoints: match.victory_points?.green ?? 0 },
  ];

  // Sort by total score (on tie by victory points)
  teams.sort((a, b) => b.score - a.score || b.victoryPoints - a.victoryPoints);

  const leader = teams[0];
  const second = teams[1];
  const third = teams[2];

  const ownStanding = teams.find((t) => t.team === playerTeam) ?? teams[0];
  const leaderScore = leader.score;
  const ownScore = ownStanding.score;
  const scoreDeficit = Math.max(0, leaderScore - ownScore);

  const isLeader = leader.team === playerTeam;
  const playerRank = teams.findIndex((t) => t.team === playerTeam) + 1;

  return {
    leaderTeam: leader.team,
    secondTeam: second.team,
    thirdTeam: third.team,
    scoreDeficit,
    isLeader,
    playerRank,
    maxScore: Math.max(leaderScore, 1),
  };
}

/**
 * Computes the factors and priority score of an individual objective.
 */
export function evaluateObjective(
  obj: WvwCombinedObjective,
  match: WvwMatch,
  config: AdvisorConfig,
  lang: 'de' | 'en' = 'de',
  cachedStandings?: ReturnType<typeof analyzeMatchStandings>,
  lastUpdatedDate: Date | null = null,
  isDataStale = false,
): TacticalRecommendation {
  const { weights, playerTeam, ignoredObjectiveIds, pinnedObjectiveIds } = config;
  const isPinned = pinnedObjectiveIds.includes(obj.id);
  const isIgnored = ignoredObjectiveIds.includes(obj.id);

  const standings = cachedStandings ?? analyzeMatchStandings(match, playerTeam);
  const isGerman = lang === 'de';

  const reasons: string[] = [];
  const reasonsEn: string[] = [];
  const uncertaintyNotes: string[] = [];
  const uncertaintyNotesEn: string[] = [];

  const addReason = (de: string, en: string) => {
    reasons.push(isGerman ? de : en);
    reasonsEn.push(en);
  };

  const addUncertainty = (de: string, en: string) => {
    uncertaintyNotes.push(isGerman ? de : en);
    uncertaintyNotesEn.push(en);
  };

  // =========================================================================
  // Faktor 1: Strategischer Basiswert (PPT & Strukturtyp)
  // =========================================================================
  const baseTypeScore = OBJECTIVE_BASE_STRATEGIC_VALUES[obj.type] ?? 20;
  // Additional PPT bonus: 1 PPT corresponds to ~2.5 points
  const pptBonus = Math.min(20, (obj.pointsTick || 0) * 2.5);
  const rawStrategicBase = Math.min(100, baseTypeScore * 0.8 + pptBonus);

  if (obj.type === 'Castle') {
    addReason(
      `Schloss Steinnebel (+${obj.pointsTick} PPT): Höchste strategische Priorität & zentrale Wegmarken-Dominanz.`,
      `Stonemist Castle (+${obj.pointsTick} PPT): Supreme strategic priority and central waypoint control.`,
    );
  } else if (obj.type === 'Keep') {
    addReason(
      `Feste (+${obj.pointsTick} PPT): Wesentlicher Versorgungsstützpunkt und Wegmarken-Knotenpunkt.`,
      `Keep (+${obj.pointsTick} PPT): Major supply hub and critical waypoint stronghold.`,
    );
  } else if (obj.type === 'Tower') {
    addReason(
      `Turm (+${obj.pointsTick} PPT): Wichtige Wegabsicherung und territoriale Barriere.`,
      `Tower (+${obj.pointsTick} PPT): Territory choke point and logistical barrier.`,
    );
  } else if (obj.type === 'Camp') {
    addReason(
      `Nachschublager (+${obj.pointsTick} PPT): Schnelle Eroberung; unterbindet feindliche Dolyak-Karawanen.`,
      `Supply Camp (+${obj.pointsTick} PPT): Fast flip; starves enemy dolyak caravans.`,
    );
  }

  // =========================================================================
  // Faktor 2: Spitzenreiter- & Tabellenschwung (Leader Swing)
  // =========================================================================
  let rawLeaderSwing = 30; // Baseline for neutral or equal standing objectives
  if (obj.owner === standings.leaderTeam && !standings.isLeader) {
    // Objective belongs to leader and we are trailing -> Maximum relative score swing!
    const relativeDeficit = Math.min(1, standings.scoreDeficit / (standings.maxScore * 0.3 || 1));
    rawLeaderSwing = Math.round(75 + relativeDeficit * 25);
    addReason(
      `Ziel im Besitz des Tabellenführers (${obj.owner}): Entzug bremst deren Punktevorsprung maximal ab.`,
      `Held by match leader (${obj.owner}): Flipping this directly curbs their score advance.`,
    );
  } else if (obj.owner === standings.leaderTeam && standings.isLeader) {
    // Defend our own lead
    rawLeaderSwing = 50;
  } else if (obj.owner === 'Neutral') {
    rawLeaderSwing = 40;
    addReason(
      'Neutrales Ziel: Keine Gegenwehr feindlicher Garnisonen.',
      'Neutral objective: No enemy defending garrison.',
    );
  } else {
    // Objective belongs to third team
    rawLeaderSwing = 35;
  }

  // =========================================================================
  // Faktor 3: Verwundbarkeit & Ausbaugrad (RI-Buff, T0-Gelegenheit, T3-Befestigung)
  // =========================================================================
  let rawVulnerability = 50;
  if (obj.isRiActive) {
    // Righteous Indignation (RI) active: Supervisor immune, CANNOT BE CAPTURED!
    rawVulnerability = 2; // Massive Strafe
    const remMin = Math.floor(obj.riSecondsRemaining / 60);
    const remSec = obj.riSecondsRemaining % 60;
    addReason(
      `⚠️ Rechtschaffene Entrüstung (RI) aktiv: Aufseher ist noch ${remMin}m ${remSec}s unbesiegbar!`,
      `⚠️ Righteous Indignation (RI) active: Supervisor is invulnerable for ${remMin}m ${remSec}s!`,
    );
  } else if (obj.secondsSinceFlip !== null && obj.secondsSinceFlip < 1200) {
    // 5 to 20 minutes after flip: Perfect assault window!
    // Fresh T0 state, minimal supplies, wooden walls, no defensive siege
    rawVulnerability = 95;
    const minsAgo = Math.floor(obj.secondsSinceFlip / 60);
    addReason(
      `🔥 Vor ${minsAgo} Min. erobert (T0): Kaum Vorräte, schwache Holztore, optimales Angriffsfenster.`,
      `🔥 Flipped ${minsAgo}m ago (T0): Low supply, fragile wooden gates, prime assault opportunity.`,
    );
  } else if (obj.guildUpgrades.length >= 3 || obj.yaksDelivered > 60) {
    // Ausgebaute Festung (T2/T3)
    rawVulnerability = 25;
    addReason(
      `🛡️ Stark befestigt (${obj.guildUpgrades.length} Upgrades): Erfordert schwere Belagerungsgeräte (Rammen/Trebuchets).`,
      `🛡️ Fortified structure (${obj.guildUpgrades.length} upgrades): Requires coordinated heavy siege weapons.`,
    );
  } else {
    // Normaler Zustand
    rawVulnerability = 55;
  }

  // =========================================================================
  // Faktor 4: Territoriale Lage & Grenzland-Sicherung
  // =========================================================================
  let rawTerritoryContext = 40;
  const homeMap = HOME_MAP_FOR_TEAM[playerTeam];

  if (obj.mapType === homeMap && obj.owner !== playerTeam) {
    // Enemy on our home borderland: Highest urgency for recapture!
    rawTerritoryContext = 95;
    addReason(
      `🚨 Feindliche Präsenz auf unserem Heimat-Grenzland: Sofortige Bereinigung sichert eigene Nachschubwege!`,
      `🚨 Enemy presence on our Home Borderland: Immediate reclaim restores vital domestic supply!`,
    );
  } else if (obj.mapType === 'Center') {
    // Eternal Battlegrounds: Constant combat zone
    rawTerritoryContext = 65;
  } else {
    // Feindliches Grenzland
    rawTerritoryContext = 45;
  }

  // =========================================================================
  // Faktor 5: Gildenbeanspruchung & Taktiken
  // =========================================================================
  let rawGuildStatus = 50;
  if (obj.guildInfo) {
    // Claimed by known guild: possible tactics (e.g. Dragon Banner, Emergency Waypoint)
    rawGuildStatus = 35;
    addReason(
      `Beansprucht von [${obj.guildInfo.tag}] ${obj.guildInfo.name} (mögliche defensive Gildentaktiken).`,
      `Claimed by [${obj.guildInfo.tag}] ${obj.guildInfo.name} (active guild defensive tactics likely).`,
    );
  } else {
    // Unbeansprucht: keine Gilden-Buffs
    rawGuildStatus = 75;
  }

  // =========================================================================
  // Gewichtete Gesamtpunktzahl berechnen (0 bis 100)
  // =========================================================================
  const totalWeight =
    weights.baseStrategicWeight +
    weights.leaderSwingWeight +
    weights.vulnerabilityWeight +
    weights.territoryWeight +
    weights.guildDefenseWeight || 100;

  let weightedScore =
    (rawStrategicBase * weights.baseStrategicWeight +
      rawLeaderSwing * weights.leaderSwingWeight +
      rawVulnerability * weights.vulnerabilityWeight +
      rawTerritoryContext * weights.territoryWeight +
      rawGuildStatus * weights.guildDefenseWeight) /
    totalWeight;

  // When RI is active, priority cannot exceed 25
  if (obj.isRiActive) {
    weightedScore = Math.min(25, weightedScore * 0.3);
  }

  // Pinned bonus for sorting
  if (isPinned) {
    weightedScore = Math.min(100, weightedScore + 8);
  }

  // Ignored objectives are zeroed out numerically
  if (isIgnored) {
    weightedScore = 0;
  }

  const priorityScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

  // =========================================================================
  // Data quality & uncertainty assessment
  // =========================================================================
  let dataQuality = 90;
  if (!obj.lastFlipped) {
    dataQuality -= 25;
    addUncertainty(
      'Kein Zeitstempel des letzten Flips verfügbar (API-Einschränkung).',
      'No last-flip timestamp available (API limitation).',
    );
  }

  if (obj.owner === 'Neutral') {
    dataQuality += 5;
  }

  addUncertainty(
    'Taktische Priorität ist eine algorithmische Schätzung basierend auf öffentlich einsehbaren Strukturdaten (PPT, RI-Timer, Upgrades).',
    'Tactical priority is an algorithmic heuristic/estimate based on public structure data (PPT, RI timer, upgrades).'
  );
  addUncertainty(
    'Verborgene Gegnerpositionen, Zerg-Größen und Verteidigungsaufgebote sind in der öffentlichen API aus Fairplay-Gründen nicht enthalten (vor Ort scouten!).',
    'Hidden enemy player counts, zerg locations, and defensive readiness are not disclosed by the public API for fair play (scout on site!).'
  );
  if (isDataStale) {
    addUncertainty(
      '⚠️ Datenstand ist veraltet (> 90s). Berechnungen basieren auf zwischengespeicherten Daten.',
      '⚠️ Data is stale (> 90s). Calculations are based on cached information.'
    );
  }

  const factors: FactorBreakdown = {
    strategicBase: Math.round(rawStrategicBase),
    leaderSwing: Math.round(rawLeaderSwing),
    vulnerability: Math.round(rawVulnerability),
    territoryContext: Math.round(rawTerritoryContext),
    guildStatus: Math.round(rawGuildStatus),
  };

  return {
    objective: obj,
    priorityScore,
    factors,
    reasons,
    reasonsEn,
    riActive: obj.isRiActive,
    riSecondsRemaining: obj.riSecondsRemaining,
    dataQuality: Math.max(20, Math.min(100, dataQuality)),
    uncertaintyNotes,
    uncertaintyNotesEn,
    isPinned,
    isIgnored,
    dataSource: 'Offizielle GW2-API (/v2/wvw/matches)',
    isStale: isDataStale,
    lastUpdated: lastUpdatedDate,
    isEstimated: true,
  };
}

/**
 * Generates the full ranking and selects top 3 candidates.
 * Includes hysteresis stabilization against flickering between ticks.
 */
export function generateTacticalRecommendations(
  objectives: WvwCombinedObjective[],
  match: WvwMatch,
  config: AdvisorConfig,
  previousTopIdsOrLang: string[] | 'de' | 'en' = [],
  langOpt: 'de' | 'en' = 'de',
  lastUpdatedDate: Date | null = null,
  isDataStale = false,
): {
  topRecommendations: TacticalRecommendation[];
  alternativeRecommendations: TacticalRecommendation[];
  allRanked: TacticalRecommendation[];
} {
  const previousTopIds = Array.isArray(previousTopIdsOrLang) ? previousTopIdsOrLang : [];
  const lang = typeof previousTopIdsOrLang === 'string' ? previousTopIdsOrLang : langOpt;
  const { playerTeam, filterMap, filterType } = config;

  // Only evaluate objectives that do NOT belong to our team (assault / recapture)
  // and are not simple spawn points
  const candidates = objectives.filter((o) => {
    if (o.type === 'Spawn') return false;
    if (o.owner === playerTeam) return false;

    // Filter anwenden
    if (filterMap !== 'all' && o.mapType !== filterMap) return false;
    if (filterType !== 'all' && o.type !== filterType) return false;

    return true;
  });

  const standings = analyzeMatchStandings(match, playerTeam);
  const previousTopSet = new Set(previousTopIds);

  const evaluated: { rec: TacticalRecommendation; score: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const rec = evaluateObjective(candidates[i], match, config, lang, standings, lastUpdatedDate, isDataStale);
    const wasInTop = previousTopSet.has(rec.objective.id);
    const score = wasInTop && !rec.isIgnored && !rec.riActive ? rec.priorityScore + 4 : rec.priorityScore;
    evaluated.push({ rec, score });
  }

  // Single-pass sort:
  // 1. Non-ignored before ignored
  // 2. Favoriten (isPinned)
  // 3. Stabilized priority score descending
  // 4. On tie: higher PPT value
  evaluated.sort((a, b) => {
    if (a.rec.isIgnored && !b.rec.isIgnored) return 1;
    if (!a.rec.isIgnored && b.rec.isIgnored) return -1;
    if (a.rec.isPinned && !b.rec.isPinned) return -1;
    if (!a.rec.isPinned && b.rec.isPinned) return 1;
    if (b.score !== a.score) return b.score - a.score;
    return b.rec.objective.pointsTick - a.rec.objective.pointsTick;
  });

  const finalSorted = evaluated.map((s) => s.rec);

  // Select top 3
  const topRecommendations = finalSorted.slice(0, 3);
  const alternativeRecommendations = finalSorted.slice(3);

  // Detect significant status changes (e.g. newly entering top 3)
  for (const rec of topRecommendations) {
    const isNew = previousTopIds.length > 0 && !previousTopIds.includes(rec.objective.id);
    rec.isNewOrChanged = isNew;
    if (isNew) {
      rec.changeBadge = lang === 'de' ? 'Neu aufgestiegen' : 'Newly Promoted';
      rec.changeBadgeEn = 'Newly Promoted';
    }
  }

  return {
    topRecommendations,
    alternativeRecommendations,
    allRanked: finalSorted,
  };
}
