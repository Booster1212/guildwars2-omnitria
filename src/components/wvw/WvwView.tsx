import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  WvwTeam,
  WvwCombinedObjective,
  AdvisorConfig,
  WvwMapType,
} from '../../data/gw2/wvw/types.ts';
import {
  DEFAULT_ADVISOR_WEIGHTS,
} from '../../data/gw2/wvw/constants.ts';
import {
  subscribeWvwService,
  getWvwServiceSnapshot,
  loadStaticObjectives,
  loadWorlds,
  refreshMatchData,
  startWvwPolling,
  stopWvwPolling,
  setMatchId,
  buildCombinedObjectives,
  getCachedObjectivesMap,
  getCachedWorldsMap,
  fetchAvailableMatchIds,
} from '../../data/gw2/wvw/wvwService.ts';
import { generateTacticalRecommendations } from '../../data/gw2/wvw/advisor.ts';
import { evaluateMapOpportunities } from '../../data/gw2/wvw/mapAdvisor.ts';
import { detectPlayerTeamFromWorld } from '../../data/gw2/wvw/teamUtils.ts';
import { playCopyChime } from '../../data/audio.ts';
import type { OverlaySettings } from '../../types.ts';
import type { Gw2AccountInfo } from '../../data/gw2Api.ts';
import { useTranslation } from '../../i18n';

import { WvwHeader, type WvwSubTab } from './WvwHeader.tsx';
import { WvwDashboard } from './WvwDashboard.tsx';
import { WvwAdvisorView } from './WvwAdvisorView.tsx';
import { WvwMapView } from './WvwMapView.tsx';
import { WvwObjectiveDetail } from './WvwObjectiveDetail.tsx';
import { WvwFlipsHistory } from './WvwFlipsHistory.tsx';
import { WvwWeightsModal } from './WvwWeightsModal.tsx';

const CONFIG_STORAGE_KEY = 'gw2_omnitria_wvw_config';

interface WvwViewProps {
  settings: OverlaySettings;
  accountInfo: Gw2AccountInfo | null;
  onToast: (msg: string) => void;
}

export const WvwView: React.FC<WvwViewProps> = React.memo(({ settings, accountInfo, onToast }) => {
  const { lang } = useTranslation();
  const serviceState = useSyncExternalStore(subscribeWvwService, getWvwServiceSnapshot);

  const [availableMatches, setAvailableMatches] = useState<string[]>([
    '2-1', '2-2', '2-3', '2-4', '2-5', '1-1', '1-2', '1-3', '1-4',
  ]);
  const [currentSubTab, setCurrentSubTab] = useState<WvwSubTab>('advisor');
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const previousTopIdsRef = useRef<string[]>([]);
  const autoDetectDoneRef = useRef(false);

  // Advisor configuration (with localStorage persistence)
  const [advisorConfig, setAdvisorConfig] = useState<AdvisorConfig>(() => {
    const defaults: AdvisorConfig = {
      weights: { ...DEFAULT_ADVISOR_WEIGHTS },
      preset: 'balanced',
      playerTeam: 'Red',
      ignoredObjectiveIds: [],
      pinnedObjectiveIds: [],
      filterMap: 'all',
      filterType: 'all',
    };
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return defaults;
  });

  const updateConfig = (partial: Partial<AdvisorConfig>) => {
    setAdvisorConfig((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  // 1. Initial loading of static WvW objectives and worlds
  useEffect(() => {
    void loadStaticObjectives(lang);
    void loadWorlds(lang);
    void fetchAvailableMatchIds().then((ids) => {
      if (ids.length > 0) setAvailableMatches(ids);
    });
  }, [lang]);

  // 2. Automatisches Polling starten
  useEffect(() => {
    startWvwPolling(serviceState.matchId, 30_000);
    return () => {
      stopWvwPolling();
    };
  }, []);

  // 3. When AccountInfo is available, check home world once and derive team
  const playerTeam = advisorConfig.playerTeam;
  const userWorldId = accountInfo?.world;
  const currentMatch = serviceState.match;

  useEffect(() => {
    if (!userWorldId || !currentMatch || autoDetectDoneRef.current) return;

    const detectedTeam = detectPlayerTeamFromWorld(userWorldId, currentMatch);

    if (detectedTeam) {
      autoDetectDoneRef.current = true;
      if (detectedTeam !== playerTeam) {
        updateConfig({ playerTeam: detectedTeam });
        onToast(
          lang === 'de'
            ? `🛡️ Team automatisch erkannt: ${detectedTeam} (Welt-ID ${userWorldId})`
            : `🛡️ Team auto-detected: ${detectedTeam} (World ID ${userWorldId})`,
        );
      }
    }
  }, [userWorldId, currentMatch, playerTeam, onToast, lang]);

  // Statische Maps
  const staticObjectivesMap = getCachedObjectivesMap(lang);
  const worldsMap = getCachedWorldsMap(lang);

  // Kombinierte Ziele berechnen
  const combinedObjectives = useMemo(() => {
    return buildCombinedObjectives(serviceState.match, staticObjectivesMap);
  }, [serviceState.match, staticObjectivesMap]);

  // Taktische Empfehlungen berechnen
  const { topRecommendations, alternativeRecommendations, allRanked } = useMemo(() => {
    if (!serviceState.match) {
      return { topRecommendations: [], alternativeRecommendations: [], allRanked: [] };
    }
    return generateTacticalRecommendations(
      combinedObjectives,
      serviceState.match,
      advisorConfig,
      previousTopIdsRef.current,
      lang,
      serviceState.lastSuccessfulFetch,
      serviceState.isStale,
    );
  }, [combinedObjectives, serviceState.match, advisorConfig, lang, serviceState.lastSuccessfulFetch, serviceState.isStale]);

  // Compute map recommendations for maximum WvXP/WvBP
  const mapRecommendations = useMemo(() => {
    return evaluateMapOpportunities(
      combinedObjectives,
      advisorConfig.playerTeam,
      serviceState.sessionFlips,
      serviceState.match,
    );
  }, [combinedObjectives, advisorConfig.playerTeam, serviceState.sessionFlips, serviceState.match]);

  useEffect(() => {
    if (topRecommendations.length > 0) {
      previousTopIdsRef.current = topRecommendations.map((r) => r.objective.id);
    }
  }, [topRecommendations]);

  // Currently selected objective
  const selectedObjective = useMemo(() => {
    if (!selectedObjId) return null;
    return combinedObjectives.find((o) => o.id === selectedObjId) ?? null;
  }, [combinedObjectives, selectedObjId]);

  const selectedRecommendation = useMemo(() => {
    if (!selectedObjId) return undefined;
    return allRanked.find((r) => r.objective.id === selectedObjId);
  }, [allRanked, selectedObjId]);

  // Aktion: Taktik-Aufruf in Zwischenablage kopieren (Explizit manuell, keine Simulation!)
  const handleCopyCallout = (obj: WvwCombinedObjective) => {
    const chatLink = obj.chatLink || `[${obj.name}]`;
    const message = `${chatLink} ${obj.name} (${obj.type} - ${obj.owner})`;

    let copied = false;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message)
        .then(() => { copied = true; })
        .catch(() => {});
    }

    const api = (window as unknown as {
      electronAPI?: { copyToClipboard?: (t: string) => Promise<{ success: boolean }> | void };
    }).electronAPI;

    if (api?.copyToClipboard) {
      try {
        api.copyToClipboard(message);
        copied = true;
      } catch (_) {}
    }

    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }
    onToast(
      lang === 'en'
        ? `📋 Tactical callout copied to clipboard: ${message} (Paste into game chat with [Enter] + [Ctrl+V])`
        : `📋 Taktik-Aufruf in Zwischenablage kopiert: ${message} (Im Spiel-Chat mit [Enter] + [Strg+V] einfügen)`,
    );
  };

  // Aktion: Chat-Link kopieren
  const handleCopyChatLink = (obj: WvwCombinedObjective) => {
    const textToCopy = obj.chatLink || obj.name;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }

    const api = (window as unknown as { electronAPI?: { copyToClipboard?: (t: string) => void } }).electronAPI;
    if (api?.copyToClipboard) {
      api.copyToClipboard(textToCopy);
    }

    if (settings.soundEnabled) {
      playCopyChime(settings.soundVolume);
    }
    onToast(
      lang === 'en'
        ? `📋 Chat link ${textToCopy} copied to clipboard.`
        : `📋 Chat-Code ${textToCopy} in die Zwischenablage kopiert.`,
    );
  };

  // Favoriten umschalten
  const handleTogglePin = (id: string) => {
    const isPinned = advisorConfig.pinnedObjectiveIds.includes(id);
    const newPinned = isPinned
      ? advisorConfig.pinnedObjectiveIds.filter((p) => p !== id)
      : [...advisorConfig.pinnedObjectiveIds, id];
    updateConfig({ pinnedObjectiveIds: newPinned });
  };

  // Ignorieren umschalten
  const handleToggleIgnore = (id: string) => {
    const isIgnored = advisorConfig.ignoredObjectiveIds.includes(id);
    const newIgnored = isIgnored
      ? advisorConfig.ignoredObjectiveIds.filter((ig) => ig !== id)
      : [...advisorConfig.ignoredObjectiveIds, id];
    updateConfig({ ignoredObjectiveIds: newIgnored });
  };

  // Jump to map
  const handleSwitchToMap = (objId?: string) => {
    if (objId) setSelectedObjId(objId);
    setCurrentSubTab('map');
  };

  return (
    <div className="wvw-view-container">
      {/* Header with match selector, team choice, and subtabs */}
      <WvwHeader
        currentSubTab={currentSubTab}
        onSelectSubTab={setCurrentSubTab}
        matchId={serviceState.matchId}
        onSelectMatchId={(id) => setMatchId(id)}
        availableMatchIds={availableMatches}
        playerTeam={advisorConfig.playerTeam}
        onSelectPlayerTeam={(team) => updateConfig({ playerTeam: team })}
        isFetching={serviceState.isFetching}
        onRefresh={() => void refreshMatchData()}
        lastUpdated={serviceState.lastSuccessfulFetch}
        match={serviceState.match}
        worldsMap={worldsMap}
        flipsCount={serviceState.sessionFlips.length}
        onOpenWeightsModal={() => setIsWeightsModalOpen(true)}
      />

      {/* Compliance & Data Freshness Alert Banner */}
      {serviceState.isStale && (
        <div
          className="wvw-staleness-banner"
          style={{
            background: 'linear-gradient(90deg, rgba(69, 26, 3, 0.95), rgba(41, 18, 5, 0.95))',
            borderBottom: '1px solid #b45309',
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11px',
            color: '#fed7aa',
          }}
        >
          <span style={{ fontSize: '13px' }}>⚠️</span>
          <span>
            {lang === 'de'
              ? `Veralteter Datenstand: WvW-Zustände konnten seit über 90s nicht aktualisiert werden${serviceState.lastError ? ` (${serviceState.lastError})` : ''}. Empfehlungen basieren auf zwischengespeicherten Daten. Automatischer Abruf pausiert mit adaptivem Backoff (${Math.round(serviceState.pollIntervalMs / 1000)}s).`
              : `Stale Data: WvW states could not be updated for over 90s${serviceState.lastError ? ` (${serviceState.lastError})` : ''}. Recommendations are based on cached states. Retrying with adaptive backoff (${Math.round(serviceState.pollIntervalMs / 1000)}s).`}
          </span>
        </div>
      )}

      {/* Main content based on active subtab */}
      <main className="wvw-main-content">
        {currentSubTab === 'advisor' && (
          <WvwAdvisorView
            topRecommendations={topRecommendations}
            alternativeRecommendations={alternativeRecommendations}
            allRanked={allRanked}
            mapRecommendations={mapRecommendations}
            match={serviceState.match}
            worldsMap={worldsMap}
            config={advisorConfig}
            onUpdateConfig={updateConfig}
            onSelectObjective={(obj) => setSelectedObjId(obj.id)}
            onSendChat={handleCopyCallout}
            onCopyChatLink={handleCopyChatLink}
            onTogglePin={handleTogglePin}
            onToggleIgnore={handleToggleIgnore}
            onOpenWeightsModal={() => setIsWeightsModalOpen(true)}
            onSwitchToMap={handleSwitchToMap}
          />
        )}

        {currentSubTab === 'map' && (
          <WvwMapView
            objectives={combinedObjectives}
            topRecommendations={topRecommendations}
            selectedObjectiveId={selectedObjId}
            onSelectObjective={(obj) => setSelectedObjId(obj.id)}
            pinnedObjectiveIds={advisorConfig.pinnedObjectiveIds}
            initialMapType={(advisorConfig.filterMap !== 'all' ? advisorConfig.filterMap : 'Center') as WvwMapType}
          />
        )}

        {currentSubTab === 'dashboard' && (
          <WvwDashboard
            match={serviceState.match}
            worldsMap={worldsMap}
            objectives={combinedObjectives}
            playerTeam={advisorConfig.playerTeam}
            sessionFlips={serviceState.sessionFlips}
            onFilterMapClick={(mapType) => {
              updateConfig({ filterMap: mapType });
              setCurrentSubTab('advisor');
            }}
          />
        )}

        {currentSubTab === 'flips' && (
          <WvwFlipsHistory
            flips={serviceState.sessionFlips}
            onSelectObjectiveById={(id) => setSelectedObjId(id)}
          />
        )}
      </main>

      {/* Detail inspector sidebar (if an objective is clicked) */}
      <WvwObjectiveDetail
        objective={selectedObjective}
        recommendation={selectedRecommendation}
        match={serviceState.match}
        worldsMap={worldsMap}
        onClose={() => setSelectedObjId(null)}
        onSendChat={handleCopyCallout}
        onCopyChatLink={handleCopyChatLink}
        onTogglePin={handleTogglePin}
        onToggleIgnore={handleToggleIgnore}
        isPinned={selectedObjId ? advisorConfig.pinnedObjectiveIds.includes(selectedObjId) : false}
        isIgnored={selectedObjId ? advisorConfig.ignoredObjectiveIds.includes(selectedObjId) : false}
      />

      {/* Configuration modal for advisor weights */}
      <WvwWeightsModal
        isOpen={isWeightsModalOpen}
        onClose={() => setIsWeightsModalOpen(false)}
        weights={advisorConfig.weights}
        currentPreset={advisorConfig.preset}
        onUpdateWeights={(newWeights, preset) => {
          updateConfig({
            weights: newWeights,
            preset: preset ?? advisorConfig.preset,
          });
        }}
      />
    </div>
  );
});
