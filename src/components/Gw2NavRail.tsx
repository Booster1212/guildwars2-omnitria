import React from 'react';
import type { OverlayTab } from '../types';
import {
  GlyphEvents,
  GlyphInventory,
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

export const Gw2NavRail: React.FC<Gw2NavRailProps> = React.memo(({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  return (
    <nav className="gw2-nav-rail" aria-label={t('nav.mainAriaLabel')}>
      {/* 1. Events & Weltbosse */}
      <button
        type="button"
        className={`nav-rail-item ${currentTab === 'events' ? 'active' : ''}`}
        onClick={() => onSelectTab('events')}
        title={t('nav.events')}
        aria-label={t('nav.events')}
        aria-current={currentTab === 'events' ? 'page' : undefined}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphEvents />
        </div>
        <span className="nav-rail-label">{t('nav.events')}</span>
        {currentTab === 'events' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 2. Inventar, Gegenstandssuche & PvE-Zentrale */}
      <button
        type="button"
        className={`nav-rail-item ${currentTab === 'inventory' ? 'active' : ''}`}
        onClick={() => onSelectTab('inventory')}
        title={t('nav.inventoryTip')}
        aria-label={t('nav.inventory')}
        aria-current={currentTab === 'inventory' ? 'page' : undefined}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphInventory />
        </div>
        <span className="nav-rail-label">{t('nav.inventory')}</span>
        {currentTab === 'inventory' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 3. Bosse & Erfolge */}
      <button
        type="button"
        className={`nav-rail-item ${currentTab === 'achievements' ? 'active' : ''}`}
        onClick={() => onSelectTab('achievements')}
        title={t('nav.achievements')}
        aria-label={t('nav.achievements')}
        aria-current={currentTab === 'achievements' ? 'page' : undefined}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphAchievements />
        </div>
        <span className="nav-rail-label">{t('nav.achievements')}</span>
        {currentTab === 'achievements' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 4. Berufe & Handwerk */}
      <button
        type="button"
        className={`nav-rail-item ${currentTab === 'crafting' ? 'active' : ''}`}
        onClick={() => onSelectTab('crafting')}
        title={t('nav.crafting')}
        aria-label={t('nav.crafting')}
        aria-current={currentTab === 'crafting' ? 'page' : undefined}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphCrafting />
        </div>
        <span className="nav-rail-label">{t('nav.crafting')}</span>
        {currentTab === 'crafting' && <div className="nav-rail-active-notch" />}
      </button>

      {/* 5. Legendary Weapons */}
      <button
        type="button"
        className={`nav-rail-item ${currentTab === 'legendary' ? 'active' : ''}`}
        onClick={() => onSelectTab('legendary')}
        title={t('nav.legendary')}
        aria-label={t('nav.legendary')}
        aria-current={currentTab === 'legendary' ? 'page' : undefined}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphLegendary />
        </div>
        <span className="nav-rail-label">{t('nav.legendary')}</span>
        {currentTab === 'legendary' && <div className="nav-rail-active-notch" />}
      </button>

      <div className="nav-rail-spacer" />

      {/* Einstellungen unten */}
      <button
        type="button"
        className="nav-rail-item settings-item"
        onClick={onOpenSettings}
        title={t('nav.settings')}
        aria-label={t('nav.settings')}
      >
        <div className="nav-item-icon" aria-hidden="true">
          <GlyphGear />
        </div>
        <span className="nav-rail-label">{t('nav.settings')}</span>
      </button>
    </nav>
  );
});
