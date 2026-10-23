export type EventCategory = 'core' | 'hardcore' | 'hot' | 'pof' | 'eod' | 'soto';

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

export interface BossAchievement {
  id: string;
  gw2Id?: number;
  title: string;
  ap: number;
  description: string;
  category: string;
  rewardTitle?: string;
  isDailyOrRepeatable?: boolean;
  tierInfo?: string;
}

export interface WorldEvent {
  id: string;
  name: string;
  nameEn: string;
  category: EventCategory;
  categoryLabel: string;
  zone: string;
  level: number;
  waypoint: string;
  waypointName: string;
  durationMinutes: number;
  schedule: {
    type: 'fixed' | 'repeat';
    times?: [number, number][]; // UTC [hour, minute]
    start?: [number, number];   // UTC [hour, minute]
    intervalHours?: number;     // e.g. 2 or 3
  };
  lootHighlights: string[];
  tactics: string;
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
export type OverlayTab = 'events' | 'waypoints' | 'achievements' | 'crafting' | 'legendary';

export type SortMode = 'time' | 'grouped' | 'bossesFirst' | 'metasFirst';

export interface OverlaySettings {
  opacity: number;           // 0.3 - 1.0
  compactView: boolean;      // dense list for minimal space above chat
  soundEnabled: boolean;     // audio chime when copying & on alerts
  soundVolume: number;       // 0.0 - 1.0
  notifyBeforeMinutes: number; // 0 = off, 5, 10
  messageTemplate: MessageTemplateType;
  filterCategory: string;    // 'all' | 'active' | 'bosses' | 'metas' | 'core' | 'hardcore' | 'hot' | 'pof' | 'eod'
  sortMode: SortMode;        // 'time' | 'grouped' | 'bossesFirst' | 'metasFirst'
  pinnedOnTop: boolean;
  widgetMode: boolean;       // super mini strip
  apiKey?: string;           // Official Guild Wars 2 ArenaNet API key for achievements sync
}
