import React from 'react';
import type { WvwObservedFlip, WvwCombinedObjective } from '../../data/gw2/wvw/types.ts';
import { TEAM_COLORS } from '../../data/gw2/wvw/constants.ts';
import { useTranslation } from '../../i18n';
import { History, ArrowRight, AlertTriangle, Shield, Clock } from 'lucide-react';

interface WvwFlipsHistoryProps {
  flips: WvwObservedFlip[];
  onSelectObjectiveById: (id: string) => void;
}

export const WvwFlipsHistory: React.FC<WvwFlipsHistoryProps> = ({
  flips,
  onSelectObjectiveById,
}) => {
  const { t, lang } = useTranslation();
  const isGerman = lang === 'de';

  return (
    <div className="wvw-flips-view">
      {/* Hinweis zur Historie */}
      <div className="wvw-disclaimer-box mb-3">
        <div className="flex items-start gap-2">
          <Clock size={16} className="gold shrink-0 mt-0.5" />
          <div className="text-xs">
            <h5 className="font-serif gold font-bold mb-0.5">{t('wvw.tabFlips')} {isGerman ? '(Sitzungs-Protokoll)' : '(Session Log)'}</h5>
            <p className="dim leading-relaxed">{t('wvw.flipsHelp')}</p>
          </div>
        </div>
      </div>

      {flips.length === 0 ? (
        <div className="wvw-empty-state">
          <History size={32} className="dim mb-2" />
          <p>{t('wvw.noFlipsYet')}</p>
          <span className="dim text-xs mt-1 block">
            {isGerman
              ? 'Sobald ein gegnerisches oder eigenes Ziel den Besitzer wechselt, wird es hier live mit RI-Countdown aufgeführt.'
              : 'Flips between teams are recorded live with Righteous Indignation countdown timers.'}
          </span>
        </div>
      ) : (
        <div className="wvw-flips-list">
          {flips.map((flip) => {
            const oldColor = TEAM_COLORS[flip.oldOwner] || TEAM_COLORS.Neutral;
            const newColor = TEAM_COLORS[flip.newOwner] || TEAM_COLORS.Neutral;

            const now = Date.now();
            const riRemainingSec = Math.max(0, Math.floor((flip.riExpiresAt.getTime() - now) / 1000));
            const isRiActive = riRemainingSec > 0;

            const timeStr = flip.timestamp.toLocaleTimeString(isGerman ? 'de-DE' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={flip.id}
                className="wvw-flip-card cursor-pointer"
                onClick={() => onSelectObjectiveById(flip.objectiveId)}
                title={isGerman ? 'Klicken, um Zieldetails anzuzeigen' : 'Click to view objective details'}
              >
                <div className="wvw-flip-card-left">
                  <div className="wvw-flip-title-row">
                    <span className="font-serif font-bold text-sm text-[#f3efe6]">
                      {flip.objectiveNameEn && !isGerman ? flip.objectiveNameEn : flip.objectiveName}
                    </span>
                    <span className="dim text-xs">
                      (
                      {flip.mapType === 'Center'
                        ? t('wvw.mapEbgShort')
                        : flip.mapType === 'RedHome'
                        ? t('wvw.mapRedShort')
                        : flip.mapType === 'BlueHome'
                        ? t('wvw.mapBlueShort')
                        : t('wvw.mapGreenShort')}
                      )
                    </span>
                  </div>

                  <div className="wvw-flip-transition mt-1 flex items-center gap-2">
                    <span
                      className="wvw-owner-tag-sm"
                      style={{
                        backgroundColor: oldColor.bg,
                        color: oldColor.text,
                        borderColor: oldColor.border,
                      }}
                    >
                      {flip.oldOwner === 'Red'
                        ? t('wvw.teamRed')
                        : flip.oldOwner === 'Blue'
                        ? t('wvw.teamBlue')
                        : flip.oldOwner === 'Green'
                        ? t('wvw.teamGreen')
                        : t('wvw.teamNeutral')}
                    </span>
                    <ArrowRight size={13} className="dim" />
                    <span
                      className="wvw-owner-tag-sm"
                      style={{
                        backgroundColor: newColor.bg,
                        color: newColor.text,
                        borderColor: newColor.border,
                      }}
                    >
                      {flip.newOwner === 'Red'
                        ? t('wvw.teamRed')
                        : flip.newOwner === 'Blue'
                        ? t('wvw.teamBlue')
                        : flip.newOwner === 'Green'
                        ? t('wvw.teamGreen')
                        : t('wvw.teamNeutral')}
                    </span>
                  </div>
                </div>

                <div className="wvw-flip-card-right text-right">
                  <span className="dim text-xs font-mono">{timeStr}</span>
                  {isRiActive ? (
                    <div className="wvw-flip-ri-badge mt-1">
                      <AlertTriangle size={11} className="inline mr-1" />
                      <span>
                        RI: {Math.floor(riRemainingSec / 60)}m {riRemainingSec % 60}s
                      </span>
                    </div>
                  ) : (
                    <div className="good text-xs mt-1">{isGerman ? 'RI abgelaufen (T0)' : 'RI expired (T0)'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
