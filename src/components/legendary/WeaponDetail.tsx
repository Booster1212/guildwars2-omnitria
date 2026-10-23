import React, { useState, useMemo } from 'react';
import type { LegendaryModel, LegendaryWeapon } from '../../domain/legendary';
import { GENERATION_LABEL, WEAPON_TYPE_DE, weaponSlot, SLOT_LABEL } from '../../domain/legendary';
import { buildTree } from '../../domain/recipeTree';
import { estimateCosts } from '../../domain/costs';
import { getItem, useItems } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { useProgress, progressActions } from '../../data/progressStore';
import type { Gw2AccountAchievement } from '../../data/gw2Api';
import { Coin, ItemIcon, Notice, ProgressBar, Tabs } from '../common/ui';
import { CraftTree } from './CraftTree';
import { MaterialTable } from './MaterialTable';
import { CollectionList } from './CollectionList';
import { Star, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface WeaponDetailProps {
  weapon: LegendaryWeapon;
  model: LegendaryModel;
  userAchievements: Map<number, Gw2AccountAchievement>;
  onOpenItem: (id: number) => void;
}

export const WeaponDetail: React.FC<WeaponDetailProps> = ({
  weapon,
  model,
  userAchievements,
  onOpenItem,
}) => {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tree' | 'materials' | 'collections' | 'notes'>('tree');
  const account = useAccountState();
  const progress = useProgress();

  const weaponProgress = progress.legendary[String(weapon.id)];
  const isTracked = progress.tracked.includes(weapon.id);

  const doneNodes = useMemo(() => new Set(weaponProgress?.doneNodes ?? []), [weaponProgress?.doneNodes]);
  const doneMaterials = useMemo(
    () => new Set(weaponProgress?.doneMaterials ?? []),
    [weaponProgress?.doneMaterials]
  );
  const buyItems = useMemo(() => new Set(weaponProgress?.buyItems ?? []), [weaponProgress?.buyItems]);

  // Compute hierarchical recipe tree and BOM
  const treeResult = useMemo(() => {
    return buildTree(weapon.id, 1, model, {
      stock: account.stockMap,
      doneNodes,
      doneMaterials,
      buyItems,
    });
  }, [weapon.id, model, account.stockMap, doneNodes, doneMaterials, buyItems]);

  // Collect all needed item IDs for items & prices
  const allTreeItemIds = useMemo(() => {
    const ids = new Set<number>([weapon.id]);
    for (const [id] of treeResult.bom) ids.add(id);
    return Array.from(ids);
  }, [weapon.id, treeResult.bom]);

  useItems(allTreeItemIds);
  const prices = usePrices(allTreeItemIds);

  const item = getItem(weapon.id);
  const genInfo = GENERATION_LABEL[weapon.generation] ?? { short: `Gen ${weapon.generation}`, long: '' };
  const rawType = item?.weaponType ?? weapon.type;
  const typeLabel = lang === 'en' ? rawType : (WEAPON_TYPE_DE[rawType] ?? rawType);
  const slot = weaponSlot(weapon, item);
  const slotLabel = slot
    ? lang === 'en'
      ? slot === 'oneHand'
        ? 'One-Handed'
        : slot === 'twoHand'
        ? 'Two-Handed'
        : slot === 'offHand'
        ? 'Off-Hand'
        : 'Aquatic'
      : SLOT_LABEL[slot]
    : '';

  return (
    <div className="gw2-detail-panel weapon-detail-panel">
      {/* Weapon Banner Header */}
      <div className="detail-banner-header weapon-banner">
        <div className="banner-left">
          <ItemIcon id={weapon.id} size="l" />
          <div className="banner-titles">
            <div className="title-row-with-track">
              <h2 className="banner-main-title font-serif r-Legendary">{item?.name ?? weapon.nameEn}</h2>
              <button
                className={`btn-track-header ${isTracked ? 'active' : ''}`}
                onClick={() => progressActions.toggleTracked(weapon.id)}
                title={isTracked ? 'Untrack' : 'Track'}
              >
                <Star size={13} fill={isTracked ? '#d2b268' : 'none'} />
                <span>{isTracked ? t('legendary.tracking') : t('legendary.track')}</span>
              </button>
            </div>

            <div className="banner-sub-meta">
              <span className="type-badge">{typeLabel}</span>
              {slotLabel && <span className="dim">({slotLabel})</span>}
              <span className="sep">·</span>
              <span className="gen-tag-full">{genInfo.long || genInfo.short}</span>
              <span className="sep">·</span>
              <span className="dim">ID {weapon.id}</span>
            </div>
          </div>
        </div>

        {/* Progress & Quick Stats */}
        <div className="banner-right">
          <div className="progress-status-box">
            <div className="progress-number font-mono">
              {Math.round(treeResult.progress * 100)} %
            </div>
            <div className="progress-bar-container">
              <ProgressBar
                value={treeResult.progress}
                tone={treeResult.progress >= 1 ? 'gold' : 'green'}
              />
            </div>
            <div className="progress-sub-text dim font-mono">
              {t('legendary.stepsDone', {
                done: treeResult.components.complete,
                total: treeResult.components.total,
              })}
            </div>
          </div>

          <button
            className="btn-tiny reset-btn"
            onClick={() => {
              const confirmMsg = lang === 'en'
                ? `Reset manual progress for ${item?.name ?? weapon.nameEn}?`
                : `Möchtest du den manuellen Fortschritt für ${item?.name ?? weapon.nameEn} wirklich zurücksetzen?`;
              if (window.confirm(confirmMsg)) {
                progressActions.resetLegendary(weapon.id);
              }
            }}
            title="Reset progress"
          >
            <RotateCcw size={10} />
            <span>{t('legendary.reset')}</span>
          </button>
        </div>
      </div>

      {/* Incomplete Warning if no recipe exists in dataset */}
      {!weapon.hasRecipe && (
        <Notice tone="warn" title={lang === 'en' ? 'Recipe data incomplete in dataset' : 'Rezeptdaten im Community-Datensatz unvollständig'}>
          {lang === 'en' ? (
            <>
              No recipe is currently available for <strong>{item?.name ?? weapon.nameEn}</strong> in the offline dataset.
              As the official GW2 API does not expose Mystic Forge recipes, no artificial ingredients are displayed.
            </>
          ) : (
            <>
              Für <strong>{item?.name ?? weapon.nameEn}</strong> liegt im hinterlegten Community-Datensatz noch kein
              Rezept vor. Da die offizielle GW2-API keine Mystische-Schmiede-Rezepte ausgibt, werden keine erfundenen
              Zutaten angezeigt.
            </>
          )}
        </Notice>
      )}

      {/* Main Tabs Strip */}
      <div className="detail-tabs-strip">
        <Tabs
          tabs={[
            { id: 'tree', label: t('legendary.craftTree') },
            { id: 'materials', label: t('legendary.materialsBom', { count: treeResult.bom.size }) },
            { id: 'collections', label: t('legendary.collections') },
            { id: 'notes', label: t('legendary.notes') },
          ]}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as 'tree' | 'materials' | 'collections' | 'notes')}
        />
      </div>

      {/* Tab Content Panels */}
      <div className="detail-content-area">
        {activeTab === 'tree' && (
          <CraftTree rootNode={treeResult.root} weaponId={weapon.id} onOpenItem={onOpenItem} />
        )}

        {activeTab === 'materials' && (
          <MaterialTable
            bom={treeResult.bom}
            weaponId={weapon.id}
            model={model}
            onOpenItem={onOpenItem}
          />
        )}

        {activeTab === 'collections' && (
          <CollectionList weapon={weapon} userAchievements={userAchievements} />
        )}

        {activeTab === 'notes' && (
          <div className="weapon-notes-view">
            <div className="notes-card">
              <h4 className="notes-card-title font-serif">
                <Info size={14} className="gold" /> {lang === 'en' ? 'Data Sources & Methodology' : 'Datenquellen & Methodik'}
              </h4>
              <p>
                {lang === 'en'
                  ? 'Mystic Forge recipes are inherently not provided by the official Guild Wars 2 API. The recipe trees and origins here are based on the vetted open-source dataset '
                  : 'Die Rezepte der Mystischen Schmiede sind prinzipbedingt nicht Teil der offiziellen Guild Wars 2 API. Die hier genutzten Rezeptbäume und Herkunfts-Tags basieren auf dem geprüften Open-Source-Datensatz '}
                <a
                  href="https://github.com/PieOrCake/crafty_legend"
                  target="_blank"
                  rel="noreferrer"
                  className="link-gold"
                >
                  PieOrCake/crafty_legend
                </a>{' '}
                (MIT, Commit <code>8b674229</code>).
              </p>
              <p>
                {lang === 'en'
                  ? 'All item names, icons, weapon types and Trading Post prices are loaded directly from the official ArenaNet API in real time.'
                  : 'Alle Item-Namen, Symbole, Waffentypen und Handelsgesellschafts-Preise werden zur Laufzeit direkt und tagesaktuell von der offiziellen ArenaNet API geladen.'}
              </p>
            </div>

            <div className="notes-card">
              <h4 className="notes-card-title font-serif">
                <AlertTriangle size={14} className="gold" /> {lang === 'en' ? 'RNG Recipes & Estimates' : 'Zufallsrezepte & Schätzungen'}
              </h4>
              <p>
                {lang === 'en'
                  ? 'The recipe for Mystic Clovers has a random success chance. Calculations assume a community-verified average success rate of ~31%. Actual consumption in game may differ due to RNG.'
                  : 'Das Rezept für Mystische Kleeblätter besitzt eine zufällige Erfolgschance. In den Berechnungen wird eine von der Community ermittelte durchschnittliche Erfolgsquote von ca. 31 % zugrunde gelegt. Der tatsächliche Verbrauch im Spiel kann aufgrund von Zufallsschwankungen abweichen.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
