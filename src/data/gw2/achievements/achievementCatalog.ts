/**
 * Achievement Definitions & Category Hierarchy
 *
 * Full catalog of authentic Guild Wars 2 achievements (8,357 items)
 * across all 19 Groups and 360 Categories with official ArenaNet Render icons.
 */

import type { AchievementDefinition } from '../../../domain/achievementIntelligence.ts';
import { GLOBAL_ACHIEVEMENTS } from '../../achievements.ts';
import { GROUPS_DATA } from './groupsData.ts';
import { CATEGORIES_DATA } from './categoriesData.ts';
import { ALL_ACHIEVEMENTS_RAW } from './allAchievementsLoader.ts';

export interface AchievementGroupMeta {
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  order: number;
  categories?: readonly number[] | number[];
}

export interface AchievementCategoryMeta {
  id: number;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  groupId: string;
  groupName?: string;
  groupNameEn?: string;
  icon?: string;
  order: number;
  achievements?: readonly number[] | number[];
}

export const ACHIEVEMENT_GROUPS: AchievementGroupMeta[] = GROUPS_DATA as unknown as AchievementGroupMeta[];
export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = CATEGORIES_DATA as unknown as AchievementCategoryMeta[];

// Lookup map for fast category resolution
const categoryMap = new Map<number, AchievementCategoryMeta>();
ACHIEVEMENT_CATEGORIES.forEach((cat) => {
  categoryMap.set(cat.id, cat);
});

// Event & waypoint mapping from GLOBAL_ACHIEVEMENTS
const eventMap = new Map<number, { eventId: string; waypoint?: string }>();
GLOBAL_ACHIEVEMENTS.forEach((g) => {
  if (g.gw2Id && g.eventId) {
    eventMap.set(g.gw2Id, { eventId: g.eventId });
  }
});

interface CompactAchievementRaw {
  id: number;
  n: string;
  ne?: string;
  d?: string;
  de?: string;
  r?: string;
  re?: string;
  i?: string;
  f?: string[];
  t?: [number, number][];
  b?: string[];
  c: number;
  cap?: number;
  pre?: number[];
}

/**
 * Inflates a compact raw achievement item into a fully enriched AchievementDefinition.
 */
export function inflateCompactAchievement(raw: CompactAchievementRaw): AchievementDefinition {
  const cat = categoryMap.get(raw.c);
  const ev = eventMap.get(raw.id);

  const tiers = raw.t && raw.t.length > 0
    ? raw.t.map(([count, points]) => ({ count, points }))
    : [{ count: 1, points: 0 }];

  const bits = raw.b && raw.b.length > 0
    ? raw.b.map((text, idx) => ({
        type: 'Text',
        id: idx,
        text,
        textEn: text,
      }))
    : undefined;

  // Icon: specific achievement icon or fallback to category icon
  const icon = raw.i || (cat ? cat.icon : undefined);

  // In the GW2 API, ~5,000 achievements have description: "" because the instruction
  // is in requirement. Fallback ensures NO achievement is displayed without text.
  const descDe = raw.d || raw.r || '';
  const descEn = raw.de || raw.re || raw.d || raw.r || '';
  const reqDe = raw.r || raw.d || '';
  const reqEn = raw.re || raw.de || raw.r || raw.d || '';

  return {
    id: raw.id,
    name: raw.n,
    nameEn: raw.ne || raw.n,
    description: descDe,
    descriptionEn: descEn,
    requirement: reqDe,
    requirementEn: reqEn,
    icon,
    flags: raw.f || ['Permanent'],
    tiers,
    pointCap: raw.cap,
    prerequisites: raw.pre,
    bits,
    categoryId: raw.c,
    categoryName: cat ? cat.name : 'Allgemein',
    categoryNameEn: cat ? cat.nameEn : 'General',
    groupId: cat ? cat.groupId : 'general',
    groupName: cat ? (cat.groupName || 'Allgemein') : 'Allgemein',
    groupNameEn: cat ? (cat.groupNameEn || 'General') : 'General',
    requiredCount: tiers.length > 0 ? tiers[tiers.length - 1].count : 1,
    eventId: ev?.eventId,
    waypoint: ev?.waypoint,
  };
}

/**
 * Builds the complete list of 8,357 achievement definitions.
 */
function buildFullCatalog(): AchievementDefinition[] {
  const rawList = ALL_ACHIEVEMENTS_RAW as CompactAchievementRaw[];
  return rawList.map(inflateCompactAchievement);
}

export const BASE_ACHIEVEMENT_CATALOG: AchievementDefinition[] = buildFullCatalog();
