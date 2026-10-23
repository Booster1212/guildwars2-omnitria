import React, { useState, useMemo } from 'react';
import type { DisciplineId, Recipe } from '../../domain/types';
import { useRecipeDb } from '../../data/gw2/recipes';
import { useAccountState } from '../../data/gw2/account';
import { usePrices } from '../../data/gw2/prices';
import { getItem, useItems } from '../../data/gw2/items';
import { CURATED_DISCOVERIES } from '../../data/crafting/curatedDiscoveries';
import {
  CRAFTING_TIERS,
  DISCIPLINE_DE,
  DISCOVERY_GUIDES,
  RECIPE_TYPE_DE,
  fmtInt,
} from '../common/labels';
import { Coin, ItemIcon, ProgressBar } from '../common/ui';
import {
  computeDiscoveryStats,
  filterDiscoveryRecipes,
  estimateRecipeCost,
  type DiscoveryStatusFilter,
} from '../../domain/discovery';
import {
  Sparkles,
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Copy,
  CheckCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface DiscoveryViewProps {
  discipline: DisciplineId;
  maxRank: number;
  currentRank: number;
  onOpenItem: (id: number) => void;
}

const PAGE_SIZE = 24;

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  discipline,
  maxRank,
  currentRank,
  onOpenItem,
}) => {
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();

  // Tier selection: default to tier matching current rank
  const defaultTierId = useMemo(() => {
    const tier = CRAFTING_TIERS.find(
      (t) => t.id !== 'all' && currentRank >= t.minRating && currentRank <= t.maxRating,
    );
    return tier ? tier.id : 'all';
  }, [currentRank]);

  const [selectedTier, setSelectedTier] = useState<string>(defaultTierId);
  const [statusFilter, setStatusFilter] = useState<DiscoveryStatusFilter>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'rating_asc' | 'rating_desc' | 'cost_asc' | 'undiscovered_first'>('rating_asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // All recipes for this discipline (use full DB if ready, fallback to curated dataset)
  const allDisciplineRecipes = useMemo(() => {
    if (recipeDb.status === 'ready' && recipeDb.recipes.length > 0) {
      return recipeDb.recipes;
    }
    return CURATED_DISCOVERIES;
  }, [recipeDb.recipes, recipeDb.status]);

  const activeTier = useMemo(() => {
    return CRAFTING_TIERS.find((t) => t.id === selectedTier) ?? CRAFTING_TIERS[0];
  }, [selectedTier]);

  // Overall stats for this tier
  const stats = useMemo(() => {
    return computeDiscoveryStats(
      allDisciplineRecipes,
      discipline,
      account.knownRecipeSet,
      activeTier.minRating,
      activeTier.maxRating,
    );
  }, [allDisciplineRecipes, discipline, account.knownRecipeSet, activeTier.minRating, activeTier.maxRating]);

  // Available types in this tier
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const r of allDisciplineRecipes) {
      if (!r.disciplines.includes(discipline)) continue;
      if (r.rating < activeTier.minRating || r.rating > activeTier.maxRating) continue;
      if (r.type) types.add(r.type);
    }
    return Array.from(types).sort();
  }, [allDisciplineRecipes, discipline, activeTier.minRating, activeTier.maxRating]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    const list = filterDiscoveryRecipes(allDisciplineRecipes, {
      discipline,
      minRating: activeTier.minRating,
      maxRating: activeTier.maxRating,
      type: selectedType,
      search: searchQuery,
      status: statusFilter,
      knownRecipeIds: account.knownRecipeSet,
    });

    // Also filter by item name if search query exists
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter((r) => {
        const item = getItem(r.outputId);
        const nameMatches = item?.name.toLowerCase().includes(q);
        const typeMatches = r.type?.toLowerCase().includes(q) || (r.type && RECIPE_TYPE_DE[r.type]?.toLowerCase().includes(q));
        return nameMatches || typeMatches || String(r.id).includes(q) || String(r.outputId).includes(q);
      });
    }

    return list;
  }, [allDisciplineRecipes, discipline, activeTier, selectedType, searchQuery, statusFilter, account.knownRecipeSet]);

  // Item IDs of ingredients to get prices
  const relevantItemIds = useMemo(() => {
    const ids = new Set<number>();
    // Collect output IDs and ingredients for visible items (up to 100)
    for (const r of filteredRecipes.slice(0, 100)) {
      ids.add(r.outputId);
      for (const ing of r.ingredients) ids.add(ing.itemId);
    }
    return Array.from(ids);
  }, [filteredRecipes]);

  const prices = usePrices(relevantItemIds);
  // Ensure items are fetched reactively
  useItems(relevantItemIds);

  // Sorting
  const sortedRecipes = useMemo(() => {
    const list = [...filteredRecipes];
    if (sortOrder === 'rating_asc') {
      list.sort((a, b) => a.rating - b.rating || a.outputId - b.outputId);
    } else if (sortOrder === 'rating_desc') {
      list.sort((a, b) => b.rating - a.rating || a.outputId - b.outputId);
    } else if (sortOrder === 'cost_asc') {
      list.sort((a, b) => {
        const costA = estimateRecipeCost(a, prices.map).totalCost;
        const costB = estimateRecipeCost(b, prices.map).totalCost;
        return costA - costB;
      });
    } else if (sortOrder === 'undiscovered_first') {
      const known = account.knownRecipeSet;
      list.sort((a, b) => {
        const aKnown = known?.has(Number(a.id)) ? 1 : 0;
        const bKnown = known?.has(Number(b.id)) ? 1 : 0;
        if (aKnown !== bKnown) return aKnown - bKnown;
        return a.rating - b.rating;
      });
    }
    return list;
  }, [filteredRecipes, sortOrder, prices.map, account.knownRecipeSet]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedTier, statusFilter, selectedType, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRecipes.length / PAGE_SIZE));
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedRecipes.slice(start, start + PAGE_SIZE);
  }, [sortedRecipes, currentPage]);

  const guide = DISCOVERY_GUIDES[discipline];

  const handleCopyChatLink = (item: { chatLink?: string } | undefined, recipeId: string) => {
    if (!item?.chatLink) return;
    void navigator.clipboard.writeText(item.chatLink);
    setCopiedId(recipeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="discovery-recipes-view">
      {/* Discovery Guide / Formula Banner */}
      <div className="discovery-guide-card">
        <div className="guide-header" onClick={() => setShowGuide(!showGuide)}>
          <div className="guide-title-row">
            <Sparkles className="guide-icon text-amber-400" size={18} />
            <div className="guide-header-text">
              <span className="guide-main-heading font-serif">
                Entdeckungs-Assistent: {DISCIPLINE_DE[discipline]}
              </span>
              <span className="guide-bonus-badge">
                +100 % bis +200 % Bonus-Erfahrung bei Erstentdeckung
              </span>
            </div>
          </div>
          <button className="guide-toggle-btn" title="Leitfaden ein-/ausblenden">
            <HelpCircle size={15} />
            <span>{showGuide ? 'Minimieren' : 'Leitfaden anzeigen'}</span>
          </button>
        </div>

        {showGuide && (
          <div className="guide-body">
            <div className="guide-formula-box">
              <div className="formula-label">Kombination im Entdeckungsfenster:</div>
              <div className="formula-equation font-mono">
                {guide.formula}
              </div>
            </div>

            <div className="guide-columns">
              <div className="guide-col">
                <span className="col-tag">1. Primärteil:</span>
                <span className="col-desc">{guide.primary}</span>
              </div>
              <div className="guide-col">
                <span className="col-tag">2. Sekundärteil:</span>
                <span className="col-desc">{guide.secondary}</span>
              </div>
              <div className="guide-col">
                <span className="col-tag">3. Veredler / Modifikator:</span>
                <span className="col-desc">{guide.modifier}</span>
              </div>
            </div>

            <div className="guide-tip-row">
              <Info size={14} className="text-amber-400" />
              <span className="tip-text"><strong>Tipp:</strong> {guide.tip}</span>
            </div>
          </div>
        )}
      </div>

      {/* Discovery Stats Bar */}
      <div className="discovery-stats-banner">
        <div className="stats-info">
          <span className="stats-title font-serif">
            Entdeckungsstatus ({activeTier.label}):
          </span>
          <span className="stats-counts">
            <strong>{stats.discovered}</strong> von <strong>{stats.total}</strong> Rezepten entdeckt
            ({stats.pctDiscovered} %)
          </span>
          {account.knownRecipeSet === null && (
            <span className="stats-no-key dim">
              (Verbinde einen API-Schlüssel mit „unlocks“, um deinen Entdeckungsstand live zu sehen)
            </span>
          )}
        </div>
        <div className="stats-bar-wrapper">
          <ProgressBar value={stats.pctDiscovered / 100} tone={stats.pctDiscovered >= 100 ? 'gold' : 'green'} />
        </div>
      </div>

      {/* Tier Filter Chips */}
      <div className="discovery-tier-bar">
        <div className="tier-chips-label">Rangstufe:</div>
        <div className="tier-chips-row">
          {CRAFTING_TIERS.map((tier) => {
            const isMatchCurrent =
              tier.id !== 'all' && currentRank >= tier.minRating && currentRank <= tier.maxRating;
            const isSelected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                className={`tier-chip ${isSelected ? 'active' : ''} ${isMatchCurrent ? 'matches-rank' : ''}`}
                onClick={() => setSelectedTier(tier.id)}
                title={`${tier.label} (${tier.materials})`}
              >
                <span className="tier-name">{tier.shortLabel}</span>
                {isMatchCurrent && <span className="tier-current-dot" title="Aktueller Rangbereich" />}
              </button>
            );
          })}
        </div>

        {currentRank > 0 && (
          <button
            className="tier-jump-btn"
            onClick={() => setSelectedTier(defaultTierId)}
            title="Direkt zur Rangstufe deines Charakters springen"
          >
            Zu Rang {currentRank} springen
          </button>
        )}
      </div>

      {/* Sub-Filters & Controls Bar */}
      <div className="discovery-controls-bar">
        {/* Status Filter */}
        <div className="status-filter-pills">
          <button
            className={`status-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Alle ({stats.total})
          </button>
          <button
            className={`status-pill undiscovered ${statusFilter === 'undiscovered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('undiscovered')}
            title="Nur Rezepte, die du im Spiel noch nicht entdeckt hast"
          >
            <Sparkles size={13} />
            <span>Unentdeckt ({stats.undiscovered})</span>
          </button>
          <button
            className={`status-pill discovered ${statusFilter === 'discovered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('discovered')}
            title="Rezepte, die dein Account bereits entdeckt hat"
          >
            <Check size={13} />
            <span>Entdeckt ({stats.discovered})</span>
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
              <option value="all">Alle Kategorien ({availableTypes.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {RECIPE_TYPE_DE[t] ?? t}
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
            placeholder="Gegenstand oder Typ suchen..."
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
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="gw2-select sort-select"
          >
            <option value="rating_asc">Rang: aufsteigend</option>
            <option value="rating_desc">Rang: absteigend</option>
            <option value="cost_asc">Herstellungskosten: günstigste</option>
            <option value="undiscovered_first">Unentdeckt zuerst</option>
          </select>
        </div>
      </div>

      {/* Recipes Cards Grid */}
      <div className="discovery-grid-header">
        <span className="results-count">
          {sortedRecipes.length} {sortedRecipes.length === 1 ? 'Entdeckungsrezept' : 'Entdeckungsrezepte'} gefunden
          {selectedTier !== 'all' && ` in ${activeTier.label}`}
        </span>
        {totalPages > 1 && (
          <div className="pagination-summary dim">
            Seite {currentPage} von {totalPages}
          </div>
        )}
      </div>

      {sortedRecipes.length === 0 ? (
        <div className="discovery-empty-state">
          <Sparkles size={32} className="dim text-amber-400" />
          <p className="empty-title">Keine Entdeckungsrezepte für diese Filterkriterien gefunden.</p>
          <p className="dim empty-subtitle">
            Versuche eine andere Rangstufe oder wähle „Alle Kategorien“.
          </p>
        </div>
      ) : (
        <div className="discovery-cards-grid">
          {paginatedRecipes.map((r) => {
            const outItem = getItem(r.outputId);
            const isKnown = account.knownRecipeSet ? account.knownRecipeSet.has(Number(r.id)) : false;
            const cost = estimateRecipeCost(r, prices.map);

            return (
              <div key={r.id} className={`discovery-recipe-card ${isKnown ? 'is-discovered' : 'is-undiscovered'}`}>
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
                        title={outItem?.name ?? `Gegenstand #${r.outputId}`}
                      >
                        {outItem?.name ?? `Gegenstand #${r.outputId}`}
                      </span>
                      <div className="drc-tags-row">
                        <span className="drc-rank-tag">
                          Rang {r.rating}
                        </span>
                        {r.type && (
                          <span className="drc-type-tag dim">
                            {RECIPE_TYPE_DE[r.type] ?? r.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Discovery Badge */}
                  <div className="drc-badge-wrapper">
                    {account.knownRecipeSet !== null ? (
                      isKnown ? (
                        <span className="disc-status-badge known">
                          <Check size={11} /> Entdeckt
                        </span>
                      ) : (
                        <span className="disc-status-badge fresh">
                          <Sparkles size={11} /> Neu (+Bonus-EP)
                        </span>
                      )
                    ) : (
                      <span className="disc-status-badge neutral">
                        <Sparkles size={11} /> Entdeckung
                      </span>
                    )}
                  </div>
                </div>

                {/* Formula Ingredients */}
                <div className="drc-ingredients-box">
                  <div className="drc-ing-headline">
                    <span className="dim">Benötigte Entdeckungskomponenten:</span>
                  </div>
                  <div className="drc-ingredients-list">
                    {r.ingredients.map((ing) => {
                      const ingItem = getItem(ing.itemId);
                      const inStock = account.stockMap.get(ing.itemId) ?? 0;
                      const hasEnough = inStock >= ing.count;

                      return (
                        <div
                          key={ing.itemId}
                          className={`drc-ing-item cursor-pointer ${hasEnough ? 'stock-ok' : ''}`}
                          onClick={() => onOpenItem(ing.itemId)}
                          title={`${ingItem?.name ?? ing.itemId} (Im Lager: ${inStock})`}
                        >
                          <ItemIcon id={ing.itemId} count={ing.count} size="s" />
                          <div className="drc-ing-info">
                            <span className="drc-ing-name">
                              {ingItem?.name ?? `#${ing.itemId}`}
                            </span>
                            <span className="drc-ing-stock dim">
                              {account.hasStockData ? (
                                hasEnough ? (
                                  <span className="stock-badge ok">✓ Lager: {inStock}</span>
                                ) : (
                                  <span className="stock-badge missing">Lager: {inStock}/{ing.count}</span>
                                )
                              ) : (
                                `${ing.count}×`
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Price & Actions */}
                <div className="drc-footer">
                  <div className="drc-cost-block">
                    <span className="cost-label dim">Materialwert:</span>
                    {cost.totalCost > 0 ? (
                      <Coin copper={cost.totalCost} />
                    ) : (
                      <span className="dim text-xs">Preise laden...</span>
                    )}
                  </div>

                  <div className="drc-actions">
                    {outItem?.chatLink && (
                      <button
                        className="drc-action-btn copy-btn"
                        onClick={() => handleCopyChatLink(outItem, r.id)}
                        title="Chatcode in Zwischenablage kopieren"
                      >
                        {copiedId === r.id ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                        <span>{copiedId === r.id ? 'Kopiert!' : 'Chatcode'}</span>
                      </button>
                    )}
                    <button
                      className="drc-action-btn details-btn"
                      onClick={() => onOpenItem(r.outputId)}
                      title="Item-Details und Baum im Hero Panel öffnen"
                    >
                      <Layers size={13} />
                      <span>Details</span>
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
            <ChevronLeft size={14} /> Vorherige
          </button>
          <span className="pagination-page-indicator font-mono">
            Seite {currentPage} von {totalPages}
          </span>
          <button
            className="gw2-btn pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Nächste <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
