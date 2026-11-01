/**
 * Discipline facts shared by the planner, the GW2Crafts benchmark and the UI.
 *
 * Maximum ranks were verified against the official recipe database (/v2/recipes): the highest
 * `min_rating` per discipline is 500 for all disciplines except Jeweler (400) and Scribe (400,
 * not part of Omnitria's eight tracked disciplines).
 */
import type { DisciplineId } from './types.ts';

export const DISCIPLINE_MAX_RANK: Readonly<Record<DisciplineId, number>> = {
  Armorsmith: 500,
  Weaponsmith: 500,
  Artificer: 500,
  Huntsman: 500,
  Leatherworker: 500,
  Tailor: 500,
  Chef: 500,
  Jeweler: 400,
};

/**
 * Highest rank that can be reached by ordinary crafting routes. Cooking ranks above 450 are not
 * covered by regular crafting guides (GW2Crafts only publishes cooking guides up to 450) and are
 * obtained through the in-game Gourmet Training questline instead.
 */
export const DISCIPLINE_CRAFTING_ROUTE_CAP: Readonly<Record<DisciplineId, number>> = {
  ...DISCIPLINE_MAX_RANK,
  Chef: 450,
};

export function getDisciplineMaxRank(discipline: string): number {
  return (DISCIPLINE_MAX_RANK as Record<string, number>)[discipline] ?? 500;
}

export function getCraftingRouteCap(discipline: string): number {
  return (DISCIPLINE_CRAFTING_ROUTE_CAP as Record<string, number>)[discipline] ?? 500;
}

export type RankLimitNotice = 'none' | 'discipline_max' | 'chef_quest_range';

/** Explains why a requested target rank cannot be planned with ordinary crafting. */
export function getRankLimitNotice(discipline: string, targetRank: number): RankLimitNotice {
  if (targetRank > getDisciplineMaxRank(discipline)) return 'discipline_max';
  if (targetRank > getCraftingRouteCap(discipline)) return 'chef_quest_range';
  return 'none';
}

