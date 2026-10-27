import React, { useState, useMemo } from 'react';
import {
  Flame,
  MessageSquare,
  Compass,
  ChevronDown,
  Check,
  MapPin,
  Clock,
  Layers,
  Swords,
  List,
  LayoutList,
  Plus,
} from 'lucide-react';
import { EventInstance } from '../types';
import { Gw2DailyProgression } from '../data/gw2Api';
import {
  formatShortCountdown,
  formatCountdown,
  getEventName,
  getEventZone,
  getEventWaypointName,
  isBossEvent,
  isMetaEvent,
} from '../data/events';
import { useProgress, progressStore } from '../data/progressStore';
import { useTranslation } from '../i18n';

export type MiniTab = 'active' | 'metas' | 'core' | 'soon' | 'all';
export type MiniDensity = 'standard' | 'compact';

const STORAGE_KEY_MINI_TAB = 'gw2_mini_tab';
const STORAGE_KEY_MINI_DENSITY = 'gw2_mini_density';

interface MiniWidgetProps {
  instances: EventInstance[];
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  copiedId: string | null;
  onExpand: () => void;
  dailyProgression?: Gw2DailyProgression | null;
  onLogCompletion?: (eventId: string, newTotal: number) => void;
}

export const MiniWidget: React.FC<MiniWidgetProps> = React.memo(({
  instances,
  onSendMessage,
  onTeleport,
  copiedId,
  onExpand,
  dailyProgression,
  onLogCompletion,
}) => {
  const { t, lang } = useTranslation();
  const progress = useProgress();

  // Saved category filter
  const [activeTab, setActiveTab] = useState<MiniTab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MINI_TAB);
      if (saved === 'active' || saved === 'metas' || saved === 'core' || saved === 'soon' || saved === 'all') {
        return saved;
      }
    } catch {
      /* ignore */
    }
    return 'active';
  });

  // Saved density layout ('standard' vs 'compact')
  const [density, setDensity] = useState<MiniDensity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MINI_DENSITY);
      if (saved === 'compact' || saved === 'standard') {
        return saved;
      }
    } catch {
      /* ignore */
    }
    return 'standard';
  });

  const handleSelectTab = (tab: MiniTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(STORAGE_KEY_MINI_TAB, tab);
    } catch {
      /* ignore */
    }
  };

  const toggleDensity = () => {
    const next = density === 'compact' ? 'standard' : 'compact';
    setDensity(next);
    try {
      localStorage.setItem(STORAGE_KEY_MINI_DENSITY, next);
    } catch {
      /* ignore */
    }
  };

  // Category counts
  const activeCount = useMemo(() => {
    return instances.filter((i) => i.isActive || i.startsInSeconds <= 5 * 60).length;
  }, [instances]);

  const metaCount = useMemo(() => {
    return instances.filter((i) => isMetaEvent(i.event) && (i.isActive || i.startsInSeconds <= 60 * 60)).length;
  }, [instances]);

  const coreCount = useMemo(() => {
    return instances.filter((i) => isBossEvent(i.event) && (i.isActive || i.startsInSeconds <= 60 * 60)).length;
  }, [instances]);

  const soonCount = useMemo(() => {
    return instances.filter((i) => !i.isActive && i.startsInSeconds <= 30 * 60).length;
  }, [instances]);

  // Filter instances by active tab
  const filteredInstances = useMemo(() => {
    let list = instances;

    if (activeTab === 'active') {
      list = list.filter((i) => i.isActive || i.startsInSeconds <= 5 * 60);
    } else if (activeTab === 'metas') {
      list = list.filter((i) => isMetaEvent(i.event));
    } else if (activeTab === 'core') {
      list = list.filter((i) => isBossEvent(i.event));
    } else if (activeTab === 'soon') {
      list = list.filter((i) => !i.isActive && i.startsInSeconds <= 30 * 60);
    }

    // Sort: Active first (by remaining time), then upcoming (by start time)
    return [...list].sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isActive && b.isActive) return a.endsInSeconds - b.endsInSeconds;
      return a.startsInSeconds - b.startsInSeconds;
    });
  }, [instances, activeTab]);

  // Display up to 10 events (scrollable container)
  const displayItems = filteredInstances.slice(0, 10);

  const checkIsDoneToday = (eventId: string) => {
    return progressStore.isEventCompletedToday(
      eventId,
      dailyProgression?.worldBosses ?? [],
      dailyProgression?.mapChests ?? []
    );
  };

  const handleQuickLog = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const newTotal = progressStore.recordEventCompletion(eventId, 1);
    if (onLogCompletion) {
      onLogCompletion(eventId, newTotal);
    }
  };

  return (
    <div className={`mini-widget ${density === 'compact' ? 'is-compact-mode' : ''}`}>
      {/* Category Ribbon / Filter Chips */}
      <div className="mini-filter-bar">
        <div className="mini-tabs-scroll">
          {/* Active Tab */}
          <button
            className={`mini-tab-chip ${activeTab === 'active' ? 'selected' : ''}`}
            onClick={() => handleSelectTab('active')}
            title={lang === 'en' ? 'Show currently active and imminent events' : 'Aktuell laufende und unmittelbar bevorstehende Events'}
          >
            <Flame size={11} className={activeCount > 0 ? 'mini-tab-flame' : ''} />
            <span>{t('mini.tabActive')}</span>
            {activeCount > 0 && <span className="mini-tab-count active">{activeCount}</span>}
          </button>

          {/* Metas Tab */}
          <button
            className={`mini-tab-chip ${activeTab === 'metas' ? 'selected' : ''}`}
            onClick={() => handleSelectTab('metas')}
            title={lang === 'en' ? 'Show expansion meta events' : 'Meta-Events aus Erweiterungen (HoT, PoF, EoD, SotO, JW)'}
          >
            <Layers size={11} />
            <span>{t('mini.tabMetas')}</span>
            {metaCount > 0 && <span className="mini-tab-count">{metaCount}</span>}
          </button>

          {/* Core World Bosses Tab */}
          <button
            className={`mini-tab-chip ${activeTab === 'core' ? 'selected' : ''}`}
            onClick={() => handleSelectTab('core')}
            title={lang === 'en' ? 'Show Core & Hardcore World Bosses' : 'Klassische Weltbosse & Hardcore-Bosse (Tequatl, Dreifacher Ärger)'}
          >
            <Swords size={11} />
            <span>{t('mini.tabBosses')}</span>
            {coreCount > 0 && <span className="mini-tab-count">{coreCount}</span>}
          </button>

          {/* Soon Tab */}
          <button
            className={`mini-tab-chip ${activeTab === 'soon' ? 'selected' : ''}`}
            onClick={() => handleSelectTab('soon')}
            title={lang === 'en' ? 'Events starting within 30 minutes' : 'Events, die in den nächsten 30 Minuten starten'}
          >
            <Clock size={11} />
            <span>{t('mini.tabSoon')}</span>
            {soonCount > 0 && <span className="mini-tab-count">{soonCount}</span>}
          </button>

          {/* All Tab */}
          <button
            className={`mini-tab-chip ${activeTab === 'all' ? 'selected' : ''}`}
            onClick={() => handleSelectTab('all')}
            title={lang === 'en' ? 'All events in chronological order' : 'Alle Events chronologisch geordnet'}
          >
            <span>{t('mini.tabAll')}</span>
          </button>
        </div>

        {/* Right Toolbar: View Density Toggle & Count */}
        <div className="mini-toolbar-right">
          <button
            className={`mini-density-btn ${density === 'compact' ? 'active' : ''}`}
            onClick={toggleDensity}
            title={density === 'compact' ? t('mini.viewStandard') : t('mini.viewCompact')}
          >
            {density === 'compact' ? <LayoutList size={12} /> : <List size={12} />}
          </button>
        </div>
      </div>

      {/* Events Stack (Scrollable List) */}
      {displayItems.length === 0 ? (
        <div className="mini-empty-state">
          <span>{t('events.empty')}</span>
          {activeTab !== 'all' && (
            <button className="mini-empty-reset-btn" onClick={() => handleSelectTab('all')}>
              {t('mini.tabAll')}
            </button>
          )}
        </div>
      ) : (
        <div className={`mini-events-stack ${density === 'compact' ? 'compact-list' : ''}`}>
          {displayItems.map((inst, index) => {
            const isCopied = copiedId === `${inst.event.id}_${inst.startTime.getTime()}`;
            const eventDisplayName = getEventName(inst.event, lang);
            const displayZone = getEventZone(inst.event, lang);
            const displayWaypoint = getEventWaypointName(inst.event, lang);
            const isImminent = !inst.isActive && inst.startsInSeconds <= 15 * 60;
            const completionsCount = progress.eventCompletions[inst.event.id] ?? 0;
            const doneToday = checkIsDoneToday(inst.event.id);

            // 1. Ultra-Compact Mode Row
            if (density === 'compact') {
              return (
                <div
                  key={`${inst.event.id}_${inst.startTime.getTime()}`}
                  className={`mini-compact-row ${inst.isActive ? 'active' : isImminent ? 'imminent' : ''}`}
                >
                  {/* Left: Index, Flame/Clock, Title & Zone */}
                  <div className="mini-cr-left">
                    <span className="mini-cr-index font-mono">#{index + 1}</span>
                    {inst.isActive ? (
                      <Flame size={12} className="mini-flame active" />
                    ) : isImminent ? (
                      <Clock size={11} className="mini-cr-clock" />
                    ) : null}
                    <span className="mini-cr-name font-serif" title={`${eventDisplayName} • ${displayZone} • ${displayWaypoint}`}>
                      {eventDisplayName}
                    </span>
                    <span className="mini-cr-zone dim" title={displayZone}>
                      {displayZone}
                    </span>
                  </div>

                  {/* Center: Completions + Today Done + Timer */}
                  <div className="mini-cr-mid">
                    {doneToday && (
                      <span className="mini-cr-today-badge font-mono" title={t('events.completedToday')}>
                        <Check size={9} />
                      </span>
                    )}
                    {completionsCount > 0 && (
                      <span
                        className="mini-cr-completions font-mono gold"
                        title={lang === 'en' ? `${completionsCount} total completions` : `${completionsCount} Account-Abschlüsse`}
                      >
                        {completionsCount}x
                      </span>
                    )}
                    <div className="mini-cr-timer font-mono">
                      {inst.isActive ? (
                        <span className="mini-pill-active compact">
                          <span className="mini-pulse-dot" />
                          <span>{formatShortCountdown(inst.endsInSeconds, lang)}</span>
                        </span>
                      ) : (
                        <span className={isImminent ? 'mini-pill-imminent compact' : 'mini-pill-upcoming compact'}>
                          {formatCountdown(inst.startsInSeconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Icon Buttons */}
                  <div className="mini-cr-actions">
                    <button
                      className={`mini-icon-btn ${isCopied ? 'copied' : ''}`}
                      onClick={() => onSendMessage(inst)}
                      title={t('events.sendChat')}
                    >
                      {isCopied ? <Check size={11} className="check-green" /> : <MessageSquare size={11} />}
                    </button>
                    <button
                      className="mini-icon-btn teleport"
                      onClick={() => onTeleport(inst)}
                      title={`${t('events.teleportWaypoint')}: ${displayWaypoint}`}
                    >
                      <Compass size={11} />
                    </button>
                    <button
                      className="mini-icon-btn plus-btn"
                      onClick={(e) => handleQuickLog(e, inst.event.id)}
                      title={`${t('events.logCompletionTooltip')} (+1)`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              );
            }

            // 2. Standard View Card
            return (
              <div
                key={`${inst.event.id}_${inst.startTime.getTime()}`}
                className={`mini-event-box ${inst.isActive ? 'active' : isImminent ? 'imminent' : ''}`}
              >
                {/* Event Header Row: Index, Title, Badges, Timer */}
                <div className="mini-event-header">
                  <div className="mini-event-title-wrap">
                    <span className="mini-index font-mono">#{index + 1}</span>
                    {inst.isActive && <Flame size={13} className="mini-flame active" />}
                    <span className="mini-name font-serif" title={eventDisplayName}>
                      {eventDisplayName}
                    </span>
                  </div>

                  {/* Header Right Badges & Live Timer */}
                  <div className="mini-header-right">
                    {doneToday && (
                      <span className="mini-daily-done-pill font-mono" title={t('events.completedToday')}>
                        <Check size={10} />
                        <span>{lang === 'en' ? 'Today' : 'Heute'}</span>
                      </span>
                    )}

                    {completionsCount > 0 && (
                      <span
                        className="mini-completions-tag font-mono gold"
                        title={lang === 'en' ? `${completionsCount} total completions` : `${completionsCount} Account-Abschlüsse`}
                      >
                        {completionsCount}x
                      </span>
                    )}

                    <div className="mini-timer-wrap font-mono">
                      {inst.isActive ? (
                        <span className="mini-pill-active">
                          <span className="mini-pulse-dot" />
                          <span>{t('events.activeBadge')}</span>
                          <span className="mini-timer-time">({formatShortCountdown(inst.endsInSeconds, lang)})</span>
                        </span>
                      ) : isImminent ? (
                        <span className="mini-pill-imminent">
                          <Clock size={10} />
                          <span>{t('events.in')} {formatCountdown(inst.startsInSeconds)}</span>
                        </span>
                      ) : (
                        <span className="mini-pill-upcoming">
                          <span>{t('events.in')} {formatCountdown(inst.startsInSeconds)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtitle / Location Row */}
                <div className="mini-zone-row" title={`${displayZone} • ${displayWaypoint}`}>
                  <MapPin size={10} className="mini-pin-icon" />
                  <span className="mini-zone-name">{displayZone}</span>
                  <span className="mini-dot-sep">•</span>
                  <span className="mini-wp-name">{displayWaypoint}</span>
                </div>

                {/* Action Buttons Row */}
                <div className="mini-actions-row">
                  <button
                    className={`mini-btn send-btn ${isCopied ? 'copied' : ''}`}
                    onClick={() => onSendMessage(inst)}
                    title={t('events.sendChat')}
                  >
                    {isCopied ? (
                      <Check size={11} className="btn-icon check-green" />
                    ) : (
                      <MessageSquare size={11} className="btn-icon" />
                    )}
                    <span>{isCopied ? t('events.copied') : t('events.sendChat')}</span>
                  </button>

                  <button
                    className="mini-btn teleport-btn"
                    onClick={() => onTeleport(inst)}
                    title={t('events.teleportWaypoint')}
                  >
                    <Compass size={11} className="btn-icon" />
                    <span>{t('events.teleportWaypoint')}</span>
                  </button>

                  <button
                    className="mini-btn quick-log-btn"
                    onClick={(e) => handleQuickLog(e, inst.event.id)}
                    title={`${t('events.logCompletionTooltip')} (+1)`}
                  >
                    <Plus size={11} className="btn-icon" />
                    <span>+1</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expand Bar to full list */}
      <button
        className="mini-expand-footer"
        onClick={onExpand}
        title={lang === 'en' ? 'Open full event timer panel' : 'Volle Event-Tafel mit Suche & allen Bossen öffnen'}
      >
        <span className="font-serif">
          {lang === 'en' ? 'Show All Events (Hero Board)' : 'Alle Events anzeigen (Heldin-Tafel)'}
        </span>
        <ChevronDown size={12} className="expand-chevron" />
      </button>
    </div>
  );
});
