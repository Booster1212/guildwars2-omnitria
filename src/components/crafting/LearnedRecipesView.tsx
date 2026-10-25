import React, { useState, useMemo, useEffect } from 'react';
import type { DisciplineId, Recipe } from '../../domain/types';
import { useRecipeDb } from '../../data/gw2/recipes';
import { useAccountState } from '../../data/gw2/account';
import { usePrices } from '../../data/gw2/prices';
import { getItem, useItems } from '../../data/gw2/items';
import { CURATED_DISCOVERIES } from '../../data/crafting/curatedDiscoveries';
import {
  getCraftingTiers,
  getDisciplineName,
  getRecipeTypeName,
} from '../common/labels';
import { Coin, ItemIcon, ProgressBar } from '../common/ui';
import { isDiscoveryRecipe, estimateRecipeCost } from '../../domain/discovery';
import {
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCheck,
  Layers,
  BookOpen,
  Scroll,
  Hammer,
  Sparkles,
  Info,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface LearnedRecipesViewProps {
  discipline: DisciplineId;
  maxRank: number;
  currentRank: number;
  onOpenItem: (id: number) => void;
}

export type RecipeStatusFilter =
  | 'all'
  | 'learned'
  | 'craftable'
  | 'auto'
  | 'sheet'
  | 'discovery';

export type RecipeSortOption =
  | 'rating_asc'
  | 'rating_desc'
  | 'name_asc'
  | 'cost_asc'
  | 'cost_desc'
  | 'craftable_first';

const PAGE_SIZE = 24;

export const LearnedRecipesView: React.FC<LearnedRecipesViewProps> = ({
  discipline,
  maxRank,
  currentRank,
  onOpenItem,
}) => {
  const { t, lang } = useTranslation();
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();

  const craftingTiers = useMemo(() => getCraftingTiers(lang), [lang]);
  const discName = useMemo(() => getDisciplineName(discipline, lang), [discipline, lang]);

  // Default tier: match current rank tier (or 't1' if rank 0)
  const defaultTierId = useMemo(() => {
    const tier = craftingTiers.find(
      (t) => t.id !== 'all' && currentRank >= t.minRating && currentRank <= t.maxRating,
    );
    return tier ? tier.id : 'all';
  }, [craftingTiers, currentRank]);

  const [selectedTier, setSelectedTier] = useState<string>(defaultTierId);
  const [statusFilter, setStatusFilter] = useState<RecipeStatusFilter>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<RecipeSortOption>('rating_asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // All recipes for this discipline
  const allDisciplineRecipes = useMemo(() => {
    const list =
      recipeDb.status === 'ready' && recipeDb.recipes.length > 0
        ? recipeDb.recipes
        : CURATED_DISCOVERIES;
    return list.filter((r) => r.disciplines.includes(discipline));
  }, [recipeDb.recipes, recipeDb.status, discipline]);

  // Collect all unique item IDs for preloading names & icons into cache
  const allDisciplineItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of allDisciplineRecipes) {
      ids.add(r.outputId);
      for (const ing of r.ingredients) {
        ids.add(ing.itemId);
      }
    }
    return Array.from(ids);
  }, [allDisciplineRecipes]);

  const itemsState = useItems(allDisciplineItemIds);

  // Active tier bounds
  const tierBounds = useMemo(() => {
    if (selectedTier === 'relevant') {
      const min = Math.max(0, currentRank - 25);
      const max = Math.min(maxRank, currentRank + 25);
      return { min, max, label: `${lang === 'en' ? 'Rank' : 'Rang'} ${min}–${max}` };
    }
    const found = craftingTiers.find((t) => t.id === selectedTier);
    if (!found || found.id === 'all') {
      return { min: 0, max: maxRank, label: lang === 'en' ? 'All Tiers' : 'Alle Stufen' };
    }
    return { min: found.minRating, max: found.maxRating, label: found.label };
  }, [selectedTier, currentRank, maxRank, craftingTiers, lang]);

  // Helper to check if a recipe is learned
  const checkIsLearned = React.useCallback(
    (r: Recipe): boolean => {
      const isAuto = Boolean(r.flags?.includes('AutoLearned'));
      if (account.knownRecipeSet !== null) {
        return (
          account.knownRecipeSet.has(Number(r.id)) ||
          (isAuto && r.rating <= currentRank)
        );
      }
      return isAuto && r.rating <= currentRank;
    },
    [account.knownRecipeSet, currentRank],
  );

  // Helper to check if recipe can be crafted right now with account stock
  const checkCanCraftNow = React.useCallback(
    (r: Recipe): boolean => {
      if (!r.ingredients || r.ingredients.length === 0) return false;
      return r.ingredients.every((ing) => {
        const inStock = account.stockMap.get(ing.itemId) ?? 0;
        return inStock >= ing.count;
      });
    },
    [account.stockMap],
  );

  // Discipline & Tier Statistics
  const stats = useMemo(() => {
    let tierTotal = 0;
    let learned = 0;
    let craftable = 0;
    let autoLearned = 0;
    let sheets = 0;
    let discoveries = 0;

    for (const r of allDisciplineRecipes) {
      const inTier = r.rating >= tierBounds.min && r.rating <= tierBounds.max;
      if (!inTier) continue;

      tierTotal++;
      const isLrn = checkIsLearned(r);
      const isCrf = checkCanCraftNow(r);
      const isAuto = Boolean(r.flags?.includes('AutoLearned'));
      const isSht = Boolean(r.flags?.includes('LearnedFromItem'));
      const isDisc = isDiscoveryRecipe(r);

      if (isLrn) learned++;
      if (isCrf) craftable++;
      if (isAuto) autoLearned++;
      if (isSht) sheets++;
      if (isDisc) discoveries++;
    }

    const pctLearned = tierTotal > 0 ? Math.round((learned / tierTotal) * 100) : 0;
    return {
      tierTotal,
      learned,
      craftable,
      autoLearned,
      sheets,
      discoveries,
      pctLearned,
    };
  }, [allDisciplineRecipes, tierBounds, checkIsLearned, checkCanCraftNow]);

  // Available recipe types in active tier
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const r of allDisciplineRecipes) {
      if (r.rating < tierBounds.min || r.rating > tierBounds.max) continue;
      if (r.type) types.add(r.type);
    }
    return Array.from(types).sort();
  }, [allDisciplineRecipes, tierBounds]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allDisciplineRecipes.filter((r) => {
      // Tier bounds
      if (r.rating < tierBounds.min || r.rating > tierBounds.max) return false;

      // Subtype
      if (selectedType !== 'all' && r.type !== selectedType) return false;

      // Status
      const isLrn = checkIsLearned(r);
      const isCrf = checkCanCraftNow(r);
      const isAuto = Boolean(r.flags?.includes('AutoLearned'));
      const isSht = Boolean(r.flags?.includes('LearnedFromItem'));
      const isDisc = isDiscoveryRecipe(r);

      if (statusFilter === 'learned' && !isLrn) return false;
      if (statusFilter === 'craftable' && !isCrf) return false;
      if (statusFilter === 'auto' && !isAuto) return false;
      if (statusFilter === 'sheet' && !isSht) return false;
      if (statusFilter === 'discovery' && !isDisc) return false;

      // Search Query
      if (query) {
        const outItem = getItem(r.outputId);
        const outName = outItem?.name?.toLowerCase() ?? '';
        const recipeType = r.type ? getRecipeTypeName(r.type, lang).toLowerCase() : '';

        const matchesOutput = outName.includes(query) || recipeType.includes(query) || String(r.id).includes(query);
        if (matchesOutput) return true;

        for (const ing of r.ingredients) {
          const ingItem = getItem(ing.itemId);
          if (ingItem?.name?.toLowerCase().includes(query)) {
            return true;
          }
        }
        return false;
      }

      return true;
    });
  }, [
    allDisciplineRecipes,
    tierBounds,
    selectedType,
    statusFilter,
    searchQuery,
    checkIsLearned,
    checkCanCraftNow,
    itemsState.version,
    lang,
  ]);

  // Cross-tier search matches count if user is searching in a specific tier
  const crossTierMatchesCount = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || selectedTier === 'all') return 0;

    let hits = 0;
    for (const r of allDisciplineRecipes) {
      if (selectedType !== 'all' && r.type !== selectedType) continue;

      const outItem = getItem(r.outputId);
      const outName = outItem?.name?.toLowerCase() ?? '';
      const recipeType = r.type ? getRecipeTypeName(r.type, lang).toLowerCase() : '';

      const matchesOutput = outName.includes(query) || recipeType.includes(query) || String(r.id).includes(query);
      if (matchesOutput) {
        hits++;
        continue;
      }

      for (const ing of r.ingredients) {
        const ingItem = getItem(ing.itemId);
        if (ingItem?.name?.toLowerCase().includes(query)) {
          hits++;
          break;
        }
      }
    }
    return hits;
  }, [allDisciplineRecipes, searchQuery, selectedTier, selectedType, lang]);

  // Preload prices for visible candidate recipes
  const visibleItemIds = useMemo(() => {
    const ids = new Set<number>();
    filteredRecipes.slice(0, 100).forEach((r) => {
      ids.add(r.outputId);
      r.ingredients.forEach((ing) => ids.add(ing.itemId));
    });
    return Array.from(ids);
  }, [filteredRecipes]);

  const prices = usePrices(visibleItemIds);

  // Sorted recipes
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      const nameA = getItem(a.outputId)?.name ?? '';
      const nameB = getItem(b.outputId)?.name ?? '';

      switch (sortOrder) {
        case 'rating_asc':
          return a.rating - b.rating || nameA.localeCompare(nameB);
        case 'rating_desc':
          return b.rating - a.rating || nameA.localeCompare(nameB);
        case 'name_asc':
          return nameA.localeCompare(nameB);
        case 'cost_asc': {
          const costA = estimateRecipeCost(a, prices.map).totalCost;
          const costB = estimateRecipeCost(b, prices.map).totalCost;
          return costA - costB || a.rating - b.rating;
        }
        case 'cost_desc': {
          const costA = estimateRecipeCost(a, prices.map).totalCost;
          const costB = estimateRecipeCost(b, prices.map).totalCost;
          return costB - costA || a.rating - b.rating;
        }
        case 'craftable_first': {
          const crfA = checkCanCraftNow(a);
          const crfB = checkCanCraftNow(b);
          if (crfA !== crfB) return crfA ? -1 : 1;
          return a.rating - b.rating;
        }
        default:
          return a.rating - b.rating;
      }
    });
  }, [filteredRecipes, sortOrder, prices.map, checkCanCraftNow]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRecipes.length / PAGE_SIZE));
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedRecipes.slice(start, start + PAGE_SIZE);
  }, [sortedRecipes, currentPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTier, statusFilter, selectedType, searchQuery, sortOrder]);

  const handleCopyChatLink = (item: { chatLink?: string } | undefined, recipeId: number | string) => {
    if (!item?.chatLink) return;
    navigator.clipboard
      ?.writeText(item.chatLink)
      .then(() => {
        setCopiedId(String(recipeId));
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="discovery-view-container recipe-catalog-container">
      {/* Top Banner: Stats & Unlock Summary */}
      <div className="discovery-stats-banner">
        <div className="stats-info">
          <span className="stats-title font-serif">
            {discName} – {t('crafting.learnedCatalogTitle')} ({tierBounds.label}):
          </span>
          <span className="stats-counts">
            <strong>{stats.learned}</strong> {lang === 'en' ? 'of' : 'von'}{' '}
            <strong>{stats.tierTotal}</strong> {lang === 'en' ? 'recipes learned' : 'Rezepten erlernt'} (
            {stats.pctLearned} %)
            {stats.craftable > 0 && (
              <span className="craftable-highlight-badge" title="Instantly craftable from your stock">
                <Hammer size={12} /> <strong>{stats.craftable}</strong> {lang === 'en' ? 'craftable now' : 'sofort herstellbar'}
              </span>
            )}
          </span>
          {account.knownRecipeSet === null && (
            <span className="stats-no-key dim">
              ({lang === 'en'
                ? 'Connect an API key with "unlocks" & "inventories" to track live unlocks & stock'
                : 'Verbinde einen API-Schlüssel mit „unlocks“ & „inventories“, um Freischaltungen & Lager live zu sehen'})
            </span>
          )}
        </div>
        <div className="stats-bar-wrapper">
          <ProgressBar
            value={stats.pctLearned / 100}
            tone={stats.pctLearned >= 100 ? 'gold' : 'green'}
          />
        </div>
      </div>

      {/* Tier Filter Bar */}
      <div className="discovery-tier-bar">
        <div className="tier-chips-label">{t('crafting.tier')}</div>
        <div className="tier-chips-row">
          <button
            className={`tier-chip ${selectedTier === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTier('all')}
          >
            <span className="tier-name">{lang === 'en' ? 'All (0–500)' : 'Alle (0–500)'}</span>
          </button>

          <button
            className={`tier-chip ${selectedTier === 'relevant' ? 'active' : ''} matches-rank`}
            onClick={() => setSelectedTier('relevant')}
            title={t('crafting.relevantRankChip', { rank: currentRank })}
          >
            <span className="tier-name">
              {lang === 'en'
                ? `Rank ${Math.max(0, currentRank - 25)}–${Math.min(maxRank, currentRank + 25)}`
                : `Rang ${Math.max(0, currentRank - 25)}–${Math.min(maxRank, currentRank + 25)}`}
            </span>
            <span className="tier-current-dot" title="Matches current character rank" />
          </button>

          {craftingTiers
            .filter((t) => t.id !== 'all')
            .map((tier) => {
              const isMatchCurrent =
                currentRank >= tier.minRating && currentRank <= tier.maxRating;
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  className={`tier-chip ${isSelected ? 'active' : ''} ${
                    isMatchCurrent ? 'matches-rank' : ''
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                  title={`${tier.label} (${tier.materials})`}
                >
                  <span className="tier-name">{tier.shortLabel}</span>
                  {isMatchCurrent && <span className="tier-current-dot" title="Current rank" />}
                </button>
              );
            })}
        </div>

        {currentRank > 0 && selectedTier !== defaultTierId && (
          <button
            className="tier-jump-btn"
            onClick={() => setSelectedTier(defaultTierId)}
            title="Jump to current rank"
          >
            {t('crafting.jumpToRank', { rank: currentRank })}
          </button>
        )}
      </div>

      {/* Controls & Filter Pills Bar */}
      <div className="discovery-controls-bar">
        {/* Status Filter Pills */}
        <div className="status-filter-pills">
          <button
            className={`status-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t('crafting.statusAll')} ({stats.tierTotal})
          </button>

          <button
            className={`status-pill learned ${statusFilter === 'learned' ? 'active' : ''}`}
            onClick={() => setStatusFilter('learned')}
            title="Learned or Auto-Learned recipes"
          >
            <Check size={13} />
            <span>
              {t('crafting.statusLearned')} ({stats.learned})
            </span>
          </button>

          <button
            className={`status-pill craftable ${statusFilter === 'craftable' ? 'active' : ''}`}
            onClick={() => setStatusFilter('craftable')}
            title="Recipes where all ingredients are available in your stock"
          >
            <Hammer size={13} />
            <span>
              {t('crafting.statusCraftable')} ({stats.craftable})
            </span>
          </button>

          <button
            className={`status-pill auto ${statusFilter === 'auto' ? 'active' : ''}`}
            onClick={() => setStatusFilter('auto')}
            title="Recipes automatically unlocked when reaching crafting rank"
          >
            <BookOpen size={13} />
            <span>
              {t('crafting.statusAutoLearned')} ({stats.autoLearned})
            </span>
          </button>

          <button
            className={`status-pill sheet ${statusFilter === 'sheet' ? 'active' : ''}`}
            onClick={() => setStatusFilter('sheet')}
            title="Recipes unlocked from Recipe Sheets & Scrolls"
          >
            <Scroll size={13} />
            <span>
              {t('crafting.statusRecipeSheet')} ({stats.sheets})
            </span>
          </button>

          <button
            className={`status-pill undiscovered ${statusFilter === 'discovery' ? 'active' : ''}`}
            onClick={() => setStatusFilter('discovery')}
            title="Discovery Recipes"
          >
            <Sparkles size={13} />
            <span>
              {t('crafting.statusDiscovery')} ({stats.discoveries})
            </span>
          </button>
        </div>

        {/* Subtype Dropdown */}
        {availableTypes.length > 0 && (
          <div className="type-filter-group">
            <Filter size={13} className="filter-icon dim" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="gw2-select type-select"
            >
              <option value="all">
                {lang === 'en'
                  ? `All Categories (${availableTypes.length})`
                  : `Alle Kategorien (${availableTypes.length})`}
              </option>
              {availableTypes.map((itemType) => (
                <option key={itemType} value={itemType}>
                  {getRecipeTypeName(itemType, lang)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Input */}
        <div className="discovery-search-box">
          <Search size={14} className="search-icon dim" />
          <input
            type="text"
            placeholder={t('crafting.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gw2-input search-input"
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="sort-group">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as RecipeSortOption)}
            className="gw2-select sort-select"
          >
            <option value="rating_asc">{t('crafting.sortRatingAsc')}</option>
            <option value="rating_desc">{t('crafting.sortRatingDesc')}</option>
            <option value="name_asc">{t('crafting.sortNameAsc')}</option>
            <option value="craftable_first">{t('crafting.sortCraftableFirst')}</option>
            <option value="cost_asc">{t('crafting.sortCostAsc')}</option>
            <option value="cost_desc">
              {lang === 'en' ? 'Crafting cost: highest' : 'Herstellungskosten: höchste'}
            </option>
          </select>
        </div>
      </div>

      {/* Grid Results Header */}
      <div className="discovery-grid-header">
        <span className="results-count">
          {sortedRecipes.length} {t('crafting.allRecipesFound')} ({tierBounds.label})
        </span>
        {totalPages > 1 && (
          <div className="pagination-summary dim">
            {lang === 'en'
              ? `Page ${currentPage} of ${totalPages}`
              : `Seite ${currentPage} von ${totalPages}`}
          </div>
        )}
      </div>

      {/* Cross-Tier Search Suggestion Banner */}
      {sortedRecipes.length === 0 && crossTierMatchesCount > 0 && (
        <div className="discovery-cross-tier-notice">
          <div className="cross-tier-text">
            <Info size={16} className="text-amber-400" />
            <span>
              {t('crafting.searchNoCatalogResultsInTier', { tier: tierBounds.label })}{' '}
              <strong>
                {t('crafting.searchCatalogCrossTierHits', { count: crossTierMatchesCount })}
              </strong>
            </span>
          </div>
          <button
            type="button"
            className="cross-tier-btn"
            onClick={() => setSelectedTier('all')}
          >
            <Layers size={13} />
            {t('crafting.searchShowAllCatalogTiers', { count: crossTierMatchesCount })}
          </button>
        </div>
      )}

      {/* Empty State */}
      {sortedRecipes.length === 0 ? (
        <div className="discovery-empty-state">
          <BookOpen size={32} className="dim text-amber-400" />
          <p className="empty-title">
            {searchQuery.trim()
              ? lang === 'en'
                ? 'No recipes matching your search query.'
                : 'Keine Rezepte passend zu deiner Suchanfrage gefunden.'
              : lang === 'en'
              ? 'No recipes found for these filter criteria.'
              : 'Keine Rezepte für diese Filterkriterien gefunden.'}
          </p>
          <div className="dim empty-subtitle">
            {searchQuery.trim() ? (
              <button
                type="button"
                className="btn-tiny"
                onClick={() => setSearchQuery('')}
                style={{ marginTop: '6px' }}
              >
                {t('crafting.searchReset')}
              </button>
            ) : (
              lang === 'en'
                ? 'Try another crafting tier or choose "All Categories".'
                : 'Versuche eine andere Rangstufe oder wähle „Alle Kategorien“.'
            )}
          </div>
        </div>
      ) : (
        /* Recipe Cards Grid */
        <div className="discovery-cards-grid">
          {paginatedRecipes.map((r) => {
            const outItem = getItem(r.outputId);
            const isLrn = checkIsLearned(r);
            const isCrf = checkCanCraftNow(r);
            const isAuto = Boolean(r.flags?.includes('AutoLearned'));
            const isSht = Boolean(r.flags?.includes('LearnedFromItem'));
            const cost = estimateRecipeCost(r, prices.map);
            const typeLabel = r.type ? getRecipeTypeName(r.type, lang) : '';

            return (
              <div
                key={r.id}
                className={`discovery-recipe-card ${
                  isCrf ? 'is-craftable' : isLrn ? 'is-discovered' : 'is-undiscovered'
                }`}
              >
                {/* Header: Output Item */}
                <div className="drc-header">
                  <div className="drc-output-left">
                    <ItemIcon
                      id={r.outputId}
                      size="m"
                      onClick={() => onOpenItem(r.outputId)}
                    />
                    <div className="drc-title-meta">
                      <span
                        className="drc-item-name font-serif cursor-pointer hover:underline"
                        onClick={() => onOpenItem(r.outputId)}
                        title={outItem?.name ?? `#${r.outputId}`}
                      >
                        {outItem?.name ?? `#${r.outputId}`}
                      </span>
                      <div className="drc-tags-row">
                        <span className="drc-rank-tag">
                          {lang === 'en' ? `Rank ${r.rating}` : `Rang ${r.rating}`}
                        </span>
                        {typeLabel && <span className="drc-type-tag dim">{typeLabel}</span>}
                        {r.outputCount > 1 && (
                          <span className="drc-type-tag font-mono dim" title="Yield count">
                            {r.outputCount}×
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="drc-badge-wrapper">
                    {isCrf ? (
                      <span className="disc-status-badge craftable" title="Craftable now with current materials">
                        <Hammer size={11} /> {t('crafting.craftableBadge')}
                      </span>
                    ) : isLrn ? (
                      <span className="disc-status-badge known" title="Learned on your account">
                        <Check size={11} /> {t('crafting.learnedBadge')}
                      </span>
                    ) : isSht ? (
                      <span className="disc-status-badge sheet" title="Requires recipe sheet unlock">
                        <Scroll size={11} /> {t('crafting.recipeSheetBadge')}
                      </span>
                    ) : isAuto ? (
                      <span className="disc-status-badge auto" title="Automatically learned at rank">
                        <BookOpen size={11} /> {t('crafting.autoLearnedBadge')}
                      </span>
                    ) : (
                      <span className="disc-status-badge neutral" title="Discoverable at station">
                        <Sparkles size={11} /> {t('crafting.discoveryBadge')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ingredients Box */}
                <div className="drc-ingredients-box">
                  <div className="drc-ing-headline">
                    <span className="dim">{t('crafting.requiredMaterials')}</span>
                  </div>
                  <div className="drc-ingredients-list">
                    {r.ingredients.map((ing) => {
                      const ingItem = getItem(ing.itemId);
                      const inStock = account.stockMap.get(ing.itemId) ?? 0;
                      const hasEnough = inStock >= ing.count;

                      return (
                        <div
                          key={ing.itemId}
                          className={`drc-ing-item cursor-pointer ${
                            hasEnough ? 'stock-ok' : ''
                          }`}
                          onClick={() => onOpenItem(ing.itemId)}
                          title={`${ingItem?.name ?? ing.itemId} (${t(
                            'crafting.inStock',
                          )} ${inStock})`}
                        >
                          <ItemIcon id={ing.itemId} count={ing.count} size="s" />
                          <div className="drc-ing-info">
                            <span className="drc-ing-name">
                              {ingItem?.name ?? `#${ing.itemId}`}
                            </span>
                            <span className="drc-ing-stock">
                              {account.hasStockData ? (
                                hasEnough ? (
                                  <span className="stock-badge ok">
                                    ✓ {inStock} / {ing.count}
                                  </span>
                                ) : (
                                  <span className="stock-badge missing">
                                    ✕ {inStock} / {ing.count}
                                  </span>
                                )
                              ) : (
                                <span className="stock-badge dim font-mono">
                                  {ing.count}×
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Cost and Actions */}
                <div className="drc-footer">
                  <div className="drc-cost-block">
                    <span className="dim cost-label">{t('crafting.costEstimate')}</span>
                    {cost.totalCost > 0 ? (
                      <Coin copper={cost.totalCost} />
                    ) : (
                      <span className="dim text-xs">{t('crafting.pricesLoading')}</span>
                    )}
                  </div>

                  <div className="drc-actions">
                    {outItem?.chatLink && (
                      <button
                        className="drc-action-btn copy-btn"
                        onClick={() => handleCopyChatLink(outItem, r.id)}
                        title="Copy chat link"
                      >
                        {copiedId === String(r.id) ? (
                          <CheckCheck size={13} className="text-green-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                        <span>
                          {copiedId === String(r.id) ? t('events.copied') : t('crafting.chatCode')}
                        </span>
                      </button>
                    )}
                    <button
                      className="drc-action-btn details-btn"
                      onClick={() => onOpenItem(r.outputId)}
                      title="Item Details"
                    >
                      <Layers size={13} />
                      <span>{t('crafting.details')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="discovery-pagination-bar">
          <button
            className="gw2-btn pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} /> {t('crafting.prev')}
          </button>
          <span className="pagination-page-indicator font-mono">
            {lang === 'en'
              ? `Page ${currentPage} of ${totalPages}`
              : `Seite ${currentPage} von ${totalPages}`}
          </span>
          <button
            className="gw2-btn pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            {t('crafting.next')} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
