import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Search,
  Trophy,
  Compass,
  MessageSquare,
  Star,
  X,
  Flame,
  Sparkles,
  Clock,
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
  AlertTriangle,
  Lock,
  Unlock,
  ExternalLink,
  Skull,
  Swords,
  Crown,
} from 'lucide-react';
import type { EventInstance } from '../types';
import type { Gw2AccountInfo, Gw2AccountAchievement, Gw2DailyProgression } from '../data/gw2Api';
import { ProgressBar } from './common/ui';
import { formatCountdown, getEventZone } from '../data/events';
import { useTranslation } from '../i18n';
import {
  EnrichedAchievement,
  RecommendationStrategy,
  AchievementRecommendation,
  generateRecommendations,
  filterAndSortAchievements,
  AchievementFilterOptions,
  calculateAccountTotalAp,
  AccountApBreakdown,
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
  | 'bestNext'
  | 'efficiency'
  | 'quickWins'
  | 'highestReward'
  | 'continueProgress'
  | 'categories'
  | 'watchlist'
  | 'daily';

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
  { id: 'karka-queen', apiId: 'karka_queen', name: 'Karka-Königin', nameEn: 'Karka Queen', waypoint: '[&BNUGAAA=]', zone: 'Südlicht-Bucht', zoneEn: 'Southsun Cove' },
  { id: 'taidha-covington', apiId: 'admiral_taidha_covington', name: 'Admiralin Taidha Covington', nameEn: 'Admiral Taidha Covington', waypoint: '[&BKgBAAA=]', zone: 'Blutstrom-Küste', zoneEn: 'Bloodtide Coast' },
  { id: 'modniir-ulgoth', apiId: 'modniir_ulgoth', name: 'Ulgoth der Modniir', nameEn: 'Modniir Ulgoth', waypoint: '[&BLAAAAA=]', zone: 'Harathi-Hinterland', zoneEn: 'Harathi Hinterlands' },
];

const MAP_HERO_CHESTS = [
  { id: 'tarir-octovine', apiId: 'auric_basin_heros_choice_chest', name: 'Tarir (Güldener Kessel)', nameEn: 'Tarir (Auric Basin)', waypoint: '[&BAIIAAA=]', zone: 'Güldener Kessel', zoneEn: 'Auric Basin' },
  { id: 'chak-gerent', apiId: 'tangled_depths_heros_choice_chest', name: 'Chak-Gerent (Verschlungene Tiefen)', nameEn: 'Chak Gerent (Tangled Depths)', waypoint: '[&BPUHAAA=]', zone: 'Verschlungene Tiefen', zoneEn: 'Tangled Depths' },
  { id: 'verdant-brink-night', apiId: 'verdant_brink_heros_choice_chest', name: 'Grasgrüne Klippen (Nacht-Meta)', nameEn: 'Verdant Brink (Night Bosses)', waypoint: '[&BAgIAAA=]', zone: 'Grasgrüne Klippen', zoneEn: 'Verdant Brink' },
  { id: 'dragons-stand', apiId: 'dragons_stand_heros_choice_chest', name: 'Widerstand des Drachen', nameEn: "Dragon's Stand (Mouth of Mordremoth)", waypoint: '[&BBAIAAA=]', zone: 'Widerstand des Drachen', zoneEn: "Dragon's Stand" },
  { id: 'choya-pinata', apiId: 'crystal_oasis_heros_choice_chest', name: 'Choya-Piñata (Kristalloase)', nameEn: 'Choya Piñata (Crystal Oasis)', waypoint: '[&BLsKAAA=]', zone: 'Kristalloase', zoneEn: 'Crystal Oasis' },
  { id: 'maws-of-torment', apiId: 'the_desolation_heros_choice_chest', name: 'Schlund der Qualen (Ödland)', nameEn: 'Maws of Torment (The Desolation)', waypoint: '[&BKMKAAA=]', zone: 'Das Ödland', zoneEn: 'The Desolation' },
  { id: 'serpents-ire', apiId: 'domain_of_vabbi_heros_choice_chest', name: 'Zorn der Schlange (Vabbi)', nameEn: "Serpent's Ire (Domain of Vabbi)", waypoint: '[&BO0KAAA=]', zone: 'Domäne Vabbi', zoneEn: 'Domain of Vabbi' },
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('bestNext');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'unstarted' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'ap-desc' | 'ap-asc' | 'progress-desc' | 'name-asc'>('score');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedWaypointId, setCopiedWaypointId] = useState<number | null>(null);

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

  // When user achievements update, ensure definitions for started achievements are loaded
  useEffect(() => {
    if (userAchievements && userAchievements.size > 0) {
      const ids = Array.from(userAchievements.keys()).slice(0, 300);
      void ensureAchievementDefinitions(ids, lang);
    }
  }, [userAchievements, lang]);

  const hasSyncedApiKey = Boolean(accountInfo && userAchievements && userAchievements.size > 0);

  // 1. Enriched achievements
  const allEnriched = useMemo(() => {
    return getEnrichedAchievements(userAchievements);
  }, [userAchievements]);

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

  // Categories and groups metadata
  const { categories, groups } = useMemo(() => getCategoriesAndGroups(), []);

  // Filtered achievements for category browser
  const categoryBrowserAchievements = useMemo(() => {
    const filterOpts: AchievementFilterOptions = {
      query: searchQuery,
      groupId: selectedGroup,
      categoryId: selectedCategoryId || undefined,
      statusFilter,
      sortBy: sortBy === 'score' ? 'ap-desc' : sortBy,
      lang,
    };
    return filterAndSortAchievements(allEnriched, filterOpts);
  }, [allEnriched, searchQuery, selectedGroup, selectedCategoryId, statusFilter, sortBy, lang]);

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

  // Group achievements by category for structured separation in Category Explorer
  const groupedByCategory = useMemo(() => {
    const groupsMap = new Map<number, { name: string; nameEn: string; items: EnrichedAchievement[] }>();
    for (const ach of categoryBrowserAchievements) {
      const catId = ach.definition.categoryId;
      if (!groupsMap.has(catId)) {
        groupsMap.set(catId, {
          name: ach.definition.categoryName,
          nameEn: ach.definition.categoryNameEn,
          items: [],
        });
      }
      groupsMap.get(catId)!.items.push(ach);
    }
    return Array.from(groupsMap.entries()).map(([catId, data]) => ({
      catId,
      ...data,
    }));
  }, [categoryBrowserAchievements]);

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
                <span className="text-amber-300 font-semibold" title={lang === 'en' ? 'Obtainable from loaded achievements' : 'Aus geladenen Erfolgen noch erreichbar'}>
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
              <span>{lang === 'en' ? 'Guest Mode (Public Metadata)' : 'Gastmodus (Öffentliche Daten)'}</span>
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

      {/* 2. Primary Sub-Navigation Bar */}
      <div className="achieve-subnav-bar">
        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'bestNext' ? 'active' : ''}`}
          onClick={() => setActiveTab('bestNext')}
        >
          <Sparkles size={13} className="gold" />
          <span>{t('intel.tabBestNext')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'efficiency' ? 'active' : ''}`}
          onClick={() => setActiveTab('efficiency')}
        >
          <Zap size={13} className="text-amber-300" />
          <span>{t('intel.tabEfficiency')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'quickWins' ? 'active' : ''}`}
          onClick={() => setActiveTab('quickWins')}
        >
          <Target size={13} className="text-emerald-400" />
          <span>{t('intel.tabQuickWins')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'highestReward' ? 'active' : ''}`}
          onClick={() => setActiveTab('highestReward')}
        >
          <Trophy size={13} className="gold" />
          <span>{t('intel.tabHighestReward')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'continueProgress' ? 'active' : ''}`}
          onClick={() => setActiveTab('continueProgress')}
        >
          <TrendingUp size={13} className="text-sky-400" />
          <span>{t('intel.tabContinueProgress')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={13} />
          <span>{t('intel.tabCategories')}</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          <Star size={13} className={watchlist.length > 0 ? 'gold' : ''} fill={watchlist.length > 0 ? '#d2b268' : 'none'} />
          <span>{t('intel.tabWatchlist')} ({watchlist.length})</span>
        </button>

        <button
          type="button"
          className={`achieve-subnav-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <Calendar size={13} className="text-sky-300" />
          <span>{t('intel.tabDaily')}</span>
        </button>
      </div>

      {/* 3. Main Views Container */}
      <div className="achieve-scroll-view">
        {/* ============================================================
            VIEW 1: BEST NEXT ACHIEVEMENT (FEATURED HERO + RANKED QUEUE)
            ============================================================ */}
        {activeTab === 'bestNext' && (
          <div className="achieve-view-stack">
            {/* Central Hero Showcase: Top-Ranked Best Next Achievement */}
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
                        ? featuredBestNext.achievement.definition.descriptionEn
                        : featuredBestNext.achievement.definition.description)}
                    </p>

                    {/* Explainable Rationale Callout */}
                    <div className="hero-explain-box">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <Info size={12} />
                        <span>{t('intel.whyRecommended')}</span>
                      </div>
                      <p className="text-xs text-[#f4eedb] mt-0.5">
                        {lang === 'en' ? featuredBestNext.reasonEn : featuredBestNext.reasonDe}
                      </p>
                    </div>

                    {/* Progress Bar & Details */}
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

                    {/* Remaining objectives checklist preview */}
                    {featuredBestNext.achievement.remainingObjectives.length > 0 && (
                      <div className="hero-objectives-preview">
                        <span className="text-xs dim font-serif font-bold block mb-1">
                          {t('intel.remainingObjectivesTitle', { count: featuredBestNext.achievement.remainingObjectives.length })}
                        </span>
                        <div className="hero-obj-chips">
                          {(lang === 'en'
                            ? featuredBestNext.achievement.remainingObjectivesEn
                            : featuredBestNext.achievement.remainingObjectives
                          ).slice(0, 4).map((objText, i) => (
                            <span key={i} className="hero-obj-chip">
                              <Circle size={9} className="dim shrink-0 inline mr-1" />
                              <span className="truncate">{stripGw2Tags(objText)}</span>
                            </span>
                          ))}
                          {featuredBestNext.achievement.remainingObjectives.length > 4 && (
                            <span className="hero-obj-chip dim font-mono">
                              +{featuredBestNext.achievement.remainingObjectives.length - 4} {lang === 'en' ? 'more' : 'weitere'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
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

            {/* Next Recommendations Queue */}
            <div className="achieve-queue-header">
              <h3 className="font-serif font-bold text-sm text-[#f4e3a8]">
                {lang === 'en' ? 'Best Next Priorities' : 'Weitere Top-Prioritäten'} ({bestNextRecs.slice(1).length})
              </h3>
            </div>

            <div className="achieve-grid-cards">
              {bestNextRecs.slice(1).map((rec) => renderRecommendationCard(rec))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 2: BEST EFFICIENCY
            ============================================================ */}
        {activeTab === 'efficiency' && (
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
              {efficiencyRecs.map((rec) => renderRecommendationCard(rec))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 3: QUICK WINS
            ============================================================ */}
        {activeTab === 'quickWins' && (
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
              {quickWinsRecs.map((rec) => renderRecommendationCard(rec))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 4: HIGHEST REWARD
            ============================================================ */}
        {activeTab === 'highestReward' && (
          <div className="achieve-view-stack">
            <div className="strategy-banner font-serif">
              <Trophy size={14} className="gold" />
              <span>
                {lang === 'en'
                  ? 'Ranked by total remaining obtainable achievement points (accounting for reward caps and completed tiers).'
                  : 'Geordnet nach maximal erzielbaren Rest-Erfolgspunkten (unter Abzug bereits abgeschlossener Stufen und Punkte-Caps).'}
              </span>
            </div>
            <div className="achieve-grid-cards">
              {highestRewardRecs.map((rec) => renderRecommendationCard(rec))}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW 5: CONTINUE PROGRESS
            ============================================================ */}
        {activeTab === 'continueProgress' && (
          <div className="achieve-view-stack">
            <div className="strategy-banner font-serif">
              <TrendingUp size={14} className="text-sky-400" />
              <span>
                {lang === 'en'
                  ? 'Highlights your partially completed achievements with active progress.'
                  : 'Hebt angefangene Erfolge mit aktivem Fortschritt hervor.'}
              </span>
            </div>
            {continueProgressRecs.length === 0 ? (
              <div className="achieve-empty-state">
                <TrendingUp size={28} className="dim mb-2" />
                <p className="dim text-xs">
                  {lang === 'en'
                    ? 'No partially completed achievements found. Connect your API key or start an achievement to see active goals here.'
                    : 'Keine angefangenen Erfolge gefunden. Verbinde deinen API-Schlüssel, um deinen Fortschritt zu verfolgen.'}
                </p>
              </div>
            ) : (
              <div className="achieve-grid-cards">
                {continueProgressRecs.map((rec) => renderRecommendationCard(rec))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            VIEW 6: CATEGORIES & GROUPS EXPLORER
            ============================================================ */}
        {activeTab === 'categories' && (
          <div className="achieve-view-stack">
            {/* Filter controls toolbar */}
            <div className="category-explorer-toolbar">
              <div className="explorer-search-wrap">
                <Search size={13} className="explorer-search-icon dim" />
                <input
                  type="text"
                  className="gw2-input explorer-search-input"
                  placeholder={t('intel.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="explorer-search-clear" onClick={() => setSearchQuery('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Quick Status Filter Pills with Live Counts */}
              <div className="quick-filter-pills" role="tablist" aria-label={t('intel.filterStatus')}>
                <button
                  type="button"
                  className={`quick-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <span>{t('intel.quickFilterAll')}</span>
                  <span className="pill-count">{categoryStatusCounts.all}</span>
                </button>
                <button
                  type="button"
                  className={`quick-filter-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('in_progress')}
                >
                  <span>{t('intel.quickFilterInProgress')}</span>
                  <span className="pill-count count-progress">{categoryStatusCounts.inProg}</span>
                </button>
                <button
                  type="button"
                  className={`quick-filter-pill ${statusFilter === 'unstarted' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('unstarted')}
                >
                  <span>{t('intel.quickFilterUnstarted')}</span>
                  <span className="pill-count">{categoryStatusCounts.unstarted}</span>
                </button>
                <button
                  type="button"
                  className={`quick-filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('completed')}
                >
                  <span>{t('intel.quickFilterCompleted')}</span>
                  <span className="pill-count count-done">{categoryStatusCounts.completed}</span>
                </button>
              </div>

              <div className="explorer-selects-row">
                {/* Group Selector */}
                <select
                  className="gw2-select explorer-select"
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setSelectedCategoryId(0);
                  }}
                  aria-label={t('intel.groupAll')}
                >
                  <option value="all">{t('intel.groupAll')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {lang === 'en' ? g.nameEn : g.name}
                    </option>
                  ))}
                </select>

                {/* Category Selector */}
                <select
                  className="gw2-select explorer-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                  aria-label={t('intel.categoryAll')}
                >
                  <option value={0}>{t('intel.categoryAll')}</option>
                  {categories
                    .filter((c) => selectedGroup === 'all' || c.groupId === selectedGroup)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'en' ? c.nameEn : c.name}
                      </option>
                    ))}
                </select>

                {/* Status Selector */}
                <select
                  className="gw2-select explorer-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  aria-label={t('intel.filterStatus')}
                >
                  <option value="all">{t('intel.statusAll')}</option>
                  <option value="in_progress">{t('intel.statusInProgress')}</option>
                  <option value="unstarted">{t('intel.statusUnstarted')}</option>
                  <option value="completed">{t('intel.statusCompleted')}</option>
                </select>

                {/* Sort Selector */}
                <select
                  className="gw2-select explorer-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label={t('intel.sortBy')}
                >
                  <option value="ap-desc">{t('intel.sortApDesc')}</option>
                  <option value="ap-asc">{t('intel.sortApAsc')}</option>
                  <option value="progress-desc">{t('intel.sortProgressDesc')}</option>
                  <option value="name-asc">{t('intel.sortNameAsc')}</option>
                </select>
              </div>
            </div>

            {/* Results Grid */}
            {categoryBrowserAchievements.length === 0 ? (
              <div className="achieve-empty-state">
                <Search size={28} className="dim mb-2" />
                <p className="dim text-xs">{t('intel.emptyList')}</p>
                <button
                  type="button"
                  className="gw2-gw-btn mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGroup('all');
                    setSelectedCategoryId(0);
                    setStatusFilter('all');
                  }}
                >
                  {t('common.resetFilters')}
                </button>
              </div>
            ) : selectedCategoryId === 0 && !searchQuery && groupedByCategory.length > 1 ? (
              <div className="category-section-divider">
                {groupedByCategory.map((catGroup) => {
                  const completedInCat = catGroup.items.filter((i) => i.isDone).length;
                  const catObtainable = catGroup.items.reduce((acc, i) => acc + i.obtainableAp, 0);
                  return (
                    <div key={catGroup.catId} className="category-group-block">
                      <div className="category-section-banner">
                        <div className="category-banner-name font-serif">
                          <Layers size={13} className="gold" />
                          <span>{lang === 'en' ? catGroup.nameEn : catGroup.name}</span>
                          <span className="dim text-xs">({catGroup.items.length})</span>
                        </div>
                        <div className="category-banner-stats font-mono">
                          <span className="text-emerald-400 font-semibold">{completedInCat} / {catGroup.items.length} {lang === 'en' ? 'Done' : 'Erledigt'}</span>
                          <span className="sep mx-1.5">•</span>
                          <span className="text-amber-300 font-semibold">+{catObtainable} AP</span>
                        </div>
                      </div>
                      <div className="achieve-grid-cards" style={{ marginTop: 8 }}>
                        {catGroup.items.map((ach) => renderAchievementCard(ach))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="achieve-grid-cards">
                {categoryBrowserAchievements.map((ach) => renderAchievementCard(ach))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            VIEW 7: WATCHLIST (STARRED FAVORITES)
            ============================================================ */}
        {activeTab === 'watchlist' && (
          <div className="achieve-view-stack">
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
        )}

        {/* ============================================================
            VIEW 8: DAILY & WIZARD'S VAULT ROUTINE
            ============================================================ */}
        {activeTab === 'daily' && (
          <div className="gw2-daily-dashboard">
            {/* Wizard's Vault Daily Strip */}
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

            {/* Core World Boss Clears Today */}
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

            {/* Meta Event Hero's Choice Chests Today */}
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
        )}
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
   * Helper to render a recommendation card with explainable rationale
   */
  function renderRecommendationCard(rec: AchievementRecommendation) {
    return renderAchievementCard(rec.achievement, rec);
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

          {/* Description */}
          <p className="card-desc">
            {stripGw2Tags(lang === 'en' ? ach.definition.descriptionEn : ach.definition.description)}
          </p>

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
            {ach.remainingObjectives.length > 0 && (
              <button
                type="button"
                className="btn-expand-objs"
                onClick={() => setExpandedId(isExpanded ? null : ach.definition.id)}
              >
                <span>{isExpanded ? (lang === 'en' ? 'Hide Details' : 'Details einklappen') : (lang === 'en' ? `Show Objectives (${ach.remainingObjectives.length})` : `Ziele anzeigen (${ach.remainingObjectives.length})`)}</span>
                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}

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
