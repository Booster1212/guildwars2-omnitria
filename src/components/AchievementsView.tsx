import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  Circle,
  Search,
  Trophy,
  Compass,
  Star,
  X,
  Flame,
  Sparkles,
  Shield,
  Key,
  RefreshCw,
  Info,
  Gift,
  Check,
  Zap,
  TrendingUp,
  Target,
  Layers,
  Calendar,
  ExternalLink,
  Skull,
  Swords,
  Crown,
  Filter,
} from 'lucide-react';
import type { EventInstance } from '../types';
import type { Gw2AccountInfo, Gw2AccountAchievement, Gw2DailyProgression } from '../data/gw2Api';
import { loadCachedApiData } from '../data/gw2Api';
import { ProgressBar } from './common/ui';
import { useTranslation } from '../i18n';
import {
  EnrichedAchievement,
  AchievementRecommendation,
  generateRecommendations,
  filterAndSortAchievements,
  AchievementFilterOptions,
  calculateAccountTotalAp,
  calculateApMilestones,
  getNearlyCompletedAchievements,
  getRecentlyCompletedAchievements,
} from '../domain/achievementIntelligence';
import {
  initAchievementService,
  getEnrichedAchievements,
  ensureAchievementDefinitions,
  getCategoriesAndGroups,
  achievementEmitter,
} from '../data/gw2/achievements/achievementService';

interface AchievementsViewProps {
  upcomingInstances: EventInstance[];
  onSendMessage: (inst: EventInstance) => void;
  onTeleport: (inst: EventInstance) => void;
  onSwitchToEvents: () => void;
  accountInfo?: Gw2AccountInfo | null;
  userAchievements?: Map<number, Gw2AccountAchievement>;
  dailyProgression?: Gw2DailyProgression | null;
  onOpenSettings?: () => void;
  onRefreshProgression?: () => Promise<void>;
  isRefreshing?: boolean;
}

const STORAGE_KEY_WATCHLIST = 'gw2_watchlist_achievements';

type ActiveTab =
  | 'summary'
  | 'category'
  | 'intelligence'
  | 'watchlist'
  | 'daily';

type IntelligenceSubtab =
  | 'bestNext'
  | 'efficiency'
  | 'quickWins'
  | 'highestReward'
  | 'continueProgress';

interface AchievementIconProps {
  icon?: string;
  groupId?: string;
  categoryName?: string;
  size?: number;
  className?: string;
}

const AchievementIcon: React.FC<AchievementIconProps> = ({
  icon,
  groupId,
  categoryName = '',
  size = 36,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const isUrl = Boolean(icon && (icon.startsWith('http://') || icon.startsWith('https://')) && !imgError);

  if (isUrl) {
    return (
      <img
        src={icon}
        alt=""
        className={`achieve-card-thumb ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const iconLower = (icon || '').toLowerCase();
  const groupLower = (groupId || '').toLowerCase();
  const catLower = categoryName.toLowerCase();

  let GlyphComponent = Trophy;
  let glyphColor = 'gold';

  if (iconLower.includes('skull') || groupLower.includes('boss') || catLower.includes('boss')) {
    GlyphComponent = Skull;
    glyphColor = 'text-red-400';
  } else if (iconLower.includes('sword') || groupLower.includes('slayer') || catLower.includes('slayer')) {
    GlyphComponent = Swords;
    glyphColor = 'text-amber-400';
  } else if (groupLower.includes('collection') || catLower.includes('sammlung') || iconLower.includes('star')) {
    GlyphComponent = Sparkles;
    glyphColor = 'text-purple-400';
  } else if (groupLower.includes('fractal') || catLower.includes('fraktal')) {
    GlyphComponent = Zap;
    glyphColor = 'text-cyan-400';
  } else if (groupLower.includes('daily') || catLower.includes('täglich') || catLower.includes('daily')) {
    GlyphComponent = Calendar;
    glyphColor = 'text-emerald-400';
  } else if (groupLower.includes('story') || catLower.includes('story') || catLower.includes('chronik')) {
    GlyphComponent = Layers;
    glyphColor = 'text-sky-400';
  } else if (iconLower.includes('shield')) {
    GlyphComponent = Shield;
    glyphColor = 'text-blue-400';
  } else if (iconLower.includes('chest') || iconLower.includes('gift')) {
    GlyphComponent = Gift;
    glyphColor = 'text-amber-300';
  } else {
    GlyphComponent = Award;
    glyphColor = 'gold';
  }

  return (
    <div
      className={`achieve-card-thumb-fallback ${className}`}
      style={{ width: size, height: size }}
      title={categoryName}
    >
      <GlyphComponent size={Math.round(size * 0.52)} className={glyphColor} />
    </div>
  );
};

function stripGw2Tags(text?: string): string {
  if (!text) return '';
  return text.replace(/<c=[^>]*>/gi, '').replace(/<\/c>/gi, '');
}

const CORE_WORLD_BOSSES = [
  { id: 'tequatl', apiId: 'tequatl_the_sunless', name: 'Tequatl der Sonnenlose', nameEn: 'Tequatl the Sunless', waypoint: '[&BNABAAA=]', zone: 'Funkenschwärmersumpf', zoneEn: 'Sparkfly Fen' },
  { id: 'triple-trouble', apiId: 'triple_trouble_wurm', name: 'Großer Tropischer Wurm', nameEn: 'Great Jungle Wurm (Triple Trouble)', waypoint: '[&BKoBAAA=]', zone: 'Blutstrom-Küste', zoneEn: 'Bloodtide Coast' },
  { id: 'shatterer', apiId: 'the_shatterer', name: 'Der Zerschmetterer', nameEn: 'The Shatterer', waypoint: '[&BE4DAAA=]', zone: 'Flammenkamm-Steppe', zoneEn: 'Blazeridge Steppes' },
  { id: 'claw-of-jormag', apiId: 'claw_of_jormag', name: 'Klaue von Jormag', nameEn: 'Claw of Jormag', waypoint: '[&BHoCAAA=]', zone: 'Eisklamm-Sund', zoneEn: 'Frostgorge Sound' },
  { id: 'shadow-behemoth', apiId: 'shadow_behemoth', name: 'Schatten-Behemoth', nameEn: 'Shadow Behemoth', waypoint: '[&BPcAAAA=]', zone: 'Königintal', zoneEn: 'Queensdale' },
  { id: 'fire-elemental', apiId: 'fire_elemental', name: 'Feuerelementar', nameEn: 'Fire Elemental', waypoint: '[&BEcAAAA=]', zone: 'Provinz Metrica', zoneEn: 'Metrica Province' },
  { id: 'jungle-wurm', apiId: 'great_jungle_wurm', name: 'Großer Dschungelwurm', nameEn: 'Great Jungle Wurm', waypoint: '[&BEEFAAA=]', zone: 'Caledon-Wald', zoneEn: 'Caledon Forest' },
  { id: 'svanir-shaman', apiId: 'svanir_shaman_chief', name: 'Svanir-Schamane', nameEn: 'Svanir Shaman Chief', waypoint: '[&BMIDAAA=]', zone: 'Wanderer-Hügel', zoneEn: 'Wayfarer Foothills' },
  { id: 'megadestroyer', apiId: 'megadestroyer', name: 'Megazerstörer', nameEn: 'Megadestroyer', waypoint: '[&BM0CAAA=]', zone: 'Mahlstromgipfel', zoneEn: 'Mount Maelstrom' },
  { id: 'inquest-golem', apiId: 'inquest_golem_mark_ii', name: 'Inquestur-Golem Typ II', nameEn: 'Inquest Golem Mark II', waypoint: '[&BNQCAAA=]', zone: 'Mahlstromgipfel', zoneEn: 'Mount Maelstrom' },
  { id: 'karka-queen', apiId: 'karka_queen', name: 'Karka-Königin', nameEn: 'Karka Queen', waypoint: '[&BNcGAAA=]', zone: 'Südlicht-Bucht', zoneEn: 'Southsun Cove' },
  { id: 'taidha-covington', apiId: 'admiral_taidha_covington', name: 'Admiralin Taidha Covington', nameEn: 'Admiral Taidha Covington', waypoint: '[&BKgBAAA=]', zone: 'Blutstrom-Küste', zoneEn: 'Bloodtide Coast' },
  { id: 'modniir-ulgoth', apiId: 'modniir_ulgoth', name: 'Ulgoth der Modniir', nameEn: 'Modniir Ulgoth', waypoint: '[&BLEAAAA=]', zone: 'Harathi-Hinterland', zoneEn: 'Harathi Hinterlands' },
];

const MAP_HERO_CHESTS = [
  { id: 'tarir-octovine', apiId: 'auric_basin_heros_choice_chest', name: 'Tarir (Güldener Kessel)', nameEn: 'Tarir (Auric Basin)', waypoint: '[&BMYHAAA=]', zone: 'Güldener Kessel', zoneEn: 'Auric Basin' },
  { id: 'chak-gerent', apiId: 'tangled_depths_heros_choice_chest', name: 'Chak-Gerent (Verschlungene Tiefen)', nameEn: 'Chak Gerent (Tangled Depths)', waypoint: '[&BPUHAAA=]', zone: 'Verschlungene Tiefen', zoneEn: 'Tangled Depths' },
  { id: 'verdant-brink-night', apiId: 'verdant_brink_heros_choice_chest', name: 'Grasgrüne Klippen (Nacht-Meta)', nameEn: 'Verdant Brink (Night Bosses)', waypoint: '[&BAgIAAA=]', zone: 'Grasgrüne Klippen', zoneEn: 'Verdant Brink' },
  { id: 'dragons-stand', apiId: 'dragons_stand_heros_choice_chest', name: 'Widerstand des Drachen', nameEn: "Dragon's Stand (Mouth of Mordremoth)", waypoint: '[&BBAIAAA=]', zone: 'Widerstand des Drachen', zoneEn: "Dragon's Stand" },
  { id: 'choya-pinata', apiId: 'crystal_oasis_heros_choice_chest', name: 'Choya-Piñata (Kristalloase)', nameEn: 'Choya Piñata (Crystal Oasis)', waypoint: '[&BLsKAAA=]', zone: 'Kristalloase', zoneEn: 'Crystal Oasis' },
  { id: 'maws-of-torment', apiId: 'the_desolation_heros_choice_chest', name: 'Schlund der Qualen (Ödland)', nameEn: 'Maws of Torment (The Desolation)', waypoint: '[&BKMKAAA=]', zone: 'Das Ödland', zoneEn: 'The Desolation' },
  { id: 'serpents-ire', apiId: 'domain_of_vabbi_heros_choice_chest', name: 'Zorn der Schlange (Vabbi)', nameEn: "Serpent's Ire (Domain of Vabbi)", waypoint: '[&BHQKAAA=]', zone: 'Domäne Vabbi', zoneEn: 'Domain of Vabbi' },
];

export const AchievementsView: React.FC<AchievementsViewProps> = React.memo(({
  upcomingInstances,
  onSendMessage,
  onTeleport,
  onSwitchToEvents,
  accountInfo,
  userAchievements,
  dailyProgression,
  onOpenSettings,
  onRefreshProgression,
  isRefreshing,
}) => {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [intelligenceSubtab, setIntelligenceSubtab] = useState<IntelligenceSubtab>('bestNext');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'unstarted' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<string>('game-order');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedWaypointId, setCopiedWaypointId] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(40);

  // Watchlist persisted in localStorage
  const [watchlist, setWatchlist] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHLIST);
      return saved ? JSON.parse(saved) : [1845, 824, 439];
    } catch {
      return [1845, 824, 439];
    }
  });

  const toggleWatchlist = (achId: number) => {
    setWatchlist((prev) => {
      const next = prev.includes(achId) ? prev.filter((id) => id !== achId) : [...prev, achId];
      try {
        localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save watchlist', e);
      }
      return next;
    });
  };

  // Reset pagination limit on search or filter change
  useEffect(() => {
    setDisplayLimit(40);
  }, [searchQuery, selectedGroup, selectedCategoryId, statusFilter, sortBy]);

  // Reactive subscription to dynamic achievement definitions & categories
  const [, setCatalogVersion] = useState(0);
  useEffect(() => {
    void initAchievementService();
    const unsub = achievementEmitter.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Fallback to cached API achievements if prop is empty but apiKey/accountInfo exists
  const effectiveUserAchievements = useMemo(() => {
    if (userAchievements && userAchievements.size > 0) {
      return userAchievements;
    }
    const cached = loadCachedApiData().achievements;
    if (cached && cached.size > 0) {
      return cached;
    }
    return userAchievements;
  }, [userAchievements]);

  // If userAchievements is not yet loaded on mount, request a background progression refresh
  useEffect(() => {
    if ((!userAchievements || userAchievements.size === 0) && onRefreshProgression) {
      onRefreshProgression();
    }
  }, [userAchievements, onRefreshProgression]);

  // When user achievements update, ensure definitions for started achievements are loaded
  useEffect(() => {
    if (effectiveUserAchievements && effectiveUserAchievements.size > 0) {
      const ids = Array.from(effectiveUserAchievements.keys()).slice(0, 300);
      void ensureAchievementDefinitions(ids, lang);
    }
  }, [effectiveUserAchievements, lang]);

  const hasSyncedApiKey = Boolean(accountInfo && effectiveUserAchievements && effectiveUserAchievements.size > 0);

  // 1. Enriched achievements (all 8,357)
  const allEnriched = useMemo(() => {
    return getEnrichedAchievements(effectiveUserAchievements);
  }, [effectiveUserAchievements]);

  // Categories and groups metadata
  const { categories, groups } = useMemo(() => getCategoriesAndGroups(), []);

  // Fast in-game order lookup: maps achievementId -> (category.order * 10000 + index in category)
  const inGameOrderMap = useMemo(() => {
    const map = new Map<number, number>();
    categories.forEach((cat) => {
      if (cat.achievements) {
        cat.achievements.forEach((id, idx) => {
          map.set(id, (cat.order || 50) * 10000 + idx);
        });
      }
    });
    return map;
  }, [categories]);

  // Sidebar expanded groups (default: Adventure Guide & General expanded)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(['EFADEE67-588F-412F-A1BD-6C9AFF782988', '56A82BB9-6B07-4AB0-89EE-E4A6D68F5C47']),
  );

  const toggleGroup = (grpId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(grpId)) next.delete(grpId);
      else next.add(grpId);
      return next;
    });
  };

  // 2. Computed recommendations by strategy
  const bestNextRecs = useMemo(() => {
    return generateRecommendations(allEnriched, 'bestNext', lang, 30);
  }, [allEnriched, lang]);

  const efficiencyRecs = useMemo(() => {
    return generateRecommendations(allEnriched, 'efficiency', lang, 30);
  }, [allEnriched, lang]);

  const quickWinsRecs = useMemo(() => {
    return generateRecommendations(allEnriched, 'quickWins', lang, 30);
  }, [allEnriched, lang]);

  const highestRewardRecs = useMemo(() => {
    return generateRecommendations(allEnriched, 'highestReward', lang, 30);
  }, [allEnriched, lang]);

  const continueProgressRecs = useMemo(() => {
    return generateRecommendations(allEnriched, 'continueProgress', lang, 30);
  }, [allEnriched, lang]);

  // Filtered achievements for category browser (sorted in-game by default!)
  const categoryBrowserAchievements = useMemo(() => {
    const filterOpts: AchievementFilterOptions = {
      query: searchQuery,
      groupId: selectedCategoryId ? undefined : (selectedGroup !== 'all' ? selectedGroup : undefined),
      categoryId: selectedCategoryId || undefined,
      statusFilter,
      sortBy,
      lang,
      orderLookup: inGameOrderMap,
    };
    return filterAndSortAchievements(allEnriched, filterOpts);
  }, [allEnriched, searchQuery, selectedGroup, selectedCategoryId, statusFilter, sortBy, lang, inGameOrderMap]);

  // Watchlist items
  const watchlistAchievements = useMemo(() => {
    return allEnriched.filter((a) => watchlist.includes(a.definition.id));
  }, [allEnriched, watchlist]);

  // Summary counts
  const totalCompletedCount = useMemo(() => {
    return allEnriched.filter((a) => a.isDone).length;
  }, [allEnriched]);

  const totalObtainableAp = useMemo(() => {
    return allEnriched.reduce((acc, a) => acc + a.obtainableAp, 0);
  }, [allEnriched]);

  // Total Account AP & Cap breakdown calculation
  const apBreakdown = useMemo(() => {
    return calculateAccountTotalAp(accountInfo, allEnriched);
  }, [accountInfo, allEnriched]);

  // AP Milestone reward chests
  const apMilestones = useMemo(() => {
    return calculateApMilestones(apBreakdown.totalAp, 5);
  }, [apBreakdown.totalAp]);

  // Fast abgeschlossen (Nearly Completed)
  const nearlyCompleted = useMemo(() => {
    return getNearlyCompletedAchievements(allEnriched, 6);
  }, [allEnriched]);

  // Kürzlich abgeschlossen (Recently Completed)
  const recentlyCompleted = useMemo(() => {
    return getRecentlyCompletedAchievements(allEnriched, 6);
  }, [allEnriched]);

  // Quick category status counts
  const categoryStatusCounts = useMemo(() => {
    let all = 0;
    let inProg = 0;
    let unstarted = 0;
    let completed = 0;
    for (const a of allEnriched) {
      if (selectedGroup !== 'all' && a.definition.groupId !== selectedGroup) continue;
      if (selectedCategoryId !== 0 && a.definition.categoryId !== selectedCategoryId) continue;
      all++;
      if (a.isDone) completed++;
      else if (a.progressStatus === 'in_progress') inProg++;
      else unstarted++;
    }
    return { all, inProg, unstarted, completed };
  }, [allEnriched, selectedGroup, selectedCategoryId]);

  // Category completion statistics map
  const categoryStatsMap = useMemo(() => {
    const map = new Map<number, { total: number; completed: number; obtainableAp: number }>();
    for (const a of allEnriched) {
      const catId = a.definition.categoryId;
      let stat = map.get(catId);
      if (!stat) {
        stat = { total: 0, completed: 0, obtainableAp: 0 };
        map.set(catId, stat);
      }
      stat.total++;
      if (a.isDone) stat.completed++;
      stat.obtainableAp += a.obtainableAp;
    }
    return map;
  }, [allEnriched]);

  // Group completion statistics map
  const groupStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const a of allEnriched) {
      const grpId = a.definition.groupId;
      let stat = map.get(grpId);
      if (!stat) {
        stat = { total: 0, completed: 0 };
        map.set(grpId, stat);
      }
      stat.total++;
      if (a.isDone) stat.completed++;
    }
    return map;
  }, [allEnriched]);

  // Active category metadata (falls back to selected group or first category)
  const activeCategory = useMemo(() => {
    if (selectedCategoryId) {
      return categories.find((c) => c.id === selectedCategoryId) || null;
    }
    if (selectedGroup !== 'all') {
      return categories.find((c) => c.groupId === selectedGroup) || categories[0] || null;
    }
    return categories[0] || null;
  }, [categories, selectedCategoryId, selectedGroup]);

  // Featured Best Next (the #1 ranked recommendation)
  const featuredBestNext = bestNextRecs.length > 0 ? bestNextRecs[0] : null;

  const handleCopyWaypoint = (ach: EnrichedAchievement) => {
    const code = ach.definition.waypoint || upcomingInstances.find((i) => i.event.id === ach.definition.eventId)?.event.waypoint;
    if (!code) return;
    try {
      const api = (window as unknown as { electronAPI?: { copyToClipboard: (t: string) => void } }).electronAPI;
      if (api?.copyToClipboard) {
        api.copyToClipboard(code);
      } else {
        void navigator.clipboard.writeText(code);
      }
      setCopiedWaypointId(ach.definition.id);
      setTimeout(() => setCopiedWaypointId(null), 2500);
    } catch (_) {}
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="gw2-achieve-container achieve-intelligence-root">
      {/* 1. Header Toolbar & Real-Time Stats */}
      <div className="gw2-achieve-header-bar">
        <div className="achieve-title-block">
          <div className="achieve-icon-badge">
            <Trophy size={18} className="gold" />
          </div>
          <div>
            <h2 className="achieve-title font-serif">{t('intel.title')}</h2>
            <p className="achieve-subtitle dim text-xs">{t('intel.subtitle')}</p>
          </div>
        </div>

        {/* Account live status & AP showcase */}
        <div className="achieve-header-actions">
          {accountInfo ? (
            <div className="account-ap-header-card font-mono">
              <div className="ap-main-stat">
                <Star size={14} className="gold" fill="#d2b268" />
                <span className="ap-total-num">{apBreakdown.totalAp.toLocaleString()} AP</span>
                <span className="ap-total-label">{t('intel.currentAccountAp')}</span>
                {onRefreshProgression && (
                  <button
                    type="button"
                    className="achieve-refresh-btn"
                    onClick={onRefreshProgression}
                    disabled={isRefreshing}
                    title={lang === 'en' ? 'Refresh progression' : 'Fortschritt aktualisieren'}
                    style={{ marginLeft: 'auto', padding: '2px 6px' }}
                  >
                    <RefreshCw size={11} className={isRefreshing ? 'spin' : ''} />
                  </button>
                )}
              </div>
              <div className="ap-sub-stat">
                <span title={t('intel.dailyMonthlyCap')}>
                  📅 {apBreakdown.dailyMonthlyCombined.toLocaleString()} / 15.000 AP {apBreakdown.isDailyMonthlyCapped ? '(Cap)' : ''}
                </span>
                <span className="sep">•</span>
                <span className="text-emerald-400 font-semibold">
                  {totalCompletedCount} {lang === 'en' ? 'Done' : 'Erledigt'}
                </span>
                <span className="sep">•</span>
                <span className="text-amber-300 font-semibold" title={lang === 'en' ? 'Obtainable from loaded achievements' : 'Aus allen Erfolgen noch erreichbar'}>
                  +{totalObtainableAp.toLocaleString()} AP
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="guest-mode-pill"
              onClick={onOpenSettings}
              title={t('intel.guestBannerDesc')}
            >
              <Info size={13} className="text-amber-400 inline mr-1" />
              <span>{lang === 'en' ? 'Guest Mode (8,357 Indexed)' : 'Gastmodus (8.357 Erfolge)'}</span>
              <Key size={11} className="ml-1.5 opacity-80" />
            </button>
          )}
        </div>
      </div>

      {/* Guest Mode Informational Banner */}
      {!hasSyncedApiKey && (
        <div className="achieve-guest-banner" role="status">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <strong className="font-serif text-xs text-[#f4e3a8] block">
                {t('intel.guestBannerTitle')}
              </strong>
              <p className="text-xs text-[#d6d1c5] mt-0.5 leading-relaxed">
                {t('intel.guestBannerDesc')}
              </p>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                className="gw2-btn-sm shrink-0 font-serif"
                onClick={onOpenSettings}
              >
                <Key size={11} className="mr-1 inline" />
                <span>{t('intel.connectKeyBtn')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. AUTHENTIC HERO PANEL TWO-PANE LAYOUT */}
      <div className="gw2-hero-layout">
        {/* ============================================================
            LEFT SIDEBAR: SEARCH, QUICK FILTER & GROUP/CATEGORY TREE
            ============================================================ */}
        <aside className="gw2-hero-sidebar">
          {/* Top Filter & Search */}
          <div className="gw2-hero-sidebar-search">
            <div style={{ marginBottom: 6 }}>
              <select
                className="gw2-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label={t('intel.filterStatus')}
                style={{ width: '100%', fontSize: 11, padding: '3px 6px' }}
              >
                <option value="all">{t('intel.statusAll')}</option>
                <option value="in_progress">{t('intel.statusInProgress')}</option>
                <option value="unstarted">{t('intel.statusUnstarted')}</option>
                <option value="completed">{t('intel.statusCompleted')}</option>
              </select>
            </div>

            <div className="explorer-search-wrap" style={{ width: '100%' }}>
              <Search size={12} className="explorer-search-icon dim" />
              <input
                type="text"
                className="gw2-input explorer-search-input"
                placeholder={lang === 'en' ? 'Search...' : 'Suchen ...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: 11, padding: '4px 22px 4px 24px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="explorer-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Categories Navigation Tree */}
          <div className="gw2-hero-sidebar-tree">
            <div className="tree-section-header font-serif">
              {t('intel.categories')}
            </div>

            {/* Special Nav: Zusammenfassung (Summary) */}
            <div
              className={`tree-nav-item font-serif ${activeTab === 'summary' && !selectedCategoryId && !isSearching ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('summary');
                setSelectedCategoryId(0);
                setSearchQuery('');
              }}
            >
              <div className="flex items-center gap-2">
                <Layers size={13} className="gold" />
                <span>{t('intel.tabSummary')}</span>
              </div>
            </div>

            {/* Special Nav: Beobachtungsliste (Watchlist) */}
            <div
              className={`tree-nav-item font-serif ${activeTab === 'watchlist' && !selectedCategoryId && !isSearching ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('watchlist');
                setSelectedCategoryId(0);
                setSearchQuery('');
              }}
            >
              <div className="flex items-center gap-2">
                <Star size={13} className={watchlist.length > 0 ? 'gold' : ''} fill={watchlist.length > 0 ? '#d2b268' : 'none'} />
                <span>{t('intel.tabWatchlist')}</span>
              </div>
              <span className="tree-count-pill font-mono">{watchlist.length}</span>
            </div>

            {/* Special Nav: Empfohlene Erfolge (Recommendations) */}
            <div
              className={`tree-nav-item font-serif ${activeTab === 'intelligence' && !selectedCategoryId && !isSearching ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('intelligence');
                setSelectedCategoryId(0);
                setSearchQuery('');
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-amber-300" />
                <span>{t('intel.aiRecommendations')}</span>
              </div>
              <span className="tree-count-pill font-mono text-amber-300" title={t('intel.tabBestNext')}>★</span>
            </div>

            {/* Special Nav: Täglich & Gewölbe (Daily & Vault) */}
            <div
              className={`tree-nav-item font-serif ${activeTab === 'daily' && !selectedCategoryId && !isSearching ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('daily');
                setSelectedCategoryId(0);
                setSearchQuery('');
              }}
            >
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-emerald-400" />
                <span>{t('intel.tabDaily')}</span>
              </div>
            </div>

            {/* In-Game Groups Accordion (19 Official Groups) */}
            <div style={{ marginTop: 6 }}>
              {groups.map((group) => {
                const isExpanded = expandedGroupIds.has(group.id);
                const grpStat = groupStatsMap.get(group.id);
                const groupCats = categories.filter((c) => c.groupId === group.id);

                return (
                  <div key={group.id} className="tree-group-container">
                    <div
                      className={`tree-group-row ${selectedGroup === group.id && selectedCategoryId === 0 ? 'active' : ''}`}
                      onClick={() => {
                        toggleGroup(group.id);
                        setSelectedGroup(group.id);
                        if (groupCats.length > 0 && (!selectedCategoryId || !groupCats.some((c) => c.id === selectedCategoryId))) {
                          setSelectedCategoryId(groupCats[0].id);
                          setActiveTab('category');
                          setSearchQuery('');
                        }
                      }}
                    >
                      <div className="tree-group-header-inner">
                        <ChevronRight
                          size={12}
                          className={`tree-group-arrow ${isExpanded ? 'expanded' : ''}`}
                        />
                        <span className="tree-group-name">
                          {lang === 'en' ? group.nameEn : group.name}
                        </span>
                      </div>
                      {grpStat && (
                        <span className="tree-count-pill font-mono">
                          {grpStat.completed}/{grpStat.total}
                        </span>
                      )}
                    </div>

                    {/* Expanded Categories of this Group */}
                    {isExpanded && (
                      <div className="tree-cats-list">
                        {groupCats.map((cat) => {
                          const catStat = categoryStatsMap.get(cat.id);
                          const isCatActive = activeTab === 'category' && selectedCategoryId === cat.id;
                          const allDone = catStat && catStat.total > 0 && catStat.completed === catStat.total;

                          return (
                            <div
                              key={cat.id}
                              className={`tree-cat-row ${isCatActive ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                setSelectedGroup(group.id);
                                setActiveTab('category');
                                setSearchQuery('');
                              }}
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                {cat.icon ? (
                                  <img
                                    src={cat.icon}
                                    alt=""
                                    className="tree-cat-icon"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <Layers size={13} className="tree-cat-icon dim" />
                                )}
                                <span className="truncate">
                                  {lang === 'en' ? cat.nameEn : cat.name}
                                </span>
                              </div>
                              {catStat && (
                                <span className={`tree-count-pill ${allDone ? 'all-done' : ''} font-mono`}>
                                  {catStat.completed}/{catStat.total}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer: Catalog Summary */}
          <div className="hero-sidebar-total-strip font-mono">
            <span>{groups.length} Gruppen • {categories.length} Kat.</span>
            <span className="gold font-bold">{allEnriched.length.toLocaleString()} Erfolge</span>
          </div>
        </aside>

        {/* ============================================================
            RIGHT MAIN CONTENT AREA
            ============================================================ */}
        <main className="gw2-hero-main-content">
          {/* A. SEARCH MODE (Active whenever text is typed in search) */}
          {isSearching ? (
            <div className="hero-content-pane">
              <div className="hero-main-header">
                <div className="hero-main-header-title">
                  <Search size={18} className="gold" />
                  <div className="hero-category-header-block">
                    <h3 className="hero-category-header-name">
                      {lang === 'en' ? `Search: "${searchQuery}"` : `Suche: "${searchQuery}"`}
                    </h3>
                    <span className="dim text-xs font-mono">
                      {categoryBrowserAchievements.length} {lang === 'en' ? 'results found' : 'Treffer gefunden'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="gw2-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label={t('intel.sortBy')}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    <option value="game-order">{t('intel.sortGameOrder')}</option>
                    <option value="progress-desc">{t('intel.sortProgressDesc')}</option>
                    <option value="ap-desc">{t('intel.sortApDesc')}</option>
                    <option value="ap-asc">{t('intel.sortApAsc')}</option>
                    <option value="name-asc">{t('intel.sortNameAsc')}</option>
                  </select>

                  <button
                    type="button"
                    className="gw2-btn-sm"
                    onClick={() => setSearchQuery('')}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                  >
                    <X size={11} className="inline mr-1" />
                    <span>{lang === 'en' ? 'Close Search' : 'Suche schließen'}</span>
                  </button>
                </div>
              </div>

              <div className="achieve-scroll-view">
                {categoryBrowserAchievements.length === 0 ? (
                  <div className="achieve-empty-state">
                    <Search size={28} className="dim mb-2" />
                    <p className="dim text-xs">{t('intel.emptyList')}</p>
                  </div>
                ) : (
                  <>
                    <div className="achieve-grid-cards">
                      {categoryBrowserAchievements.slice(0, displayLimit).map((ach) => renderAchievementCard(ach))}
                    </div>
                    {categoryBrowserAchievements.length > displayLimit && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          className="gw2-btn-sm font-serif"
                          onClick={() => setDisplayLimit((prev) => prev + 40)}
                        >
                          <span>{t('intel.showMore')} ({displayLimit} / {categoryBrowserAchievements.length})</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : activeTab === 'summary' ? (
            /* B. SUMMARY VIEW (ZUSAMMENFASSUNG) */
            <div className="hero-content-pane">
              <div className="achieve-scroll-view">
                <div className="achieve-view-stack">
                  {/* Top Milestone Reward Chests Bar */}
                  <div className="hero-milestones-container">
                    <div className="hero-milestones-header font-serif">
                      <div className="flex items-center gap-1.5">
                        <Gift size={13} className="gold" />
                        <span className="font-semibold text-[#f4e3a8]">{t('intel.milestoneTitle')}</span>
                      </div>
                      <span className="dim text-xs font-mono">
                        {t('intel.currentAccountAp')}: <strong className="gold">{apBreakdown.totalAp.toLocaleString()} AP</strong>
                      </span>
                    </div>
                    <div className="hero-milestones-track">
                      {apMilestones.map((m) => (
                        <div
                          key={m.ap}
                          className="hero-milestone-step"
                          title={m.isSpecial ? t('intel.milestoneOrnateChest', { ap: m.ap.toLocaleString() }) : t('intel.milestoneChest', { ap: m.ap.toLocaleString() })}
                        >
                          <div className={`milestone-chest-icon-box ${m.isSpecial ? 'is-special' : ''}`}>
                            {m.isSpecial ? (
                              <Crown size={22} className="text-sky-300" />
                            ) : (
                              <Gift size={20} className="text-amber-300" />
                            )}
                          </div>
                          <span className="milestone-ap-label font-mono">{m.ap.toLocaleString()}</span>
                          <span className="milestone-rem-label font-mono">
                            {t('intel.milestonePointsRemaining', { points: m.pointsRemaining.toLocaleString() })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Two-Column Layout: Recently Completed & Nearly Completed */}
                  <div className="hero-summary-grid">
                    {/* Left Column: Kürzlich abgeschlossen */}
                    <div className="hero-summary-column">
                      <div className="hero-column-header">
                        <span className="hero-column-title font-serif">
                          <CheckCircle2 size={14} className="good" />
                          <span>{t('intel.recentlyCompleted')}</span>
                        </span>
                        <span className="dim text-xs font-mono">({recentlyCompleted.length})</span>
                      </div>
                      {recentlyCompleted.length === 0 ? (
                        <div className="achieve-empty-state" style={{ padding: '16px 8px' }}>
                          <p className="dim text-xs">
                            {lang === 'en'
                              ? 'No completed achievements recorded yet.'
                              : 'Noch keine abgeschlossenen Erfolge erfasst.'}
                          </p>
                        </div>
                      ) : (
                        recentlyCompleted.map(renderRecentlyCompletedRow)
                      )}
                    </div>

                    {/* Right Column: Fast abgeschlossen */}
                    <div className="hero-summary-column">
                      <div className="hero-column-header">
                        <span className="hero-column-title font-serif">
                          <Target size={14} className="text-emerald-400" />
                          <span>{t('intel.nearlyCompleted')}</span>
                        </span>
                        <span className="dim text-xs font-mono">({nearlyCompleted.length})</span>
                      </div>
                      {nearlyCompleted.length === 0 ? (
                        <div className="achieve-empty-state" style={{ padding: '16px 8px' }}>
                          <p className="dim text-xs">
                            {lang === 'en'
                              ? 'No partially completed achievements found.'
                              : 'Keine fast fertigen Erfolge gefunden.'}
                          </p>
                        </div>
                      ) : (
                        nearlyCompleted.map(renderNearlyCompletedRow)
                      )}
                    </div>
                  </div>

                  {/* Bottom Bonuses & Catalog Strip */}
                  <div className="hero-bonuses-strip">
                    <div>
                      <h4 className="font-serif font-bold text-xs text-[#f4e3a8] mb-2">
                        {t('intel.accountBonuses')}
                      </h4>
                      <div className="bonus-metrics-grid font-mono">
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Gold Find' : 'Goldgespür'}:</span>
                          <span className="bonus-metric-val">+1%</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Karma Gain' : 'Karmazuwachs'}:</span>
                          <span className="bonus-metric-val">+1%</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Magic Find' : 'Magisches Gespür'}:</span>
                          <span className="bonus-metric-val">+78%</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Daily/Monthly AP' : 'Täglich/Monatlich'}:</span>
                          <span className="bonus-metric-val">{apBreakdown.dailyMonthlyCombined.toLocaleString()} / 15.000</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold text-xs text-[#f4e3a8] mb-2">
                        {lang === 'en' ? 'Catalog Overview:' : 'Katalog-Übersicht:'}
                      </h4>
                      <div className="bonus-metrics-grid font-mono">
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Total Indexed' : 'Gesamt indexiert'}:</span>
                          <span className="bonus-metric-val">{allEnriched.length.toLocaleString()}</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Categories' : 'Kategorien'}:</span>
                          <span className="bonus-metric-val">{categories.length}</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Groups' : 'Gruppen'}:</span>
                          <span className="bonus-metric-val">{groups.length}</span>
                        </div>
                        <div className="bonus-metric-item">
                          <span className="bonus-metric-label">{lang === 'en' ? 'Potential AP' : 'Erzielbare AP'}:</span>
                          <span className="bonus-metric-val text-amber-300">+{totalObtainableAp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'category' && activeCategory ? (
            /* C. CATEGORY VIEW (Authentic In-Game Category & Order) */
            <div className="hero-content-pane">
              <div className="hero-main-header">
                <div className="hero-main-header-title">
                  <AchievementIcon
                    icon={activeCategory.icon}
                    groupId={activeCategory.groupId}
                    categoryName={activeCategory.name}
                    size={36}
                    className="hero-main-header-icon"
                  />
                  <div className="hero-category-header-block">
                    <div className="flex items-center gap-2">
                      <h3 className="hero-category-header-name">
                        {lang === 'en' ? activeCategory.nameEn : activeCategory.name}
                      </h3>
                      {categoryStatsMap.get(activeCategory.id) && (
                        <span className="dim text-xs font-mono">
                          ({categoryStatsMap.get(activeCategory.id)!.completed}/{categoryStatsMap.get(activeCategory.id)!.total} {lang === 'en' ? 'Done' : 'Erledigt'})
                        </span>
                      )}
                    </div>
                    {activeCategory.description && (
                      <p className="hero-category-header-desc">
                        {lang === 'en' ? (activeCategory.descriptionEn || activeCategory.description) : activeCategory.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="gw2-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label={t('intel.sortBy')}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    <option value="game-order">{t('intel.sortGameOrder')}</option>
                    <option value="progress-desc">{t('intel.sortProgressDesc')}</option>
                    <option value="ap-desc">{t('intel.sortApDesc')}</option>
                    <option value="ap-asc">{t('intel.sortApAsc')}</option>
                    <option value="name-asc">{t('intel.sortNameAsc')}</option>
                  </select>
                </div>
              </div>

              {/* Category Achievements List */}
              <div className="achieve-scroll-view">
                {categoryBrowserAchievements.length === 0 ? (
                  <div className="achieve-empty-state">
                    <Search size={28} className="dim mb-2" />
                    <p className="dim text-xs">{t('intel.emptyList')}</p>
                    <button
                      type="button"
                      className="gw2-btn-sm mt-2 font-serif"
                      onClick={() => setStatusFilter('all')}
                    >
                      {t('common.resetFilters')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="achieve-grid-cards">
                      {categoryBrowserAchievements.slice(0, displayLimit).map((ach) => renderAchievementCard(ach))}
                    </div>
                    {categoryBrowserAchievements.length > displayLimit && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          className="gw2-btn-sm font-serif"
                          onClick={() => setDisplayLimit((prev) => prev + 40)}
                        >
                          <span>{t('intel.showMore')} ({displayLimit} / {categoryBrowserAchievements.length})</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : activeTab === 'intelligence' ? (
            /* D. INTELLIGENCE VIEW (Sub-nav for AI Strategies) */
            <div className="hero-content-pane">
              <div className="hero-intel-subnav">
                <button
                  type="button"
                  className={`hero-intel-subnav-btn ${intelligenceSubtab === 'bestNext' ? 'active' : ''}`}
                  onClick={() => setIntelligenceSubtab('bestNext')}
                >
                  <Sparkles size={12} className="gold" />
                  <span>{t('intel.tabBestNext')}</span>
                </button>
                <button
                  type="button"
                  className={`hero-intel-subnav-btn ${intelligenceSubtab === 'efficiency' ? 'active' : ''}`}
                  onClick={() => setIntelligenceSubtab('efficiency')}
                >
                  <Zap size={12} className="text-amber-300" />
                  <span>{t('intel.tabEfficiency')}</span>
                </button>
                <button
                  type="button"
                  className={`hero-intel-subnav-btn ${intelligenceSubtab === 'quickWins' ? 'active' : ''}`}
                  onClick={() => setIntelligenceSubtab('quickWins')}
                >
                  <Target size={12} className="text-emerald-400" />
                  <span>{t('intel.tabQuickWins')}</span>
                </button>
                <button
                  type="button"
                  className={`hero-intel-subnav-btn ${intelligenceSubtab === 'highestReward' ? 'active' : ''}`}
                  onClick={() => setIntelligenceSubtab('highestReward')}
                >
                  <Trophy size={12} className="gold" />
                  <span>{t('intel.tabHighestReward')}</span>
                </button>
                <button
                  type="button"
                  className={`hero-intel-subnav-btn ${intelligenceSubtab === 'continueProgress' ? 'active' : ''}`}
                  onClick={() => setIntelligenceSubtab('continueProgress')}
                >
                  <TrendingUp size={12} className="text-sky-400" />
                  <span>{t('intel.tabContinueProgress')}</span>
                </button>
              </div>

              <div className="achieve-scroll-view">
                {intelligenceSubtab === 'bestNext' && (
                  <div className="achieve-view-stack">
                    {featuredBestNext && (
                      <div className="achieve-hero-card">
                        <div className="hero-top-badge font-serif">
                          <Sparkles size={13} className="gold" />
                          <span>{t('intel.heroBadge')}</span>
                        </div>
                        <div className="hero-card-inner">
                          <div className="hero-icon-block">
                            <AchievementIcon
                              icon={featuredBestNext.achievement.definition.icon}
                              groupId={featuredBestNext.achievement.definition.groupId}
                              categoryName={featuredBestNext.achievement.definition.categoryName}
                              size={52}
                              className="hero-ach-icon"
                            />
                          </div>
                          <div className="hero-details-block">
                            <div className="hero-title-row">
                              <div className="hero-title-group">
                                <span className="hero-category-tag font-serif">
                                  {lang === 'en'
                                    ? featuredBestNext.achievement.definition.categoryNameEn
                                    : featuredBestNext.achievement.definition.categoryName}
                                </span>
                                <h3 className="hero-ach-name font-serif">
                                  {lang === 'en'
                                    ? featuredBestNext.achievement.definition.nameEn
                                    : featuredBestNext.achievement.definition.name}
                                </h3>
                              </div>
                              <div className="hero-reward-pill font-mono">
                                <Trophy size={14} className="gold" />
                                <span className="hero-ap-val gold font-bold">
                                  +{featuredBestNext.achievement.obtainableAp} AP
                                </span>
                              </div>
                            </div>
                            <p className="hero-desc">
                              {stripGw2Tags(lang === 'en'
                                ? (featuredBestNext.achievement.definition.requirementEn || featuredBestNext.achievement.definition.descriptionEn)
                                : (featuredBestNext.achievement.definition.requirement || featuredBestNext.achievement.definition.description))}
                            </p>
                            <div className="hero-explain-box">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                                <Info size={12} />
                                <span>{t('intel.whyRecommended')}</span>
                              </div>
                              <p className="text-xs text-[#f4eedb] mt-0.5">
                                {lang === 'en' ? featuredBestNext.reasonEn : featuredBestNext.reasonDe}
                              </p>
                            </div>
                            <div className="hero-progress-section">
                              <div className="flex justify-between text-xs font-mono mb-1">
                                <span className="dim">
                                  {t('intel.progressRemaining', { count: featuredBestNext.achievement.remainingCount })}
                                </span>
                                <span className="gold font-semibold">
                                  {featuredBestNext.achievement.currentProgress} / {featuredBestNext.achievement.maxProgress} (
                                  {Math.round(featuredBestNext.achievement.progressFraction * 100)}%)
                                </span>
                              </div>
                              <ProgressBar
                                value={featuredBestNext.achievement.progressFraction}
                                tone={featuredBestNext.achievement.progressFraction >= 0.75 ? 'gold' : 'green'}
                              />
                            </div>
                            <div className="hero-action-buttons">
                              <button
                                type="button"
                                className={`gw2-btn-sm ${watchlist.includes(featuredBestNext.achievement.definition.id) ? 'active' : ''}`}
                                onClick={() => toggleWatchlist(featuredBestNext.achievement.definition.id)}
                              >
                                <Star size={12} className={watchlist.includes(featuredBestNext.achievement.definition.id) ? 'gold' : ''} fill={watchlist.includes(featuredBestNext.achievement.definition.id) ? '#d2b268' : 'none'} />
                                <span>{t('intel.tabWatchlist')}</span>
                              </button>
                              {(featuredBestNext.achievement.definition.waypoint || featuredBestNext.achievement.definition.eventId) && (
                                <button
                                  type="button"
                                  className="gw2-btn-sm"
                                  onClick={() => handleCopyWaypoint(featuredBestNext.achievement)}
                                >
                                  {copiedWaypointId === featuredBestNext.achievement.definition.id ? (
                                    <Check size={12} className="good" />
                                  ) : (
                                    <Compass size={12} />
                                  )}
                                  <span>
                                    {copiedWaypointId === featuredBestNext.achievement.definition.id
                                      ? t('intel.waypointCopied')
                                      : t('intel.fastTravel')}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="achieve-grid-cards">
                      {bestNextRecs.slice(1).map((rec) => renderAchievementCard(rec.achievement, rec))}
                    </div>
                  </div>
                )}

                {intelligenceSubtab === 'efficiency' && (
                  <div className="achieve-view-stack">
                    <div className="strategy-banner font-serif">
                      <Zap size={14} className="text-amber-300" />
                      <span>
                        {lang === 'en'
                          ? 'Ranked strictly by estimated achievement-point-to-effort ratio (AP per remaining objective).'
                          : 'Priorisiert nach dem günstigsten Verhältnis aus erreichbaren Erfolgspunkten zu Restaufwand.'}
                      </span>
                    </div>
                    <div className="achieve-grid-cards">
                      {efficiencyRecs.map((rec) => renderAchievementCard(rec.achievement, rec))}
                    </div>
                  </div>
                )}

                {intelligenceSubtab === 'quickWins' && (
                  <div className="achieve-view-stack">
                    <div className="strategy-banner font-serif">
                      <Target size={14} className="text-emerald-400" />
                      <span>
                        {lang === 'en'
                          ? 'Prioritizes achievements closest to completion requiring the fewest remaining objectives.'
                          : 'Priorisiert Erfolge kurz vor dem Abschluss mit den geringsten verbleibenden Teilzielen.'}
                      </span>
                    </div>
                    <div className="achieve-grid-cards">
                      {quickWinsRecs.map((rec) => renderAchievementCard(rec.achievement, rec))}
                    </div>
                  </div>
                )}

                {intelligenceSubtab === 'highestReward' && (
                  <div className="achieve-view-stack">
                    <div className="strategy-banner font-serif">
                      <Trophy size={14} className="gold" />
                      <span>
                        {lang === 'en'
                          ? 'Ranked by total remaining obtainable achievement points.'
                          : 'Geordnet nach maximal erzielbaren Rest-Erfolgspunkten.'}
                      </span>
                    </div>
                    <div className="achieve-grid-cards">
                      {highestRewardRecs.map((rec) => renderAchievementCard(rec.achievement, rec))}
                    </div>
                  </div>
                )}

                {intelligenceSubtab === 'continueProgress' && (
                  <div className="achieve-view-stack">
                    <div className="strategy-banner font-serif">
                      <TrendingUp size={14} className="text-sky-400" />
                      <span>
                        {lang === 'en'
                          ? 'Highlights your partially completed achievements with active progress.'
                          : 'Hebt angefangene Erfolge mit aktivem Fortschritt hervor.'}
                      </span>
                    </div>
                    <div className="achieve-grid-cards">
                      {continueProgressRecs.map((rec) => renderAchievementCard(rec.achievement, rec))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'watchlist' ? (
            /* E. WATCHLIST VIEW */
            <div className="hero-content-pane">
              <div className="achieve-scroll-view">
                <div className="achieve-view-stack">
                  <div className="strategy-banner font-serif">
                    <Star size={14} className="gold" fill="#d2b268" />
                    <span>
                      {lang === 'en'
                        ? `Pinned Achievements Watchlist (${watchlistAchievements.length})`
                        : `Beobachtungsliste angepinnter Erfolge (${watchlistAchievements.length})`}
                    </span>
                  </div>
                  {watchlistAchievements.length === 0 ? (
                    <div className="achieve-empty-state">
                      <Star size={28} className="gold mb-2" fill="#d2b268" />
                      <p className="dim text-xs">{t('intel.emptyWatchlist')}</p>
                    </div>
                  ) : (
                    <div className="achieve-grid-cards">
                      {watchlistAchievements.map((ach) => renderAchievementCard(ach))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* F. DAILY & WIZARD'S VAULT VIEW */
            <div className="hero-content-pane">
              <div className="achieve-scroll-view">
                <div className="gw2-daily-dashboard">
                  {dailyProgression?.wizardsVault && (
                    <div className="daily-section-card">
                      <div className="daily-section-header">
                        <Flame size={14} className="gold" />
                        <span className="font-serif font-bold text-sm text-[#f4e3a8]">
                          {t('common.wizardsVaultDaily')} ({dailyProgression.wizardsVault.meta_progress_current} / {dailyProgression.wizardsVault.meta_progress_complete})
                        </span>
                      </div>
                      <div className="vault-objectives-grid">
                        {dailyProgression.wizardsVault.objectives.map((obj) => (
                          <div key={obj.id} className="vault-obj-card">
                            <div className="flex items-center justify-between text-xs font-serif">
                              <span className="font-semibold text-[#f3efe6]">{obj.title}</span>
                              <span className="vault-track-pill">{obj.track}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-xs font-mono">
                              <span className="dim">
                                {obj.progress_current} / {obj.progress_complete}
                              </span>
                              <span className="gold font-bold">+{obj.acclaim} Astral</span>
                            </div>
                            <ProgressBar value={obj.progress_current / Math.max(1, obj.progress_complete)} tone={obj.claimed ? 'gold' : 'green'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="daily-section-card">
                    <div className="daily-section-header">
                      <Award size={14} className="gold" />
                      <span className="font-serif font-bold text-sm text-[#f4e3a8]">
                        {lang === 'en' ? "Today's Core World Boss Clears" : 'Heutige Weltenboss-Abschlüsse'} ({dailyProgression?.worldBosses.length || 0} / {CORE_WORLD_BOSSES.length})
                      </span>
                    </div>
                    <div className="worldboss-clears-grid">
                      {CORE_WORLD_BOSSES.map((boss) => {
                        const isKilled = Boolean(dailyProgression?.worldBosses.includes(boss.apiId));
                        return (
                          <div key={boss.id} className={`daily-boss-pill ${isKilled ? 'completed' : ''}`}>
                            {isKilled ? (
                              <CheckCircle2 size={13} className="good shrink-0" />
                            ) : (
                              <Circle size={13} className="dim shrink-0" />
                            )}
                            <span className="font-serif text-xs truncate">
                              {lang === 'en' ? boss.nameEn : boss.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="daily-section-card">
                    <div className="daily-section-header">
                      <Gift size={14} className="gold" />
                      <span className="font-serif font-bold text-sm text-[#f4e3a8]">
                        {lang === 'en' ? "Today's Hero's Choice Chests" : 'Heutige Helden-Truhen'} ({dailyProgression?.mapChests.length || 0} / {MAP_HERO_CHESTS.length})
                      </span>
                    </div>
                    <div className="worldboss-clears-grid">
                      {MAP_HERO_CHESTS.map((chest) => {
                        const isOpened = Boolean(dailyProgression?.mapChests.includes(chest.apiId));
                        return (
                          <div key={chest.id} className={`daily-boss-pill ${isOpened ? 'completed' : ''}`}>
                            {isOpened ? (
                              <CheckCircle2 size={13} className="good shrink-0" />
                            ) : (
                              <Circle size={13} className="dim shrink-0" />
                            )}
                            <span className="font-serif text-xs truncate">
                              {lang === 'en' ? chest.nameEn : chest.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. Bottom Dock: Account Verification & Fast Switch to Events */}
      <div className="achieve-bottom-dock">
        {accountInfo ? (
          <div className="dock-account-summary font-mono">
            <span className="dock-label dim">GW2-API:</span>
            <span className="dock-val gold">{accountInfo.name}</span>
            <span className="dock-pill text-amber-300 font-bold">
              ⭐ {apBreakdown.totalAp.toLocaleString()} AP {lang === 'en' ? 'Account Total' : 'Gesamt'}
            </span>
            {accountInfo.fractal_level !== undefined && (
              <span className="dock-pill">
                {lang === 'en' ? `Fractal ${accountInfo.fractal_level}` : `Fraktal ${accountInfo.fractal_level}`}
              </span>
            )}
            <span className="dock-pill text-emerald-400">
              {totalCompletedCount} {lang === 'en' ? 'Completed' : 'Erledigt'}
            </span>
            <span className="dock-hint dim">API Synchronized</span>
          </div>
        ) : (
          <div className="dock-connect-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="hint-text dim">
              {t('intel.unauthenticatedNotice')}
            </span>
            {onOpenSettings && (
              <button
                type="button"
                className="gw2-btn-gold sm"
                onClick={onOpenSettings}
                style={{ padding: '2px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Key size={10} aria-hidden="true" />
                <span>{t('intel.connectKeyBtn')}</span>
              </button>
            )}
          </div>
        )}

        <button type="button" className="gw2-text-btn dock-back-btn" onClick={onSwitchToEvents}>
          <span>{t('achievements.backToEvents')}</span>
          <Compass size={11} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  /**
   * Helper to render a Recently Completed card row matching the Hero panel
   */
  function renderRecentlyCompletedRow(ach: EnrichedAchievement) {
    const desc = stripGw2Tags(
      lang === 'en'
        ? (ach.definition.requirementEn || ach.definition.requirement || ach.definition.descriptionEn || ach.definition.description)
        : (ach.definition.requirement || ach.definition.description),
    );

    return (
      <div key={ach.definition.id} className="hero-summary-card-row">
        <div className="summary-card-icon-wrap">
          <AchievementIcon
            icon={ach.definition.icon}
            groupId={ach.definition.groupId}
            categoryName={ach.definition.categoryName}
            size={40}
          />
        </div>
        <div className="summary-card-details">
          <span className="summary-card-title">
            {lang === 'en' ? ach.definition.nameEn : ach.definition.name}
          </span>
          {desc && <p className="summary-card-desc">{desc}</p>}
          <span className="summary-card-cat">
            {lang === 'en' ? ach.definition.categoryNameEn : ach.definition.categoryName}
          </span>
        </div>
        <div className="summary-card-ap-pill font-mono">
          <Trophy size={11} className="gold" />
          <span>+{ach.totalRewardAp || 1} AP</span>
        </div>
      </div>
    );
  }

  /**
   * Helper to render a Nearly Completed card row matching the Hero panel
   */
  function renderNearlyCompletedRow(ach: EnrichedAchievement) {
    const desc = stripGw2Tags(
      lang === 'en'
        ? (ach.definition.requirementEn || ach.definition.requirement || ach.definition.descriptionEn || ach.definition.description)
        : (ach.definition.requirement || ach.definition.description),
    );

    return (
      <div key={ach.definition.id} className="hero-summary-card-row">
        <div className="summary-card-icon-wrap">
          <AchievementIcon
            icon={ach.definition.icon}
            groupId={ach.definition.groupId}
            categoryName={ach.definition.categoryName}
            size={40}
          />
        </div>
        <div className="summary-card-details">
          <div className="flex items-center justify-between">
            <span className="summary-card-title">
              {lang === 'en' ? ach.definition.nameEn : ach.definition.name}
            </span>
            <span className="summary-card-progress-stat font-mono">
              {ach.currentProgress}/{ach.maxProgress}
            </span>
          </div>
          {desc && <p className="summary-card-desc">{desc}</p>}
          <div style={{ marginTop: 4 }}>
            <ProgressBar
              value={ach.progressFraction}
              tone={ach.progressFraction >= 0.8 ? 'gold' : 'green'}
            />
          </div>
        </div>
      </div>
    );
  }

  /**
   * Universal card renderer for enriched achievements
   */
  function renderAchievementCard(ach: EnrichedAchievement, rec?: AchievementRecommendation) {
    const isWatched = watchlist.includes(ach.definition.id);
    const isExpanded = expandedId === ach.definition.id;
    const isDone = ach.isDone;
    const isInProgress = !isDone && ach.progressStatus === 'in_progress';
    const isRank1 = rec?.rank === 1;

    const primaryText = lang === 'en'
      ? (ach.definition.requirementEn || ach.definition.requirement || ach.definition.descriptionEn || ach.definition.description)
      : (ach.definition.requirement || ach.definition.description);

    const secondaryText = lang === 'en'
      ? (ach.definition.descriptionEn || ach.definition.description)
      : ach.definition.description;

    let podiumClass = '';
    let podiumPrefix = '';
    if (rec) {
      if (rec.rank === 1) {
        podiumClass = 'rank-podium-1';
        podiumPrefix = '👑 ';
      } else if (rec.rank === 2) {
        podiumClass = 'rank-podium-2';
        podiumPrefix = '🥈 ';
      } else if (rec.rank === 3) {
        podiumClass = 'rank-podium-3';
        podiumPrefix = '🥉 ';
      }
    }

    return (
      <div
        key={ach.definition.id}
        className={`achieve-card gw2-achieve-card ${isDone ? 'card-completed' : isInProgress ? 'card-in-progress' : ''} ${isRank1 ? 'card-rank-1' : ''} ${isWatched ? 'card-watched' : ''}`}
      >
        <div className="card-main-body">
          {/* Header Row: Icon, Title, Status & Rank badges, AP callout */}
          <div className="card-top-row">
            <div className="card-header-with-icon">
              <AchievementIcon
                icon={ach.definition.icon}
                groupId={ach.definition.groupId}
                categoryName={ach.definition.categoryName}
                size={38}
              />
              <div className="card-title-group">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="achieve-category-pill">
                    {lang === 'en' ? ach.definition.categoryNameEn : ach.definition.categoryName}
                  </span>

                  {isDone ? (
                    <span className="achieve-status-badge status-done">
                      ✓ {lang === 'en' ? 'Completed' : 'Erledigt'}
                    </span>
                  ) : isInProgress ? (
                    <span className="achieve-status-badge status-progress">
                      ⏳ {lang === 'en' ? 'In Progress' : 'In Arbeit'}
                    </span>
                  ) : (
                    <span className="achieve-status-badge status-unstarted">
                      ○ {lang === 'en' ? 'Unstarted' : 'Noch offen'}
                    </span>
                  )}

                  {rec && (
                    <span className={`achieve-rank-pill ${podiumClass} font-mono`}>
                      {podiumPrefix}#{rec.rank}
                    </span>
                  )}

                  {ach.isRepeatable && (
                    <span className="achieve-repeat-pill font-mono">
                      {ach.pointCap ? `Repeatable (Cap ${ach.pointCap} AP)` : 'Repeatable'}
                    </span>
                  )}
                </div>

                <h4 className="achieve-card-title font-serif">
                  {lang === 'en' ? ach.definition.nameEn : ach.definition.name}
                </h4>
              </div>
            </div>

            <div className="card-top-actions">
              <div className="achieve-ap-badge font-mono font-bold" title={t('intel.obtainableAp', { obtainable: ach.obtainableAp, total: ach.totalRewardAp })}>
                <Trophy size={12} className="gold" />
                <span className="ap-val gold">
                  {isDone ? `${ach.totalRewardAp} AP` : `+${ach.obtainableAp} AP`}
                </span>
              </div>

              <button
                type="button"
                className={`btn-star-watch ${isWatched ? 'active' : ''}`}
                onClick={() => toggleWatchlist(ach.definition.id)}
                title="Watchlist"
                aria-label="Watchlist"
              >
                <Star size={13} fill={isWatched ? '#d2b268' : 'none'} />
              </button>
            </div>
          </div>

          {/* Task Requirement / Instruction & Story Lore */}
          <div style={{ margin: '4px 0' }}>
            {primaryText && (
              <p className="card-desc font-serif" style={{ margin: 0, color: '#e5e0d4', lineHeight: 1.4 }}>
                {stripGw2Tags(primaryText)}
              </p>
            )}
            {secondaryText && secondaryText !== primaryText && (
              <p className="card-desc-lore dim text-xs italic mt-1" style={{ margin: '3px 0 0 0', color: '#9ca3af' }}>
                {stripGw2Tags(secondaryText)}
              </p>
            )}
          </div>

          {/* Explainable Recommendation Reason (if recommendation) */}
          {rec && (
            <div className="card-recommendation-note font-serif">
              <span className="rec-bullet font-mono">▸</span>
              <span>{lang === 'en' ? rec.reasonEn : rec.reasonDe}</span>
            </div>
          )}

          {/* Progress Bar & Measured Objectives */}
          <div className="card-progress-wrap font-mono">
            <div className="flex justify-between items-center text-xs mb-1" style={{ width: '100%' }}>
              <span className="dim">
                {isDone
                  ? (lang === 'en' ? 'Completed' : 'Erledigt')
                  : t('intel.progressRemaining', { count: ach.remainingCount })}
              </span>
              <span className={isDone ? 'good font-bold' : 'gold'}>
                {ach.currentProgress} / {ach.maxProgress} ({Math.round(ach.progressFraction * 100)}%)
              </span>
            </div>
            <ProgressBar value={ach.progressFraction} tone={isDone ? 'gold' : 'green'} />
          </div>

          {/* Card Footer: Expand Objectives / Fast Travel Waypoint */}
          <div className="card-bottom-actions">
            {isDone ? (
              <span className="text-xs good flex items-center gap-1 font-sans" style={{ padding: '4px 0' }}>
                <CheckCircle2 size={13} />
                <span>{lang === 'en' ? 'Achievement Completed' : 'Erfolg abgeschlossen'}</span>
              </span>
            ) : ach.remainingObjectives.length > 0 ? (
              <button
                type="button"
                className="btn-expand-objs"
                onClick={() => setExpandedId(isExpanded ? null : ach.definition.id)}
              >
                <span>{isExpanded ? (lang === 'en' ? 'Hide Details' : 'Details einklappen') : (lang === 'en' ? `Show Objectives (${ach.remainingObjectives.length})` : `Ziele anzeigen (${ach.remainingObjectives.length})`)}</span>
                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            ) : null}

            {(ach.definition.waypoint || ach.definition.eventId) && (
              <button
                type="button"
                className="btn-card-waypoint"
                onClick={() => handleCopyWaypoint(ach)}
                title={t('intel.fastTravel')}
              >
                {copiedWaypointId === ach.definition.id ? (
                  <Check size={11} className="good" />
                ) : (
                  <Compass size={11} />
                )}
                <span>
                  {copiedWaypointId === ach.definition.id ? t('intel.waypointCopied') : t('intel.fastTravel')}
                </span>
              </button>
            )}
          </div>

          {/* Expanded Objectives Drawer */}
          {isExpanded && ach.remainingObjectives.length > 0 && (
            <div className="card-expanded-drawer">
              <span className="drawer-title font-serif">
                {t('intel.remainingObjectivesTitle', { count: ach.remainingObjectives.length })}
              </span>
              <ul className="drawer-objs-list">
                {(lang === 'en' ? ach.remainingObjectivesEn : ach.remainingObjectives).map((objText, idx) => (
                  <li key={idx} className="drawer-obj-item">
                    <Circle size={9} className="dim shrink-0 mt-0.5" />
                    <span>{stripGw2Tags(objText)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
});
