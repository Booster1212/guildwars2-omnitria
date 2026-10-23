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
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();

  return (
    <nav className="gw2-nav-rail" aria-label="Hauptnavigation">
      {/* 1. Events & Weltbosse */}
      <button
        className={`nav-rail-item ${currentTab === 'events' ? 'active' : ''}`}
        onClick={() => onSelectTab('events')}
        title={t('nav.events')}
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
        title={t('nav.waypoints')}
      >
        <div className="nav-item-icon">
          <GlyphWaypoint />
        </div>
        <span className="nav-rail-label">{t('nav.waypoints')}</span>
        {currentTab === 'waypoints' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 3. Bosse & Erfolge */}
      <button
        className={`nav-rail-item ${currentTab === 'achievements' ? 'active' : ''}`}
        onClick={() => onSelectTab('achievements')}
        title={t('nav.achievements')}
      >
        <div className="nav-item-icon">
          <GlyphAchievements />
        </div>
        <span className="nav-rail-label">{t('nav.achievements')}</span>
        {currentTab === 'achievements' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 4. Berufe & Handwerk */}
      <button
        className={`nav-rail-item ${currentTab === 'crafting' ? 'active' : ''}`}
        onClick={() => onSelectTab('crafting')}
        title={t('nav.crafting')}
      >
        <div className="nav-item-icon">
          <GlyphCrafting />
        </div>
        <span className="nav-rail-label">{t('nav.crafting')}</span>
        {currentTab === 'crafting' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 5. Legendäre Waffen */}
      <button
        className={`nav-rail-item ${currentTab === 'legendary' ? 'active' : ''}`}
        onClick={() => onSelectTab('legendary')}
        title={t('nav.legendary')}
      >
        <div className="nav-item-icon">
          <GlyphLegendary />
        </div>
        <span className="nav-rail-label">{t('nav.legendary')}</span>
        {currentTab === 'legendary' && <div className="nav-rail-active-notch" />}
      </button>

      <div className="nav-rail-spacer" />

      {/* Einstellungen unten */}
      <button
        className="nav-rail-item settings-item"
        onClick={onOpenSettings}
        title={t('nav.settings')}
      >
        <div className="nav-item-icon">
          <GlyphGear />
        </div>
        <span className="nav-rail-label">{t('nav.settings')}</span>
      </button>
    </nav>
  );
};
