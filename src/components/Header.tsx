import React from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Minimize2,
  Maximize2,
  Minus,
  Compass,
  Globe,
} from 'lucide-react';
import type { OverlaySettings, OverlayTab } from '../types';
import { BrandMark } from './common/Glyphs';
import { useAccountState } from '../data/gw2/account';
import { useTranslation } from '../i18n';

interface HeaderProps {
  settings: OverlaySettings;
  currentTab: OverlayTab;
  onSelectTab: (tab: OverlayTab) => void;
  onUpdateSettings: (newSettings: Partial<OverlaySettings>) => void;
  onOpenSettings: () => void;
  isElectron: boolean;
  accountName?: string | null;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  settings,
  currentTab,
  onSelectTab,
  onUpdateSettings,
  onOpenSettings,
  isElectron,
  accountName,
}) => {
  const account = useAccountState();
  const { t, lang, setLanguage } = useTranslation();

  const handleToggleMini = () => {
    onUpdateSettings({ widgetMode: !settings.widgetMode });
  };

  const handleToggleSound = () => {
    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleResetPosition = () => {
    const api = (window as unknown as { electronAPI?: { resetPosition: () => void } }).electronAPI;
    if (api) api.resetPosition();
  };

  const handleMinimizeWindow = () => {
    const api = (window as unknown as { electronAPI?: { minimizeWindow: () => void } }).electronAPI;
    if (api) api.minimizeWindow();
  };

  const handleCloseWindow = () => {
    const api = (window as unknown as { electronAPI?: { closeWindow: () => void } }).electronAPI;
    if (api) api.closeWindow();
  };

  const getSubTitle = () => {
    switch (currentTab) {
      case 'inventory':
        return t('nav.inventory');
      case 'achievements':
        return t('achievements.title');
      case 'crafting':
        return t('crafting.title');
      case 'legendary':
        return t('legendary.title');
      case 'events':
      default:
        return t('nav.events');
    }
  };

  return (
    <header className="gw2-top-header">
      <div className="gw2-title-strip">
        <div className="gw2-hero-brand">
          <div className="gw2-shield-emblem">
            <BrandMark />
          </div>

          <div className="gw2-title-text-wrap">
            <span className="gw2-hero-title font-serif">Omnitria</span>
            {!settings.widgetMode && (
              <span className="gw2-tab-subtitle dim font-serif">• {getSubTitle()}</span>
            )}

            {accountName ? (
              <span
                className={`gw2-account-badge ${settings.widgetMode ? 'compact' : ''}`}
                title={`${lang === 'en' ? 'Connected to GW2 Account' : 'Verbunden mit GW2-Account'} ${accountName}${
                  account.data?.permissions ? ` (${lang === 'en' ? 'Permissions' : 'Berechtigungen'}: ${account.data.permissions.join(', ')})` : ''
                }`}
              >
                <span className="status-dot green" />
                <span className="account-text">{accountName}</span>
              </span>
            ) : (
              <button
                className="gw2-account-badge-hint"
                onClick={onOpenSettings}
                title={lang === 'en' ? 'Click here to connect your GW2 API key' : 'Klicke hier, um deinen Guild Wars 2 API-Schlüssel zu verbinden'}
              >
                <span className="status-dot neutral" />
                {lang === 'en' ? 'Connect API' : 'API verbinden'}
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & GW2 Square Close Button */}
        <div className="gw2-header-controls">
          {/* Quick Language Toggle */}
          <button
            type="button"
            className="gw2-nav-icon-btn lang-toggle-pill"
            title={lang === 'de' ? 'Switch to English / Auf Englisch wechseln' : 'Auf Deutsch wechseln / Switch to German'}
            aria-label={lang === 'de' ? 'Switch language to English' : 'Sprache auf Deutsch wechseln'}
            onClick={() => {
              const next = lang === 'de' ? 'en' : 'de';
              setLanguage(next);
              onUpdateSettings({ language: next });
            }}
          >
            <Globe size={13} className="lang-globe-icon" aria-hidden="true" />
            <span className="lang-code font-bold">{lang === 'de' ? 'DE' : 'EN'}</span>
          </button>

          {/* Dock Reset Button (Position above chat) */}
          {isElectron && (
            <button
              type="button"
              className="gw2-nav-icon-btn"
              title={lang === 'en' ? 'Reset position above GW2 chat' : 'Standardposition über dem GW2-Chat wiederherstellen'}
              aria-label={lang === 'en' ? 'Reset position above GW2 chat' : 'Standardposition über dem GW2-Chat wiederherstellen'}
              onClick={handleResetPosition}
            >
              <Compass size={14} aria-hidden="true" />
            </button>
          )}

          {/* Mini Widget Toggle */}
          <button
            type="button"
            className={`gw2-nav-icon-btn ${settings.widgetMode ? 'active' : ''}`}
            title={settings.widgetMode ? (lang === 'en' ? 'Open Expanded View' : 'Erweiterte Ansicht öffnen') : (lang === 'en' ? 'Compact Chat Overlay (Omnitria Mini)' : 'Kompaktes Chat-Overlay (Omnitria Mini)')}
            aria-label={settings.widgetMode ? (lang === 'en' ? 'Open Expanded View' : 'Erweiterte Ansicht öffnen') : (lang === 'en' ? 'Compact Chat Overlay (Omnitria Mini)' : 'Kompaktes Chat-Overlay (Omnitria Mini)')}
            aria-pressed={settings.widgetMode}
            onClick={handleToggleMini}
          >
            {settings.widgetMode ? <Maximize2 size={14} aria-hidden="true" /> : <Minimize2 size={14} aria-hidden="true" />}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            className={`gw2-nav-icon-btn ${settings.soundEnabled ? 'active' : ''}`}
            title={settings.soundEnabled ? (lang === 'en' ? 'Mute Sounds' : 'Signaltöne stummschalten') : (lang === 'en' ? 'Enable Sounds' : 'Signaltöne aktivieren')}
            aria-label={settings.soundEnabled ? (lang === 'en' ? 'Mute Sounds' : 'Signaltöne stummschalten') : (lang === 'en' ? 'Enable Sounds' : 'Signaltöne aktivieren')}
            aria-pressed={settings.soundEnabled}
            onClick={handleToggleSound}
          >
            {settings.soundEnabled ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            className="gw2-nav-icon-btn"
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
            onClick={onOpenSettings}
          >
            <Settings size={14} aria-hidden="true" />
          </button>

          {/* Electron Minimize */}
          {isElectron && (
            <button
              type="button"
              className="gw2-nav-icon-btn"
              title={lang === 'en' ? 'Minimize' : 'Minimieren'}
              aria-label={lang === 'en' ? 'Minimize' : 'Minimieren'}
              onClick={handleMinimizeWindow}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
          )}

          {/* Authentic GW2 Square Parchment Close Button [X] */}
          {isElectron && (
            <button
              type="button"
              className="gw2-parchment-close-btn"
              title={lang === 'en' ? 'Close' : 'Schließen'}
              aria-label={lang === 'en' ? 'Close' : 'Schließen'}
              onClick={handleCloseWindow}
            >
              <span className="close-x" aria-hidden="true">✕</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
