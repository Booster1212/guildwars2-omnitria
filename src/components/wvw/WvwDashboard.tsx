import React from 'react';
import type { WvwMatch, WvwWorld, WvwCombinedObjective, WvwTeam, WvwObservedFlip } from '../../data/gw2/wvw/types.ts';
import { TEAM_COLORS } from '../../data/gw2/wvw/constants.ts';
import { resolveTeamNames } from '../../data/gw2/wvw/teamUtils.ts';
import { evaluateMapOpportunities } from '../../data/gw2/wvw/mapAdvisor.ts';
import { useTranslation } from '../../i18n/index.ts';
import { Shield, Skull, Sword, Flag, Flame, Zap, History, Filter } from 'lucide-react';
import { IconCastle, IconKeep, IconTower, IconCamp } from './WvwIcons.tsx';

interface WvwDashboardProps {
  match: WvwMatch | null;
  worldsMap: Map<number, WvwWorld>;
  objectives: WvwCombinedObjective[];
  playerTeam: WvwTeam;
  sessionFlips?: WvwObservedFlip[];
  onFilterMapClick?: (mapType: string) => void;
}

export const WvwDashboard: React.FC<WvwDashboardProps> = ({
  match,
  worldsMap,
  objectives,
  playerTeam,
  sessionFlips = [],
  onFilterMapClick,
}) => {
  const { t, lang } = useTranslation();
  const isGerman = lang === 'de';

  if (!match) {
    return (
      <div className="wvw-loading-state">
        <div className="gw2-spinner" />
        <p className="dim mt-3">{isGerman ? 'Lade WvW-Matchdaten...' : 'Loading WvW match data...'}</p>
      </div>
    );
  }

  // Resolve real server names & linked worlds
  const redInfo = resolveTeamNames('Red', match, worldsMap);
  const blueInfo = resolveTeamNames('Blue', match, worldsMap);
  const greenInfo = resolveTeamNames('Green', match, worldsMap);

  const totalScore = (match.scores.red || 0) + (match.scores.blue || 0) + (match.scores.green || 0) || 1;
  const redPct = ((match.scores.red || 0) / totalScore) * 100;
  const bluePct = ((match.scores.blue || 0) / totalScore) * 100;
  const greenPct = ((match.scores.green || 0) / totalScore) * 100;

  // K/D Berechnungen
  const redKd = match.deaths.red > 0 ? (match.kills.red / match.deaths.red).toFixed(2) : '-';
  const blueKd = match.deaths.blue > 0 ? (match.kills.blue / match.deaths.blue).toFixed(2) : '-';
  const greenKd = match.deaths.green > 0 ? (match.kills.green / match.deaths.green).toFixed(2) : '-';

  // Count objectives per team
  const countStructures = (team: 'Red' | 'Blue' | 'Green') => {
    let castles = 0;
    let keeps = 0;
    let towers = 0;
    let camps = 0;
    let ppt = 0;

    for (const obj of objectives) {
      if (obj.owner === team) {
        ppt += obj.pointsTick || 0;
        if (obj.type === 'Castle') castles++;
        else if (obj.type === 'Keep') keeps++;
        else if (obj.type === 'Tower') towers++;
        else if (obj.type === 'Camp') camps++;
      }
    }
    return { castles, keeps, towers, camps, ppt };
  };

  const redStructs = countStructures('Red');
  const blueStructs = countStructures('Blue');
  const greenStructs = countStructures('Green');

  const teamCards = [
    {
      team: 'Red' as WvwTeam,
      info: redInfo,
      score: match.scores.red,
      vp: match.victory_points?.red,
      kills: match.kills.red,
      deaths: match.deaths.red,
      kd: redKd,
      structs: redStructs,
    },
    {
      team: 'Blue' as WvwTeam,
      info: blueInfo,
      score: match.scores.blue,
      vp: match.victory_points?.blue,
      kills: match.kills.blue,
      deaths: match.deaths.blue,
      kd: blueKd,
      structs: blueStructs,
    },
    {
      team: 'Green' as WvwTeam,
      info: greenInfo,
      score: match.scores.green,
      vp: match.victory_points?.green,
      kills: match.kills.green,
      deaths: match.deaths.green,
      kd: greenKd,
      structs: greenStructs,
    },
  ];

  // Map ranking by activity & WvXP/WvBP potential
  const mapRecs = evaluateMapOpportunities(objectives, playerTeam, sessionFlips, match);

  return (
    <div className="wvw-dashboard">
      {/* 1. Gesamte Match-Scorebar */}
      <section className="wvw-section wvw-score-overview">
        <div className="wvw-score-bar-container">
          <div
            className="wvw-score-bar-fill red"
            style={{ width: `${redPct}%` }}
            title={`${isGerman ? 'Rot' : 'Red'} (${redInfo.mainName}): ${match.scores.red.toLocaleString()} (${redPct.toFixed(1)}%)`}
          />
          <div
            className="wvw-score-bar-fill blue"
            style={{ width: `${bluePct}%` }}
            title={`${isGerman ? 'Blau' : 'Blue'} (${blueInfo.mainName}): ${match.scores.blue.toLocaleString()} (${bluePct.toFixed(1)}%)`}
          />
          <div
            className="wvw-score-bar-fill green"
            style={{ width: `${greenPct}%` }}
            title={`${isGerman ? 'Grün' : 'Green'} (${greenInfo.mainName}): ${match.scores.green.toLocaleString()} (${greenPct.toFixed(1)}%)`}
          />
        </div>

        {/* 3 team cards in direct comparison with server names */}
        <div className="wvw-teams-grid">
          {teamCards.map((tc) => {
            const isOwn = tc.team === playerTeam;
            const color = TEAM_COLORS[tc.team];
            const teamColorName = isGerman
              ? (tc.team === 'Red' ? 'Rot' : tc.team === 'Blue' ? 'Blau' : 'Grün')
              : tc.team;

            return (
              <div
                key={tc.team}
                className={`wvw-team-card ${tc.team.toLowerCase()} ${isOwn ? 'is-own-team' : ''}`}
                style={{
                  borderTopColor: color.main,
                  background: isOwn ? `linear-gradient(180deg, ${color.bg} 0%, rgba(21, 23, 28, 0.95) 100%)` : undefined,
                }}
              >
                <div className="wvw-team-card-header">
                  <div className="wvw-team-name-row">
                    <span
                      className="wvw-team-dot"
                      style={{ backgroundColor: color.main, boxShadow: `0 0 8px ${color.glow}` }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="wvw-team-color-label text-xs font-bold" style={{ color: color.text }}>
                          {teamColorName}
                        </span>
                        {isOwn && <span className="wvw-own-team-badge">{t('wvw.yourTeam')}</span>}
                      </div>
                      <h3 className="wvw-team-title font-serif">{tc.info.mainName}</h3>
                      {tc.info.linkedNames.length > 0 && (
                        <span className="wvw-linked-worlds dim text-[11px] block">
                          + {tc.info.linkedNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="wvw-team-ppt font-mono" title={t('wvw.pointsTick')}>
                    +{tc.structs.ppt} PPT
                  </span>
                </div>

                <div className="wvw-team-score-row">
                  <div className="wvw-stat-block">
                    <span className="dim text-xs">{t('wvw.scores')}</span>
                    <span className="wvw-score-number font-mono">{tc.score.toLocaleString()}</span>
                  </div>
                  {tc.vp !== undefined && (
                    <div className="wvw-stat-block text-right">
                      <span className="dim text-xs">{t('wvw.victoryPoints')}</span>
                      <span className="wvw-vp-number font-mono gold font-bold">{tc.vp} VP</span>
                    </div>
                  )}
                </div>

                {/* Kills, Deaths & K/D */}
                <div className="wvw-kd-row">
                  <div className="wvw-kd-pill" title={`${tc.kills.toLocaleString()} Kills`}>
                    <Sword size={12} className="good" />
                    <span className="font-mono text-xs">{tc.kills.toLocaleString()}</span>
                  </div>
                  <div className="wvw-kd-pill" title={`${tc.deaths.toLocaleString()} ${isGerman ? 'Tode' : 'Deaths'}`}>
                    <Skull size={12} className="bad" />
                    <span className="font-mono text-xs">{tc.deaths.toLocaleString()}</span>
                  </div>
                  <div className="wvw-kd-pill" title={isGerman ? 'K/D Verhältnis' : 'K/D Ratio'}>
                    <span className="dim text-xs">K/D:</span>
                    <span className="font-mono text-xs font-bold">{tc.kd}</span>
                  </div>
                </div>

                {/* Gehaltene Strukturen */}
                <div className="wvw-structures-summary">
                  <span className="dim text-xs mb-1 block">{t('wvw.structures')}:</span>
                  <div className="wvw-struct-icons-grid">
                    <span className="wvw-struct-pill" title={isGerman ? 'Schloss Steinnebel' : 'Stonemist Castle'}>
                      <IconCastle size={12} />
                      <span className="font-mono">{tc.structs.castles}</span>
                    </span>
                    <span className="wvw-struct-pill" title={t('wvw.keeps')}>
                      <Shield size={12} />
                      <span className="font-mono">{tc.structs.keeps}</span>
                    </span>
                    <span className="wvw-struct-pill" title={t('wvw.towers')}>
                      <IconTower size={12} />
                      <span className="font-mono">{tc.structs.towers}</span>
                    </span>
                    <span className="wvw-struct-pill" title={t('wvw.camps')}>
                      <IconCamp size={12} />
                      <span className="font-mono">{tc.structs.camps}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. KARTEN-EMPFEHLUNG & WvXP/WvBP EINSATZPLAN */}
      <section className="wvw-section wvw-map-ranking-section">
        <div className="flex items-center justify-between mb-3">
          <h3 className="wvw-section-title font-serif">
            <Flame size={16} className="text-amber-400 mr-1.5 inline" />
            {isGerman ? 'Kartenempfehlung für maximale WvXP & Belohnungspfad (WvBP)' : 'Recommended Maps for Maximum WvXP & Track Progress'}
          </h3>
          <span className="dim text-xs">
            {isGerman ? 'Sortiert nach Aktivität, offenen Lagern & schnellen Einnahmen' : 'Ranked by activity and available targets'}
          </span>
        </div>

        <div className="wvw-map-ranking-grid">
          {mapRecs.map((rec, rankIdx) => (
            <div
              key={rec.mapType}
              className={`wvw-map-rank-card rank-${rankIdx + 1} cursor-pointer`}
              onClick={() => onFilterMapClick?.(rec.mapType)}
              title={isGerman ? 'Klicken, um diesen Kartenausschnitt im Berater zu filtern' : 'Click to filter on this map'}
            >
              <div className="wvw-map-rank-head">
                <div className="flex items-center gap-2">
                  <span className="wvw-map-rank-number font-mono font-bold">#{rankIdx + 1}</span>
                  <div>
                    <h4 className="wvw-map-rank-title font-serif">{isGerman ? rec.mapNameDe : rec.mapNameEn}</h4>
                    <span className="wvw-map-rank-badge">{isGerman ? rec.badgeDe : rec.badgeEn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold gold text-sm">{rec.score}%</span>
                  <span className="dim text-[10px] block">{isGerman ? 'Chance' : 'Rating'}</span>
                </div>
              </div>

              {/* Fortschrittsbalken */}
              <div className="wvw-opportunity-meter mt-2">
                <div
                  className={`wvw-opportunity-fill ${rankIdx === 0 ? 'top-fill' : ''}`}
                  style={{ width: `${rec.score}%` }}
                />
              </div>

              {/* Quick objective overview */}
              <div className="wvw-map-rank-metrics mt-2 dim text-xs flex justify-between">
                <span>{rec.stats.enemyCampsAvailable} {isGerman ? 'Lager offen' : 'camps open'}</span>
                <span>{rec.stats.enemyTowersAvailable + rec.stats.enemyKeepsAvailable} {isGerman ? 'Festen/Türme' : 'keeps/towers'}</span>
                {rec.stats.t0VulnerableCount > 0 && (
                  <span className="text-amber-300 font-bold">{rec.stats.t0VulnerableCount}x T0</span>
                )}
              </div>

              {/* Reasoning */}
              <p className="wvw-map-rank-reason mt-2 text-[11px] text-[#d6d1c5] leading-snug">
                {isGerman ? rec.reasonsDe[0] : rec.reasonsEn[0]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Map overview & points per map */}
      <section className="wvw-section wvw-maps-section">
        <h3 className="wvw-section-title font-serif mb-3">
          <Flag size={15} className="mr-1.5 gold inline" />
          {isGerman ? 'Kartenübersicht & Punkte pro WvW-Karte' : 'Map Overview & Scores per WvW Map'}
        </h3>

        <div className="wvw-map-cards-grid">
          {match.maps.map((m) => {
            const mapTitle =
              m.type === 'Center'
                ? t('wvw.mapEbg')
                : m.type === 'RedHome'
                ? t('wvw.mapRed')
                : m.type === 'BlueHome'
                ? t('wvw.mapBlue')
                : t('wvw.mapGreen');

            const mTotal = (m.scores.red || 0) + (m.scores.blue || 0) + (m.scores.green || 0) || 1;
            const rP = ((m.scores.red || 0) / mTotal) * 100;
            const bP = ((m.scores.blue || 0) / mTotal) * 100;
            const gP = ((m.scores.green || 0) / mTotal) * 100;

            const mapObjs = objectives.filter((o) => o.mapType === m.type);
            const rCount = mapObjs.filter((o) => o.owner === 'Red').length;
            const bCount = mapObjs.filter((o) => o.owner === 'Blue').length;
            const gCount = mapObjs.filter((o) => o.owner === 'Green').length;

            return (
              <div
                key={m.id}
                className="wvw-map-summary-card cursor-pointer"
                onClick={() => onFilterMapClick?.(m.type)}
                title={isGerman ? 'Klicken, um diesen Kartenausschnitt im Berater oder der Lagekarte zu filtern' : 'Click to filter on this map in advisor or tactical map'}
              >
                <div className="wvw-map-card-head">
                  <h4 className="wvw-map-name font-serif">{mapTitle}</h4>
                  <span className="dim text-xs font-mono">{mapObjs.length} {t('wvw.targets')}</span>
                </div>

                {/* Mini score bar for this map */}
                <div className="wvw-mini-scorebar">
                  <div className="wvw-score-bar-fill red" style={{ width: `${rP}%` }} />
                  <div className="wvw-score-bar-fill blue" style={{ width: `${bP}%` }} />
                  <div className="wvw-score-bar-fill green" style={{ width: `${gP}%` }} />
                </div>

                <div className="wvw-map-score-details">
                  <span className="red font-mono text-xs" title={`${isGerman ? 'Rot' : 'Red'}: ${m.scores.red?.toLocaleString() || 0} ${isGerman ? 'Pkt' : 'Pts'}`}>
                    R: {m.scores.red?.toLocaleString() || 0} ({rCount})
                  </span>
                  <span className="blue font-mono text-xs" title={`${isGerman ? 'Blau' : 'Blue'}: ${m.scores.blue?.toLocaleString() || 0} ${isGerman ? 'Pkt' : 'Pts'}`}>
                    B: {m.scores.blue?.toLocaleString() || 0} ({bCount})
                  </span>
                  <span className="green font-mono text-xs" title={`${isGerman ? 'Grün' : 'Green'}: ${m.scores.green?.toLocaleString() || 0} ${isGerman ? 'Pkt' : 'Pts'}`}>
                    G: {m.scores.green?.toLocaleString() || 0} ({gCount})
                  </span>
                </div>

                {m.kills && m.deaths && (
                  <div className="wvw-map-kd-summary dim text-xs mt-2 pt-1 border-t border-[#252830] flex justify-between">
                    <span>
                      Kills: <span className="text-[#f3efe6] font-mono">{m.kills.red + m.kills.blue + m.kills.green}</span>
                    </span>
                    <span>
                      {isGerman ? 'Tode:' : 'Deaths:'} <span className="text-[#f3efe6] font-mono">{m.deaths.red + m.deaths.blue + m.deaths.green}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
