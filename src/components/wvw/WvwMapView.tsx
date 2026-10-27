import React, { useState, useMemo } from 'react';
import type {
  WvwCombinedObjective,
  WvwMapType,
  WvwObjectiveType,
  WvwObjectiveOwner,
  TacticalRecommendation,
} from '../../data/gw2/wvw/types.ts';
import { TEAM_COLORS, MAP_BOUNDS } from '../../data/gw2/wvw/constants.ts';
import { useTranslation } from '../../i18n';
import {
  Shield,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Star,
  Zap,
} from 'lucide-react';

interface WvwMapViewProps {
  objectives: WvwCombinedObjective[];
  topRecommendations: TacticalRecommendation[];
  selectedObjectiveId: string | null;
  onSelectObjective: (obj: WvwCombinedObjective) => void;
  pinnedObjectiveIds: string[];
  initialMapType?: WvwMapType;
}

export const WvwMapView: React.FC<WvwMapViewProps> = ({
  objectives,
  topRecommendations,
  selectedObjectiveId,
  onSelectObjective,
  pinnedObjectiveIds,
  initialMapType = 'Center',
}) => {
  const { t, lang } = useTranslation();
  const isGerman = lang === 'de';
  const [activeMapType, setActiveMapType] = useState<WvwMapType>(initialMapType);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [hoveredObj, setHoveredObj] = useState<WvwCombinedObjective | null>(null);

  // Top 3 lookup map for fast priority check
  const topRankMap = useMemo(() => {
    const map = new Map<string, number>();
    topRecommendations.forEach((r, idx) => map.set(r.objective.id, idx + 1));
    return map;
  }, [topRecommendations]);

  // Filter objectives of current map
  const mapObjectives = useMemo(() => {
    return objectives.filter((o) => {
      if (o.mapType !== activeMapType) return false;
      if (!o.coord) return false;
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (ownerFilter !== 'all' && o.owner !== ownerFilter) return false;
      return true;
    });
  }, [objectives, activeMapType, typeFilter, ownerFilter]);

  // Bounding box of active map for normalization
  const bounds = MAP_BOUNDS[activeMapType] || MAP_BOUNDS.Center;
  const svgWidth = 800;
  const svgHeight = 600;
  const padding = 60;

  // Koordinaten-Transformation (Welt-Koordinaten -> SVG-Koordinaten)
  const projectCoords = (coord: [number, number, number]) => {
    const [wx, wy] = coord;
    const xSpan = bounds.maxX - bounds.minX || 1;
    const ySpan = bounds.maxY - bounds.minY || 1;

    const normX = (wx - bounds.minX) / xSpan;
    const normY = (wy - bounds.minY) / ySpan;

    const sx = padding + normX * (svgWidth - 2 * padding);
    const sy = padding + normY * (svgHeight - 2 * padding);
    return [Math.round(sx), Math.round(sy)];
  };

  return (
    <div className="wvw-map-view-container">
      {/* 1. Obere Karten-Steuerungsleiste */}
      <div className="wvw-map-toolbar">
        {/* Kartenauswahl */}
        <div className="wvw-map-selector-tabs">
          {[
            { id: 'Center', label: t('wvw.mapEbg') },
            { id: 'RedHome', label: t('wvw.mapRed') },
            { id: 'BlueHome', label: t('wvw.mapBlue') },
            { id: 'GreenHome', label: t('wvw.mapGreen') },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              className={`wvw-map-tab-btn ${activeMapType === m.id ? 'active' : ''}`}
              onClick={() => setActiveMapType(m.id as WvwMapType)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filters on map */}
        <div className="wvw-map-filters">
          {/* Typ-Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="wvw-map-select"
            title={isGerman ? 'Nach Strukturtyp filtern' : 'Filter by structure type'}
          >
            <option value="all">{t('wvw.allTypes')}</option>
            <option value="Castle">{t('wvw.castles')}</option>
            <option value="Keep">{t('wvw.keeps')}</option>
            <option value="Tower">{t('wvw.towers')}</option>
            <option value="Camp">{t('wvw.camps')}</option>
          </select>

          {/* Besitzer-Filter */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="wvw-map-select"
            title={isGerman ? 'Nach Besitzerteam filtern' : 'Filter by owner team'}
          >
            <option value="all">{t('wvw.allTeams')}</option>
            <option value="Red">{t('wvw.teamRed')}</option>
            <option value="Blue">{t('wvw.teamBlue')}</option>
            <option value="Green">{t('wvw.teamGreen')}</option>
            <option value="Neutral">{t('wvw.teamNeutral')}</option>
          </select>
        </div>
      </div>

      {/* 2. SVG Vektor-Lagekarte */}
      <div className="wvw-map-canvas-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="wvw-map-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Hintergrund & Taktisches Raster */}
          <defs>
            <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(210, 178, 104, 0.08)" strokeWidth="1" />
            </pattern>
            <radialGradient id="center-radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(210, 178, 104, 0.08)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Basis-Hintergrund */}
          <rect width={svgWidth} height={svgHeight} fill="#0d0e12" />
          <rect width={svgWidth} height={svgHeight} fill="url(#tactical-grid)" />
          <circle cx={svgWidth / 2} cy={svgHeight / 2} r={240} fill="url(#center-radar-glow)" />

          {/* Kompass / Fadenkreuz-Hilfslinien */}
          <line
            x1={svgWidth / 2}
            y1={20}
            x2={svgWidth / 2}
            y2={svgHeight - 20}
            stroke="rgba(210, 178, 104, 0.12)"
            strokeDasharray="4 4"
          />
          <line
            x1={20}
            y1={svgHeight / 2}
            x2={svgWidth - 20}
            y2={svgHeight / 2}
            stroke="rgba(210, 178, 104, 0.12)"
            strokeDasharray="4 4"
          />

          {/* Objective nodes on map */}
          {mapObjectives.map((obj) => {
            if (!obj.coord) return null;
            const [cx, cy] = projectCoords(obj.coord);
            const isSelected = selectedObjectiveId === obj.id;
            const isHovered = hoveredObj?.id === obj.id;
            const topRank = topRankMap.get(obj.id);
            const isPinned = pinnedObjectiveIds.includes(obj.id);
            const ownerColor = TEAM_COLORS[obj.owner] || TEAM_COLORS.Neutral;

            // Marker size by objective type
            const radius =
              obj.type === 'Castle' ? 22 : obj.type === 'Keep' ? 17 : obj.type === 'Tower' ? 13 : 10;

            return (
              <g
                key={obj.id}
                className={`wvw-map-node ${isSelected ? 'is-selected' : ''} ${topRank ? 'is-top-rec' : ''}`}
                onClick={() => onSelectObjective(obj)}
                onMouseEnter={() => setHoveredObj(obj)}
                onMouseLeave={() => setHoveredObj(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulsing radar indicator on top 3 recommendations */}
                {topRank && (
                  <>
                    <circle cx={cx} cy={cy} r={radius + 14} className="wvw-beacon-pulse" />
                    <circle cx={cx} cy={cy} r={radius + 8} className="wvw-beacon-pulse-inner" />
                  </>
                )}

                {/* Selektions-Rahmen */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 5}
                    fill="none"
                    stroke="#f4e3a8"
                    strokeWidth="2.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Haupt-Marker Kreis */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={ownerColor.main}
                  stroke={isSelected ? '#ffffff' : '#15171c'}
                  strokeWidth="2"
                  filter={topRank ? 'drop-shadow(0 0 6px rgba(210, 178, 104, 0.8))' : undefined}
                />

                {/* Inneres Icon / Symbol */}
                {obj.type === 'Castle' && (
                  <path
                    d={`M ${cx - 7} ${cy + 6} L ${cx - 7} ${cy - 4} L ${cx - 3} ${cy - 1} L ${cx} ${cy - 7} L ${cx + 3} ${cy - 1} L ${cx + 7} ${cy - 4} L ${cx + 7} ${cy + 6} Z`}
                    fill="#ffffff"
                  />
                )}

                {obj.type === 'Keep' && (
                  <path
                    d={`M ${cx - 5} ${cy + 5} L ${cx - 5} ${cy - 5} L ${cx - 2} ${cy - 3} L ${cx} ${cy - 6} L ${cx + 2} ${cy - 3} L ${cx + 5} ${cy - 5} L ${cx + 5} ${cy + 5} Z`}
                    fill="#ffffff"
                  />
                )}

                {obj.type === 'Tower' && (
                  <path
                    d={`M ${cx - 4} ${cy + 4} L ${cx - 4} ${cy - 3} L ${cx - 2} ${cy - 4} L ${cx} ${cy - 3} L ${cx + 2} ${cy - 4} L ${cx + 4} ${cy - 3} L ${cx + 4} ${cy + 4} Z`}
                    fill="#ffffff"
                  />
                )}

                {obj.type === 'Camp' && (
                  <polygon
                    points={`${cx},${cy - 5} ${cx + 5},${cy + 4} ${cx - 5},${cy + 4}`}
                    fill="#ffffff"
                  />
                )}

                {/* Top-Rang Nummer Abzeichen (#1, #2, #3) */}
                {topRank && (
                  <g transform={`translate(${cx + 8}, ${cy - 10})`}>
                    <circle cx="0" cy="0" r="8" fill="#d2b268" stroke="#15171c" strokeWidth="1.5" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#111215"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Consolas, monospace"
                    >
                      {topRank}
                    </text>
                  </g>
                )}

                {/* Favoriten-Stern */}
                {isPinned && !topRank && (
                  <g transform={`translate(${cx + 8}, ${cy - 8})`}>
                    <polygon
                      points="0,-4 1.2,-1 4.2,-1 1.8,0.8 2.6,3.8 0,2 -2.6,3.8 -1.8,0.8 -4.2,-1 -1.2,-1"
                      fill="#d2b268"
                    />
                  </g>
                )}

                {/* Zielname unter dem Marker */}
                <text
                  x={cx}
                  y={cy + radius + 12}
                  textAnchor="middle"
                  fill="#d6d1c5"
                  fontSize="10"
                  fontFamily="'Alegreya Sans', sans-serif"
                  fontWeight={isSelected || isHovered || topRank ? 'bold' : 'normal'}
                  className="wvw-map-label"
                >
                  {obj.nameEn && !isGerman ? obj.nameEn : obj.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip on hover */}
        {hoveredObj && (
          <div className="wvw-map-tooltip">
            <div className="wvw-tooltip-header">
              <span
                className="wvw-tooltip-owner-dot"
                style={{ backgroundColor: TEAM_COLORS[hoveredObj.owner]?.main || '#888' }}
              />
              <strong className="font-serif">{hoveredObj.nameEn && !isGerman ? hoveredObj.nameEn : hoveredObj.name}</strong>
            </div>
            <div className="wvw-tooltip-body text-xs dim">
              <div>
                {t('wvw.filterType')}:{' '}
                <span className="text-[#f3efe6]">
                  {hoveredObj.type === 'Castle'
                    ? t('wvw.castle')
                    : hoveredObj.type === 'Keep'
                    ? t('wvw.keep')
                    : hoveredObj.type === 'Tower'
                    ? t('wvw.tower')
                    : hoveredObj.type === 'Camp'
                    ? t('wvw.camp')
                    : hoveredObj.type === 'Ruins'
                    ? t('wvw.ruins')
                    : hoveredObj.type}
                </span>{' '}
                • PPT: <span className="good font-mono font-bold">+{hoveredObj.pointsTick}</span>
              </div>
              <div>
                {t('wvw.filterOwner')}:{' '}
                <span style={{ color: TEAM_COLORS[hoveredObj.owner]?.text }}>
                  {hoveredObj.owner === 'Red'
                    ? t('wvw.teamRed')
                    : hoveredObj.owner === 'Blue'
                    ? t('wvw.teamBlue')
                    : hoveredObj.owner === 'Green'
                    ? t('wvw.teamGreen')
                    : t('wvw.teamNeutral')}
                </span>
              </div>
              {hoveredObj.isRiActive && (
                <div className="warn font-bold">
                  ⚠️ RI: {Math.floor(hoveredObj.riSecondsRemaining / 60)}m {hoveredObj.riSecondsRemaining % 60}s
                </div>
              )}
              {hoveredObj.guildInfo && (
                <div>{isGerman ? 'Gilde:' : 'Guild:'} [{hoveredObj.guildInfo.tag}] {hoveredObj.guildInfo.name}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Legende unten */}
      <div className="wvw-map-legend">
        <div className="wvw-legend-item">
          <span className="wvw-legend-dot red" />
          <span>{t('wvw.teamRed')}</span>
        </div>
        <div className="wvw-legend-item">
          <span className="wvw-legend-dot blue" />
          <span>{t('wvw.teamBlue')}</span>
        </div>
        <div className="wvw-legend-item">
          <span className="wvw-legend-dot green" />
          <span>{t('wvw.teamGreen')}</span>
        </div>
        <div className="wvw-legend-item">
          <span className="wvw-legend-beacon" />
          <span>{isGerman ? 'Top 3 Berater-Empfehlung' : 'Top 3 Advisor Recommendations'}</span>
        </div>
        <span className="dim text-xs ml-auto">
          {isGerman ? 'Klick auf Ziel = Details anzeigen & synchronisieren' : 'Click objective = View details & sync'}
        </span>
      </div>
    </div>
  );
};
