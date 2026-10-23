import React, { useState } from 'react';
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
} from 'lucide-react';
import { EventInstance } from '../types';
import { formatCountdown, formatLocalTime } from '../data/events';
import { Gw2AccountAchievement } from '../data/gw2Api';

interface EventCardProps {
  instance: EventInstance;
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  isJustCopied: boolean;
  userAchievements?: Map<number, Gw2AccountAchievement>;
}

export const EventCard: React.FC<EventCardProps> = ({
  instance,
  onSendMessage,
  onTeleport,
  isJustCopied,
  userAchievements,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const { event, isActive, startsInSeconds, endsInSeconds } = instance;

  const isImminent = !isActive && startsInSeconds <= 15 * 60;
  const achievements = event.achievements || [];

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
        {/* Left Laurel Wreath Medal Icon (Authentic GW2 style from Screenshot 2) */}
        <div className={`gw2-card-medal ${isActive ? 'active-medal' : ''}`}>
          <Award size={18} className={`medal-svg ${isActive ? 'active' : ''}`} />
          {isActive && <span className="active-pulse-dot" />}
        </div>

        {/* Center / Main Content */}
        <div className="gw2-card-content">
          {/* Top Row: Category Tag, Boss Name, Timer Badge */}
          <div className="gw2-card-header-row">
            <div className="gw2-title-cluster">
              <span className={`gw2-cat-tag ${getCategoryClass()}`}>
                {event.categoryLabel}
              </span>
              <span className="gw2-boss-name" title={event.name}>
                {event.name}
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
                  <span>AKTIV ({formatCountdown(endsInSeconds)})</span>
                </>
              ) : (
                <>
                  <span>in {formatCountdown(startsInSeconds)}</span>
                </>
              )}
            </div>
          </div>

          {/* Sub-row: Location, Waypoint Name, Local Time */}
          <div className="gw2-card-sub-row">
            <div className="gw2-sub-location">
              <MapPin size={10} className="pin-icon" />
              <span>
                {event.zone} • {event.waypointName} ({formatLocalTime(instance.startTime)})
              </span>
            </div>

            {/* Achievements Chip Toggle */}
            {achievements.length > 0 && (
              <button
                className={`gw2-achieve-pill-btn ${showAchievements ? 'active' : ''}`}
                onClick={() => setShowAchievements(!showAchievements)}
                title="Mögliche Erfolge für diesen Boss einsehen"
              >
                <Trophy size={10} className="trophy-icon" />
                <span>{achievements.length} Erfolge</span>
                {showAchievements ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
          </div>

          {/* The 2 requested action buttons: "Nachricht senden" | "Zur Wegmarke Teleportieren" */}
          <div className="gw2-card-actions-row">
            {/* 1. Nachricht senden */}
            <button
              className="gw2-gw-btn send-btn"
              onClick={() => onSendMessage(instance)}
              title="Wegmarke & Restzeit in den GW2-Chat senden / kopieren"
            >
              {isJustCopied ? (
                <Check size={11} color="#4ade80" />
              ) : (
                <MessageSquare size={11} />
              )}
              <span>Nachricht senden</span>
            </button>

            {/* 2. Zur Wegmarke Teleportieren */}
            <button
              className="gw2-gw-btn teleport-btn"
              onClick={() => onTeleport(instance)}
              title="Wegmarken-Code senden (im Chat anklicken zum Teleportieren)"
            >
              <Compass size={11} />
              <span>Wegmarke Teleport</span>
            </button>

            {/* Accordion Toggle for Taktik & Beute */}
            <button
              className="gw2-details-toggle-btn"
              title={expanded ? 'Details ausblenden' : 'Taktik & Beute anzeigen'}
              onClick={() => setExpanded(!expanded)}
            >
              <span>{expanded ? 'Weniger' : 'Info'}</span>
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable "Mögliche Erfolge" Drawer */}
      {showAchievements && achievements.length > 0 && (
        <div className="gw2-card-achievements-drawer">
          <div className="drawer-header">
            <Trophy size={11} className="trophy-gold" />
            <span className="drawer-title">Mögliche Erfolge im Spiel:</span>
          </div>

          <div className="drawer-achieve-list">
            {achievements.map((ach) => {
              const userAch = ach.gw2Id ? userAchievements?.get(ach.gw2Id) : undefined;
              const isDone = userAch?.done;
              const hasProgress = userAch && userAch.current !== undefined && userAch.max !== undefined && !isDone;

              return (
                <div key={ach.id} className={`drawer-achieve-item ${isDone ? 'ach-done' : ''}`}>
                  <div className="ach-left">
                    <div className="ach-title-row">
                      <span className="ach-item-title">{ach.title}</span>
                      {isDone ? (
                        <span className="ach-status-pill done">
                          <CheckCircle2 size={10} />
                          <span>Erledigt</span>
                        </span>
                      ) : hasProgress ? (
                        <span className="ach-status-pill inprogress font-mono">
                          <Clock size={10} />
                          <span>{userAch.current} / {userAch.max}</span>
                        </span>
                      ) : ach.rewardTitle ? (
                        <span className="ach-reward-title font-serif">
                          <Award size={10} />
                          <span>Titel: {ach.rewardTitle}</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="ach-item-desc">{ach.description}</div>
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

      {/* Expandable Taktik & Beute Details */}
      {expanded && (
        <div className="gw2-card-tactics-drawer">
          <div className="tactic-text">
            <strong style={{ color: 'var(--gw2-gold)' }}>Taktik:</strong>{' '}
            {event.tactics}
          </div>
          <div className="loot-list-wrap">
            <Award size={10} style={{ color: 'var(--gw2-gold)', flexShrink: 0 }} />
            {event.lootHighlights.map((loot, idx) => (
              <span key={idx} className="loot-badge-pill">
                {loot}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
