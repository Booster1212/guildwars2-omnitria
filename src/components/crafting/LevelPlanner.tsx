import React, { useState, useMemo } from 'react';
import type { DisciplineId } from '../../domain/types';
import { planLevelRoute, collectPlannerItemIds } from '../../domain/levelPlanner';
import {
  calculateCraftingPlan,
  createDisciplineRecipeProvider,
  collectPlanItemIds,
  type CraftingStrategy,
  type ItemProcurement,
  type TargetCraftItem,
} from '../../domain/craftingCalculator';
import { useRecipeDb } from '../../data/gw2/recipes';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { useProgress, progressActions } from '../../data/progressStore';
import { getItem, useItems } from '../../data/gw2/items';
import { fmtInt } from '../common/labels';
import { Coin, ItemIcon, Notice, Check, ProgressBar } from '../common/ui';
import {
  ChevronRight,
  Sliders,
  ShoppingBag,
  Layers,
  Sparkles,
  GitFork,
  Hammer,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { MaterialDemandTable } from './MaterialDemandTable';
import { CraftingTreeView } from './CraftingTreeView';

interface LevelPlannerProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

export const LevelPlanner: React.FC<LevelPlannerProps> = ({ discipline, maxRank, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();
  const progress = useProgress();

  const discProgress = progress.crafting[discipline];
  const charRating = account.data?.crafting?.[discipline]?.rating;

  // Level direkt von dem jeweiligen Beruf ziehen
  const effectiveStart = charRating !== undefined ? charRating : (discProgress?.start ?? 0);
  const rawTarget = discProgress?.target ?? (discipline === 'Jeweler' ? 400 : Math.min(500, maxRank));
  const initialTarget = effectiveStart >= rawTarget && effectiveStart < maxRank
    ? Math.min(maxRank, Math.max(effectiveStart + 25, rawTarget))
    : rawTarget;

  const [fromRank, setFromRank] = useState<number>(effectiveStart);
  const [toRank, setToRank] = useState<number>(initialTarget);
  // Entdeckungs- und Zwischenschritt-Optionen: Zwischenschritte standardmäßig selbst herstellen
  const [allowDiscovery, setAllowDiscovery] = useState<boolean>(false);
  const [craftIntermediates, setCraftIntermediates] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'steps' | 'materials' | 'tree' | 'intermediates' | 'shopping'>('steps');

  // Strategie für Eigenherstellung vs. Einkauf: Standard all_craft (soweit wie möglich alles selbst herstellen)
  const [strategy, setStrategy] = useState<CraftingStrategy>('all_craft');
  const [itemOverrides, setItemOverrides] = useState<Map<number, ItemProcurement>>(new Map());
  const [onlyOpenSteps, setOnlyOpenSteps] = useState<boolean>(false);

  // Ziehe das Level direkt vom jeweiligen Beruf bei Disziplinwechsel oder neuem Rating
  React.useEffect(() => {
    const start = charRating !== undefined ? charRating : (discProgress?.start ?? 0);
    setFromRank(start);
    setToRank((currentTo) => {
      if (start >= currentTo && start < maxRank) {
        const next = Math.min(maxRank, Math.max(start + 25, currentTo < 400 ? 400 : 500));
        progressActions.setCrafting(discipline, { target: next });
        return next;
      }
      return currentTo;
    });
  }, [discipline, charRating, maxRank]);

  // Keep progress store updated when options change
  const handleStartChange = (val: number) => {
    const num = Math.max(0, Math.min(maxRank, val));
    setFromRank(num);
    progressActions.setCrafting(discipline, { start: num });
    if (toRank <= num && num < maxRank) {
      const nextTo = Math.min(maxRank, num + 25);
      setToRank(nextTo);
      progressActions.setCrafting(discipline, { target: nextTo });
    }
  };

  const handleTargetChange = (val: number) => {
    const minAllowed = fromRank < maxRank ? fromRank + 1 : maxRank;
    const num = Math.max(minAllowed, Math.min(maxRank, val));
    setToRank(num);
    progressActions.setCrafting(discipline, { target: num });
  };

  const handleToggleDiscovery = () => {
    setAllowDiscovery((prev) => !prev);
  };

  const handleToggleIntermediates = () => {
    const next = !craftIntermediates;
    setCraftIntermediates(next);
    setStrategy(next ? 'all_craft' : 'all_buy');
    setItemOverrides(new Map());
  };

  const handleSetStrategy = (strat: CraftingStrategy) => {
    setStrategy(strat);
    if (strat !== 'custom') {
      setItemOverrides(new Map());
      setCraftIntermediates(strat === 'all_craft');
    }
  };

  const handleToggleProcurement = (itemId: number) => {
    setItemOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId);
      if (current === 'buy') {
        next.set(itemId, 'craft');
      } else if (current === 'craft') {
        next.set(itemId, 'buy');
      } else {
        if (strategy === 'all_buy') {
          next.set(itemId, 'craft');
        } else {
          next.set(itemId, 'buy');
        }
      }
      return next;
    });
    setStrategy('custom');
  };

  // Collect candidate items for price queries
  const candidateItemIds = useMemo(() => {
    if (recipeDb.status !== 'ready') return [];
    return collectPlannerItemIds(discipline, recipeDb.recipes, recipeDb.byOutput);
  }, [recipeDb.recipes, recipeDb.byOutput, recipeDb.status, discipline]);

  const prices = usePrices(candidateItemIds);

  // Compute route
  const plan = useMemo(() => {
    if (recipeDb.status !== 'ready') return null;
    return planLevelRoute({
      discipline,
      fromRank,
      toRank,
      recipes: recipeDb.recipes,
      recipesByOutput: recipeDb.byOutput,
      prices: prices.map,
      options: {
        allowDiscovery,
        craftIntermediates,
        knownRecipeIds: account.knownRecipeSet,
      },
    });
  }, [
    recipeDb.recipes,
    recipeDb.byOutput,
    recipeDb.status,
    discipline,
    fromRank,
    toRank,
    prices.map,
    allowDiscovery,
    craftIntermediates,
    account.knownRecipeSet,
  ]);

  const doneSteps = discProgress?.doneSteps ?? [];

  // Berechnungsziele für die rekursive Materialauflösung
  const calculationTargets: TargetCraftItem[] = useMemo(() => {
    if (!plan) return [];
    return plan.steps
      .filter((st) => {
        if (!onlyOpenSteps) return true;
        const isMarkedDone = doneSteps.includes(st.key);
        return !isMarkedDone;
      })
      .map((st) => ({
        itemId: st.recipe.outputId,
        count: st.crafts,
        recipe: st.recipe,
        stepKey: st.key,
        label: `Rang ${st.fromRank}–${st.toRank}`,
        needsDiscovery: st.needsDiscovery,
      }));
  }, [plan, onlyOpenSteps, doneSteps]);

  // Disziplin-spezifischer Rezept-Provider
  const recipeProvider = useMemo(() => {
    if (recipeDb.status !== 'ready') return { recipeFor: () => undefined };
    return createDisciplineRecipeProvider(recipeDb.byOutput, discipline, {
      allowDiscovery,
      knownRecipeIds: account.knownRecipeSet,
      maxRating: toRank,
    });
  }, [recipeDb.byOutput, recipeDb.status, discipline, allowDiscovery, account.knownRecipeSet, toRank]);

  // Vollständige rekursive Materialbedarfsberechnung
  const craftingPlanResult = useMemo(() => {
    if (!calculationTargets.length || recipeDb.status !== 'ready') return null;
    return calculateCraftingPlan(calculationTargets, recipeProvider, {
      strategy,
      itemOverrides,
      stock: account.stockMap,
      prices: prices.map,
      allowDiscovery,
      knownRecipeIds: account.knownRecipeSet,
    });
  }, [
    calculationTargets,
    recipeProvider,
    strategy,
    itemOverrides,
    account.stockMap,
    prices.map,
    recipeDb.status,
    allowDiscovery,
    account.knownRecipeSet,
  ]);

  // Ensure item details are loaded for plan items & recursive material tree
  const allNeededItemIds = useMemo(() => {
    const ids = new Set<number>();
    if (plan) {
      plan.steps.forEach((st) => {
        ids.add(st.recipe.outputId);
        st.ingredients.forEach((i) => ids.add(i.itemId));
        st.recipe.ingredients.forEach((i) => ids.add(i.itemId));
        st.prepSteps?.forEach((p) => {
          ids.add(p.outputId);
          p.ingredients.forEach((pi) => ids.add(pi.itemId));
        });
      });
      for (const [id] of plan.purchases) ids.add(id);
      plan.intermediates.forEach((im) => ids.add(im.recipe.outputId));
    }
    if (craftingPlanResult) {
      collectPlanItemIds(craftingPlanResult).forEach((id) => ids.add(id));
    }
    return Array.from(ids);
  }, [plan, craftingPlanResult]);
  useItems(allNeededItemIds);

  const completedStepsCount = useMemo(() => {
    if (!plan) return 0;
    return plan.steps.filter((st) => doneSteps.includes(st.key)).length;
  }, [plan, doneSteps]);

  const progressFrac = plan && plan.steps.length > 0 ? completedStepsCount / plan.steps.length : 0;

  if (recipeDb.status === 'loading') {
    return (
      <div className="planner-loading-state">
        <div className="spinner" />
        <span className="font-serif">
          {lang === 'en' ? 'Loading official GW2 API recipe database…' : 'Lade offizielle Rezeptdatenbank der GW2-API …'}
        </span>
        <span className="dim">
          {recipeDb.progress.total > 0
            ? lang === 'en'
              ? `${recipeDb.progress.done} of ${recipeDb.progress.total} recipe chunks processed`
              : `${recipeDb.progress.done} von ${recipeDb.progress.total} Rezeptblöcken verarbeitet`
            : lang === 'en' ? 'Initializing…' : 'Initialisiere …'}
        </span>
      </div>
    );
  }

  if (recipeDb.status === 'error') {
    return (
      <Notice tone="error" title={lang === 'en' ? 'Error loading recipes' : 'Fehler beim Laden der Rezepte'}>
        {recipeDb.error}
        <button className="btn sm" onClick={() => recipeDb.reload()} style={{ marginTop: '8px' }}>
          {lang === 'en' ? 'Try Again' : 'Erneut versuchen'}
        </button>
      </Notice>
    );
  }

  const displayCost = craftingPlanResult ? craftingPlanResult.totals.totalCost : (plan?.totalCost ?? 0);
  const displayCrafts = craftingPlanResult ? craftingPlanResult.totals.totalCraftRuns : (plan?.totalCrafts ?? 0);

  return (
    <div className="level-planner-wrap">
      {/* Disclaimer Banner: Community XP Model */}
      <Notice tone="warn" title={lang === 'en' ? 'Estimate based on Community XP Model' : 'Schätzung basierend auf dem Community-XP-Modell'}>
        {lang === 'en'
          ? 'The official GW2 API provides neither per-recipe XP values nor current XP within a rank. Calculated step counts are based on the standard GW2 Wiki formula and represent a conservative cost estimate.'
          : 'Die offizielle GW2-API stellt weder Erfahrungswerte je Rezept noch den aktuellen XP-Fortschritt innerhalb eines Ranges bereit. Die berechneten Schrittanzahlen beruhen auf der etablierten GW2-Wiki-XP-Formel und stellen eine konservative Kostenschätzung dar.'}
      </Notice>

      {/* Max Rank Notice if character already maxed */}
      {fromRank >= maxRank && (
        <Notice tone="info" title={lang === 'en' ? 'Max Rank Reached' : 'Maximalstufe bereits erreicht'}>
          {lang === 'en'
            ? `Your character has already reached the maximum rank for this profession (${fromRank}/${maxRank}). Set the start rank to 0 if you wish to view the complete leveling guide.`
            : `Dein Charakter hat die Maximalstufe für diesen Beruf bereits erreicht (${fromRank}/${maxRank}). Setze den Startrang auf 0, wenn du die vollständige Levelroute einsehen möchtest.`}
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => handleStartChange(0)}
            >
              {lang === 'en' ? 'Show route from Rank 0' : 'Route ab Rang 0 anzeigen'}
            </button>
          </div>
        </Notice>
      )}

      {/* Configuration Controls Bar */}
      <div className="planner-controls-panel">
        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">{t('crafting.fromRank')}</label>
            <input
              type="number"
              className="gw2-num-input"
              min={0}
              max={maxRank}
              value={fromRank}
              onChange={(e) => handleStartChange(Number(e.target.value))}
            />
            {charRating !== undefined && (
              <button
                className="btn-tiny"
                onClick={() => handleStartChange(charRating)}
                title={`Reset to character rank (${charRating})`}
              >
                Char ({charRating})
              </button>
            )}
          </div>

          <div className="control-group">
            <label className="control-label">{t('crafting.toRank')}</label>
            <input
              type="number"
              className="gw2-num-input"
              min={fromRank < maxRank ? fromRank + 1 : maxRank}
              max={maxRank}
              value={toRank}
              onChange={(e) => handleTargetChange(Number(e.target.value))}
            />
            <div className="quick-targets">
              {maxRank >= 400 && (
                <button
                  className={`btn-tiny ${toRank === 400 ? 'active' : ''}`}
                  onClick={() => handleTargetChange(400)}
                >
                  400
                </button>
              )}
              {maxRank >= 500 && (
                <button
                  className={`btn-tiny ${toRank === 500 ? 'active' : ''}`}
                  onClick={() => handleTargetChange(500)}
                >
                  500
                </button>
              )}
            </div>
          </div>

          <div className="control-group toggles-group">
            <Check
              checked={allowDiscovery}
              onChange={handleToggleDiscovery}
              label={t('crafting.allowDiscovery')}
              title="Includes recipes that require experimentation in discovery panel"
            />
            <Check
              checked={craftIntermediates}
              onChange={handleToggleIntermediates}
              label={t('crafting.craftIntermediates')}
              title={lang === 'en' ? 'Crafts intermediate items (ingots, planks, bolts, insignias) yourself as far as possible' : 'Stellt Zwischenprodukte (Barren, Planken, Ballen, Insignien) weitestgehend vorher selbst her'}
            />
          </div>
        </div>

        {/* Plan Summary Bar */}
        {plan && (
          <div className="plan-stats-strip">
            <div className="stat-box">
              <span className="stat-label">{t('crafting.totalCost')}</span>
              <span className="stat-value">
                <Coin copper={displayCost} />
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{lang === 'en' ? 'Crafts:' : 'Herstellungen:'}</span>
              <span className="stat-value font-mono">
                {displayCrafts} ({plan.steps.length} {lang === 'en' ? 'steps' : 'Schritte'})
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{lang === 'en' ? 'Progress:' : 'Fortschritt:'}</span>
              <span className="stat-value font-mono">
                {completedStepsCount} / {plan.steps.length} {lang === 'en' ? 'done' : 'erledigt'}
              </span>
              {completedStepsCount > 0 && (
                <button
                  type="button"
                  className="btn-tiny"
                  onClick={() => progressActions.resetDisciplineCheckmarks(discipline)}
                  title={lang === 'en' ? 'Reset all checkmarks to 0' : 'Alle Haken auf 0 zurücksetzen'}
                  style={{ marginLeft: '6px' }}
                >
                  <RotateCcw size={10} className="mr-1 inline" />
                  {lang === 'en' ? 'Reset (0)' : 'Haken auf 0'}
                </button>
              )}
            </div>
            {craftingPlanResult && craftingPlanResult.totals.unpricedCount > 0 && (
              <div className="stat-box warn">
                <span className="stat-label">{lang === 'en' ? 'Unpriced:' : 'Ohne Preis:'}</span>
                <span className="stat-value dim">
                  {craftingPlanResult.totals.unpricedCount} {lang === 'en' ? 'items (Vendor/Bound)' : 'Posten (Händler/Gebunden)'}
                </span>
              </div>
            )}
          </div>
        )}

        {plan && (
          <div className="plan-overall-progress">
            <ProgressBar value={progressFrac} tone="gold" slim />
          </div>
        )}
      </div>

      {/* Plan Gaps Warning if any */}
      {plan && plan.gaps.length > 0 && (
        <Notice tone="warn" title={lang === 'en' ? 'Recipe gaps in official dataset' : 'Rezeptlücken im offiziellen Datenbestand'}>
          {lang === 'en'
            ? `No automatic recipes are available for ranks ${plan.gaps.map((g) => `${g.from}–${g.to}`).join(', ')}. Enable "Allow discovery recipes" or unlock vendor/dungeon recipes in game.`
            : `Für die Ränge ${plan.gaps.map((g) => `${g.from}–${g.to}`).join(', ')} stehen keine automatisch erlernten Standardrezepte zur Verfügung. Aktiviere oben „Entdeckungsrezepte zulassen“ oder schließe im Spiel Entdeckungen ab.`}
        </Notice>
      )}

      {/* Strategie-Leiste: Eigenherstellung vs. Fertig kaufen */}
      <div className="planner-strategy-bar">
        <div className="strategy-row">
          <div className="strategy-label-group">
            <span className="strategy-title">{t('crafting.strategyTitle')}</span>
            <div className="strategy-buttons">
              <button
                type="button"
                className={`strategy-btn ${strategy === 'all_craft' ? 'active' : ''}`}
                onClick={() => handleSetStrategy('all_craft')}
                title={t('crafting.strategyCraftAllHint')}
              >
                <Hammer size={12} />
                <span>{t('crafting.strategyCraftAll')}</span>
              </button>
              <button
                type="button"
                className={`strategy-btn ${strategy === 'all_buy' ? 'active' : ''}`}
                onClick={() => handleSetStrategy('all_buy')}
                title={t('crafting.strategyBuyAllHint')}
              >
                <ShoppingBag size={12} />
                <span>{t('crafting.strategyBuyAll')}</span>
              </button>
              <button
                type="button"
                className={`strategy-btn ${strategy === 'custom' ? 'active' : ''}`}
                onClick={() => setStrategy('custom')}
                title={t('crafting.strategyCustomHint')}
              >
                <Sliders size={12} />
                <span>{t('crafting.strategyCustom', { count: itemOverrides.size })}</span>
              </button>
            </div>
          </div>

          <div className="strategy-scope-toggle">
            <Check
              checked={onlyOpenSteps}
              onChange={() => setOnlyOpenSteps(!onlyOpenSteps)}
              label={t('crafting.onlyOpenSteps')}
              title="Only accounts for remaining uncompleted steps in material demand"
            />
          </div>
        </div>

        <div className="strategy-hint">
          {strategy === 'all_craft' && t('crafting.strategyCraftAllHint')}
          {strategy === 'all_buy' && t('crafting.strategyBuyAllHint')}
          {strategy === 'custom' && t('crafting.strategyCustomHint')}
        </div>
      </div>

      {/* Subtabs: Schritte / Gesamter Materialbedarf / Herstellungskette / Einkaufsliste / Zwischenprodukte */}
      <div className="planner-subtabs-row">
        <div className="subtabs-group">
          <button
            className={`subtab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            <Sliders size={13} />
            <span>{t('crafting.stepsTab')} ({plan?.steps.length ?? 0})</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <Layers size={13} />
            <span>{t('crafting.materialsTab')} ({craftingPlanResult?.materials.length ?? 0})</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
          >
            <GitFork size={13} />
            <span>{t('crafting.treeTab')}</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopping')}
          >
            <ShoppingBag size={13} />
            <span>{t('crafting.shoppingTab')} ({plan?.purchases.size ?? 0})</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'intermediates' ? 'active' : ''}`}
            onClick={() => setActiveTab('intermediates')}
          >
            <Sparkles size={13} />
            <span>{t('crafting.intermediatesTab')} ({plan?.intermediates.length ?? 0})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Schritte */}
      {activeTab === 'steps' && plan && (
        <div className="planner-steps-list">
          {plan.steps.length === 0 ? (
            <div className="empty-panel">{lang === 'en' ? 'No crafting steps required for this rank range.' : 'Keine Schritte für den gewählten Rangbereich erforderlich.'}</div>
          ) : (
            plan.steps.map((st) => {
              const outItem = getItem(st.recipe.outputId);
              const isMarkedDone = doneSteps.includes(st.key);

              return (
                <div key={st.key} className={`planner-step-card ${isMarkedDone ? 'step-done' : ''}`}>
                  <div className="step-check-col">
                    <Check
                      checked={isMarkedDone}
                      onChange={() => progressActions.toggleStepDone(discipline, st.key)}
                      title={lang === 'en' ? 'Toggle step done' : 'Schritt als erledigt markieren'}
                    />
                  </div>

                  <div className="step-rank-badge font-mono">
                    <span className="from">{st.fromRank}</span>
                    <ChevronRight size={10} className="arrow" />
                    <span className="to">{st.toRank}</span>
                  </div>

                  <div className="step-icon-col">
                    <ItemIcon
                      id={st.recipe.outputId}
                      size="m"
                      onClick={() => onOpenItem(st.recipe.outputId)}
                    />
                  </div>

                  <div className="step-content-col">
                    <div className="step-title-line">
                      <span
                        className="step-item-name font-serif cursor-pointer"
                        onClick={() => onOpenItem(st.recipe.outputId)}
                      >
                        {outItem?.name ?? `#${st.recipe.outputId}`}
                      </span>
                      <span className="step-crafts-count font-mono">
                        {lang === 'en' ? `${st.crafts}× craft` : `${st.crafts}× herstellen`}
                      </span>
                      {st.needsDiscovery && (
                        <span className="discovery-tag" title="Discovery recipe">
                          {lang === 'en' ? 'Discovery' : 'Entdeckung'}
                        </span>
                      )}
                    </div>

                    {/* Vorher selbst herstellen (Vorbereitungskette) */}
                    {st.prepSteps && st.prepSteps.length > 0 && (
                      <div className="planner-step-prep-box">
                        <div className="psp-header">
                          <div className="psp-title">
                            <Hammer size={13} className="text-emerald-400" />
                            <span className="font-semibold">{t('crafting.prepHeader')}</span>
                            <span className="psp-badge">{t('crafting.prepBadge', { count: st.prepSteps.length })}</span>
                          </div>
                        </div>

                        <div className="psp-chain-row">
                          {st.prepSteps.map((prep, pIdx) => {
                            const prepItem = getItem(prep.outputId);
                            const totalYield = prep.crafts * prep.outputCount;
                            return (
                              <React.Fragment key={`${st.key}-prep-${prep.outputId}-${pIdx}`}>
                                {pIdx > 0 && <ChevronRight size={14} className="psp-arrow" />}
                                <div
                                  className="psp-step-node"
                                  onClick={() => onOpenItem(prep.outputId)}
                                  title={`${prepItem?.name ?? prep.outputId}: ${prep.crafts}× ${lang === 'en' ? 'craft' : 'herstellen'}`}
                                >
                                  <ItemIcon id={prep.outputId} count={totalYield} size="s" />
                                  <div className="psp-node-info">
                                    <span className="psp-node-name">{prepItem?.name ?? `#${prep.outputId}`}</span>
                                    <div className="psp-node-meta">
                                      <span className="psp-node-crafts">
                                        {lang === 'en' ? `${prep.crafts}× craft` : `${prep.crafts}× herstellen`}
                                      </span>
                                      {prep.needsDiscovery && (
                                        <span className="discovery-tag-mini" title="Discovery recipe">
                                          {lang === 'en' ? 'Discovery' : 'Entdeckung'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}

                          <ChevronRight size={14} className="psp-arrow psp-arrow-final" />

                          {/* Target step product */}
                          <div
                            className="psp-step-node psp-target-node"
                            onClick={() => onOpenItem(st.recipe.outputId)}
                            title={`${outItem?.name ?? st.recipe.outputId}: ${st.crafts}× ${lang === 'en' ? 'craft' : 'herstellen'}`}
                          >
                            <ItemIcon id={st.recipe.outputId} count={st.crafts * (st.recipe.outputCount || 1)} size="s" />
                            <div className="psp-node-info">
                              <span className="psp-node-name font-semibold">{outItem?.name ?? `#${st.recipe.outputId}`}</span>
                              <span className="psp-node-target-label">
                                {t('crafting.prepTarget')} {lang === 'en' ? `${st.crafts}× craft` : `${st.crafts}× herstellen`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prominent Discovery Recipe Box */}
                    {st.needsDiscovery && (
                      <div className="planner-discovery-recipe-box">
                        <div className="pdr-header">
                          <div className="pdr-title">
                            <Sparkles size={13} className="text-amber-400" />
                            <span className="font-semibold">{t('crafting.discoveryRequired')}</span>
                            <span className="pdr-badge">{t('crafting.discoveryBonusPill')}</span>
                          </div>
                          <span className="pdr-subtitle">
                            {t('crafting.discoveryCombineInstruction')}
                          </span>
                        </div>

                        <div className="pdr-formula-row">
                          {st.recipe.ingredients.map((ing, idx) => {
                            const ingItem = getItem(ing.itemId);
                            const stock = account.stockMap.get(ing.itemId) ?? 0;
                            const hasEnough = stock >= ing.count;

                            return (
                              <React.Fragment key={ing.itemId}>
                                {idx > 0 && <span className="pdr-plus font-mono">+</span>}
                                <button
                                  type="button"
                                  className={`pdr-ing-chip ${account.hasStockData && hasEnough ? 'stock-ok' : ''}`}
                                  onClick={() => onOpenItem(ing.itemId)}
                                  title={`${ingItem?.name ?? ing.itemId} (${t('crafting.inStock')} ${stock})`}
                                >
                                  <ItemIcon id={ing.itemId} count={ing.count} size="s" />
                                  <div className="pdr-ing-text">
                                    <span className="pdr-ing-name">{ingItem?.name ?? `#${ing.itemId}`}</span>
                                    {account.hasStockData && (
                                      <span className={`pdr-ing-stock ${hasEnough ? 'ok' : 'missing'}`}>
                                        {hasEnough ? `✓ ${stock}` : `${stock}/${ing.count}`}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <div className="pdr-footer-note dim">
                          {st.crafts > 1
                            ? t('crafting.discoveryRepeatNote', { count: st.crafts - 1 })
                            : t('crafting.discoverySingleCraftNote')}
                        </div>
                      </div>
                    )}

                    <div className="step-ings-line">
                      <span className="ings-label dim">
                        {st.needsDiscovery
                          ? lang === 'en' ? 'Total Materials:' : 'Gesamtbedarf:'
                          : lang === 'en' ? 'Ingredients:' : 'Zutaten:'}
                      </span>
                      <div className="step-ings-wrap">
                        {st.ingredients.map((ing) => {
                          const it = getItem(ing.itemId);
                          return (
                            <button
                              key={ing.itemId}
                              className="step-ing-chip"
                              onClick={() => onOpenItem(ing.itemId)}
                              title={`${it?.name ?? ing.itemId}: ${fmtInt(ing.qty)}`}
                            >
                              <ItemIcon id={ing.itemId} count={ing.qty} size="s" />
                              <span className="ing-name">{it?.name ?? `#${ing.itemId}`}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="step-cost-col">
                    <Coin copper={st.cost} />
                    {st.unpricedCount > 0 && (
                      <span className="unpriced-note dim">+{st.unpricedCount} {lang === 'en' ? 'unpriced' : 'unbepreist'}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Gesamter Materialbedarf (Vollständig rekursiv aufgelöst) */}
      {activeTab === 'materials' && (
        <MaterialDemandTable
          materials={craftingPlanResult?.materials ?? []}
          onOpenItem={onOpenItem}
          onToggleProcurement={handleToggleProcurement}
          itemOverrides={itemOverrides}
          hasStockData={account.hasStockData}
        />
      )}

      {/* Tab 3: Herstellungskette (Hierarchische aufklappbare Baumstruktur) */}
      {activeTab === 'tree' && (
        <CraftingTreeView
          trees={craftingPlanResult?.trees ?? []}
          onOpenItem={onOpenItem}
          onToggleProcurement={handleToggleProcurement}
          hasStockData={account.hasStockData}
        />
      )}

      {/* Tab 4: Einkaufsliste (Kompakte Liste) */}
      {activeTab === 'shopping' && plan && (
        <div className="planner-shopping-wrap">
          <table className="gw2-dense-table shopping-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Icon</th>
                <th>Material</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{lang === 'en' ? 'Total Demand' : 'Gesamtbedarf'}</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{lang === 'en' ? 'In Stock' : 'Im Besitz'}</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{lang === 'en' ? 'Still Buy' : 'Noch kaufen'}</th>
                <th style={{ width: '120px', textAlign: 'right' }}>{lang === 'en' ? 'Unit Price' : 'Einzelpreis'}</th>
                <th style={{ width: '140px', textAlign: 'right' }}>{lang === 'en' ? 'Total Cost' : 'Gesamtkosten'}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(plan.purchases.entries()).map(([itemId, qty]) => {
                const item = getItem(itemId);
                const stock = account.stockMap.get(itemId) ?? 0;
                const missing = Math.max(0, qty - stock);
                const price = prices.map.get(itemId);
                const unit = price && price.sell > 0 ? price.sell : null;
                const totalLineCost = unit !== null ? unit * missing : null;

                return (
                  <tr key={itemId} className={missing === 0 ? 'row-complete' : ''}>
                    <td className="icon-cell">
                      <ItemIcon id={itemId} size="s" onClick={() => onOpenItem(itemId)} />
                    </td>
                    <td className="name-cell font-serif cursor-pointer" onClick={() => onOpenItem(itemId)}>
                      <span className={`r-${item?.rarity ?? 'Basic'}`}>{item?.name ?? `#${itemId}`}</span>
                    </td>
                    <td className="num font-mono">{fmtInt(qty)}</td>
                    <td className="num font-mono dim">{account.hasStockData ? fmtInt(stock) : '–'}</td>
                    <td className={`num font-mono ${missing > 0 ? 'bad font-bold' : 'good'}`}>
                      {account.hasStockData ? fmtInt(missing) : fmtInt(qty)}
                    </td>
                    <td className="num">
                      <Coin copper={unit} />
                    </td>
                    <td className="num">
                      <Coin copper={totalLineCost} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Zwischenprodukte */}
      {activeTab === 'intermediates' && plan && (
        <div className="planner-intermediates-wrap">
          {plan.intermediates.length === 0 ? (
            <div className="empty-panel">
              {lang === 'en' ? 'No intermediate components planned (either disabled or direct materials are cheaper).' : 'Keine Zwischenprodukte eingeplant (entweder deaktiviert oder direkte Materialien günstiger).'}
            </div>
          ) : (
            <div className="intermediates-grid">
              {plan.intermediates.map((im, i) => {
                const outItem = getItem(im.recipe.outputId);
                return (
                  <div key={i} className="intermediate-card">
                    <div className="im-header">
                      <ItemIcon id={im.recipe.outputId} size="m" onClick={() => onOpenItem(im.recipe.outputId)} />
                      <div className="im-info">
                        <span
                          className="im-name font-serif cursor-pointer"
                          onClick={() => onOpenItem(im.recipe.outputId)}
                        >
                          {outItem?.name ?? `#${im.recipe.outputId}`}
                        </span>
                        <span className="im-crafts font-mono">{lang === 'en' ? `${im.crafts}× craft` : `${im.crafts}× herstellen`}</span>
                      </div>
                    </div>
                    <div className="im-ingredients">
                      {im.recipe.ingredients.map((ing) => {
                        const it = getItem(ing.itemId);
                        return (
                          <div
                            key={ing.itemId}
                            className="im-ing-row cursor-pointer"
                            onClick={() => onOpenItem(ing.itemId)}
                          >
                            <ItemIcon id={ing.itemId} count={ing.count * im.crafts} size="s" />
                            <span className="dim">{it?.name ?? `#${ing.itemId}`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
