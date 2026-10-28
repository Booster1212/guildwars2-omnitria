import React, { useState, useMemo } from 'react';
import type {
  TacticalRecommendation,
  WvwCombinedObjective,
  AdvisorConfig,
  AdvisorPreset,
  WvwMapType,
  WvwMatch,
  WvwTeam,
  WvwWorld,
} from '../../data/gw2/wvw/types.ts';
import type { MapRecommendation } from '../../data/gw2/wvw/mapAdvisor.ts';
import type { Gw2AccountInfo, DailyProgressionData } from '../../data/gw2Api.ts';
import type { WvwSubTab } from './WvwHeader.tsx';
import { TEAM_COLORS, ADVISOR_PRESETS } from '../../data/gw2/wvw/constants.ts';
import { getOwnerDisplayName, resolveTeamNames } from '../../data/gw2/wvw/teamUtils.ts';
import {
  computeWvwRankProgression,
  computeWvwStandings,
  generateWvwSituationalInsights,
  filterWvwObjectives,
  type WvwOwnerFilter,
  type WvwStatusFilter,
} from '../../data/gw2/wvw/progression.ts';
import { useAccountState } from '../../data/gw2/account.ts';
import { useTranslation } from '../../i18n/index.ts';
import { fmtInt } from '../common/labels.ts';
import { ProgressBar } from '../common/ui.tsx';
import {
  Crosshair,
  Shield,
  Star,
  EyeOff,
  Copy,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Sliders,
  Zap,
  Flame,
  Map as MapIcon,
  Check,
  History,
  Award,
  BarChart3,
  Clock,
  KeyRound,
  Info,
  Sparkles,
} from 'lucide-react';
import { IconCastle, IconKeep, IconTower, IconCamp } from './WvwIcons.tsx';

interface WvwAdvisorViewProps {
  topRecommendations: TacticalRecommendation[];
  alternativeRecommendations: TacticalRecommendation[];
  allRanked: TacticalRecommendation[];
  objectives?: WvwCombinedObjective[];
  mapRecommendations: MapRecommendation[];
  match: WvwMatch | null;
  worldsMap: Map<number, WvwWorld>;
  config: AdvisorConfig;
  accountInfo?: Gw2AccountInfo | null;
  dailyProgression?: DailyProgressionData | null;
  isStale?: boolean;
  lastUpdated?: Date | null;
  flipsCount?: number;
  onUpdateConfig: (partial: Partial<AdvisorConfig>) => void;
  onSelectObjective: (obj: WvwCombinedObjective) => void;
  onSendChat: (obj: WvwCombinedObjective) => void;
  onCopyChatLink: (obj: WvwCombinedObjective) => void;
  onTogglePin: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onOpenWeightsModal: () => void;
  onSwitchToMap: (objId?: string) => void;
  onSelectSubTab?: (tab: WvwSubTab) => void;
  onOpenSettings?: () => void;
}

export const WvwAdvisorView: React.FC<WvwAdvisorViewProps> = ({
  topRecommendations,
  alternativeRecommendations,
  allRanked,
  objectives: rawObjectives,
  mapRecommendations,
  match,
  worldsMap,
  config,
  accountInfo,
  dailyProgression,
  isStale = false,
  lastUpdated = null,
  flipsCount = 0,
  onUpdateConfig,
  onSelectObjective,
  onSendChat,
  onCopyChatLink,
  onTogglePin,
  onToggleIgnore,
  onOpenWeightsModal,
  onSwitchToMap,
  onSelectSubTab,
  onOpenSettings,
}) => {
  const { t, lang } = useTranslation();
  const account = useAccountState();
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<WvwOwnerFilter>('all');
  const [statusFilter, setStatusFilter] = useState<WvwStatusFilter>('all');
  const [showBrowser, setShowBrowser] = useState(true);
  const [showIgnored, setShowIgnored] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isGerman = lang === 'de';

  const objectives = useMemo(() => {
    if (rawObjectives && rawObjectives.length > 0) return rawObjectives;
    return allRanked.map((r) => r.objective);
  }, [rawObjectives, allRanked]);

  const rankedById = useMemo(() => {
    const m = new Map<string, TacticalRecommendation>();
    for (const r of allRanked) {
      m.set(r.objective.id, r);
    }
    return m;
  }, [allRanked]);

  const standings = useMemo(() => {
    return computeWvwStandings(match, objectives);
  }, [match, objectives]);

  const rankProgression = useMemo(() => {
    if (!accountInfo || typeof accountInfo.wvw_rank !== 'number') return null;
    return computeWvwRankProgression(accountInfo.wvw_rank);
  }, [accountInfo, lang]);

  const insights = useMemo(() => {
    return generateWvwSituationalInsights(
      objectives,
      match,
      worldsMap,
      config.playerTeam,
      isStale,
      lastUpdated,
    );
  }, [objectives, match, worldsMap, config.playerTeam, isStale, lastUpdated, lang]);

  // Personal WvW items & currencies from account state
  const giftOfBattleCount = account.stockMap.get(19677) ?? 0;
  const memoriesOfBattleCount = account.stockMap.get(71581) ?? 0;
  const badgesOfHonorCount = account.walletMap?.get(15) ?? null;
  const skirmishTicketsCount = account.walletMap?.get(26) ?? null;

  const handleCopy = (obj: WvwCombinedObjective) => {
    onCopyChatLink(obj);
    setCopiedId(obj.id);
    setTimeout(() => setCopiedId((c) => (c === obj.id ? null : c)), 2000);
  };

  // Filtered objective browser list
  const browserObjectives = useMemo(() => {
    const filtered = filterWvwObjectives(objectives, {
      map: config.filterMap,
      type: config.filterType,
      owner: ownerFilter,
      status: statusFilter,
      search: searchQuery,
      activeTeam: config.playerTeam,
      pinnedIds: config.pinnedObjectiveIds,
    });

    // Sort by pinned first, then tactical priority score (if enemy) or PPT
    return [...filtered].sort((a, b) => {
      const recA = rankedById.get(a.id);
      const recB = rankedById.get(b.id);
      if (recA?.isPinned !== recB?.isPinned) return recA?.isPinned ? -1 : 1;
      const scoreA = recA?.priorityScore ?? 0;
      const scoreB = recB?.priorityScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.pointsTick || 0) - (a.pointsTick || 0);
    });
  }, [
    objectives,
    config.filterMap,
    config.filterType,
    ownerFilter,
    statusFilter,
    searchQuery,
    config.playerTeam,
    config.pinnedObjectiveIds,
    rankedById,
  ]);

  // Ignored objectives list
  const ignoredList = useMemo(() => {
    return allRanked.filter((r) => r.isIgnored);
  }, [allRanked]);

  // Best recommended map for maximum WvXP/WvBP
  const topMapRec = mapRecommendations.length > 0 ? mapRecommendations[0] : null;

  const syncAgeSec = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;

  const getMapBiomeLabel = (mapType: WvwMapType) => {
    switch (mapType) {
      case 'Center':
        return t('wvw.biomeEternal');
      case 'RedHome':
        return t('wvw.biomeDesert');
      case 'BlueHome':
        return t('wvw.biomeAlpineBlue');
      case 'GreenHome':
        return t('wvw.biomeAlpineGreen');
    }
  };

  return (
    <div className="wvw-advisor-view">
      {/* 0. CENTRAL WVW TACTICAL OVERVIEW: Public Match Standings + Personal Account Progression */}
      <section className="wvw-tactical-overview-grid" aria-label={t('wvw.overviewTitle')}>
        {/* Left Card: Public Match Standings & Map Control */}
        <div className="wvw-overview-card wvw-public-match-card">
          <div className="wvw-overview-card-header">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="gold" />
              <span className="font-serif font-bold text-sm text-[#f3efe6]">
                {t('wvw.overviewTitle')}
              </span>
              <span className="wvw-source-tag public">{t('wvw.publicMatchData')}</span>
            </div>

            <div className="flex items-center gap-2">
              {syncAgeSec !== null && (
                <span className={`wvw-sync-age-pill font-mono ${isStale ? 'stale' : 'fresh'}`}>
                  <Clock size={11} />
                  <span>{t('wvw.lastSyncAgo', { sec: syncAgeSec })}</span>
                </span>
              )}
              {onSelectSubTab && (
                <div className="wvw-quick-tool-links">
                  <button
                    type="button"
                    className="wvw-tool-chip"
                    onClick={() => onSelectSubTab('map')}
                    title={t('wvw.tabMap')}
                  >
                    <MapIcon size={11} />
                    <span>{t('wvw.tabMap')}</span>
                  </button>
                  <button
                    type="button"
                    className="wvw-tool-chip"
                    onClick={() => onSelectSubTab('dashboard')}
                    title={t('wvw.tabDashboard')}
                  >
                    <BarChart3 size={11} />
                    <span>{t('wvw.tabDashboard')}</span>
                  </button>
                  <button
                    type="button"
                    className="wvw-tool-chip"
                    onClick={() => onSelectSubTab('flips')}
                    title={t('wvw.tabFlips')}
                  >
                    <History size={11} />
                    <span>{flipsCount}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3-Team Live Scoreboard */}
          <div className="wvw-standings-mini-table">
            {(['Red', 'Blue', 'Green'] as WvwTeam[]).map((team) => {
              const row = standings[team];
              const info = resolveTeamNames(team, match, worldsMap);
              const tColor = TEAM_COLORS[team];
              const isMyTeam = config.playerTeam === team;

              return (
                <div
                  key={team}
                  className={`wvw-standing-row ${isMyTeam ? 'is-player-team' : ''}`}
                  style={{ borderLeftColor: tColor.border }}
                >
                  <div className="wvw-standing-team-col">
                    <span
                      className="wvw-team-dot"
                      style={{ backgroundColor: tColor.text }}
                    />
                    <div className="wvw-standing-names">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-bold text-xs" style={{ color: tColor.text }}>
                          {info.mainName}
                        </span>
                        {isMyTeam && (
                          <span className="wvw-my-team-pill">{t('wvw.ownerOwnTeam')}</span>
                        )}
                      </div>
                      {info.linkedNames.length > 0 && (
                        <span className="dim text-[10px] truncate">
                          + {info.linkedNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="wvw-standing-metrics font-mono">
                    <div className="wvw-metric-cell" title={t('wvw.victoryPoints')}>
                      <span className="dim text-[10px]">VP</span>
                      <strong className="gold text-xs">{fmtInt(row.victoryPoints)}</strong>
                    </div>
                    <div className="wvw-metric-cell" title={t('wvw.pointsTick')}>
                      <span className="dim text-[10px]">PPT</span>
                      <strong className="good text-xs">+{row.ppt}</strong>
                    </div>
                    <div className="wvw-metric-cell" title={t('wvw.kdRatio')}>
                      <span className="dim text-[10px]">K/D</span>
                      <span className="text-xs">{row.kdRatio.toFixed(2)}</span>
                    </div>
                    <div className="wvw-metric-structures" title={t('wvw.structures')}>
                      <span className="struct-chip" title={t('wvw.castle')}>
                        <IconCastle size={11} /> {row.castles}
                      </span>
                      <span className="struct-chip" title={t('wvw.keeps')}>
                        <IconKeep size={11} /> {row.keeps}
                      </span>
                      <span className="struct-chip" title={t('wvw.towers')}>
                        <IconTower size={11} /> {row.towers}
                      </span>
                      <span className="struct-chip" title={t('wvw.camps')}>
                        <IconCamp size={11} /> {row.camps}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Biomes Quick Strip + EOTM API Note */}
          <div className="wvw-biomes-strip">
            {(['Center', 'RedHome', 'BlueHome', 'GreenHome'] as WvwMapType[]).map((mType) => {
              const isSelected = config.filterMap === mType;
              const mapCount = objectives.filter((o) => o.mapType === mType).length;
              return (
                <button
                  key={mType}
                  type="button"
                  className={`wvw-biome-chip ${isSelected ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateConfig({ filterMap: isSelected ? 'all' : mType })
                  }
                  title={`${getMapBiomeLabel(mType)} (${mapCount})`}
                >
                  <MapIcon size={11} className="gold" />
                  <span>{getMapBiomeLabel(mType)}</span>
                  <span className="font-mono dim text-[10px]">({mapCount})</span>
                </button>
              );
            })}
          </div>
          <div className="wvw-eotm-note dim text-[10px]">
            <Info size={11} className="inline mr-1 opacity-75" />
            <span>{t('wvw.eotmNotice')}</span>
          </div>
        </div>

        {/* Right Card: Personal WvW Progression (Clearly separated account data) */}
        <div className="wvw-overview-card wvw-personal-progression-card">
          <div className="wvw-overview-card-header">
            <div className="flex items-center gap-2">
              <Award size={15} className="gold" />
              <span className="font-serif font-bold text-sm text-[#f3efe6]">
                {t('wvw.personalAccountData')}
              </span>
              <span className="wvw-source-tag personal">
                {accountInfo ? accountInfo.name : 'API Key'}
              </span>
            </div>
          </div>

          {rankProgression ? (
            <div className="wvw-personal-body">
              {/* Rank & Prestige Title Banner */}
              <div className="wvw-rank-banner">
                <div className="wvw-rank-main">
                  <span className="dim text-[11px]">{t('wvw.rankTitleLabel')}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="wvw-rank-number font-mono gold">
                      {fmtInt(rankProgression.rank)}
                    </span>
                    <span className={`wvw-rank-title-badge tier-${rankProgression.tierId} font-serif`}>
                      {rankProgression.titleName}
                    </span>
                  </div>
                </div>

                <div className="wvw-rank-progress-col">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="dim">
                      {rankProgression.nextTierName && rankProgression.nextTierRank
                        ? t('wvw.nextTierLabel', {
                            tier: rankProgression.nextTierName,
                            rank: fmtInt(rankProgression.nextTierRank),
                          })
                        : t('wvw.maxTierReached')}
                    </span>
                    <span className="font-mono gold">{rankProgression.tierProgressPct}%</span>
                  </div>
                  <ProgressBar value={rankProgression.tierProgressPct / 100} tone="gold" slim />
                </div>
              </div>

              {/* Ability Mastery & Wizard's Vault Row */}
              <div className="wvw-personal-bars-row">
                <div className="wvw-personal-mini-stat">
                  <div className="flex justify-between text-[11px]">
                    <span className="dim">{t('wvw.abilityMastery')}</span>
                    <span className="font-mono text-xs good">
                      {rankProgression.isAbilityMaxed
                        ? `✓ ${t('wvw.abilityMastered')}`
                        : `${fmtInt(rankProgression.abilityPointsEarned)} / ${fmtInt(rankProgression.abilityPointsMax)}`}
                    </span>
                  </div>
                  <ProgressBar
                    value={rankProgression.abilityMasteryPct / 100}
                    tone={rankProgression.isAbilityMaxed ? 'gold' : 'green'}
                    slim
                  />
                </div>

                {dailyProgression?.wizardsVault && (
                  <div className="wvw-personal-mini-stat">
                    <div className="flex justify-between text-[11px]">
                      <span className="dim">{t('wvw.wizardsVaultDaily')}</span>
                      <span className="font-mono text-xs gold">
                        {dailyProgression.wizardsVault.meta_progress_current} / {dailyProgression.wizardsVault.meta_progress_complete}
                      </span>
                    </div>
                    <ProgressBar
                      value={
                        dailyProgression.wizardsVault.meta_progress_complete > 0
                          ? dailyProgression.wizardsVault.meta_progress_current /
                            dailyProgression.wizardsVault.meta_progress_complete
                          : 0
                      }
                      tone="gold"
                      slim
                    />
                  </div>
                )}
              </div>

              {/* Account WvW Stockpile & Currencies */}
              <div className="wvw-personal-resources-grid">
                <div className="wvw-res-pill" title="Item ID 19677 (Gift of Battle)">
                  <Sparkles size={12} className="gold" />
                  <span className="dim text-[11px]">{t('wvw.giftOfBattle')}:</span>
                  <strong className="font-mono text-xs">
                    {account.hasStockData ? fmtInt(giftOfBattleCount) : '–'}
                  </strong>
                </div>
                <div className="wvw-res-pill" title="Item ID 71581 (Memory of Battle)">
                  <Zap size={12} className="text-amber-400" />
                  <span className="dim text-[11px]">{t('wvw.memoriesOfBattle')}:</span>
                  <strong className="font-mono text-xs">
                    {account.hasStockData ? fmtInt(memoriesOfBattleCount) : '–'}
                  </strong>
                </div>
                <div className="wvw-res-pill" title="Wallet Currency ID 15 (Badges of Honor)">
                  <Shield size={12} className="text-sky-400" />
                  <span className="dim text-[11px]">{t('wvw.badgesOfHonor')}:</span>
                  <strong className="font-mono text-xs">
                    {badgesOfHonorCount !== null ? fmtInt(badgesOfHonorCount) : '–'}
                  </strong>
                </div>
                <div className="wvw-res-pill" title="Wallet Currency ID 26 (WvW Skirmish Claim Tickets)">
                  <Award size={12} className="text-emerald-400" />
                  <span className="dim text-[11px]">{t('wvw.skirmishTickets')}:</span>
                  <strong className="font-mono text-xs">
                    {skirmishTicketsCount !== null ? fmtInt(skirmishTicketsCount) : '–'}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="wvw-personal-empty">
              <KeyRound size={20} className="gold shrink-0" />
              <div className="wvw-personal-empty-text">
                <p className="text-xs text-[#d6d1c5] leading-relaxed">
                  {t('wvw.connectKeyForPersonal')}
                </p>
                {onOpenSettings && (
                  <button
                    type="button"
                    className="gw2-btn-sm mt-2"
                    onClick={onOpenSettings}
                  >
                    <KeyRound size={12} className="mr-1 inline" />
                    <span>{t('wvw.configureKeyBtn')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 0.5 DETERMINISTIC ACTIONABLE INSIGHTS STRIP */}
      {insights.length > 0 && (
        <section className="wvw-insights-strip" aria-label={t('wvw.situationalInsights')}>
          <div className="wvw-insights-grid">
            {insights.slice(0, 4).map((ins) => (
              <div
                key={ins.id}
                className={`wvw-insight-card severity-${ins.severity} ${ins.targetMap ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (ins.targetMap) {
                    onUpdateConfig({ filterMap: ins.targetMap });
                  } else if (ins.kind === 'vulnerable_t0') {
                    setStatusFilter('vulnerable');
                    setShowBrowser(true);
                  }
                }}
                title={ins.detail}
              >
                <div className="wvw-insight-title-row">
                  {ins.severity === 'warn' && <AlertTriangle size={13} className="warn shrink-0" />}
                  {ins.severity === 'good' && <Zap size={13} className="good shrink-0" />}
                  {ins.severity === 'info' && <Shield size={13} className="gold shrink-0" />}
                  <span className="font-serif font-bold text-xs">{ins.title}</span>
                </div>
                <p className="dim text-[11px] leading-snug">{ins.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 1. Filter and settings bar */}
      <div className="wvw-filter-bar">
        {/* Presets */}
        <div className="wvw-preset-selector">
          <span className="dim text-xs mr-1 font-serif">{t('wvw.preset')}:</span>
          {(['balanced', 'aggressive', 'territorial', 'roamer'] as AdvisorPreset[]).map((p) => {
            const active = config.preset === p;
            const presetInfo = ADVISOR_PRESETS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    preset: p,
                    weights: { ...presetInfo.weights },
                  })
                }
                className={`wvw-preset-pill ${active ? 'active' : ''}`}
                title={isGerman ? presetInfo.descDe : presetInfo.descEn}
              >
                {isGerman ? presetInfo.labelDe.split(' ')[0] : presetInfo.labelEn.split(' ')[0]}
              </button>
            );
          })}

          <button
            type="button"
            className="wvw-weights-btn"
            onClick={onOpenWeightsModal}
            title={t('wvw.weightsConfig')}
          >
            <Sliders size={13} className="mr-1 inline" />
            <span>{t('wvw.weightsConfig')}</span>
          </button>
        </div>

        {/* Map, Type, and Owner Filters */}
        <div className="wvw-filter-row">
          {/* Map Filter */}
          <div className="wvw-filter-pills">
            <span className="dim text-xs font-serif">{t('wvw.filterMap')}:</span>
            {[
              { id: 'all', label: t('wvw.filterAll') },
              { id: 'Center', label: t('wvw.mapEbgShort') },
              { id: 'RedHome', label: t('wvw.mapRedShort') },
              { id: 'BlueHome', label: t('wvw.mapBlueShort') },
              { id: 'GreenHome', label: t('wvw.mapGreenShort') },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`wvw-filter-btn ${config.filterMap === m.id ? 'active' : ''}`}
                onClick={() => onUpdateConfig({ filterMap: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="wvw-filter-pills">
            <span className="dim text-xs font-serif">{t('wvw.filterType')}:</span>
            {[
              { id: 'all', label: t('wvw.filterAll') },
              { id: 'Castle', label: t('wvw.castles') },
              { id: 'Keep', label: t('wvw.keeps') },
              { id: 'Tower', label: t('wvw.towers') },
              { id: 'Camp', label: t('wvw.camps') },
            ].map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                className={`wvw-filter-btn ${config.filterType === tItem.id ? 'active' : ''}`}
                onClick={() => onUpdateConfig({ filterType: tItem.id })}
              >
                {tItem.label}
              </button>
            ))}
          </div>

          {/* Owner Filter */}
          <div className="wvw-filter-pills">
            <span className="dim text-xs font-serif">{t('wvw.filterOwner')}:</span>
            {(
              [
                { id: 'all', label: t('wvw.allTeams') },
                { id: 'enemy', label: t('wvw.ownerEnemyOnly') },
                { id: 'own', label: t('wvw.ownerOwnTeam') },
                { id: 'Red', label: t('wvw.teamRed') },
                { id: 'Blue', label: t('wvw.teamBlue') },
                { id: 'Green', label: t('wvw.teamGreen') },
              ] as { id: WvwOwnerFilter; label: string }[]
            ).map((ow) => (
              <button
                key={ow.id}
                type="button"
                className={`wvw-filter-btn ${ownerFilter === ow.id ? 'active' : ''}`}
                onClick={() => setOwnerFilter(ow.id)}
              >
                {ow.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. PROMINENT MAP RECOMMENDATION (FOR MAXIMUM WvXP / WvBP) */}
      {topMapRec && (
        <section className="wvw-map-rec-hero-card" aria-label={isGerman ? 'Kartenempfehlung für maximale WvXP' : 'Map recommendation for maximum WvXP'}>
          <div className="wvw-map-rec-hero-header">
            <div className="wvw-map-rec-title-wrap">
              <div className="wvw-map-rec-icon-glow">
                <Flame size={20} className="text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="wvw-map-rec-tag">
                    {isGerman ? 'Top WvXP & Belohnungspfad (WvBP)' : 'Top WvXP & Skirmish Track'}
                  </span>
                  <span className="wvw-map-rec-badge">
                    {isGerman ? topMapRec.badgeDe : topMapRec.badgeEn}
                  </span>
                  <span className="dim text-xs font-mono font-bold">
                    {isGerman ? 'Chance:' : 'Rating:'} <strong className="gold">{topMapRec.score}%</strong>
                  </span>
                </div>
                <h3 className="wvw-map-rec-title font-serif">
                  {isGerman ? topMapRec.mapNameDe : topMapRec.mapNameEn}
                </h3>
              </div>
            </div>

            <div className="wvw-map-rec-actions">
              <button
                type="button"
                className={`wvw-hero-action-btn ${config.filterMap === topMapRec.mapType ? 'is-active' : ''}`}
                onClick={() => onUpdateConfig({ filterMap: topMapRec.mapType })}
                title={isGerman ? 'Nur Ziele dieser Karte anzeigen' : 'Filter to this map'}
              >
                <Filter size={13} className="mr-1 inline" />
                <span>{config.filterMap === topMapRec.mapType ? t('wvw.mapFiltered') : t('wvw.focusMap')}</span>
              </button>

              <button
                type="button"
                className="wvw-hero-primary-btn"
                onClick={() => onSwitchToMap()}
                title={isGerman ? 'Zur interaktiven Lagekarte wechseln' : 'Open tactical map'}
              >
                <MapIcon size={14} className="mr-1.5 inline" />
                <span>{t('wvw.viewOnMap')}</span>
              </button>
            </div>
          </div>

          {/* Quick stats bar of recommended map */}
          <div className="wvw-map-rec-body">
            <div className="wvw-map-rec-stats-strip">
              <div className="wvw-map-stat-pill" title={isGerman ? 'Lager ohne RI (sofortige Stufe 6 Teilnahme)' : 'Camps without RI (instant tier 6 participation)'}>
                <IconCamp size={13} className="gold" />
                <span><strong>{topMapRec.stats.enemyCampsAvailable}</strong> {isGerman ? 'Lager bereit' : 'Camps ready'}</span>
              </div>

              <div className="wvw-map-stat-pill" title={isGerman ? 'Festen & Türme ohne RI-Schutz' : 'Keeps & towers without RI protection'}>
                <IconTower size={13} className="gold" />
                <span><strong>{topMapRec.stats.enemyTowersAvailable + topMapRec.stats.enemyKeepsAvailable}</strong> {isGerman ? 'Strukturen offen' : 'Structures open'}</span>
              </div>

              {topMapRec.stats.t0VulnerableCount > 0 && (
                <div className="wvw-map-stat-pill highlight" title={isGerman ? 'Frische T0-Strukturen (niedrigste Mauer-HP, schnelle Einnahme)' : 'Fresh T0 structures (lowest wall/gate HP, quick capture)'}>
                  <Zap size={13} className="text-amber-400" />
                  <span><strong>{topMapRec.stats.t0VulnerableCount}x</strong> {isGerman ? 'T0 Schwachstellen' : 'T0 Weak Spots'}</span>
                </div>
              )}

              {topMapRec.stats.castleAvailable && (
                <div className="wvw-map-stat-pill castle-hot" title={isGerman ? 'Schloss Steinnebel angreifbar für maximale Event-WXP' : 'Stonemist Castle open for max event WXP'}>
                  <IconCastle size={13} className="text-amber-300" />
                  <span>{isGerman ? 'Steinnebel (SMC) angreifbar' : 'Stonemist (SMC) open'}</span>
                </div>
              )}

              {topMapRec.stats.recentFlipsCount > 0 && (
                <div className="wvw-map-stat-pill" title={isGerman ? 'In dieser Sitzung erfasste Flips auf dieser Karte' : 'Session flips logged on this map'}>
                  <History size={13} className="dim" />
                  <span><strong>{topMapRec.stats.recentFlipsCount}</strong> Flips</span>
                </div>
              )}
            </div>

            {/* Reasoning & Justifications */}
            <div className="wvw-map-rec-reasons">
              {(isGerman ? topMapRec.reasonsDe : topMapRec.reasonsEn).slice(0, 3).map((reason, idx) => (
                <div key={idx} className="wvw-map-reason-item">
                  <span className="wvw-map-reason-dot">›</span>
                  <span className="text-xs text-[#e2dec9] leading-tight">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Top 3 Tactical Recommendations */}
      <section className="wvw-recommendations-section">
        <div className="wvw-section-header">
          <div className="flex items-center gap-2">
            <Crosshair size={18} className="gold" />
            <h3 className="wvw-section-title font-serif">{t('wvw.topRecommendations')}</h3>
          </div>
          <span className="dim text-xs">
            {isGerman ? 'Berechnet für Team' : 'Calculated for Team'}{' '}
            <strong className={config.playerTeam.toLowerCase()}>{getOwnerDisplayName(config.playerTeam, match, worldsMap, lang)}</strong> • {isGerman ? 'Profil:' : 'Profile:'}{' '}
            <span className="gold">{config.preset}</span>
          </span>
        </div>

        {topRecommendations.length === 0 ? (
          <div className="wvw-empty-state">
            <Crosshair size={32} className="dim mb-2" />
            <p>{t('wvw.noObjectivesFound')}</p>
            <button
              type="button"
              className="gw2-btn-sm mt-3"
              onClick={() => {
                onUpdateConfig({ filterMap: 'all', filterType: 'all' });
                setOwnerFilter('all');
                setStatusFilter('all');
              }}
            >
              {t('wvw.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="wvw-top3-grid">
            {topRecommendations.map((rec, index) => {
              const obj = rec.objective;
              const ownerColor = TEAM_COLORS[obj.owner] || TEAM_COLORS.Neutral;
              const ownerDisplay = getOwnerDisplayName(obj.owner, match, worldsMap, lang);
              const isJustCopied = copiedId === obj.id;

              const scoreClass =
                rec.priorityScore >= 80 ? 'score-high' : rec.priorityScore >= 50 ? 'score-mid' : 'score-low';

              return (
                <div
                  key={obj.id}
                  className={`wvw-recommendation-card rank-${index + 1} ${rec.isPinned ? 'is-pinned' : ''}`}
                >
                  {/* Rank badge & priority ring */}
                  <div className="wvw-rec-header">
                    <div className="wvw-rank-badge font-serif">
                      <span>#{index + 1}</span>
                      {rec.isNewOrChanged && (
                        <span className="wvw-new-pill" title={isGerman ? 'Kürzlich in die Top 3 aufgestiegen' : 'Recently promoted to Top 3'}>
                          <Zap size={10} className="inline mr-0.5" />
                          {t('wvw.newBadge')}
                        </span>
                      )}
                    </div>

                    <div className="wvw-priority-display">
                      <div className={`wvw-priority-badge ${scoreClass}`}>
                        <span className="wvw-prio-val font-mono">{rec.priorityScore}</span>
                        <span className="wvw-prio-label">{t('wvw.priority')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Objective name, type & owner */}
                  <div
                    className="wvw-rec-body cursor-pointer"
                    onClick={() => onSelectObjective(obj)}
                    title={isGerman ? 'Klicken, um Zieldetails anzuzeigen' : 'Click to view objective details'}
                  >
                    <div className="wvw-rec-title-row">
                      <span
                        className="wvw-owner-tag"
                        style={{
                          backgroundColor: ownerColor.bg,
                          color: ownerColor.text,
                          borderColor: ownerColor.border,
                        }}
                        title={`${t('wvw.filterOwner')}: ${ownerDisplay}`}
                      >
                        {ownerDisplay}
                      </span>
                      <h4 className="wvw-rec-name font-serif">{obj.nameEn && !isGerman ? obj.nameEn : obj.name}</h4>
                    </div>

                    <div className="wvw-rec-meta-row dim text-xs">
                      <span>
                        {obj.type === 'Castle'
                          ? t('wvw.castle')
                          : obj.type === 'Keep'
                          ? t('wvw.keep')
                          : obj.type === 'Tower'
                          ? t('wvw.tower')
                          : obj.type === 'Camp'
                          ? t('wvw.camp')
                          : obj.type === 'Ruins'
                          ? t('wvw.ruins')
                          : obj.type}
                      </span>
                      <span className="sep">•</span>
                      <span>{getMapBiomeLabel(obj.mapType)}</span>
                      <span className="sep">•</span>
                      <span className="good font-mono font-bold">+{obj.pointsTick} PPT</span>
                    </div>

                    {/* RI Status Warning */}
                    {rec.riActive && (
                      <div className="wvw-ri-alert-box">
                        <AlertTriangle size={13} className="warn shrink-0" />
                        <span className="text-xs warn font-bold">
                          {isGerman
                            ? `RI Aktiv: Aufseher immun (${Math.floor(rec.riSecondsRemaining / 60)}m ${rec.riSecondsRemaining % 60}s)`
                            : `RI Active: Supervisor invulnerable (${Math.floor(rec.riSecondsRemaining / 60)}m ${rec.riSecondsRemaining % 60}s)`}
                        </span>
                      </div>
                    )}

                    {/* Reasoning list */}
                    <div className="wvw-rec-reasons">
                      {(isGerman ? rec.reasons : (rec.reasonsEn || rec.reasons)).map((r, ri) => (
                        <div key={ri} className="wvw-reason-item">
                          <span className="wvw-reason-bullet">›</span>
                          <span className="text-xs">{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Factor bars */}
                    <div className="wvw-factors-bar-group">
                      <div className="wvw-factor-mini" title={`${t('wvw.strategicBase')}: ${rec.factors.strategicBase}/100`}>
                        <span className="dim">{isGerman ? 'Basis:' : 'Base:'}</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-amber-500"
                            style={{ width: `${rec.factors.strategicBase}%` }}
                          />
                        </div>
                      </div>
                      <div className="wvw-factor-mini" title={`${t('wvw.leaderSwing')}: ${rec.factors.leaderSwing}/100`}>
                        <span className="dim">Leader:</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-blue-500"
                            style={{ width: `${rec.factors.leaderSwing}%` }}
                          />
                        </div>
                      </div>
                      <div className="wvw-factor-mini" title={`${t('wvw.vulnerability')}: ${rec.factors.vulnerability}/100`}>
                        <span className="dim">T0/RI:</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-emerald-500"
                            style={{ width: `${rec.factors.vulnerability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="wvw-rec-actions">
                    <button
                      type="button"
                      className="wvw-btn-action-primary"
                      onClick={() => onSendChat(obj)}
                      title={isGerman ? 'Taktik-Aufruf in die Zwischenablage kopieren (im Spiel mit [Enter] & [Strg+V] einfügen)' : 'Copy tactical callout to clipboard (paste in game with [Enter] & [Ctrl+V])'}
                    >
                      <MessageSquare size={13} />
                      <span>{t('wvw.sendChat')}</span>
                    </button>

                    <button
                      type="button"
                      className="wvw-btn-action-secondary"
                      onClick={() => handleCopy(obj)}
                      title={t('wvw.copyChatLink')}
                    >
                      {isJustCopied ? <Check size={13} className="good" /> : <Copy size={13} />}
                      <span>{isJustCopied ? (isGerman ? 'Kopiert!' : 'Copied!') : t('wvw.copyChatLink')}</span>
                    </button>

                    <button
                      type="button"
                      className={`wvw-btn-icon ${rec.isPinned ? 'is-active' : ''}`}
                      onClick={() => onTogglePin(obj.id)}
                      title={rec.isPinned ? t('wvw.unpin') : t('wvw.pin')}
                    >
                      <Star size={14} fill={rec.isPinned ? '#d2b268' : 'none'} />
                    </button>

                    <button
                      type="button"
                      className="wvw-btn-icon"
                      onClick={() => onToggleIgnore(obj.id)}
                      title={t('wvw.ignore')}
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. COMPLETE OBJECTIVE OVERVIEW & FILTERABLE TABLE */}
      <section className="wvw-alternatives-section">
        <div
          className="wvw-collapsible-header cursor-pointer"
          onClick={() => setShowBrowser((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            {showBrowser ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <h4 className="font-serif font-bold text-sm">
              {t('wvw.objectiveBrowserTitle', { count: browserObjectives.length })}
            </h4>
          </div>
          <span className="dim text-xs">
            {showBrowser ? t('wvw.collapse') : t('wvw.expand')}
          </span>
        </div>

        {showBrowser && (
          <div className="wvw-alternatives-body">
            {/* Search & Status Filter Bar */}
            <div className="wvw-browser-toolbar">
              <div className="wvw-table-search-bar">
                <Search size={14} className="dim mr-2" />
                <input
                  type="text"
                  placeholder={t('wvw.searchTargets')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="wvw-table-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="wvw-unignore-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="wvw-status-filter-group">
                {(
                  [
                    { id: 'all', label: t('wvw.statusAll') },
                    { id: 'vulnerable', label: t('wvw.statusVulnerable') },
                    { id: 'ri', label: t('wvw.statusRi') },
                    { id: 'claimed', label: t('wvw.statusClaimed') },
                    { id: 'pinned', label: t('wvw.statusPinned') },
                  ] as { id: WvwStatusFilter; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`wvw-filter-btn ${statusFilter === st.id ? 'active' : ''}`}
                    onClick={() => setStatusFilter(st.id)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="wvw-table-scroll">
              <table className="wvw-table">
                <thead>
                  <tr>
                    <th>{t('wvw.priority')}</th>
                    <th>{t('wvw.target')}</th>
                    <th>{t('wvw.filterMap')}</th>
                    <th>{t('wvw.filterType')}</th>
                    <th>{t('wvw.filterOwner')}</th>
                    <th>PPT</th>
                    <th>{t('wvw.yaks')}</th>
                    <th>{t('wvw.status')}</th>
                    <th className="text-right">{t('wvw.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {browserObjectives.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center dim py-4">
                        {t('wvw.noObjectivesFound')}
                      </td>
                    </tr>
                  ) : (
                    browserObjectives.map((o) => {
                      const rec = rankedById.get(o.id);
                      const ownerColor = TEAM_COLORS[o.owner] || TEAM_COLORS.Neutral;
                      const ownerDisplay = getOwnerDisplayName(o.owner, match, worldsMap, lang);
                      const isPinned = config.pinnedObjectiveIds.includes(o.id);
                      const estTier =
                        o.yaksDelivered >= 140
                          ? 'T3'
                          : o.yaksDelivered >= 60
                          ? 'T2'
                          : o.yaksDelivered >= 20
                          ? 'T1'
                          : 'T0';

                      return (
                        <tr
                          key={o.id}
                          className={`wvw-table-row ${isPinned ? 'is-pinned-row' : ''}`}
                          onClick={() => onSelectObjective(o)}
                        >
                          <td>
                            {o.owner === config.playerTeam ? (
                              <span className="dim font-mono text-xs">{t('wvw.ownerOwnTeam')}</span>
                            ) : (
                              <span className="font-mono font-bold text-xs gold">
                                {rec?.priorityScore ?? '–'}
                              </span>
                            )}
                          </td>
                          <td className="font-serif font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{o.nameEn && !isGerman ? o.nameEn : o.name}</span>
                              {o.guildInfo && (
                                <span className="wvw-guild-tag-mini font-mono">
                                  [{o.guildInfo.tag}]
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="dim text-xs" title={getMapBiomeLabel(o.mapType)}>
                            {o.mapType === 'Center'
                              ? t('wvw.mapEbgShort')
                              : o.mapType === 'RedHome'
                              ? `${t('wvw.mapRedShort')} (Desert)`
                              : o.mapType === 'BlueHome'
                              ? `${t('wvw.mapBlueShort')} (Alpine)`
                              : `${t('wvw.mapGreenShort')} (Alpine)`}
                          </td>
                          <td className="dim text-xs">
                            {o.type === 'Castle'
                              ? t('wvw.castle')
                              : o.type === 'Keep'
                              ? t('wvw.keep')
                              : o.type === 'Tower'
                              ? t('wvw.tower')
                              : o.type === 'Camp'
                              ? t('wvw.camp')
                              : o.type === 'Ruins'
                              ? t('wvw.ruins')
                              : o.type}
                          </td>
                          <td>
                            <span
                              className="wvw-owner-tag-sm"
                              style={{
                                backgroundColor: ownerColor.bg,
                                color: ownerColor.text,
                                borderColor: ownerColor.border,
                              }}
                              title={`${t('wvw.filterOwner')}: ${ownerDisplay}`}
                            >
                              {ownerDisplay}
                            </span>
                          </td>
                          <td className="good font-mono text-xs">+{o.pointsTick}</td>
                          <td className="font-mono text-xs dim" title={t('wvw.upgradeTier')}>
                            {o.yaksDelivered > 0 ? `${estTier} (${o.yaksDelivered})` : 'T0 (0)'}
                          </td>
                          <td className="text-xs">
                            {o.isRiActive ? (
                              <span className="warn font-mono">
                                RI ({Math.floor(o.riSecondsRemaining / 60)}m {o.riSecondsRemaining % 60}s)
                              </span>
                            ) : o.secondsSinceFlip !== null && o.secondsSinceFlip < 1200 ? (
                              <span className="good">
                                {isGerman ? 'T0 (Frisch)' : 'T0 (Fresh)'}{' '}
                                {Math.floor(o.secondsSinceFlip / 60)}m
                              </span>
                            ) : o.secondsSinceFlip !== null ? (
                              <span className="dim">{Math.floor(o.secondsSinceFlip / 60)}m</span>
                            ) : (
                              <span className="dim">–</span>
                            )}
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="wvw-table-icon-btn"
                                onClick={() => onSwitchToMap(o.id)}
                                title={t('wvw.viewOnMap')}
                              >
                                <MapIcon size={12} />
                              </button>
                              <button
                                type="button"
                                className="wvw-table-icon-btn"
                                onClick={() => onSendChat(o)}
                                title={t('wvw.sendChat')}
                              >
                                <MessageSquare size={12} />
                              </button>
                              <button
                                type="button"
                                className="wvw-table-icon-btn"
                                onClick={() => handleCopy(o)}
                                title={t('wvw.copyChatLink')}
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                type="button"
                                className="wvw-table-icon-btn"
                                onClick={() => onTogglePin(o.id)}
                                title={isPinned ? t('wvw.unpin') : t('wvw.pin')}
                              >
                                <Star size={12} fill={isPinned ? '#d2b268' : 'none'} />
                              </button>
                              <button
                                type="button"
                                className="wvw-table-icon-btn"
                                onClick={() => onToggleIgnore(o.id)}
                                title={t('wvw.ignore')}
                              >
                                <EyeOff size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 5. Ignored objectives management */}
      {ignoredList.length > 0 && (
        <section className="wvw-ignored-section">
          <div
            className="wvw-collapsible-header cursor-pointer"
            onClick={() => setShowIgnored((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              {showIgnored ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span className="dim text-xs font-serif font-bold">
                {t('wvw.ignoredObjectives')} ({ignoredList.length})
              </span>
            </div>
            <span className="dim text-[11px]">
              {showIgnored ? t('wvw.hide') : t('wvw.show')}
            </span>
          </div>

          {showIgnored && (
            <div className="wvw-ignored-chips">
              {ignoredList.map((ign) => (
                <div key={ign.objective.id} className="wvw-ignored-chip">
                  <span>{ign.objective.nameEn && !isGerman ? ign.objective.nameEn : ign.objective.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleIgnore(ign.objective.id)}
                    className="wvw-unignore-btn"
                    title={t('wvw.unignore')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Data quality and uncertainty disclaimer */}
      <footer className="wvw-disclaimer-box">
        <div className="flex items-start gap-2">
          <Shield size={14} className="gold shrink-0 mt-0.5" />
          <p className="dim text-[11px] leading-relaxed">
            {t('wvw.uncertaintyNotice')}
          </p>
        </div>
      </footer>
    </div>
  );
};
