import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Compass,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Flame,
  Award,
  Trophy,
  Shield,
  Sparkles,
  CheckCircle2,
  Clock,
  Gift,
  Package,
  Info,
  Zap,
  AlertCircle,
  Bot,
  Bug,
  Skull,
  Sprout,
  Gem,
  Swords,
  Plane,
  Radio,
  LucideIcon,
} from 'lucide-react';
import { EventInstance, IconType } from '../types';
import {
  formatCountdown,
  formatLocalTime,
  getEventName,
  getEventZone,
  getEventWaypointName,
  getEventCategoryLabel,
  getEventTactics,
  getEventLootHighlights,
  LOOT_ITEM_ID_MAP,
} from '../data/events';
import { getAchievementsForEvent } from '../data/achievements';
import { Gw2AccountAchievement, Gw2DailyProgression } from '../data/gw2Api';
import { useProgress, progressActions } from '../data/progressStore';
import { useItems } from '../data/gw2/items';
import { ItemIcon } from './common/ui';
import { useTranslation } from '../i18n';

function getLootMeta(loot: string): { type: string; icon: LucideIcon } {
  const lower = loot.toLowerCase();
  if (lower.includes('infusion') || lower.includes('legendär') || lower.includes('legendary')) {
    return { type: 'legendary', icon: Sparkles };
  }
  if (
    lower.includes('aufgestiegen') ||
    lower.includes('ascended') ||
    lower.includes('heroen') ||
    lower.includes('hero\'s') ||
    lower.includes('heros') ||
    lower.includes('prächtig') ||
    lower.includes('magnificent') ||
    lower.includes('große') ||
    lower.includes('grand') ||
    lower.includes('great')
  ) {
    return { type: 'ascended', icon: Gift };
  }
  if (
    lower.includes('exotisch') ||
    lower.includes('exotic') ||
    lower.includes('essenz') ||
    lower.includes('essence') ||
    lower.includes('waffen') ||
    lower.includes('weapon') ||
    lower.includes('weapons') ||
    lower.includes('truhe') ||
    lower.includes('chest') ||
    lower.includes('schatz') ||
    lower.includes('hoard') ||
    lower.includes('kiste') ||
    lower.includes('cache') ||
    lower.includes('box') ||
    lower.includes('matrix') ||
    lower.includes('krone') ||
    lower.includes('crown') ||
    lower.includes('kristall') ||
    lower.includes('crystal')
  ) {
    return { type: 'rare', icon: Package };
  }
  return { type: 'standard', icon: Award };
}

function getEventIcon(iconType?: IconType | string): LucideIcon {
  switch (iconType) {
    case 'dragon':
      return Flame;
    case 'golem':
      return Bot;
    case 'elemental':
      return Sparkles;
    case 'wurm':
      return Bug;
    case 'pirate':
      return Skull;
    case 'karka':
      return Shield;
    case 'choya':
      return Sprout;
    case 'crystal':
      return Gem;
    case 'sword':
      return Swords;
    case 'shield':
      return Shield;
    case 'airship':
      return Plane;
    case 'portal':
      return Radio;
    default:
      return Award;
  }
}

interface MechanicBadge {
  icon: LucideIcon;
  label: string;
  title: string;
}

function getTacticsBadges(tactics: string | undefined, lang: string): MechanicBadge[] {
  if (!tactics) return [];
  const lower = tactics.toLowerCase();
  const badges: MechanicBadge[] = [];

  if (
    lower.includes('cc') ||
    lower.includes('trotzbalken') ||
    lower.includes('breakbar') ||
    lower.includes('defiance') ||
    lower.includes('trotz') ||
    lower.includes('stunt') ||
    lower.includes('interrupt') ||
    lower.includes('unterbrechen')
  ) {
    badges.push({
      icon: Zap,
      label: 'Breakbar / CC',
      title: lang === 'en' ? 'Hard CC to break defiance bar' : 'CC & Trotzbalken schnell brechen',
    });
  }

  if (
    lower.includes('ausweichen') ||
    lower.includes('dodge') ||
    lower.includes('evade') ||
    lower.includes('schockwelle') ||
    lower.includes('shockwave') ||
    lower.includes('wellen') ||
    lower.includes('waves') ||
    lower.includes('bodeneffekt') ||
    lower.includes('schadensflächen') ||
    lower.includes('hazard') ||
    lower.includes('flächen') ||
    lower.includes('aoe')
  ) {
    badges.push({
      icon: AlertCircle,
      label: lang === 'en' ? 'Dodge / Waves' : 'Ausweichen / Wellen',
      title: lang === 'en' ? 'Dodge shockwaves and AoE fields' : 'Schockwellen & Flächen meiden',
    });
  }

  if (
    lower.includes('gleit') ||
    lower.includes('gleitschirm') ||
    lower.includes('aufwind') ||
    lower.includes('glider') ||
    lower.includes('gliding') ||
    lower.includes('updraft') ||
    lower.includes('launch pad') ||
    lower.includes('sprungpilz')
  ) {
    badges.push({
      icon: Compass,
      label: lang === 'en' ? 'Glider / Updraft' : 'Gleitschirm / Aufwind',
      title: lang === 'en' ? 'Use glider and updrafts' : 'Gleitschirm & Aufwinde nutzen',
    });
  }

  if (
    lower.includes('riss') ||
    lower.includes('risse') ||
    lower.includes('rift') ||
    lower.includes('rifts') ||
    lower.includes('portal') ||
    lower.includes('portals') ||
    lower.includes('unterwelt')
  ) {
    badges.push({
      icon: Flame,
      label: lang === 'en' ? 'Rifts / Portals' : 'Risse / Portale',
      title: lang === 'en' ? 'Close rifts & demonic portals' : 'Risse & Unterwelt-Portale schließen',
    });
  }

  if (
    lower.includes('eskort') ||
    lower.includes('verteidig') ||
    lower.includes('escort') ||
    lower.includes('defend') ||
    lower.includes('protect') ||
    lower.includes('schützen') ||
    lower.includes('schutzkreis') ||
    lower.includes('basen') ||
    lower.includes('bastion')
  ) {
    badges.push({
      icon: Shield,
      label: lang === 'en' ? 'Escort / Defend' : 'Eskorte / Schutz',
      title: lang === 'en' ? 'Defend allies and bases' : 'Verbündete & Basen verteidigen',
    });
  }

  if (
    lower.includes('bombe') ||
    lower.includes('bomb') ||
    lower.includes('kanone') ||
    lower.includes('cannon') ||
    lower.includes('matrix') ||
    lower.includes('emp') ||
    lower.includes('spezial') ||
    lower.includes('laser') ||
    lower.includes('action')
  ) {
    badges.push({
      icon: Sparkles,
      label: lang === 'en' ? 'Special Action' : 'Spezial-Aktion',
      title: lang === 'en' ? 'Special actions & environment weapons' : 'Spezial-Fähigkeit & Umweltwaffen',
    });
  }

  return badges;
}

interface EventCardProps {
  instance: EventInstance;
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  isJustCopied: boolean;
  userAchievements?: Map<number, Gw2AccountAchievement>;
  dailyProgression?: Gw2DailyProgression | null;
  onLogCompletion?: (eventId: string, newTotal: number) => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({
  instance,
  onSendMessage,
  onTeleport,
  isJustCopied,
  userAchievements,
  dailyProgression,
  onLogCompletion,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const { t, lang } = useTranslation();
  const { event, isActive, startsInSeconds, endsInSeconds } = instance;

  const progress = useProgress();
  const completionsCount = progress.eventCompletions[event.id] ?? 0;
  const isCompletedToday = progressActions.isEventCompletedToday(
    event.id,
    dailyProgression?.worldBosses,
    dailyProgression?.mapChests,
  );

  const handleLogCompletion = (delta = 1) => {
    const nextVal = progressActions.recordEventCompletion(event.id, delta);
    if (onLogCompletion) {
      onLogCompletion(event.id, nextVal);
    }
  };

  const isImminent = !isActive && startsInSeconds <= 15 * 60;
  const achievements = useMemo(() => {
    if (event.achievements && event.achievements.length > 0) return event.achievements;
    return getAchievementsForEvent(event.id);
  }, [event.id, event.achievements]);
  const displayName = getEventName(event, lang);
  const displayZone = getEventZone(event, lang);
  const displayWaypoint = getEventWaypointName(event, lang);
  const displayCategory = getEventCategoryLabel(event, lang);
  const tacticsText = useMemo(() => getEventTactics(event, lang), [event, lang]);
  const lootHighlights = useMemo(() => getEventLootHighlights(event, lang), [event, lang]);

  const cardLootIds = useMemo(() => {
    if (!lootHighlights) return [];
    return lootHighlights
      .map((loot: string) => LOOT_ITEM_ID_MAP[loot])
      .filter((id): id is number => typeof id === 'number' && id > 0);
  }, [lootHighlights]);

  // Preload verified official items from API when expanded
  useItems(expanded ? cardLootIds : []);

  const tacticsBadges = useMemo(() => getTacticsBadges(tacticsText, lang), [tacticsText, lang]);
  const EventGlyph = getEventIcon(event.iconType);

  const getCategoryClass = () => {
    switch (event.category) {
      case 'core':
        return 'category-core';
      case 'hardcore':
        return 'category-hardcore';
      case 'hot':
        return 'category-hot';
      case 'pof':
        return 'category-pof';
      case 'eod':
        return 'category-eod';
      case 'soto':
        return 'category-soto';
      case 'janthir':
        return 'category-janthir';
      case 'voe':
        return 'category-voe';
      case 'ibs':
        return 'category-ibs';
      case 'lws':
        return 'category-lws';
      default:
        return 'category-core';
    }
  };

  return (
    <div
      className={`gw2-event-card ${isActive ? 'active-event' : ''} ${
        isImminent ? 'imminent-event' : ''
      }`}
    >
      <div className="gw2-card-body">
        {/* Left Laurel Wreath Medal Icon with Dynamic Boss Glyph */}
        <div className={`gw2-card-medal ${isActive ? 'active-medal' : ''}`} title={event.iconType}>
          <EventGlyph size={18} className={`medal-svg ${isActive ? 'active' : ''}`} />
          {isActive && <span className="active-pulse-dot" />}
        </div>

        {/* Center / Main Content */}
        <div className="gw2-card-content">
          {/* Top Row: Category Tag, Boss Name, Timer Badge */}
          <div className="gw2-card-header-row">
            <div className="gw2-title-cluster">
              <span className={`gw2-cat-tag ${getCategoryClass()}`}>
                {displayCategory}
              </span>
              <span className="gw2-boss-name" title={displayName}>
                {displayName}
              </span>
            </div>

            {/* Countdown / Active Badge */}
            <div
              className={`gw2-card-timer-badge ${
                isActive
                  ? 'timer-active'
                  : isImminent
                  ? 'timer-imminent'
                  : 'timer-upcoming'
              }`}
            >
              {isActive ? (
                <>
                  <Flame size={11} className="flame-icon" />
                  <span>{t('events.activeBadge')} ({formatCountdown(endsInSeconds)})</span>
                </>
              ) : (
                <>
                  <span>{t('events.in')} {formatCountdown(startsInSeconds)}</span>
                </>
              )}
            </div>
          </div>

          {/* Sub-row: Location, Waypoint Name, Local Time, Completion Badges */}
          <div className="gw2-card-sub-row">
            <div className="gw2-sub-location">
              <MapPin size={10} className="pin-icon" />
              <span>
                {displayZone} • {displayWaypoint} ({formatLocalTime(instance.startTime, lang)})
              </span>
            </div>

            {/* Right Badge Cluster: Account Completions, Today Done, Achievements */}
            <div className="gw2-card-badges-cluster">
              {/* Account Total Completions Badge */}
              <div
                className={`gw2-completions-badge ${completionsCount > 0 ? 'has-completions' : ''}`}
                title={
                  lang === 'en'
                    ? `Account completions: ${completionsCount} times`
                    : `Auf dem Account insgesamt: ${completionsCount}-mal abgeschlossen`
                }
              >
                <Trophy size={10} className={`completion-icon ${completionsCount > 0 ? 'gold' : 'dim'}`} />
                <span className="completion-count font-mono">{completionsCount}x</span>
              </div>

              {/* Today Done Pill if boss/meta completed today */}
              {isCompletedToday && (
                <span
                  className="gw2-daily-done-pill font-mono"
                  title={
                    lang === 'en'
                      ? 'Already defeated today (daily bonus chest looted)'
                      : 'Heute bereits besiegt (tägliche Bonus-Truhe erhalten)'
                  }
                >
                  <CheckCircle2 size={10} className="done-icon" />
                  <span>{t('events.completedToday')}</span>
                </span>
              )}

              {/* Achievements Chip Toggle */}
              {achievements.length > 0 && (
                <button
                  className={`gw2-achieve-pill-btn ${showAchievements ? 'active' : ''}`}
                  onClick={() => setShowAchievements(!showAchievements)}
                  title={t('events.achievements')}
                >
                  <Award size={10} className="trophy-icon" />
                  <span>{achievements.length} {t('events.achievements')}</span>
                  {showAchievements ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
            </div>
          </div>

          {/* Action buttons: "Chat-Aufruf kopieren" | "Wegmarke kopieren" | "+1 Abschluss" | "Info" */}
          <div className="gw2-card-actions-row">
            {/* 1. Chat-Aufruf kopieren */}
            <button
              className="gw2-gw-btn send-btn"
              onClick={() => onSendMessage(instance)}
              title={
                lang === 'en'
                  ? 'Copy waypoint & timer to clipboard (paste in game with [Enter] + [Ctrl+V])'
                  : 'Wegmarke & Restzeit in die Zwischenablage kopieren (im Spiel mit [Enter] & [Strg+V] einfügen)'
              }
            >
              {isJustCopied ? (
                <Check size={11} color="#4ade80" />
              ) : (
                <MessageSquare size={11} />
              )}
              <span>{isJustCopied ? t('events.copied') : t('events.sendChat')}</span>
            </button>

            {/* 2. Wegmarken-Code kopieren */}
            <button
              className="gw2-gw-btn teleport-btn"
              onClick={() => onTeleport(instance)}
              title={
                lang === 'en'
                  ? 'Copy waypoint chat code to clipboard (paste in game chat to click & travel)'
                  : 'Wegmarken-Code kopieren (im Spiel-Chat einfügen zum Anklicken & Reisen)'
              }
            >
              <Compass size={11} />
              <span>{t('events.copyWaypoint')}</span>
            </button>

            {/* 3. Abschluss erfassen (+1) */}
            <button
              className={`gw2-gw-btn log-complete-btn ${isCompletedToday ? 'done-today' : ''}`}
              onClick={() => handleLogCompletion(1)}
              title={t('events.logCompletionTooltip')}
            >
              <Check size={11} className={isCompletedToday ? 'text-green' : ''} />
              <span>{t('events.logCompletion')}</span>
            </button>

            {/* Accordion Toggle for Taktik & Beute with Info Icon */}
            <button
              className={`gw2-details-toggle-btn ${expanded ? 'expanded' : ''}`}
              title={
                expanded
                  ? (lang === 'en' ? 'Hide tactics & loot' : 'Details ausblenden')
                  : (lang === 'en' ? 'Show tactics & loot' : 'Taktik & Beute anzeigen')
              }
              onClick={() => setExpanded(!expanded)}
            >
              <Info size={11} className="info-btn-glyph" />
              <span>{expanded ? (lang === 'en' ? 'Less' : 'Weniger') : 'Info'}</span>
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable "Possible Achievements" Drawer */}
      {showAchievements && achievements.length > 0 && (
        <div className="gw2-card-achievements-drawer">
          <div className="drawer-header">
            <div className="drawer-header-left">
              <Trophy size={13} className="trophy-gold" />
              <span className="drawer-title font-serif">
                {lang === 'en' ? 'Boss & Event Achievements' : 'Mögliche Boss- & Event-Erfolge'}
              </span>
              <span className="drawer-count-badge font-mono">{achievements.length}</span>
            </div>
            <div className="drawer-header-right">
              <div className="drawer-ap-pill font-mono" title={lang === 'en' ? 'Total AP for this event' : 'Gesamte AP für dieses Event'}>
                <Award size={11} className="ap-icon" />
                <span>+{achievements.reduce((acc, cur) => acc + (cur.ap || 0), 0)} AP</span>
              </div>
            </div>
          </div>

          <div className="drawer-achieve-list">
            {achievements.map((ach) => {
              const userAch = ach.gw2Id ? userAchievements?.get(ach.gw2Id) : undefined;
              const isDone = userAch?.done;
              const hasProgress = userAch && userAch.current !== undefined && userAch.max !== undefined && !isDone;
              const achTitle = lang === 'en' ? (ach.titleEn || ach.title) : ach.title;
              const achDesc = lang === 'en' ? (ach.descriptionEn || ach.description) : ach.description;
              const achReward = lang === 'en' ? (ach.rewardTitleEn || ach.rewardTitle) : ach.rewardTitle;

              return (
                <div key={ach.id} className={`drawer-achieve-item ${isDone ? 'ach-done' : ''}`}>
                  <div className="ach-icon-col">
                    <Trophy size={13} className={`ach-glyph ${isDone ? 'done' : 'gold'}`} />
                  </div>
                  <div className="ach-left">
                    <div className="ach-title-row">
                      <span className="ach-item-title font-serif">{achTitle}</span>
                      {isDone ? (
                        <span className="ach-status-pill done">
                          <CheckCircle2 size={10} />
                          <span>{lang === 'en' ? 'Completed' : 'Erledigt'}</span>
                        </span>
                      ) : hasProgress ? (
                        <span className="ach-status-pill inprogress font-mono">
                          <Clock size={10} />
                          <span>{userAch.current} / {userAch.max}</span>
                        </span>
                      ) : achReward ? (
                        <span className="ach-reward-title font-serif">
                          <Award size={10} />
                          <span>{lang === 'en' ? `Title: ${achReward}` : `Titel: ${achReward}`}</span>
                        </span>
                      ) : null}

                      {/* Repeatable achievement cycle count */}
                      {userAch?.repeated ? (
                        <span className="ach-status-pill repeated font-mono" title={lang === 'en' ? 'Repeatable cycles' : 'Erfolgs-Wiederholungen'}>
                          <Sparkles size={9} />
                          <span>{t('events.repeatCount', { count: userAch.repeated })}</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="ach-item-desc">{achDesc}</div>
                  </div>

                  <div className="ach-right">
                    <div className="gw2-ap-badge compact font-mono">
                      <span className="gw2-ap-val">+{ach.ap}</span>
                      <span className="gw2-ap-label">AP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Tactics & Loot Details */}
      {expanded && (
        <div className="gw2-card-tactics-drawer">
          {/* Account Completions & Counter Stepper */}
          <div className="gw2-completion-history-panel">
            <div className="completion-history-left">
              <Trophy size={14} className="history-trophy gold" />
              <div className="history-text-col">
                <span className="history-title font-serif">{t('events.completionHistory')}</span>
                <span className="history-sub font-mono">
                  {lang === 'en' ? 'Account Total: ' : 'Account Gesamt: '}
                  <strong className="gold">{completionsCount}x</strong>
                  {isCompletedToday ? ` • ${t('events.completedToday')} ✓` : ''}
                </span>
              </div>
            </div>
            <div className="completion-history-stepper">
              <button
                className="gw2-stepper-btn"
                onClick={() => handleLogCompletion(-1)}
                title="-1"
                disabled={completionsCount <= 0}
              >
                -1
              </button>
              <span className="stepper-val font-mono">{completionsCount}</span>
              <button
                className="gw2-stepper-btn plus"
                onClick={() => handleLogCompletion(1)}
                title="+1"
              >
                +1
              </button>
            </div>
          </div>

          {/* Meta-event phases & sub-events (e.g. Cathedral of Zephyrs & Eternal Radiance) */}
          {event.subEvents && event.subEvents.length > 0 && (
            <div className="gw2-tactics-card">
              <div className="gw2-tactics-card-header">
                <div className="tactics-header-left">
                  <Swords size={12} className="tactics-header-icon" />
                  <span className="tactics-header-title font-serif">
                    {lang === 'en' ? 'Meta-Event Stages & Sub-Events' : 'Teil-Events & Meta-Phasen'}
                  </span>
                </div>
                <span className="loot-count-badge font-mono">{event.subEvents.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px 10px' }}>
                {event.subEvents.map((sub, sIdx) => {
                  const subName = lang === 'en' ? sub.nameEn : sub.name;
                  const phaseLabel = lang === 'en' ? sub.phaseLabelEn : sub.phaseLabel;
                  const isBossPhase = sub.phase === 'boss';
                  return (
                    <div
                      key={sub.id || sIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 6px',
                        background: isBossPhase ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        borderLeft: isBossPhase ? '2px solid var(--gw2-red, #ef4444)' : '2px solid rgba(210, 178, 104, 0.3)',
                        borderRadius: '2px',
                        fontSize: '11px',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--gw2-gold)', minWidth: '14px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {sIdx + 1}.
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          background: isBossPhase ? 'rgba(239, 68, 68, 0.2)' : 'rgba(210, 178, 104, 0.15)',
                          color: isBossPhase ? '#fca5a5' : 'var(--gw2-gold-bright)',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {phaseLabel}
                      </span>
                      <span style={{ color: isBossPhase ? 'var(--gw2-text-bright)' : 'var(--gw2-text-normal)', flex: 1 }}>
                        {subName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tacticsText && (
            <div className="gw2-tactics-card">
              <div className="gw2-tactics-card-header">
                <div className="tactics-header-left">
                  <Shield size={12} className="tactics-header-icon" />
                  <span className="tactics-header-title font-serif">
                    {lang === 'en' ? 'Tactics & Mechanics' : 'Taktik & Boss-Mechanik'}
                  </span>
                </div>
                {tacticsBadges.length > 0 && (
                  <div className="tactics-badges-wrap">
                    {tacticsBadges.map((badge, idx) => {
                      const BadgeIcon = badge.icon;
                      return (
                        <span key={idx} className="tactic-mini-tag font-sans" title={badge.title}>
                          <BadgeIcon size={10} className="tag-icon" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="tactics-card-body">{tacticsText}</div>
            </div>
          )}

          {lootHighlights && lootHighlights.length > 0 && (
            <div className="gw2-loot-card">
              <div className="gw2-loot-card-header">
                <div className="loot-header-left">
                  <Gift size={12} className="loot-header-icon" />
                  <span className="loot-header-title font-serif">
                    {lang === 'en' ? 'Key Loot & Guaranteed Chests' : 'Wichtige Beute & Belohnungen'}
                  </span>
                </div>
                <span className="loot-count-badge font-mono">{lootHighlights.length}</span>
              </div>
              <div className="loot-badges-grid">
                {lootHighlights.map((loot: string, idx: number) => {
                  const itemId = LOOT_ITEM_ID_MAP[loot];
                  const { type, icon: IconComp } = getLootMeta(loot);
                  return (
                    <div
                      key={idx}
                      className={`loot-chip loot-chip-${type} ${itemId ? 'has-item-icon' : ''}`}
                      title={itemId ? undefined : loot}
                    >
                      {itemId ? (
                        <ItemIcon id={itemId} size="s" />
                      ) : (
                        <IconComp size={11} className="loot-chip-icon" />
                      )}
                      <span className="loot-chip-name">{loot}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
