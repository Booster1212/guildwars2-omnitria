import React, { useState } from 'react';
import type { TreeNode } from '../../domain/recipeTree';
import { getItem } from '../../data/gw2/items';
import { progressActions } from '../../data/progressStore';
import { ItemIcon, Check, ProgressBar } from '../common/ui';
import { fmtInt } from '../common/labels';
import { ChevronDown, ChevronRight, ShoppingCart, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CraftTreeProps {
  rootNode: TreeNode;
  weaponId: number;
  onOpenItem: (id: number) => void;
}

export const CraftTree: React.FC<CraftTreeProps> = ({ rootNode, weaponId, onOpenItem }) => {
  const { t, lang } = useTranslation();
  // Set of collapsed node keys
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderNode = (node: TreeNode) => {
    const isLeaf = !node.children || node.children.length === 0;
    const isCollapsed = collapsedKeys.has(node.key);
    const item = getItem(node.itemId);
    const isDone = node.done || node.progress >= 1;

    return (
      <div key={node.key} className={`tree-node-wrap depth-${Math.min(6, node.depth)}`}>
        <div className={`tree-node-row ${node.muted ? 'node-muted' : ''} ${isDone ? 'node-done' : ''}`}>
          {/* Expand/Collapse Toggle or Indent Spacer */}
          <div className="node-toggle-col">
            {!isLeaf ? (
              <button
                className="btn-tree-toggle"
                onClick={() => toggleCollapse(node.key)}
                title={isCollapsed ? (lang === 'en' ? 'Expand branch' : 'Zweige ausklappen') : (lang === 'en' ? 'Collapse branch' : 'Zweige einklappen')}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            ) : (
              <span className="tree-leaf-spacer" />
            )}
          </div>

          {/* Done Checkbox */}
          <div className="node-check-col">
            <Check
              checked={node.done}
              onChange={() => progressActions.toggleNodeDone(weaponId, node.key)}
              title={node.done ? (lang === 'en' ? 'Mark as not done' : 'Als nicht erledigt markieren') : (lang === 'en' ? 'Mark as done' : 'Als erledigt markieren')}
            />
          </div>

          {/* Item Icon */}
          <div className="node-icon-col">
            <ItemIcon id={node.itemId} size="s" onClick={() => onOpenItem(node.itemId)} />
          </div>

          {/* Item Title & Badges */}
          <div className="node-info-col">
            <div className="node-title-line">
              <span
                className={`node-item-name font-serif cursor-pointer r-${item?.rarity ?? 'Basic'}`}
                onClick={() => onOpenItem(node.itemId)}
              >
                {item?.name ?? `#${node.itemId}`}
              </span>

              {node.random && (
                <span className="random-tag" title="RNG Estimate">
                  <Sparkles size={10} /> {t('legendary.estimate')}
                </span>
              )}

              {node.bought && (
                <span className="bought-tag" title="Purchase directly">
                  <ShoppingCart size={10} /> {t('legendary.purchase')}
                </span>
              )}
            </div>

            {/* Quantities: Demand / From Stock / Missing */}
            <div className="node-quantities-line font-mono">
              <span className="q-item">
                {t('legendary.demand')} <strong>{fmtInt(node.demand)}</strong>
              </span>
              {node.fromStock > 0 && (
                <span className="q-item good">
                  {t('legendary.storage')} {fmtInt(node.fromStock)}
                </span>
              )}
              {node.missing > 0 && !node.muted && (
                <span className="q-item bad">
                  {t('legendary.open')} <strong>{fmtInt(node.missing)}</strong>
                </span>
              )}
              {node.crafts > 0 && !node.muted && (
                <span className="q-crafts dim">
                  {t('legendary.craftTimes', { count: node.crafts })}
                </span>
              )}
            </div>
          </div>

          {/* Buy Toggle for Sub-Components that have recipes */}
          {node.depth > 0 && node.recipe && (
            <div className="node-buy-toggle-col">
              <button
                className={`btn-tiny ${node.bought ? 'active' : ''}`}
                onClick={() => progressActions.toggleBuy(weaponId, node.itemId)}
                title={node.bought ? 'Toggle craft' : 'Toggle buy'}
              >
                <ShoppingCart size={10} />
                <span>{node.bought ? t('legendary.craftOption') : t('legendary.buyOption')}</span>
              </button>
            </div>
          )}

          {/* Node Progress Bar */}
          <div className="node-progress-col">
            <div className="node-prog-val font-mono">
              {Math.round(node.progress * 100)} %
            </div>
            <ProgressBar value={node.progress} tone={node.progress >= 1 ? 'gold' : 'green'} slim />
          </div>
        </div>

        {/* Children Branches */}
        {!isLeaf && !isCollapsed && (
          <div className="tree-children-container">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="craft-tree-container">
      <div className="tree-header-hints">
        <span className="dim">
          {t('legendary.treeHint')}
        </span>
      </div>

      <div className="tree-body">{renderNode(rootNode)}</div>
    </div>
  );
};
