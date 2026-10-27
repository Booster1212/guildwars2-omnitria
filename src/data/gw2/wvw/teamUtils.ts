/**
 * WvW Team- & Welten-Hilfsfunktionen
 * Resolves GW2 server IDs and World Restructuring teams (/v2/worlds, match.worlds, match.all_worlds)
 * cleanly into readable names.
 */

import type { WvwTeam, WvwObjectiveOwner, WvwMatch, WvwWorld } from './types.ts';

export interface ResolvedTeamInfo {
  team: WvwTeam;
  mainName: string;
  linkedNames: string[];
  fullName: string;
  shortName: string;
}

/**
 * Determines the primary server name and linked worlds for a team.
 */
export function resolveTeamNames(
  team: WvwTeam,
  match: WvwMatch | null,
  worldsMap: Map<number, WvwWorld>,
): ResolvedTeamInfo {
  const teamKey = team.toLowerCase() as 'red' | 'blue' | 'green';

  if (!match) {
    return {
      team,
      mainName: team,
      linkedNames: [],
      fullName: team,
      shortName: team,
    };
  }

  const primaryWorldId = match.worlds?.[teamKey];
  const allWorldIds = match.all_worlds?.[teamKey] || (primaryWorldId ? [primaryWorldId] : []);

  const primaryWorld = primaryWorldId ? worldsMap.get(primaryWorldId) : undefined;
  const mainName = primaryWorld?.name || (primaryWorldId ? `Welt ${primaryWorldId}` : team);

  // Find linked worlds (all from all_worlds except primary, existing in worldsMap)
  const linkedNames: string[] = [];
  for (const wid of allWorldIds) {
    if (wid !== primaryWorldId) {
      const w = worldsMap.get(wid);
      if (w && w.name && !linkedNames.includes(w.name)) {
        linkedNames.push(w.name);
      }
    }
  }

  let fullName = mainName;
  if (linkedNames.length > 0) {
    fullName = `${mainName} (+ ${linkedNames.join(', ')})`;
  }

  return {
    team,
    mainName,
    linkedNames,
    fullName,
    shortName: mainName,
  };
}

/**
 * Returns a readable owner name with team color and world name.
 * E.g. "Red (Far Shiverpeaks)" or "Blue (Vabbi)"
 */
export function getOwnerDisplayName(
  owner: WvwObjectiveOwner,
  match: WvwMatch | null,
  worldsMap: Map<number, WvwWorld>,
  lang: 'de' | 'en' = 'de',
): string {
  if (owner === 'Neutral') {
    return lang === 'de' ? 'Neutral' : 'Neutral';
  }

  const team = owner as WvwTeam;
  const teamLabel = lang === 'de'
    ? (team === 'Red' ? 'Rot' : team === 'Blue' ? 'Blau' : 'Grün')
    : team;

  const info = resolveTeamNames(team, match, worldsMap);
  if (info.mainName && info.mainName !== team) {
    return `${teamLabel} (${info.mainName})`;
  }

  return teamLabel;
}

/**
 * Formats the match option for dropdown including server names.
 * Z.B. "EU Tier 1: Ferne Zittergipfel vs. Vaabi vs. Riss d. Kummers"
 */
export function formatMatchOptionLabel(
  matchId: string,
  match: WvwMatch | null,
  worldsMap: Map<number, WvwWorld>,
): string {
  const isEu = matchId.startsWith('2-');
  const tier = matchId.split('-')[1] || '1';
  const region = isEu ? 'EU' : 'NA';
  const baseLabel = `${region} Tier ${tier} (${matchId})`;

  if (!match || match.id !== matchId) {
    return baseLabel;
  }

  const red = resolveTeamNames('Red', match, worldsMap).mainName;
  const blue = resolveTeamNames('Blue', match, worldsMap).mainName;
  const green = resolveTeamNames('Green', match, worldsMap).mainName;

  if (red !== 'Red' && blue !== 'Blue' && green !== 'Green') {
    return `${region} T${tier}: ${red} / ${blue} / ${green}`;
  }

  return baseLabel;
}

/**
 * Reliably checks which team a given world ID belongs to.
 */
export function detectPlayerTeamFromWorld(
  userWorldId: number,
  match: WvwMatch | null,
): WvwTeam | null {
  if (!match || !userWorldId) return null;

  // 1. In all_worlds suchen
  if (match.all_worlds?.red?.includes(userWorldId) || match.worlds?.red === userWorldId) {
    return 'Red';
  }
  if (match.all_worlds?.blue?.includes(userWorldId) || match.worlds?.blue === userWorldId) {
    return 'Blue';
  }
  if (match.all_worlds?.green?.includes(userWorldId) || match.worlds?.green === userWorldId) {
    return 'Green';
  }

  return null;
}
