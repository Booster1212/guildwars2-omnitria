/**
 * Omnitria - WvW (World vs World) Module Data Types
 * Aligned with official Guild Wars 2 API v2 (/v2/wvw/*).
 */

export type WvwTeam = 'Red' | 'Blue' | 'Green';
export type WvwObjectiveOwner = 'Red' | 'Blue' | 'Green' | 'Neutral';

export type WvwObjectiveType =
  | 'Camp'
  | 'Tower'
  | 'Keep'
  | 'Castle'
  | 'Ruins'
  | 'Mercenary'
  | 'Spawn';

export type WvwMapType = 'Center' | 'RedHome' | 'BlueHome' | 'GreenHome';

export interface WvwScores {
  red: number;
  blue: number;
  green: number;
}

export interface WvwKillsDeaths {
  red: number;
  blue: number;
  green: number;
}

/** Statische Metadaten zu einem Ziel (/v2/wvw/objectives) */
export interface WvwStaticObjective {
  id: string;
  name: string;
  nameEn?: string;
  type: WvwObjectiveType;
  map_type: WvwMapType;
  map_id: number;
  sector_id?: number;
  upgrade_id?: number;
  coord?: [number, number, number];
  label_coord?: [number, number];
  marker?: string;
  chat_link?: string;
}

/** Dynamic live state of an objective from /v2/wvw/matches/:id */
export interface WvwLiveObjective {
  id: string;
  type: WvwObjectiveType;
  owner: WvwObjectiveOwner;
  last_flipped?: string; // ISO-8601 String
  claimed_by?: string;   // Gilden-UUID
  claimed_at?: string;   // ISO-8601 String
  points_tick?: number;  // PPT
  points_capture?: number;
  yaks_delivered?: number;
  guild_upgrades?: number[];
}

export interface WvwMap {
  id: number;
  type: WvwMapType;
  scores: WvwScores;
  kills?: WvwKillsDeaths;
  deaths?: WvwKillsDeaths;
  bonuses?: Array<{ type: string; owner: WvwObjectiveOwner }>;
  objectives: WvwLiveObjective[];
}

export interface WvwSkirmish {
  id: number;
  scores: WvwScores;
  map_scores?: Array<{ type: WvwMapType; scores: WvwScores }>;
}

export interface WvwMatch {
  id: string;
  start_time: string;
  end_time: string;
  scores: WvwScores;
  victory_points?: WvwScores;
  kills: WvwKillsDeaths;
  deaths: WvwKillsDeaths;
  worlds: {
    red: number;
    blue: number;
    green: number;
  };
  all_worlds: {
    red: number[];
    blue: number[];
    green: number[];
  };
  skirmishes?: WvwSkirmish[];
  maps: WvwMap[];
}

export interface WvwWorld {
  id: number;
  name: string;
  population?: string;
}

export interface WvwGuild {
  id: string;
  name: string;
  tag: string;
}

/** Kombiniertes Ziel (Statische Daten + Live-Zustand + abgeleitete Metriken) */
export interface WvwCombinedObjective {
  id: string;
  name: string;
  nameEn?: string;
  type: WvwObjectiveType;
  mapType: WvwMapType;
  mapId: number;
  owner: WvwObjectiveOwner;
  pointsTick: number;
  pointsCapture: number;
  lastFlipped: Date | null;
  secondsSinceFlip: number | null;
  isRiActive: boolean;
  riSecondsRemaining: number;
  claimedBy: string | null;
  claimedAt: Date | null;
  guildInfo?: WvwGuild | null;
  yaksDelivered: number;
  guildUpgrades: number[];
  coord?: [number, number, number];
  labelCoord?: [number, number];
  marker?: string;
  chatLink?: string;
}

/** Configurable weights for Smart Objective Advisor */
export interface AdvisorWeights {
  /** Strategischer Basiswert (PPT, Typ: Schloss > Feste > Turm > Lager) (0-100) */
  baseStrategicWeight: number;
  /** Deficit & leader target factor (taking points from leader) (0-100) */
  leaderSwingWeight: number;
  /** Verwundbarkeit & Ausbaugrad (Frisch T0 vs. T3 voll befestigt, RI-Strafe) (0-100) */
  vulnerabilityWeight: number;
  /** Territoriale Bedeutung (Heimat-Grenzland, Nachschubwege) (0-100) */
  territoryWeight: number;
  /** Gilden-Verteidigung & Taktiken (Unbeansprucht vs. Gildenfestung) (0-100) */
  guildDefenseWeight: number;
}

export type AdvisorPreset = 'balanced' | 'aggressive' | 'territorial' | 'roamer';

export interface AdvisorConfig {
  weights: AdvisorWeights;
  preset: AdvisorPreset;
  playerTeam: WvwTeam;
  ignoredObjectiveIds: string[];
  pinnedObjectiveIds: string[];
  filterMap: string;   // 'all' | WvwMapType
  filterType: string;  // 'all' | WvwObjectiveType
}

export interface FactorBreakdown {
  strategicBase: number;
  leaderSwing: number;
  vulnerability: number;
  territoryContext: number;
  guildStatus: number;
}

/** Complete tactical recommendation for an objective */
export interface TacticalRecommendation {
  objective: WvwCombinedObjective;
  priorityScore: number; // 0 bis 100
  factors: FactorBreakdown;
  reasons: string[];
  reasonsEn?: string[];
  riActive: boolean;
  riSecondsRemaining: number;
  dataQuality: number; // 0 bis 100 (%)
  uncertaintyNotes: string[];
  uncertaintyNotesEn?: string[];
  isPinned: boolean;
  isIgnored: boolean;
  isNewOrChanged?: boolean;
  changeBadge?: string;
  changeBadgeEn?: string;
  dataSource: string;
  isStale: boolean;
  lastUpdated: Date | null;
  isEstimated: boolean;
}

/** Observed ownership flip during session */
export interface WvwObservedFlip {
  id: string;
  objectiveId: string;
  objectiveName: string;
  objectiveNameEn?: string;
  mapType: WvwMapType;
  oldOwner: WvwObjectiveOwner;
  newOwner: WvwObjectiveOwner;
  timestamp: Date;
  riExpiresAt: Date;
}
