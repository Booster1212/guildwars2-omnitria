import React from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Minimize2,
  Maximize2,
  Minus,
  Compass,
} from 'lucide-react';
import type { OverlaySettings, OverlayTab } from '../types';
import { BrandMark } from './common/Glyphs';
import { useAccountState } from '../data/gw2/account';

interface HeaderProps {
  settings: OverlaySettings;
  currentTab: OverlayTab;
  onSelectTab: (tab: OverlayTab) => void;
  onUpdateSettings: (newSettings: Partial<OverlaySettings>) => void;
  onOpenSettings: () => void;
  isElectron: boolean;
  accountName?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentTab,
  onSelectTab,
  onUpdateSettings,
  onOpenSettings,
  isElectron,
  accountName,
}) => {
  const account = useAccountState();

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
      case 'waypoints':
        return 'Wegmarken-Verzeichnis';
      case 'achievements':
        return 'Heldin • Erfolge';
      case 'crafting':
        return 'Berufe & Handwerk';
      case 'legendary':
        return 'Legendäre Waffen';
      case 'events':
      default:
        return 'Events & Weltbosse';
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
            <span className="gw2-hero-title font-serif">Heldin</span>
            <span className="gw2-tab-subtitle dim font-serif">{getSubTitle()}</span>

            {accountName ? (
              <span
                className="gw2-account-badge"
                title={`Verbunden mit GW2-Account ${accountName}${
                  account.data?.permissions ? ` (Berechtigungen: ${account.data.permissions.join(', ')})` : ''
                }`}
              >
                <span className="status-dot green" />
                {accountName}
              </span>
            ) : (
              <button
                className="gw2-account-badge-hint"
                onClick={onOpenSettings}
                title="Klicke hier, um deinen Guild Wars 2 API-Schlüssel zu verbinden"
              >
                <span className="status-dot neutral" />
                API verbinden
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & GW2 Square Close Button */}
        <div className="gw2-header-controls">
          {/* Dock Reset Button (Position above chat) */}
          {isElectron && (
            <button
              className="gw2-nav-icon-btn"
              title="Standardposition über dem GW2-Chat wiederherstellen"
              onClick={handleResetPosition}
            >
              <Compass size={13} />
            </button>
          )}

          {/* Mini Widget Toggle */}
          <button
            className={`gw2-nav-icon-btn ${settings.widgetMode ? 'active' : ''}`}
            title={settings.widgetMode ? 'Erweiterte Ansicht öffnen' : 'Kompaktes Chat-Overlay (Mini-HUD)'}
            onClick={handleToggleMini}
          >
            {settings.widgetMode ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>

          {/* Sound Toggle */}
          <button
            className={`gw2-nav-icon-btn ${settings.soundEnabled ? 'active' : ''}`}
            title={settings.soundEnabled ? 'Ton stummschalten' : 'Signalton beim Kopieren aktivieren'}
            onClick={handleToggleSound}
          >
            {settings.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Settings Button */}
          <button
            className="gw2-nav-icon-btn"
            title="Overlay-Einstellungen & API-Schlüssel"
            onClick={onOpenSettings}
          >
            <Settings size={13} />
          </button>

          {/* Electron Minimize */}
          {isElectron && (
            <button
              className="gw2-nav-icon-btn"
              title="Minimieren"
              onClick={handleMinimizeWindow}
            >
              <Minus size={13} />
            </button>
          )}

          {/* Authentic GW2 Square Parchment Close Button [X] */}
          {isElectron && (
            <button
              className="gw2-parchment-close-btn"
              title="Schließen"
              onClick={handleCloseWindow}
            >
              <span className="close-x">✕</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
