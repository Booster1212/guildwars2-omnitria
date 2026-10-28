import React, { useState, useMemo } from 'react';
import { useAccountState, syncAccountData, type AccountCharacter } from '../../data/gw2/account';
import { getItem, useItems } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useProgress } from '../../data/progressStore';
import { useLegendaryModel } from '../../data/legendaryModel';
import { buildTree, flattenTree } from '../../domain/recipeTree';
import {
  buildAccountInventoryIndex,
  filterAndSortAccountInventory,
  computeMultiGoalMaterialPlan,
  type InventoryLocationFilter,
  type InventorySortMode,
  type ItemStorageLocation,
  type GoalDemandInput,
} from '../../domain/inventorySearch';
import type { DisciplineId } from '../../domain/types';
import type { TabId } from '../../types';
import type { DailyProgressionData, Gw2AccountAchievement } from '../../data/gw2Api';
import { GLOBAL_ACHIEVEMENTS, getAchievementTitle } from '../../data/achievements';
import { Coin, DisciplineIcon, ItemIcon, Notice, ProgressBar } from '../common/ui';
import {
  fmtInt,
  getDisciplineName,
  getItemTypeName,
  getRarityName,
} from '../common/labels';
import { useTranslation } from '../../i18n';
import { MaterialDetail } from '../material/MaterialDetail';
import {
  Search,
  Package,
  Users,
  Compass,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  User,
  Layers,
  Shield,
  Sparkles,
  Hammer,
  Star,
  Copy,
  Check,
  ArrowRight,
  Coins,
  Award,
  Briefcase,
  Archive,
  Box,
} from 'lucide-react';

export type InventorySubTab = 'search' | 'characters' | 'progression';

interface InventoryHubViewProps {
  apiKey?: string;
  dailyProgression: DailyProgressionData | null;
  userAchievements?: Map<number, Gw2AccountAchievement>;
  onOpenSettings: () => void;
  onNavigateTab: (tab: TabId) => void;
  onToast?: (msg: string) => void;
  initialSubTab?: InventorySubTab;
}

const PROFESSION_COLORS: Record<string, string> = {
  Elementalist: '#f68a87',
  Mesmer: '#b679d5',
  Necromancer: '#52a76f',
  Engineer: '#d09c59',
  Ranger: '#8cdc82',
  Thief: '#c08f95',
  Warrior: '#ffd166',
  Guardian: '#72c1d9',
  Revenant: '#d16e5a',
};

const PROFESSION_DE: Record<string, string> = {
  Elementalist: 'Elementarmagier',
  Mesmer: 'Mesmer',
  Necromancer: 'Nekromant',
  Engineer: 'Ingenieur',
  Ranger: 'Waldläufer',
  Thief: 'Dieb',
  Warrior: 'Krieger',
  Guardian: 'Wächter',
  Revenant: 'Widergänger',
};

const ALL_DISCIPLINES: { id: DisciplineId; maxRank: number }[] = [
  { id: 'Armorsmith', maxRank: 500 },
  { id: 'Artificer', maxRank: 500 },
  { id: 'Chef', maxRank: 500 },
  { id: 'Huntsman', maxRank: 500 },
  { id: 'Jeweler', maxRank: 400 },
  { id: 'Leatherworker', maxRank: 500 },
  { id: 'Tailor', maxRank: 500 },
  { id: 'Weaponsmith', maxRank: 500 },
];

const KEY_LEGENDARY_MATERIALS = [
  19675, // Mystic Clover
  19976, // Mystic Coin
  19721, // Glob of Ectoplasm
  19925, // Obsidian Shard
  19678, // Gift of Exploration
  19677, // Gift of Battle
  24295, // Vial of Powerful Blood
  24358, // Ancient Bone
];

export const InventoryHubView: React.FC<InventoryHubViewProps> = ({
  apiKey,
  dailyProgression,
  userAchievements = new Map(),
  onOpenSettings,
  onNavigateTab,
  onToast,
  initialSubTab = 'search',
}) => {
  const { t, lang } = useTranslation();
  const account = useAccountState();
  const progress = useProgress();
  const legendaryModel = useLegendaryModel();

  const [subTab, setSubTab] = useState<InventorySubTab>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<InventoryLocationFilter>('all');
  const [characterFilter, setCharacterFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<InventorySortMode>('count-desc');
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);
  const [drawerStack, setDrawerStack] = useState<number[]>([]);

  const openDrawer = (id: number) => setDrawerStack((s) => [...s, id]);
  const popDrawer = () => setDrawerStack((s) => s.slice(0, -1));
  const closeDrawer = () => setDrawerStack([]);
  const activeDrawerItem = drawerStack[drawerStack.length - 1];

  // Collect all item IDs across account stock, character equipment, and key legendary materials
  const allAccountItemIds = useMemo(() => {
    const ids = new Set<number>(KEY_LEGENDARY_MATERIALS);
    if (account.data) {
      for (const [id] of account.data.stock) {
        if (id > 0) ids.add(id);
      }
      for (const rawId of Object.keys(account.data.breakdown ?? {})) {
        const id = Number(rawId);
        if (id > 0) ids.add(id);
      }
      for (const ch of account.data.characters ?? []) {
        for (const [id] of ch.bagItems ?? []) {
          if (id > 0) ids.add(id);
        }
        for (const [id] of ch.equipment ?? []) {
          if (id > 0) ids.add(id);
        }
      }
    }
    for (const wId of progress.tracked) {
      ids.add(wId);
    }
    return Array.from(ids);
  }, [account.data, progress.tracked]);

  const itemsState = useItems(allAccountItemIds);
  const prices = usePrices(allAccountItemIds);

  // Build consolidated account inventory index
  const inventoryIndex = useMemo(() => {
    return buildAccountInventoryIndex(account.data, getItem, prices.map);
  }, [account.data, itemsState.version, prices.map, lang]);

  const inventoryByItem = useMemo(() => {
    const m = new Map<number, (typeof inventoryIndex)[number]>();
    for (const entry of inventoryIndex) {
      m.set(entry.itemId, entry);
    }
    return m;
  }, [inventoryIndex]);

  // Filtered and sorted items for Account-Wide Item Search
  const filteredItems = useMemo(() => {
    return filterAndSortAccountInventory(inventoryIndex, {
      query: searchQuery,
      locationFilter,
      characterFilter,
      rarityFilter,
      typeFilter,
      sortBy,
    });
  }, [inventoryIndex, searchQuery, locationFilter, characterFilter, rarityFilter, typeFilter, sortBy]);

  // Available characters and item types for filter dropdowns
  const characterNames = useMemo(() => {
    const names = new Set<string>();
    for (const ch of account.data?.characters ?? []) {
      if (ch?.name) names.add(ch.name);
    }
    for (const item of inventoryIndex) {
      for (const loc of item.locations) {
        if (loc.characterName) names.add(loc.characterName);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [account.data?.characters, inventoryIndex]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const item of inventoryIndex) {
      if (item.type) types.add(item.type);
    }
    return Array.from(types).sort();
  }, [inventoryIndex]);

  // Summary metrics for Item Search
  const searchSummary = useMemo(() => {
    let totalUnits = 0;
    let totalValue = 0;
    let matItems = 0;
    let bankItems = 0;
    let sharedItems = 0;
    let charItems = 0;

    for (const item of filteredItems) {
      totalUnits += item.totalCount;
      if (item.totalValue !== null) totalValue += item.totalValue;
      if (item.materialStorageCount > 0) matItems++;
      if (item.bankCount > 0) bankItems++;
      if (item.sharedCount > 0) sharedItems++;
      if (item.characterBagCount > 0 || item.equippedCount > 0) charItems++;
    }

    return { totalUnits, totalValue, matItems, bankItems, sharedItems, charItems };
  }, [filteredItems]);

  // Tracked Legendary Weapons & Shared Material Demand Analysis
  const trackedWeaponPlans = useMemo(() => {
    return progress.tracked
      .map((weaponId) => {
        const weapon = legendaryModel.weapons.find((w) => w.id === weaponId);
        if (!weapon) return null;
        const wp = progress.legendary[String(weaponId)];
        const doneNodes = new Set(wp?.doneNodes ?? []);
        const doneMaterials = new Set(wp?.doneMaterials ?? []);
        const buyItems = new Set(wp?.buyItems ?? []);

        const tree = buildTree(weaponId, 1, legendaryModel, {
          stock: account.stockMap,
          doneNodes,
          doneMaterials,
          buyItems,
        });

        // Identify next actionable craftable intermediate step
        const allNodes = flattenTree(tree.root);
        const nextCraftStep = allNodes.find(
          (n) =>
            n.itemId !== weaponId &&
            !n.done &&
            n.missing > 0 &&
            n.children.length > 0 &&
            n.children.every((c) => c.done || c.missing === 0),
        ) ??
        allNodes.find(
          (n) => n.itemId !== weaponId && !n.done && n.missing > 0 && n.children.length > 0,
        );

        return {
          weapon,
          tree,
          nextCraftStep,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [progress.tracked, progress.legendary, legendaryModel, account.stockMap]);

  // Ensure items in tracked weapon BOMs are loaded
  const trackedBomItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const plan of trackedWeaponPlans) {
      ids.add(plan.weapon.id);
      if (plan.nextCraftStep) ids.add(plan.nextCraftStep.itemId);
      for (const [id] of plan.tree.bom) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [trackedWeaponPlans]);
  useItems(trackedBomItemIds);

  // Deduplicated multi-goal material plan across all tracked legendaries
  const sharedGoalMaterials = useMemo(() => {
    const goals: GoalDemandInput[] = trackedWeaponPlans.map((p) => {
      const reqs = new Map<number, number>();
      for (const [itemId, entry] of p.tree.bom.entries()) {
        if (itemId !== p.weapon.id && entry.total > 0) {
          reqs.set(itemId, entry.total);
        }
      }
      const wItem = getItem(p.weapon.id);
      return {
        goalId: String(p.weapon.id),
        goalName: wItem?.name ?? p.weapon.nameEn,
        requirements: reqs,
      };
    });

    return computeMultiGoalMaterialPlan(goals, account.stockMap, inventoryByItem);
  }, [trackedWeaponPlans, account.stockMap, inventoryByItem, itemsState.version]);

  // Pinned / Watchlist achievements resolution
  const pinnedAchievements = useMemo(() => {
    let watchlistIds: string[] = [];
    try {
      const raw = localStorage.getItem('gw2_watchlist_achievements');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) watchlistIds = parsed.map(String);
      }
    } catch {
      /* ignore */
    }
    const items = watchlistIds.length > 0
      ? GLOBAL_ACHIEVEMENTS.filter((a) => watchlistIds.includes(a.id))
      : GLOBAL_ACHIEVEMENTS.slice(0, 4);
    return items.map((meta) => ({
      id: meta.id,
      title: getAchievementTitle(meta, lang),
      user: meta.gw2Id ? userAchievements.get(meta.gw2Id) : undefined,
    }));
  }, [userAchievements, lang, subTab]);

  // Wallet currencies
  const walletGold = account.walletMap?.get(1) ?? null;
  const walletKarma = account.walletMap?.get(2) ?? null;
  const walletLaurels = account.walletMap?.get(3) ?? null;
  const walletSpiritShards = account.walletMap?.get(23) ?? null;
  const walletAstralAcclaim = account.walletMap?.get(63) ?? null;
  const walletImperialFavor = account.walletMap?.get(68) ?? null;
  const walletFractalRelics = account.walletMap?.get(7) ?? null;
  const walletBadgesOfHonor = account.walletMap?.get(15) ?? null;

  const hasApiKey = Boolean(apiKey?.trim()) || Boolean(account.data);
  const perms = account.data?.permissions ?? [];
  const missingInventoriesPerm =
    Boolean(account.data) && (!perms.includes('inventories') || Boolean(account.data?.errors?.materials));
  const missingCharactersPerm =
    Boolean(account.data) && (!perms.includes('characters') || Boolean(account.data?.errors?.characters));

  const handleSync = () => {
    if (apiKey?.trim()) {
      void syncAccountData(apiKey);
    } else {
      onOpenSettings();
    }
  };

  const handleCopyChatLink = (itemId: number, chatLink?: string) => {
    if (!chatLink) return;
    navigator.clipboard?.writeText(chatLink).catch(() => {});
    const api = (window as unknown as { electronAPI?: { copyToClipboard?: (t: string) => void } }).electronAPI;
    if (api?.copyToClipboard) {
      api.copyToClipboard(chatLink);
    }
    setCopiedItemId(itemId);
    setTimeout(() => setCopiedItemId((prev) => (prev === itemId ? null : prev)), 1500);
    if (onToast) {
      onToast(
        lang === 'en'
          ? `📋 Chat link ${chatLink} copied to clipboard.`
          : `📋 Chat-Code ${chatLink} in die Zwischenablage kopiert.`,
      );
    }
  };

  const handleFilterByCharacter = (charName: string) => {
    setCharacterFilter(charName);
    setLocationFilter('characters');
    setSubTab('search');
  };

  const handleLocateItemInSearch = (itemName: string) => {
    setSearchQuery(itemName);
    setLocationFilter('all');
    setCharacterFilter('all');
    setRarityFilter('all');
    setTypeFilter('all');
    setSubTab('search');
  };

  const renderLocationBadge = (loc: ItemStorageLocation, idx: number) => {
    if (loc.kind === 'materials') {
      return (
        <span key={`mat-${idx}`} className="inv-loc-badge loc-materials" title={t('inventory.locMaterials')}>
          <Archive size={11} />
          <span>{t('inventory.badgeMaterials')}:</span>
          <strong className="font-mono">{fmtInt(loc.count)}</strong>
        </span>
      );
    }
    if (loc.kind === 'bank') {
      return (
        <span key={`bank-${idx}`} className="inv-loc-badge loc-bank" title={t('inventory.locBank')}>
          <Box size={11} />
          <span>{t('inventory.badgeBank')}:</span>
          <strong className="font-mono">{fmtInt(loc.count)}</strong>
        </span>
      );
    }
    if (loc.kind === 'shared') {
      return (
        <span key={`shared-${idx}`} className="inv-loc-badge loc-shared" title={t('inventory.locShared')}>
          <Layers size={11} />
          <span>{t('inventory.badgeShared')}:</span>
          <strong className="font-mono">{fmtInt(loc.count)}</strong>
        </span>
      );
    }
    if (loc.kind === 'character_bag') {
      return (
        <button
          key={`char-${loc.characterName ?? idx}`}
          type="button"
          className="inv-loc-badge loc-character"
          onClick={(e) => {
            e.stopPropagation();
            if (loc.characterName) handleFilterByCharacter(loc.characterName);
          }}
          title={
            loc.characterName
              ? t('inventory.filterByChar', { name: loc.characterName })
              : t('inventory.locCharacters')
          }
        >
          <User size={11} />
          <span>{loc.characterName ?? t('inventory.locCharacters')}:</span>
          <strong className="font-mono">{fmtInt(loc.count)}</strong>
        </button>
      );
    }
    return (
      <button
        key={`eq-${loc.characterName ?? idx}`}
        type="button"
        className="inv-loc-badge loc-equipped"
        onClick={(e) => {
          e.stopPropagation();
          if (loc.characterName) handleFilterByCharacter(loc.characterName);
        }}
        title={`${loc.characterName ?? ''} (${loc.slot ?? t('inventory.badgeEquipped')})`}
      >
        <Shield size={11} />
        <span>
          {loc.characterName
            ? `${loc.characterName} (${t('inventory.badgeEquipped')})`
            : t('inventory.badgeEquipped')}
          :
        </span>
        <strong className="font-mono">{fmtInt(loc.count)}</strong>
      </button>
    );
  };

  return (
    <div className="inventory-hub-container">
      {/* Top Sub-Navigation Header */}
      <header className="inventory-hub-header">
        <div className="inventory-hub-brand">
          <Package size={18} className="gold" />
          <div>
            <h2 className="font-serif font-bold text-base text-[#f4e3a8]">
              {t('inventory.hubTitle')}
            </h2>
            {account.data?.accountName && (
              <span className="dim text-xs font-mono">
                {account.data.accountName} •{' '}
                {t('inventory.syncedAt', {
                  time: new Date(account.data.syncedAt).toLocaleTimeString(
                    lang === 'en' ? 'en-US' : 'de-DE',
                    { hour: '2-digit', minute: '2-digit' },
                  ),
                })}
              </span>
            )}
          </div>
        </div>

        {/* Subtabs */}
        <div className="inventory-hub-tabs">
          <button
            type="button"
            className={`inv-hub-tab-btn ${subTab === 'search' ? 'active' : ''}`}
            onClick={() => setSubTab('search')}
          >
            <Search size={14} />
            <span>{t('inventory.tabSearch')}</span>
            <span className="inv-tab-count font-mono">{inventoryIndex.length}</span>
          </button>

          <button
            type="button"
            className={`inv-hub-tab-btn ${subTab === 'characters' ? 'active' : ''}`}
            onClick={() => setSubTab('characters')}
          >
            <Users size={14} />
            <span>{t('inventory.tabCharacters')}</span>
            <span className="inv-tab-count font-mono">{account.data?.characters?.length ?? 0}</span>
          </button>

          <button
            type="button"
            className={`inv-hub-tab-btn ${subTab === 'progression' ? 'active' : ''}`}
            onClick={() => setSubTab('progression')}
          >
            <Compass size={14} />
            <span>{t('inventory.tabProgression')}</span>
            {progress.tracked.length > 0 && (
              <span className="inv-tab-count font-mono">{progress.tracked.length}</span>
            )}
          </button>
        </div>

        {/* Sync / API Key Action */}
        <div className="inventory-hub-actions">
          <button
            type="button"
            className="gw2-btn-sm"
            onClick={handleSync}
            disabled={account.status === 'loading'}
          >
            <RefreshCw size={12} className={`mr-1 inline ${account.status === 'loading' ? 'spin' : ''}`} />
            <span>
              {account.status === 'loading' ? t('inventory.syncing') : t('inventory.syncNow')}
            </span>
          </button>
        </div>
      </header>

      {/* Permission / Connection Notices */}
      {!hasApiKey && (
        <div className="inv-permission-banner">
          <KeyRound size={18} className="gold shrink-0" />
          <div className="inv-permission-text">
            <h4 className="font-serif font-bold text-sm text-[#f4e3a8]">
              {t('inventory.noApiKeyTitle')}
            </h4>
            <p className="text-xs text-[#d6d1c5]">{t('inventory.noApiKeyDesc')}</p>
          </div>
          <button type="button" className="gw2-btn-sm shrink-0" onClick={onOpenSettings}>
            <KeyRound size={12} className="mr-1 inline" />
            <span>{t('wvw.configureKeyBtn')}</span>
          </button>
        </div>
      )}

      {(missingInventoriesPerm || missingCharactersPerm) && (
        <div className="inv-permission-banner warn">
          <AlertTriangle size={18} className="warn shrink-0" />
          <div className="inv-permission-text">
            <h4 className="font-serif font-bold text-sm warn">
              {t('inventory.missingPermTitle')}
            </h4>
            {missingInventoriesPerm && (
              <p className="text-xs text-[#d6d1c5]">{t('inventory.missingPermInventories')}</p>
            )}
            {missingCharactersPerm && (
              <p className="text-xs text-[#d6d1c5]">{t('inventory.missingPermCharacters')}</p>
            )}
          </div>
          <button type="button" className="gw2-btn-sm shrink-0" onClick={onOpenSettings}>
            <KeyRound size={12} className="mr-1 inline" />
            <span>{t('wvw.configureKeyBtn')}</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="inventory-hub-body">
        {/* ============================================================
            SUBTAB 1: ACCOUNT-WIDE ITEM SEARCH
            ============================================================ */}
        {subTab === 'search' && (
          <div className="inv-search-view">
            {/* Search & Multi-Filter Controls Bar */}
            <div className="inv-search-controls-card">
              <div className="inv-search-top-row">
                <div className="inv-search-input-wrap">
                  <Search size={15} className="gold shrink-0" />
                  <input
                    type="text"
                    className="inv-search-input"
                    placeholder={t('inventory.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="inv-clear-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Dropdown Filters: Character, Rarity, Type, Sort */}
                <div className="inv-dropdowns-row">
                  <select
                    className="gw2-select"
                    value={characterFilter}
                    onChange={(e) => setCharacterFilter(e.target.value)}
                    title={t('inventory.allCharacters')}
                  >
                    <option value="all">{t('inventory.allCharacters')}</option>
                    {characterNames.map((cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>

                  <select
                    className="gw2-select"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    title={t('inventory.allRarities')}
                  >
                    <option value="all">{t('inventory.allRarities')}</option>
                    {(['Legendary', 'Ascended', 'Exotic', 'Rare', 'Masterwork', 'Fine', 'Basic'] as const).map(
                      (r) => (
                        <option key={r} value={r}>
                          {getRarityName(r, lang)}
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    className="gw2-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    title={t('inventory.allTypes')}
                  >
                    <option value="all">{t('inventory.allTypes')}</option>
                    {availableTypes.map((tp) => (
                      <option key={tp} value={tp}>
                        {getItemTypeName(tp, lang)}
                      </option>
                    ))}
                  </select>

                  <select
                    className="gw2-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as InventorySortMode)}
                  >
                    <option value="count-desc">{t('inventory.sortCountDesc')}</option>
                    <option value="value-desc">{t('inventory.sortValueDesc')}</option>
                    <option value="name-asc">{t('inventory.sortNameAsc')}</option>
                    <option value="rarity-desc">{t('inventory.sortRarityDesc')}</option>
                    <option value="locations-desc">{t('inventory.sortLocationsDesc')}</option>
                  </select>
                </div>
              </div>

              {/* Location Filter Pills + Summary Metrics */}
              <div className="inv-search-bottom-row">
                <div className="inv-location-pills">
                  {(
                    [
                      { id: 'all', label: t('inventory.locAll') },
                      { id: 'materials', label: t('inventory.locMaterials') },
                      { id: 'bank', label: t('inventory.locBank') },
                      { id: 'shared', label: t('inventory.locShared') },
                      { id: 'characters', label: t('inventory.locCharacters') },
                      { id: 'equipped', label: t('inventory.locEquipped') },
                      { id: 'multi', label: t('inventory.locMulti') },
                    ] as { id: InventoryLocationFilter; label: string }[]
                  ).map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className={`inv-loc-pill ${locationFilter === loc.id ? 'active' : ''}`}
                      onClick={() => setLocationFilter(loc.id)}
                    >
                      {loc.label}
                    </button>
                  ))}

                  {(searchQuery ||
                    locationFilter !== 'all' ||
                    characterFilter !== 'all' ||
                    rarityFilter !== 'all' ||
                    typeFilter !== 'all') && (
                    <button
                      type="button"
                      className="inv-reset-pill"
                      onClick={() => {
                        setSearchQuery('');
                        setLocationFilter('all');
                        setCharacterFilter('all');
                        setRarityFilter('all');
                        setTypeFilter('all');
                      }}
                    >
                      {t('wvw.resetFilters')}
                    </button>
                  )}
                </div>

                <div className="inv-summary-metrics font-mono">
                  <span className="dim text-xs">
                    {t('inventory.totalItemsFound', { count: fmtInt(filteredItems.length) })}
                  </span>
                  <span className="sep">•</span>
                  <span className="dim text-xs">
                    {t('inventory.totalAccountValue')}:{' '}
                    <strong className="gold">
                      <Coin copper={searchSummary.totalValue} />
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Consolidated Item Location Table */}
            <div className="inv-results-table-wrap">
              <table className="gw2-dense-table inv-results-table">
                <thead>
                  <tr>
                    <th style={{ width: '44px' }}>Icon</th>
                    <th style={{ width: '270px' }}>{t('inventory.colItem')}</th>
                    <th>{t('inventory.colLocations')}</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>{t('inventory.colTotal')}</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>{t('inventory.colValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-table-cell dim py-8 text-center">
                        {t('inventory.emptySearch')}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.slice(0, 200).map((item) => {
                      const isCopied = copiedItemId === item.itemId;
                      return (
                        <tr
                          key={item.itemId}
                          className="inv-item-row cursor-pointer"
                          onClick={() => openDrawer(item.itemId)}
                          title={t('inventory.inspectItem')}
                        >
                          <td className="icon-cell">
                            <ItemIcon id={item.itemId} size="m" />
                          </td>

                          <td className="name-cell">
                            <div className="inv-item-title-block">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-serif font-bold r-${item.rarity ?? 'Basic'}`}>
                                  {item.name}
                                </span>
                                {item.chatLink && (
                                  <button
                                    type="button"
                                    className="inv-copy-chat-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyChatLink(item.itemId, item.chatLink);
                                    }}
                                    title={t('wvw.copyChatLink')}
                                  >
                                    {isCopied ? (
                                      <Check size={11} className="good" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="dim text-[11px]">
                                {item.rarity ? getRarityName(item.rarity as any, lang) : 'Basic'}
                                {item.type ? ` · ${getItemTypeName(item.type, lang)}` : ''}
                                <span className="sep">·</span>
                                <span className="font-mono">#{item.itemId}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="inv-locations-badges-wrap">
                              {item.locations.map((loc, idx) => renderLocationBadge(loc, idx))}
                            </div>
                          </td>

                          <td className="num font-mono">
                            <div className="inv-total-qty-cell">
                              <span className="font-bold text-sm text-[#f4e3a8]">
                                {fmtInt(item.totalCount)}
                              </span>
                              {item.locations.length > 1 && (
                                <span className="dim text-[10px]">
                                  {item.locations.length} {lang === 'en' ? 'places' : 'Orte'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="num font-mono">
                            {item.totalValue !== null && item.totalValue > 0 ? (
                              <div className="inv-value-cell">
                                <Coin copper={item.totalValue} />
                                {item.unitPrice !== null && item.totalStock > 1 && (
                                  <div className="dim text-[10px]">
                                    <Coin copper={item.unitPrice} /> / {lang === 'en' ? 'ea' : 'Stk.'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="dim text-xs">
                                {lang === 'en' ? 'Bound / –' : 'Gebunden / –'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            SUBTAB 2: CHARACTER & INVENTORY OVERVIEW
            ============================================================ */}
        {subTab === 'characters' && (
          <div className="inv-characters-view">
            {(!account.data?.characters || account.data.characters.length === 0) ? (
              <Notice tone="info" title={t('characters.title')}>
                {lang === 'en'
                  ? 'No character data loaded yet. Connect an API key with "characters" and "inventories" permissions and click "Sync Inventory".'
                  : 'Noch keine Charakterdaten geladen. Verbinde einen API-Schlüssel mit den Berechtigungen „characters“ und „inventories“ und klicke auf „Inventar synchronisieren“.'}
              </Notice>
            ) : (
              <div className="inv-characters-grid">
                {account.data.characters.map((ch: AccountCharacter) => {
                  const profColor = PROFESSION_COLORS[ch.profession] ?? '#d2b268';
                  const profLabel =
                    lang === 'de'
                      ? (PROFESSION_DE[ch.profession] ?? ch.profession)
                      : ch.profession;
                  const hoursPlayed = ch.age ? Math.max(1, Math.round(ch.age / 3600)) : null;
                  const bagFrac =
                    ch.bagSlotsTotal > 0 ? Math.min(1, ch.bagSlotsUsed / ch.bagSlotsTotal) : 0;

                  const sortedBagItems = [...(ch.bagItems ?? [])].sort((a, b) => b[1] - a[1]);

                  return (
                    <div
                      key={ch.name}
                      className="inv-character-card"
                      style={{ borderTop: `2px solid ${profColor}` }}
                    >
                      {/* Character Header */}
                      <div className="inv-char-header">
                        <div className="inv-char-title-group">
                          <div className="flex items-center gap-2">
                            <span
                              className="inv-prof-dot"
                              style={{ backgroundColor: profColor }}
                            />
                            <h3 className="font-serif font-bold text-base text-[#f3efe6]">
                              {ch.name}
                            </h3>
                          </div>
                          <div className="dim text-xs">
                            <span style={{ color: profColor }} className="font-semibold">
                              {profLabel}
                            </span>
                            {ch.race ? ` · ${ch.race}` : ''}
                            {' · '}
                            <span>{t('characters.level', { level: ch.level })}</span>
                            {hoursPlayed !== null && (
                              <>
                                {' · '}
                                <span className="font-mono">
                                  {t('characters.playtime', { hours: fmtInt(hoursPlayed) })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="gw2-btn-sm"
                          onClick={() => handleFilterByCharacter(ch.name)}
                          title={t('inventory.filterByChar', { name: ch.name })}
                        >
                          <Search size={12} className="mr-1 inline" />
                          <span>
                            {t('characters.viewAllItems', { count: sortedBagItems.length })}
                          </span>
                        </button>
                      </div>

                      {/* Bag Slot Utilization Bar */}
                      <div className="inv-char-bag-bar">
                        <div
                          className="text-xs"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span className="dim">
                            <Briefcase size={11} className="inline mr-1 gold" />
                            {t('characters.bagUsage', {
                              used: ch.bagSlotsUsed,
                              total: ch.bagSlotsTotal,
                            })}
                          </span>
                          <span className="font-mono dim">
                            {ch.bagCount} {lang === 'en' ? 'bags' : 'Taschen'} (
                            {Math.round(bagFrac * 100)}%)
                          </span>
                        </div>
                        <ProgressBar
                          value={bagFrac}
                          tone={bagFrac > 0.9 ? 'gold' : 'green'}
                          slim
                        />
                      </div>

                      {/* Crafting Disciplines */}
                      <div className="inv-char-section">
                        <div className="inv-char-sec-title dim text-xs">
                          <Hammer size={11} className="inline mr-1 gold" />
                          <span>{t('characters.craftingTitle')}</span>
                        </div>
                        {ch.crafting && ch.crafting.length > 0 ? (
                          <div className="inv-char-disciplines-row">
                            {ch.crafting.map((cr) => (
                              <button
                                key={cr.discipline}
                                type="button"
                                className={`inv-char-disc-chip ${cr.active ? 'is-active' : ''}`}
                                onClick={() => onNavigateTab('crafting')}
                                title={t('characters.openDiscipline')}
                              >
                                <DisciplineIcon
                                  discipline={cr.discipline as DisciplineId}
                                  size="s"
                                />
                                <span>
                                  {getDisciplineName(cr.discipline as DisciplineId, lang)}
                                </span>
                                <strong className="font-mono gold">{cr.rating}</strong>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="dim text-xs">{t('characters.noCrafting')}</span>
                        )}
                      </div>

                      {/* Top Items in Character Bags */}
                      <div className="inv-char-section">
                        <div className="inv-char-sec-title dim text-xs">
                          <Package size={11} className="inline mr-1 gold" />
                          <span>
                            {t('characters.topItemsTitle', { count: sortedBagItems.length })}
                          </span>
                        </div>
                        {sortedBagItems.length > 0 ? (
                          <div className="inv-char-items-strip">
                            {sortedBagItems.slice(0, 8).map(([itemId, count]) => {
                              const meta = getItem(itemId);
                              return (
                                <button
                                  key={itemId}
                                  type="button"
                                  className="inv-char-item-chip"
                                  onClick={() => openDrawer(itemId)}
                                  title={`${meta?.name ?? `#${itemId}`} (${count}×)`}
                                >
                                  <ItemIcon id={itemId} count={count} size="s" />
                                  <span className="truncate max-w-[110px] text-xs">
                                    {meta?.name ?? `#${itemId}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="dim text-xs">
                            {lang === 'en' ? 'No items in character bags.' : 'Keine Gegenstände in den Taschen.'}
                          </span>
                        )}
                      </div>

                      {/* Equipped Gear Preview */}
                      {ch.equipment && ch.equipment.length > 0 && (
                        <div className="inv-char-section">
                          <div className="inv-char-sec-title dim text-xs">
                            <Shield size={11} className="inline mr-1 gold" />
                            <span>
                              {t('characters.equippedTitle', { count: ch.equipment.length })}
                            </span>
                          </div>
                          <div className="inv-char-equip-icons">
                            {ch.equipment.slice(0, 12).map(([eqId, slot], idx) => (
                              <div
                                key={`${eqId}-${slot}-${idx}`}
                                title={`${getItem(eqId)?.name ?? `#${eqId}`} (${slot})`}
                              >
                                <ItemIcon
                                  id={eqId}
                                  size="s"
                                  onClick={() => openDrawer(eqId)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            SUBTAB 3: PVE PROGRESSION GOALS & RESOURCE PLANNING
            ============================================================ */}
        {subTab === 'progression' && (
          <div className="inv-progression-view">
            {/* 1. Key Account Currencies & Legendary Stockpile Strip */}
            <section className="pve-hub-card">
              <div className="pve-hub-card-header">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="gold" />
                  <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                    {t('pve.keyResourcesTitle')}
                  </h3>
                </div>
              </div>

              <div className="pve-key-resources-grid">
                {/* Wallet Currencies */}
                <div className="pve-currency-pill">
                  <span className="dim text-xs">Gold</span>
                  <strong className="font-mono">
                    {walletGold !== null ? <Coin copper={walletGold} /> : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">Karma</span>
                  <strong className="font-mono text-purple-300">
                    {walletKarma !== null ? fmtInt(walletKarma) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">
                    {lang === 'en' ? 'Spirit Shards' : 'Geisterscherben'}
                  </span>
                  <strong className="font-mono text-sky-300">
                    {walletSpiritShards !== null ? fmtInt(walletSpiritShards) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">
                    {lang === 'en' ? 'Laurels' : 'Lorbeeren'}
                  </span>
                  <strong className="font-mono text-emerald-300">
                    {walletLaurels !== null ? fmtInt(walletLaurels) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">
                    {lang === 'en' ? 'Astral Acclaim' : 'Astraler Ruhm'}
                  </span>
                  <strong className="font-mono gold">
                    {walletAstralAcclaim !== null ? fmtInt(walletAstralAcclaim) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">
                    {lang === 'en' ? 'Imperial Favor' : 'Kaiserliche Gunst'}
                  </span>
                  <strong className="font-mono text-teal-300">
                    {walletImperialFavor !== null ? fmtInt(walletImperialFavor) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">
                    {lang === 'en' ? 'Fractal Relics' : 'Fraktal-Relikte'}
                  </span>
                  <strong className="font-mono text-indigo-300">
                    {walletFractalRelics !== null ? fmtInt(walletFractalRelics) : '–'}
                  </strong>
                </div>
                <div className="pve-currency-pill">
                  <span className="dim text-xs">{t('wvw.badgesOfHonor')}</span>
                  <strong className="font-mono text-amber-300">
                    {walletBadgesOfHonor !== null ? fmtInt(walletBadgesOfHonor) : '–'}
                  </strong>
                </div>
              </div>

              {/* Key Legendary Materials with Storage Location Awareness */}
              <div className="pve-key-materials-row">
                {KEY_LEGENDARY_MATERIALS.map((matId) => {
                  const meta = getItem(matId);
                  const inv = inventoryByItem.get(matId);
                  const count = account.stockMap.get(matId) ?? 0;
                  return (
                    <div
                      key={matId}
                      className="pve-key-mat-card cursor-pointer"
                      onClick={() => openDrawer(matId)}
                      title={t('inventory.inspectItem')}
                    >
                      <ItemIcon id={matId} count={count} size="s" />
                      <div className="pve-key-mat-info">
                        <span className="font-serif text-xs font-semibold truncate">
                          {meta?.name ?? `#${matId}`}
                        </span>
                        <span className="font-mono text-xs gold">{fmtInt(count)}</span>
                        {inv && inv.locations.length > 0 && (
                          <div className="dim text-[10px] truncate">
                            {inv.locations
                              .map((l) =>
                                l.kind === 'materials'
                                  ? `Mat: ${l.count}`
                                  : l.kind === 'bank'
                                  ? `Bank: ${l.count}`
                                  : l.kind === 'shared'
                                  ? `Shared: ${l.count}`
                                  : `${l.characterName ?? 'Char'}: ${l.count}`,
                              )
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Tracked Legendary Weapons & Next Practical Steps */}
            <section className="pve-hub-card">
              <div className="pve-hub-card-header">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="gold" />
                  <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                    {t('pve.trackedLegendaries')} ({trackedWeaponPlans.length})
                  </h3>
                </div>
                <button
                  type="button"
                  className="gw2-btn-sm"
                  onClick={() => onNavigateTab('legendary')}
                >
                  <span>{t('pve.openInLegendary')}</span>
                  <ArrowRight size={12} className="ml-1 inline" />
                </button>
              </div>

              {trackedWeaponPlans.length === 0 ? (
                <p className="dim text-xs py-2">{t('pve.noTrackedLegendaries')}</p>
              ) : (
                <div className="pve-tracked-legendaries-grid">
                  {trackedWeaponPlans.map(({ weapon, tree, nextCraftStep }) => {
                    const wItem = getItem(weapon.id);
                    const pct = Math.round(tree.progress * 100);
                    const nextItem = nextCraftStep ? getItem(nextCraftStep.itemId) : undefined;

                    return (
                      <div key={weapon.id} className="pve-legendary-goal-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <ItemIcon
                              id={weapon.id}
                              size="m"
                              onClick={() => openDrawer(weapon.id)}
                            />
                            <div>
                              <h4 className="font-serif font-bold text-sm r-Legendary">
                                {wItem?.name ?? weapon.nameEn}
                              </h4>
                              <span className="dim text-xs font-mono">
                                Gen {weapon.generation} • {tree.components.complete} /{' '}
                                {tree.components.total} {lang === 'en' ? 'steps' : 'Schritte'}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-base gold">{pct}%</span>
                        </div>

                        <ProgressBar
                          value={tree.progress}
                          tone={tree.progress >= 1 ? 'gold' : 'green'}
                        />

                        {nextCraftStep && (
                          <div
                            className="pve-next-step-box cursor-pointer"
                            onClick={() => openDrawer(nextCraftStep.itemId)}
                          >
                            <ItemIcon id={nextCraftStep.itemId} size="s" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-[#f3efe6] truncate">
                                {t('pve.nextStepCraft', {
                                  name: nextItem?.name ?? `#${nextCraftStep.itemId}`,
                                })}
                              </div>
                              <div className="dim text-[11px]">
                                {nextCraftStep.children
                                  .slice(0, 3)
                                  .map(
                                    (c) =>
                                      `${getItem(c.itemId)?.name ?? `#${c.itemId}`} (${c.fromStock}/${c.demand})`,
                                  )
                                  .join(' + ')}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Shared Material Demand & Storage Locations Across Goals (Deduplicated) */}
            {sharedGoalMaterials.length > 0 && (
              <section className="pve-hub-card">
                <div className="pve-hub-card-header">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="gold" />
                      <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                        {t('pve.sharedMaterialsTitle')}
                      </h3>
                    </div>
                    <p className="dim text-xs mt-0.5">{t('pve.sharedMaterialsDesc')}</p>
                  </div>
                </div>

                <div className="table-responsive-wrap">
                  <table className="gw2-dense-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Icon</th>
                        <th>{t('inventory.colItem')}</th>
                        <th>{lang === 'en' ? 'Used By Goals' : 'Benötigt für Ziele'}</th>
                        <th style={{ textAlign: 'right' }}>{t('crafting.colGross')}</th>
                        <th style={{ textAlign: 'right' }}>{t('crafting.colStock')}</th>
                        <th style={{ textAlign: 'right' }}>{t('crafting.colMissing')}</th>
                        <th>{t('inventory.colLocations')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedGoalMaterials.slice(0, 25).map((row) => {
                        const meta = getItem(row.itemId);
                        return (
                          <tr
                            key={row.itemId}
                            className="cursor-pointer"
                            onClick={() => openDrawer(row.itemId)}
                          >
                            <td>
                              <ItemIcon id={row.itemId} size="s" />
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-serif font-semibold r-${meta?.rarity ?? 'Basic'}`}>
                                  {meta?.name ?? `#${row.itemId}`}
                                </span>
                                {row.isSharedAcrossGoals && (
                                  <span className="pve-shared-goal-pill">
                                    {t('pve.sharedAcross', { count: row.usedByGoals.length })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="dim text-xs">
                              {row.usedByGoals
                                .map((g) => `${g.goalName} (${fmtInt(g.required)})`)
                                .join(' · ')}
                            </td>
                            <td className="num font-mono font-bold">
                              {fmtInt(row.combinedRequired)}
                            </td>
                            <td className="num font-mono good">{fmtInt(row.accountStock)}</td>
                            <td className="num font-mono">
                              {row.netMissing > 0 ? (
                                <span className="warn font-bold">{fmtInt(row.netMissing)}</span>
                              ) : (
                                <span className="good">✓ 0</span>
                              )}
                            </td>
                            <td>
                              {row.locations.length > 0 ? (
                                <div className="inv-locations-badges-wrap">
                                  {row.locations.map((loc, idx) => renderLocationBadge(loc, idx))}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-tiny"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLocateItemInSearch(meta?.name ?? String(row.itemId));
                                  }}
                                >
                                  <Search size={10} className="mr-1 inline" />
                                  <span>{t('pve.locateInInventory')}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 4. Crafting Progression & Pinned Achievements Split Grid */}
            <div className="pve-bottom-split-grid">
              {/* Active Crafting Disciplines */}
              <section className="pve-hub-card">
                <div className="pve-hub-card-header">
                  <div className="flex items-center gap-2">
                    <Hammer size={16} className="gold" />
                    <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                      {t('pve.activeCraftingTitle')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="gw2-btn-sm"
                    onClick={() => onNavigateTab('crafting')}
                  >
                    <span>{t('characters.openDiscipline')}</span>
                    <ArrowRight size={12} className="ml-1 inline" />
                  </button>
                </div>

                <div className="pve-crafting-grid">
                  {ALL_DISCIPLINES.map(({ id, maxRank }) => {
                    const accCraft = account.data?.crafting?.[id];
                    const manual = progress.crafting[id];
                    const rank = accCraft?.rating ?? manual?.start ?? 0;
                    const target = manual?.target ?? maxRank;
                    const frac = Math.min(1, rank / maxRank);

                    return (
                      <div
                        key={id}
                        className="pve-craft-row cursor-pointer"
                        onClick={() => onNavigateTab('crafting')}
                      >
                        <DisciplineIcon discipline={id} size="s" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs">
                            <span className="font-serif font-semibold">
                              {getDisciplineName(id, lang)}
                            </span>
                            <span className="font-mono">
                              <strong className={rank >= maxRank ? 'gold' : 'text-[#f3efe6]'}>
                                {rank}
                              </strong>{' '}
                              / { target > rank ? target : maxRank}
                            </span>
                          </div>
                          <ProgressBar
                            value={frac}
                            tone={rank >= maxRank ? 'gold' : 'green'}
                            slim
                          />
                          {accCraft?.character && (
                            <span className="dim text-[10px]">
                              <User size={9} className="inline mr-0.5" />
                              {accCraft.character}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Pinned Achievements & Daily Routine */}
              <section className="pve-hub-card">
                <div className="pve-hub-card-header">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="gold" />
                    <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                      {t('pve.pinnedAchievementsTitle')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="gw2-btn-sm"
                    onClick={() => onNavigateTab('achievements')}
                  >
                    <span>{t('nav.achievements')}</span>
                    <ArrowRight size={12} className="ml-1 inline" />
                  </button>
                </div>

                {/* Daily Routine Summary */}
                {dailyProgression && (
                  <div className="pve-daily-summary-strip">
                    {dailyProgression.wizardsVault && (
                      <div className="pve-daily-pill">
                        <span className="dim text-xs">{t('wvw.wizardsVaultDaily')}</span>
                        <strong className="font-mono gold">
                          {dailyProgression.wizardsVault.meta_progress_current} /{' '}
                          {dailyProgression.wizardsVault.meta_progress_complete}
                        </strong>
                      </div>
                    )}
                    <div className="pve-daily-pill">
                      <span className="dim text-xs">{t('events.bosses')}</span>
                      <strong className="font-mono good">
                        {dailyProgression.worldBosses.length}
                      </strong>
                    </div>
                    <div className="pve-daily-pill">
                      <span className="dim text-xs">Meta Chests</span>
                      <strong className="font-mono text-sky-300">
                        {dailyProgression.mapChests.length}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Pinned Achievements List */}
                <div className="pve-pinned-ach-list">
                  {pinnedAchievements.map(({ id, title, user }) => {
                    const current = user?.current ?? 0;
                    const max = user?.max ?? 1;
                    const done = Boolean(user?.done);
                    const frac = done ? 1 : Math.min(1, current / Math.max(1, max));

                    return (
                      <div
                        key={id}
                        className="pve-pinned-ach-row cursor-pointer"
                        onClick={() => onNavigateTab('achievements')}
                      >
                        <Star size={13} className="gold shrink-0" fill="#d2b268" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs">
                            <span className="font-serif font-semibold truncate">
                              {title}
                            </span>
                            <span className="font-mono text-xs">
                              {done ? (
                                <span className="good">✓ {t('wvw.done')}</span>
                              ) : (
                                `${fmtInt(current)} / ${fmtInt(max)}`
                              )}
                            </span>
                          </div>
                          <ProgressBar value={frac} tone={done ? 'gold' : 'green'} slim />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Drawer (MaterialDetail) */}
      {activeDrawerItem !== undefined && (
        <MaterialDetail
          itemId={activeDrawerItem}
          model={legendaryModel}
          canGoBack={drawerStack.length > 1}
          onBack={popDrawer}
          onClose={closeDrawer}
          onOpenItem={openDrawer}
        />
      )}
    </div>
  );
};
