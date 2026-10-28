/**
 * Achievement Service
 *
 * Coordinates fetching, caching, and enriching achievement data from the
 * official ArenaNet REST API (/v2/achievements, /v2/achievements/categories, /v2/achievements/groups).
 * Respects rate limits, caches metadata in IndexedDB, and supports guest browsing without API keys.
 */

import { apiGet, fetchByIds, buildUrl } from '../client.ts';
import { cacheGet, cacheSet, createEmitter } from '../cache.ts';
import type {
  AchievementDefinition,
  AccountAchievementProgress,
  EnrichedAchievement,
} from '../../../domain/achievementIntelligence.ts';
import { enrichAchievement } from '../../../domain/achievementIntelligence.ts';
import {
  BASE_ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_GROUPS,
  AchievementCategoryMeta,
  AchievementGroupMeta,
} from './achievementCatalog.ts';

const CACHE_KEY_DYNAMIC_DEFS = 'gw2_achievement_definitions_v1';
const CACHE_KEY_CATEGORIES = 'gw2_achievement_categories_v1';
const CACHE_KEY_GROUPS = 'gw2_achievement_groups_v1';

// In-memory catalog
const definitionsMap = new Map<number, AchievementDefinition>();
let categoriesList: AchievementCategoryMeta[] = [...ACHIEVEMENT_CATEGORIES];
let groupsList: AchievementGroupMeta[] = [...ACHIEVEMENT_GROUPS];
let isInitialized = false;

// Populate base catalog
BASE_ACHIEVEMENT_CATALOG.forEach((def) => {
  definitionsMap.set(def.id, def);
});

export const achievementEmitter = createEmitter();

/**
 * Initialize cached definitions from IndexedDB
 */
export async function initAchievementService(): Promise<void> {
  if (isInitialized) return;
  try {
    const cachedDefs = await cacheGet<AchievementDefinition[]>(CACHE_KEY_DYNAMIC_DEFS);
    if (cachedDefs && Array.isArray(cachedDefs.value)) {
      cachedDefs.value.forEach((d) => {
        definitionsMap.set(d.id, d);
      });
    }

    const cachedCats = await cacheGet<AchievementCategoryMeta[]>(CACHE_KEY_CATEGORIES);
    if (cachedCats && Array.isArray(cachedCats.value)) {
      categoriesList = cachedCats.value;
    }

    const cachedGroups = await cacheGet<AchievementGroupMeta[]>(CACHE_KEY_GROUPS);
    if (cachedGroups && Array.isArray(cachedGroups.value)) {
      groupsList = cachedGroups.value;
    }
  } catch (err) {
    console.warn('[AchievementService] Cache initialization warning:', err);
  } finally {
    isInitialized = true;
    achievementEmitter.emit();
  }
}

/**
 * Returns all current definitions
 */
export function getAllDefinitions(): AchievementDefinition[] {
  return Array.from(definitionsMap.values());
}

/**
 * Returns all available categories and groups
 */
export function getCategoriesAndGroups(): {
  categories: AchievementCategoryMeta[];
  groups: AchievementGroupMeta[];
} {
  return { categories: categoriesList, groups: groupsList };
}

/**
 * Fetch definitions for missing achievement IDs from /v2/achievements in batches of 200.
 */
export async function ensureAchievementDefinitions(
  ids: number[],
  lang: 'de' | 'en' = 'en',
): Promise<void> {
  const missing = ids.filter((id) => !definitionsMap.has(id));
  if (missing.length === 0) return;

  try {
    // Fetch in language 1 (DE or EN)
    const resDe = await fetchByIds<any>('achievements', missing, { lang: 'de' });
    const resEn = await fetchByIds<any>('achievements', missing, { lang: 'en' });

    const mapEn = new Map<number, any>();
    if (resEn.items) {
      resEn.items.forEach((item) => mapEn.set(item.id, item));
    }

    const newlyAdded: AchievementDefinition[] = [];

    if (resDe.items) {
      resDe.items.forEach((itemDe) => {
        const itemEn = mapEn.get(itemDe.id) || itemDe;
        const tiers = (itemDe.tiers || []).map((t: any) => ({
          count: Number(t.count) || 1,
          points: Number(t.points) || 0,
        }));

        const bits = (itemDe.bits || []).map((b: any, bIdx: number) => {
          const bEn = itemEn.bits?.[bIdx] || b;
          return {
            type: b.type || 'Text',
            id: b.id,
            text: b.text || b.type,
            textEn: bEn.text || bEn.type || b.text,
          };
        });

        // Determine category & group
        const catMeta = categoriesList.find((c) => c.id === itemDe.category);
        const groupMeta = catMeta ? groupsList.find((g) => g.id === catMeta.groupId) : undefined;

        const def: AchievementDefinition = {
          id: itemDe.id,
          name: itemDe.name || `Erfolg #${itemDe.id}`,
          nameEn: itemEn.name || itemDe.name || `Achievement #${itemDe.id}`,
          description: itemDe.description || '',
          descriptionEn: itemEn.description || itemDe.description || '',
          requirement: itemDe.requirement || '',
          requirementEn: itemEn.requirement || itemDe.requirement || '',
          lockedText: itemDe.locked_text,
          lockedTextEn: itemEn.locked_text,
          icon: itemDe.icon,
          flags: itemDe.flags || [],
          tiers,
          pointCap: itemDe.point_cap,
          prerequisites: itemDe.prerequisites,
          rewards: itemDe.rewards,
          bits,
          categoryId: itemDe.category || 202,
          categoryName: catMeta ? catMeta.name : 'Allgemein',
          categoryNameEn: catMeta ? catMeta.nameEn : 'General',
          groupId: groupMeta ? groupMeta.id : 'general',
          groupName: groupMeta ? groupMeta.name : 'Allgemein',
          groupNameEn: groupMeta ? groupMeta.nameEn : 'General',
          requiredCount: tiers.length > 0 ? tiers[tiers.length - 1].count : 1,
        };

        definitionsMap.set(def.id, def);
        newlyAdded.push(def);
      });
    }

    if (newlyAdded.length > 0) {
      await cacheSet(CACHE_KEY_DYNAMIC_DEFS, Array.from(definitionsMap.values()));
      achievementEmitter.emit();
    }
  } catch (err) {
    console.error('[AchievementService] Failed to fetch missing achievement definitions:', err);
  }
}

/**
 * Returns enriched achievements for display, integrating account progress or providing guest metadata.
 */
export function getEnrichedAchievements(
  userAchievements?: Map<number, AccountAchievementProgress> | null,
): EnrichedAchievement[] {
  const defs = getAllDefinitions();
  const allUserMap = userAchievements || new Map<number, AccountAchievementProgress>();

  return defs.map((def) => {
    const progress = userAchievements ? userAchievements.get(def.id) : undefined;
    return enrichAchievement(def, progress, allUserMap);
  });
}
