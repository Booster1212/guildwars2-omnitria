import type { AccountData, AccountCharacter } from '../data/gw2/account.ts';
import type { GameItem, PriceInfo } from './types.ts';
import { unitPrice } from './costs.ts';

export type StorageLocationKind =
  | 'materials'
  | 'bank'
  | 'shared'
  | 'character_bag'
  | 'character_equipped';

export interface ItemStorageLocation {
  kind: StorageLocationKind;
  characterName?: string;
  slot?: string;
  count: number;
}

export interface AccountInventoryItem {
  itemId: number;
  name: string;
  type?: string;
  rarity?: string;
  level?: number;
  icon?: string;
  chatLink?: string;
  /** Total stackable/consumable count across Material Storage, Bank, Shared Inventory, and Character Bags */
  totalStock: number;
  /** Additional count equipped on characters (kept separate from totalStock to prevent double-counting) */
  equippedCount: number;
  /** Combined count across storage + character bags + equipped */
  totalCount: number;
  materialStorageCount: number;
  bankCount: number;
  sharedCount: number;
  characterBagCount: number;
  locations: ItemStorageLocation[];
  unitPrice: number | null;
  totalValue: number | null;
}

export type InventoryLocationFilter =
  | 'all'
  | 'materials'
  | 'bank'
  | 'shared'
  | 'characters'
  | 'equipped'
  | 'multi';

export type InventorySortMode =
  | 'count-desc'
  | 'value-desc'
  | 'name-asc'
  | 'rarity-desc'
  | 'locations-desc';

export interface InventoryFilterOptions {
  query?: string;
  locationFilter?: InventoryLocationFilter;
  characterFilter?: string;
  rarityFilter?: string;
  typeFilter?: string;
  sortBy?: InventorySortMode;
}

const RARITY_RANK: Record<string, number> = {
  Legendary: 8,
  Ascended: 7,
  Exotic: 6,
  Rare: 5,
  Masterwork: 4,
  Fine: 3,
  Basic: 2,
  Junk: 1,
};

/**
 * Builds a consolidated, deduplicated index of all items across the account's
 * Material Storage, Bank, Shared Inventory, Character Bags, and Character Equipment.
 *
 * Ensures zero double-counting:
 * - `totalStock` = Material Storage + Bank + Shared Inventory + Character Bags
 * - `equippedCount` = Equipped items on characters (tracked separately from consumable stock)
 * - `totalCount` = `totalStock` + `equippedCount`
 */
export function buildAccountInventoryIndex(
  data: Pick<AccountData, 'breakdown' | 'characterBreakdown' | 'characters'> | null | undefined,
  getItem: (id: number) => GameItem | undefined,
  prices?: ReadonlyMap<number, PriceInfo>,
): AccountInventoryItem[] {
  if (!data) return [];

  const breakdown = data.breakdown ?? {};
  const charBreakdown = data.characterBreakdown ?? {};
  const characters: AccountCharacter[] = Array.isArray(data.characters) ? data.characters : [];

  // Map of itemId -> characterName -> { count, slots[] } for equipped gear
  const equippedByItem = new Map<number, Map<string, { count: number; slots: string[] }>>();
  // Fallback map of itemId -> characterName -> count if `characterBreakdown` is absent but `characters[].bagItems` exists
  const bagByItemFallback = new Map<number, Map<string, number>>();

  for (const ch of characters) {
    if (!ch || !ch.name) continue;
    if (Array.isArray(ch.bagItems)) {
      for (const entry of ch.bagItems) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const [itemId, count] = entry;
        if (!itemId || count <= 0) continue;
        let charMap = bagByItemFallback.get(itemId);
        if (!charMap) {
          charMap = new Map<string, number>();
          bagByItemFallback.set(itemId, charMap);
        }
        charMap.set(ch.name, (charMap.get(ch.name) ?? 0) + count);
      }
    }
    if (Array.isArray(ch.equipment)) {
      for (const eq of ch.equipment) {
        if (!Array.isArray(eq) || !eq[0]) continue;
        const [itemId, slot] = eq;
        let charMap = equippedByItem.get(itemId);
        if (!charMap) {
          charMap = new Map<string, { count: number; slots: string[] }>();
          equippedByItem.set(itemId, charMap);
        }
        const prev = charMap.get(ch.name) ?? { count: 0, slots: [] };
        prev.count += 1;
        if (slot && !prev.slots.includes(slot)) {
          prev.slots.push(slot);
        }
        charMap.set(ch.name, prev);
      }
    }
  }

  const allItemIds = new Set<number>();
  for (const rawId of Object.keys(breakdown)) {
    const id = Number(rawId);
    if (id > 0) allItemIds.add(id);
  }
  for (const id of equippedByItem.keys()) {
    if (id > 0) allItemIds.add(id);
  }
  for (const id of bagByItemFallback.keys()) {
    if (id > 0) allItemIds.add(id);
  }

  const results: AccountInventoryItem[] = [];

  for (const itemId of allItemIds) {
    const b = breakdown[itemId] ?? [0, 0, 0, 0];
    const materialStorageCount = Math.max(0, b[0] ?? 0);
    const bankCount = Math.max(0, b[1] ?? 0);
    const sharedCount = Math.max(0, b[2] ?? 0);

    const locations: ItemStorageLocation[] = [];
    if (materialStorageCount > 0) {
      locations.push({ kind: 'materials', count: materialStorageCount });
    }
    if (bankCount > 0) {
      locations.push({ kind: 'bank', count: bankCount });
    }
    if (sharedCount > 0) {
      locations.push({ kind: 'shared', count: sharedCount });
    }

    // Resolve per-character bag quantities without double-counting
    const explicitCharMap = charBreakdown[itemId];
    const fallbackCharMap = bagByItemFallback.get(itemId);
    let resolvedCharBagSum = 0;

    if (explicitCharMap && Object.keys(explicitCharMap).length > 0) {
      const entries = Object.entries(explicitCharMap)
        .filter(([name, cnt]) => Boolean(name) && cnt > 0)
        .sort((a, b2) => b2[1] - a[1] || a[0].localeCompare(b2[0]));
      for (const [charName, cnt] of entries) {
        locations.push({ kind: 'character_bag', characterName: charName, count: cnt });
        resolvedCharBagSum += cnt;
      }
    } else if (fallbackCharMap && fallbackCharMap.size > 0) {
      const entries = Array.from(fallbackCharMap.entries())
        .filter(([name, cnt]) => Boolean(name) && cnt > 0)
        .sort((a, b2) => b2[1] - a[1] || a[0].localeCompare(b2[0]));
      for (const [charName, cnt] of entries) {
        locations.push({ kind: 'character_bag', characterName: charName, count: cnt });
        resolvedCharBagSum += cnt;
      }
    } else if ((b[3] ?? 0) > 0) {
      resolvedCharBagSum = Math.max(0, b[3] ?? 0);
      locations.push({ kind: 'character_bag', count: resolvedCharBagSum });
    }

    const characterBagCount = resolvedCharBagSum > 0 ? resolvedCharBagSum : Math.max(0, b[3] ?? 0);
    const totalStock = materialStorageCount + bankCount + sharedCount + characterBagCount;

    // Resolve equipped occurrences (separate from totalStock)
    let equippedCount = 0;
    const eqMap = equippedByItem.get(itemId);
    if (eqMap) {
      const entries = Array.from(eqMap.entries()).sort(
        (a, b2) => b2[1].count - a[1].count || a[0].localeCompare(b2[0]),
      );
      for (const [charName, info] of entries) {
        if (info.count > 0) {
          locations.push({
            kind: 'character_equipped',
            characterName: charName,
            slot: info.slots.join(', '),
            count: info.count,
          });
          equippedCount += info.count;
        }
      }
    }

    const totalCount = totalStock + equippedCount;
    if (totalCount <= 0) continue;

    const meta = getItem(itemId);
    const p = prices?.get(itemId);
    const uPrice = unitPrice(p, itemId);
    const totalValue = uPrice !== null ? uPrice * totalStock : null;

    results.push({
      itemId,
      name: meta?.name ?? `#${itemId}`,
      type: meta?.type,
      rarity: meta?.rarity,
      level: meta?.level,
      icon: meta?.icon,
      chatLink: meta?.chatLink,
      totalStock,
      equippedCount,
      totalCount,
      materialStorageCount,
      bankCount,
      sharedCount,
      characterBagCount,
      locations,
      unitPrice: uPrice,
      totalValue,
    });
  }

  return results;
}

/**
 * Filters and sorts the account inventory index by name/ID/character query,
 * storage location, character holder, rarity, item type, and sort mode.
 */
export function filterAndSortAccountInventory(
  items: readonly AccountInventoryItem[],
  options: InventoryFilterOptions = {},
): AccountInventoryItem[] {
  const {
    query = '',
    locationFilter = 'all',
    characterFilter = 'all',
    rarityFilter = 'all',
    typeFilter = 'all',
    sortBy = 'count-desc',
  } = options;

  const q = query.trim().toLowerCase();
  const numericQuery = q.startsWith('#') ? q.slice(1) : q;

  const filtered = items.filter((item) => {
    // Location filter
    if (locationFilter === 'materials' && item.materialStorageCount <= 0) return false;
    if (locationFilter === 'bank' && item.bankCount <= 0) return false;
    if (locationFilter === 'shared' && item.sharedCount <= 0) return false;
    if (locationFilter === 'characters' && item.characterBagCount <= 0 && item.equippedCount <= 0) return false;
    if (locationFilter === 'equipped' && item.equippedCount <= 0) return false;
    if (locationFilter === 'multi' && item.locations.length < 2) return false;

    // Specific character filter
    if (characterFilter && characterFilter !== 'all') {
      const heldByChar = item.locations.some(
        (loc) =>
          (loc.kind === 'character_bag' || loc.kind === 'character_equipped') &&
          loc.characterName === characterFilter,
      );
      if (!heldByChar) return false;
    }

    // Rarity filter
    if (rarityFilter && rarityFilter !== 'all') {
      if ((item.rarity ?? 'Basic') !== rarityFilter) return false;
    }

    // Item type filter
    if (typeFilter && typeFilter !== 'all') {
      if ((item.type ?? 'Unknown') !== typeFilter) return false;
    }

    // Search query: matches localized name, item ID, chatLink, or character name
    if (q) {
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesId = String(item.itemId).includes(numericQuery);
      const matchesChat = item.chatLink ? item.chatLink.toLowerCase().includes(q) : false;
      const matchesChar = item.locations.some((loc) =>
        loc.characterName ? loc.characterName.toLowerCase().includes(q) : false,
      );
      if (!matchesName && !matchesId && !matchesChat && !matchesChar) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'value-desc': {
        const valA = a.totalValue ?? -1;
        const valB = b.totalValue ?? -1;
        if (valB !== valA) return valB - valA;
        return b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      }
      case 'name-asc':
        return a.name.localeCompare(b.name) || b.totalCount - a.totalCount;
      case 'rarity-desc': {
        const rA = RARITY_RANK[a.rarity ?? 'Basic'] ?? 0;
        const rB = RARITY_RANK[b.rarity ?? 'Basic'] ?? 0;
        if (rB !== rA) return rB - rA;
        return b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      }
      case 'locations-desc': {
        if (b.locations.length !== a.locations.length) {
          return b.locations.length - a.locations.length;
        }
        return b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      }
      case 'count-desc':
      default:
        return b.totalCount - a.totalCount || a.name.localeCompare(b.name);
    }
  });

  return filtered;
}

export interface GoalDemandInput {
  goalId: string;
  goalName: string;
  /** Required item quantities for this goal: Map<itemId, requiredQuantity> */
  requirements: ReadonlyMap<number, number>;
}

export interface SharedGoalMaterialRow {
  itemId: number;
  /** Combined gross demand across all active goals */
  combinedRequired: number;
  /** Total consumable stock owned on the account (applied once across all goals — never double-counted) */
  accountStock: number;
  /** Units covered by account stock: min(combinedRequired, accountStock) */
  ownedAllocated: number;
  /** Remaining units needed across all goals combined: max(0, combinedRequired - accountStock) */
  netMissing: number;
  /** Progress percentage (0..100) for combined demand */
  progressPct: number;
  /** Which goals require this material and how many units each needs */
  usedByGoals: { goalId: string; goalName: string; required: number }[];
  /** True if 2 or more goals require this material */
  isSharedAcrossGoals: boolean;
  /** Storage locations where the player currently holds this item */
  locations: ItemStorageLocation[];
}

/**
 * Aggregates material demand across multiple progression goals (e.g., multiple tracked
 * Legendary weapons and crafting plans) against a single shared account stock pool.
 *
 * Prevents double-counting: if Goal A needs 250 Mystic Coins and Goal B needs 250 Mystic Coins,
 * and the player has 250 in Material Storage, the combined demand is 500, owned is 250, and
 * netMissing is 250 (rather than falsely reporting both goals as 100% covered).
 */
export function computeMultiGoalMaterialPlan(
  goals: readonly GoalDemandInput[],
  stockMap: ReadonlyMap<number, number>,
  inventoryByItem?: ReadonlyMap<number, AccountInventoryItem>,
): SharedGoalMaterialRow[] {
  const map = new Map<
    number,
    {
      combinedRequired: number;
      usedByGoals: { goalId: string; goalName: string; required: number }[];
    }
  >();

  for (const goal of goals) {
    for (const [itemId, qty] of goal.requirements.entries()) {
      if (!itemId || qty <= 0) continue;
      let entry = map.get(itemId);
      if (!entry) {
        entry = { combinedRequired: 0, usedByGoals: [] };
        map.set(itemId, entry);
      }
      entry.combinedRequired += qty;
      entry.usedByGoals.push({
        goalId: goal.goalId,
        goalName: goal.goalName,
        required: qty,
      });
    }
  }

  const rows: SharedGoalMaterialRow[] = [];
  for (const [itemId, entry] of map.entries()) {
    const accountStock = Math.max(0, stockMap.get(itemId) ?? 0);
    const ownedAllocated = Math.min(entry.combinedRequired, accountStock);
    const netMissing = Math.max(0, entry.combinedRequired - accountStock);
    const progressPct =
      entry.combinedRequired > 0
        ? Math.min(100, Math.round((ownedAllocated / entry.combinedRequired) * 100))
        : 100;
    const invItem = inventoryByItem?.get(itemId);

    rows.push({
      itemId,
      combinedRequired: entry.combinedRequired,
      accountStock,
      ownedAllocated,
      netMissing,
      progressPct,
      usedByGoals: entry.usedByGoals,
      isSharedAcrossGoals: entry.usedByGoals.length > 1,
      locations: invItem?.locations ?? [],
    });
  }

  // Sort shared bottlenecks first, then by highest missing count
  rows.sort((a, b) => {
    if (a.isSharedAcrossGoals !== b.isSharedAcrossGoals) {
      return a.isSharedAcrossGoals ? -1 : 1;
    }
    if (b.netMissing !== a.netMissing) return b.netMissing - a.netMissing;
    return b.combinedRequired - a.combinedRequired;
  });

  return rows;
}
