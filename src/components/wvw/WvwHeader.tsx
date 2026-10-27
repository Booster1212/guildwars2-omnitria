import React from 'react';
import {
  RotateCw,
  Crosshair,
  Map as MapIcon,
  BarChart3,
  History,
  Shield,
  Sliders,
  Check,
} from 'lucide-react';
import type { WvwTeam, WvwWorld, WvwMatch } from '../../data/gw2/wvw/types.ts';
import { TEAM_COLORS } from '../../data/gw2/wvw/constants.ts';
import { resolveTeamNames, formatMatchOptionLabel } from '../../data/gw2/wvw/teamUtils.ts';
import { useTranslation } from '../../i18n/index.ts';

export type WvwSubTab = 'advisor' | 'map' | 'dashboard' | 'flips';

interface WvwHeaderProps {
  currentSubTab: WvwSubTab;
  onSelectSubTab: (tab: WvwSubTab) => void;
  matchId: string;
  onSelectMatchId: (id: string) => void;
  availableMatchIds: string[];
  playerTeam: WvwTeam;
  onSelectPlayerTeam: (team: WvwTeam) => void;
  isFetching: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
  match: WvwMatch | null;
  worldsMap: Map<number, WvwWorld>;
  flipsCount: number;
  onOpenWeightsModal: () => void;
}

export const WvwHeader: React.FC<WvwHeaderProps> = ({
  currentSubTab,
  onSelectSubTab,
  matchId,
  onSelectMatchId,
  availableMatchIds,
  playerTeam,
  onSelectPlayerTeam,
  isFetching,
  onRefresh,
  lastUpdated,
  match,
  worldsMap,
  flipsCount,
  onOpenWeightsModal,
}) => {
  const { t, lang } = useTranslation();

  // Reliably resolve world & server names for all 3 teams
  const redInfo = resolveTeamNames('Red', match, worldsMap);
  const blueInfo = resolveTeamNames('Blue', match, worldsMap);
  const greenInfo = resolveTeamNames('Green', match, worldsMap);

  const timeString = lastUpdated
    ? lastUpdated.toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <header className="wvw-header">
      {/* Obere Leiste: Titel, Match-Auswahl, Team-Wahl & Refresh */}
      <div className="wvw-header-top">
        <div className="wvw-title-section">
          <div className="wvw-badge-alpha">Alpha</div>
          <h2 className="wvw-main-title font-serif">{t('wvw.title')}</h2>
          <span className="wvw-subtitle dim">{t('wvw.subtitle')}</span>
        </div>

        <div className="wvw-controls-section">
          {/* Match dropdown with real server names */}
          <div className="wvw-select-group">
            <label htmlFor="wvw-match-select" className="dim text-xs font-serif">
              {t('wvw.match')}:
            </label>
            <select
              id="wvw-match-select"
              value={matchId}
              onChange={(e) => onSelectMatchId(e.target.value)}
              className="wvw-select font-sans"
              title={lang === 'de' ? 'Aktives WvW-Match wählen' : 'Select active WvW match'}
            >
              {availableMatchIds.map((id) => (
                <option key={id} value={id}>
                  {formatMatchOptionLabel(id, match, worldsMap)}
                </option>
              ))}
            </select>
          </div>

          {/* Team selection with real server names */}
          <div className="wvw-team-toggle-group">
            <span className="dim text-xs font-serif">{t('wvw.yourTeam')}:</span>
            {(['Red', 'Blue', 'Green'] as WvwTeam[]).map((team) => {
              const active = playerTeam === team;
              const color = TEAM_COLORS[team];
              const teamInfo = team === 'Red' ? redInfo : team === 'Blue' ? blueInfo : greenInfo;
              const teamColorName = lang === 'de'
                ? (team === 'Red' ? 'Rot' : team === 'Blue' ? 'Blau' : 'Grün')
                : team;

              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => onSelectPlayerTeam(team)}
                  className={`wvw-team-btn ${team.toLowerCase()} ${active ? 'active' : ''}`}
                  title={`${teamColorName}: ${teamInfo.fullName} - ${lang === 'de' ? 'Als eigenes Team festlegen' : 'Set as your team'}`}
                  style={{
                    borderColor: active ? color.main : undefined,
                    backgroundColor: active ? color.bg : undefined,
                    color: active ? color.text : undefined,
                  }}
                >
                  <Shield size={13} fill={active ? color.main : 'none'} className="shrink-0" />
                  <div className="wvw-team-btn-label">
                    <span className="wvw-team-name">{teamInfo.mainName}</span>
                    {teamInfo.linkedNames.length > 0 && (
                      <span className="wvw-team-linked dim">+{teamInfo.linkedNames[0]}</span>
                    )}
                  </div>
                  {active && <Check size={12} className="ml-1 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>

          {/* Konfiguration & Aktualisieren */}
          <button
            type="button"
            className="wvw-icon-btn"
            onClick={onOpenWeightsModal}
            title={t('wvw.weightsConfig')}
          >
            <Sliders size={14} />
          </button>

          <button
            type="button"
            className={`wvw-refresh-btn ${isFetching ? 'is-spinning' : ''}`}
            onClick={onRefresh}
            title={`${t('wvw.refreshNow')} (${t('wvw.lastUpdated')}: ${timeString})`}
            disabled={isFetching}
          >
            <RotateCw size={14} />
            <span className="text-xs font-mono">{timeString}</span>
          </button>
        </div>
      </div>

      {/* Untere Leiste: Subtab-Navigation */}
      <div className="wvw-nav-tabs">
        <button
          type="button"
          className={`wvw-tab-btn ${currentSubTab === 'advisor' ? 'active' : ''}`}
          onClick={() => onSelectSubTab('advisor')}
        >
          <Crosshair size={15} />
          <span>{t('wvw.tabAdvisor')}</span>
        </button>

        <button
          type="button"
          className={`wvw-tab-btn ${currentSubTab === 'map' ? 'active' : ''}`}
          onClick={() => onSelectSubTab('map')}
        >
          <MapIcon size={15} />
          <span>{t('wvw.tabMap')}</span>
        </button>

        <button
          type="button"
          className={`wvw-tab-btn ${currentSubTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectSubTab('dashboard')}
        >
          <BarChart3 size={15} />
          <span>{t('wvw.tabDashboard')}</span>
        </button>

        <button
          type="button"
          className={`wvw-tab-btn ${currentSubTab === 'flips' ? 'active' : ''}`}
          onClick={() => onSelectSubTab('flips')}
        >
          <History size={15} />
          <span>{t('wvw.tabFlips')}</span>
          {flipsCount > 0 && <span className="wvw-counter-badge">{flipsCount}</span>}
        </button>
      </div>
    </header>
  );
};
