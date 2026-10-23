import React, { useState, useMemo } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Search,
  Trophy,
  Compass,
  MessageSquare,
  Star,
  X,
  Flame,
  Sparkles,
  Clock,
  Shield,
  Key,
} from 'lucide-react';
import {
  GLOBAL_ACHIEVEMENTS,
  GlobalAchievementItem,
  AchievementCategory,
  getAchievementTitle,
  getAchievementDesc,
  getAchievementCategoryLabel,
  getAchievementTierInfo,
  getAchievementRewardTitle,
  getAchievementRewardItem,
  getObjectiveTitle,
} from '../data/achievements';
import type { EventInstance } from '../types';
import type { Gw2AccountInfo, Gw2AccountAchievement } from '../data/gw2Api';
import { ProgressBar } from './common/ui';
import { formatCountdown, getEventZone } from '../data/events';
import { useTranslation } from '../i18n';

interface AchievementsViewProps {
  upcomingInstances: EventInstance[];
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  onSwitchToEvents: () => void;
  accountInfo?: Gw2AccountInfo | null;
  userAchievements?: Map<number, Gw2AccountAchievement>;
  onOpenSettings?: () => void;
}

const STORAGE_KEY_WATCHLIST = 'gw2_watchlist_achievements';

interface CategoryTabOption {
  id: 'all' | AchievementCategory | 'watchlist';
  label: string;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  upcomingInstances,
  onSendMessage,
  onTeleport,
  onSwitchToEvents,
  accountInfo,
  userAchievements,
  onOpenSettings,
}) => {
  const { t, lang } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<'all' | AchievementCategory | 'watchlist'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inprogress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({});

  // Pinned watchlist loaded from localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHLIST);
      return saved ? JSON.parse(saved) : ['daily-completer', 'wb-tequatl-meta'];
    } catch {
      return ['daily-completer', 'wb-tequatl-meta'];
    }
  });

  const categoryTabs: CategoryTabOption[] = [
    { id: 'all', label: t('achievements.all') },
    { id: 'watchlist', label: t('achievements.watchlist') },
    { id: 'daily', label: t('achievements.daily') },
    { id: 'worldboss', label: t('achievements.worldboss') },
    { id: 'exploration', label: t('achievements.exploration') },
    { id: 'fractals', label: t('achievements.fractals') },
    { id: 'collections', label: t('achievements.collections') },
  ];

  const toggleWatchlist = (achId: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(achId) ? prev.filter((id) => id !== achId) : [...prev, achId];
      try {
        localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save watchlist', e);
      }
      return next;
    });
  };

  const toggleObjectives = (achId: string) => {
    setExpandedObjectives((prev) => ({
      ...prev,
      [achId]: !prev[achId],
    }));
  };

  const hasSyncedApiKey = Boolean(accountInfo && userAchievements && userAchievements.size > 0);

  // Merge live user account progress into achievements
  const mergedAchievements = useMemo<GlobalAchievementItem[]>(() => {
    return GLOBAL_ACHIEVEMENTS.map((item) => {
      // If user has a synced API key and record for this achievement: load REAL data!
      if (hasSyncedApiKey && item.gw2Id && userAchievements && userAchievements.has(item.gw2Id)) {
        const u = userAchievements.get(item.gw2Id)!;
        const isDone = Boolean(u.done);
        const max = u.max !== undefined && u.max > 0 ? u.max : (item.progressMax ?? 1);
        const cur = u.current !== undefined ? u.current : (isDone ? max : 0);

        let tierInfo = item.tierInfo;
        let tierInfoEn = item.tierInfoEn;
        if (!tierInfo && isDone) {
          tierInfo = 'Abgeschlossen';
          tierInfoEn = 'Completed';
        } else if (!tierInfo && cur > 0 && max > 1) {
          tierInfo = `${cur} / ${max}`;
          tierInfoEn = `${cur} / ${max}`;
        }

        const objectives = item.objectives?.map((obj, idx) => ({
          ...obj,
          done: isDone || (u.bits ? u.bits.includes(idx) : false),
        }));

        return {
          ...item,
          isCompleted: isDone,
          progressCurrent: cur,
          progressMax: max,
          tierInfo,
          tierInfoEn,
          objectives,
        };
      }

      // If no API key or user hasn't made progress on it: strictly 0 progress, not completed!
      const max = item.progressMax ?? 1;
      return {
        ...item,
        isCompleted: false,
        progressCurrent: 0,
        progressMax: max,
        tierInfo: item.tierInfo || (hasSyncedApiKey ? (lang === 'en' ? 'Not started' : 'Nicht begonnen') : undefined),
        tierInfoEn: item.tierInfoEn || (hasSyncedApiKey ? 'Not started' : undefined),
        objectives: item.objectives?.map((obj) => ({
          ...obj,
          done: false,
        })),
      };
    });
  }, [userAchievements, hasSyncedApiKey, lang]);

  // Overall account stats
  const totalAvailableAp = useMemo(() => {
    return mergedAchievements.reduce((sum, item) => sum + item.ap, 0);
  }, [mergedAchievements]);

  const completedCount = useMemo(() => {
    return mergedAchievements.filter((item) => item.isCompleted).length;
  }, [mergedAchievements]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: mergedAchievements.length,
      watchlist: watchlist.length,
      daily: 0,
      worldboss: 0,
      exploration: 0,
      fractals: 0,
      collections: 0,
    };
    for (const a of mergedAchievements) {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    }
    return counts;
  }, [mergedAchievements, watchlist]);

  // Filtered achievements list
  const filteredAchievements = useMemo(() => {
    return mergedAchievements.filter((item) => {
      // Category filter
      if (selectedCategory === 'watchlist') {
        if (!watchlist.includes(item.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (item.category !== selectedCategory) return false;
      }

      // Status filter
      if (statusFilter === 'completed' && !item.isCompleted) return false;
      if (statusFilter === 'inprogress' && item.isCompleted) return false;

      // Text search (checks both German and English titles, descriptions, categories, rewards, objectives)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle =
          item.title.toLowerCase().includes(query) ||
          (item.titleEn && item.titleEn.toLowerCase().includes(query));
        const inDesc =
          item.description.toLowerCase().includes(query) ||
          (item.descriptionEn && item.descriptionEn.toLowerCase().includes(query));
        const inCat =
          (item.categoryLabel || item.category).toLowerCase().includes(query) ||
          (item.categoryLabelEn && item.categoryLabelEn.toLowerCase().includes(query));
        const inReward =
          (item.rewardTitle || item.rewardItem || '').toLowerCase().includes(query) ||
          ((item.rewardTitleEn || item.rewardItemEn || '').toLowerCase().includes(query));
        const inObjectives =
          item.objectives?.some(
            (o) =>
              o.title.toLowerCase().includes(query) ||
              (o.titleEn && o.titleEn.toLowerCase().includes(query))
          ) || false;
        if (!inTitle && !inDesc && !inCat && !inReward && !inObjectives) return false;
      }

      return true;
    });
  }, [mergedAchievements, selectedCategory, statusFilter, searchQuery, watchlist]);

  // Map of eventId -> upcoming EventInstance
  const eventInstanceMap = useMemo(() => {
    const map = new Map<string, EventInstance>();
    for (const inst of upcomingInstances) {
      if (!map.has(inst.event.id)) {
        map.set(inst.event.id, inst);
      }
    }
    return map;
  }, [upcomingInstances]);

  return (
    <div className="gw2-achievements-panel">
      {/* 1. Heldin - Erfolgsübersicht Banner */}
      <div className="gw2-hero-ap-banner">
        <div className="hero-ap-left">
          <div className="gw2-hero-laurel-badge">
            <Trophy size={20} className="trophy-gold" />
          </div>
          <div className="hero-ap-titles">
            <div className="hero-title-row">
              <span className="hero-main-title font-serif">{t('achievements.title')}</span>
              {accountInfo && (
                <span className="hero-account-tag font-mono">
                  {accountInfo.name}
                  {accountInfo.commander && <span className="commander-pill">{t('achievements.commander')}</span>}
                </span>
              )}
            </div>
            <div className="hero-stats-row font-mono">
              <span className="stat-item">
                <span className="stat-label dim">{t('achievements.statOverlay')}</span>
                <span className="stat-val gold">
                  {completedCount} / {mergedAchievements.length}
                </span>
              </span>
              <span className="stat-divider">•</span>
              <span className="stat-item">
                <span className="stat-label dim">{t('achievements.statAvailableAp')}</span>
                <span className="stat-val gold">+{totalAvailableAp} AP</span>
              </span>
              {accountInfo?.daily_ap !== undefined && (
                <>
                  <span className="stat-divider">•</span>
                  <span className="stat-item">
                    <span className="stat-label dim">{t('achievements.statDailyAp')}</span>
                    <span className="stat-val">{accountInfo.daily_ap} / 15.000 max</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="hero-filter-cluster">
          <div className="gw2-achieve-search-box">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              className="gw2-input-clean"
              placeholder={t('achievements.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                title={lang === 'en' ? 'Clear search' : 'Suche leeren'}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <select
            className="gw2-select achieve-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'inprogress' | 'completed')}
          >
            <option value="all">{t('achievements.statusAll')}</option>
            <option value="inprogress">{t('achievements.statusInProgress')}</option>
            <option value="completed">{t('achievements.statusCompleted')}</option>
          </select>
        </div>
      </div>

      {/* API Key Notice Banner if not synced */}
      {!hasSyncedApiKey && (
        <div className="gw2-achieve-api-notice">
          <div className="notice-left">
            <Key size={14} className="notice-key-icon" />
            <div className="notice-text">
              <span className="notice-title">
                {lang === 'en' ? 'No GW2 API Key Synced' : 'Kein GW2 API-Schlüssel synchronisiert'}
              </span>
              <span className="notice-sub">
                {lang === 'en'
                  ? 'Personal achievement progress is displayed as 0 / grayed out. Enter your API key in Settings to load live progress.'
                  : 'Persönlicher Erfolgsfortschritt wird als 0 / gesperrt dargestellt. Hinterlege deinen API-Schlüssel in den Optionen, um echte Account-Daten zu laden.'}
              </span>
            </div>
          </div>
          {onOpenSettings && (
            <button className="gw2-btn-gold sm" onClick={onOpenSettings}>
              {lang === 'en' ? 'Open Settings' : 'Einstellungen'}
            </button>
          )}
        </div>
      )}

      {/* 2. GW2 Category Navigation Bar */}
      <div className="gw2-achieve-category-bar">
        {categoryTabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          const count = categoryCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              className={`achieve-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(tab.id)}
            >
              {tab.id === 'watchlist' && (
                <Star size={11} className={`tab-star-icon ${watchlist.length > 0 ? 'gold' : ''}`} />
              )}
              <span className="tab-label font-serif">{tab.label}</span>
              <span className="tab-count font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Achievement Cards List */}
      <div className="gw2-achieve-scroll-area">
        {filteredAchievements.length === 0 ? (
          <div className="achieve-empty-state">
            <Trophy size={28} className="dim" />
            <span className="empty-title font-serif">{t('achievements.emptyTitle')}</span>
            <p className="empty-desc dim">
              {selectedCategory === 'watchlist'
                ? t('achievements.emptyWatchlist')
                : t('achievements.emptyFilter')}
            </p>
            {(searchQuery || statusFilter !== 'all' || selectedCategory !== 'all') && (
              <button
                className="gw2-btn-outline sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedCategory('all');
                }}
              >
                {t('achievements.resetFilter')}
              </button>
            )}
          </div>
        ) : (
          <div className="gw2-achieve-grid-cards">
            {filteredAchievements.map((item) => {
              const isWatched = watchlist.includes(item.id);
              const isDone = !!item.isCompleted;
              const hasObjectives = item.objectives && item.objectives.length > 0;
              const isObjectivesOpen = !!expandedObjectives[item.id];
              const linkedEvent = item.eventId ? eventInstanceMap.get(item.eventId) : undefined;

              const max = item.progressMax || 1;
              const cur = Math.min(item.progressCurrent || 0, max);
              const frac = max > 0 ? cur / max : 0;

              return (
                <div
                  key={item.id}
                  className={`gw2-hero-achieve-card ${isDone ? 'is-done' : ''} ${
                    item.isFeatured ? 'is-featured' : ''
                  } ${!hasSyncedApiKey ? 'is-unlinked' : ''}`}
                >
                  {/* Left Column: Laurel Wreath */}
                  <div
                    className={`card-medal-frame ${
                      isDone ? 'medal-gold' : item.isFeatured ? 'medal-active' : 'medal-bronze'
                    }`}
                  >
                    <Award size={18} className="medal-icon" />
                  </div>

                  {/* Main Achievement Body */}
                  <div className="card-main-body">
                    {/* Top Row: Category tag, Title, Star Watchlist, AP Badge */}
                    <div className="card-top-row">
                      <div className="card-title-group">
                        <span className="achieve-category-pill">
                          {getAchievementCategoryLabel(item, lang)}
                        </span>
                        <h4 className="achieve-title font-serif" title={getAchievementTitle(item, lang)}>
                          {getAchievementTitle(item, lang)}
                        </h4>
                        {getAchievementTierInfo(item, lang) && (
                          <span className="achieve-tier-tag dim">
                            {getAchievementTierInfo(item, lang)}
                          </span>
                        )}
                      </div>

                      <div className="card-top-actions">
                        {/* Pin / Watchlist Star */}
                        <button
                          className={`btn-star-watch ${isWatched ? 'active' : ''}`}
                          onClick={() => toggleWatchlist(item.id)}
                          title={isWatched ? 'Watchlist' : 'Watchlist'}
                        >
                          <Star size={12} className={isWatched ? 'fill-gold' : ''} />
                        </button>

                        {/* AP Badge */}
                        <div className="gw2-ap-badge font-mono">
                          <span className="gw2-ap-val">+{item.ap}</span>
                          <span className="gw2-ap-label">AP</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="achieve-desc">{getAchievementDesc(item, lang)}</p>

                    {/* Progress Bar Row */}
                    {item.progressMax !== undefined && (
                      <div className="achieve-pbar-container">
                        <div className="achieve-pbar-header">
                          <span className={`achieve-pbar-status-text ${isDone ? 'done-gold' : ''}`}>
                            {isDone
                              ? (lang === 'en' ? 'Completed' : 'Abgeschlossen')
                              : !hasSyncedApiKey
                              ? (lang === 'en' ? 'API Key Required' : 'API-Key erforderlich')
                              : cur === 0
                              ? (lang === 'en' ? 'Not Started' : 'Nicht begonnen')
                              : (lang === 'en' ? 'In Progress' : 'In Arbeit')}
                          </span>
                          <span className="achieve-pbar-numbers font-mono">
                            <span className="achieve-pbar-cur">{cur}</span> / <span className="achieve-pbar-max">{max}</span>
                            <span className="achieve-pbar-pct"> ({Math.round(frac * 100)}%)</span>
                          </span>
                        </div>
                        <ProgressBar
                          value={frac}
                          tone={isDone ? 'gold' : item.isFeatured ? 'gold' : 'green'}
                          slim
                        />
                      </div>
                    )}

                    {/* Objectives Checklist Toggle (Teilziele) */}
                    {hasObjectives && (
                      <div className="achieve-objectives-block">
                        <button
                          className="btn-toggle-objectives"
                          onClick={() => toggleObjectives(item.id)}
                        >
                          <span>{t('achievements.objectives')} ({item.objectives!.length})</span>
                          {isObjectivesOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>

                        {isObjectivesOpen && (
                          <div className="objectives-list-grid">
                            {item.objectives!.map((obj) => (
                              <div
                                key={obj.id}
                                className={`objective-item ${obj.done ? 'obj-done' : 'obj-pending'}`}
                              >
                                {obj.done ? (
                                  <CheckCircle2 size={11} className="obj-icon green" />
                                ) : (
                                  <Circle size={10} className="obj-icon dim" />
                                )}
                                <span className="obj-title">{getObjectiveTitle(obj, lang)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rewards & Live Event Footer */}
                    <div className="card-footer-cluster">
                      {/* Rewards Badges */}
                      <div className="rewards-badges-row">
                        {item.rewardTitle && (
                          <span
                            className="reward-tag font-serif"
                            title={lang === 'en' ? 'Unlockable title' : 'Freischaltbarer Titel'}
                          >
                            <Award size={10} className="gold" />
                            <span>
                              {t('achievements.titleReward')} {getAchievementRewardTitle(item, lang)}
                            </span>
                          </span>
                        )}
                        {item.rewardMastery && (
                          <span
                            className={`mastery-tag mastery-${item.rewardMastery.region}`}
                            title={
                              lang === 'en'
                                ? `Mastery Point (${item.rewardMastery.region.toUpperCase()})`
                                : `Beherrschungspunkt (${item.rewardMastery.region.toUpperCase()})`
                            }
                          >
                            <Sparkles size={10} />
                            <span>+{item.rewardMastery.points} {t('achievements.mastery')}</span>
                          </span>
                        )}
                        {item.rewardItem && (
                          <span
                            className="reward-item-tag"
                            title={lang === 'en' ? 'Reward item' : 'Belohnungs-Gegenstand'}
                          >
                            <Shield size={10} className="gold" />
                            <span>{getAchievementRewardItem(item, lang)}</span>
                          </span>
                        )}
                      </div>

                      {/* Live Boss Quick Action (if linked) */}
                      {linkedEvent && (
                        <div className="linked-boss-action-strip">
                          <div className="boss-status-info">
                            {linkedEvent.isActive ? (
                              <span className="badge-active-pulse">
                                <Flame size={10} />
                                <span>{t('achievements.nowActive')} ({formatCountdown(linkedEvent.endsInSeconds)})</span>
                              </span>
                            ) : (
                              <span className="badge-upcoming font-mono">
                                <Clock size={10} />
                                <span>{t('achievements.inTime', { time: formatCountdown(linkedEvent.startsInSeconds) })}</span>
                              </span>
                            )}
                            <span className="boss-zone dim">{getEventZone(linkedEvent.event, lang)}</span>
                          </div>

                          <div className="boss-btns-group">
                            <button
                              className="btn-action sm"
                              onClick={() => onSendMessage(linkedEvent)}
                              title={t('events.sendChat')}
                            >
                              <MessageSquare size={10} />
                              <span>{t('achievements.chat')}</span>
                            </button>
                            <button
                              className="btn-action sm gold"
                              onClick={() => onTeleport(linkedEvent)}
                              title={t('events.teleportWaypoint')}
                            >
                              <Compass size={10} />
                              <span>{t('achievements.waypoint')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Footer: Account Connection / Fast Switch to Events */}
      <div className="achieve-bottom-dock">
        {accountInfo ? (
          <div className="dock-account-summary font-mono">
            <span className="dock-label dim">GW2-API:</span>
            <span className="dock-val gold">{accountInfo.name}</span>
            {accountInfo.fractal_level !== undefined && (
              <span className="dock-pill">Fraktal {accountInfo.fractal_level}</span>
            )}
            {accountInfo.wvw_rank !== undefined && (
              <span className="dock-pill">WvW-Rang {accountInfo.wvw_rank}</span>
            )}
            <span className="dock-hint dim">{t('achievements.synced')}</span>
          </div>
        ) : (
          <div className="dock-connect-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="hint-text dim">
              {t('achievements.apiHint')}
            </span>
            {onOpenSettings && (
              <button
                className="gw2-btn-gold sm"
                onClick={onOpenSettings}
                style={{ padding: '2px 8px', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Key size={10} />
                <span>{lang === 'en' ? 'Connect Key' : 'Key eintragen'}</span>
              </button>
            )}
          </div>
        )}

        <button className="gw2-text-btn" onClick={onSwitchToEvents}>
          <span>{t('achievements.backToEvents')}</span>
          <Compass size={11} />
        </button>
      </div>
    </div>
  );
};
