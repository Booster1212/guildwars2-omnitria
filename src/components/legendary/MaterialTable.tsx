import React, { useState, useMemo } from 'react';
import type { BomEntry } from '../../domain/recipeTree';
import type { LegendaryModel } from '../../domain/legendary';
import { resolveSources } from '../../domain/sources';
import { getItem } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { progressActions, useProgress } from '../../data/progressStore';
import { Coin, ItemIcon, Check } from '../common/ui';
import { fmtInt } from '../common/labels';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface MaterialTableProps {
  bom: Map<number, BomEntry>;
  weaponId: number;
  model: LegendaryModel;
  onOpenItem: (id: number) => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({ bom, weaponId, model, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'done'>('all');
  const account = useAccountState();
  const progress = useProgress();

  const weaponProgress = progress.legendary[String(weaponId)];
  const doneMaterials = useMemo(
    () => new Set(weaponProgress?.doneMaterials ?? []),
    [weaponProgress?.doneMaterials]
  );

  const bomEntries = useMemo(() => Array.from(bom.values()), [bom]);
  const itemIds = useMemo(() => bomEntries.map((e) => e.itemId), [bomEntries]);
  const prices = usePrices(itemIds);

  const filteredEntries = useMemo(() => {
    return bomEntries.filter((e) => {
      const stock = account.stockMap.get(e.itemId) ?? 0;
      const isDone = doneMaterials.has(e.itemId) || (account.hasStockData && stock >= e.total);

      if (filterMode === 'missing') return !isDone && e.missing > 0;
      if (filterMode === 'done') return isDone || e.missing === 0;
      return true;
    });
  }, [bomEntries, account.stockMap, account.hasStockData, doneMaterials, filterMode]);

  // Overall totals
  const { totalMissingCost, totalDoneCount } = useMemo(() => {
    let cost = 0;
    let done = 0;
    for (const e of bomEntries) {
      const stock = account.stockMap.get(e.itemId) ?? 0;
      const isDone = doneMaterials.has(e.itemId) || (account.hasStockData && stock >= e.total);
      if (isDone) done++;

      const effMissing = isDone ? 0 : account.hasStockData ? Math.max(0, e.total - stock) : e.missing;
      const p = prices.map.get(e.itemId);
      if (p && p.sell > 0) {
        cost += p.sell * effMissing;
      }
    }
    return { totalMissingCost: cost, totalDoneCount: done };
  }, [bomEntries, account.stockMap, account.hasStockData, doneMaterials, prices.map]);

  return (
    <div className="material-table-container">
      {/* Table Filter & Summary Header */}
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
            {t('legendary.stillMissing', { count: bomEntries.length - totalDoneCount })}
          </button>
          <button
            className={`btn-chip ${filterMode === 'done' ? 'active' : ''}`}
            onClick={() => setFilterMode('done')}
          >
            {t('legendary.complete', { count: totalDoneCount })}
          </button>
        </div>

        <div className="table-quick-totals font-mono">
          <span className="dim">{t('legendary.missingBuyCost')}</span>
          <Coin copper={totalMissingCost} />
        </div>
      </div>

      {/* Main Dense Table */}
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
              <th style={{ width: '180px' }}>{t('legendary.colSources')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  {lang === 'en' ? 'No materials match the selected filter.' : 'Keine Materialien entsprechen dem gewählten Filter.'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((e) => {
                const item = getItem(e.itemId);
                const isManuallyDone = doneMaterials.has(e.itemId);
                const stock = account.stockMap.get(e.itemId) ?? 0;
                const isAutoDone = account.hasStockData && stock >= e.total;
                const isDone = isManuallyDone || isAutoDone;

                const effectiveMissing = isDone ? 0 : account.hasStockData ? Math.max(0, e.total - stock) : e.missing;

                const price = prices.map.get(e.itemId);
                const unitPrice = price && price.sell > 0 ? price.sell : null;
                const totalCost = unitPrice !== null ? unitPrice * effectiveMissing : null;

                const tags = model.tags(e.itemId);
                const sources = resolveSources({
                  item,
                  tags,
                  recipe: model.recipeFor(e.itemId),
                  vendorRecipe: model.vendorRecipeFor(e.itemId),
                  price,
                });

                return (
                  <tr key={e.itemId} className={isDone ? 'row-complete' : ''}>
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
                            title="RNG Estimate"
                          >
                            <Sparkles size={9} /> {t('legendary.estimate')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="num font-mono">{fmtInt(e.total)}</td>
                    <td className="num font-mono dim">{account.hasStockData ? fmtInt(stock) : '–'}</td>
                    <td className={`num font-mono ${effectiveMissing > 0 ? 'bad font-bold' : 'good'}`}>
                      {fmtInt(effectiveMissing)}
                    </td>

                    <td className="num">
                      <Coin copper={unitPrice} />
                    </td>

                    <td className="num">
                      <Coin copper={totalCost} />
                    </td>

                    <td className="sources-cell">
                      <div className="sources-tags-wrap">
                        {sources.slice(0, 3).map((s, idx) => (
                          <span key={idx} className={`source-pill k-${s.kind}`} title={s.detail}>
                            {s.label}
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
