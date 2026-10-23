import React from 'react';
import type { OverlayTab } from '../types';
import {
  GlyphEvents,
  GlyphWaypoint,
  GlyphAchievements,
  GlyphCrafting,
  GlyphLegendary,
  GlyphGear,
} from './common/Glyphs';

interface Gw2NavRailProps {
  currentTab: OverlayTab;
  onSelectTab: (tab: OverlayTab) => void;
  onOpenSettings: () => void;
}

export const Gw2NavRail: React.FC<Gw2NavRailProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  return (
    <nav className="gw2-nav-rail" aria-label="Hauptnavigation">
      {/* 1. Events & Weltbosse */}
      <button
        className={`nav-rail-item ${currentTab === 'events' ? 'active' : ''}`}
        onClick={() => onSelectTab('events')}
        title="Weltenbosse & Event-Timer [Events]"
      >
        <div className="nav-item-icon">
          <GlyphEvents />
        </div>
        <span className="nav-rail-label">Events</span>
        {currentTab === 'events' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 2. Wegmarken-Verzeichnis */}
      <button
        className={`nav-rail-item ${currentTab === 'waypoints' ? 'active' : ''}`}
        onClick={() => onSelectTab('waypoints')}
        title="Wegmarken & Schnellreise [Wegmarken]"
      >
        <div className="nav-item-icon">
          <GlyphWaypoint />
        </div>
        <span className="nav-rail-label">Wegmarken</span>
        {currentTab === 'waypoints' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 3. Bosse & Erfolge */}
      <button
        className={`nav-rail-item ${currentTab === 'achievements' ? 'active' : ''}`}
        onClick={() => onSelectTab('achievements')}
        title="Bosse & Erfolge [Erfolge]"
      >
        <div className="nav-item-icon">
          <GlyphAchievements />
        </div>
        <span className="nav-rail-label">Erfolge</span>
        {currentTab === 'achievements' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 4. Berufe & Handwerk */}
      <button
        className={`nav-rail-item ${currentTab === 'crafting' ? 'active' : ''}`}
        onClick={() => onSelectTab('crafting')}
        title="Berufe, Handwerk & Levelplaner [Berufe]"
      >
        <div className="nav-item-icon">
          <GlyphCrafting />
        </div>
        <span className="nav-rail-label">Berufe</span>
        {currentTab === 'crafting' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 5. Legendäre Waffen */}
      <button
        className={`nav-rail-item ${currentTab === 'legendary' ? 'active' : ''}`}
        onClick={() => onSelectTab('legendary')}
        title="Legendäre Waffen, Komponenten & Materialien [Legendär]"
      >
        <div className="nav-item-icon">
          <GlyphLegendary />
        </div>
        <span className="nav-rail-label">Legendär</span>
        {currentTab === 'legendary' && <div className="nav-rail-active-notch" />}
      </button>

      <div className="nav-rail-spacer" />

      {/* Einstellungen unten */}
      <button
        className="nav-rail-item settings-item"
        onClick={onOpenSettings}
        title="Overlay-Einstellungen & API-Schlüssel"
      >
        <div className="nav-item-icon">
          <GlyphGear />
        </div>
        <span className="nav-rail-label">Optionen</span>
      </button>
    </nav>
  );
};
