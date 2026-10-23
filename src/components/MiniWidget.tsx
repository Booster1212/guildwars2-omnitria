import React from 'react';
import { Flame, MessageSquare, Compass, ChevronDown, Check } from 'lucide-react';
import { EventInstance } from '../types';
import { formatShortCountdown, formatCountdown } from '../data/events';
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
  // Exactly the next 3 events!
  const displayItems = instances.slice(0, 3);

  return (
    <div className="mini-widget">
      {displayItems.length === 0 ? (
        <div style={{ fontSize: '11px', color: 'var(--gw2-text-dim)', textAlign: 'center', padding: '12px' }}>
          {t('events.empty')}
        </div>
      ) : (
        displayItems.map((inst, index) => {
          const isCopied = copiedId === `${inst.event.id}_${inst.startTime.getTime()}`;
          const eventDisplayName = lang === 'en' ? (inst.event.nameEn || inst.event.name) : inst.event.name;
          return (
            <div
              key={`${inst.event.id}_${inst.startTime.getTime()}`}
              className={`mini-event-box ${inst.isActive ? 'active' : ''}`}
            >
              {/* Event Header Info: Name, Zone, Live Countdown */}
              <div className="mini-event-header">
                <div className="mini-event-title-wrap">
                  <span className="mini-index">#{index + 1}</span>
                  {inst.isActive && (
                    <Flame size={12} color="#10b981" style={{ flexShrink: 0 }} />
                  )}
                  <span className="mini-name" title={eventDisplayName}>
                    {eventDisplayName}
                  </span>
                </div>

                <div
                  className={`mini-badge ${
                    inst.isActive
                      ? 'mini-badge-active'
                      : inst.startsInSeconds <= 900
                      ? 'mini-badge-imminent'
                      : 'mini-badge-upcoming'
                  }`}
                >
                  {inst.isActive
                    ? `${t('events.activeBadge')} (${formatShortCountdown(inst.endsInSeconds)})`
                    : `${t('events.in')} ${formatCountdown(inst.startsInSeconds)}`}
                </div>
              </div>

              {/* Zone / Map indicator */}
              <div className="mini-zone-label">
                {inst.event.zone} • {inst.event.waypointName}
              </div>

              {/* Action buttons */}
              <div className="mini-actions-row">
                <button
                  className="mini-btn send-btn"
                  onClick={() => onSendMessage(inst)}
                  title={t('events.sendChat')}
                >
                  {isCopied ? (
                    <Check size={11} color="#4ade80" />
                  ) : (
                    <MessageSquare size={11} />
                  )}
                  <span>{t('events.sendChat')}</span>
                </button>

                <button
                  className="mini-btn teleport-btn"
                  onClick={() => onTeleport(inst)}
                  title={t('events.teleportWaypoint')}
                >
                  <Compass size={11} />
                  <span>{t('events.teleportWaypoint')}</span>
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Expand Bar to full list */}
      <button
        className="mini-expand-footer"
        onClick={onExpand}
        title={lang === 'en' ? 'Open full event timer panel' : 'Volle Event-Tafel mit Suche & allen Bossen öffnen'}
      >
        <span>{lang === 'en' ? 'Show All Events' : 'Alle Bosse anzeigen'}</span>
        <ChevronDown size={11} />
      </button>
    </div>
  );
};
