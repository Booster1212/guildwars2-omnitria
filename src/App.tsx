import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Gw2NavRail } from './components/Gw2NavRail';
import { BossFilterBar } from './components/BossFilterBar';
import { EventCard } from './components/EventCard';
import { AchievementsView } from './components/AchievementsView';
import { MiniWidget } from './components/MiniWidget';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { getEventSchedule, formatCallout, LOOT_ITEM_ID_MAP } from './data/events';
import { playCopyChime } from './data/audio';
import { EventInstance, OverlaySettings, SortMode, OverlayTab } from './types';
import {
  loadCachedApiData,
  Gw2AccountInfo,
  Gw2AccountAchievement,
} from './data/gw2Api';
import { syncIfStale } from './data/gw2/account';
import { ensureItems } from './data/gw2/items';
import { DISCIPLINE_ICON_ITEM } from './components/common/labels';

import { CraftingView } from './components/crafting/CraftingView';
import { LegendaryView } from './components/legendary/LegendaryView';
import { useTranslation } from './i18n';

const DEFAULT_SETTINGS: OverlaySettings = {
  language: 'en',
  opacity: 0.96,
  compactView: false,
  soundEnabled: true,
  soundVolume: 0.6,
  notifyBeforeMinutes: 0,
  messageTemplate: 'standard',
  filterCategory: 'all',
  sortMode: 'time',
  pinnedOnTop: true,
  widgetMode: true, // Small overlay in game by default above chat!
};

export const App: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [currentTab, setCurrentTab] = useState<OverlayTab>('events');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clickThroughActive, setClickThroughActive] = useState<boolean>(false);

  // Live GW2 API Account & Achievements state
  const [accountInfo, setAccountInfo] = useState<Gw2AccountInfo | null>(() => {
    return loadCachedApiData().account;
  });
  const [userAchievements, setUserAchievements] = useState<Map<number, Gw2AccountAchievement>>(() => {
    return loadCachedApiData().achievements;
  });

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from localStorage
  const [settings, setSettings] = useState<OverlaySettings>(() => {
    try {
      const saved = localStorage.getItem('gw2_overlay_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Sync settings.language with i18n
  useEffect(() => {
    if (settings.language && settings.language !== lang) {
      setLanguage(settings.language);
    }
  }, [settings.language, lang, setLanguage]);

  // Sync sortMode from settings if available
  useEffect(() => {
    if (settings.sortMode) {
      setSortMode(settings.sortMode);
    }
  }, [settings.sortMode]);

  // Synchronisiere Accountdaten (Materialien, Handwerk, Rüstkammer), falls API-Schlüssel hinterlegt
  useEffect(() => {
    if (settings.apiKey) {
      void syncIfStale(settings.apiKey);
    }
  }, [settings.apiKey]);

  // Check if running in Electron
  const isElectron = Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron
  );

  // Sync settings changes
  const updateSettings = (partial: Partial<OverlaySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('gw2_overlay_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings', e);
      }

      // If widget mode changed, notify Electron to resize the overlay window
      if (partial.widgetMode !== undefined) {
        const api = (window as unknown as {
          electronAPI?: { setWindowMode?: (m: string) => void };
        }).electronAPI;
        if (api?.setWindowMode) {
          api.setWindowMode(partial.widgetMode ? 'mini' : 'full');
        }
      }

      return updated;
    });
  };

  const handleSelectSortMode = (mode: SortMode) => {
    setSortMode(mode);
    updateSettings({ sortMode: mode });
  };

  // Setup click-through and window mode listeners from Electron
  useEffect(() => {
    const api = (window as unknown as {
      electronAPI?: {
        onClickThroughToggled?: (cb: (val: boolean) => void) => () => void;
        onWindowModeChanged?: (cb: (mode: string) => void) => () => void;
      };
    }).electronAPI;

    let cleanupClickThrough: (() => void) | undefined;
    let cleanupMode: (() => void) | undefined;

    if (api?.onClickThroughToggled) {
      cleanupClickThrough = api.onClickThroughToggled((val) => {
        setClickThroughActive(val);
      });
    }

    if (api?.onWindowModeChanged) {
      cleanupMode = api.onWindowModeChanged((mode) => {
        setSettings((prev) => ({ ...prev, widgetMode: mode === 'mini' }));
      });
    }

    return () => {
      if (cleanupClickThrough) cleanupClickThrough();
      if (cleanupMode) cleanupMode();
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Preload core crafting discipline items and famous legendary weapons automatically
  useEffect(() => {
    const preloadIds = [
      ...Object.values(DISCIPLINE_ICON_ITEM),
      ...Object.values(LOOT_ITEM_ID_MAP),
      30689, // Sonnenaufgang (Sunrise)
      30684, // Düsterkeit (Twilight)
      30687, // Ewigkeit (Eternity)
      30699, // Blitz (Bolt)
      30700, // Bifröst (The Bifrost)
      30704, // Meteorlogicus
      30691, // Quip
      30692, // Der Jäger (The Predator)
      30696, // Kudzu
      30686, // Frostfang
      30698, // Heulsuse (The Howler)
      30693, // Der Minnesänger (The Minstrel)
      30702, // Das Koloss (The Colossus / Juggernaut)
      30690, // Kraitkin
      30694, // Raserei (Frenzy)
      19675, // Mystisches Kleeblatt
      19976, // Mystische Münze
      19721, // Ektoplasmakugel
    ];
    void ensureItems(preloadIds);
  }, []);

  // Compute live event schedule from database
  const allInstances = useMemo(() => {
    return getEventSchedule(currentTime, 16);
  }, [currentTime]);

  const isBossEvent = (cat: string) => cat === 'core' || cat === 'hardcore';

  // Filter & Sort instances
  const processedInstances = useMemo(() => {
    const matched = allInstances.filter((inst) => {
      // Category filter
      if (activeCategory === 'active') {
        const isUrgent = inst.isActive || inst.startsInSeconds <= 15 * 60;
        if (!isUrgent) return false;
      } else if (activeCategory === 'bosses') {
        if (!isBossEvent(inst.event.category)) return false;
      } else if (activeCategory === 'metas') {
        if (isBossEvent(inst.event.category)) return false;
      } else if (activeCategory !== 'all') {
        if (inst.event.category !== activeCategory) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = inst.event.name.toLowerCase().includes(q);
        const matchEn = inst.event.nameEn.toLowerCase().includes(q);
        const matchZone = inst.event.zone.toLowerCase().includes(q) || (inst.event.zoneEn?.toLowerCase().includes(q) ?? false);
        const matchWaypoint = inst.event.waypointName.toLowerCase().includes(q) || (inst.event.waypointNameEn?.toLowerCase().includes(q) ?? false);
        if (!matchName && !matchEn && !matchZone && !matchWaypoint) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    return matched.sort((a, b) => {
      if (sortMode === 'bossesFirst') {
        const aIsBoss = isBossEvent(a.event.category);
        const bIsBoss = isBossEvent(b.event.category);
        if (aIsBoss && !bIsBoss) return -1;
        if (!aIsBoss && bIsBoss) return 1;
      } else if (sortMode === 'metasFirst') {
        const aIsBoss = isBossEvent(a.event.category);
        const bIsBoss = isBossEvent(b.event.category);
        if (!aIsBoss && bIsBoss) return -1;
        if (aIsBoss && !bIsBoss) return 1;
      }

      // Default or secondary sort: Active first, then startsInSeconds
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.startsInSeconds - b.startsInSeconds;
    });
  }, [allInstances, activeCategory, searchTerm, sortMode]);

  // Split into bosses and metas for 'grouped' mode
  const { bossList, metaList } = useMemo(() => {
    if (sortMode !== 'grouped') return { bossList: [], metaList: [] };
    const bosses = processedInstances.filter((inst) => isBossEvent(inst.event.category));
    const metas = processedInstances.filter((inst) => !isBossEvent(inst.event.category));
    return { bossList: bosses, metaList: metas };
  }, [processedInstances, sortMode]);

  // Action 1: Nachricht senden (Sends waypoint + remaining time into GW2 chat)
  const handleSendMessage = (inst: EventInstance) => {
    const textToCopy = formatCallout(inst, settings.messageTemplate, lang);

    // 1. Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch((err) => {
        console.error('Clipboard copy failed', err);
      });
    }

    // 2. Send directly into GW2 chat if running in Electron
    const api = (window as unknown as {
      electronAPI?: {
        copyToClipboard?: (t: string) => void;
        sendChatMessage?: (t: string) => void;
      };
    }).electronAPI;

    if (api?.sendChatMessage) {
      api.sendChatMessage(textToCopy);
    } else if (api?.copyToClipboard) {
      api.copyToClipboard(textToCopy);
    }

    // 3. Audio & Visuals
    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }
    const key = `${inst.event.id}_${inst.startTime.getTime()}`;
    setCopiedId(key);
    setTimeout(() => {
      setCopiedId((current) => (current === key ? null : current));
    }, 2000);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(lang === 'en' ? `💬 Chat message sent: ${textToCopy}` : `💬 Chat-Nachricht gesendet: ${textToCopy}`);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // Action 2: Zur Wegmarke Teleportieren (Sends waypoint link to GW2 chat)
  const handleTeleport = (inst: EventInstance) => {
    const waypointTag = inst.event.waypoint;

    // 1. Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(waypointTag).catch((err) => {
        console.error('Clipboard copy failed', err);
      });
    }

    // 2. Send waypoint to GW2 chat
    const api = (window as unknown as {
      electronAPI?: {
        copyToClipboard?: (t: string) => void;
        teleportWaypoint?: (w: string) => void;
      };
    }).electronAPI;

    if (api?.teleportWaypoint) {
      api.teleportWaypoint(waypointTag);
    } else if (api?.copyToClipboard) {
      api.copyToClipboard(waypointTag);
    }

    // 3. Audio & Visuals
    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(lang === 'en' ? `📍 Waypoint ${waypointTag} sent! Click in game chat to teleport!` : `📍 Wegmarke ${waypointTag} gesendet! Klicke im Spiel-Chat zum Teleportieren!`);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div
      className="gw2-hero-window"
      style={{
        opacity: settings.opacity,
        outline: clickThroughActive ? '2px dashed var(--gw2-cyan)' : undefined,
      }}
    >
      {/* Draggable Titlebar & Authentic GW2 Heldin Header */}
      <Header
        settings={settings}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onUpdateSettings={updateSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isElectron={isElectron}
        accountName={accountInfo?.name}
      />

      {clickThroughActive && (
        <div className="gw2-clickthrough-banner">
          Maus-Durchklick aktiv (F10 zum Deaktivieren)
        </div>
      )}

      {/* Main Content Area */}
      {settings.widgetMode ? (
        /* Mini HUD Docked Above Chat */
        <MiniWidget
          instances={allInstances}
          onSendMessage={handleSendMessage}
          onTeleport={handleTeleport}
          copiedId={copiedId}
          onExpand={() => updateSettings({ widgetMode: false })}
        />
      ) : (
        /* Full Heldin Panel Layout with Left NavRail */
        <div className="gw2-main-body-layout">
          {/* Left Vertical Icon Rail */}
          <Gw2NavRail
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Right Content View Area */}
          <div className="gw2-view-content">
            {currentTab === 'events' ? (
              <>
                <BossFilterBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  sortMode={sortMode}
                  onSelectSortMode={handleSelectSortMode}
                  currentTime={currentTime}
                />

                <div className="gw2-event-scroll-container">
                  {processedInstances.length === 0 ? (
                    <div className="empty-state">
                      <span>{t('events.empty')}</span>
                      <button
                        className="gw2-gw-btn"
                        onClick={() => {
                          setSearchTerm('');
                          setActiveCategory('all');
                        }}
                      >
                        {t('events.resetFilter')}
                      </button>
                    </div>
                  ) : sortMode === 'grouped' ? (
                    <>
                       {/* Weltbosse Group */}
                      {bossList.length > 0 && (
                        <div className="gw2-group-divider">
                          <span className="group-title font-serif">{t('events.groupBosses')}</span>
                          <span className="group-count font-mono">{bossList.length}</span>
                        </div>
                      )}
                      {bossList.map((inst) => (
                        <EventCard
                          key={`${inst.event.id}_${inst.startTime.getTime()}`}
                          instance={inst}
                          onSendMessage={handleSendMessage}
                          onTeleport={handleTeleport}
                          isJustCopied={copiedId === `${inst.event.id}_${inst.startTime.getTime()}`}
                          userAchievements={userAchievements}
                        />
                      ))}

                      {/* Meta-Events Group */}
                      {metaList.length > 0 && (
                        <div className="gw2-group-divider cyan">
                          <span className="group-title font-serif">{t('events.groupMetas')}</span>
                          <span className="group-count font-mono">{metaList.length}</span>
                        </div>
                      )}
                      {metaList.map((inst) => (
                        <EventCard
                          key={`${inst.event.id}_${inst.startTime.getTime()}`}
                          instance={inst}
                          onSendMessage={handleSendMessage}
                          onTeleport={handleTeleport}
                          isJustCopied={copiedId === `${inst.event.id}_${inst.startTime.getTime()}`}
                          userAchievements={userAchievements}
                        />
                      ))}
                    </>
                  ) : (
                    processedInstances.map((inst) => (
                      <EventCard
                        key={`${inst.event.id}_${inst.startTime.getTime()}`}
                        instance={inst}
                        onSendMessage={handleSendMessage}
                        onTeleport={handleTeleport}
                        isJustCopied={copiedId === `${inst.event.id}_${inst.startTime.getTime()}`}
                        userAchievements={userAchievements}
                      />
                    ))
                  )}
                </div>
              </>

            ) : currentTab === 'crafting' ? (
              <CraftingView />
            ) : currentTab === 'legendary' ? (
              <LegendaryView userAchievements={userAchievements} />
            ) : (
              /* Authentic Achievements / Heldin - Erfolge View */
              <AchievementsView
                upcomingInstances={allInstances}
                onSendMessage={handleSendMessage}
                onTeleport={handleTeleport}
                onSwitchToEvents={() => setCurrentTab('events')}
                accountInfo={accountInfo}
                userAchievements={userAchievements}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        isElectron={isElectron}
        onApiDataSynced={(acc, achs) => {
          setAccountInfo(acc);
          setUserAchievements(achs);
          if (acc) {
            setToastMessage(`🔑 API verbunden: Account ${acc.name} (${achs.size} Erfolge synchronisiert)`);
          } else {
            setToastMessage(`API-Schlüssel entfernt.`);
          }
        }}
      />
    </div>
  );
};
