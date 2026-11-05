import React, { useMemo } from 'react';
import {
  Compass,
  MapPin,
  Swords,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Crosshair,
} from 'lucide-react';
import { EventInstance } from '../types';
import {
  formatCountdown,
  formatShortCountdown,
  getEventName,
  getEventZone,
  getEventWaypointName,
} from '../data/events';
import {
  MumbleData,
  isEventOnMap,
  calculateSpatialWayfinding,
} from '../data/gw2/mumble';
import { useTranslation } from '../i18n';

interface SpatialWayfindingHudProps {
  mumble: MumbleData;
  instances: EventInstance[];
  trackedEventId: string | null;
  onSelectTrackedEvent: (eventId: string | null) => void;
  onTeleport: (inst: EventInstance) => void;
  isCombatFloating?: boolean;
  isClickThrough?: boolean;
}

export const SpatialWayfindingHud: React.FC<SpatialWayfindingHudProps> = React.memo(({
  mumble,
  instances,
  trackedEventId,
  onSelectTrackedEvent,
  onTeleport,
  isCombatFloating = false,
  isClickThrough = false,
}) => {
  const { lang } = useTranslation();

  // Candidate events:
  // 1. Events on current map (active first, then soonest)
  // 2. Currently active or imminent events across Tyria
  const candidates = useMemo(() => {
    if (!instances.length) return [];
    const onMap = instances.filter((i) => isEventOnMap(i.event, mumble.mapId));
    const urgent = instances.filter((i) => i.isActive || i.startsInSeconds <= 30 * 60);
    const merged: EventInstance[] = [];
    const seen = new Set<string>();

    for (const inst of [...onMap, ...urgent, ...instances.slice(0, 6)]) {
      if (!seen.has(inst.event.id)) {
        seen.add(inst.event.id);
        merged.push(inst);
      }
      if (merged.length >= 12) break;
    }
    return merged;
  }, [instances, mumble.mapId]);

  const targetInstance = useMemo(() => {
    if (!candidates.length) return null;
    if (trackedEventId) {
      const tracked = candidates.find((c) => c.event.id === trackedEventId)
        || instances.find((c) => c.event.id === trackedEventId);
      if (tracked) return tracked;
    }
    // Prefer an event on the player's current map if one is active or starting within 90m
    const mapMatch = candidates.find(
      (c) => isEventOnMap(c.event, mumble.mapId) && (c.isActive || c.startsInSeconds <= 90 * 60)
    );
    if (mapMatch) return mapMatch;

    return candidates[0];
  }, [candidates, instances, trackedEventId, mumble.mapId]);

  const wayfinding = useMemo(() => {
    if (!targetInstance || !mumble.connected) return null;
    return calculateSpatialWayfinding(
      targetInstance.event.id,
      mumble.playerX,
      mumble.playerY,
      mumble.compassRotation,
      mumble.camFrontX,
      mumble.camFrontZ,
      targetInstance.event.mapId
    );
  }, [
    targetInstance,
    mumble.connected,
    mumble.playerX,
    mumble.playerY,
    mumble.compassRotation,
    mumble.camFrontX,
    mumble.camFrontZ,
  ]);

  if (!mumble.connected || !targetInstance || !wayfinding) {
    return null;
  }

  const isOnMap = isEventOnMap(targetInstance.event, mumble.mapId);
  const isAlignedAhead = wayfinding.angleDeg <= 28 || wayfinding.angleDeg >= 332;
  const eventName = getEventName(targetInstance.event, lang);
  const zoneName = getEventZone(targetInstance.event, lang);
  const waypointName = getEventWaypointName(targetInstance.event, lang);
  const turnText = lang === 'en' ? wayfinding.turnInstructionEn : wayfinding.turnInstructionDe;

  const currentIdx = candidates.findIndex((c) => c.event.id === targetInstance.event.id);

  const handleCycle = (delta: number) => {
    if (candidates.length <= 1) return;
    const baseIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (baseIdx + delta + candidates.length) % candidates.length;
    onSelectTrackedEvent(candidates[nextIdx].event.id);
  };

  return (
    <div
      className={`gw2-spatial-hud ${isCombatFloating ? 'is-combat-floating' : 'is-docked-bar'} ${
        isOnMap ? 'is-on-map' : 'is-remote-map'
      } ${isAlignedAhead ? 'is-aligned-ahead' : ''}`}
      style={{
        pointerEvents: isCombatFloating || isClickThrough ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Left: 360-Degree Live Rotating Compass Dial */}
      <div
        className={`spatial-compass-dial ${isAlignedAhead ? 'aligned' : ''}`}
        title={
          lang === 'en'
            ? `Heading: ${turnText} (${wayfinding.compassCardinal})`
            : `Richtung: ${turnText} (${wayfinding.compassCardinal})`
        }
      >
        <div
          className="spatial-compass-arrow-rotator"
          style={{
            transform: `rotate(${wayfinding.angleDeg}deg)`,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="spatial-nav-svg"
          >
            <path d="M12 2L19 20L12 15.5L5 20L12 2Z" />
          </svg>
        </div>
      </div>

      {/* Center: Turn Instruction, Distance, Event Name & Map Status */}
      <div className="spatial-hud-body">
        <div className="spatial-hud-top-row">
          <span className={`spatial-direction-pill font-mono ${isAlignedAhead ? 'aligned' : ''}`}>
            {wayfinding.arrow} {turnText}
          </span>
          <span className="spatial-distance-pill font-mono">
            {wayfinding.distanceLabel} ({wayfinding.compassCardinal})
          </span>
          {isOnMap ? (
            <span className="spatial-map-tag on-map">
              <MapPin size={10} />
              <span>{lang === 'en' ? 'ON MAP' : 'AUF KARTE'}</span>
            </span>
          ) : (
            <span className="spatial-map-tag remote-map" title={zoneName}>
              <Compass size={10} />
              <span>{zoneName}</span>
            </span>
          )}
          {isCombatFloating && (
            <span className="spatial-combat-pill">
              <Swords size={10} />
              <span>{lang === 'en' ? 'COMBAT HUD' : 'KAMPF-HUD'}</span>
            </span>
          )}
        </div>

        <div className="spatial-hud-bottom-row">
          <span className="spatial-target-name font-serif" title={`${eventName} • ${waypointName}`}>
            {eventName}
          </span>
          <span className="spatial-target-timer font-mono">
            {targetInstance.isActive ? (
              <span className="spatial-timer-active">
                <Flame size={10} />
                <span>
                  {lang === 'en' ? 'ACTIVE' : 'AKTIV'} ({formatShortCountdown(targetInstance.endsInSeconds, lang)})
                </span>
              </span>
            ) : (
              <span className="spatial-timer-upcoming">
                <Clock size={10} />
                <span>{formatCountdown(targetInstance.startsInSeconds)}</span>
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Right: Interactive Controls (Hidden during combat click-through) */}
      {!isCombatFloating && !isClickThrough && (
        <div className="spatial-hud-actions">
          {candidates.length > 1 && (
            <div className="spatial-cycle-group">
              <button
                type="button"
                className="spatial-action-btn"
                onClick={() => handleCycle(-1)}
                title={lang === 'en' ? 'Previous target event' : 'Vorheriges Ziel-Event'}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                type="button"
                className="spatial-action-btn"
                onClick={() => handleCycle(1)}
                title={lang === 'en' ? 'Next target event' : 'Nächstes Ziel-Event'}
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
          {trackedEventId && (
            <button
              type="button"
              className="spatial-action-btn locked"
              onClick={() => onSelectTrackedEvent(null)}
              title={
                lang === 'en'
                  ? 'Target locked (Click to return to auto-tracking)'
                  : 'Ziel fixiert (Klicken für automatische Zielwahl)'
              }
            >
              <Crosshair size={11} />
            </button>
          )}
          <button
            type="button"
            className="spatial-wp-btn"
            onClick={() => onTeleport(targetInstance)}
            title={`${lang === 'en' ? 'Copy Waypoint' : 'Wegmarke kopieren'}: ${waypointName} (${targetInstance.event.waypoint})`}
          >
            <Compass size={11} />
            <span>WP</span>
          </button>
        </div>
      )}
    </div>
  );
});
