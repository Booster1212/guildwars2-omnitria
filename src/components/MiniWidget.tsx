import React from 'react';
import { Flame, MessageSquare, Compass, ChevronDown, Check, MapPin, Clock } from 'lucide-react';
import { EventInstance } from '../types';
import {
  formatShortCountdown,
  formatCountdown,
  getEventName,
  getEventZone,
  getEventWaypointName,
} from '../data/events';
import { useTranslation } from '../i18n';

interface MiniWidgetProps {
  instances: EventInstance[];
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  copiedId: string | null;
  onExpand: () => void;
}

export const MiniWidget: React.FC<MiniWidgetProps> = ({
  instances,
  onSendMessage,
  onTeleport,
  copiedId,
  onExpand,
}) => {
  const { t, lang } = useTranslation();
  // Display the next 3 events
  const displayItems = instances.slice(0, 3);

  return (
    <div className="mini-widget">
      {displayItems.length === 0 ? (
        <div className="mini-empty-state">
          {t('events.empty')}
        </div>
      ) : (
        <div className="mini-events-stack">
          {displayItems.map((inst, index) => {
            const isCopied = copiedId === `${inst.event.id}_${inst.startTime.getTime()}`;
            const eventDisplayName = getEventName(inst.event, lang);
            const displayZone = getEventZone(inst.event, lang);
            const displayWaypoint = getEventWaypointName(inst.event, lang);
            const isImminent = !inst.isActive && inst.startsInSeconds <= 15 * 60;

            return (
              <div
                key={`${inst.event.id}_${inst.startTime.getTime()}`}
                className={`mini-event-box ${inst.isActive ? 'active' : isImminent ? 'imminent' : ''}`}
              >
                {/* Event Header Row: Index, Title, Live Timer Badge */}
                <div className="mini-event-header">
                  <div className="mini-event-title-wrap">
                    <span className="mini-index font-mono">#{index + 1}</span>
                    {inst.isActive && (
                      <Flame size={13} className="mini-flame active" />
                    )}
                    <span className="mini-name font-serif" title={eventDisplayName}>
                      {eventDisplayName}
                    </span>
                  </div>

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
        <span className="font-serif">{lang === 'en' ? 'Show All Events (Hero Board)' : 'Alle Events anzeigen (Heldin-Tafel)'}</span>
        <ChevronDown size={12} className="expand-chevron" />
      </button>
    </div>
  );
};
