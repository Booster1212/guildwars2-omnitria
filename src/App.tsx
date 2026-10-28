import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { Gw2NavRail } from './components/Gw2NavRail';
import { BossFilterBar } from './components/BossFilterBar';
import { EventCard } from './components/EventCard';
import { MiniWidget } from './components/MiniWidget';
import { Toast } from './components/Toast';
import { getEventSchedule, formatCallout, LOOT_ITEM_ID_MAP, isBossEvent, isMetaEvent } from './data/events';
import { playCopyChime } from './data/audio';
import { EventInstance, OverlaySettings, SortMode, OverlayTab } from './types';
import {
  loadCachedApiData,
  fetchAllAccountProgression,
  Gw2AccountInfo,
  Gw2AccountAchievement,
  Gw2DailyProgression,
} from './data/gw2Api';
import { syncIfStale } from './data/gw2/account';
import { progressActions } from './data/progressStore';
import { ensureItems } from './data/gw2/items';
import { DISCIPLINE_ICON_ITEM } from './components/common/labels';
import { useTranslation } from './i18n';

// Code-split heavy views to reduce initial bundle and startup time
const InventoryHubView = lazy(() => import('./components/inventory/InventoryHubView').then((m) => ({ default: m.InventoryHubView })));
const AchievementsView = lazy(() => import('./components/AchievementsView').then((m) => ({ default: m.AchievementsView })));
const CraftingView = lazy(() => import('./components/crafting/CraftingView').then((m) => ({ default: m.CraftingView })));
const LegendaryView = lazy(() => import('./components/legendary/LegendaryView').then((m) => ({ default: m.LegendaryView })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));

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

  // Live GW2 API Account, Achievements & Daily state
  const [accountInfo, setAccountInfo] = useState<Gw2AccountInfo | null>(() => {
    return loadCachedApiData().account;
  });
  const [userAchievements, setUserAchievements] = useState<Map<number, Gw2AccountAchievement>>(() => {
    return loadCachedApiData().achievements;
  });
  const [dailyProgression, setDailyProgression] = useState<Gw2DailyProgression | null>(() => {
    return loadCachedApiData().dailyProgression;
  });
  const [isRefreshingProgression, setIsRefreshingProgression] = useState<boolean>(false);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Load settings from localStorage (normalizing legacy widgetMode/opacity shapes)
  const [settings, setSettings] = useState<OverlaySettings>(() => {
    try {
      const saved = localStorage.getItem('gw2_overlay_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const rawWidget = parsed.widgetMode;
        const normalizedWidgetMode =
          rawWidget === true || rawWidget === 'mini' || rawWidget === 'compact';
        const rawOpacity =
          typeof parsed.opacity === 'number' && Number.isFinite(parsed.opacity)
            ? parsed.opacity > 1
              ? Math.min(1, Math.max(0.2, parsed.opacity / 100))
              : Math.min(1, Math.max(0.2, parsed.opacity))
            : DEFAULT_SETTINGS.opacity;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          widgetMode: normalizedWidgetMode,
          opacity: rawOpacity,
        };
      }
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

  // Full progression sync (Achievements, World Bosses, Map Chests, Wizard's Vault)
  const handleRefreshProgression = useCallback(async () => {
    if (!settings.apiKey?.trim()) return;
    setIsRefreshingProgression(true);
    try {
      const res = await fetchAllAccountProgression(settings.apiKey);
      if (res.account) setAccountInfo(res.account);
      const achMap = new Map<number, Gw2AccountAchievement>();
      res.achievements.forEach((a) => achMap.set(a.id, a));
      setUserAchievements(achMap);
      setDailyProgression(res.dailyProgression);

      // Auto-sync event completions with today's kills and repeatable achievements
      progressActions.syncApiCompletions(
        res.dailyProgression.worldBosses,
        res.dailyProgression.mapChests,
        achMap,
      );
    } catch (e) {
      console.error('Failed to sync progression', e);
    } finally {
      setIsRefreshingProgression(false);
    }
  }, [settings.apiKey]);

  // Sync account data & achievements/dailies on startup and periodically every 5 minutes
  useEffect(() => {
    if (settings.apiKey) {
      void syncIfStale(settings.apiKey);
      void handleRefreshProgression();

      const timer = setInterval(() => {
        void handleRefreshProgression();
      }, 5 * 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [settings.apiKey, handleRefreshProgression]);

  // Check if running in Electron
  const isElectron = Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron
  );

  // Sync settings changes
  const updateSettings = useCallback((partial: Partial<OverlaySettings>) => {
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
  }, []);

  const handleSelectSortMode = useCallback((mode: SortMode) => {
    setSortMode(mode);
    updateSettings({ sortMode: mode });
  }, [updateSettings]);

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleSelectTab = useCallback((tab: OverlayTab) => setCurrentTab(tab), []);
  const handleSwitchToEvents = useCallback(() => setCurrentTab('events'), []);
  const handleExpandMini = useCallback(() => updateSettings({ widgetMode: false }), [updateSettings]);

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

  // Minimize overlay when Escape key is pressed (or close settings if open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        const api = (window as unknown as {
          electronAPI?: { minimizeWindow?: () => void };
        }).electronAPI;
        if (api?.minimizeWindow) {
          api.minimizeWindow();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  // Update clock: 1000ms if on events tab or widget mode; 15s if in static tab
  useEffect(() => {
    const isHighFrequencyNeeded = settings.widgetMode || currentTab === 'events';
    const intervalMs = isHighFrequencyNeeded ? 1000 : 15000;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.widgetMode, currentTab]);

  // Preload core crafting discipline items and famous legendary weapons automatically
  useEffect(() => {
    const preloadIds = [
      ...Object.values(DISCIPLINE_ICON_ITEM),
      ...Object.values(LOOT_ITEM_ID_MAP),
      30689, // Sunrise
      30684, // Twilight
      30687, // Eternity
      30699, // Bolt
      30700, // The Bifrost
      30704, // Meteorlogicus
      30691, // Quip
      30692, // The Predator
      30696, // Kudzu
      30686, // Frostfang
      30698, // The Howler
      30693, // The Minstrel
      30702, // The Colossus / The Juggernaut
      30690, // Kraitkin
      30694, // Frenzy
      19675, // Mystic Clover
      19976, // Mystic Coin
      19721, // Glob of Ectoplasm
    ];
    void ensureItems(preloadIds);
  }, []);

  // Compute live event schedule from database
  const allInstances = useMemo(() => {
    return getEventSchedule(currentTime, 16);
  }, [currentTime]);

  // Filter & Sort instances
  const processedInstances = useMemo(() => {
    const matched = allInstances.filter((inst) => {
      // Category filter
      if (activeCategory === 'active') {
        const isUrgent = inst.isActive || inst.startsInSeconds <= 15 * 60;
        if (!isUrgent) return false;
      } else if (activeCategory === 'bosses') {
        if (!isBossEvent(inst.event)) return false;
      } else if (activeCategory === 'metas') {
        if (!isMetaEvent(inst.event)) return false;
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
        const aIsBoss = isBossEvent(a.event);
        const bIsBoss = isBossEvent(b.event);
        if (aIsBoss && !bIsBoss) return -1;
        if (!aIsBoss && bIsBoss) return 1;
      } else if (sortMode === 'metasFirst') {
        const aIsBoss = isBossEvent(a.event);
        const bIsBoss = isBossEvent(b.event);
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
    const bosses = processedInstances.filter((inst) => isBossEvent(inst.event));
    const metas = processedInstances.filter((inst) => isMetaEvent(inst.event));
    return { bossList: bosses, metaList: metas };
  }, [processedInstances, sortMode]);

  // Action 1: Chat-Aufruf kopieren (Copies waypoint + remaining time into clipboard for manual pasting)
  const handleSendMessage = useCallback(async (inst: EventInstance) => {
    const textToCopy = formatCallout(inst, settings.messageTemplate, lang);
    let copySuccessful = false;

    // 1. Copy via Electron IPC if available
    const api = (window as unknown as {
      electronAPI?: {
        copyToClipboard?: (t: string) => Promise<{ success: boolean; error?: string }> | void;
      };
    }).electronAPI;

    if (api?.copyToClipboard) {
      try {
        const res = await api.copyToClipboard(textToCopy);
        if (res && typeof res === 'object' && 'success' in res) {
          copySuccessful = Boolean(res.success);
        } else {
          copySuccessful = true;
        }
      } catch (err) {
        console.error('Electron clipboard copy failed', err);
      }
    }

    // 2. Fallback to browser navigator.clipboard
    if (!copySuccessful && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copySuccessful = true;
      } catch (err) {
        console.error('Navigator clipboard copy failed', err);
      }
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
    if (copySuccessful) {
      setToastMessage(
        lang === 'en'
          ? `📋 Chat callout copied to clipboard: ${textToCopy} (Paste in game with [Enter] + [Ctrl+V])`
          : `📋 Chat-Aufruf in die Zwischenablage kopiert: ${textToCopy} (Im Spiel mit [Enter] + [Strg+V] einfügen)`
      );
    } else {
      setToastMessage(
        lang === 'en'
          ? `⚠️ Failed to copy to clipboard. Please check application permissions.`
          : `⚠️ Fehler beim Kopieren in die Zwischenablage. Bitte Berechtigungen prüfen.`
      );
    }
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, [settings.messageTemplate, settings.soundEnabled, settings.soundVolume, lang]);

  // Action 2: Wegmarken-Code kopieren (Copies waypoint chat code into clipboard for manual travel)
  const handleTeleport = useCallback(async (inst: EventInstance) => {
    const waypointTag = inst.event.waypoint;
    let copySuccessful = false;

    // 1. Copy via Electron IPC if available
    const api = (window as unknown as {
      electronAPI?: {
        copyToClipboard?: (t: string) => Promise<{ success: boolean; error?: string }> | void;
      };
    }).electronAPI;

    if (api?.copyToClipboard) {
      try {
        const res = await api.copyToClipboard(waypointTag);
        if (res && typeof res === 'object' && 'success' in res) {
          copySuccessful = Boolean(res.success);
        } else {
          copySuccessful = true;
        }
      } catch (err) {
        console.error('Electron clipboard copy failed', err);
      }
    }

    // 2. Fallback to browser navigator.clipboard
    if (!copySuccessful && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(waypointTag);
        copySuccessful = true;
      } catch (err) {
        console.error('Navigator clipboard copy failed', err);
      }
    }

    // 3. Audio & Visuals
    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (copySuccessful) {
      setToastMessage(
        lang === 'en'
          ? `📍 Waypoint code copied: ${waypointTag} (Paste in game chat with [Enter] + [Ctrl+V] to travel)`
          : `📍 Wegmarken-Code kopiert: ${waypointTag} (Im Spiel-Chat mit [Enter] + [Strg+V] einfügen zum Reisen)`
      );
    } else {
      setToastMessage(
        lang === 'en'
          ? `⚠️ Failed to copy waypoint code to clipboard.`
          : `⚠️ Fehler beim Kopieren des Wegmarken-Codes.`
      );
    }
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  }, [settings.soundEnabled, settings.soundVolume, lang]);

  // Action 3: Event-Abschluss erfassen
  const handleLogEventCompletion = useCallback((eventId: string, newTotal: number) => {
    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(lang === 'en' ? `⚔️ Completion logged! Total: ${newTotal}x` : `⚔️ Abschluss erfasst! Insgesamt: ${newTotal}x`);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, [settings.soundEnabled, settings.soundVolume, lang]);

  const handleApiDataSynced = useCallback((
    acc: Gw2AccountInfo | null,
    achs: Map<number, Gw2AccountAchievement>,
    daily?: Gw2DailyProgression | null,
  ) => {
    setAccountInfo(acc);
    setUserAchievements(achs);
    if (daily) {
      setDailyProgression(daily);
      progressActions.syncApiCompletions(daily.worldBosses, daily.mapChests, achs);
    }
    if (acc) {
      setToastMessage(
        lang === 'en'
          ? `🔑 API connected: Account ${acc.name} (${achs.size} achievements synced)`
          : `🔑 API verbunden: Account ${acc.name} (${achs.size} Erfolge synchronisiert)`
      );
    } else {
      setToastMessage(lang === 'en' ? 'API key disconnected.' : 'API-Schlüssel entfernt.');
    }
  }, [lang]);

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
        onSelectTab={handleSelectTab}
        onUpdateSettings={updateSettings}
        onOpenSettings={handleOpenSettings}
        isElectron={isElectron}
        accountName={accountInfo?.name}
      />

      {clickThroughActive && (
        <div className="gw2-clickthrough-banner" role="status" aria-live="polite">
          {t('app.clickThroughActive')}
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
          onExpand={handleExpandMini}
          dailyProgression={dailyProgression}
          onLogCompletion={handleLogEventCompletion}
        />
      ) : (
        /* Full Heldin Panel Layout with Left NavRail */
        <div className="gw2-main-body-layout">
          {/* Left Vertical Icon Rail */}
          <Gw2NavRail
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            onOpenSettings={handleOpenSettings}
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
                          dailyProgression={dailyProgression}
                          onLogCompletion={handleLogEventCompletion}
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
                          dailyProgression={dailyProgression}
                          onLogCompletion={handleLogEventCompletion}
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
                        dailyProgression={dailyProgression}
                        onLogCompletion={handleLogEventCompletion}
                      />
                    ))
                  )}
                </div>
              </>

            ) : currentTab === 'inventory' ? (
              <Suspense fallback={<div className="empty-state font-serif">{lang === 'de' ? 'Laden...' : 'Loading...'}</div>}>
                <InventoryHubView
                  apiKey={settings.apiKey}
                  dailyProgression={dailyProgression}
                  userAchievements={userAchievements}
                  onOpenSettings={handleOpenSettings}
                  onNavigateTab={setCurrentTab}
                  onToast={handleToast}
                />
              </Suspense>
            ) : currentTab === 'crafting' ? (
              <Suspense fallback={<div className="empty-state font-serif">{lang === 'de' ? 'Laden...' : 'Loading...'}</div>}>
                <CraftingView />
              </Suspense>
            ) : currentTab === 'legendary' ? (
              <Suspense fallback={<div className="empty-state font-serif">{lang === 'de' ? 'Laden...' : 'Loading...'}</div>}>
                <LegendaryView userAchievements={userAchievements} />
              </Suspense>
            ) : (
              /* Authentic Achievements / Heldin - Erfolge View */
              <Suspense fallback={<div className="empty-state font-serif">{lang === 'de' ? 'Laden...' : 'Loading...'}</div>}>
                <AchievementsView
                  upcomingInstances={allInstances}
                  onSendMessage={handleSendMessage}
                  onTeleport={handleTeleport}
                  onSwitchToEvents={handleSwitchToEvents}
                  accountInfo={accountInfo}
                  userAchievements={userAchievements}
                  dailyProgression={dailyProgression}
                  onOpenSettings={handleOpenSettings}
                  onRefreshProgression={handleRefreshProgression}
                  isRefreshing={isRefreshingProgression}
                />
              </Suspense>
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

      {/* Settings Modal (only mounted and loaded when open) */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
            settings={settings}
            onUpdateSettings={updateSettings}
            isElectron={isElectron}
            onApiDataSynced={handleApiDataSynced}
          />
        </Suspense>
      )}
    </div>
  );
};
