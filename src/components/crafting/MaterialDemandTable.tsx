import React, { useState, useMemo } from 'react';
import type { AggregatedMaterial, ItemProcurement } from '../../domain/craftingCalculator';
import { getItem } from '../../data/gw2/items';
import { fmtInt } from '../common/labels';
import { Coin, ItemIcon } from '../common/ui';
import { Search, Hammer, ShoppingCart, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface MaterialDemandTableProps {
  materials: AggregatedMaterial[];
  onOpenItem: (id: number) => void;
  onToggleProcurement: (itemId: number) => void;
  itemOverrides?: ReadonlyMap<number, ItemProcurement> | ReadonlySet<number>;
  hasStockData: boolean;
}

export const MaterialDemandTable: React.FC<MaterialDemandTableProps> = ({
  materials,
  onOpenItem,
  onToggleProcurement,
  hasStockData,
}) => {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missing' | 'base' | 'intermediates' | 'end' | 'discovery'>('all');

  const discoveryCount = useMemo(() => {
    return materials.filter((m) => m.needsDiscovery || m.requiredForDiscovery).length;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const item = getItem(m.itemId);
      const name = item?.name ?? `#${m.itemId}`;
      if (search.trim() && !name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === 'missing' && m.netDemand <= 0) return false;
      if (filter === 'base' && m.role !== 'base_material') return false;
      if (filter === 'intermediates' && m.role !== 'intermediate') return false;
      if (filter === 'end' && m.role !== 'end_product') return false;
      if (filter === 'discovery' && !m.needsDiscovery && !m.requiredForDiscovery) return false;
      return true;
    });
  }, [materials, search, filter]);

  const summary = useMemo(() => {
    let totalCost = 0;
    let missingCount = 0;
    let unpricedCount = 0;
    let discoveryRecipesCount = 0;
    for (const m of materials) {
      if (m.netDemand > 0) missingCount++;
      if (m.needsDiscovery) discoveryRecipesCount++;
      if (m.totalCost !== null) totalCost += m.totalCost;
      else if (m.netDemand > 0 && (m.action === 'buy' || m.role === 'base_material')) {
        unpricedCount++;
      }
    }
    return { totalCost, missingCount, unpricedCount, discoveryRecipesCount };
  }, [materials]);

  const getRoleLabel = (role: AggregatedMaterial['role']) => {
    switch (role) {
      case 'end_product':
        return t('crafting.roleEnd');
      case 'intermediate':
        return t('crafting.roleIntermediate');
      case 'base_material':
        return t('crafting.roleBase');
    }
  };

  const getActionLabel = (action: AggregatedMaterial['action']) => {
    switch (action) {
      case 'craft':
        return t('crafting.actionCraft');
      case 'buy':
        return t('crafting.actionBuy');
      case 'vendor':
        return t('crafting.actionVendor');
      case 'gather':
        return t('crafting.actionGather');
      case 'drop':
        return t('crafting.actionDrop');
      case 'salvage':
        return t('crafting.actionSalvage');
      case 'forge':
        return t('crafting.actionForge');
      default:
        return lang === 'en' ? 'Procurement Unknown' : 'Beschaffung unbekannt';
    }
  };

  return (
    <div className="planner-material-table-wrap">
      {/* Filter and Search Bar */}
      <div className="planner-mat-filter-bar">
        <div className="mat-search-box">
          <Search size={13} className="text-amber-500/70" />
          <input
            type="text"
            className="mat-search-input font-ui"
            placeholder={lang === 'en' ? 'Search materials...' : 'Materialien filtern...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>

        <div className="mat-filter-pills">
          <button
            className={`mat-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('crafting.filterAll')} ({materials.length})
          </button>
          <button
            className={`mat-pill ${filter === 'missing' ? 'active' : ''}`}
            onClick={() => setFilter('missing')}
          >
            {t('crafting.filterMissingOnly')} ({materials.filter((m) => m.netDemand > 0).length})
          </button>
          <button
            className={`mat-pill ${filter === 'intermediates' ? 'active' : ''}`}
            onClick={() => setFilter('intermediates')}
          >
            {t('crafting.filterIntermediatesOnly')} ({materials.filter((m) => m.role === 'intermediate').length})
          </button>
          <button
            className={`mat-pill ${filter === 'base' ? 'active' : ''}`}
            onClick={() => setFilter('base')}
          >
            {t('crafting.filterBaseOnly')} ({materials.filter((m) => m.role === 'base_material').length})
          </button>
          <button
            className={`mat-pill ${filter === 'end' ? 'active' : ''}`}
            onClick={() => setFilter('end')}
          >
            {t('crafting.roleEnd')} ({materials.filter((m) => m.role === 'end_product').length})
          </button>
          {discoveryCount > 0 && (
            <button
              className={`mat-pill ${filter === 'discovery' ? 'active' : ''}`}
              onClick={() => setFilter('discovery')}
              title={lang === 'en' ? 'Show all discovery recipes and their required materials' : 'Zeigt alle Entdeckungsrezepte und deren benötigte Zutaten'}
            >
              <Sparkles size={11} className="inline mr-1 text-amber-400" />
              {t('crafting.filterDiscovery')} ({discoveryCount})
            </button>
          )}
        </div>
      </div>

      {/* Materials Table */}
      <div className="table-responsive-wrap">
        <table className="gw2-dense-table material-demand-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Icon</th>
              <th>{t('crafting.colItem')}</th>
              <th style={{ width: '100px', textAlign: 'right' }}>{t('crafting.colGross')}</th>
              <th style={{ width: '90px', textAlign: 'right' }}>{t('crafting.colStock')}</th>
              <th style={{ width: '90px', textAlign: 'right' }}>{t('crafting.colMissing')}</th>
              <th style={{ width: '180px' }}>{t('crafting.colAction')}</th>
              <th style={{ width: '110px', textAlign: 'right' }}>{t('crafting.colUnit')}</th>
              <th style={{ width: '130px', textAlign: 'right' }}>{t('crafting.colTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-cell dim">
                  {lang === 'en' ? 'No matching materials found.' : 'Keine passenden Materialien gefunden.'}
                </td>
              </tr>
            ) : (
              filteredMaterials.map((m) => {
                const item = getItem(m.itemId);
                const isComplete = m.netDemand <= 0;

                return (
                  <tr key={m.itemId} className={`mat-row ${isComplete ? 'row-complete' : ''}`}>
                    <td className="icon-cell">
                      <ItemIcon id={m.itemId} size="s" onClick={() => onOpenItem(m.itemId)} />
                    </td>

                    <td className="name-cell">
                      <div className="mat-name-container">
                        <span
                          className={`font-serif mat-item-name cursor-pointer r-${item?.rarity ?? 'Basic'}`}
                          onClick={() => onOpenItem(m.itemId)}
                          title={`${item?.name ?? m.itemId} (ID: ${m.itemId})`}
                        >
                          {item?.name ?? `#${m.itemId}`}
                        </span>
                        <div className="mat-meta-tags">
                          <span className={`role-badge role-${m.role}`}>
                            {getRoleLabel(m.role)}
                          </span>
                          {m.needsDiscovery && (
                            <span
                              className="mat-badge badge-discovery"
                              title={t('crafting.discoveryTooltip')}
                            >
                              <Sparkles size={9} className="mr-1 inline text-amber-400" />
                              {t('crafting.discoveryBadge')}
                            </span>
                          )}
                          {!m.needsDiscovery && m.requiredForDiscovery && (
                            <span
                              className="mat-badge badge-discovery-ing"
                              title={t('crafting.discoveryIngredientTooltip')}
                            >
                              <Sparkles size={8} className="mr-1 inline text-amber-300/80" />
                              {t('crafting.discoveryIngredientBadge')}
                            </span>
                          )}
                          {m.craftRuns > 0 && (
                            <span className="craft-runs-pill font-mono">
                              {t('crafting.craftRunsBadge', { count: m.craftRuns })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Total demand */}
                    <td className="num font-mono">
                      <span className="font-bold text-slate-100">{fmtInt(m.grossDemand)}</span>
                    </td>

                    {/* Owned / In stock */}
                    <td className="num font-mono dim">
                      {hasStockData ? (
                        m.stock > 0 ? (
                          <span className="text-emerald-400">{fmtInt(m.stock)}</span>
                        ) : (
                          '0'
                        )
                      ) : (
                        '–'
                      )}
                    </td>

                    {/* Missing */}
                    <td className="num font-mono">
                      {isComplete ? (
                        <span className="complete-badge good font-bold" title="Bedarf vollständig gedeckt">
                          <Check size={12} className="inline mr-1" /> 0
                        </span>
                      ) : (
                        <span className="missing-val font-bold text-amber-300">
                          {fmtInt(m.netDemand)}
                        </span>
                      )}
                    </td>

                    {/* Procurement type / Quick toggle */}
                    <td className="action-cell">
                      <div className="action-cell-content">
                        <span className={`action-badge action-${m.action}`} title={getActionLabel(m.action)}>
                          {m.action === 'craft' && <Hammer size={11} className="mr-1" />}
                          {m.action === 'buy' && <ShoppingCart size={11} className="mr-1" />}
                          {getActionLabel(m.action)}
                        </span>

                        {/* Toggle Craft / Buy for craftable intermediate components */}
                        {m.isCraftable && m.role !== 'end_product' && (
                          <button
                            type="button"
                            className={`btn-procure-toggle ${m.action === 'craft' ? 'is-crafting' : 'is-buying'}`}
                            onClick={() => onToggleProcurement(m.itemId)}
                            title={
                              m.action === 'craft'
                                ? lang === 'en'
                                  ? 'Click to switch to purchasing on Trading Post'
                                  : 'Klicken, um stattdessen fertig zu kaufen'
                                : lang === 'en'
                                  ? 'Click to switch to self-crafting'
                                  : 'Klicken, um stattdessen selbst herzustellen'
                            }
                          >
                            {m.action === 'craft' ? (
                              <>
                                <ShoppingCart size={10} />
                                <span>{t('crafting.btnBuy')}</span>
                              </>
                            ) : (
                              <>
                                <Hammer size={10} />
                                <span>{t('crafting.btnCraft')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Unit price */}
                    <td className="num">
                      <Coin copper={m.unitPrice} />
                    </td>

                    {/* Total cost */}
                    <td className="num">
                      {m.totalCost !== null ? (
                        <Coin copper={m.totalCost} />
                      ) : m.action === 'craft' ? (
                        <span className="dim text-xs">–</span>
                      ) : (
                        <span className="unpriced-pill" title="Kein Handelsgesellschafts-Angebot">
                          <AlertCircle size={10} className="inline mr-1" />
                          {lang === 'en' ? 'Unpriced' : 'Ohne Preis'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td colSpan={2} className="font-serif font-bold text-amber-200">
                {lang === 'en' ? 'Total (Purchasable Materials):' : 'Gesamtsumme (Einkaufsposten):'}
              </td>
              <td colSpan={3} className="num font-mono text-xs dim">
                <span>{summary.missingCount} {lang === 'en' ? 'positions missing' : 'Positionen offen'}</span>
                {summary.discoveryRecipesCount > 0 && (
                  <span className="summary-discovery-note" style={{ marginLeft: '12px' }}>
                    <Sparkles size={11} className="inline mr-1 text-amber-400" />
                    {summary.discoveryRecipesCount} {lang === 'en' ? 'discoveries' : 'Entdeckungen'}
                  </span>
                )}
              </td>
              <td colSpan={2} />
              <td className="num font-bold">
                <Coin copper={summary.totalCost} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
