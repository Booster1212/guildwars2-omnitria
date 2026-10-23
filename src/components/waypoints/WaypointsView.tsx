import React, { useState, useMemo } from 'react';
import { Search, Compass, MessageSquare, Check, Copy } from 'lucide-react';
import { EVENTS } from '../../data/events';
import { playCopyChime } from '../../data/audio';
import type { OverlaySettings } from '../../types';

interface WaypointsViewProps {
  settings: OverlaySettings;
  onToast: (msg: string) => void;
}

interface WaypointEntry {
  waypoint: string;
  waypointName: string;
  zone: string;
  eventNames: string[];
  categoryLabels: string[];
}

export const WaypointsView: React.FC<WaypointsViewProps> = ({ settings, onToast }) => {
  const [search, setSearch] = useState('');
  const [copiedWp, setCopiedWp] = useState<string | null>(null);

  // Group unique waypoints from all events
  const waypointList: WaypointEntry[] = useMemo(() => {
    const map = new Map<string, WaypointEntry>();
    for (const ev of EVENTS) {
      if (!ev.waypoint) continue;
      const existing = map.get(ev.waypoint);
      if (existing) {
        if (!existing.eventNames.includes(ev.name)) existing.eventNames.push(ev.name);
        if (!existing.categoryLabels.includes(ev.categoryLabel)) existing.categoryLabels.push(ev.categoryLabel);
      } else {
        map.set(ev.waypoint, {
          waypoint: ev.waypoint,
          waypointName: ev.waypointName || ev.zone,
          zone: ev.zone,
          eventNames: [ev.name],
          categoryLabels: [ev.categoryLabel],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.zone.localeCompare(b.zone) || a.waypointName.localeCompare(b.waypointName));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return waypointList;
    return waypointList.filter(
      (w) =>
        w.waypoint.toLowerCase().includes(q) ||
        w.waypointName.toLowerCase().includes(q) ||
        w.zone.toLowerCase().includes(q) ||
        w.eventNames.some((e) => e.toLowerCase().includes(q))
    );
  }, [waypointList, search]);

  const handleCopy = (wp: WaypointEntry) => {
    const text = wp.waypoint;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const api = (window as unknown as { electronAPI?: { copyToClipboard?: (t: string) => void } }).electronAPI;
    if (api?.copyToClipboard) {
      api.copyToClipboard(text);
    }

    if (settings.soundEnabled) playCopyChime(settings.soundVolume);
    setCopiedWp(text);
    setTimeout(() => setCopiedWp((c) => (c === text ? null : c)), 2000);
    onToast(`📍 Wegmarke ${text} (${wp.waypointName}) in Zwischenablage kopiert.`);
  };

  const handleSendChat = (wp: WaypointEntry) => {
    const text = `${wp.waypoint} ${wp.waypointName} (${wp.zone})`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const api = (window as unknown as {
      electronAPI?: { sendChatMessage?: (t: string) => void; copyToClipboard?: (t: string) => void };
    }).electronAPI;

    if (api?.sendChatMessage) {
      api.sendChatMessage(text);
    } else if (api?.copyToClipboard) {
      api.copyToClipboard(text);
    }

    if (settings.soundEnabled) playCopyChime(settings.soundVolume);
    setCopiedWp(wp.waypoint);
    setTimeout(() => setCopiedWp((c) => (c === wp.waypoint ? null : c)), 2000);
    onToast(`💬 Chat-Nachricht gesendet: ${text}`);
  };

  return (
    <div className="gw2-waypoints-view">
      <div className="view-header-bar">
        <div className="view-title-group">
          <span className="view-main-title">Wegmarken-Verzeichnis</span>
          <span className="view-sub-title">Schnellzugriff auf alle Event- und Weltboss-Wegmarken Tyrias</span>
        </div>
        <div className="view-search-box">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="gw2-input"
            placeholder="Wegmarke, Gebiet oder Boss suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="waypoints-table-wrap">
        <table className="gw2-dense-table">
          <thead>
            <tr>
              <th style={{ width: '140px' }}>Code</th>
              <th>Wegmarken-Name</th>
              <th>Gebiet / Zone</th>
              <th>Zugehörige Events / Bosse</th>
              <th style={{ width: '160px', textAlign: 'right' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  Keine Wegmarken für diesen Suchbegriff gefunden.
                </td>
              </tr>
            ) : (
              filtered.map((wp) => {
                const isCopied = copiedWp === wp.waypoint;
                return (
                  <tr key={wp.waypoint} className={isCopied ? 'row-highlight' : ''}>
                    <td className="code-cell">
                      <button
                        className="wp-code-btn"
                        onClick={() => handleCopy(wp)}
                        title="Klicken, um Wegmarken-Code zu kopieren"
                      >
                        {isCopied ? <Check size={11} className="good" /> : <Copy size={11} />}
                        <code>{wp.waypoint}</code>
                      </button>
                    </td>
                    <td className="name-cell font-serif">{wp.waypointName}</td>
                    <td className="zone-cell dim">{wp.zone}</td>
                    <td className="events-cell">
                      {wp.eventNames.map((name, i) => (
                        <span key={i} className="event-tag">
                          {name}
                        </span>
                      ))}
                    </td>
                    <td className="action-cell">
                      <div className="action-btns-row">
                        <button
                          className="btn-action sm"
                          onClick={() => handleCopy(wp)}
                          title="Wegmarke kopieren"
                        >
                          <Compass size={11} />
                          <span>Kopieren</span>
                        </button>
                        <button
                          className="btn-action sm gold"
                          onClick={() => handleSendChat(wp)}
                          title="Mit Namen in GW2-Chat posten"
                        >
                          <MessageSquare size={11} />
                          <span>Chat</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer-status">
        <span>{filtered.length} Wegmarken verfügbar (Klick auf den Code kopiert direkt ins Spiel)</span>
      </div>
    </div>
  );
};
