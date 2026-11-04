import React, { useState, useMemo, useEffect } from 'react';
import {
  DAILY_CRAFT_ITEMS,
  isDailyCraftCompleted,
  getDailyCraftSummary,
  calculateDailyCraftProfit,
  type DailyCraftDefinition,
} from '../../domain/dailyCrafting.ts';
import { useAccountState } from '../../data/gw2/account.ts';
import { usePrices } from '../../data/gw2/prices.ts';
import { Coin, ItemIcon } from '../common/ui.tsx';
import { useTranslation } from '../../i18n/index.ts';
import { Check, Clock, Hammer, MapPin, Copy, ExternalLink, Sparkles, Filter } from 'lucide-react';

interface DailyCraftingCardProps {
  onOpenItem?: (itemId: number) => void;
  onCopyWaypoint?: (wp: string) => void;
}

type FilterStatus = 'all' | 'ready' | 'done';
type CategoryFilter = 'all' | 'refinement' | 'special';

function getUtcDayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const STORAGE_KEY_PREFIX = 'gw2_daily_craft_manual_';

export const DailyCraftingCard: React.FC<DailyCraftingCardProps> = ({
  onOpenItem,
  onCopyWaypoint,
}) => {
  const { t, lang } = useTranslation();
  const account = useAccountState();
  const apiCompletedSet = account.dailyCraftingSet;

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [copiedWp, setCopiedWp] = useState<string | null>(null);

  // Manual local overrides (saved per UTC day) so users can check off crafts immediately
  const dayKey = useMemo(() => getUtcDayKey(), []);
  const storageKey = `${STORAGE_KEY_PREFIX}${dayKey}`;

  const [manualDone, setManualDone] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const toggleManual = (id: string) => {
    setManualDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        // Ignore localStorage quota errors
      }
      return next;
    });
  };

  // Effective completed set combines API data + manual local toggles
  const effectiveCompletedSet = useMemo(() => {
    const combined = new Set<string>(apiCompletedSet ?? []);
    for (const id of manualDone) {
      combined.add(id);
    }
    return combined;
  }, [apiCompletedSet, manualDone]);

  // Collect item IDs for pricing (both outputs and ingredients)
  const priceItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of DAILY_CRAFT_ITEMS) {
      ids.add(item.outputItemId);
      ids.add(item.timegatedItemId);
      for (const ing of item.ingredients) {
        ids.add(ing.itemId);
      }
    }
    return Array.from(ids);
  }, []);

  const prices = usePrices(priceItemIds);
  const summary = useMemo(() => getDailyCraftSummary(effectiveCompletedSet), [effectiveCompletedSet]);
  const progressPercent = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  // Filter items
  const filteredItems = useMemo(() => {
    return DAILY_CRAFT_ITEMS.filter((item) => {
      const isDone = isDailyCraftCompleted(item.id, effectiveCompletedSet);
      if (statusFilter === 'ready' && isDone) return false;
      if (statusFilter === 'done' && !isDone) return false;

      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      return true;
    });
  }, [effectiveCompletedSet, statusFilter, categoryFilter]);

  const handleCopy = (wp: string) => {
    onCopyWaypoint?.(wp);
    setCopiedWp(wp);
    setTimeout(() => setCopiedWp(null), 2500);
  };

  return (
    <section className="pve-hub-card daily-crafting-card">
      {/* Header with Title, Count Pill, and UTC Reset Note */}
      <div className="daily-card-main-header">
        <div className="daily-title-block">
          <div className="flex items-center gap-2.5">
            <Hammer size={18} className="gold" />
            <h3 className="font-serif font-bold text-base text-[#f4e3a8]">
              {t('dailyCrafting.title')}
            </h3>
            <span className="pve-count-pill font-mono text-xs px-2.5 py-0.5">
              {summary.completed} / {summary.total}
            </span>
          </div>
          <p className="dim text-xs daily-card-desc-clean">
            {t('dailyCrafting.desc')}
          </p>
        </div>

        <div className="daily-status-summary-box">
          {summary.remaining === 0 ? (
            <div className="daily-all-done-pill">
              <Sparkles size={14} className="text-emerald-400" />
              <span>{t('dailyCrafting.allDone')}</span>
            </div>
          ) : (
            <div className="daily-summary-text">
              <span>{t('dailyCrafting.summary', { completed: summary.completed, total: summary.total })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="daily-progress-container">
        <div className="daily-progress-track">
          <div
            className={`daily-progress-fill ${progressPercent === 100 ? 'done' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="daily-progress-meta font-mono text-[11px] dim">
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* Filter Toolbar: Status and Category */}
      <div className="daily-toolbar">
        <div className="daily-status-filters">
          <button
            type="button"
            className={`daily-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t('dailyCrafting.filterAll', { count: DAILY_CRAFT_ITEMS.length })}
          </button>
          <button
            type="button"
            className={`daily-filter-btn ${statusFilter === 'ready' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ready')}
          >
            {t('dailyCrafting.filterReady', { count: summary.remaining })}
          </button>
          <button
            type="button"
            className={`daily-filter-btn ${statusFilter === 'done' ? 'active' : ''}`}
            onClick={() => setStatusFilter('done')}
          >
            {t('dailyCrafting.filterDone', { count: summary.completed })}
          </button>
        </div>

        <div className="daily-category-filters">
          <button
            type="button"
            className={`daily-cat-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            {lang === 'en' ? 'All Types' : 'Alle Typen'}
          </button>
          <button
            type="button"
            className={`daily-cat-btn ${categoryFilter === 'refinement' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('refinement')}
          >
            {t('dailyCrafting.catRefinement')} (4)
          </button>
          <button
            type="button"
            className={`daily-cat-btn ${categoryFilter === 'special' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('special')}
          >
            {t('dailyCrafting.catSpecial')} (5)
          </button>
        </div>
      </div>

      {/* Responsive Grid with Spacious Cards */}
      <div className="daily-craft-grid">
        {filteredItems.map((item) => {
          const isDone = isDailyCraftCompleted(item.id, effectiveCompletedSet);
          const { estimatedProfit } = calculateDailyCraftProfit(item, prices.map);
          const title = lang === 'en' ? item.nameEn : item.nameDe;

          return (
            <div
              key={item.id}
              className={`daily-craft-box ${isDone ? 'completed' : 'ready'}`}
              onClick={() => onOpenItem?.(item.outputItemId)}
            >
              {/* Card Top: Fixed Icon, Meta (Name & Discipline), Status Badge */}
              <div className="daily-box-top">
                <div className="daily-box-icon-wrap" onClick={(e) => e.stopPropagation()}>
                  <ItemIcon id={item.outputItemId} size="m" onClick={() => onOpenItem?.(item.outputItemId)} />
                </div>

                <div className="daily-box-meta">
                  <div className="daily-box-name font-serif font-bold text-sm text-[#f4e3a8]">
                    {title}
                  </div>
                  <div className="daily-box-discipline text-xs dim flex items-center gap-1.5 flex-wrap">
                    <span className="discipline-label">{item.discipline}</span>
                    {item.rating > 0 && <span className="rating-pill">Lv. {item.rating}</span>}
                  </div>
                </div>

                <div className="daily-box-status" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`daily-status-badge ${isDone ? 'completed' : 'ready'}`}
                    onClick={() => toggleManual(item.id)}
                    title={t('dailyCrafting.toggleManual')}
                  >
                    {isDone ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>{t('dailyCrafting.done')}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} className="text-amber-400" />
                        <span>{t('dailyCrafting.ready')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Divider */}
              <div className="daily-box-divider" />

              {/* Card Bottom: Profit or Account-Bound, Waypoint & Recipe Link */}
              <div className="daily-box-bottom">
                <div className="daily-box-profit">
                  {estimatedProfit !== null ? (
                    <div className="flex items-center gap-2">
                      <span className="dim text-[11px]">{t('dailyCrafting.estProfit')}</span>
                      <span className={`font-mono text-xs font-bold ${estimatedProfit > 0 ? 'text-emerald-400' : 'dim'}`}>
                        {estimatedProfit > 0 ? '+' : ''}
                        <Coin copper={estimatedProfit} />
                      </span>
                    </div>
                  ) : (
                    <span className="dim text-[11px] italic">
                      {t('dailyCrafting.accountBound')}
                    </span>
                  )}
                </div>

                <div className="daily-box-actions" onClick={(e) => e.stopPropagation()}>
                  {item.waypoint && (
                    <button
                      type="button"
                      className="daily-wp-action-btn"
                      onClick={() => handleCopy(item.waypoint!)}
                      title={lang === 'en' ? `Copy Waypoint (${item.waypoint})` : `Wegmarke kopieren (${item.waypoint})`}
                    >
                      <MapPin size={11} />
                      <span className="font-mono text-[11px]">{item.waypoint}</span>
                      <Copy size={10} className="opacity-70" />
                      {copiedWp === item.waypoint && (
                        <span className="copied-tag">✓</span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    className="daily-recipe-action-btn"
                    onClick={() => onOpenItem?.(item.outputItemId)}
                    title={lang === 'en' ? 'Open Recipe' : 'Rezept öffnen'}
                  >
                    <span>{t('dailyCrafting.recipeBtn')}</span>
                    <ExternalLink size={10} className="opacity-70" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};