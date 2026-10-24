import React, { useState, useMemo } from 'react';
import type { BomEntry, TreeNode } from '../../domain/recipeTree';
import { flattenTree } from '../../domain/recipeTree';
import type { LegendaryModel } from '../../domain/legendary';
import type { RecipeKind } from '../../domain/types';
import {
  resolveSources,
  classifyMaterialProcurement,
  type MaterialCategory,
  type ProcurementType,
} from '../../domain/sources';
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
  Hammer,
  Package,
  PackageCheck,
  Compass,
  Clock,
  AlertCircle,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface MaterialTableProps {
  bom: Map<number, BomEntry>;
  rootNode?: TreeNode;
  weaponId: number;
  model: LegendaryModel;
  onOpenItem: (id: number) => void;
}

export type FilterCategory =
  | 'all'
  | 'craftable'
  | 'must_buy'
  | 'non_craftable'
  | 'in_stock'
  | 'missing'
  | 'bought';

type SortOption = 'cost-desc' | 'missing-desc' | 'progress-asc' | 'progress-desc' | 'name' | 'default';
type ScopeOption = 'all' | 'bom';

export interface MaterialRowItem {
  itemId: number;
  total: number;
  stock: number;
  owned: number;
  missing: number;
  progressPercent: number;
  isAutoDone: boolean;
  isManuallyDone: boolean;
  isDone: boolean;
  isBought: boolean;
  canCraft: boolean;
  recipeKind?: RecipeKind;
  isIntermediate: boolean;
  estimated: boolean;
  category: MaterialCategory;
  procurementType: ProcurementType;
  unitPrice: number | null;
  totalCost: number | null;
  tags: string[];
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  bom,
  rootNode,
  weaponId,
  model,
  onOpenItem,
}) => {
  const { t, lang } = useTranslation();
  const [filterMode, setFilterMode] = useState<FilterCategory>('all');
  const [scopeMode, setScopeMode] = useState<ScopeOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('cost-desc');
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);

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

  // 1. Build list of items combining leaf BOM entries and intermediate craftable components
  const allRowItems = useMemo(() => {
    const map = new Map<number, {
      total: number;
      missing: number;
      estimated: boolean;
      canCraft: boolean;
      recipeKind?: RecipeKind;
      isIntermediate: boolean;
      isBought: boolean;
    }>();

    // Leaf BOM items
    for (const [id, e] of bom) {
      if (id === weaponId) continue;
      const rawRecipe = model.recipeFor(id);
      map.set(id, {
        total: e.total,
        missing: e.missing,
        estimated: e.estimated,
        canCraft: Boolean(rawRecipe),
        recipeKind: rawRecipe?.kind,
        isIntermediate: false,
        isBought: buyItems.has(id),
      });
    }

    // If scope includes all intermediate components, pull from tree
    if (scopeMode === 'all' && rootNode) {
      const treeNodes = flattenTree(rootNode);
      for (const node of treeNodes) {
        if (node.itemId === weaponId) continue;
        const rawRecipe = model.recipeFor(node.itemId);
        const canCraft = Boolean(node.canCraft || (rawRecipe && rawRecipe.kind !== 'vendor'));
        const existing = map.get(node.itemId);

        if (!existing) {
          // Intermediate node not in leaf BOM (because it has sub-components)
          map.set(node.itemId, {
            total: node.demand,
            missing: node.missing,
            estimated: node.random,
            canCraft,
            recipeKind: rawRecipe?.kind,
            isIntermediate: true,
            isBought: buyItems.has(node.itemId),
          });
        } else {
          // If already in BOM, preserve canCraft metadata
          if (canCraft) existing.canCraft = true;
          if (rawRecipe?.kind) existing.recipeKind = rawRecipe.kind;
        }
      }
    }

    return Array.from(map.entries()).map(([itemId, meta]) => {
      const item = getItem(itemId);
      const stock = account.stockMap.get(itemId) ?? 0;
      const isAutoDone = account.hasStockData && stock >= meta.total;
      const isManuallyDone = doneMaterials.has(itemId);
      const isDone = isAutoDone || isManuallyDone;
      const isBought = meta.isBought;

      const owned = Math.min(meta.total, stock);
      const missing = isDone ? 0 : account.hasStockData ? Math.max(0, meta.total - stock) : meta.missing;
      const progressPercent = meta.total > 0 ? Math.min(100, Math.round((stock / meta.total) * 100)) : 100;

      const tags = model.tags(itemId);
      const classification = classifyMaterialProcurement({
        itemId,
        canCraft: meta.canCraft,
        recipeKind: meta.recipeKind,
        isBought,
        tags,
        item,
      });

      return {
        itemId,
        total: meta.total,
        stock,
        owned,
        missing,
        progressPercent,
        isAutoDone,
        isManuallyDone,
        isDone,
        isBought,
        canCraft: meta.canCraft,
        recipeKind: meta.recipeKind,
        isIntermediate: meta.isIntermediate,
        estimated: meta.estimated,
        category: classification.category,
        procurementType: classification.procurementType,
        unitPrice: null, // populated below with prices
        totalCost: null,
        tags,
      } as MaterialRowItem;
    });
  }, [bom, rootNode, weaponId, model, buyItems, doneMaterials, account.stockMap, account.hasStockData, scopeMode]);

  // Collect item IDs for live Trading Post and vendor prices
  const allItemIds = useMemo(() => allRowItems.map((r) => r.itemId), [allRowItems]);
  const prices = usePrices(allItemIds);

  // Attach live pricing to rows
  const pricedRowItems = useMemo(() => {
    return allRowItems.map((r) => {
      const p = prices.map.get(r.itemId);
      const uPrice = unitPrice(p, r.itemId);
      const tCost = uPrice !== null ? uPrice * r.missing : null;
      return {
        ...r,
        unitPrice: uPrice,
        totalCost: tCost,
      };
    });
  }, [allRowItems, prices.map]);

  // Overall financial and category metrics
  const metrics = useMemo(() => {
    let totalMissingCost = 0;
    let vendorCost = 0;
    let tpCost = 0;
    let totalSavedValue = 0;
    let inStockCount = 0;
    let missingCount = 0;

    let craftableTotal = 0;
    let craftableReady = 0;
    let mustBuyTotal = 0;
    let mustBuyMissing = 0;
    let nonCraftableTotal = 0;
    let nonCraftableReady = 0;

    for (const r of pricedRowItems) {
      if (r.isDone || r.progressPercent >= 100) {
        inStockCount++;
      } else {
        missingCount++;
      }

      if (r.unitPrice !== null && r.unitPrice > 0) {
        const lineMissingCost = r.unitPrice * r.missing;
        totalMissingCost += lineMissingCost;
        totalSavedValue += r.unitPrice * r.owned;

        if (KNOWN_VENDOR_PRICES.has(r.itemId)) {
          vendorCost += lineMissingCost;
        } else {
          tpCost += lineMissingCost;
        }
      }

      if (r.category === 'craftable') {
        craftableTotal++;
        if (r.isDone || r.progressPercent >= 100) craftableReady++;
      } else if (r.category === 'must_buy') {
        mustBuyTotal++;
        if (!r.isDone && r.missing > 0) mustBuyMissing++;
      } else {
        nonCraftableTotal++;
        if (r.isDone || r.progressPercent >= 100) nonCraftableReady++;
      }
    }

    const overallPct = pricedRowItems.length > 0 ? Math.round((inStockCount / pricedRowItems.length) * 100) : 0;

    return {
      totalMissingCost,
      vendorCost,
      tpCost,
      totalSavedValue,
      inStockCount,
      missingCount,
      craftableTotal,
      craftableReady,
      mustBuyTotal,
      mustBuyMissing,
      nonCraftableTotal,
      nonCraftableReady,
      overallPct,
    };
  }, [pricedRowItems]);

  // Sort comparator
  const sortComparator = (a: MaterialRowItem, b: MaterialRowItem) => {
    if (sortBy === 'cost-desc') {
      const costA = a.totalCost ?? 0;
      const costB = b.totalCost ?? 0;
      if (costB !== costA) return costB - costA;
      return b.missing - a.missing;
    }
    if (sortBy === 'missing-desc') {
      if (b.missing !== a.missing) return b.missing - a.missing;
      return (b.totalCost ?? 0) - (a.totalCost ?? 0);
    }
    if (sortBy === 'progress-asc') {
      if (a.progressPercent !== b.progressPercent) return a.progressPercent - b.progressPercent;
      return b.missing - a.missing;
    }
    if (sortBy === 'progress-desc') {
      if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
      return a.missing - b.missing;
    }
    if (sortBy === 'name') {
      const nameA = getItem(a.itemId)?.name ?? '';
      const nameB = getItem(b.itemId)?.name ?? '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  };

  // Filter items
  const filterItem = (r: MaterialRowItem) => {
    if (filterMode === 'craftable') return r.category === 'craftable';
    if (filterMode === 'must_buy') return r.category === 'must_buy';
    if (filterMode === 'non_craftable') return r.category === 'non_craftable';
    if (filterMode === 'in_stock') return r.isDone || r.progressPercent >= 100;
    if (filterMode === 'missing') return !r.isDone && r.missing > 0;
    if (filterMode === 'bought') return r.isBought;
    return true;
  };

  // Processed item list
  const processedItems = useMemo(() => {
    const list = pricedRowItems.filter(filterItem);
    list.sort(sortComparator);
    return list;
  }, [pricedRowItems, filterMode, sortBy]);

  // Grouped items by category for grouped view
  const groupedSections = useMemo(() => {
    const craftableList = pricedRowItems.filter((r) => r.category === 'craftable');
    const mustBuyList = pricedRowItems.filter((r) => r.category === 'must_buy');
    const nonCraftableList = pricedRowItems.filter((r) => r.category === 'non_craftable');

    craftableList.sort(sortComparator);
    mustBuyList.sort(sortComparator);
    nonCraftableList.sort(sortComparator);

    return {
      craftable: craftableList,
      mustBuy: mustBuyList,
      nonCraftable: nonCraftableList,
    };
  }, [pricedRowItems, sortBy]);

  // Render individual row
  const renderRow = (e: MaterialRowItem) => {
    const item = getItem(e.itemId);
    const price = prices.map.get(e.itemId);
    const sources = resolveSources({
      itemId: e.itemId,
      item,
      tags: e.tags,
      recipe: model.recipeFor(e.itemId),
      vendorRecipe: model.vendorRecipeFor(e.itemId),
      price,
    });

    const isKnownVendor = KNOWN_VENDOR_PRICES.has(e.itemId);

    return (
      <tr
        key={e.itemId}
        className={`${e.isDone ? 'row-complete' : ''} ${e.isBought ? 'row-bought' : ''}`}
      >
        {/* Checkbox */}
        <td className="check-cell text-center">
          <Check
            checked={e.isDone}
            onChange={() => progressActions.toggleMaterialDone(weaponId, e.itemId)}
            disabled={e.isAutoDone}
            title={
              e.isAutoDone
                ? lang === 'en'
                  ? 'Fully covered by account stock'
                  : 'Vollständig durch Accountbestand gedeckt'
                : e.isManuallyDone
                ? lang === 'en'
                  ? 'Manually marked as done'
                  : 'Manuell als erledigt markiert'
                : lang === 'en'
                ? 'Mark as done'
                : 'Als erledigt markieren'
            }
          />
        </td>

        {/* Icon */}
        <td className="icon-cell">
          <ItemIcon id={e.itemId} size="s" onClick={() => onOpenItem(e.itemId)} />
        </td>

        {/* Material Name & Category Badges */}
        <td className="name-cell font-serif cursor-pointer" onClick={() => onOpenItem(e.itemId)}>
          <div className="material-name-flex">
            <span className={`r-${item?.rarity ?? 'Basic'} material-title-text`}>
              {item?.name ?? `#${e.itemId}`}
            </span>

            {/* Procurement Category Badge */}
            <span className={`cat-pill cat-${e.procurementType}`}>
              {e.procurementType === 'discipline_craft' && <Hammer size={10} />}
              {e.procurementType === 'mystic_forge' && <Sparkles size={10} />}
              {e.procurementType === 'vendor_fixed' && <Coins size={10} />}
              {e.procurementType === 'tp_buy' && <ShoppingCart size={10} />}
              {e.procurementType === 'account_reward' && <Compass size={10} />}
              {e.procurementType === 'raw_drop' && <Package size={10} />}
              <span>
                {e.procurementType === 'discipline_craft'
                  ? t('legendary.badgeCraftDiscipline')
                  : e.procurementType === 'mystic_forge'
                  ? t('legendary.badgeMysticForge')
                  : e.procurementType === 'vendor_fixed'
                  ? t('legendary.badgeVendorMustBuy')
                  : e.procurementType === 'tp_buy'
                  ? t('legendary.badgeTpMustBuy')
                  : e.procurementType === 'account_reward'
                  ? t('legendary.badgeReward')
                  : t('legendary.badgeNonCraftable')}
              </span>
            </span>

            {/* RNG Recipe Estimate Tag */}
            {e.estimated && (
              <span
                className="random-tag-mini"
                title={lang === 'en' ? 'RNG Estimate (~31% yield)' : 'Zufallsrezept (~31% Quote)'}
              >
                <Sparkles size={9} /> {t('legendary.estimate')}
              </span>
            )}

            {/* Direct Purchase Undo Chip */}
            {e.isBought && (
              <div className="bought-chip-wrap" onClick={(ev) => ev.stopPropagation()}>
                <span className="bought-tag" title={lang === 'en' ? 'Set to direct buy' : 'Auf Direktkauf gesetzt'}>
                  <ShoppingCart size={9} /> {t('legendary.boughtDirectly')}
                </span>
                <button
                  className="btn-tiny undo-buy-chip"
                  onClick={() => progressActions.toggleBuy(weaponId, e.itemId)}
                  title={
                    lang === 'en'
                      ? 'Undo purchase: Switch back to self-crafting'
                      : 'Kauf rückgängig machen (wieder selbst herstellen)'
                  }
                >
                  <RotateCcw size={9} />
                  <span>{t('legendary.undoBuy')}</span>
                </button>
              </div>
            )}
          </div>
        </td>

        {/* Wie viel ich bereits habe (Stock & Progress) */}
        <td className="stock-progress-td">
          <div className="stock-progress-cell">
            <div className="stock-numbers-line font-mono">
              <span className="stock-have">{fmtInt(e.stock)}</span>
              <span className="stock-sep">/</span>
              <span className="stock-need">{fmtInt(e.total)}</span>
              <span
                className={`stock-pct ${
                  e.progressPercent >= 100 ? 'good' : e.progressPercent > 0 ? 'amber' : 'dim'
                }`}
              >
                ({e.progressPercent} %)
              </span>
            </div>

            <div className="stock-bar-wrap">
              <div
                className={`stock-bar-fill ${
                  e.progressPercent >= 100
                    ? 'bar-good'
                    : e.progressPercent > 0
                    ? 'bar-amber'
                    : 'bar-empty'
                }`}
                style={{ width: `${Math.min(100, e.progressPercent)}%` }}
              />
            </div>

            <div className="stock-status-tag">
              {e.progressPercent >= 100 ? (
                <span className="stock-pill pill-complete">
                  <CheckCircle2 size={10} /> {t('legendary.statusComplete')}
                </span>
              ) : e.stock > 0 ? (
                <span className="stock-pill pill-partial">
                  <Clock size={10} /> {lang === 'en' ? `+${fmtInt(e.stock)} in storage` : `+${fmtInt(e.stock)} im Lager`}
                </span>
              ) : (
                <span className="stock-pill pill-empty">
                  <AlertCircle size={10} /> {t('legendary.statusMissing')}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Noch offen (Missing Units) */}
        <td className="num font-mono open-qty-td">
          {e.missing > 0 ? (
            <span className="missing-pill font-bold">
              {fmtInt(e.missing)}
            </span>
          ) : (
            <span className="good dim ready-tag">✓ {lang === 'en' ? 'Done' : 'Bereit'}</span>
          )}
        </td>

        {/* Buy Now Unit Price */}
        <td className="num">
          <Coin copper={e.unitPrice} />
          {isKnownVendor && (
            <span className="vendor-hint-pill" title={lang === 'en' ? 'Fixed vendor price' : 'Fester Händlerpreis'}>
              {lang === 'en' ? 'Vendor' : 'Händler'}
            </span>
          )}
        </td>

        {/* Total Cost for Missing Units */}
        <td className="num font-mono">
          <Coin copper={e.totalCost} />
        </td>

        {/* Sources & Acquisition */}
        <td className="sources-cell">
          <div className="sources-tags-wrap">
            {sources.slice(0, 3).map((s, idx) => (
              <span
                key={idx}
                className={`source-pill k-${s.kind}`}
                title={lang === 'en' ? s.detailEn || s.detail : s.detail}
              >
                {lang === 'en' ? s.labelEn || s.label : s.label}
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
  };

  return (
    <div className="material-table-container">
      {/* 1. Header Summary Cards: Die 4 Kernbereiche auf einen Blick */}
      <div className="gw2-material-summary-strip">
        {/* Card 1: Wie viel ich bereits habe */}
        <div
          className={`summary-stat-card card-stock-highlight ${filterMode === 'in_stock' ? 'active-card' : ''}`}
          onClick={() => setFilterMode(filterMode === 'in_stock' ? 'all' : 'in_stock')}
          title={lang === 'en' ? 'Click to filter items in storage' : 'Klicken, um fertige Lagerbestände zu filtern'}
        >
          <div className="stat-card-left">
            <PackageCheck size={16} className="green" />
            <span className="stat-card-title dim font-serif">
              {t('legendary.colStockProgress')}
            </span>
          </div>
          <div className="stat-card-val font-mono green">
            {metrics.inStockCount} / {pricedRowItems.length}{' '}
            <span className="card-sub-pct">({metrics.overallPct} %)</span>
          </div>
          <div className="stat-card-mini-bar">
            <div className="bar-fill green-fill" style={{ width: `${metrics.overallPct}%` }} />
          </div>
          <div className="stat-card-footer dim font-mono">
            {t('legendary.savedStockValue')}{' '}
            <strong className="green">
              <Coin copper={metrics.totalSavedValue} />
            </strong>
          </div>
        </div>

        {/* Card 2: Was gekauft werden MUSS */}
        <div
          className={`summary-stat-card card-must-buy-highlight ${filterMode === 'must_buy' ? 'active-card' : ''}`}
          onClick={() => setFilterMode(filterMode === 'must_buy' ? 'all' : 'must_buy')}
          title={lang === 'en' ? 'Click to filter items that MUST be bought' : 'Klicken, um Zukauf-Posten zu filtern'}
        >
          <div className="stat-card-left">
            <ShoppingCart size={16} className="gold" />
            <span className="stat-card-title dim font-serif">
              {t('legendary.categoryMustBuy')}
            </span>
          </div>
          <div className="stat-card-val font-mono gold">
            <Coin copper={metrics.totalMissingCost} />
          </div>
          <div className="stat-card-footer dim font-mono">
            <span>
              {metrics.mustBuyMissing} {lang === 'en' ? 'items' : 'Posten'} (
              {metrics.vendorCost > 0 ? (
                <>
                  <Coin copper={metrics.vendorCost} /> {lang === 'en' ? 'Vendor' : 'Händler'} +{' '}
                </>
              ) : null}
              <Coin copper={metrics.tpCost} /> TP)
            </span>
          </div>
        </div>

        {/* Card 3: Herstellbar (Eigenfertigung) */}
        <div
          className={`summary-stat-card ${filterMode === 'craftable' ? 'active-card' : ''}`}
          onClick={() => setFilterMode(filterMode === 'craftable' ? 'all' : 'craftable')}
          title={lang === 'en' ? 'Click to filter craftable components' : 'Klicken, um herstellbare Komponenten zu filtern'}
        >
          <div className="stat-card-left">
            <Hammer size={16} className="cyan" />
            <span className="stat-card-title dim font-serif">
              {t('legendary.categoryCraftable')}
            </span>
          </div>
          <div className="stat-card-val font-mono cyan">
            {metrics.craftableReady} / {metrics.craftableTotal}{' '}
            <span className="card-sub-pct">{lang === 'en' ? 'ready' : 'fertig'}</span>
          </div>
          <div className="stat-card-footer dim">
            {lang === 'en' ? 'Mystic Forge & Crafting Disciplines' : 'Mystische Schmiede & Handwerk'}
          </div>
        </div>

        {/* Card 4: Nicht herstellbar */}
        <div
          className={`summary-stat-card ${filterMode === 'non_craftable' ? 'active-card' : ''}`}
          onClick={() => setFilterMode(filterMode === 'non_craftable' ? 'all' : 'non_craftable')}
          title={lang === 'en' ? 'Click to filter non-craftable items' : 'Klicken, um Nicht-Herstellbare zu filtern'}
        >
          <div className="stat-card-left">
            <Compass size={16} className="purple" />
            <span className="stat-card-title dim font-serif">
              {t('legendary.categoryNonCraftable')}
            </span>
          </div>
          <div className="stat-card-val font-mono purple">
            {metrics.nonCraftableReady} / {metrics.nonCraftableTotal}{' '}
            <span className="card-sub-pct">{lang === 'en' ? 'ready' : 'vorhanden'}</span>
          </div>
          <div className="stat-card-footer dim">
            {lang === 'en' ? 'Map Exploration, Rewards & Drops' : 'Erkundung, Belohnungen & Rohstoffe'}
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
            title={
              lang === 'en'
                ? 'Reset all purchases back to self-crafting'
                : 'Alle Direktkäufe rückgängig machen (wieder selbst herstellen)'
            }
          >
            <RotateCcw size={10} />
            <span>{t('legendary.resetAllPurchases')}</span>
          </button>
        </div>
      )}

      {/* 3. Table Filters, Scope Switcher & Sort Controls */}
      <div className="table-filter-bar">
        {/* Main Filter Chips matching user requirements */}
        <div className="filter-chips-group">
          <button
            className={`btn-chip ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            {t('legendary.tabAll', { count: pricedRowItems.length })}
          </button>

          <button
            className={`btn-chip ${filterMode === 'craftable' ? 'active active-craftable' : ''}`}
            onClick={() => setFilterMode('craftable')}
          >
            {t('legendary.tabCraftable', { count: metrics.craftableTotal })}
          </button>

          <button
            className={`btn-chip ${filterMode === 'must_buy' ? 'active active-mustbuy' : ''}`}
            onClick={() => setFilterMode('must_buy')}
          >
            {t('legendary.tabMustBuy', { count: metrics.mustBuyTotal })}
          </button>

          <button
            className={`btn-chip ${filterMode === 'non_craftable' ? 'active active-noncraftable' : ''}`}
            onClick={() => setFilterMode('non_craftable')}
          >
            {t('legendary.tabNonCraftable', { count: metrics.nonCraftableTotal })}
          </button>

          <button
            className={`btn-chip ${filterMode === 'in_stock' ? 'active' : ''}`}
            onClick={() => setFilterMode('in_stock')}
          >
            {t('legendary.tabInStock', { count: metrics.inStockCount })}
          </button>

          <button
            className={`btn-chip ${filterMode === 'missing' ? 'active' : ''}`}
            onClick={() => setFilterMode('missing')}
          >
            {t('legendary.tabMissing', { count: metrics.missingCount })}
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

        {/* View Controls: Scope Switcher, Group Toggle & Sort */}
        <div className="table-controls-right">
          {/* Scope: Full vs Base BOM */}
          {rootNode && (
            <div className="table-scope-wrap" title={lang === 'en' ? 'Select detail scope' : 'Detailtiefe wählen'}>
              <Layers size={11} className="dim" />
              <select
                className="gw2-select table-scope-select"
                value={scopeMode}
                onChange={(e) => setScopeMode(e.target.value as ScopeOption)}
              >
                <option value="all">{t('legendary.scopeFull')}</option>
                <option value="bom">{t('legendary.scopeBom')}</option>
              </select>
            </div>
          )}

          {/* Group by Category Toggle (active when filter is 'all') */}
          {filterMode === 'all' && (
            <label className="group-toggle-label cursor-pointer" title="Nach Beschaffungskategorie unterteilen">
              <input
                type="checkbox"
                checked={groupByCategory}
                onChange={(e) => setGroupByCategory(e.target.checked)}
              />
              <span>{t('legendary.groupByCategory')}</span>
            </label>
          )}

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
              <option value="progress-asc">
                {lang === 'en' ? 'Stock: Lowest % first' : 'Bestand: Geringster % zuerst'}
              </option>
              <option value="progress-desc">
                {lang === 'en' ? 'Stock: Highest % first' : 'Bestand: Höchster % zuerst'}
              </option>
              <option value="name">{t('legendary.sortName')}</option>
              <option value="default">{t('legendary.sortDefault')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Dense Material Table: Either Grouped by Category or Flat List */}
      <div className="bom-table-scroll-wrap">
        {groupByCategory && filterMode === 'all' ? (
          <div className="grouped-material-sections">
            {/* Sektion 1: Herstellbar */}
            {groupedSections.craftable.length > 0 && (
              <div className="category-section craftable-section">
                <div className="section-header-banner">
                  <div className="section-header-left">
                    <Hammer size={14} className="cyan" />
                    <h3 className="section-title font-serif">{t('legendary.groupCraftableTitle')}</h3>
                    <span className="section-count-badge">
                      {groupedSections.craftable.length} {lang === 'en' ? 'items' : 'Positionen'}
                    </span>
                  </div>
                  <div className="section-header-right font-mono dim">
                    {groupedSections.craftable.filter((r) => r.isDone || r.progressPercent >= 100).length} /{' '}
                    {groupedSections.craftable.length} {lang === 'en' ? 'in stock' : 'bereit'}
                  </div>
                </div>

                <table className="gw2-dense-table bom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>{t('legendary.colDone')}</th>
                      <th style={{ width: '36px' }}>{t('legendary.colIcon')}</th>
                      <th>{t('legendary.colMaterial')}</th>
                      <th style={{ width: '220px' }}>{t('legendary.colStockProgress')}</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colOpenQty')}</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>{t('legendary.colBuyNow')}</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>{t('legendary.colTotalCost')}</th>
                      <th style={{ width: '190px' }}>{t('legendary.colSources')}</th>
                    </tr>
                  </thead>
                  <tbody>{groupedSections.craftable.map(renderRow)}</tbody>
                </table>
              </div>
            )}

            {/* Sektion 2: Was gekauft werden MUSS */}
            {groupedSections.mustBuy.length > 0 && (
              <div className="category-section must-buy-section">
                <div className="section-header-banner">
                  <div className="section-header-left">
                    <ShoppingCart size={14} className="gold" />
                    <h3 className="section-title font-serif">{t('legendary.groupMustBuyTitle')}</h3>
                    <span className="section-count-badge gold">
                      {groupedSections.mustBuy.length} {lang === 'en' ? 'items' : 'Positionen'}
                    </span>
                  </div>
                  <div className="section-header-right font-mono gold">
                    {lang === 'en' ? 'Missing buy cost: ' : 'Offene Kosten: '}
                    <Coin
                      copper={groupedSections.mustBuy.reduce(
                        (sum, r) => sum + (r.unitPrice !== null ? r.unitPrice * r.missing : 0),
                        0
                      )}
                    />
                  </div>
                </div>

                <table className="gw2-dense-table bom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>{t('legendary.colDone')}</th>
                      <th style={{ width: '36px' }}>{t('legendary.colIcon')}</th>
                      <th>{t('legendary.colMaterial')}</th>
                      <th style={{ width: '220px' }}>{t('legendary.colStockProgress')}</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colOpenQty')}</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>{t('legendary.colBuyNow')}</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>{t('legendary.colTotalCost')}</th>
                      <th style={{ width: '190px' }}>{t('legendary.colSources')}</th>
                    </tr>
                  </thead>
                  <tbody>{groupedSections.mustBuy.map(renderRow)}</tbody>
                </table>
              </div>
            )}

            {/* Sektion 3: Nicht herstellbar */}
            {groupedSections.nonCraftable.length > 0 && (
              <div className="category-section non-craftable-section">
                <div className="section-header-banner">
                  <div className="section-header-left">
                    <Compass size={14} className="purple" />
                    <h3 className="section-title font-serif">{t('legendary.groupNonCraftableTitle')}</h3>
                    <span className="section-count-badge purple">
                      {groupedSections.nonCraftable.length} {lang === 'en' ? 'items' : 'Positionen'}
                    </span>
                  </div>
                  <div className="section-header-right font-mono dim">
                    {groupedSections.nonCraftable.filter((r) => r.isDone || r.progressPercent >= 100).length} /{' '}
                    {groupedSections.nonCraftable.length} {lang === 'en' ? 'ready' : 'bereit'}
                  </div>
                </div>

                <table className="gw2-dense-table bom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>{t('legendary.colDone')}</th>
                      <th style={{ width: '36px' }}>{t('legendary.colIcon')}</th>
                      <th>{t('legendary.colMaterial')}</th>
                      <th style={{ width: '220px' }}>{t('legendary.colStockProgress')}</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colOpenQty')}</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>{t('legendary.colBuyNow')}</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>{t('legendary.colTotalCost')}</th>
                      <th style={{ width: '190px' }}>{t('legendary.colSources')}</th>
                    </tr>
                  </thead>
                  <tbody>{groupedSections.nonCraftable.map(renderRow)}</tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Single Flat Table */
          <table className="gw2-dense-table bom-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>{t('legendary.colDone')}</th>
                <th style={{ width: '36px' }}>{t('legendary.colIcon')}</th>
                <th>{t('legendary.colMaterial')}</th>
                <th style={{ width: '220px' }}>{t('legendary.colStockProgress')}</th>
                <th style={{ width: '90px', textAlign: 'right' }}>{t('legendary.colOpenQty')}</th>
                <th style={{ width: '110px', textAlign: 'right' }}>{t('legendary.colBuyNow')}</th>
                <th style={{ width: '120px', textAlign: 'right' }}>{t('legendary.colTotalCost')}</th>
                <th style={{ width: '190px' }}>{t('legendary.colSources')}</th>
              </tr>
            </thead>
            <tbody>
              {processedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    {lang === 'en'
                      ? 'No materials match the selected filter.'
                      : 'Keine Materialien entsprechen dem gewählten Filter.'}
                  </td>
                </tr>
              ) : (
                processedItems.map(renderRow)
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
