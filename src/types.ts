export type EventCategory = 'core' | 'hardcore' | 'hot' | 'pof' | 'eod' | 'soto' | 'janthir' | 'voe' | 'ibs' | 'lws';

export type IconType =
  | 'dragon'
  | 'golem'
  | 'elemental'
  | 'wurm'
  | 'pirate'
  | 'karka'
  | 'choya'
  | 'crystal'
  | 'sword'
  | 'shield'
  | 'airship'
  | 'portal';

export interface MetaSubEvent {
  id: string; // Official ArenaNet GUID
  name: string;
  nameEn: string;
  phase: 'escort' | 'preparation' | 'boss' | 'defense' | 'cleanup';
  phaseLabel: string;
  phaseLabelEn: string;
  required?: boolean;
}

export interface BossAchievement {
  id: string;
  gw2Id?: number;
  title: string;
  titleEn?: string;
  ap: number;
  description: string;
  descriptionEn?: string;
  category: string;
  categoryEn?: string;
  rewardTitle?: string;
  rewardTitleEn?: string;
  isDailyOrRepeatable?: boolean;
  tierInfo?: string;
  tierInfoEn?: string;
}

export interface WorldEvent {
  id: string;
  name: string;
  nameEn: string;
  category: EventCategory;
  eventType?: 'boss' | 'meta';
  mapId?: number;
  climaxEventId?: string;
  subEvents?: MetaSubEvent[];
  categoryLabel: string;
  categoryLabelEn?: string;
  zone: string;
  zoneEn?: string;
  level: number;
  waypoint: string;
  waypointName: string;
  waypointNameEn?: string;
  durationMinutes: number;
  schedule: {
    type: 'fixed' | 'repeat';
    times?: [number, number][]; // UTC [hour, minute]
    start?: [number, number];   // UTC [hour, minute]
    intervalHours?: number;     // e.g. 2 or 3
  };
  lootHighlights: string[];
  lootHighlightsEn?: string[];
  tactics: string;
  tacticsEn?: string;
  iconType: IconType;
  achievements?: BossAchievement[];
}

export interface EventInstance {
  event: WorldEvent;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  startsInSeconds: number;
  endsInSeconds: number;
}

export type MessageTemplateType = 'standard' | 'compact' | 'waypointOnly' | 'detailed';
export type OverlayTab = 'events' | 'achievements' | 'crafting' | 'legendary' | 'wvw';

export type SortMode = 'time' | 'grouped' | 'bossesFirst' | 'metasFirst';

export type Language = 'de' | 'en';

export interface OverlaySettings {
  language: Language;        // 'de' | 'en'
  opacity: number;           // 0.3 - 1.0
  compactView: boolean;      // dense list for minimal space above chat
  soundEnabled: boolean;     // audio chime when copying & on alerts
  soundVolume: number;       // 0.0 - 1.0
  notifyBeforeMinutes: number; // 0 = off, 5, 10
  messageTemplate: MessageTemplateType;
  filterCategory: string;    // 'all' | 'active' | 'bosses' | 'metas' | 'core' | 'hardcore' | 'hot' | 'pof' | 'eod' | 'soto' | 'janthir' | 'voe'
  sortMode: SortMode;        // 'time' | 'grouped' | 'bossesFirst' | 'metasFirst'
  pinnedOnTop: boolean;
  widgetMode: boolean;       // super mini strip
  apiKey?: string;           // Official Guild Wars 2 ArenaNet API key for achievements sync
}
