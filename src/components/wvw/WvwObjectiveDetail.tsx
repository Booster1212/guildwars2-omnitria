import React, { useState } from 'react';
import type { WvwCombinedObjective, TacticalRecommendation } from '../../data/gw2/wvw/types.ts';
import { TEAM_COLORS } from '../../data/gw2/wvw/constants.ts';
import { useTranslation } from '../../i18n';
import {
  X,
  Copy,
  MessageSquare,
  Shield,
  Clock,
  Award,
  AlertTriangle,
  Star,
  EyeOff,
  Check,
  TrendingUp,
} from 'lucide-react';

import { getOwnerDisplayName } from '../../data/gw2/wvw/teamUtils.ts';
import type { WvwMatch, WvwWorld } from '../../data/gw2/wvw/types.ts';

interface WvwObjectiveDetailProps {
  objective: WvwCombinedObjective | null;
  recommendation?: TacticalRecommendation;
  match?: WvwMatch | null;
  worldsMap?: Map<number, WvwWorld>;
  onClose: () => void;
  onSendChat: (obj: WvwCombinedObjective) => void;
  onCopyChatLink: (obj: WvwCombinedObjective) => void;
  onTogglePin: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  isPinned: boolean;
  isIgnored: boolean;
}

export const WvwObjectiveDetail: React.FC<WvwObjectiveDetailProps> = ({
  objective,
  recommendation,
  match = null,
  worldsMap = new Map(),
  onClose,
  onSendChat,
  onCopyChatLink,
  onTogglePin,
  onToggleIgnore,
  isPinned,
  isIgnored,
}) => {
  const { t, lang } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!objective) return null;

  const ownerColor = TEAM_COLORS[objective.owner] || TEAM_COLORS.Neutral;
  const isGerman = lang === 'de';

  const handleCopy = () => {
    onCopyChatLink(objective);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatierung des Flip-Zeitpunkts
  const flipTimeString = objective.lastFlipped
    ? objective.lastFlipped.toLocaleTimeString(isGerman ? 'de-DE' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const flipElapsedMinutes =
    objective.secondsSinceFlip !== null ? Math.floor(objective.secondsSinceFlip / 60) : null;

  const ownerDisplay = getOwnerDisplayName(objective.owner, match, worldsMap, lang);

  return (
    <aside className="wvw-detail-panel" aria-label={t('wvw.details')}>
      <div className="wvw-detail-header">
        <div className="flex items-center gap-2">
          <span
            className="wvw-owner-tag"
            style={{
              backgroundColor: ownerColor.bg,
              color: ownerColor.text,
              borderColor: ownerColor.border,
            }}
          >
            {ownerDisplay}
          </span>
          <h3 className="wvw-detail-title font-serif">{objective.nameEn && !isGerman ? objective.nameEn : objective.name}</h3>
        </div>

        <button
          type="button"
          className="wvw-close-btn"
          onClick={onClose}
          title={t('wvw.closeDetails')}
        >
          <X size={16} />
        </button>
      </div>

      <div className="wvw-detail-body">
        {/* Basis-Kennzahlen */}
        <div className="wvw-detail-metrics-grid">
          <div className="wvw-metric-box">
            <span className="dim text-xs">{t('wvw.filterType')}</span>
            <strong className="text-sm">
              {objective.type === 'Castle'
                ? t('wvw.castle')
                : objective.type === 'Keep'
                ? t('wvw.keep')
                : objective.type === 'Tower'
                ? t('wvw.tower')
                : objective.type === 'Camp'
                ? t('wvw.camp')
                : objective.type === 'Ruins'
                ? t('wvw.ruins')
                : objective.type}
            </strong>
          </div>
          <div className="wvw-metric-box">
            <span className="dim text-xs">{t('wvw.pointsTick')}</span>
            <strong className="text-sm good font-mono">+{objective.pointsTick} PPT</strong>
          </div>
          <div className="wvw-metric-box">
            <span className="dim text-xs">{t('wvw.pointsCapture')}</span>
            <strong className="text-sm font-mono">+{objective.pointsCapture} {isGerman ? 'Pkt' : 'Pts'}</strong>
          </div>
          <div className="wvw-metric-box">
            <span className="dim text-xs">{t('wvw.filterMap')}</span>
            <strong className="text-sm">
              {objective.mapType === 'Center'
                ? t('wvw.mapEbg')
                : objective.mapType === 'RedHome'
                ? t('wvw.mapRed')
                : objective.mapType === 'BlueHome'
                ? t('wvw.mapBlue')
                : t('wvw.mapGreen')}
            </strong>
          </div>
        </div>

        {/* Tactical priority score (if available) */}
        {recommendation && (
          <div className="wvw-detail-prio-card mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={15} className="gold" />
                <span className="font-serif gold font-bold">{isGerman ? 'Taktische Berater-Priorität' : 'Tactical Advisor Priority'}</span>
              </div>
              <span className="wvw-prio-val font-mono font-bold text-base gold">
                {recommendation.priorityScore} / 100
              </span>
            </div>

            <div className="wvw-factors-bar-group mt-2">
              <div className="wvw-factor-mini" title={`${t('wvw.strategicBase')}: ${recommendation.factors.strategicBase}/100`}>
                <span className="dim">{isGerman ? 'Basis:' : 'Base:'}</span>
                <div className="wvw-meter">
                  <div className="wvw-meter-fill bg-amber-500" style={{ width: `${recommendation.factors.strategicBase}%` }} />
                </div>
              </div>
              <div className="wvw-factor-mini" title={`${t('wvw.leaderSwing')}: ${recommendation.factors.leaderSwing}/100`}>
                <span className="dim">Leader:</span>
                <div className="wvw-meter">
                  <div className="wvw-meter-fill bg-blue-500" style={{ width: `${recommendation.factors.leaderSwing}%` }} />
                </div>
              </div>
              <div className="wvw-factor-mini" title={`${t('wvw.vulnerability')}: ${recommendation.factors.vulnerability}/100`}>
                <span className="dim">T0/RI:</span>
                <div className="wvw-meter">
                  <div className="wvw-meter-fill bg-emerald-500" style={{ width: `${recommendation.factors.vulnerability}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs dim leading-relaxed">
              {(isGerman ? recommendation.reasons : (recommendation.reasonsEn || recommendation.reasons)).map((r, ri) => (
                <div key={ri} className="flex items-start gap-1">
                  <span className="gold">›</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Letzter Flip & RI Status */}
        <div className="wvw-detail-section mt-3">
          <h4 className="wvw-detail-section-title font-serif">
            <Clock size={13} className="inline mr-1" />
            {t('wvw.ownershipHistory')}
          </h4>

          {objective.isRiActive ? (
            <div className="wvw-ri-alert-box mt-1.5">
              <AlertTriangle size={14} className="warn shrink-0" />
              <div className="text-xs">
                <strong className="warn block">{t('wvw.riActive')}</strong>
                <span className="dim">
                  {isGerman
                    ? `Aufseher ist noch ${Math.floor(objective.riSecondsRemaining / 60)}m ${objective.riSecondsRemaining % 60}s unbesiegbar.`
                    : `Supervisor is invulnerable for ${Math.floor(objective.riSecondsRemaining / 60)}m ${objective.riSecondsRemaining % 60}s.`}
                </span>
              </div>
            </div>
          ) : objective.lastFlipped ? (
            <div className="text-xs dim mt-1 space-y-0.5">
              <div>
                {isGerman ? 'Zuletzt gewechselt: ' : 'Last flipped: '}
                <span className="text-[#f3efe6]">
                  {isGerman
                    ? `vor ${flipElapsedMinutes} Min. (${flipTimeString} Uhr)`
                    : `${flipElapsedMinutes} min ago (${flipTimeString})`}
                </span>
              </div>
              {flipElapsedMinutes !== null && flipElapsedMinutes < 20 && (
                <div className="good font-bold">
                  {isGerman ? '✓ Frischer T0-Zustand: Holztore und unbefestigt.' : '✓ Fresh T0 state: Wooden gates and unfortified.'}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs dim mt-1 block">{isGerman ? 'Kein Flip-Zeitpunkt in dieser Sitzung erfasst.' : 'No flip timestamp recorded in this session.'}</span>
          )}
        </div>

        {/* Gildenanspruch */}
        <div className="wvw-detail-section mt-3">
          <h4 className="wvw-detail-section-title font-serif">
            <Shield size={13} className="inline mr-1" />
            {t('wvw.guildClaim')}
          </h4>
          {objective.guildInfo ? (
            <div className="text-xs mt-1">
              <span className="gold font-mono font-bold mr-1">[{objective.guildInfo.tag}]</span>
              <strong className="text-[#f3efe6]">{objective.guildInfo.name}</strong>
              <div className="dim text-xs mt-0.5">
                {isGerman
                  ? `Upgrades aktiv: ${objective.guildUpgrades.length} • Gelieferte Dolyaks: ${objective.yaksDelivered}`
                  : `Active upgrades: ${objective.guildUpgrades.length} • Dolyaks delivered: ${objective.yaksDelivered}`}
              </div>
            </div>
          ) : (
            <span className="text-xs dim mt-1 block">{t('wvw.unclaimed')} {isGerman ? '(Keine defensiven Taktiken)' : '(No defensive tactics)'}</span>
          )}
        </div>

        {/* Chat-Link */}
        {objective.chatLink && (
          <div className="wvw-detail-section mt-3">
            <h4 className="wvw-detail-section-title font-serif">{t('wvw.chatCode')}</h4>
            <div className="wvw-chat-link-row mt-1">
              <code className="font-mono text-xs">{objective.chatLink}</code>
              <button
                type="button"
                className="gw2-btn-sm"
                onClick={handleCopy}
                title={t('wvw.copyChatLink')}
              >
                {copied ? <Check size={12} className="good inline" /> : <Copy size={12} className="inline" />}
                <span className="ml-1">{copied ? t('wvw.copied') : t('wvw.copy')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Source & Compliance Note */}
        <div className="wvw-detail-section mt-3 pt-2" style={{ borderTop: '1px solid #2a2c35' }}>
          <div className="dim text-2xs leading-normal">
            {isGerman
              ? 'Quelle: Offizielle ArenaNet WvW-API. Berechnete Heuristik/Schätzung. Gegnerische Spielerzahlen/Zerg-Positionen sind in der API nicht enthalten.'
              : 'Source: Official ArenaNet WvW API. Heuristic estimate. Enemy player counts and zerg positions are not provided by the API.'}
          </div>
        </div>
      </div>

      {/* Aktionen unten */}
      <div className="wvw-detail-footer">
        <button
          type="button"
          className="gw2-btn-primary flex-1"
          onClick={() => onSendChat(objective)}
          title={isGerman ? 'Taktik-Aufruf in die Zwischenablage kopieren' : 'Copy tactical callout to clipboard'}
        >
          <MessageSquare size={14} className="inline mr-1.5" />
          <span>{t('wvw.sendChat')}</span>
        </button>

        <button
          type="button"
          className={`gw2-btn-secondary ${isPinned ? 'active-gold' : ''}`}
          onClick={() => onTogglePin(objective.id)}
          title={isPinned ? (isGerman ? 'Aus Favoriten entfernen' : 'Remove from pinned') : t('wvw.pin')}
        >
          <Star size={14} fill={isPinned ? '#d2b268' : 'none'} />
        </button>

        <button
          type="button"
          className="gw2-btn-secondary"
          onClick={() => onToggleIgnore(objective.id)}
          title={isIgnored ? t('wvw.unignore') : t('wvw.ignore')}
        >
          <EyeOff size={14} />
        </button>
      </div>
    </aside>
  );
};
