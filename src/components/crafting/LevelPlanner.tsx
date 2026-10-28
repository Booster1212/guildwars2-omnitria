import React, { useState, useMemo } from 'react';
import type { DisciplineId } from '../../domain/types';
import {
  planLevelRoute,
  collectPlannerItemIds,
  groupStepsByStage,
  getNextRecommendedCraftingStep,
  getNextCraftingMilestone,
  buildCharacterProgressionPlan,
  CHARACTER_PROGRESSION_TASKS,
  type PlanStep,
  type EvaluatedProgressionTask,
} from '../../domain/levelPlanner';
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
import {
  useAccountState,
  getCharacterDisciplineInfo,
  getAccountAccessList,
} from '../../data/gw2/account';
import {
  useProgress,
  progressActions,
  type PlannerMode,
} from '../../data/progressStore';
import { getItem, useItems } from '../../data/gw2/items';
import { fmtInt, getDisciplineName } from '../common/labels';
import { Coin, ItemIcon, Notice, Check, ProgressBar } from '../common/ui';
import {
  ChevronRight,
  ChevronDown,
  Sliders,
  ShoppingBag,
  Layers,
  Sparkles,
  GitFork,
  Hammer,
  RotateCcw,
  Compass,
  Clock,
  CheckCircle2,
  SkipForward,
  PauseCircle,
  Undo2,
  ShieldCheck,
  BookmarkCheck,
  Lock,
  User,
  Target,
  Zap,
  Award,
} from 'lucide-react';
import { useTranslation, type TranslationKey } from '../../i18n';
import { MaterialDemandTable } from './MaterialDemandTable';
import { CraftingTreeView } from './CraftingTreeView';

interface LevelPlannerProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

const PLANNER_MODES: readonly PlannerMode[] = ['fast', 'balanced', 'completionist', 'goal'];

export const LevelPlanner: React.FC<LevelPlannerProps> = ({ discipline, maxRank, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();
  const progress = useProgress();

  const plannerPrefs = progress.plannerPreferences;
  const selectedCharacter = plannerPrefs?.selectedCharacter ?? null;
  const planningMode: PlannerMode = plannerPrefs?.mode ?? 'balanced';

  // Character-specific progress & discipline state
  const charProg = progressActions.getCharacterProgress(selectedCharacter);
  const lastUndo =
    charProg.undoStack.length > 0 ? charProg.undoStack[charProg.undoStack.length - 1] : null;
  const discProgress = progressActions.getCharacterDiscipline(selectedCharacter, discipline);
  const charDiscInfo = getCharacterDisciplineInfo(account.data, selectedCharacter, discipline);
  const charRating = charDiscInfo?.rating;
  const isCraftingApiVerified = Boolean(
    account.data &&
      ((selectedCharacter && charDiscInfo?.isCharacterSpecific) ||
        (!selectedCharacter && account.data.crafting?.[discipline] !== undefined)),
  );

  // Resolve selected character object from account API if available
  const selectedCharObj = useMemo(() => {
    const chars = account.data?.characters ?? [];
    if (!chars.length) return null;
    if (selectedCharacter) {
      return chars.find((c) => c.name === selectedCharacter) ?? null;
    }
    // If no specific character selected, find the character linked to this discipline or highest level character
    const linkedCharName = account.data?.crafting?.[discipline]?.character;
    if (linkedCharName) {
      const linked = chars.find((c) => c.name === linkedCharName);
      if (linked) return linked;
    }
    return [...chars].sort((a, b) => b.level - a.level)[0] ?? null;
  }, [account.data, selectedCharacter, discipline]);

  const effectiveCharLevel = selectedCharObj ? selectedCharObj.level : (charProg.manualLevel ?? 80);
  const isLevelApiVerified = Boolean(selectedCharObj);

  // Pull current crafting rank from character-specific manual override or API rating
  const effectiveStart =
    discProgress.start !== null && discProgress.start !== undefined
      ? discProgress.start
      : (charRating ?? 0);
  const defaultMaxTarget = discipline === 'Jeweler' ? 400 : Math.min(500, maxRank);
  const rawTarget = discProgress.target ?? defaultMaxTarget;
  const effectiveTarget =
    effectiveStart >= rawTarget && effectiveStart < maxRank
      ? Math.min(maxRank, Math.max(effectiveStart + 25, rawTarget < 400 ? 400 : maxRank))
      : Math.min(maxRank, rawTarget);

  const allowDiscovery = Boolean(discProgress.allowDiscovery);
  const craftIntermediates = Boolean(discProgress.craftIntermediates);

  const [activeTab, setActiveTab] = useState<
    'steps' | 'character' | 'materials' | 'tree' | 'intermediates' | 'shopping'
  >('steps');

  // Strategy for self-crafting vs. buying
  const [strategy, setStrategy] = useState<CraftingStrategy>(
    craftIntermediates ? 'all_craft' : 'all_buy',
  );
  const [itemOverrides, setItemOverrides] = useState<Map<number, ItemProcurement>>(new Map());
  const [onlyOpenSteps, setOnlyOpenSteps] = useState<boolean>(true);
  const [showSkippedSteps, setShowSkippedSteps] = useState<boolean>(false);

  // Collapsible state for stages and individual step/task details
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [expandedStepKeys, setExpandedStepKeys] = useState<Set<string>>(new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Sync strategy when persisted craftIntermediates changes
  React.useEffect(() => {
    if (strategy !== 'custom') {
      setStrategy(craftIntermediates ? 'all_craft' : 'all_buy');
    }
  }, [craftIntermediates]);

  // Handlers for updating persisted character-specific discipline settings
  const handleStartChange = (val: number) => {
    const num = Math.max(0, Math.min(maxRank, Number.isFinite(val) ? Math.round(val) : 0));
    const nextPatch: { start: number; target?: number } = { start: num };
    if (effectiveTarget <= num && num < maxRank) {
      nextPatch.target = Math.min(maxRank, num + 25);
    }
    progressActions.setCharacterDiscipline(selectedCharacter, discipline, nextPatch);
  };

  const handleTargetChange = (val: number) => {
    const minAllowed = effectiveStart < maxRank ? effectiveStart + 1 : maxRank;
    const num = Math.max(minAllowed, Math.min(maxRank, Number.isFinite(val) ? Math.round(val) : minAllowed));
    progressActions.setCharacterDiscipline(selectedCharacter, discipline, { target: num });
  };

  const handleToggleDiscovery = () => {
    progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
      allowDiscovery: !allowDiscovery,
    });
  };

  const handleToggleIntermediates = () => {
    const next = !craftIntermediates;
    progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
      craftIntermediates: next,
    });
    setStrategy(next ? 'all_craft' : 'all_buy');
    setItemOverrides(new Map());
  };

  const handleSelectMode = (mode: PlannerMode) => {
    progressActions.setPlanningMode(mode);
    // In Fast or Completionist mode, automatically enable discovery if not already enabled
    if ((mode === 'fast' || mode === 'completionist') && !allowDiscovery) {
      progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
        allowDiscovery: true,
      });
    }
  };

  const handleSetStrategy = (strat: CraftingStrategy) => {
    setStrategy(strat);
    if (strat !== 'custom') {
      setItemOverrides(new Map());
      progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
        craftIntermediates: strat === 'all_craft',
      });
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
        next.set(itemId, strategy === 'all_buy' ? 'craft' : 'buy');
      }
      return next;
    });
    setStrategy('custom');
  };

  const toggleStageCollapsed = (stageId: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const toggleStepExpanded = (stepKey: string) => {
    setExpandedStepKeys((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) next.delete(stepKey);
      else next.add(stepKey);
      return next;
    });
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Collect candidate items for price queries
  const candidateItemIds = useMemo(() => {
    if (recipeDb.status !== 'ready') return [];
    return collectPlannerItemIds(discipline, recipeDb.recipes, recipeDb.byOutput);
  }, [recipeDb.recipes, recipeDb.byOutput, recipeDb.status, discipline]);

  const prices = usePrices(candidateItemIds);

  const doneSteps = discProgress.doneSteps ?? [];
  const skippedSteps = discProgress.skippedSteps ?? [];
  const deferredSteps = discProgress.deferredSteps ?? [];

  // Compute crafting route with mode-aware prioritization
  const plan = useMemo(() => {
    if (recipeDb.status !== 'ready') return null;
    return planLevelRoute({
      discipline,
      fromRank: effectiveStart,
      toRank: effectiveTarget,
      recipes: recipeDb.recipes,
      recipesByOutput: recipeDb.byOutput,
      prices: prices.map,
      options: {
        allowDiscovery,
        craftIntermediates,
        knownRecipeIds: account.knownRecipeSet,
        mode: planningMode,
        stock: account.stockMap,
      },
    });
  }, [
    recipeDb.recipes,
    recipeDb.byOutput,
    recipeDb.status,
    discipline,
    effectiveStart,
    effectiveTarget,
    prices.map,
    allowDiscovery,
    craftIntermediates,
    account.knownRecipeSet,
    planningMode,
    account.stockMap,
  ]);

  // Stage groups & next recommended crafting step
  const stageGroups = useMemo(() => {
    if (!plan) return [];
    return groupStepsByStage(plan.steps, doneSteps, skippedSteps, deferredSteps);
  }, [plan, doneSteps, skippedSteps, deferredSteps]);

  const nextCraftingRecommendation = useMemo(() => {
    if (!plan) return null;
    return getNextRecommendedCraftingStep(
      plan.steps,
      effectiveStart,
      effectiveTarget,
      doneSteps,
      skippedSteps,
      deferredSteps,
    );
  }, [plan, effectiveStart, effectiveTarget, doneSteps, skippedSteps, deferredSteps]);

  const nextCraftMilestoneRank = useMemo(
    () => getNextCraftingMilestone(effectiveStart, effectiveTarget),
    [effectiveStart, effectiveTarget],
  );

  // Compute Character Leveling & Progression Plan (Lv 1–80 & Masteries)
  const accountAccess = useMemo(() => getAccountAccessList(account.data), [account.data]);

  const highestCraftingRank = useMemo(() => {
    if (charRating !== undefined) return charRating;
    const craftingMap = account.data?.crafting;
    if (!craftingMap) return effectiveStart;
    let maxR = effectiveStart;
    for (const entry of Object.values(craftingMap)) {
      if (entry && entry.rating > maxR) maxR = entry.rating;
    }
    return maxR;
  }, [account.data, charRating, effectiveStart]);

  const todayUtcStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const wizardsVaultDoneToday = false;

  const worldBossDoneToday = useMemo(() => {
    return Object.values(progress.dailyCompletedDates ?? {}).some((d) => d === todayUtcStr);
  }, [progress.dailyCompletedDates, todayUtcStr]);

  const trackedLegendaryCount = progress.tracked.length;

  const charProgressionPlan = useMemo(() => {
    return buildCharacterProgressionPlan({
      characterName: selectedCharacter ?? selectedCharObj?.name ?? null,
      characterLevel: effectiveCharLevel,
      isLevelApiVerified,
      characterProfession: selectedCharObj?.profession ?? null,
      craftingRank: highestCraftingRank,
      isCraftingApiVerified,
      equippedSlotCount: selectedCharObj?.equipment?.length ?? 0,
      accountAccess,
      wizardsVaultDoneToday,
      worldBossDoneToday,
      trackedLegendaryCount,
      mode: planningMode,
      targetMilestoneId: charProg.targetMilestoneId,
      completedTaskIds: charProg.completedTaskIds,
      skippedTaskIds: charProg.skippedTaskIds,
      deferredTaskIds: charProg.deferredTaskIds,
    });
  }, [
    selectedCharacter,
    selectedCharObj,
    effectiveCharLevel,
    isLevelApiVerified,
    highestCraftingRank,
    isCraftingApiVerified,
    accountAccess,
    wizardsVaultDoneToday,
    worldBossDoneToday,
    trackedLegendaryCount,
    planningMode,
    charProg.targetMilestoneId,
    charProg.completedTaskIds,
    charProg.skippedTaskIds,
    charProg.deferredTaskIds,
  ]);

  // Calculation targets for recursive material resolution (excludes completed/skipped when onlyOpenSteps is checked)
  const calculationTargets: TargetCraftItem[] = useMemo(() => {
    if (!plan) return [];
    const doneSet = new Set(doneSteps);
    const skipSet = new Set(skippedSteps);
    return plan.steps
      .filter((st) => {
        if (!onlyOpenSteps) return true;
        return !doneSet.has(st.key) && !skipSet.has(st.key);
      })
      .map((st) => ({
        itemId: st.recipe.outputId,
        count: st.crafts,
        recipe: st.recipe,
        stepKey: st.key,
        label: `Rang ${st.fromRank}–${st.toRank}`,
        needsDiscovery: st.needsDiscovery,
      }));
  }, [plan, onlyOpenSteps, doneSteps, skippedSteps]);

  // Discipline-specific recipe provider
  const recipeProvider = useMemo(() => {
    if (recipeDb.status !== 'ready') return { recipeFor: () => undefined };
    return createDisciplineRecipeProvider(recipeDb.byOutput, discipline, {
      allowDiscovery,
      knownRecipeIds: account.knownRecipeSet,
      maxRating: effectiveTarget,
    });
  }, [
    recipeDb.byOutput,
    recipeDb.status,
    discipline,
    allowDiscovery,
    account.knownRecipeSet,
    effectiveTarget,
  ]);

  // Complete recursive material requirements calculation
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

  // Crafting step status counts
  const stepCounts = useMemo(() => {
    if (!plan) return { total: 0, done: 0, skipped: 0, deferred: 0, open: 0 };
    const doneSet = new Set(doneSteps);
    const skipSet = new Set(skippedSteps);
    const deferSet = new Set(deferredSteps);
    let done = 0;
    let skipped = 0;
    let deferred = 0;
    let open = 0;
    for (const st of plan.steps) {
      if (doneSet.has(st.key)) done++;
      else if (skipSet.has(st.key)) skipped++;
      else if (deferSet.has(st.key)) {
        deferred++;
        open++;
      } else {
        open++;
      }
    }
    return { total: plan.steps.length, done, skipped, deferred, open };
  }, [plan, doneSteps, skippedSteps, deferredSteps]);

  const effectiveTotalSteps = Math.max(0, stepCounts.total - stepCounts.skipped);
  const progressFrac = effectiveTotalSteps > 0 ? Math.min(1, stepCounts.done / effectiveTotalSteps) : 0;

  if (recipeDb.status === 'loading') {
    return (
      <div className="planner-loading-state">
        <div className="spinner" />
        <span className="font-serif">{t('crafting.loadingRecipes')}</span>
        <span className="dim">
          {recipeDb.progress.total > 0
            ? t('crafting.loadingProgress', {
                done: recipeDb.progress.done,
                total: recipeDb.progress.total,
              })
            : t('crafting.initializing')}
        </span>
      </div>
    );
  }

  if (recipeDb.status === 'error') {
    return (
      <Notice tone="error" title={t('crafting.errorLoadingRecipes')}>
        {recipeDb.error}
        <button className="btn sm" onClick={() => recipeDb.reload()} style={{ marginTop: '8px' }}>
          {t('crafting.tryAgain')}
        </button>
      </Notice>
    );
  }

  const displayCost = craftingPlanResult ? craftingPlanResult.totals.totalCost : (plan?.totalCost ?? 0);
  const displayCrafts = craftingPlanResult ? craftingPlanResult.totals.totalCraftRuns : (plan?.totalCrafts ?? 0);
  const discName = getDisciplineName(discipline, lang);

  // Determine whether the Next Action spotlight should focus on the Character Progression task or Crafting Step
  const showCharTaskInSpotlight =
    activeTab === 'character' || (!nextCraftingRecommendation && charProgressionPlan.recommendedNextTask !== null);
  const spotlightCharTask: EvaluatedProgressionTask | null = charProgressionPlan.recommendedNextTask;
  const spotlightCraftStep: PlanStep | null = nextCraftingRecommendation?.step ?? null;

  return (
    <div className="level-planner-wrap">
      {/* Character Context & Planning Mode Bar */}
      <div className="planner-context-bar">
        <div className="planner-char-selector-group">
          <label className="control-label">
            <User size={12} className="inline mr-1 text-amber-400" />
            {t('planner.char.selectLabel')}
          </label>
          <select
            className="gw2-select planner-char-select"
            value={selectedCharacter ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              progressActions.setSelectedCharacter(val ? val : null);
            }}
          >
            <option value="">{t('planner.char.manualGuest')}</option>
            {(account.data?.characters ?? []).map((ch) => {
              const chDisc = ch.crafting.find((c) => c.discipline === discipline);
              const discSuffix = chDisc ? ` · ${discName} ${chDisc.rating}` : '';
              return (
                <option key={ch.name} value={ch.name}>
                  {ch.name} (Lv {ch.level} {ch.profession}{discSuffix})
                </option>
              );
            })}
          </select>

          {!selectedCharObj && (
            <div className="planner-manual-level-group">
              <label className="control-label">{t('planner.char.manualLevelLabel')}</label>
              <input
                type="number"
                className="gw2-num-input sm"
                min={1}
                max={80}
                value={effectiveCharLevel}
                onChange={(e) =>
                  progressActions.setCharacterManualLevel(selectedCharacter, Number(e.target.value))
                }
              />
            </div>
          )}

          {/* Verification Status Badge */}
          {isLevelApiVerified ? (
            <span
              className="planner-verify-badge api-verified"
              title={t('planner.verify.apiVerifiedTip')}
            >
              <ShieldCheck size={11} />
              <span>{t('planner.verify.apiVerified')}</span>
            </span>
          ) : (
            <span
              className="planner-verify-badge local-tracked"
              title={t('planner.verify.localTrackedTip')}
            >
              <BookmarkCheck size={11} />
              <span>{t('planner.verify.localTracked')}</span>
            </span>
          )}
        </div>

        {/* Planning Modes Selector */}
        <div className="planner-mode-selector-group">
          <span className="control-label">{t('planner.mode.label')}</span>
          <div className="planner-mode-pills">
            {PLANNER_MODES.map((m) => {
              const isAct = planningMode === m;
              const labelKey = `planner.mode.${m}` as TranslationKey;
              const descKey = `planner.mode.${m}Desc` as TranslationKey;
              return (
                <button
                  key={m}
                  type="button"
                  className={`planner-mode-pill ${isAct ? 'active' : ''}`}
                  onClick={() => handleSelectMode(m)}
                  title={t(descKey)}
                >
                  {m === 'fast' && <Zap size={11} />}
                  {m === 'balanced' && <Compass size={11} />}
                  {m === 'completionist' && <Award size={11} />}
                  {m === 'goal' && <Target size={11} />}
                  <span>{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mode Description & Honest Data / Access State Sub-bar */}
      <div className="planner-mode-hint-bar">
        <span className="mode-desc-text">
          {t(`planner.mode.${planningMode}Desc` as TranslationKey)}
        </span>
        <div className="planner-access-meta">
          {!account.data && (
            <span className="unknown-api-inline-hint dim">
              {t('planner.verify.unknownApiNotice')}
            </span>
          )}
          {charProgressionPlan.accessStatusSummary === 'free_to_play' && (
            <span className="f2p-access-hint text-amber-300">
              {t('planner.verify.f2pAccessNotice')}
            </span>
          )}
          {charProgressionPlan.ownedExpansions.length > 0 && (
            <span className="owned-exp-hint dim">
              {t('planner.verify.expansionsOwned', {
                list: charProgressionPlan.ownedExpansions.join(', '),
              })}
            </span>
          )}
        </div>
      </div>

      {/* PROGRESSION OVERVIEW & PROMINENT NEXT RECOMMENDED ACTION */}
      <div className="planner-next-action-overview">
        <div className="pnao-metrics-col">
          <div className="pnao-metric-row">
            <div className="pnao-metric-block">
              <span className="pnao-metric-label">{t('planner.overview.charLevel')}</span>
              <div className="pnao-metric-val font-serif">
                <span>Lv {effectiveCharLevel}</span>
                {selectedCharObj && (
                  <span className="pnao-char-sub dim">{selectedCharObj.name}</span>
                )}
              </div>
              <span className="pnao-milestone-sub" title={t(charProgressionPlan.nextMilestone.benefitKey as TranslationKey)}>
                {t('planner.overview.nextCharMilestone', {
                  level: charProgressionPlan.nextMilestone.level,
                })}
                : {t(charProgressionPlan.nextMilestone.titleKey as TranslationKey)}
              </span>
            </div>

            <div className="pnao-metric-block">
              <span className="pnao-metric-label">{t('planner.overview.craftingRank')}</span>
              <div className="pnao-metric-val font-mono">
                <span>
                  {effectiveStart} / {effectiveTarget}
                </span>
                {isCraftingApiVerified && (
                  <span className="pnao-mini-verified" title={t('planner.verify.apiVerifiedTip')}>
                    API
                  </span>
                )}
              </div>
              <span className="pnao-milestone-sub">
                {t('planner.overview.nextCraftMilestone', { rank: nextCraftMilestoneRank })}
              </span>
            </div>
          </div>

          <div className="pnao-overall-progress-block">
            <div className="pnao-progress-header">
              <span className="pnao-metric-label">{t('planner.overview.overallProgress')}</span>
              <span className="pnao-summary-counts font-mono">
                {activeTab === 'character'
                  ? t('planner.overview.remainingSummary', {
                      open: charProgressionPlan.counts.remaining,
                      done: charProgressionPlan.counts.completed,
                      skipped: charProgressionPlan.counts.skipped,
                      deferred: charProgressionPlan.counts.deferred,
                    })
                  : t('planner.overview.remainingSummary', {
                      open: stepCounts.open,
                      done: stepCounts.done,
                      skipped: stepCounts.skipped,
                      deferred: stepCounts.deferred,
                    })}
              </span>
            </div>
            <ProgressBar
              value={
                activeTab === 'character'
                  ? charProgressionPlan.counts.total > 0
                    ? charProgressionPlan.counts.completed / charProgressionPlan.counts.total
                    : 0
                  : progressFrac
              }
              tone="gold"
              slim
            />
          </div>
        </div>

        {/* Prominent Next Recommended Activity Card */}
        <div className="pnao-spotlight-col">
          <div className="pnao-spotlight-header">
            <span className="pnao-next-badge">
              <Zap size={12} />
              <span>{t('planner.next.badge')}</span>
            </span>

            {lastUndo && (
              <button
                type="button"
                className="btn-tiny planner-undo-btn"
                onClick={() => progressActions.undoLastPlannerAction()}
                title={t('planner.action.undo')}
              >
                <Undo2 size={11} />
                <span>{t('planner.action.undo')}</span>
              </button>
            )}
          </div>

          {showCharTaskInSpotlight && spotlightCharTask ? (
            <div className="pnao-spotlight-body">
              <div className="pnao-spotlight-main">
                <div className="pnao-spotlight-title-line">
                  <span className="pnao-prefix dim">
                    {t('planner.next.charTaskPrefix', {
                      level: spotlightCharTask.definition.minLevel,
                    })}
                  </span>
                  <span className="pnao-title font-serif">
                    {t(spotlightCharTask.definition.titleKey as TranslationKey)}
                  </span>
                  <span className={`planner-cat-pill cat-${spotlightCharTask.definition.category}`}>
                    {t(`planner.cat.${spotlightCharTask.definition.category}` as TranslationKey)}
                  </span>
                  {spotlightCharTask.status === 'deferred' && (
                    <span className="planner-status-pill deferred">
                      {t('planner.status.deferred')}
                    </span>
                  )}
                </div>

                <div className="pnao-reason-line">
                  <span className="pnao-reason-label">{t('planner.next.whyRecommended')}</span>
                  <span className="pnao-reason-text">
                    {t(spotlightCharTask.reasonKey as TranslationKey)}
                  </span>
                </div>

                <div className="pnao-meta-line">
                  {spotlightCharTask.definition.effortMinutes !== null && (
                    <span className="pnao-effort-pill">
                      <Clock size={11} />
                      <span>
                        {t('planner.next.estimatedEffort', {
                          min: spotlightCharTask.definition.effortMinutes,
                        })}
                      </span>
                    </span>
                  )}
                  <span className="pnao-benefit-text">
                    <strong>{t('planner.next.expectedBenefit')}</strong>{' '}
                    {t(spotlightCharTask.definition.benefitKey as TranslationKey)}
                  </span>
                </div>
              </div>

              <div className="pnao-spotlight-actions">
                <button
                  type="button"
                  className="btn sm primary-gold"
                  onClick={() =>
                    progressActions.setTaskStatus(
                      selectedCharacter,
                      spotlightCharTask.definition.id,
                      'completed',
                    )
                  }
                >
                  <CheckCircle2 size={13} />
                  <span>{t('planner.action.complete')}</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    progressActions.setTaskStatus(
                      selectedCharacter,
                      spotlightCharTask.definition.id,
                      'deferred',
                    )
                  }
                >
                  <PauseCircle size={13} />
                  <span>{t('planner.action.defer')}</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    progressActions.setTaskStatus(
                      selectedCharacter,
                      spotlightCharTask.definition.id,
                      'skipped',
                    )
                  }
                >
                  <SkipForward size={13} />
                  <span>{t('planner.action.skip')}</span>
                </button>
              </div>
            </div>
          ) : spotlightCraftStep && nextCraftingRecommendation ? (
            <div className="pnao-spotlight-body">
              <div className="pnao-spotlight-icon">
                <ItemIcon
                  id={spotlightCraftStep.recipe.outputId}
                  size="m"
                  onClick={() => onOpenItem(spotlightCraftStep.recipe.outputId)}
                />
              </div>

              <div className="pnao-spotlight-main">
                <div className="pnao-spotlight-title-line">
                  <span className="pnao-prefix font-mono">
                    {t('planner.next.craftingPrefix', {
                      from: spotlightCraftStep.fromRank,
                      to: spotlightCraftStep.toRank,
                    })}
                  </span>
                  <span
                    className="pnao-title font-serif cursor-pointer"
                    onClick={() => onOpenItem(spotlightCraftStep.recipe.outputId)}
                  >
                    {getItem(spotlightCraftStep.recipe.outputId)?.name ??
                      `#${spotlightCraftStep.recipe.outputId}`}
                  </span>
                  <span className="step-crafts-count font-mono">
                    {t('crafting.craftRunsBadge', { count: spotlightCraftStep.crafts })}
                  </span>
                  {spotlightCraftStep.needsDiscovery && (
                    <span className="discovery-tag">{t('crafting.discoveryBadge')}</span>
                  )}
                  {nextCraftingRecommendation.isDeferred && (
                    <span className="planner-status-pill deferred">
                      {t('planner.status.deferred')}
                    </span>
                  )}
                </div>

                <div className="pnao-reason-line">
                  <span className="pnao-reason-label">{t('planner.next.whyRecommended')}</span>
                  <span className="pnao-reason-text">
                    {t(nextCraftingRecommendation.reasonKey as TranslationKey)}
                  </span>
                </div>

                <div className="pnao-meta-line">
                  {spotlightCraftStep.estimatedMinutes && (
                    <span className="pnao-effort-pill">
                      <Clock size={11} />
                      <span>
                        {t('planner.next.estimatedEffort', {
                          min: spotlightCraftStep.estimatedMinutes,
                        })}
                      </span>
                    </span>
                  )}
                  <span className="pnao-benefit-text">
                    <strong>{t('planner.next.expectedBenefit')}</strong>{' '}
                    {t('planner.next.benefitRanks', {
                      ranks: spotlightCraftStep.toRank - spotlightCraftStep.fromRank,
                      from: spotlightCraftStep.fromRank,
                      to: spotlightCraftStep.toRank,
                    })}
                    {spotlightCraftStep.expectedBenefit?.reachesMilestone
                      ? ` · ${t('planner.next.benefitMilestone', {
                          milestone: spotlightCraftStep.expectedBenefit.reachesMilestone,
                        })}`
                      : ''}
                  </span>
                  <span className="pnao-cost-inline">
                    <Coin copper={spotlightCraftStep.cost} />
                  </span>
                </div>
              </div>

              <div className="pnao-spotlight-actions">
                <button
                  type="button"
                  className="btn sm primary-gold"
                  onClick={() =>
                    progressActions.setStepStatus(
                      selectedCharacter,
                      discipline,
                      spotlightCraftStep.key,
                      'completed',
                    )
                  }
                >
                  <CheckCircle2 size={13} />
                  <span>{t('planner.action.complete')}</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    progressActions.setStepStatus(
                      selectedCharacter,
                      discipline,
                      spotlightCraftStep.key,
                      'deferred',
                    )
                  }
                >
                  <PauseCircle size={13} />
                  <span>{t('planner.action.defer')}</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    progressActions.setStepStatus(
                      selectedCharacter,
                      discipline,
                      spotlightCraftStep.key,
                      'skipped',
                    )
                  }
                >
                  <SkipForward size={13} />
                  <span>{t('planner.action.skip')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pnao-all-done-box">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <div>
                <div className="font-serif font-semibold">{t('planner.next.allDoneTitle')}</div>
                <div className="dim text-xs">{t('planner.next.allDoneDesc')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer Banner: Community XP Model */}
      <Notice tone="warn" title={t('crafting.xpModelTitle')}>
        {t('crafting.xpModelDesc')}
      </Notice>

      {/* Max Rank Notice if character already maxed */}
      {effectiveStart >= maxRank && (
        <Notice tone="info" title={t('crafting.maxRankReachedTitle')}>
          {t('crafting.maxRankReachedDesc', { from: effectiveStart, max: maxRank })}
          <div style={{ marginTop: '8px' }}>
            <button type="button" className="btn sm" onClick={() => handleStartChange(0)}>
              {t('crafting.showRouteFromZero')}
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
              value={effectiveStart}
              onChange={(e) => handleStartChange(Number(e.target.value))}
            />
            {charRating !== undefined && effectiveStart !== charRating && (
              <button
                type="button"
                className="btn-tiny"
                onClick={() => handleStartChange(charRating)}
                title={t('crafting.resetToCharRank', { rank: charRating })}
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
              min={effectiveStart < maxRank ? effectiveStart + 1 : maxRank}
              max={maxRank}
              value={effectiveTarget}
              onChange={(e) => handleTargetChange(Number(e.target.value))}
            />
            <div className="quick-targets">
              {maxRank >= 400 && (
                <button
                  type="button"
                  className={`btn-tiny ${effectiveTarget === 400 ? 'active' : ''}`}
                  onClick={() => handleTargetChange(400)}
                >
                  400
                </button>
              )}
              {maxRank >= 500 && (
                <button
                  type="button"
                  className={`btn-tiny ${effectiveTarget === 500 ? 'active' : ''}`}
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
              title={t('crafting.discoveryTooltip')}
            />
            <Check
              checked={craftIntermediates}
              onChange={handleToggleIntermediates}
              label={t('crafting.craftIntermediates')}
              title={t('crafting.strategyCraftAllHint')}
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
              <span className="stat-label">{t('crafting.craftsCount')}</span>
              <span className="stat-value font-mono">
                {displayCrafts} ({plan.steps.length} {t('crafting.stepsWord')})
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('crafting.progressLabel')}</span>
              <span className="stat-value font-mono">
                {stepCounts.done} / {effectiveTotalSteps} {t('crafting.doneWord')}
              </span>
              {(stepCounts.done > 0 || stepCounts.skipped > 0 || stepCounts.deferred > 0) && (
                <button
                  type="button"
                  className="btn-tiny"
                  onClick={() => progressActions.resetDisciplineCheckmarks(discipline, selectedCharacter)}
                  title={t('crafting.resetCheckmarksTitle')}
                  style={{ marginLeft: '6px' }}
                >
                  <RotateCcw size={10} className="mr-1 inline" />
                  {t('crafting.resetCheckmarks')}
                </button>
              )}
            </div>
            {stepCounts.skipped > 0 && (
              <div className="stat-box">
                <button
                  type="button"
                  className={`btn-tiny ${showSkippedSteps ? 'active' : ''}`}
                  onClick={() => setShowSkippedSteps(!showSkippedSteps)}
                >
                  {t('planner.filter.showSkipped', { count: stepCounts.skipped })}
                </button>
              </div>
            )}
            {craftingPlanResult && craftingPlanResult.totals.unpricedCount > 0 && (
              <div className="stat-box warn">
                <span className="stat-label">{t('crafting.unpricedLabel')}</span>
                <span className="stat-value dim">
                  {craftingPlanResult.totals.unpricedCount} {t('crafting.unpricedItemsNote')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan Gaps Warning if any */}
      {plan && plan.gaps.length > 0 && (
        <Notice tone="warn" title={t('crafting.recipeGapsTitle')}>
          {t('crafting.recipeGapsDesc', {
            gaps: plan.gaps.map((g) => `${g.from}–${g.to}`).join(', '),
          })}
        </Notice>
      )}

      {/* Strategy bar: Self-crafting vs. Buying */}
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
              title={t('crafting.onlyOpenSteps')}
            />
          </div>
        </div>

        <div className="strategy-hint">
          {strategy === 'all_craft' && t('crafting.strategyCraftAllHint')}
          {strategy === 'all_buy' && t('crafting.strategyBuyAllHint')}
          {strategy === 'custom' && t('crafting.strategyCustomHint')}
        </div>
      </div>

      {/* Subtabs: Steps / Character Progression / Total Material Demand / Crafting Tree / Shopping List / Intermediates */}
      <div className="planner-subtabs-row">
        <div className="subtabs-group">
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            <Sliders size={13} />
            <span>
              {t('crafting.stepsTab')} ({plan?.steps.length ?? 0})
            </span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'character' ? 'active' : ''}`}
            onClick={() => setActiveTab('character')}
          >
            <Compass size={13} />
            <span>
              {t('planner.tab.charProgression')} ({charProgressionPlan.counts.completed}/
              {charProgressionPlan.counts.total})
            </span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <Layers size={13} />
            <span>
              {t('crafting.materialsTab')} ({craftingPlanResult?.materials.length ?? 0})
            </span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
          >
            <GitFork size={13} />
            <span>{t('crafting.treeTab')}</span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopping')}
          >
            <ShoppingBag size={13} />
            <span>
              {t('crafting.shoppingTab')} ({plan?.purchases.size ?? 0})
            </span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'intermediates' ? 'active' : ''}`}
            onClick={() => setActiveTab('intermediates')}
          >
            <Sparkles size={13} />
            <span>
              {t('crafting.intermediatesTab')} ({plan?.intermediates.length ?? 0})
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Grouped Crafting Steps */}
      {activeTab === 'steps' && plan && (
        <div className="planner-steps-list">
          {plan.steps.length === 0 ? (
            <div className="empty-panel">{t('crafting.noStepsRequired')}</div>
          ) : (
            stageGroups.map((stage) => {
              const isStageCollapsed = collapsedStages.has(stage.id);
              const visibleSteps = stage.steps.filter(
                (st) => showSkippedSteps || !skippedSteps.includes(st.key),
              );
              if (visibleSteps.length === 0) return null;

              const stageTotalActive = Math.max(0, stage.steps.length - stage.skippedCount);
              const stageFrac =
                stageTotalActive > 0 ? Math.min(1, stage.completedCount / stageTotalActive) : 1;

              return (
                <div key={stage.id} className="planner-stage-group">
                  <div
                    className="planner-stage-header"
                    onClick={() => toggleStageCollapsed(stage.id)}
                  >
                    <div className="psh-left">
                      {isStageCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span className="psh-title font-serif">
                        {t(stage.labelKey as TranslationKey)}
                      </span>
                      <span className="psh-range font-mono dim">
                        ({stage.fromRank} → {stage.toRank})
                      </span>
                    </div>
                    <div className="psh-right">
                      <span className="psh-counts font-mono">
                        {stage.completedCount} / {stageTotalActive} {t('crafting.doneWord')}
                      </span>
                      <div className="psh-progress-wrap">
                        <ProgressBar
                          value={stageFrac}
                          tone={stageFrac >= 1 ? 'gold' : 'green'}
                          slim
                        />
                      </div>
                    </div>
                  </div>

                  {!isStageCollapsed && (
                    <div className="planner-stage-steps">
                      {visibleSteps.map((st) => {
                        const outItem = getItem(st.recipe.outputId);
                        const isMarkedDone = doneSteps.includes(st.key);
                        const isSkipped = skippedSteps.includes(st.key);
                        const isDeferred = deferredSteps.includes(st.key);
                        const isNextRecommended =
                          nextCraftingRecommendation?.step.key === st.key;
                        const isDetailsExpanded =
                          expandedStepKeys.has(st.key) || (isNextRecommended && !isMarkedDone);

                        return (
                          <div
                            key={st.key}
                            className={`planner-step-card ${isMarkedDone ? 'step-done' : ''} ${
                              isSkipped ? 'step-skipped' : ''
                            } ${isDeferred ? 'step-deferred' : ''} ${
                              isNextRecommended ? 'step-recommended-next' : ''
                            }`}
                          >
                            <div className="step-check-col">
                              <Check
                                checked={isMarkedDone}
                                onChange={() =>
                                  progressActions.setStepStatus(
                                    selectedCharacter,
                                    discipline,
                                    st.key,
                                    isMarkedDone ? 'open' : 'completed',
                                  )
                                }
                                title={t('crafting.toggleStepDone')}
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
                                  {t('crafting.craftRunsBadge', { count: st.crafts })}
                                </span>
                                {st.needsDiscovery && (
                                  <span
                                    className="discovery-tag"
                                    title={t('crafting.discoveryTooltip')}
                                  >
                                    {t('crafting.discoveryBadge')}
                                  </span>
                                )}
                                {isNextRecommended && (
                                  <span className="planner-status-pill next-rec">
                                    {t('planner.next.badge')}
                                  </span>
                                )}
                                {isMarkedDone && (
                                  <span
                                    className="planner-status-pill completed"
                                    title={t('planner.verify.localTrackedTip')}
                                  >
                                    {t('planner.status.completed')} · {t('planner.verify.localTracked')}
                                  </span>
                                )}
                                {isSkipped && (
                                  <span className="planner-status-pill skipped">
                                    {t('planner.status.skipped')}
                                  </span>
                                )}
                                {isDeferred && (
                                  <span className="planner-status-pill deferred">
                                    {t('planner.status.deferred')}
                                  </span>
                                )}
                              </div>

                              {/* Reason & Prerequisites Summary Row */}
                              <div className="step-meta-reason-row">
                                {st.reasonKey && (
                                  <span className="step-reason-inline dim">
                                    {t(st.reasonKey as TranslationKey)}
                                  </span>
                                )}
                                <div className="step-prereq-pills">
                                  {st.prerequisites && (
                                    <span className="prereq-chip">
                                      {t('planner.prereq.minRank', {
                                        rank: st.prerequisites.minRank,
                                      })}
                                    </span>
                                  )}
                                  {st.needsDiscovery && (
                                    <span className="prereq-chip discovery">
                                      {t('planner.prereq.discoveryStation')}
                                    </span>
                                  )}
                                  {st.prepSteps && st.prepSteps.length > 0 && (
                                    <span className="prereq-chip prep">
                                      {t('planner.prereq.prepComponents', {
                                        count: st.prepSteps.length,
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Step Actions & Expand Toggle */}
                              <div className="step-inline-actions-bar">
                                {!isMarkedDone && !isSkipped && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-tiny"
                                      onClick={() =>
                                        progressActions.setStepStatus(
                                          selectedCharacter,
                                          discipline,
                                          st.key,
                                          'completed',
                                        )
                                      }
                                    >
                                      <CheckCircle2 size={10} />
                                      <span>{t('planner.action.complete')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-tiny"
                                      onClick={() =>
                                        progressActions.setStepStatus(
                                          selectedCharacter,
                                          discipline,
                                          st.key,
                                          isDeferred ? 'open' : 'deferred',
                                        )
                                      }
                                    >
                                      <PauseCircle size={10} />
                                      <span>
                                        {isDeferred
                                          ? t('planner.action.restore')
                                          : t('planner.action.defer')}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-tiny"
                                      onClick={() =>
                                        progressActions.setStepStatus(
                                          selectedCharacter,
                                          discipline,
                                          st.key,
                                          'skipped',
                                        )
                                      }
                                    >
                                      <SkipForward size={10} />
                                      <span>{t('planner.action.skip')}</span>
                                    </button>
                                  </>
                                )}
                                {isSkipped && (
                                  <button
                                    type="button"
                                    className="btn-tiny"
                                    onClick={() =>
                                      progressActions.setStepStatus(
                                        selectedCharacter,
                                        discipline,
                                        st.key,
                                        'open',
                                      )
                                    }
                                  >
                                    <RotateCcw size={10} />
                                    <span>{t('planner.action.restore')}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-tiny details-toggle-btn"
                                  onClick={() => toggleStepExpanded(st.key)}
                                >
                                  {isDetailsExpanded ? (
                                    <>
                                      <ChevronDown size={10} />
                                      <span>{t('planner.action.detailsCollapse')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight size={10} />
                                      <span>{t('planner.action.detailsExpand')}</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Collapsible Details Section */}
                              {isDetailsExpanded && (
                                <div className="step-collapsible-details">
                                  {/* Craft beforehand (preparation chain) */}
                                  {st.prepSteps && st.prepSteps.length > 0 && (
                                    <div className="planner-step-prep-box">
                                      <div className="psp-header">
                                        <div className="psp-title">
                                          <Hammer size={13} className="text-emerald-400" />
                                          <span className="font-semibold">
                                            {t('crafting.prepHeader')}
                                          </span>
                                          <span className="psp-badge">
                                            {t('crafting.prepBadge', {
                                              count: st.prepSteps.length,
                                            })}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="psp-chain-row">
                                        {st.prepSteps.map((prep, pIdx) => {
                                          const prepItem = getItem(prep.outputId);
                                          const totalYield = prep.crafts * prep.outputCount;
                                          return (
                                            <React.Fragment
                                              key={`${st.key}-prep-${prep.outputId}-${pIdx}`}
                                            >
                                              {pIdx > 0 && (
                                                <ChevronRight size={14} className="psp-arrow" />
                                              )}
                                              <div className="psp-prep-card">
                                                <div
                                                  className="psp-step-node"
                                                  onClick={() => onOpenItem(prep.outputId)}
                                                  title={`${prepItem?.name ?? prep.outputId}: ${t(
                                                    'crafting.craftRunsBadge',
                                                    { count: prep.crafts },
                                                  )}`}
                                                >
                                                  <ItemIcon
                                                    id={prep.outputId}
                                                    count={totalYield}
                                                    size="s"
                                                  />
                                                  <div className="psp-node-info">
                                                    <span className="psp-node-name">
                                                      {prepItem?.name ?? `#${prep.outputId}`}
                                                    </span>
                                                    <div className="psp-node-meta">
                                                      <span className="psp-node-crafts">
                                                        {t('crafting.craftRunsBadge', {
                                                          count: prep.crafts,
                                                        })}
                                                      </span>
                                                      {prep.needsDiscovery && (
                                                        <span
                                                          className="discovery-tag-mini"
                                                          title={t('crafting.discoveryTooltip')}
                                                        >
                                                          {t('crafting.discoveryBadge')}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Sub-ingredients for this intermediate component */}
                                                {prep.ingredients &&
                                                  prep.ingredients.length > 0 && (
                                                    <div className="psp-sub-ingredients">
                                                      <span className="psp-sub-label dim">
                                                        {t('crafting.prepSubRecipe')}
                                                      </span>
                                                      <div className="psp-sub-chips">
                                                        {prep.ingredients.map((pIng) => {
                                                          const ingItem = getItem(pIng.itemId);
                                                          const stock =
                                                            account.stockMap.get(pIng.itemId) ?? 0;
                                                          const hasEnough = stock >= pIng.qty;
                                                          return (
                                                            <button
                                                              key={pIng.itemId}
                                                              type="button"
                                                              className={`psp-sub-chip ${
                                                                account.hasStockData && hasEnough
                                                                  ? 'stock-ok'
                                                                  : ''
                                                              }`}
                                                              onClick={() =>
                                                                onOpenItem(pIng.itemId)
                                                              }
                                                              title={`${
                                                                ingItem?.name ?? pIng.itemId
                                                              }: ${pIng.qty}`}
                                                            >
                                                              <ItemIcon
                                                                id={pIng.itemId}
                                                                count={pIng.qty}
                                                                size="s"
                                                              />
                                                              <span className="psp-sub-name">
                                                                {ingItem?.name ?? `#${pIng.itemId}`}
                                                              </span>
                                                              {account.hasStockData && (
                                                                <span
                                                                  className={`psp-sub-stock ${
                                                                    hasEnough ? 'ok' : 'missing'
                                                                  }`}
                                                                >
                                                                  {hasEnough
                                                                    ? `✓ ${stock}`
                                                                    : `${stock}/${pIng.qty}`}
                                                                </span>
                                                              )}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                              </div>
                                            </React.Fragment>
                                          );
                                        })}

                                        <ChevronRight
                                          size={14}
                                          className="psp-arrow psp-arrow-final"
                                        />

                                        {/* Target step product */}
                                        <div
                                          className="psp-step-node psp-target-node"
                                          onClick={() => onOpenItem(st.recipe.outputId)}
                                          title={`${outItem?.name ?? st.recipe.outputId}: ${t(
                                            'crafting.craftRunsBadge',
                                            { count: st.crafts },
                                          )}`}
                                        >
                                          <ItemIcon
                                            id={st.recipe.outputId}
                                            count={st.crafts * (st.recipe.outputCount || 1)}
                                            size="s"
                                          />
                                          <div className="psp-node-info">
                                            <span className="psp-node-name font-semibold">
                                              {outItem?.name ?? `#${st.recipe.outputId}`}
                                            </span>
                                            <span className="psp-node-target-label">
                                              {t('crafting.prepTarget')}{' '}
                                              {t('crafting.craftRunsBadge', { count: st.crafts })}
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
                                          <span className="font-semibold">
                                            {t('crafting.discoveryRequired')}
                                          </span>
                                          <span className="pdr-badge">
                                            {t('crafting.discoveryBonusPill')}
                                          </span>
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
                                              {idx > 0 && (
                                                <span className="pdr-plus font-mono">+</span>
                                              )}
                                              <button
                                                type="button"
                                                className={`pdr-ing-chip ${
                                                  account.hasStockData && hasEnough
                                                    ? 'stock-ok'
                                                    : ''
                                                }`}
                                                onClick={() => onOpenItem(ing.itemId)}
                                                title={`${ingItem?.name ?? ing.itemId} (${t(
                                                  'crafting.inStock',
                                                )} ${stock})`}
                                              >
                                                <ItemIcon
                                                  id={ing.itemId}
                                                  count={ing.count}
                                                  size="s"
                                                />
                                                <div className="pdr-ing-text">
                                                  <span className="pdr-ing-name">
                                                    {ingItem?.name ?? `#${ing.itemId}`}
                                                  </span>
                                                  {account.hasStockData && (
                                                    <span
                                                      className={`pdr-ing-stock ${
                                                        hasEnough ? 'ok' : 'missing'
                                                      }`}
                                                    >
                                                      {hasEnough
                                                        ? `✓ ${stock}`
                                                        : `${stock}/${ing.count}`}
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
                                          ? t('crafting.discoveryRepeatNote', {
                                              count: st.crafts - 1,
                                            })
                                          : t('crafting.discoverySingleCraftNote')}
                                      </div>
                                    </div>
                                  )}

                                  <div className="step-ings-line">
                                    <span className="ings-label dim">
                                      {st.prepSteps && st.prepSteps.length > 0
                                        ? t('crafting.rawMaterialsLabel')
                                        : st.needsDiscovery
                                        ? t('crafting.totalMaterialsLabel')
                                        : t('crafting.ingredientsLabel')}
                                    </span>
                                    <div className="step-ings-wrap">
                                      {(st.prepSteps &&
                                      st.prepSteps.length > 0 &&
                                      st.purchases &&
                                      st.purchases.length > 0
                                        ? st.purchases
                                        : st.ingredients
                                      ).map((ing) => {
                                        const it = getItem(ing.itemId);
                                        const stock = account.stockMap.get(ing.itemId) ?? 0;
                                        const hasEnough = stock >= ing.qty;
                                        return (
                                          <button
                                            key={ing.itemId}
                                            type="button"
                                            className={`step-ing-chip ${
                                              account.hasStockData && hasEnough ? 'stock-ok' : ''
                                            }`}
                                            onClick={() => onOpenItem(ing.itemId)}
                                            title={`${it?.name ?? ing.itemId}: ${fmtInt(ing.qty)}`}
                                          >
                                            <ItemIcon id={ing.itemId} count={ing.qty} size="s" />
                                            <span className="ing-name">
                                              {it?.name ?? `#${ing.itemId}`}
                                            </span>
                                            {account.hasStockData && (
                                              <span
                                                className={`pdr-ing-stock ${
                                                  hasEnough ? 'ok' : 'missing'
                                                }`}
                                              >
                                                {hasEnough ? `✓ ${stock}` : `${stock}/${ing.qty}`}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="step-cost-col">
                              <Coin copper={st.cost} />
                              {st.unpricedCount > 0 && (
                                <span className="unpriced-note dim">
                                  +{st.unpricedCount} {t('crafting.unpricedWord')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Character Progression (Lv 1–80 & Masteries) */}
      {activeTab === 'character' && (
        <div className="planner-char-progression-wrap">
          <div className="char-progression-toolbar">
            <div className="cpt-left">
              <label className="control-label">{t('planner.targetMilestoneLabel')}</label>
              <select
                className="gw2-select"
                value={charProg.targetMilestoneId ?? ''}
                onChange={(e) =>
                  progressActions.setCharacterTargetMilestone(
                    selectedCharacter,
                    e.target.value ? e.target.value : null,
                  )
                }
              >
                <option value="">{t('planner.targetMilestoneAuto')}</option>
                {charProgressionPlan.milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {t(ms.titleKey as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="cpt-right">
              {charProgressionPlan.counts.skipped > 0 && (
                <button
                  type="button"
                  className={`btn-tiny ${showSkippedSteps ? 'active' : ''}`}
                  onClick={() => setShowSkippedSteps(!showSkippedSteps)}
                >
                  {t('planner.filter.showSkipped', {
                    count: charProgressionPlan.counts.skipped,
                  })}
                </button>
              )}
              {(charProg.completedTaskIds.length > 0 ||
                charProg.skippedTaskIds.length > 0 ||
                charProg.deferredTaskIds.length > 0) && (
                <button
                  type="button"
                  className="btn-tiny"
                  onClick={() => progressActions.resetCharacterTasks(selectedCharacter)}
                >
                  <RotateCcw size={10} className="mr-1 inline" />
                  {t('planner.resetCharTasks')}
                </button>
              )}
            </div>
          </div>

          {charProgressionPlan.stages.map((stage) => {
            const isCollapsed = collapsedStages.has(stage.id);
            const visibleTasks = stage.tasks.filter(
              (tk) => showSkippedSteps || tk.status !== 'skipped',
            );
            if (visibleTasks.length === 0) return null;

            const stageActiveCount = Math.max(0, stage.tasks.length - stage.skippedCount);
            const stageFrac =
              stageActiveCount > 0 ? Math.min(1, stage.completedCount / stageActiveCount) : 1;

            return (
              <div key={stage.id} className="planner-stage-group">
                <div
                  className="planner-stage-header"
                  onClick={() => toggleStageCollapsed(stage.id)}
                >
                  <div className="psh-left">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span className="psh-title font-serif">
                      {t(stage.labelKey as TranslationKey)}
                    </span>
                  </div>
                  <div className="psh-right">
                    <span className="psh-counts font-mono">
                      {stage.completedCount} / {stageActiveCount} {t('crafting.doneWord')}
                    </span>
                    <div className="psh-progress-wrap">
                      <ProgressBar
                        value={stageFrac}
                        tone={stageFrac >= 1 ? 'gold' : 'green'}
                        slim
                      />
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="planner-stage-steps">
                    {visibleTasks.map((tk) => {
                      const def = tk.definition;
                      const isDone = tk.status === 'completed';
                      const isApiVerified = tk.verificationSource === 'api_verified';
                      const isNextRec =
                        charProgressionPlan.recommendedNextTask?.definition.id === def.id;
                      const isExpanded =
                        expandedTaskIds.has(def.id) || (isNextRec && !isDone);

                      return (
                        <div
                          key={def.id}
                          className={`planner-step-card char-task-card ${
                            isDone ? 'step-done' : ''
                          } ${tk.status === 'skipped' ? 'step-skipped' : ''} ${
                            tk.status === 'deferred' ? 'step-deferred' : ''
                          } ${!tk.isAvailable && !isDone ? 'step-blocked' : ''} ${
                            isNextRec ? 'step-recommended-next' : ''
                          }`}
                        >
                          <div className="step-check-col">
                            {isApiVerified ? (
                              <span
                                className="api-verified-check"
                                title={t('planner.verify.apiVerifiedTip')}
                              >
                                <ShieldCheck size={16} className="text-emerald-400" />
                              </span>
                            ) : (
                              <Check
                                checked={isDone}
                                onChange={() =>
                                  progressActions.toggleTaskCompleted(selectedCharacter, def.id)
                                }
                                title={t('planner.action.complete')}
                              />
                            )}
                          </div>

                          <div className="step-rank-badge font-mono">
                            <span>Lv {def.minLevel}+</span>
                          </div>

                          <div className="step-content-col">
                            <div className="step-title-line">
                              <span
                                className="step-item-name font-serif cursor-pointer"
                                onClick={() => toggleTaskExpanded(def.id)}
                              >
                                {t(def.titleKey as TranslationKey)}
                              </span>
                              <span className={`planner-cat-pill cat-${def.category}`}>
                                {t(`planner.cat.${def.category}` as TranslationKey)}
                              </span>
                              {isNextRec && (
                                <span className="planner-status-pill next-rec">
                                  {t('planner.next.badge')}
                                </span>
                              )}
                              {isDone && (
                                <span
                                  className={`planner-status-pill ${
                                    isApiVerified ? 'api-verified' : 'completed'
                                  }`}
                                >
                                  {t('planner.status.completed')} ·{' '}
                                  {isApiVerified
                                    ? t('planner.verify.apiVerified')
                                    : t('planner.verify.localTracked')}
                                </span>
                              )}
                              {tk.status === 'skipped' && (
                                <span className="planner-status-pill skipped">
                                  {t('planner.status.skipped')}
                                </span>
                              )}
                              {tk.status === 'deferred' && (
                                <span className="planner-status-pill deferred">
                                  {t('planner.status.deferred')}
                                </span>
                              )}
                              {tk.accessStatus === 'locked_expansion' && def.requiredExpansion && (
                                <span className="planner-status-pill locked">
                                  <Lock size={10} />
                                  <span>
                                    {t('planner.status.lockedExpansion', {
                                      exp: def.requiredExpansion,
                                    })}
                                  </span>
                                </span>
                              )}
                              {tk.isBlockedByLevel && !isDone && (
                                <span className="planner-status-pill blocked">
                                  {t('planner.status.blockedLevel', { level: def.minLevel })}
                                </span>
                              )}
                              {tk.isBlockedByPrereqs && !isDone && (
                                <span className="planner-status-pill blocked">
                                  {t('planner.status.blockedPrereq')}
                                </span>
                              )}
                            </div>

                            <div className="step-meta-reason-row">
                              <span className="step-reason-inline dim">
                                {t(tk.reasonKey as TranslationKey)}
                              </span>
                              <div className="step-prereq-pills">
                                {def.effortMinutes !== null && (
                                  <span className="prereq-chip">
                                    ~{def.effortMinutes} min
                                  </span>
                                )}
                                {def.prerequisiteTaskIds.map((pid) => {
                                  const pTask = CHARACTER_PROGRESSION_TASKS.find(
                                    (cand) => cand.id === pid,
                                  );
                                  const isUnmet = tk.unmetPrerequisiteIds.includes(pid);
                                  return (
                                    <span
                                      key={pid}
                                      className={`prereq-chip ${isUnmet ? 'unmet' : 'met'}`}
                                    >
                                      {t('planner.prereq.label')}{' '}
                                      {pTask
                                        ? t(pTask.titleKey as TranslationKey)
                                        : pid}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="step-collapsible-details char-task-details">
                                <p className="char-task-desc">
                                  {t(def.descKey as TranslationKey)}
                                </p>
                                <div className="char-task-benefit">
                                  <strong>{t('planner.next.expectedBenefit')}</strong>{' '}
                                  <span>{t(def.benefitKey as TranslationKey)}</span>
                                </div>
                              </div>
                            )}

                            <div className="step-inline-actions-bar">
                              {!isDone && tk.status !== 'skipped' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-tiny"
                                    onClick={() =>
                                      progressActions.setTaskStatus(
                                        selectedCharacter,
                                        def.id,
                                        'completed',
                                      )
                                    }
                                  >
                                    <CheckCircle2 size={10} />
                                    <span>{t('planner.action.complete')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-tiny"
                                    onClick={() =>
                                      progressActions.setTaskStatus(
                                        selectedCharacter,
                                        def.id,
                                        tk.status === 'deferred' ? 'open' : 'deferred',
                                      )
                                    }
                                  >
                                    <PauseCircle size={10} />
                                    <span>
                                      {tk.status === 'deferred'
                                        ? t('planner.action.restore')
                                        : t('planner.action.defer')}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-tiny"
                                    onClick={() =>
                                      progressActions.setTaskStatus(
                                        selectedCharacter,
                                        def.id,
                                        'skipped',
                                      )
                                    }
                                  >
                                    <SkipForward size={10} />
                                    <span>{t('planner.action.skip')}</span>
                                  </button>
                                </>
                              )}
                              {tk.status === 'skipped' && (
                                <button
                                  type="button"
                                  className="btn-tiny"
                                  onClick={() =>
                                    progressActions.setTaskStatus(
                                      selectedCharacter,
                                      def.id,
                                      'open',
                                    )
                                  }
                                >
                                  <RotateCcw size={10} />
                                  <span>{t('planner.action.restore')}</span>
                                </button>
                              )}
                              {def.category === 'crafting' && (
                                <button
                                  type="button"
                                  className="btn-tiny"
                                  onClick={() => setActiveTab('steps')}
                                >
                                  <Hammer size={10} />
                                  <span>{t('crafting.stepsTab')}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-tiny details-toggle-btn"
                                onClick={() => toggleTaskExpanded(def.id)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown size={10} />
                                    <span>{t('planner.action.detailsCollapse')}</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight size={10} />
                                    <span>{t('planner.action.detailsExpand')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Total Material Demand (fully recursively resolved) */}
      {activeTab === 'materials' && (
        <MaterialDemandTable
          materials={craftingPlanResult?.materials ?? []}
          onOpenItem={onOpenItem}
          onToggleProcurement={handleToggleProcurement}
          itemOverrides={itemOverrides}
          hasStockData={account.hasStockData}
        />
      )}

      {/* Tab 4: Crafting Tree (hierarchical expandable tree structure) */}
      {activeTab === 'tree' && (
        <CraftingTreeView
          trees={craftingPlanResult?.trees ?? []}
          onOpenItem={onOpenItem}
          onToggleProcurement={handleToggleProcurement}
          hasStockData={account.hasStockData}
        />
      )}

      {/* Tab 5: Shopping List (compact list) */}
      {activeTab === 'shopping' && plan && (
        <div className="planner-shopping-wrap">
          <table className="gw2-dense-table shopping-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>{t('legendary.colIcon')}</th>
                <th>{t('crafting.colItem')}</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{t('crafting.colGross')}</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{t('crafting.colStock')}</th>
                <th style={{ width: '100px', textAlign: 'right' }}>{t('crafting.colStillBuy')}</th>
                <th style={{ width: '120px', textAlign: 'right' }}>{t('crafting.colUnit')}</th>
                <th style={{ width: '140px', textAlign: 'right' }}>{t('crafting.colTotal')}</th>
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
                    <td
                      className="name-cell font-serif cursor-pointer"
                      onClick={() => onOpenItem(itemId)}
                    >
                      <span className={`r-${item?.rarity ?? 'Basic'}`}>
                        {item?.name ?? `#${itemId}`}
                      </span>
                    </td>
                    <td className="num font-mono">{fmtInt(qty)}</td>
                    <td className="num font-mono dim">
                      {account.hasStockData ? fmtInt(stock) : '–'}
                    </td>
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

      {/* Tab 6: Intermediate Components */}
      {activeTab === 'intermediates' && plan && (
        <div className="planner-intermediates-wrap">
          {plan.intermediates.length === 0 ? (
            <div className="empty-panel">{t('crafting.noIntermediatesPlanned')}</div>
          ) : (
            <div className="intermediates-grid">
              {plan.intermediates.map((im, i) => {
                const outItem = getItem(im.recipe.outputId);
                return (
                  <div key={i} className="intermediate-card">
                    <div className="im-header">
                      <ItemIcon
                        id={im.recipe.outputId}
                        size="m"
                        onClick={() => onOpenItem(im.recipe.outputId)}
                      />
                      <div className="im-info">
                        <span
                          className="im-name font-serif cursor-pointer"
                          onClick={() => onOpenItem(im.recipe.outputId)}
                        >
                          {outItem?.name ?? `#${im.recipe.outputId}`}
                        </span>
                        <span className="im-crafts font-mono">
                          {t('crafting.craftRunsBadge', { count: im.crafts })}
                        </span>
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
