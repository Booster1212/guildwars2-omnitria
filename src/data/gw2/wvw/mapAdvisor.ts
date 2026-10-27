/**
 * WvW Map Advisor (Karten-Empfehlung)
 * Analyzes all 4 WvW maps (Eternal Battlegrounds and the 3 borderlands)
 * and evaluates where players currently find highest activity and maximum
 * WvXP- sowie WvBP-Ertrag (Belohnungspfad-Teilnahme Stufe 6) erzielen kann.
 */

import type {
  WvwCombinedObjective,
  WvwMapType,
  WvwTeam,
  WvwObservedFlip,
  WvwMatch,
} from './types.ts';

export interface MapOpportunityStats {
  enemyCampsAvailable: number;
  enemyTowersAvailable: number;
  enemyKeepsAvailable: number;
  castleAvailable: boolean;
  activeRiCount: number;
  t0VulnerableCount: number;
  recentFlipsCount: number;
  ourLostObjectives: number;
}

export interface MapRecommendation {
  mapType: WvwMapType;
  mapNameDe: string;
  mapNameEn: string;
  score: number; // 0 - 100 overall score for deployment recommendation
  xpPotentialScore: number; // 0 - 100
  activityScore: number; // 0 - 100
  badgeDe: string;
  badgeEn: string;
  reasonsDe: string[];
  reasonsEn: string[];
  stats: MapOpportunityStats;
}

const MAP_NAMES: Record<WvwMapType, { de: string; en: string }> = {
  Center: { de: 'Ewige Schlachtfelder (EBG)', en: 'Eternal Battlegrounds (EBG)' },
  RedHome: { de: 'Rotes Grenzland', en: 'Red Borderlands' },
  BlueHome: { de: 'Blaues Grenzland', en: 'Blue Borderlands' },
  GreenHome: { de: 'Grünes Grenzland', en: 'Green Borderlands' },
};

/**
 * Evaluates all 4 WvW maps and returns a sorted list of best deployment maps.
 */
export function evaluateMapOpportunities(
  objectives: WvwCombinedObjective[],
  playerTeam: WvwTeam,
  sessionFlips: WvwObservedFlip[] = [],
  match: WvwMatch | null = null,
): MapRecommendation[] {
  const mapTypes: WvwMapType[] = ['Center', 'RedHome', 'BlueHome', 'GreenHome'];

  const results: MapRecommendation[] = mapTypes.map((mapType) => {
    const mapObjs = objectives.filter((o) => o.mapType === mapType);
    const mapFlips = sessionFlips.filter((f) => f.mapType === mapType);

    let enemyCampsAvailable = 0;
    let enemyTowersAvailable = 0;
    let enemyKeepsAvailable = 0;
    let castleAvailable = false;
    let activeRiCount = 0;
    let t0VulnerableCount = 0;
    let ourLostObjectives = 0;

    // Check if this is own home map
    const isOurHomeMap =
      (playerTeam === 'Red' && mapType === 'RedHome') ||
      (playerTeam === 'Blue' && mapType === 'BlueHome') ||
      (playerTeam === 'Green' && mapType === 'GreenHome');

    // Analyze all objectives on this map
    for (const obj of mapObjs) {
      const isOurs = obj.owner === playerTeam;
      const isEnemyOrNeutral = !isOurs;

      if (obj.isRiActive) {
        activeRiCount++;
      } else {
        // Ziel ist angreifbar (kein RI-Schutz)
        if (isEnemyOrNeutral) {
          if (obj.type === 'Castle') castleAvailable = true;
          else if (obj.type === 'Keep') enemyKeepsAvailable++;
          else if (obj.type === 'Tower') enemyTowersAvailable++;
          else if (obj.type === 'Camp') enemyCampsAvailable++;
        }
      }

      // T0 vulnerability (5-20 minutes after flip, wooden gates, low supplies)
      if (isEnemyOrNeutral && obj.secondsSinceFlip !== null) {
        if (obj.secondsSinceFlip >= 300 && obj.secondsSinceFlip <= 1200) {
          t0VulnerableCount++;
        }
      }

      // Enemy positions on own home map
      if (isOurHomeMap && isEnemyOrNeutral && (obj.type === 'Tower' || obj.type === 'Keep' || obj.type === 'Camp')) {
        ourLostObjectives++;
      }
    }

    // 1. XP-Potenzial (0 - 100)
    // Schloss Steinnebel (EBG): enormer XP-Schub (+35)
    // Keeps: +15 each, Towers: +8 each, Camps: +4 each (quick T6 participation)
    let rawXp = 0;
    if (castleAvailable) rawXp += 35;
    rawXp += enemyKeepsAvailable * 15;
    rawXp += enemyTowersAvailable * 8;
    rawXp += enemyCampsAvailable * 4;
    rawXp += t0VulnerableCount * 6; // Fresh T0 can be captured fastest for full XP
    const xpPotentialScore = Math.min(100, Math.round(rawXp));

    // 2. Activity score (0 - 100)
    // Based on observed flips, EBG hotspot, and upcoming rotations
    let rawActivity = 20; // Base activity
    if (mapType === 'Center') rawActivity += 25; // EBG naturally has the highest player and combat density
    rawActivity += mapFlips.length * 10; // Each recently observed flip indicates active skirmishes
    rawActivity += (enemyCampsAvailable + enemyTowersAvailable) * 4;
    if (ourLostObjectives > 0) rawActivity += ourLostObjectives * 8; // Heimatverteidigung zieht Truppen an
    const activityScore = Math.min(100, Math.round(rawActivity));

    // 3. Overall score (Weighted: 55% WvXP/WvBP potential + 45% activity/accessibility)
    let totalScore = Math.round(xpPotentialScore * 0.55 + activityScore * 0.45);

    // If nearly everything is under RI, the map is temporarily paralyzed
    if (activeRiCount >= 6 && enemyCampsAvailable === 0 && enemyTowersAvailable === 0) {
      totalScore = Math.max(10, totalScore - 25);
    }

    // Formulate reasoning & badges
    const reasonsDe: string[] = [];
    const reasonsEn: string[] = [];

    if (castleAvailable) {
      reasonsDe.push('Steinnebel-Schloss (SMC) angreifbar – maximaler WvXP- & Beute-Ertrag');
      reasonsEn.push('Stonemist Castle (SMC) open – maximum WvXP and loot event');
    }
    if (t0VulnerableCount >= 2) {
      reasonsDe.push(`${t0VulnerableCount} frische T0-Ziele ohne Ausbau (schnelle Einnahme)`);
      reasonsEn.push(`${t0VulnerableCount} fresh T0 objectives with low defense`);
    }
    if (enemyCampsAvailable >= 3) {
      reasonsDe.push(`${enemyCampsAvailable} Lager ohne RI-Schutz (garantiert permanente Stufe 6 Teilnahme)`);
      reasonsEn.push(`${enemyCampsAvailable} camps ready (easy tier 6 participation refresh)`);
    }
    if (enemyKeepsAvailable >= 2) {
      reasonsDe.push(`${enemyKeepsAvailable} feindliche Festen ohne RI-Schutz für hohe Gruppen-XP`);
      reasonsEn.push(`${enemyKeepsAvailable} enemy keeps available for large group XP`);
    }
    if (isOurHomeMap && ourLostObjectives >= 2) {
      reasonsDe.push(`${ourLostObjectives} verlorene Heimat-Stellungen (schnelle Verteidigungs-Events & Wegmarken)`);
      reasonsEn.push(`${ourLostObjectives} fallen home objectives to reclaim (defensive events)`);
    }
    if (mapFlips.length >= 2) {
      reasonsDe.push(`Hohe Gefechtsdichte (${mapFlips.length} Flips in dieser Sitzung erfasst)`);
      reasonsEn.push(`High combat action (${mapFlips.length} recent flips logged)`);
    }

    if (reasonsDe.length === 0) {
      reasonsDe.push('Solide Standardziele für kontinuierliche Teilnahme');
      reasonsEn.push('Standard targets available for steady participation');
    }

    let badgeDe = 'Gute Wahl';
    let badgeEn = 'Good Choice';
    if (totalScore >= 80) {
      badgeDe = mapType === 'Center' ? '🔥 Brennpunkt & Top-WvXP' : '⭐ Top-Empfehlung';
      badgeEn = mapType === 'Center' ? '🔥 Hotspot & Max WvXP' : '⭐ Top Recommendation';
    } else if (totalScore >= 60) {
      badgeDe = '⚡ Schnelle Teilnahme';
      badgeEn = '⚡ Fast Participation';
    } else {
      badgeDe = 'Ruhige Zone';
      badgeEn = 'Quiet Zone';
    }

    return {
      mapType,
      mapNameDe: MAP_NAMES[mapType].de,
      mapNameEn: MAP_NAMES[mapType].en,
      score: totalScore,
      xpPotentialScore,
      activityScore,
      badgeDe,
      badgeEn,
      reasonsDe,
      reasonsEn,
      stats: {
        enemyCampsAvailable,
        enemyTowersAvailable,
        enemyKeepsAvailable,
        castleAvailable,
        activeRiCount,
        t0VulnerableCount,
        recentFlipsCount: mapFlips.length,
        ourLostObjectives,
      },
    };
  });

  // Sort by overall score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}
