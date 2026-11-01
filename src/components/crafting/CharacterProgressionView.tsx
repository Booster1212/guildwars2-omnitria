import React, { useState, useMemo } from 'react';
import {
  buildCharacterProgressionPlan,
  CHARACTER_PROGRESSION_TASKS,
} from '../../domain/levelPlanner';
import { useAccountState, getAccountAccessList } from '../../data/gw2/account';
import { useProgress, progressActions, type PlannerMode } from '../../data/progressStore';
import { Check, ProgressBar } from '../common/ui';
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  PauseCircle,
  SkipForward,
  RotateCcw,
  User,
  Compass,
  Lock,
} from 'lucide-react';
import { useTranslation, type TranslationKey } from '../../i18n';

interface CharacterProgressionViewProps {
  onOpenItem?: (id: number) => void;
}

export const CharacterProgressionView: React.FC<CharacterProgressionViewProps> = React.memo(() => {
  const { t } = useTranslation();
  const account = useAccountState();
  const progress = useProgress();

  const plannerPrefs = progress.plannerPreferences;
  const selectedCharacter = plannerPrefs?.selectedCharacter ?? null;

  // Character-specific progress state
  const charProg = progressActions.getCharacterProgress(selectedCharacter);

  // Resolve selected character object from account API if available
  const selectedCharObj = useMemo(() => {
    const chars = account.data?.characters ?? [];
    if (selectedCharacter) {
      return chars.find((c) => c.name === selectedCharacter) ?? null;
    }
    return chars[0] ?? null;
  }, [account.data?.characters, selectedCharacter]);

  // Determine character level (from API if character selected and available, else manual)
  const isLevelApiVerified = Boolean(selectedCharObj && selectedCharObj.level > 0);
  const effectiveCharLevel = useMemo(() => {
    if (selectedCharObj) return selectedCharObj.level;
    return charProg.manualLevel ?? 80;
  }, [selectedCharObj, charProg.manualLevel]);

  // Account expansion access & stats
  const accountAccess = useMemo(() => getAccountAccessList(account.data), [account.data]);

  const highestCraftingRank = useMemo(() => {
    const craftingMap = account.data?.crafting;
    if (!craftingMap) return 0;
    let maxR = 0;
    for (const entry of Object.values(craftingMap)) {
      if (entry && entry.rating > maxR) maxR = entry.rating;
    }
    return maxR;
  }, [account.data]);

  const todayUtcStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
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
      isCraftingApiVerified: highestCraftingRank > 0,
      equippedSlotCount: selectedCharObj?.equipment?.length ?? 0,
      accountAccess,
      wizardsVaultDoneToday: false,
      worldBossDoneToday,
      trackedLegendaryCount,
      mode: plannerPrefs?.mode ?? 'balanced',
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
    accountAccess,
    worldBossDoneToday,
    trackedLegendaryCount,
    charProg.targetMilestoneId,
    charProg.completedTaskIds,
    charProg.skippedTaskIds,
    charProg.deferredTaskIds,
  ]);

  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [showSkippedSteps, setShowSkippedSteps] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const toggleStageCollapsed = (stageId: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
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

  const totalProgressFrac =
    charProgressionPlan.counts.total > 0
      ? Math.min(1, charProgressionPlan.counts.completed / charProgressionPlan.counts.total)
      : 1;

  return (
    <div className="character-progression-view">
      {/* Top Context & Character Selector Bar */}
      <div className="planner-context-bar mb-3">
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
            {(account.data?.characters ?? []).map((ch) => (
              <option key={ch.name} value={ch.name}>
                {ch.name} (Lv {ch.level} {ch.profession})
              </option>
            ))}
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
              <Compass size={11} />
              <span>{t('planner.verify.localTracked')}</span>
            </span>
          )}
        </div>

        {/* Overall Character Leveling Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-serif text-xs text-amber-300 font-semibold">
              {t('planner.tab.charProgression')}
            </div>
            <div className="font-mono text-[11px] text-gray-300">
              {charProgressionPlan.counts.completed} / {charProgressionPlan.counts.total}{' '}
              {t('crafting.doneWord')} ({Math.round(totalProgressFrac * 100)}%)
            </div>
          </div>
          <div style={{ width: 110 }}>
            <ProgressBar
              value={totalProgressFrac}
              tone={totalProgressFrac >= 1 ? 'gold' : 'green'}
            />
          </div>
        </div>
      </div>

      {/* Recommended Next Action Spotlight (if present) */}
      {charProgressionPlan.recommendedNextTask && (
        <div className="planner-next-action-spotlight mb-3">
          <div className="next-action-header">
            <span className="next-action-tag">
              <Compass size={13} className="inline mr-1" />
              {t('planner.next.badge')}
            </span>
            <span className="next-action-title font-serif">
              {t(charProgressionPlan.recommendedNextTask.definition.titleKey as TranslationKey)}
            </span>
            <span className="step-rank-badge font-mono ml-auto">
              Lv {charProgressionPlan.recommendedNextTask.definition.minLevel}+
            </span>
          </div>
          <p className="next-action-desc dim text-xs mt-1">
            {t(charProgressionPlan.recommendedNextTask.definition.descKey as TranslationKey)}
          </p>
          <div className="next-action-benefit text-xs text-amber-200 mt-1">
            <strong>{t('planner.next.expectedBenefit')}:</strong>{' '}
            {t(charProgressionPlan.recommendedNextTask.definition.benefitKey as TranslationKey)}
          </div>
        </div>
      )}

      {/* Milestones & Tasks Controls */}
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

        {/* Progression Stages & Tasks List */}
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
                className="planner-stage-header cursor-pointer"
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
                                <span>{t('planner.action.restore')}</span>
                              </button>
                            )}
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
    </div>
  );
});
