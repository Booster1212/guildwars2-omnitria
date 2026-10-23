import React, { useState, useMemo } from 'react';
import type { DisciplineId } from '../../domain/types';
import { planLevelRoute, collectPlannerItemIds } from '../../domain/levelPlanner';
import { useRecipeDb } from '../../data/gw2/recipes';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { useProgress, progressActions } from '../../data/progressStore';
import { getItem, useItems } from '../../data/gw2/items';
import { DISCIPLINE_DE, fmtInt, fmtQty } from '../common/labels';
import { Coin, ItemIcon, Notice, Check, ProgressBar } from '../common/ui';
import { AlertCircle, CheckCircle2, ChevronRight, Sliders, ShoppingBag, Layers, Wrench } from 'lucide-react';

interface LevelPlannerProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

export const LevelPlanner: React.FC<LevelPlannerProps> = ({ discipline, maxRank, onOpenItem }) => {
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();
  const progress = useProgress();

  const discProgress = progress.crafting[discipline];
  const charRating = account.data?.crafting?.[discipline]?.rating;

  // Initial and effective ranks
  const effectiveStart = discProgress?.start ?? charRating ?? 0;
  const targetRank = discProgress?.target ?? (discipline === 'Jeweler' ? 400 : Math.min(500, maxRank));

  const [fromRank, setFromRank] = useState<number>(effectiveStart);
  const [toRank, setToRank] = useState<number>(targetRank);
  const [allowDiscovery, setAllowDiscovery] = useState<boolean>(discProgress?.allowDiscovery ?? false);
  const [craftIntermediates, setCraftIntermediates] = useState<boolean>(discProgress?.craftIntermediates ?? true);
  const [activeTab, setActiveTab] = useState<'steps' | 'shopping' | 'intermediates'>('steps');

  // Keep progress store updated when options change
  const handleStartChange = (val: number) => {
    const num = Math.max(0, Math.min(maxRank, val));
    setFromRank(num);
    progressActions.setCrafting(discipline, { start: num });
  };

  const handleTargetChange = (val: number) => {
    const num = Math.max(fromRank, Math.min(maxRank, val));
    setToRank(num);
    progressActions.setCrafting(discipline, { target: num });
  };

  const handleToggleDiscovery = () => {
    const next = !allowDiscovery;
    setAllowDiscovery(next);
    progressActions.setCrafting(discipline, { allowDiscovery: next });
  };

  const handleToggleIntermediates = () => {
    const next = !craftIntermediates;
    setCraftIntermediates(next);
    progressActions.setCrafting(discipline, { craftIntermediates: next });
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

  // Ensure item details are loaded for plan items
  const allNeededItemIds = useMemo(() => {
    if (!plan) return [];
    const ids = new Set<number>();
    plan.steps.forEach((st) => {
      ids.add(st.recipe.outputId);
      st.ingredients.forEach((i) => ids.add(i.itemId));
    });
    for (const [id] of plan.purchases) ids.add(id);
    plan.intermediates.forEach((im) => ids.add(im.recipe.outputId));
    return Array.from(ids);
  }, [plan]);
  useItems(allNeededItemIds);

  const doneSteps = discProgress?.doneSteps ?? [];
  const completedStepsCount = useMemo(() => {
    if (!plan) return 0;
    return plan.steps.filter((st) => {
      if (charRating && charRating >= st.toRank) return true;
      return doneSteps.includes(st.key);
    }).length;
  }, [plan, charRating, doneSteps]);

  const progressFrac = plan && plan.steps.length > 0 ? completedStepsCount / plan.steps.length : 0;

  if (recipeDb.status === 'loading') {
    return (
      <div className="planner-loading-state">
        <div className="spinner" />
        <span className="font-serif">Lade offizielle Rezeptdatenbank der GW2-API …</span>
        <span className="dim">
          {recipeDb.progress.total > 0
            ? `${recipeDb.progress.done} von ${recipeDb.progress.total} Rezeptblöcken verarbeitet`
            : 'Initialisiere …'}
        </span>
      </div>
    );
  }

  if (recipeDb.status === 'error') {
    return (
      <Notice tone="error" title="Fehler beim Laden der Rezepte">
        {recipeDb.error}
        <button className="btn sm" onClick={() => recipeDb.reload()} style={{ marginTop: '8px' }}>
          Erneut versuchen
        </button>
      </Notice>
    );
  }

  return (
    <div className="level-planner-wrap">
      {/* Disclaimer Banner: Community XP Model */}
      <Notice tone="warn" title="Schätzung basierend auf dem Community-XP-Modell">
        Die offizielle GW2-API stellt weder Erfahrungswerte je Rezept noch den aktuellen XP-Fortschritt innerhalb eines
        Ranges bereit. Die berechneten Schrittanzahlen beruhen auf der etablierten GW2-Wiki-XP-Formel und stellen
        eine konservative <strong>Kostenschätzung</strong> dar.
      </Notice>

      {/* Configuration Controls Bar */}
      <div className="planner-controls-panel">
        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">Start-Rang:</label>
            <input
              type="number"
              className="gw2-num-input"
              min={0}
              max={maxRank - 1}
              value={fromRank}
              onChange={(e) => handleStartChange(Number(e.target.value))}
            />
            {charRating !== undefined && (
              <button
                className="btn-tiny"
                onClick={() => handleStartChange(charRating)}
                title={`Auf aktuellen Account-Charakter-Rang (${charRating}) zurücksetzen`}
              >
                Char ({charRating})
              </button>
            )}
          </div>

          <div className="control-group">
            <label className="control-label">Ziel-Rang:</label>
            <input
              type="number"
              className="gw2-num-input"
              min={fromRank + 1}
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
              label="Entdeckungsrezepte zulassen"
              title="Schließt auch Rezepte ohne automatisches Freischalt-Flag ein (erfordert ggf. Experimentieren an der Station)"
            />
            <Check
              checked={craftIntermediates}
              onChange={handleToggleIntermediates}
              label="Zwischenprodukte selbst herstellen"
              title="Berechnet Barren, Dübel etc. als eigene Herstellungen, wenn günstiger als der Sofortkauf"
            />
          </div>
        </div>

        {/* Plan Summary Bar */}
        {plan && (
          <div className="plan-stats-strip">
            <div className="stat-box">
              <span className="stat-label">Gesamtkosten (geschätzt):</span>
              <span className="stat-value">
                <Coin copper={plan.totalCost} />
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Herstellungen:</span>
              <span className="stat-value font-mono">
                {plan.totalCrafts} ({plan.steps.length} Schritte)
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Fortschritt:</span>
              <span className="stat-value font-mono">
                {completedStepsCount} / {plan.steps.length} erledigt
              </span>
            </div>
            {plan.unpricedItems.length > 0 && (
              <div className="stat-box warn">
                <span className="stat-label">Ohne Preis:</span>
                <span className="stat-value dim">
                  {plan.unpricedItems.length} Posten (Händler/Gebunden)
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
        <Notice tone="warn" title="Rezeptlücken im offiziellen Datenbestand">
          Für die Ränge{' '}
          {plan.gaps.map((g) => `${g.from}–${g.to}`).join(', ')} stehen keine automatisch erlernten Standardrezepte zur
          Verfügung. Aktiviere oben <em>„Entdeckungsrezepte zulassen“</em> oder schließe im Spiel Entdeckungen,
          Händler-Rezepte oder Dungeons ab.
        </Notice>
      )}

      {/* Subtabs: Schritte / Einkaufsliste / Zwischenprodukte */}
      <div className="planner-subtabs-row">
        <div className="subtabs-group">
          <button
            className={`subtab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            <Sliders size={13} />
            <span>Herstellungsschritte ({plan?.steps.length ?? 0})</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopping')}
          >
            <ShoppingBag size={13} />
            <span>Einkaufsliste ({plan?.purchases.size ?? 0})</span>
          </button>
          <button
            className={`subtab-btn ${activeTab === 'intermediates' ? 'active' : ''}`}
            onClick={() => setActiveTab('intermediates')}
          >
            <Layers size={13} />
            <span>Zwischenprodukte ({plan?.intermediates.length ?? 0})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Schritte */}
      {activeTab === 'steps' && plan && (
        <div className="planner-steps-list">
          {plan.steps.length === 0 ? (
            <div className="empty-panel">Keine Schritte für den gewählten Rangbereich erforderlich.</div>
          ) : (
            plan.steps.map((st, idx) => {
              const outItem = getItem(st.recipe.outputId);
              const isAutoDone = charRating !== undefined && charRating >= st.toRank;
              const isMarkedDone = doneSteps.includes(st.key) || isAutoDone;

              return (
                <div key={st.key} className={`planner-step-card ${isMarkedDone ? 'step-done' : ''}`}>
                  <div className="step-check-col">
                    <Check
                      checked={isMarkedDone}
                      onChange={() => progressActions.toggleStepDone(discipline, st.key)}
                      disabled={isAutoDone}
                      title={isAutoDone ? 'Bereits durch Account-Rang erreicht' : 'Als erledigt markieren'}
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
                        {outItem?.name ?? `Item #${st.recipe.outputId}`}
                      </span>
                      <span className="step-crafts-count font-mono">
                        {st.crafts}× herstellen
                      </span>
                      {st.needsDiscovery && (
                        <span className="discovery-tag" title="Muss an der Station entdeckt werden">
                          Entdeckung
                        </span>
                      )}
                    </div>

                    <div className="step-ings-line">
                      <span className="ings-label dim">Zutaten:</span>
                      <div className="step-ings-wrap">
                        {st.ingredients.map((ing) => {
                          const it = getItem(ing.itemId);
                          return (
                            <button
                              key={ing.itemId}
                              className="step-ing-chip"
                              onClick={() => onOpenItem(ing.itemId)}
                              title={`${it?.name ?? ing.itemId}: ${fmtInt(ing.qty)} benötigt`}
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
                      <span className="unpriced-note dim">+{st.unpricedCount} unbepreist</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Einkaufsliste */}
      {activeTab === 'shopping' && plan && (
        <div className="planner-shopping-wrap">
          <table className="gw2-dense-table shopping-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Icon</th>
                <th>Material</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Gesamtbedarf</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Im Besitz</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Noch kaufen</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Einzelpreis</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Gesamtkosten</th>
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
                      <span className={`r-${item?.rarity ?? 'Basic'}`}>{item?.name ?? `Gegenstand #${itemId}`}</span>
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

      {/* Tab 3: Zwischenprodukte */}
      {activeTab === 'intermediates' && plan && (
        <div className="planner-intermediates-wrap">
          {plan.intermediates.length === 0 ? (
            <div className="empty-panel">
              Keine Zwischenprodukte eingeplant (entweder deaktiviert oder direkte Materialien günstiger).
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
                        <span className="im-crafts font-mono">{im.crafts}× herstellen</span>
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
