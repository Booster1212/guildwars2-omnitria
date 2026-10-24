import React, { useState, useMemo } from 'react';
import type { BomEntry } from '../../domain/recipeTree';
import type { LegendaryModel } from '../../domain/legendary';
import { resolveSources } from '../../domain/sources';
import { unitPrice, KNOWN_VENDOR_PRICES } from '../../domain/costs';
import { getItem } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { progressActions, useProgress } from '../../data/progressStore';
import { Coin, ItemIcon, Check } from '../common/ui';
import { fmtInt } from '../common/labels';
import {
  Sparkles,
  ShoppingCart,
  RotateCcw,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface MaterialTableProps {
  bom: Map<number, BomEntry>;
  weaponId: number;
  model: LegendaryModel;
  onOpenItem: (id: number) => void;
}

type SortOption = 'cost-desc' | 'missing-desc' | 'name' | 'default';

export const MaterialTable: React.FC<MaterialTableProps> = ({ bom, weaponId, model, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'done' | 'bought'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('cost-desc');
  const account = useAccountState();
  const progress = useProgress();

  const weaponProgress = progress.legendary[String(weaponId)];
  const doneMaterials = useMemo(
    () => new Set(weaponProgress?.doneMaterials ?? []),
    [weaponProgress?.doneMaterials]
  );
  const buyItems = useMemo(
    () => new Set(weaponProgress?.buyItems ?? []),
    [weaponProgress?.buyItems]
  );

  const bomEntries = useMemo(() => Array.from(bom.values()), [bom]);
  const itemIds = useMemo(() => bomEntries.map((e) => e.itemId), [bomEntries]);
  const prices = usePrices(itemIds);

  // Computed summary metrics
  const { totalMissingCost, totalSavedValue, totalDoneCount, totalMissingCount } = useMemo(() => {
    let missingCost = 0;
    let savedVal = 0;
    let done = 0;
    let missing = 0;

    for (const e of bomEntries) {
      const stock = account.stockMap.get(e.itemId) ?? 0;
      const isDone = doneMaterials.has(e.itemId) || (account.hasStockData && stock >= e.total);
      if (isDone) {
        done++;
      } else {
        missing++;
      }

      const effMissing = isDone ? 0 : account.hasStockData ? Math.max(0, e.total - stock) : e.missing;
      const p = prices.map.get(e.itemId);
      const uPrice = unitPrice(p, e.itemId);

      if (uPrice !== null && uPrice > 0) {
        missingCost += uPrice * effMissing;
        savedVal += uPrice * Math.min(e.total, stock);
      }
    }

    return {
      totalMissingCost: missingCost,
      totalSavedValue: savedVal,
      totalDoneCount: done,
      totalMissingCount: missing,
    };
  }, [bomEntries, account.stockMap, account.hasStockData, doneMaterials, prices.map]);

  // Filtered & sorted entries
  const processedEntries = useMemo(() => {
    const list = bomEntries.filter((e) => {
      const stock = account.stockMap.get(e.itemId) ?? 0;
      const isDone = doneMaterials.has(e.itemId) || (account.hasStockData && stock >= e.total);
      const isBought = buyItems.has(e.itemId);

      if (filterMode === 'missing') return !isDone && e.missing > 0;
      if (filterMode === 'done') return isDone || e.missing === 0;
      if (filterMode === 'bought') return isBought;
      return true;
    });

    list.sort((a, b) => {
      const stockA = account.stockMap.get(a.itemId) ?? 0;
      const stockB = account.stockMap.get(b.itemId) ?? 0;
      const doneA = doneMaterials.has(a.itemId) || (account.hasStockData && stockA >= a.total);
      const doneB = doneMaterials.has(b.itemId) || (account.hasStockData && stockB >= b.total);
      const effMissingA = doneA ? 0 : account.hasStockData ? Math.max(0, a.total - stockA) : a.missing;
      const effMissingB = doneB ? 0 : account.hasStockData ? Math.max(0, b.total - stockB) : b.missing;
      const priceA = unitPrice(prices.map.get(a.itemId), a.itemId) ?? 0;
      const priceB = unitPrice(prices.map.get(b.itemId), b.itemId) ?? 0;
      const costA = priceA * effMissingA;
      const costB = priceB * effMissingB;

      if (sortBy === 'cost-desc') {
        if (costB !== costA) return costB - costA;
        return effMissingB - effMissingA;
      }
      if (sortBy === 'missing-desc') {
        if (effMissingB !== effMissingA) return effMissingB - effMissingA;
        return costB - costA;
      }
      if (sortBy === 'name') {
        const nameA = getItem(a.itemId)?.name ?? '';
        const nameB = getItem(b.itemId)?.name ?? '';
        return nameA.localeCompare(nameB);
      }
      return 0; // default order from recipe BOM
    });

    return list;
  }, [bomEntries, account.stockMap, account.hasStockData, doneMaterials, buyItems, filterMode, sortBy, prices.map]);

  return (
    <div className="material-table-container">
      {/* 1. Quick Financial Summary Cards for Maximum Cost Efficiency */}
      <div className="gw2-material-summary-strip">
        <div className="summary-stat-card">
          <div className="stat-card-left">
            <Coins size={14} className="gold" />
            <span className="stat-card-title dim font-serif">
              {lang === 'en' ? 'Missing Buy Cost' : 'Offene Zukaufkosten'}
            </span>
          </div>
          <div className="stat-card-val font-mono">
            <Coin copper={totalMissingCost} />
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="stat-card-left">
            <ShieldCheck size={14} className="green" />
            <span className="stat-card-title dim font-serif">
              {t('legendary.savedStockValue')}
            </span>
          </div>
          <div className="stat-card-val font-mono green">
            <Coin copper={totalSavedValue} />
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="stat-card-left">
            <CheckCircle2 size={14} className="gold" />
            <span className="stat-card-title dim font-serif">
              {lang === 'en' ? 'Materials Status' : 'Materialien-Fortschritt'}
            </span>
          </div>
          <div className="stat-card-val font-mono">
            {totalDoneCount} / {bomEntries.length} {lang === 'en' ? 'ready' : 'vorhanden'}
          </div>
        </div>
      </div>

      {/* 2. Direct Purchase Alert & 1-Click Reset if buyItems are active */}
      {buyItems.size > 0 && (
        <div className="gw2-bought-items-alert">
          <div className="alert-left">
            <ShoppingCart size={13} className="alert-icon" />
            <span>
              {lang === 'en'
                ? `${buyItems.size} component(s) set to direct Trading Post purchase.`
                : `${buyItems.size} Komponente(n) auf Direktkauf eingestellt (Teilbäume eingeklappt).`}
            </span>
          </div>
          <button
            className="gw2-btn-outline sm alert-reset-btn"
            onClick={() => progressActions.clearBuyItems(weaponId)}
            title={lang === 'en' ? 'Reset all purchases back to self-crafting' : 'Alle Direktkäufe rückgängig machen (wieder selbst herstellen)'}
          >
            <RotateCcw size={10} />
            <span>{t('legendary.resetAllPurchases')}</span>
          </button>
        </div>
      )}

      {/* 3. Table Filters & Sort Controls */}
      <div className="table-filter-bar">
        <div className="filter-chips-group">
          <button
            className={`btn-chip ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            {t('legendary.allMaterials', { count: bomEntries.length })}
          </button>
          <button
            className={`btn-chip ${filterMode === 'missing' ? 'active' : ''}`}
            onClick={() => setFilterMode('missing')}
          >
            {t('legendary.stillMissing', { count: totalMissingCount })}
          </button>
          <button
            className={`btn-chip ${filterMode === 'done' ? 'active' : ''}`}
            onClick={() => setFilterMode('done')}
          >
            {t('legendary.complete', { count: totalDoneCount })}
          </button>
          {buyItems.size > 0 && (
            <button
              className={`btn-chip ${filterMode === 'bought' ? 'active' : ''}`}
              onClick={() => setFilterMode('bought')}
            >
              {t('legendary.filterBought', { count: buyItems.size })}
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="table-sort-wrap">
          <ArrowUpDown size={11} className="dim" />
          <select
            className="gw2-select table-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="cost-desc">{t('legendary.sortCostDesc')}</option>
            <option value="missing-desc">{t('legendary.sortMissingDesc')}</option>
            <option value="name">{t('legendary.sortName')}</option>
            <option value="default">{t('legendary.sortDefault')}</option>
          </select>
        </div>
      </div>

      {/* 4. Dense Material Table with Smart Sources & Inline Undo */}
      <div className="bom-table-scroll-wrap">
        <table className="gw2-dense-table bom-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>{t('legendary.colDone')}</th>
              <th style={{ width: '36px' }}>{t('legendary.colIcon')}</th>
              <th>{t('legendary.colMaterial')}</th>
              <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colTotal')}</th>
              <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colStorage')}</th>
              <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colMissing')}</th>
              <th style={{ width: '110px', textAlign: 'right' }}>{t('legendary.colBuyNow')}</th>
              <th style={{ width: '120px', textAlign: 'right' }}>{t('legendary.colTotalCost')}</th>
              <th style={{ width: '190px' }}>{t('legendary.colSources')}</th>
            </tr>
          </thead>
          <tbody>
            {processedEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  {lang === 'en' ? 'No materials match the selected filter.' : 'Keine Materialien entsprechen dem gewählten Filter.'}
                </td>
              </tr>
            ) : (
              processedEntries.map((e) => {
                const item = getItem(e.itemId);
                const isManuallyDone = doneMaterials.has(e.itemId);
                const stock = account.stockMap.get(e.itemId) ?? 0;
                const isAutoDone = account.hasStockData && stock >= e.total;
                const isDone = isManuallyDone || isAutoDone;
                const isBought = buyItems.has(e.itemId);

                const effectiveMissing = isDone ? 0 : account.hasStockData ? Math.max(0, e.total - stock) : e.missing;

                const price = prices.map.get(e.itemId);
                const uPrice = unitPrice(price, e.itemId);
                const totalCost = uPrice !== null ? uPrice * effectiveMissing : null;
                const isKnownVendor = KNOWN_VENDOR_PRICES.has(e.itemId);

                const tags = model.tags(e.itemId);
                const sources = resolveSources({
                  itemId: e.itemId,
                  item,
                  tags,
                  recipe: model.recipeFor(e.itemId),
                  vendorRecipe: model.vendorRecipeFor(e.itemId),
                  price,
                });

                return (
                  <tr key={e.itemId} className={`${isDone ? 'row-complete' : ''} ${isBought ? 'row-bought' : ''}`}>
                    <td className="check-cell text-center">
                      <Check
                        checked={isDone}
                        onChange={() => progressActions.toggleMaterialDone(weaponId, e.itemId)}
                        disabled={isAutoDone}
                        title={
                          isAutoDone
                            ? (lang === 'en' ? 'Fully covered by account stock' : 'Vollständig durch Accountbestand gedeckt')
                            : isManuallyDone
                            ? (lang === 'en' ? 'Manually marked as done' : 'Manuell als erledigt markiert')
                            : (lang === 'en' ? 'Mark as done' : 'Als erledigt markieren')
                        }
                      />
                    </td>

                    <td className="icon-cell">
                      <ItemIcon id={e.itemId} size="s" onClick={() => onOpenItem(e.itemId)} />
                    </td>

                    <td className="name-cell font-serif cursor-pointer" onClick={() => onOpenItem(e.itemId)}>
                      <div className="material-name-flex">
                        <span className={`r-${item?.rarity ?? 'Basic'}`}>
                          {item?.name ?? `#${e.itemId}`}
                        </span>

                        {e.estimated && (
                          <span
                            className="random-tag-mini"
                            title={lang === 'en' ? 'RNG Estimate (~31% yield)' : 'Zufallsrezept (~31% Quote)'}
                          >
                            <Sparkles size={9} /> {t('legendary.estimate')}
                          </span>
                        )}

                        {/* If marked as direct purchase: show badge and inline undo button */}
                        {isBought && (
                          <div className="bought-chip-wrap" onClick={(ev) => ev.stopPropagation()}>
                            <span className="bought-tag" title={lang === 'en' ? 'Set to direct buy' : 'Auf Direktkauf gesetzt'}>
                              <ShoppingCart size={9} /> {t('legendary.boughtDirectly')}
                            </span>
                            <button
                              className="btn-tiny undo-buy-chip"
                              onClick={() => progressActions.toggleBuy(weaponId, e.itemId)}
                              title={lang === 'en' ? 'Undo purchase: Switch back to self-crafting' : 'Kauf rückgängig machen (wieder selbst herstellen)'}
                            >
                              <RotateCcw size={9} />
                              <span>{t('legendary.undoBuy')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="num font-mono">{fmtInt(e.total)}</td>
                    <td className="num font-mono dim">{account.hasStockData ? fmtInt(stock) : '–'}</td>
                    <td className={`num font-mono ${effectiveMissing > 0 ? 'bad font-bold' : 'good'}`}>
                      {fmtInt(effectiveMissing)}
                    </td>

                    <td className="num">
                      <Coin copper={uPrice} />
                      {isKnownVendor && (
                        <span className="vendor-hint-pill" title={lang === 'en' ? 'Fixed vendor price' : 'Fester Händlerpreis'}>
                          {lang === 'en' ? 'Vendor' : 'Händler'}
                        </span>
                      )}
                    </td>

                    <td className="num font-mono">
                      <Coin copper={totalCost} />
                    </td>

                    <td className="sources-cell">
                      <div className="sources-tags-wrap">
                        {sources.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className={`source-pill k-${s.kind}`}
                            title={lang === 'en' ? (s.detailEn || s.detail) : s.detail}
                          >
                            {lang === 'en' ? (s.labelEn || s.label) : s.label}
                          </span>
                        ))}
                        {sources.length > 3 && (
                          <span className="source-pill more" title="More sources">
                            +{sources.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
