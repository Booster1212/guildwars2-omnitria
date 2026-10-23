import React, { useState } from 'react';
import type { CraftingTreeNode } from '../../domain/craftingCalculator';
import { getItem } from '../../data/gw2/items';
import { fmtInt } from '../common/labels';
import { Coin, ItemIcon } from '../common/ui';
import {
  ChevronRight,
  ChevronDown,
  Hammer,
  ShoppingCart,
  Check,
  AlertTriangle,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CraftingTreeViewProps {
  trees: CraftingTreeNode[];
  onOpenItem: (id: number) => void;
  onToggleProcurement: (itemId: number) => void;
  hasStockData: boolean;
}

interface TreeNodeItemProps {
  node: CraftingTreeNode;
  onOpenItem: (id: number) => void;
  onToggleProcurement: (itemId: number) => void;
  hasStockData: boolean;
  collapsedSet: Set<string>;
  onToggleCollapse: (id: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  onOpenItem,
  onToggleProcurement,
  hasStockData,
  collapsedSet,
  onToggleCollapse,
}) => {
  const { t, lang } = useTranslation();
  const item = getItem(node.itemId);
  const isCollapsed = collapsedSet.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isComplete = node.netDemand <= 0;

  const getActionBadge = () => {
    switch (node.action) {
      case 'craft':
        return (
          <span className="tree-pill pill-craft">
            <Hammer size={10} className="mr-1 inline" />
            {t('crafting.actionCraft')}
          </span>
        );
      case 'buy':
        return (
          <span className="tree-pill pill-buy">
            <ShoppingCart size={10} className="mr-1 inline" />
            {t('crafting.actionBuy')}
          </span>
        );
      case 'vendor':
        return <span className="tree-pill pill-vendor">{t('crafting.actionVendor')}</span>;
      case 'gather':
        return <span className="tree-pill pill-gather">{t('crafting.actionGather')}</span>;
      case 'drop':
        return <span className="tree-pill pill-drop">{t('crafting.actionDrop')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`crafting-tree-node depth-${Math.min(node.depth, 6)} ${isComplete ? 'node-complete' : ''}`}>
      <div className="tree-node-row">
        {/* Aufklapp-Pfeil oder Abstandshalter */}
        {hasChildren ? (
          <button
            type="button"
            className="btn-tree-expander"
            onClick={() => onToggleCollapse(node.id)}
            title={isCollapsed ? t('crafting.expandAll') : t('crafting.collapseAll')}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        ) : (
          <span className="tree-spacer-leaf" />
        )}

        {/* Item Icon */}
        <ItemIcon id={node.itemId} size="s" onClick={() => onOpenItem(node.itemId)} />

        {/* Menge */}
        <div className="tree-demand-badge font-mono">
          <span className="gross font-bold">{fmtInt(node.grossDemand)}×</span>
        </div>

        {/* Name und Meta */}
        <div className="tree-node-info">
          <div className="tree-title-line">
            <span
              className={`font-serif tree-item-name cursor-pointer r-${item?.rarity ?? 'Basic'}`}
              onClick={() => onOpenItem(node.itemId)}
              title={`${item?.name ?? node.itemId} (ID: ${node.itemId})`}
            >
              {item?.name ?? `#${node.itemId}`}
            </span>

            {/* Herstellungsdurchläufe */}
            {node.craftRuns > 0 && (
              <span className="craft-runs-tag font-mono">
                {t('crafting.craftRunsBadge', { count: node.craftRuns })}
              </span>
            )}

            {/* Bestandskennzeichnung */}
            {hasStockData && node.fromStock > 0 && (
              <span className="tree-stock-badge font-mono" title={`${node.fromStock} Einheiten aus Bestand gedeckt`}>
                <Check size={11} className="inline mr-1" />
                {t('crafting.inStockBadge', { count: node.fromStock })}
              </span>
            )}

            {/* Zyklus-Warnung */}
            {node.cyclic && (
              <span className="tree-cycle-warning" title="Zyklische Abhängigkeit erkannt">
                <AlertTriangle size={11} className="inline mr-1" />
                {t('crafting.cycleDetected')}
              </span>
            )}

            {/* Fehlendes Rezept */}
            {node.missingRecipe && (
              <span className="tree-missing-recipe" title="Rezept in Datenbank nicht gefunden">
                {t('crafting.missingRecipeWarning')}
              </span>
            )}
          </div>
        </div>

        {/* Aktionen & Beschaffung */}
        <div className="tree-action-col">
          {getActionBadge()}

          {/* Quick Toggle Herstellen vs. Kaufen */}
          {node.isCraftable && node.depth > 0 && (
            <button
              type="button"
              className={`tree-toggle-procure-btn ${node.action === 'craft' ? 'is-craft' : 'is-buy'}`}
              onClick={() => onToggleProcurement(node.itemId)}
              title={
                node.action === 'craft'
                  ? lang === 'en'
                    ? 'Switch to buy finished component'
                    : 'Auf Direktkauf umschalten'
                  : lang === 'en'
                    ? 'Switch to self-crafting'
                    : 'Auf Eigenherstellung umschalten'
              }
            >
              {node.action === 'craft' ? (
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

          {/* Zeilenkosten bei Kauf */}
          {node.lineCost !== null && (
            <div className="tree-cost">
              <Coin copper={node.lineCost} />
            </div>
          )}
        </div>
      </div>

      {/* Rekursive Kinder */}
      {hasChildren && !isCollapsed && (
        <div className="tree-children-block">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              onOpenItem={onOpenItem}
              onToggleProcurement={onToggleProcurement}
              hasStockData={hasStockData}
              collapsedSet={collapsedSet}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CraftingTreeView: React.FC<CraftingTreeViewProps> = ({
  trees,
  onOpenItem,
  onToggleProcurement,
  hasStockData,
}) => {
  const { t, lang } = useTranslation();
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());

  const handleToggleCollapse = (id: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedSet(new Set());
  };

  const handleCollapseAll = () => {
    const allIds = new Set<string>();
    const walk = (n: CraftingTreeNode) => {
      if (n.children && n.children.length > 0) allIds.add(n.id);
      n.children.forEach(walk);
    };
    trees.forEach(walk);
    setCollapsedSet(allIds);
  };

  return (
    <div className="planner-tree-view-wrap">
      {/* Baum-Werkzeugleiste */}
      <div className="tree-toolbar">
        <span className="dim text-xs">
          {lang === 'en'
            ? 'Hierarchical recipe dependency tree with real recipe output ratios:'
            : 'Hierarchische Rezept-Abhängigkeiten mit echten Ausgabemengen:'}
        </span>
        <div className="tree-toolbar-actions">
          <button type="button" className="btn-tiny" onClick={handleExpandAll}>
            <FolderOpen size={11} className="mr-1 inline" />
            {t('crafting.expandAll')}
          </button>
          <button type="button" className="btn-tiny" onClick={handleCollapseAll}>
            <Folder size={11} className="mr-1 inline" />
            {t('crafting.collapseAll')}
          </button>
        </div>
      </div>

      {/* Baum-Knoten */}
      <div className="tree-nodes-list">
        {trees.length === 0 ? (
          <div className="empty-panel dim">
            {lang === 'en' ? 'No items in the crafting plan.' : 'Keine Gegenstände im Herstellungsplan.'}
          </div>
        ) : (
          trees.map((root) => (
            <TreeNodeItem
              key={root.id}
              node={root}
              onOpenItem={onOpenItem}
              onToggleProcurement={onToggleProcurement}
              hasStockData={hasStockData}
              collapsedSet={collapsedSet}
              onToggleCollapse={handleToggleCollapse}
            />
          ))
        )}
      </div>
    </div>
  );
};
