import type {
  AdvisorWeights,
  AdvisorPreset,
  WvwObjectiveType,
  WvwMapType,
  WvwTeam,
} from './types.ts';

/** Duration of Righteous Indignation buff after capture: 5 minutes */
export const RI_DURATION_SECONDS = 300;

/** Base point value and strategic weight by objective type */
export const OBJECTIVE_BASE_STRATEGIC_VALUES: Record<WvwObjectiveType, number> = {
  Castle: 96,
  Keep: 80,
  Tower: 54,
  Camp: 38,
  Ruins: 22,
  Mercenary: 20,
  Spawn: 0,
};

/** Default weights */
export const DEFAULT_ADVISOR_WEIGHTS: AdvisorWeights = {
  baseStrategicWeight: 25,
  leaderSwingWeight: 25,
  vulnerabilityWeight: 25,
  territoryWeight: 15,
  guildDefenseWeight: 10,
};

export const ADVISOR_PRESETS: Record<AdvisorPreset, { labelDe: string; labelEn: string; descDe: string; descEn: string; weights: AdvisorWeights }> = {
  balanced: {
    labelDe: 'Ausgewogen (Standard)',
    labelEn: 'Balanced (Default)',
    descDe: 'Gleicht strategischen Nutzen, Tabellenführer-Druck und Verwundbarkeit gleichmäßig ab.',
    descEn: 'Balances strategic value, leader swing, and fortification vulnerability evenly.',
    weights: {
      baseStrategicWeight: 25,
      leaderSwingWeight: 25,
      vulnerabilityWeight: 25,
      territoryWeight: 15,
      guildDefenseWeight: 10,
    },
  },
  aggressive: {
    labelDe: 'Aggressiv (Gegen Spitzenreiter)',
    labelEn: 'Aggressive (Anti-Leader)',
    descDe: 'Fokussiert massive Angriffe auf das führende Team zur maximalen Punkte-Verschiebung.',
    descEn: 'Prioritizes high-value structures held by the leading team for maximum point swing.',
    weights: {
      baseStrategicWeight: 35,
      leaderSwingWeight: 40,
      vulnerabilityWeight: 10,
      territoryWeight: 10,
      guildDefenseWeight: 5,
    },
  },
  territorial: {
    labelDe: 'Grenzland-Sicherung (Heimatverteidigung)',
    labelEn: 'Territorial Defense',
    descDe: 'Priorisiert das Säubern und Zurückerobern von Strukturen auf dem eigenen Grenzland.',
    descEn: 'Prioritizes reclaiming enemy-held towers and keeps on your home borderland.',
    weights: {
      baseStrategicWeight: 15,
      leaderSwingWeight: 15,
      vulnerabilityWeight: 15,
      territoryWeight: 45,
      guildDefenseWeight: 10,
    },
  },
  roamer: {
    labelDe: 'Roamer & Kleingruppen (Schnelle Beute)',
    labelEn: 'Roamer & Small Scale',
    descDe: 'Sucht frisch geflippte, unbefestigte Lager und Türme ohne schwere Gilden-Belagerung.',
    descEn: 'Favors vulnerable unfortified camps and freshly flipped towers suited for small teams.',
    weights: {
      baseStrategicWeight: 15,
      leaderSwingWeight: 10,
      vulnerabilityWeight: 50,
      territoryWeight: 15,
      guildDefenseWeight: 10,
    },
  },
};

/** Team colors for WvW view */
export const TEAM_COLORS: Record<WvwTeam | 'Neutral', { main: string; glow: string; text: string; bg: string; border: string }> = {
  Red: {
    main: '#e14436',
    glow: 'rgba(225, 68, 54, 0.45)',
    text: '#ffa299',
    bg: 'rgba(225, 68, 54, 0.15)',
    border: '#a83226',
  },
  Blue: {
    main: '#3584e4',
    glow: 'rgba(53, 132, 228, 0.45)',
    text: '#9cc7ff',
    bg: 'rgba(53, 132, 228, 0.15)',
    border: '#215d9c',
  },
  Green: {
    main: '#2ec27e',
    glow: 'rgba(46, 194, 126, 0.45)',
    text: '#8bf0bf',
    bg: 'rgba(46, 194, 126, 0.15)',
    border: '#1b7d50',
  },
  Neutral: {
    main: '#9a9996',
    glow: 'rgba(154, 153, 150, 0.3)',
    text: '#deddda',
    bg: 'rgba(154, 153, 150, 0.12)',
    border: '#5e5c58',
  },
};

/** Which borderland traditionally belongs to which team */
export const HOME_MAP_FOR_TEAM: Record<WvwTeam, WvwMapType> = {
  Red: 'RedHome',
  Blue: 'BlueHome',
  Green: 'GreenHome',
};

/** Bounding boxes for SVG coordinate normalization (x, y) */
export const MAP_BOUNDS: Record<WvwMapType, { minX: number; maxX: number; minY: number; maxY: number }> = {
  Center: {
    minX: 9200,
    maxX: 12000,
    minY: 13200,
    maxY: 15800,
  },
  RedHome: {
    minX: 9100,
    maxX: 12400,
    minY: 9200,
    maxY: 12100,
  },
  BlueHome: {
    minX: 12800,
    maxX: 15500,
    minY: 11000,
    maxY: 14300,
  },
  GreenHome: {
    minX: 5600,
    maxX: 8300,
    minY: 11600,
    maxY: 14900,
  },
};
