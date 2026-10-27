import React, { useState, useMemo } from 'react';
import type {
  TacticalRecommendation,
  WvwCombinedObjective,
  AdvisorConfig,
  AdvisorPreset,
  WvwMapType,
  WvwMatch,
  WvwWorld,
} from '../../data/gw2/wvw/types.ts';
import type { MapRecommendation } from '../../data/gw2/wvw/mapAdvisor.ts';
import { TEAM_COLORS, ADVISOR_PRESETS } from '../../data/gw2/wvw/constants.ts';
import { getOwnerDisplayName } from '../../data/gw2/wvw/teamUtils.ts';
import { useTranslation } from '../../i18n/index.ts';
import {
  Crosshair,
  Shield,
  Star,
  EyeOff,
  Copy,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Sliders,
  Zap,
  Flame,
  Compass,
  Map as MapIcon,
  Check,
  History,
} from 'lucide-react';
import { IconCastle, IconKeep, IconTower, IconCamp } from './WvwIcons.tsx';

interface WvwAdvisorViewProps {
  topRecommendations: TacticalRecommendation[];
  alternativeRecommendations: TacticalRecommendation[];
  allRanked: TacticalRecommendation[];
  mapRecommendations: MapRecommendation[];
  match: WvwMatch | null;
  worldsMap: Map<number, WvwWorld>;
  config: AdvisorConfig;
  onUpdateConfig: (partial: Partial<AdvisorConfig>) => void;
  onSelectObjective: (obj: WvwCombinedObjective) => void;
  onSendChat: (obj: WvwCombinedObjective) => void;
  onCopyChatLink: (obj: WvwCombinedObjective) => void;
  onTogglePin: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onOpenWeightsModal: () => void;
  onSwitchToMap: (objId?: string) => void;
}

export const WvwAdvisorView: React.FC<WvwAdvisorViewProps> = ({
  topRecommendations,
  alternativeRecommendations,
  allRanked,
  mapRecommendations,
  match,
  worldsMap,
  config,
  onUpdateConfig,
  onSelectObjective,
  onSendChat,
  onCopyChatLink,
  onTogglePin,
  onToggleIgnore,
  onOpenWeightsModal,
  onSwitchToMap,
}) => {
  const { t, lang } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isGerman = lang === 'de';

  const handleCopy = (obj: WvwCombinedObjective) => {
    onCopyChatLink(obj);
    setCopiedId(obj.id);
    setTimeout(() => setCopiedId((c) => (c === obj.id ? null : c)), 2000);
  };

  // Filteralternativen filtern
  const filteredAlternatives = useMemo(() => {
    let list = alternativeRecommendations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.objective.name.toLowerCase().includes(q) ||
          r.objective.type.toLowerCase().includes(q) ||
          r.objective.mapType.toLowerCase().includes(q) ||
          (r.objective.guildInfo && r.objective.guildInfo.tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [alternativeRecommendations, searchQuery]);

  // Ignorierte Ziele filtern
  const ignoredList = useMemo(() => {
    return allRanked.filter((r) => r.isIgnored);
  }, [allRanked]);

  // Best recommended map for maximum WvXP/WvBP
  const topMapRec = mapRecommendations.length > 0 ? mapRecommendations[0] : null;

  return (
    <div className="wvw-advisor-view">
      {/* 1. Filter and settings bar */}
      <div className="wvw-filter-bar">
        {/* Presets */}
        <div className="wvw-preset-selector">
          <span className="dim text-xs mr-1 font-serif">{t('wvw.preset')}:</span>
          {(['balanced', 'aggressive', 'territorial', 'roamer'] as AdvisorPreset[]).map((p) => {
            const active = config.preset === p;
            const presetInfo = ADVISOR_PRESETS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    preset: p,
                    weights: { ...presetInfo.weights },
                  })
                }
                className={`wvw-preset-pill ${active ? 'active' : ''}`}
                title={isGerman ? presetInfo.descDe : presetInfo.descEn}
              >
                {isGerman ? presetInfo.labelDe.split(' ')[0] : presetInfo.labelEn.split(' ')[0]}
              </button>
            );
          })}

          <button
            type="button"
            className="wvw-weights-btn"
            onClick={onOpenWeightsModal}
            title={t('wvw.weightsConfig')}
          >
            <Sliders size={13} className="mr-1 inline" />
            <span>{t('wvw.weightsConfig')}</span>
          </button>
        </div>

        {/* Karten- & Typenfilter */}
        <div className="wvw-filter-row">
          {/* Kartenfilter */}
          <div className="wvw-filter-pills">
            <span className="dim text-xs font-serif">{t('wvw.filterMap')}:</span>
            {[
              { id: 'all', label: t('wvw.filterAll') },
              { id: 'Center', label: t('wvw.mapEbgShort') },
              { id: 'RedHome', label: t('wvw.mapRedShort') },
              { id: 'BlueHome', label: t('wvw.mapBlueShort') },
              { id: 'GreenHome', label: t('wvw.mapGreenShort') },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`wvw-filter-btn ${config.filterMap === m.id ? 'active' : ''}`}
                onClick={() => onUpdateConfig({ filterMap: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Typenfilter */}
          <div className="wvw-filter-pills">
            <span className="dim text-xs font-serif">{t('wvw.filterType')}:</span>
            {[
              { id: 'all', label: t('wvw.filterAll') },
              { id: 'Castle', label: t('wvw.castles') },
              { id: 'Keep', label: t('wvw.keeps') },
              { id: 'Tower', label: t('wvw.towers') },
              { id: 'Camp', label: t('wvw.camps') },
            ].map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                className={`wvw-filter-btn ${config.filterType === tItem.id ? 'active' : ''}`}
                onClick={() => onUpdateConfig({ filterType: tItem.id })}
              >
                {tItem.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. PROMINENT MAP RECOMMENDATION (FOR MAXIMUM WvXP / WvBP) */}
      {topMapRec && (
        <section className="wvw-map-rec-hero-card" aria-label={isGerman ? 'Kartenempfehlung für maximale WvXP' : 'Map recommendation for maximum WvXP'}>
          <div className="wvw-map-rec-hero-header">
            <div className="wvw-map-rec-title-wrap">
              <div className="wvw-map-rec-icon-glow">
                <Flame size={20} className="text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="wvw-map-rec-tag">
                    {isGerman ? 'Top WvXP & Belohnungspfad (WvBP)' : 'Top WvXP & Skirmish Track'}
                  </span>
                  <span className="wvw-map-rec-badge">
                    {isGerman ? topMapRec.badgeDe : topMapRec.badgeEn}
                  </span>
                  <span className="dim text-xs font-mono font-bold">
                    {isGerman ? 'Chance:' : 'Rating:'} <strong className="gold">{topMapRec.score}%</strong>
                  </span>
                </div>
                <h3 className="wvw-map-rec-title font-serif">
                  {isGerman ? topMapRec.mapNameDe : topMapRec.mapNameEn}
                </h3>
              </div>
            </div>

            <div className="wvw-map-rec-actions">
              <button
                type="button"
                className={`wvw-hero-action-btn ${config.filterMap === topMapRec.mapType ? 'is-active' : ''}`}
                onClick={() => onUpdateConfig({ filterMap: topMapRec.mapType })}
                title={isGerman ? 'Nur Ziele dieser Karte anzeigen' : 'Filter to this map'}
              >
                <Filter size={13} className="mr-1 inline" />
                <span>{config.filterMap === topMapRec.mapType ? t('wvw.mapFiltered') : t('wvw.focusMap')}</span>
              </button>

              <button
                type="button"
                className="wvw-hero-primary-btn"
                onClick={() => onSwitchToMap()}
                title={isGerman ? 'Zur interaktiven Lagekarte wechseln' : 'Open tactical map'}
              >
                <MapIcon size={14} className="mr-1.5 inline" />
                <span>{t('wvw.viewOnMap')}</span>
              </button>
            </div>
          </div>

          {/* Quick stats bar of recommended map */}
          <div className="wvw-map-rec-body">
            <div className="wvw-map-rec-stats-strip">
              <div className="wvw-map-stat-pill" title={isGerman ? 'Lager ohne RI (sofortige Stufe 6 Teilnahme)' : 'Camps without RI (instant tier 6 participation)'}>
                <IconCamp size={13} className="gold" />
                <span><strong>{topMapRec.stats.enemyCampsAvailable}</strong> {isGerman ? 'Lager bereit' : 'Camps ready'}</span>
              </div>

              <div className="wvw-map-stat-pill" title={isGerman ? 'Festen & Türme ohne RI-Schutz' : 'Keeps & towers without RI protection'}>
                <IconTower size={13} className="gold" />
                <span><strong>{topMapRec.stats.enemyTowersAvailable + topMapRec.stats.enemyKeepsAvailable}</strong> {isGerman ? 'Strukturen offen' : 'Structures open'}</span>
              </div>

              {topMapRec.stats.t0VulnerableCount > 0 && (
                <div className="wvw-map-stat-pill highlight" title={isGerman ? 'Frische T0-Strukturen (niedrigste Mauer-HP, schnelle Einnahme)' : 'Fresh T0 structures (lowest wall/gate HP, quick capture)'}>
                  <Zap size={13} className="text-amber-400" />
                  <span><strong>{topMapRec.stats.t0VulnerableCount}x</strong> {isGerman ? 'T0 Schwachstellen' : 'T0 Weak Spots'}</span>
                </div>
              )}

              {topMapRec.stats.castleAvailable && (
                <div className="wvw-map-stat-pill castle-hot" title={isGerman ? 'Schloss Steinnebel angreifbar für maximale Event-WXP' : 'Stonemist Castle open for max event WXP'}>
                  <IconCastle size={13} className="text-amber-300" />
                  <span>{isGerman ? 'Steinnebel (SMC) angreifbar' : 'Stonemist (SMC) open'}</span>
                </div>
              )}

              {topMapRec.stats.recentFlipsCount > 0 && (
                <div className="wvw-map-stat-pill" title={isGerman ? 'In dieser Sitzung erfasste Flips auf dieser Karte' : 'Session flips logged on this map'}>
                  <History size={13} className="dim" />
                  <span><strong>{topMapRec.stats.recentFlipsCount}</strong> Flips</span>
                </div>
              )}
            </div>

            {/* Reasoning & Justifications */}
            <div className="wvw-map-rec-reasons">
              {(isGerman ? topMapRec.reasonsDe : topMapRec.reasonsEn).slice(0, 3).map((reason, idx) => (
                <div key={idx} className="wvw-map-reason-item">
                  <span className="wvw-map-reason-dot">›</span>
                  <span className="text-xs text-[#e2dec9] leading-tight">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Top 3 Taktische Empfehlungen */}
      <section className="wvw-recommendations-section">
        <div className="wvw-section-header">
          <div className="flex items-center gap-2">
            <Crosshair size={18} className="gold" />
            <h3 className="wvw-section-title font-serif">{t('wvw.topRecommendations')}</h3>
          </div>
          <span className="dim text-xs">
            {isGerman ? 'Berechnet für Team' : 'Calculated for Team'}{' '}
            <strong className={config.playerTeam.toLowerCase()}>{getOwnerDisplayName(config.playerTeam, match, worldsMap, lang)}</strong> • {isGerman ? 'Profil:' : 'Profile:'}{' '}
            <span className="gold">{config.preset}</span>
          </span>
        </div>

        {topRecommendations.length === 0 ? (
          <div className="wvw-empty-state">
            <Crosshair size={32} className="dim mb-2" />
            <p>{t('wvw.noObjectivesFound')}</p>
            <button
              type="button"
              className="gw2-btn-sm mt-3"
              onClick={() => onUpdateConfig({ filterMap: 'all', filterType: 'all' })}
            >
              {t('wvw.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="wvw-top3-grid">
            {topRecommendations.map((rec, index) => {
              const obj = rec.objective;
              const ownerColor = TEAM_COLORS[obj.owner] || TEAM_COLORS.Neutral;
              const ownerDisplay = getOwnerDisplayName(obj.owner, match, worldsMap, lang);
              const isJustCopied = copiedId === obj.id;

              // Priority color class
              const scoreClass =
                rec.priorityScore >= 80 ? 'score-high' : rec.priorityScore >= 50 ? 'score-mid' : 'score-low';

              return (
                <div
                  key={obj.id}
                  className={`wvw-recommendation-card rank-${index + 1} ${rec.isPinned ? 'is-pinned' : ''}`}
                >
                  {/* Rank badge & priority ring */}
                  <div className="wvw-rec-header">
                    <div className="wvw-rank-badge font-serif">
                      <span>#{index + 1}</span>
                      {rec.isNewOrChanged && (
                        <span className="wvw-new-pill" title={isGerman ? 'Kürzlich in die Top 3 aufgestiegen' : 'Recently promoted to Top 3'}>
                          <Zap size={10} className="inline mr-0.5" />
                          {t('wvw.newBadge')}
                        </span>
                      )}
                    </div>

                    <div className="wvw-priority-display">
                      <div className={`wvw-priority-badge ${scoreClass}`}>
                        <span className="wvw-prio-val font-mono">{rec.priorityScore}</span>
                        <span className="wvw-prio-label">{t('wvw.priority')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Zielname, Typ & Besitzer */}
                  <div
                    className="wvw-rec-body cursor-pointer"
                    onClick={() => onSelectObjective(obj)}
                    title={isGerman ? 'Klicken, um Zieldetails anzuzeigen' : 'Click to view objective details'}
                  >
                    <div className="wvw-rec-title-row">
                      <span
                        className="wvw-owner-tag"
                        style={{
                          backgroundColor: ownerColor.bg,
                          color: ownerColor.text,
                          borderColor: ownerColor.border,
                        }}
                        title={`${t('wvw.filterOwner')}: ${ownerDisplay}`}
                      >
                        {ownerDisplay}
                      </span>
                      <h4 className="wvw-rec-name font-serif">{obj.nameEn && !isGerman ? obj.nameEn : obj.name}</h4>
                    </div>

                    <div className="wvw-rec-meta-row dim text-xs">
                      <span>
                        {obj.type === 'Castle'
                          ? t('wvw.castle')
                          : obj.type === 'Keep'
                          ? t('wvw.keep')
                          : obj.type === 'Tower'
                          ? t('wvw.tower')
                          : obj.type === 'Camp'
                          ? t('wvw.camp')
                          : obj.type === 'Ruins'
                          ? t('wvw.ruins')
                          : obj.type}
                      </span>
                      <span className="sep">•</span>
                      <span>
                        {obj.mapType === 'Center'
                          ? t('wvw.mapEbg')
                          : obj.mapType === 'RedHome'
                          ? t('wvw.mapRed')
                          : obj.mapType === 'BlueHome'
                          ? t('wvw.mapBlue')
                          : t('wvw.mapGreen')}
                      </span>
                      <span className="sep">•</span>
                      <span className="good font-mono font-bold">+{obj.pointsTick} PPT</span>
                    </div>

                    {/* RI Status Warnung */}
                    {rec.riActive && (
                      <div className="wvw-ri-alert-box">
                        <AlertTriangle size={13} className="warn shrink-0" />
                        <span className="text-xs warn font-bold">
                          {isGerman
                            ? `RI Aktiv: Aufseher immun (${Math.floor(rec.riSecondsRemaining / 60)}m ${rec.riSecondsRemaining % 60}s)`
                            : `RI Active: Supervisor invulnerable (${Math.floor(rec.riSecondsRemaining / 60)}m ${rec.riSecondsRemaining % 60}s)`}
                        </span>
                      </div>
                    )}

                    {/* Reasoning list */}
                    <div className="wvw-rec-reasons">
                      {(isGerman ? rec.reasons : (rec.reasonsEn || rec.reasons)).map((r, ri) => (
                        <div key={ri} className="wvw-reason-item">
                          <span className="wvw-reason-bullet">›</span>
                          <span className="text-xs">{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Faktor-Balken */}
                    <div className="wvw-factors-bar-group">
                      <div className="wvw-factor-mini" title={`${t('wvw.strategicBase')}: ${rec.factors.strategicBase}/100`}>
                        <span className="dim">{isGerman ? 'Basis:' : 'Base:'}</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-amber-500"
                            style={{ width: `${rec.factors.strategicBase}%` }}
                          />
                        </div>
                      </div>
                      <div className="wvw-factor-mini" title={`${t('wvw.leaderSwing')}: ${rec.factors.leaderSwing}/100`}>
                        <span className="dim">Leader:</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-blue-500"
                            style={{ width: `${rec.factors.leaderSwing}%` }}
                          />
                        </div>
                      </div>
                      <div className="wvw-factor-mini" title={`${t('wvw.vulnerability')}: ${rec.factors.vulnerability}/100`}>
                        <span className="dim">T0/RI:</span>
                        <div className="wvw-meter">
                          <div
                            className="wvw-meter-fill bg-emerald-500"
                            style={{ width: `${rec.factors.vulnerability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aktionen-Leiste */}
                  <div className="wvw-rec-actions">
                    <button
                      type="button"
                      className="wvw-btn-action-primary"
                      onClick={() => onSendChat(obj)}
                      title={t('wvw.sendChat')}
                    >
                      <MessageSquare size={13} />
                      <span>{t('wvw.sendChat')}</span>
                    </button>

                    <button
                      type="button"
                      className="wvw-btn-action-secondary"
                      onClick={() => handleCopy(obj)}
                      title={t('wvw.copyChatLink')}
                    >
                      {isJustCopied ? <Check size={13} className="good" /> : <Copy size={13} />}
                      <span>{isJustCopied ? (isGerman ? 'Kopiert!' : 'Copied!') : t('wvw.copyChatLink')}</span>
                    </button>

                    <button
                      type="button"
                      className={`wvw-btn-icon ${rec.isPinned ? 'is-active' : ''}`}
                      onClick={() => onTogglePin(obj.id)}
                      title={rec.isPinned ? t('wvw.unpin') : t('wvw.pin')}
                    >
                      <Star size={14} fill={rec.isPinned ? '#d2b268' : 'none'} />
                    </button>

                    <button
                      type="button"
                      className="wvw-btn-icon"
                      onClick={() => onToggleIgnore(obj.id)}
                      title={t('wvw.ignore')}
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Alternative Ziele (aufklappbare Tabelle) */}
      <section className="wvw-alternatives-section">
        <div
          className="wvw-collapsible-header cursor-pointer"
          onClick={() => setShowAlternatives((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <h4 className="font-serif font-bold text-sm">
              {t('wvw.alternativeTargets')} ({alternativeRecommendations.length})
            </h4>
          </div>
          <span className="dim text-xs">
            {showAlternatives ? (isGerman ? 'Einklappen' : 'Collapse') : (isGerman ? 'Ausklappen' : 'Expand')}
          </span>
        </div>

        {showAlternatives && (
          <div className="wvw-alternatives-body">
            {/* Suchfeld */}
            <div className="wvw-table-search-bar">
              <Search size={14} className="dim mr-2" />
              <input
                type="text"
                placeholder={isGerman ? 'Nach Zielname, Typ, Gilde suchen...' : 'Search targets, type, guild...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wvw-table-search-input"
              />
            </div>

            <table className="wvw-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">#</th>
                  <th>{t('wvw.priority')}</th>
                  <th>{t('wvw.target')}</th>
                  <th>{t('wvw.filterMap')}</th>
                  <th>{t('wvw.filterType')}</th>
                  <th>{t('wvw.filterOwner')}</th>
                  <th>PPT</th>
                  <th>{t('wvw.status')}</th>
                  <th className="text-right">{t('wvw.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlternatives.map((alt, idx) => {
                  const o = alt.objective;
                  const ownerColor = TEAM_COLORS[o.owner] || TEAM_COLORS.Neutral;
                  const ownerDisplay = getOwnerDisplayName(o.owner, match, worldsMap, lang);
                  return (
                    <tr
                      key={o.id}
                      className={`wvw-table-row ${alt.isPinned ? 'is-pinned-row' : ''}`}
                      onClick={() => onSelectObjective(o)}
                    >
                      <td className="text-center font-mono dim text-xs">{idx + 4}</td>
                      <td>
                        <span className="font-mono font-bold text-xs gold">{alt.priorityScore}</span>
                      </td>
                      <td className="font-serif font-medium">{o.nameEn && !isGerman ? o.nameEn : o.name}</td>
                      <td className="dim text-xs">
                        {o.mapType === 'Center'
                          ? t('wvw.mapEbgShort')
                          : o.mapType === 'RedHome'
                          ? t('wvw.mapRedShort')
                          : o.mapType === 'BlueHome'
                          ? t('wvw.mapBlueShort')
                          : t('wvw.mapGreenShort')}
                      </td>
                      <td className="dim text-xs">
                        {o.type === 'Castle'
                          ? t('wvw.castle')
                          : o.type === 'Keep'
                          ? t('wvw.keep')
                          : o.type === 'Tower'
                          ? t('wvw.tower')
                          : o.type === 'Camp'
                          ? t('wvw.camp')
                          : o.type === 'Ruins'
                          ? t('wvw.ruins')
                          : o.type}
                      </td>
                      <td>
                        <span
                          className="wvw-owner-tag-sm"
                          style={{
                            backgroundColor: ownerColor.bg,
                            color: ownerColor.text,
                            borderColor: ownerColor.border,
                          }}
                          title={`${t('wvw.filterOwner')}: ${ownerDisplay}`}
                        >
                          {ownerDisplay}
                        </span>
                      </td>
                      <td className="good font-mono text-xs">+{o.pointsTick}</td>
                      <td className="text-xs">
                        {alt.riActive ? (
                          <span className="warn">
                            RI ({Math.floor(alt.riSecondsRemaining / 60)}m)
                          </span>
                        ) : o.secondsSinceFlip && o.secondsSinceFlip < 1200 ? (
                          <span className="good">{isGerman ? 'T0 (Frisch)' : 'T0 (Fresh)'}</span>
                        ) : (
                          <span className="dim">-</span>
                        )}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="wvw-table-icon-btn"
                            onClick={() => onSendChat(o)}
                            title={t('wvw.sendChat')}
                          >
                            <MessageSquare size={12} />
                          </button>
                          <button
                            type="button"
                            className="wvw-table-icon-btn"
                            onClick={() => handleCopy(o)}
                            title={t('wvw.copyChatLink')}
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            className="wvw-table-icon-btn"
                            onClick={() => onTogglePin(o.id)}
                            title={alt.isPinned ? t('wvw.unpin') : t('wvw.pin')}
                          >
                            <Star size={12} fill={alt.isPinned ? '#d2b268' : 'none'} />
                          </button>
                          <button
                            type="button"
                            className="wvw-table-icon-btn"
                            onClick={() => onToggleIgnore(o.id)}
                            title={t('wvw.ignore')}
                          >
                            <EyeOff size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Ausgeblendete / Ignorierte Ziele verwalten */}
      {ignoredList.length > 0 && (
        <section className="wvw-ignored-section">
          <div
            className="wvw-collapsible-header cursor-pointer"
            onClick={() => setShowIgnored((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              {showIgnored ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span className="dim text-xs font-serif font-bold">
                {t('wvw.ignoredObjectives')} ({ignoredList.length})
              </span>
            </div>
            <span className="dim text-[11px]">
              {showIgnored ? t('wvw.hide') : t('wvw.show')}
            </span>
          </div>

          {showIgnored && (
            <div className="wvw-ignored-chips">
              {ignoredList.map((ign) => (
                <div key={ign.objective.id} className="wvw-ignored-chip">
                  <span>{ign.objective.nameEn && !isGerman ? ign.objective.nameEn : ign.objective.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleIgnore(ign.objective.id)}
                    className="wvw-unignore-btn"
                    title={t('wvw.unignore')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Data quality and uncertainty disclaimer */}
      <footer className="wvw-disclaimer-box">
        <div className="flex items-start gap-2">
          <Shield size={14} className="gold shrink-0 mt-0.5" />
          <p className="dim text-[11px] leading-relaxed">
            {t('wvw.uncertaintyNotice')}
          </p>
        </div>
      </footer>
    </div>
  );
};
