import React, { useState, useMemo } from 'react';
import { isUntradable, type DisciplineId, type CraftingStrategyMode } from '../../domain/types';
import { KNOWN_VENDOR_PRICES, unitPrice } from '../../domain/costs';
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
import { Coin, DisciplineIcon, ItemIcon, Notice, Check, ProgressBar } from '../common/ui';
import {
  Search,
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
  AlertCircle,
  TrendingUp,
  RotateCw,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { useTranslation, type TranslationKey } from '../../i18n';
import { MaterialDemandTable } from './MaterialDemandTable';
import { CraftingTreeView } from './CraftingTreeView';

interface LevelPlannerProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

const CRAFTING_STRATEGIES: readonly {
  id: PlannerMode;
  icon: typeof Sparkles;
  isRecommended?: boolean;
}[] = [
  { id: 'cost', icon: Sparkles, isRecommended: true },
  { id: 'fast', icon: Zap },
  { id: 'goal', icon: Target },
  { id: 'completionist', icon: Award },
];

export const LevelPlanner: React.FC<LevelPlannerProps> = ({ discipline, maxRank, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const recipeDb = useRecipeDb(true);
  const account = useAccountState();
  const progress = useProgress();

  const plannerPrefs = progress.plannerPreferences;
  const selectedCharacter = plannerPrefs?.selectedCharacter ?? null;
  const rawPlanningMode: PlannerMode = plannerPrefs?.mode ?? 'cost';
  const planningMode: PlannerMode = rawPlanningMode === 'balanced' ? 'cost' : rawPlanningMode;

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
    'steps' | 'optimizer' | 'materials' | 'tree' | 'intermediates' | 'shopping'
  >('steps');

  // Shopping list filtering & search
  const [shoppingSearch, setShoppingSearch] = useState('');
  const [shoppingFilter, setShoppingFilter] = useState<'all' | 'missing' | 'tp' | 'vendor'>('all');

  // Strategy for intermediate products: Buy Everything, Craft Everything, or Optimal Hybrid
  const persistedStrategy: CraftingStrategyMode =
    discProgress.craftingStrategy ??
    (discProgress.craftIntermediates !== undefined
      ? (discProgress.craftIntermediates ? 'craft_everything' : 'buy_everything')
      : 'optimal_hybrid');

  const [strategy, setStrategy] = useState<CraftingStrategy>(persistedStrategy);
  const [itemOverrides, setItemOverrides] = useState<Map<number, ItemProcurement>>(new Map());
  const [onlyOpenSteps, setOnlyOpenSteps] = useState<boolean>(true);
  const [showSkippedSteps, setShowSkippedSteps] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Collapsible state for stages and individual step/task details
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [expandedStepKeys, setExpandedStepKeys] = useState<Set<string>>(new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Sync strategy when persisted strategy changes
  React.useEffect(() => {
    if (strategy !== 'custom') {
      setStrategy(persistedStrategy);
    }
  }, [persistedStrategy]);

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
    const nextStrat: CraftingStrategyMode = next ? 'craft_everything' : 'buy_everything';
    progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
      craftIntermediates: next,
      craftingStrategy: nextStrat,
    });
    setStrategy(nextStrat);
    setItemOverrides(new Map());
  };

  const handleSelectMode = (mode: PlannerMode) => {
    progressActions.setPlanningMode(mode);
    const patch: { allowDiscovery?: boolean } = {};
    if ((mode === 'cost' || mode === 'completionist') && !allowDiscovery) {
      patch.allowDiscovery = true;
    }
    if (Object.keys(patch).length > 0) {
      progressActions.setCharacterDiscipline(selectedCharacter, discipline, patch);
    }
  };

  const handleSetStrategy = (strat: CraftingStrategy) => {
    setStrategy(strat);
    if (strat !== 'custom') {
      setItemOverrides(new Map());
      const stratMode = (strat === 'all_buy'
        ? 'buy_everything'
        : strat === 'all_craft'
          ? 'craft_everything'
          : strat) as CraftingStrategyMode;
      progressActions.setCharacterDiscipline(selectedCharacter, discipline, {
        craftingStrategy: stratMode,
        craftIntermediates: stratMode === 'craft_everything',
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
    const effectiveStrategy: CraftingStrategyMode =
      strategy === 'buy_everything' || strategy === 'all_buy'
        ? 'buy_everything'
        : strategy === 'craft_everything' || strategy === 'all_craft'
          ? 'craft_everything'
          : 'optimal_hybrid';

    return planLevelRoute({
      discipline,
      fromRank: effectiveStart,
      toRank: effectiveTarget,
      recipes: recipeDb.recipes,
      recipesByOutput: recipeDb.byOutput,
      prices: prices.map,
      options: {
        strategy: effectiveStrategy,
        allowDiscovery,
        craftIntermediates: effectiveStrategy === 'craft_everything',
        knownRecipeIds: account.knownRecipeSet,
        doneStepKeys: new Set(discProgress.doneSteps ?? []),
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
    prices.updatedAt,
    prices.version,
    strategy,
    allowDiscovery,
    account.knownRecipeSet,
    discProgress.doneSteps,
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

  // Map each purchased item to the minimum step rank where it is first required
  const itemMinRankMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!plan) return map;
    const doneSet = new Set(doneSteps);
    const skipSet = new Set(skippedSteps);
    for (const st of plan.steps) {
      if (onlyOpenSteps && (doneSet.has(st.key) || skipSet.has(st.key))) continue;
      for (const p of st.purchases) {
        const prev = map.get(p.itemId) ?? Infinity;
        if (st.fromRank < prev) map.set(p.itemId, st.fromRank);
      }
      for (const ing of st.ingredients) {
        const prev = map.get(ing.itemId) ?? Infinity;
        if (st.fromRank < prev) map.set(ing.itemId, st.fromRank);
      }
    }
    return map;
  }, [plan, onlyOpenSteps, doneSteps, skippedSteps]);

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
    prices.updatedAt,
    prices.version,
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

  // Active purchases & intermediates respecting onlyOpenSteps (doneSteps/skippedSteps) and custom overrides
  const activePurchases = useMemo(() => {
    if (!plan) return new Map<number, number>();
    if (strategy === 'custom' && craftingPlanResult) {
      const customMap = new Map<number, number>();
      for (const mat of craftingPlanResult.materials) {
        if (mat.action !== 'craft' && mat.grossDemand > 0) {
          customMap.set(mat.itemId, mat.grossDemand);
        }
      }
      return customMap;
    }
    if (!onlyOpenSteps || (doneSteps.length === 0 && skippedSteps.length === 0)) {
      return plan.purchases;
    }
    const doneSet = new Set(doneSteps);
    const skipSet = new Set(skippedSteps);
    const openPurchases = new Map<number, number>();
    for (const st of plan.steps) {
      if (doneSet.has(st.key) || skipSet.has(st.key)) continue;
      for (const p of st.purchases) {
        openPurchases.set(p.itemId, (openPurchases.get(p.itemId) ?? 0) + p.qty);
      }
    }
    return openPurchases;
  }, [plan, strategy, craftingPlanResult, onlyOpenSteps, doneSteps, skippedSteps]);

  const activeIntermediates = useMemo(() => {
    if (!plan) return [];
    if (!onlyOpenSteps || (doneSteps.length === 0 && skippedSteps.length === 0)) {
      return plan.intermediates;
    }
    const doneSet = new Set(doneSteps);
    const skipSet = new Set(skippedSteps);
    const imMap = new Map<string, { recipe: (typeof plan.intermediates)[number]['recipe']; crafts: number }>();
    for (const st of plan.steps) {
      if (doneSet.has(st.key) || skipSet.has(st.key)) continue;
      for (const prep of st.prepSteps ?? []) {
        const ex = imMap.get(prep.recipe.id);
        imMap.set(prep.recipe.id, { recipe: prep.recipe, crafts: (ex?.crafts ?? 0) + prep.crafts });
      }
    }
    return Array.from(imMap.values());
  }, [plan, onlyOpenSteps, doneSteps, skippedSteps]);

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

  const isAllStepsCompleted = Boolean(plan && plan.steps.length > 0 && stepCounts.open === 0);
  const hasPartialProgress = stepCounts.done > 0 || stepCounts.skipped > 0;
  const rawCost = isAllStepsCompleted
    ? 0
    : (strategy === 'custom' || (onlyOpenSteps && hasPartialProgress)) && craftingPlanResult
      ? craftingPlanResult.totals.totalCost
      : (plan?.totalCost ?? 0);
  const displayCost = Number.isFinite(rawCost) ? rawCost : 0;

  const rawCrafts = isAllStepsCompleted
    ? 0
    : plan
      ? calculationTargets.reduce((sum, t) => sum + t.count, 0)
      : 0;
  const displayCrafts = Number.isFinite(rawCrafts) ? rawCrafts : 0;
  const discName = getDisciplineName(discipline, lang);

  // Next Action spotlight focuses on the next crafting step in the plan
  const showCharTaskInSpotlight = false;
  const spotlightCharTask: EvaluatedProgressionTask | null = charProgressionPlan.recommendedNextTask;
  const spotlightCraftStep: PlanStep | null = nextCraftingRecommendation?.step ?? null;

  return (
    <div className="level-planner-wrap">
      {/* ========================================================
          UNIFIED LEVEL PLANNER MASTER DASHBOARD
          1. Ränge & Charakter
          2. Materialstrategie (direkt unter Ränge)
          3. Weg der Beschaffung (⚡ Massenfertigung Bulk vs ✨ Günstigster Weg Normal)
          4. Kosten & Fortschritt (KPIs am Ende)
          ======================================================== */}
      <div className="planner-unified-dashboard">
        {/* Tier 1: Discipline, Character & Target Ranks */}
        <div className="pud-ranks-row">
          <div className="psh-discipline-info">
            <DisciplineIcon discipline={discipline} size="l" />
            <div className="psh-discipline-details">
              <div className="psh-disc-name-row">
                <h2 className="psh-disc-name font-serif">{discName}</h2>
                <span className="psh-disc-max-badge font-mono">
                  {discipline === 'Jeweler' ? '0–400' : '0–500'}
                </span>
              </div>
              <div className="psh-char-context-row">
                <User size={12} className="inline mr-1 text-amber-400" />
                <select
                  className="gw2-select planner-char-select-compact"
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
                {isLevelApiVerified ? (
                  <span className="planner-verify-badge api-verified" title={t('planner.verify.apiVerifiedTip')}>
                    <ShieldCheck size={11} />
                    <span>{t('planner.verify.apiVerified')}</span>
                  </span>
                ) : (
                  <span className="planner-verify-badge local-tracked" title={t('planner.verify.localTrackedTip')}>
                    <BookmarkCheck size={11} />
                    <span>{t('planner.verify.localTracked')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Level Span Range Controls */}
          <div className="psh-target-controls">
            <div className="target-rank-stepper">
              <div className="rank-input-field">
                <span className="rank-field-label">{t('crafting.fromRank')}</span>
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

              <ChevronRight size={16} className="rank-step-arrow text-amber-400" />

              <div className="rank-input-field">
                <span className="rank-field-label">{t('crafting.toRank')}</span>
                <input
                  type="number"
                  className="gw2-num-input"
                  min={effectiveStart < maxRank ? effectiveStart + 1 : maxRank}
                  max={maxRank}
                  value={effectiveTarget}
                  onChange={(e) => handleTargetChange(Number(e.target.value))}
                />
              </div>

              <div className="quick-targets-group">
                {discipline === 'Jeweler' ? (
                  <button
                    type="button"
                    className={`quick-target-btn ${effectiveTarget === 400 ? 'active' : ''}`}
                    onClick={() => handleTargetChange(400)}
                  >
                    {t('planner.target.maxJeweler')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`quick-target-btn ${effectiveTarget === 400 ? 'active' : ''}`}
                      onClick={() => handleTargetChange(400)}
                    >
                      {t('planner.target.master400')}
                    </button>
                    <button
                      type="button"
                      className={`quick-target-btn ${effectiveTarget === 500 ? 'active' : ''}`}
                      onClick={() => handleTargetChange(500)}
                    >
                      {t('planner.target.grandmaster500')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: The PROMINENT 3-Card Material Strategy Hero Section */}
        <div className="pud-strategy-hero-section">
          <div className="pud-strategy-hero-header">
            <div className="pud-shh-left">
              <span className="pud-shh-title font-serif">{t('planner.strategy.header')}</span>
              <span className="pud-shh-subtitle">
                {lang === 'en'
                  ? 'Controls intermediate component procurement: automatic cost optimization, direct TP purchases, or full self-crafting.'
                  : 'Steuert die Beschaffung von Zwischenprodukten: Automatische Kostenoptimierung, Direktkauf auf der Handelsgesellschaft oder vollständige Eigenherstellung.'}
              </span>
            </div>

            {/* Compact Route Mode Switcher (Normal / Discoveries vs Bulk / Fast) */}
            <div className="pud-route-method-switcher">
              <span className="dim text-xs mr-2">{t('planner.mode.label')}</span>
              <div className="route-mode-pill-toggle">
                <button
                  type="button"
                  className={`route-pill-btn ${planningMode === 'cost' ? 'active cost' : ''}`}
                  onClick={() => handleSelectMode('cost')}
                  title={t('planner.mode.costDesc')}
                >
                  <Sparkles size={11} className="inline mr-1 text-emerald-400" />
                  <span>{t('crafting.normalTag')}</span>
                </button>
                <button
                  type="button"
                  className={`route-pill-btn ${planningMode === 'fast' ? 'active fast' : ''}`}
                  onClick={() => handleSelectMode('fast')}
                  title={t('planner.mode.fastDesc')}
                >
                  <Zap size={11} className="inline mr-1 text-amber-400" />
                  <span>{t('crafting.bulkTag')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Prominent Strategy Cards Deck */}
          <div className="pud-strategy-cards-deck">
            {/* Mode C: Optimal Hybrid (Recommended) */}
            <div
              className={`pud-strat-card opt-hybrid ${strategy === 'optimal_hybrid' ? 'active' : ''}`}
              onClick={() => handleSetStrategy('optimal_hybrid')}
            >
              <div className="psc-top">
                <div className="psc-icon-wrap opt-hybrid">
                  <Sparkles size={18} />
                </div>
                <div className="psc-title-group">
                  <span className="psc-title font-serif">{t('planner.strategy.optimalHybrid')}</span>
                  <span className="psc-tag opt-hybrid">{t('planner.strategy.optimalHybridTag')}</span>
                </div>
                <div className="psc-rec-badge">
                  <CheckCircle2 size={11} className="inline mr-1" />
                  {t('planner.strategy.optimalBadge')}
                </div>
              </div>
              <p className="psc-desc">{t('planner.strategy.optimalHybridDesc')}</p>
              <div className="psc-status-indicator">
                <div className="psc-radio-dot" />
                <span className="font-semibold">
                  {strategy === 'optimal_hybrid'
                    ? (lang === 'en' ? 'Active Strategy' : 'Aktive Strategie')
                    : (lang === 'en' ? 'Select Mode C' : 'Modus C wählen')}
                </span>
              </div>
            </div>

            {/* Mode A: Buy Everything */}
            <div
              className={`pud-strat-card buy-all ${strategy === 'buy_everything' || strategy === 'all_buy' ? 'active' : ''}`}
              onClick={() => handleSetStrategy('buy_everything')}
            >
              <div className="psc-top">
                <div className="psc-icon-wrap buy-all">
                  <ShoppingBag size={18} />
                </div>
                <div className="psc-title-group">
                  <span className="psc-title font-serif">{t('planner.strategy.buyEverything')}</span>
                  <span className="psc-tag buy-all">{t('planner.strategy.buyEverythingTag')}</span>
                </div>
              </div>
              <p className="psc-desc">{t('planner.strategy.buyEverythingDesc')}</p>
              <div className="psc-status-indicator">
                <div className="psc-radio-dot" />
                <span className="font-semibold">
                  {(strategy === 'buy_everything' || strategy === 'all_buy')
                    ? (lang === 'en' ? 'Active Strategy' : 'Aktive Strategie')
                    : (lang === 'en' ? 'Select Mode A' : 'Modus A wählen')}
                </span>
              </div>
            </div>

            {/* Mode B: Craft Everything */}
            <div
              className={`pud-strat-card craft-all ${strategy === 'craft_everything' || strategy === 'all_craft' ? 'active' : ''}`}
              onClick={() => handleSetStrategy('craft_everything')}
            >
              <div className="psc-top">
                <div className="psc-icon-wrap craft-all">
                  <Hammer size={18} />
                </div>
                <div className="psc-title-group">
                  <span className="psc-title font-serif">{t('planner.strategy.craftEverything')}</span>
                  <span className="psc-tag craft-all">{t('planner.strategy.craftEverythingTag')}</span>
                </div>
              </div>
              <p className="psc-desc">{t('planner.strategy.craftEverythingDesc')}</p>
              <div className="psc-status-indicator">
                <div className="psc-radio-dot" />
                <span className="font-semibold">
                  {(strategy === 'craft_everything' || strategy === 'all_craft')
                    ? (lang === 'en' ? 'Active Strategy' : 'Aktive Strategie')
                    : (lang === 'en' ? 'Select Mode B' : 'Modus B wählen')}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Overrides indicator strip (if itemOverrides.size > 0) */}
          {itemOverrides.size > 0 && (
            <div className="pud-custom-overrides-strip">
              <Sliders size={13} className="text-amber-400 mr-2 shrink-0" />
              <span className="text-xs">
                {t('planner.strategy.customOverride', { count: itemOverrides.size })}
              </span>
              <button
                type="button"
                className="btn-tiny ml-auto"
                onClick={() => {
                  setItemOverrides(new Map());
                  handleSetStrategy('optimal_hybrid');
                }}
              >
                <RotateCcw size={10} className="inline mr-1" />
                {t('planner.strategy.resetOverrides')}
              </button>
            </div>
          )}
        </div>

        {/* Tier 3: Controls Bar (Toggles & Live Price Meta) */}
        <div className="pud-controls-bar">
          <div className="pwt-toggles-group">
            {planningMode !== 'fast' && (
              <Check
                checked={allowDiscovery}
                onChange={handleToggleDiscovery}
                label={t('crafting.allowDiscovery')}
                title={t('crafting.discoveryTooltip')}
              />
            )}
            <Check
              checked={onlyOpenSteps}
              onChange={() => setOnlyOpenSteps(!onlyOpenSteps)}
              label={t('crafting.onlyOpenSteps')}
              title={t('crafting.onlyOpenSteps')}
            />
          </div>

          <div className="pwt-price-meta">
            <span className="price-pulse-dot" />
            <span className="dim text-xs font-mono">
              {prices.updatedAt > 0
                ? new Date(prices.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Live TP'}
            </span>
            <button
              type="button"
              className="btn-tiny price-refresh-icon-btn"
              onClick={prices.refresh}
              title={t('crafting.priceRefreshBtn')}
            >
              <RotateCw size={10} />
            </button>
          </div>
        </div>

        {/* Tier 4: Kosten am Ende (Plan KPI Summary Strip) */}
        {plan && (
          <div className="pud-kpi-footer">
            <div className="kpi-cell highlight-gold">
              <span className="kpi-label">{t('crafting.netCostLabel')}</span>
              <span className="kpi-value font-mono">
                <Coin copper={plan.totalNetCost} />
              </span>
            </div>
            <div className="kpi-cell">
              <span className="kpi-label">{t('crafting.totalCost')}</span>
              <span className="kpi-value font-mono dim">
                <Coin copper={displayCost} />
              </span>
            </div>
            {plan.totalNpcSavings > 0 && (
              <div className="kpi-cell highlight-green">
                <span className="kpi-label">{t('crafting.npcSavingsLabel')}</span>
                <span className="kpi-value font-mono text-emerald-400">
                  +{fmtInt(plan.totalNpcSavings)}c
                </span>
              </div>
            )}
            <div className="kpi-cell">
              <span className="kpi-label">{t('crafting.craftsCount')}</span>
              <span className="kpi-value font-mono">
                {displayCrafts} ({plan.steps.length} {t('crafting.stepsWord')})
              </span>
            </div>
            <div className="kpi-cell progress-cell">
              <div className="kpi-progress-top">
                <span className="kpi-label">{t('crafting.progressLabel')}</span>
                <span className="kpi-value font-mono text-xs">
                  {stepCounts.done} / {effectiveTotalSteps} {t('crafting.doneWord')}
                </span>
                {(stepCounts.done > 0 || stepCounts.skipped > 0 || stepCounts.deferred > 0) && (
                  <button
                    type="button"
                    className="btn-tiny reset-marks-btn"
                    onClick={() => progressActions.resetDisciplineCheckmarks(discipline, selectedCharacter)}
                    title={t('crafting.resetCheckmarksTitle')}
                  >
                    <RotateCcw size={10} className="mr-0.5 inline" />
                    {t('crafting.resetCheckmarks')}
                  </button>
                )}
              </div>
              <ProgressBar value={progressFrac} tone="gold" slim />
            </div>
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

      {/* Discovery Active Recommendation Notice for 470+ */}
      {plan &&
        plan.gaps.length === 0 &&
        effectiveTarget >= 470 &&
        !allowDiscovery &&
        plan.steps.some((s) => s.fromRank >= 470 && s.needsDiscovery) && (
          <Notice tone="info" title={t('crafting.discoveryEfficiencyNoteTitle')}>
            {t('crafting.discoveryEfficiencyNoteDesc')}
          </Notice>
        )}

      {/* Subtabs: Steps / Shopping List & Demand / Cost Optimizer */}
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
            className={`subtab-btn ${
              activeTab === 'shopping' ||
              activeTab === 'materials' ||
              activeTab === 'tree' ||
              activeTab === 'intermediates'
                ? 'active'
                : ''
            }`}
            onClick={() => setActiveTab('shopping')}
          >
            <ShoppingBag size={13} />
            <span>
              {t('crafting.shoppingTab')} ({activePurchases.size})
            </span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'optimizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimizer')}
          >
            <TrendingUp size={13} />
            <span>{t('crafting.optimizerTab')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Grouped Crafting Steps */}
      {activeTab === 'steps' && plan && (
        <div className="planner-steps-list">
          {plan.steps.length === 0 ? (
            <div className="empty-panel">{t('crafting.noStepsRequired')}</div>
          ) : (
            <>
              {/* Structured Tier Roadmap Overview (0–500) */}
              <div className="planner-tier-roadmap">
                <div className="ptr-header">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-amber-400" />
                    <span className="ptr-title font-serif font-bold text-xs">
                      {t('planner.roadmap.title')}
                    </span>
                  </div>
                  <span className="ptr-hint dim text-xs">
                    {t('planner.roadmap.jumpTip')}
                  </span>
                </div>

                <div className="ptr-cards-grid">
                  {stageGroups.map((stage, idx) => {
                    const isCollapsed = collapsedStages.has(stage.id);
                    const stageTotal = stage.steps.length;
                    const stageDone = stage.completedCount;
                    const isComplete = stageDone >= stageTotal && stageTotal > 0;
                    const stageCost = stage.steps.reduce((acc, st) => acc + st.cost, 0);
                    const stageCrafts = stage.steps.reduce((acc, st) => acc + st.crafts, 0);
                    const stageFrac = stageTotal > 0 ? stageDone / stageTotal : 0;

                    return (
                      <button
                        key={stage.id}
                        type="button"
                        className={`ptr-tier-card ${isComplete ? 'is-complete' : ''} ${!isCollapsed ? 'is-expanded' : ''}`}
                        onClick={() => {
                          if (isCollapsed) {
                            setCollapsedStages((prev) => {
                              const next = new Set(prev);
                              next.delete(stage.id);
                              return next;
                            });
                          }
                          const el = document.getElementById(`stage-group-${stage.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        title={`${t(stage.labelKey as TranslationKey)} (${stage.fromRank}–${stage.toRank})`}
                      >
                        <div className="ptr-tier-top">
                          <span className="ptr-tier-num font-serif font-bold">
                            Tier {idx + 1}
                          </span>
                          <span className="ptr-tier-range font-mono text-xs">
                            {stage.fromRank}–{stage.toRank}
                          </span>
                          {isComplete && <CheckCircle2 size={12} className="text-emerald-400 ml-auto" />}
                        </div>

                        <div className="ptr-tier-name font-serif truncate">
                          {t(stage.labelKey as TranslationKey).split('(')[0].trim()}
                        </div>

                        <div className="ptr-tier-meta font-mono text-xs">
                          <span>{t('planner.roadmap.tierSteps', { count: stageTotal })} ({stageCrafts}×)</span>
                          <span className="ptr-tier-cost"><Coin copper={stageCost} /></span>
                        </div>

                        <div className="ptr-tier-progress">
                          <ProgressBar value={stageFrac} tone={isComplete ? 'gold' : 'green'} slim />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {stageGroups.map((stage) => {
                const isStageCollapsed = collapsedStages.has(stage.id);
                const visibleSteps = stage.steps.filter(
                  (st) => showSkippedSteps || !skippedSteps.includes(st.key),
                );
                if (visibleSteps.length === 0) return null;

                const stageTotalActive = Math.max(0, stage.steps.length - stage.skippedCount);
                const stageFrac =
                  stageTotalActive > 0 ? Math.min(1, stage.completedCount / stageTotalActive) : 1;

                return (
                  <div key={stage.id} id={`stage-group-${stage.id}`} className="planner-stage-group">
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
                                {st.isDiscoveryCombined ? (
                                  <>
                                    <span className="step-operation-prefix font-serif text-amber-300 font-semibold">
                                      {t('crafting.discoverAndCraftPrefix')}
                                    </span>
                                    <span
                                      className="step-item-name font-serif cursor-pointer"
                                      onClick={() => onOpenItem(st.recipe.outputId)}
                                    >
                                      {outItem?.name ?? `#${st.recipe.outputId}`}
                                    </span>
                                    <span
                                      className="step-crafts-count combined font-mono"
                                      title={t('crafting.totalProductionTip', {
                                        total: st.crafts,
                                        disc: st.discoveryCrafts ?? 1,
                                        repeat: st.repeatCrafts ?? (st.crafts - 1),
                                      })}
                                    >
                                      ({st.crafts}×)
                                    </span>
                                    <span
                                      className="discovery-tag combined"
                                      title={t('crafting.discoveryProducedOne')}
                                    >
                                      <Sparkles size={10} className="inline mr-1" />
                                      {t('crafting.discoverSubCount', {
                                        count: st.discoveryCrafts ?? 1,
                                      })}
                                    </span>
                                    <span
                                      className="repeat-craft-tag font-mono"
                                      title={t('crafting.repeatCraftTip', {
                                        count: st.repeatCrafts ?? (st.crafts - 1),
                                      })}
                                    >
                                      <Hammer size={10} className="inline mr-1" />
                                      {t('crafting.repeatSubCount', {
                                        count: st.repeatCrafts ?? (st.crafts - 1),
                                      })}
                                    </span>
                                  </>
                                ) : (
                                  <>
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
                                  </>
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
                                          'skipped',
                                        )
                                      }
                                      title={t('planner.action.skip')}
                                    >
                                      <SkipForward size={10} />
                                      <span>{t('planner.action.skip')}</span>
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
                                      title={isDeferred ? t('planner.action.restore') : t('planner.action.defer')}
                                    >
                                      <PauseCircle size={10} />
                                      <span>
                                        {isDeferred
                                          ? t('planner.action.restore')
                                          : t('planner.action.defer')}
                                      </span>
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
                                            {st.isDiscoveryCombined
                                              ? t('crafting.initialDiscoveryStep')
                                              : t('crafting.discoveryRequired')}
                                          </span>
                                          <span className="pdr-badge">
                                            {t('crafting.discoveryBonusPill')}
                                          </span>
                                        </div>
                                        <span className="pdr-subtitle">
                                          {st.isDiscoveryCombined
                                            ? `${t('crafting.discoveryCombineInstruction')} (${t('crafting.initialDiscoveryDesc')})`
                                            : t('crafting.discoveryCombineInstruction')}
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
                                        {st.isDiscoveryCombined ? (
                                          <div className="combined-repeat-callout">
                                            <div className="crc-line font-medium text-amber-200">
                                              <Hammer size={12} className="inline mr-1 text-sky-400" />
                                              {t('crafting.subsequentCraftStep', {
                                                count: st.repeatCrafts ?? (st.crafts - 1),
                                              })}
                                            </div>
                                            <div className="crc-sub text-xs text-slate-400 mt-0.5">
                                              {t('crafting.subsequentCraftDesc', {
                                                count: st.repeatCrafts ?? (st.crafts - 1),
                                              })}{' '}
                                              ·{' '}
                                              <span className="text-amber-300 font-mono">
                                                {t('crafting.totalProductionTip', {
                                                  total: st.crafts,
                                                  disc: st.discoveryCrafts ?? 1,
                                                  repeat: st.repeatCrafts ?? (st.crafts - 1),
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                        ) : st.crafts > 1 ? (
                                          t('crafting.discoveryRepeatNote', {
                                            count: st.crafts - 1,
                                          })
                                        ) : (
                                          t('crafting.discoverySingleCraftNote')
                                        )}
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
            })}
            </>
          )}
        </div>
      )}

      {/* Tab: Cost Optimization & GW2Crafts Benchmark (v0.3.0) */}
      {activeTab === 'optimizer' && plan && (
        <div className="planner-optimizer-view">
          {/* Top 4 KPI Metrics Banner */}
          <div className="optimizer-kpi-grid">
            <div className="optimizer-kpi-card highlight-gold">
              <span className="kpi-label">{t('crafting.netCostLabel')}</span>
              <div className="kpi-value font-mono">
                <Coin copper={plan.totalNetCost} />
              </div>
              <span className="kpi-sub dim">
                {lang === 'en'
                  ? `Net investment after expected liquidation proceeds (-${fmtInt(plan.totalResaleValue)}c)`
                  : `Netto-Aufwand nach Abzug erwarteter Handelserlöse (-${fmtInt(plan.totalResaleValue)}c)`}
              </span>
            </div>

            <div className="optimizer-kpi-card">
              <span className="kpi-label">{t('crafting.grossCostLabel')}</span>
              <div className="kpi-value font-mono">
                <Coin copper={plan.totalCost} />
              </div>
              <span className="kpi-sub dim">
                {lang === 'en' ? 'Gross material purchase expenditure' : 'Brutto-Materialaufwand aller Einkäufe'}
              </span>
            </div>

            <div className="optimizer-kpi-card highlight-green">
              <span className="kpi-label">{t('crafting.npcSavingsLabel')}</span>
              <div className="kpi-value font-mono text-emerald-400">
                +{fmtInt(plan.totalNpcSavings)}c
              </div>
              <span className="kpi-sub dim">
                {lang === 'en' ? 'Saved via Master Craftsman vs Trading Post' : 'Gespart durch Meisterhandwerker statt Handelsposten'}
              </span>
            </div>

            <div className="optimizer-kpi-card">
              <span className="kpi-label">{t('crafting.opportunityCostLabel')}</span>
              <div className="kpi-value font-mono">
                <Coin copper={plan.opportunityCostStock} />
              </div>
              <span className="kpi-sub dim">
                {lang === 'en' ? 'Liquidation value of owned materials' : 'Gegenwert vorhandener Lagermaterialien'}
              </span>
            </div>
          </div>

          {/* Special Discipline Advisories */}
          {discipline === 'Chef' && effectiveTarget >= 425 && (
            <Notice tone="info" title="Sonderweg Koch (Stufe 400–500)">
              {t('crafting.chefSpecialNote')}
            </Notice>
          )}

          {discipline === 'Jeweler' && (
            <Notice tone="info" title="Maximalstufe Juwelier (Stufe 400)">
              {t('crafting.jewelerMaxNote')}
            </Notice>
          )}

          {/* Section 1: 4-Way Multi-Option Cost Comparison Table (Section 7) */}
          <div className="optimizer-section-card">
            <div className="optimizer-section-header">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-amber-400" />
                <h3 className="font-serif text-sm font-semibold">
                  {lang === 'en' ? 'Comprehensive Cost Comparison Matrix' : 'Kostenvergleich nach Beschaffungsweg'}
                </h3>
              </div>
              <span className="dim text-xs">
                {lang === 'en' ? 'Direct calculation across all 4 procurement routes' : 'Tatsächlicher Vergleich der 4 Leveling-Wege'}
              </span>
            </div>

            <div className="optimizer-table-container">
              <table className="gw2-dense-table optimizer-table">
                <thead>
                  <tr>
                    <th style={{ width: '240px' }}>{t('crafting.colOption')}</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>{t('crafting.colCost')}</th>
                    <th>{t('crafting.colEvaluation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.costComparison.rows.map((row) => (
                    <tr key={row.id} className={row.isRecommended ? 'row-highlight' : ''}>
                      <td className="font-semibold">
                        <div className="flex items-center gap-2">
                          {row.isRecommended ? (
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{lang === 'en' ? row.titleEn : row.titleDe}</span>
                        </div>
                      </td>
                      <td className="num font-mono">
                        <Coin copper={row.costCopper} />
                      </td>
                      <td>
                        <span className={row.isRecommended ? 'text-emerald-300 font-semibold' : 'dim'}>
                          {lang === 'en' ? row.evaluationEn : row.evaluationDe}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: GW2Crafts Benchmark Guide Comparison (Section 3) */}
          <div className="optimizer-section-card">
            <div className="optimizer-section-header">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="font-serif text-sm font-semibold">
                  {t('crafting.gw2craftsBenchmarkTitle')}
                </h3>
              </div>
              <a
                href={plan.gw2craftsComparison.benchmark.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-tiny flex items-center gap-1.5"
                title="gw2crafts.net Guide öffnen"
              >
                <span>gw2crafts.net</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="gw2crafts-compare-card">
              <div className="gcc-header-banner">
                <div className="gcc-badge-col">
                  <span className="gcc-pill-label">GW2Crafts Referenz</span>
                  <div className="gcc-stat-val font-mono">
                    <Coin copper={plan.gw2craftsComparison.benchmark.estimatedCostCopper} />
                  </div>
                  <span className="dim text-xs">
                    {plan.gw2craftsComparison.benchmark.estimatedStepsCount} Schritte · {plan.gw2craftsComparison.benchmark.estimatedCraftRuns} Herstellungen
                  </span>
                </div>

                <div className="gcc-vs-divider">
                  <span className="gcc-vs-badge">VS</span>
                  <span className="gcc-savings-badge">
                    {plan.gw2craftsComparison.differenceCopper > 0
                      ? `-${plan.gw2craftsComparison.savingsPercentage}% Kosten`
                      : 'Echtzeit-Optimiert'}
                  </span>
                </div>

                <div className="gcc-badge-col omnitria-col">
                  <span className="gcc-pill-label text-gold">Omnitria Optimiert</span>
                  <div className="gcc-stat-val font-mono text-gold">
                    <Coin copper={plan.totalNetCost} />
                  </div>
                  <span className="dim text-xs">
                    {plan.steps.length} Schritte · {plan.totalCrafts} Herstellungen
                  </span>
                </div>
              </div>

              <div className="gcc-advantages-list">
                <span className="gcc-adv-title font-semibold text-xs">
                  {lang === 'en' ? 'Why Omnitria optimizes this path:' : 'Warum Omnitria diesen Weg empfiehlt:'}
                </span>
                <div className="gcc-adv-items">
                  {plan.gw2craftsComparison.advantages.map((adv, idx) => (
                    <div key={idx} className="gcc-adv-item">
                      <ShieldCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs">{lang === 'en' ? adv.en : adv.de}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GW2Crafts Reference Tier Blueprint */}
              <div className="gcc-blueprint-box">
                <span className="dim text-xs font-semibold uppercase tracking-wider">
                  {lang === 'en' ? 'GW2Crafts Tier Blueprint Breakdown:' : 'Ablaufplan des GW2Crafts-Standard-Leitfadens:'}
                </span>
                <div className="gcc-blueprint-grid">
                  {plan.gw2craftsComparison.benchmark.tierBreakdown.map((t) => (
                    <div key={t.tierNumber} className="gcc-tier-card">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-amber-300">
                          Tier {t.tierNumber} ({t.range})
                        </span>
                        <span className="font-mono text-xs">
                          <Coin copper={t.estimatedCostCopper} />
                        </span>
                      </div>
                      <span className="dim text-xs mt-1">
                        {lang === 'en' ? t.descriptionEn : t.descriptionDe}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Procurement Views: Shopping List / Material Demand / Crafting Tree / Intermediates */}
      {(activeTab === 'shopping' ||
        activeTab === 'materials' ||
        activeTab === 'tree' ||
        activeTab === 'intermediates') && (
        <div className="planner-procurement-container">
          <div className="shopping-view-switcher">
            <button
              type="button"
              className={`subtab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
              onClick={() => setActiveTab('shopping')}
            >
              <ShoppingBag size={12} />
              <span>{t('planner.view.shopping')} ({activePurchases.size})</span>
            </button>
            <button
              type="button"
              className={`subtab-btn ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <Layers size={12} />
              <span>{t('planner.view.demand')} ({craftingPlanResult?.materials.length ?? 0})</span>
            </button>
            <button
              type="button"
              className={`subtab-btn ${activeTab === 'tree' ? 'active' : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              <GitFork size={12} />
              <span>{t('planner.view.tree')}</span>
            </button>
            <button
              type="button"
              className={`subtab-btn ${activeTab === 'intermediates' ? 'active' : ''}`}
              onClick={() => setActiveTab('intermediates')}
            >
              <Sparkles size={12} />
              <span>{t('planner.view.intermediates')} ({activeIntermediates.length})</span>
            </button>
          </div>

          {/* Tab 2: Total Material Demand (fully recursively resolved) */}
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

          {/* Tab 5: Shopping List (Tier-grouped, searchable, with responsive columns) */}
          {activeTab === 'shopping' && plan && (
            <div className="planner-shopping-wrap">
              {(() => {
                const rawPurchases = Array.from(activePurchases.entries());

                // Enrich materials from authentic 7-tier ledger (eliminates split-brain double stock deduction)
                const sourceMaterials = (strategy !== 'custom' && plan.materials && plan.materials.length > 0)
                  ? plan.materials.filter((m) => m.remainingToBuy > 0 || m.stockConsumed > 0 || m.grossDemand > 0)
                  : rawPurchases.map(([itemId, qty]) => {
                      const stock = account.stockMap.get(itemId) ?? 0;
                      const missing = Math.max(0, qty - stock);
                      return {
                        itemId,
                        grossDemand: qty,
                        ownedStock: stock,
                        stockConsumed: Math.min(qty, stock),
                        netDeficit: missing,
                        manufactured: 0,
                        intermediateYield: 0,
                        remainingToBuy: missing,
                        isAccountBound: false,
                        unitPrice: unitPrice(prices.map.get(itemId), itemId),
                        totalCost: unitPrice(prices.map.get(itemId), itemId) !== null ? (unitPrice(prices.map.get(itemId), itemId)! * missing) : 0,
                      };
                    });

                const enriched = sourceMaterials.map((m) => {
                  const itemId = m.itemId;
                  const item = getItem(itemId);
                  const isVendor = KNOWN_VENDOR_PRICES.has(itemId);
                  const untradable = ('isAccountBound' in m && m.isAccountBound) || (isUntradable(item) && !isVendor);
                  const unit = m.unitPrice;
                  const totalLineCost = unit !== null && m.remainingToBuy > 0 ? unit * m.remainingToBuy : (m.remainingToBuy === 0 ? 0 : null);

                  const minRank = itemMinRankMap.get(itemId);
                  const rank = minRank !== undefined && Number.isFinite(minRank) ? minRank : 0;
                  let tier = 1;
                  if (rank >= 400) tier = 6;
                  else if (rank >= 300) tier = 5;
                  else if (rank >= 225) tier = 4;
                  else if (rank >= 150) tier = 3;
                  else if (rank >= 75) tier = 2;

                  return {
                    itemId,
                    qty: m.grossDemand,
                    stock: m.ownedStock,
                    stockConsumed: m.stockConsumed,
                    missing: m.remainingToBuy,
                    isVendor,
                    untradable,
                    unit,
                    totalLineCost,
                    item,
                    tier,
                    name: item?.name ?? `#${itemId}`,
                  };
                });

                const hasUntradable = enriched.some((row) => row.untradable && row.missing > 0);

                // Counts for toolbar filter pills
                const missingCount = enriched.filter((i) => i.missing > 0).length;
                const tpCount = enriched.filter((i) => !i.isVendor && !i.untradable).length;
                const vendorCount = enriched.filter((i) => i.isVendor).length;

                let totalMissingCost = 0;
                for (const item of enriched) {
                  if (item.totalLineCost !== null && item.missing > 0) {
                    totalMissingCost += item.totalLineCost;
                  }
                }

                // Apply search & filter
                const query = shoppingSearch.trim().toLowerCase();
                const filtered = enriched.filter((row) => {
                  if (query && !row.name.toLowerCase().includes(query)) return false;
                  if (shoppingFilter === 'missing' && row.missing <= 0) return false;
                  if (shoppingFilter === 'tp' && (row.isVendor || row.untradable)) return false;
                  if (shoppingFilter === 'vendor' && !row.isVendor) return false;
                  return true;
                });

                // Group by tier
                const tierMap = new Map<number, typeof filtered>();
                for (const item of filtered) {
                  const list = tierMap.get(item.tier) ?? [];
                  list.push(item);
                  tierMap.set(item.tier, list);
                }

                const tierMeta: Record<number, { title: string; range: string }> = {
                  1: { title: lang === 'en' ? 'Tier 1 · Novice' : 'Tier 1 · Novize', range: '0–75' },
                  2: { title: lang === 'en' ? 'Tier 2 · Initiate' : 'Tier 2 · Initiant', range: '75–150' },
                  3: { title: lang === 'en' ? 'Tier 3 · Apprentice' : 'Tier 3 · Lehrling', range: '150–225' },
                  4: { title: lang === 'en' ? 'Tier 4 · Journeyman' : 'Tier 4 · Geselle', range: '225–300' },
                  5: { title: lang === 'en' ? 'Tier 5 · Adept' : 'Tier 5 · Experte', range: '300–400' },
                  6: { title: lang === 'en' ? 'Tier 6 · Master & Grandmaster' : 'Tier 6 · Meister & Großmeister', range: '400–500' },
                };

                const presentTiers = [1, 2, 3, 4, 5, 6].filter((t) => tierMap.has(t));

                return (
                  <>
                    {hasUntradable && (
                      <div className="planner-untradable-banner">
                        <AlertCircle size={15} className="text-amber shrink-0" />
                        <span>
                          {lang === 'en'
                            ? 'Note: Some materials below are account-bound (marked with ⚠️) and cannot be purchased on the Trading Post. They must be gathered, looted, or acquired in-game with currencies (e.g. Karma).'
                            : 'Hinweis: Einige Materialien unten sind accountgebunden (mit ⚠️ markiert) und können nicht im Handelsposten gekauft werden. Sie müssen im Spiel gesammelt, erbeutet oder über Währungen (z. B. Karma) beschafft werden.'}
                        </span>
                      </div>
                    )}

                    {/* Shopping Toolbar: Search, Filters & Total Cost */}
                    <div className="shopping-toolbar">
                      <div className="shopping-toolbar-left">
                        <div className="shopping-search-box">
                          <Search size={13} className="text-amber-400 shrink-0" />
                          <input
                            type="text"
                            placeholder={t('crafting.searchMaterial')}
                            value={shoppingSearch}
                            onChange={(e) => setShoppingSearch(e.target.value)}
                          />
                        </div>

                        <div className="shopping-filter-chips">
                          <button
                            type="button"
                            className={`shopping-chip ${shoppingFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setShoppingFilter('all')}
                          >
                            {t('crafting.filterAll')} ({enriched.length})
                          </button>
                          <button
                            type="button"
                            className={`shopping-chip ${shoppingFilter === 'missing' ? 'active' : ''}`}
                            onClick={() => setShoppingFilter('missing')}
                          >
                            {t('crafting.filterMissingOnly')} ({missingCount})
                          </button>
                          <button
                            type="button"
                            className={`shopping-chip ${shoppingFilter === 'tp' ? 'active' : ''}`}
                            onClick={() => setShoppingFilter('tp')}
                          >
                            {t('crafting.filterTpOnly')} ({tpCount})
                          </button>
                          <button
                            type="button"
                            className={`shopping-chip ${shoppingFilter === 'vendor' ? 'active' : ''}`}
                            onClick={() => setShoppingFilter('vendor')}
                          >
                            {t('crafting.filterVendorOnly')} ({vendorCount})
                          </button>
                        </div>
                      </div>

                      <div className="shopping-toolbar-right">
                        <span className="dim text-xs">{t('crafting.shoppingTotalMissing')}:</span>
                        <span className="font-bold">
                          <Coin copper={totalMissingCost} />
                        </span>
                      </div>
                    </div>

                    {/* Responsive Table Container */}
                    <div className="shopping-table-responsive-container">
                      <table className="gw2-dense-table shopping-table">
                        <thead>
                          <tr>
                            <th className="col-icon" style={{ width: '44px', textAlign: 'center' }}>
                              {t('legendary.colIcon')}
                            </th>
                            <th className="col-item">{t('crafting.colItem')}</th>
                            <th className="col-gross" style={{ width: '85px', textAlign: 'right' }}>
                              {t('crafting.colGross')}
                            </th>
                            <th className="col-stock" style={{ width: '85px', textAlign: 'right' }}>
                              {t('crafting.colStock')}
                            </th>
                            <th className="col-missing" style={{ width: '95px', textAlign: 'right' }}>
                              {t('crafting.colStillBuy')}
                            </th>
                            <th className="col-unit" style={{ width: '115px', textAlign: 'right' }}>
                              {t('crafting.colUnit')}
                            </th>
                            <th className="col-total" style={{ width: '140px', textAlign: 'right', paddingRight: '16px' }}>
                              {t('crafting.colTotal')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {presentTiers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="empty-cell">
                                {t('crafting.noSearchResults')}
                              </td>
                            </tr>
                          ) : (
                            presentTiers.map((tierNum) => {
                              const tierItems = tierMap.get(tierNum) ?? [];
                              const meta = tierMeta[tierNum];
                              let tierMissingCost = 0;
                              let tierMissingItems = 0;
                              for (const it of tierItems) {
                                if (it.missing > 0) {
                                  tierMissingItems++;
                                  if (it.totalLineCost !== null) tierMissingCost += it.totalLineCost;
                                }
                              }

                              return (
                                <React.Fragment key={`tier-${tierNum}`}>
                                  <tr className="shopping-tier-separator">
                                    <td colSpan={7}>
                                      <div className="tier-header-content">
                                        <span className="tier-badge">
                                          {meta.title} (Rang {meta.range})
                                        </span>
                                        <div className="tier-meta-right">
                                          <span className="tier-items-count">
                                            {tierItems.length}{' '}
                                            {lang === 'en' ? 'materials' : 'Materialien'}
                                          </span>
                                          {tierMissingItems === 0 ? (
                                            <span className="text-emerald-400 font-semibold text-xs">
                                              {t('crafting.shoppingAllInStock')}
                                            </span>
                                          ) : (
                                            <span className="text-amber-400 text-xs">
                                              {t('crafting.shoppingMissingItems', { count: tierMissingItems })}
                                            </span>
                                          )}
                                          <span className="tier-subtotal">
                                            <Coin copper={tierMissingCost} />
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {tierItems.map((row) => {
                                    const { itemId, qty, stock, missing, isVendor, untradable, unit, totalLineCost, item } = row;
                                    return (
                                      <tr key={itemId} className={missing === 0 ? 'row-complete' : ''}>
                                        <td className="icon-cell" style={{ textAlign: 'center' }}>
                                          <ItemIcon id={itemId} size="s" onClick={() => onOpenItem(itemId)} />
                                        </td>
                                        <td
                                          className="name-cell font-serif cursor-pointer"
                                          onClick={() => onOpenItem(itemId)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className={`r-${item?.rarity ?? 'Basic'}`}>
                                              {item?.name ?? `#${itemId}`}
                                            </span>
                                            {untradable && (
                                              <span
                                                className="badge-untradable"
                                                title={
                                                  lang === 'en'
                                                    ? 'Account-bound: cannot be traded on the Trading Post'
                                                    : 'Accountgebunden: nicht im Handelsposten handelbar'
                                                }
                                              >
                                                {lang === 'en' ? 'Account Bound' : 'Accountgebunden'}
                                              </span>
                                            )}
                                            {isVendor && (
                                              <span
                                                className="mat-badge badge-discovery-ing"
                                                title={
                                                  lang === 'en'
                                                    ? 'Purchasable from Master Craftsman / NPC Vendor'
                                                    : 'Kaufbar beim Handwerksmeister / Händler'
                                                }
                                              >
                                                {lang === 'en' ? 'Vendor' : 'Händler'}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="num font-mono">{fmtInt(qty)}</td>
                                        <td className="num font-mono dim">
                                          {account.hasStockData ? fmtInt(stock) : '–'}
                                        </td>
                                        <td
                                          className={`num font-mono ${
                                            missing > 0
                                              ? untradable
                                              ? 'text-amber font-bold'
                                              : 'bad font-bold'
                                              : 'good font-bold'
                                          }`}
                                        >
                                          {account.hasStockData ? (
                                            untradable && missing > 0 ? (
                                              <span
                                                title={
                                                  lang === 'en'
                                                    ? 'Must be farmed/looted in-game'
                                                    : 'Muss im Spiel gesammelt/erbeutet werden'
                                                }
                                              >
                                                {fmtInt(missing)} ⚠️
                                              </span>
                                            ) : missing === 0 ? (
                                              <span className="text-emerald-400 font-bold">✓ 0</span>
                                            ) : (
                                              fmtInt(missing)
                                            )
                                          ) : (
                                            fmtInt(qty)
                                          )}
                                        </td>
                                        <td className="num font-mono col-unit" style={{ textAlign: 'right' }}>
                                          {untradable ? (
                                            <span className="dim text-xs font-serif">
                                              {lang === 'en' ? 'Not tradable' : 'Nicht handelbar'}
                                            </span>
                                          ) : (
                                            <Coin copper={unit} />
                                          )}
                                        </td>
                                        <td className="num font-mono col-total" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                          {untradable ? (
                                            <span className="dim text-xs font-serif">–</span>
                                          ) : (
                                            <Coin copper={totalLineCost} />
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Tab 6: Intermediate Components */}
          {activeTab === 'intermediates' && plan && (
            <div className="planner-intermediates-wrap">
              {activeIntermediates.length === 0 ? (
                <div className="empty-panel">{t('crafting.noIntermediatesPlanned')}</div>
              ) : (
                <div className="intermediates-grid">
                  {activeIntermediates.map((im, i) => {
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
      )}
    </div>
  );
};
