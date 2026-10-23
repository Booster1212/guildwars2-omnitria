import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Volume2,
  Eye,
  Keyboard,
  Compass,
  Sliders,
  ShieldCheck,
  Trash2,
  Clock,
  Database,
  Activity,
  Award,
} from 'lucide-react';
import { OverlaySettings, MessageTemplateType } from '../types';
import {
  validateApiKey,
  fetchAccountAchievements,
  saveCachedApiData,
  loadCachedApiData,
  Gw2AccountInfo,
  Gw2AccountAchievement,
} from '../data/gw2Api';
import { syncAccountData, clearAccountData } from '../data/gw2/account';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OverlaySettings;
  onUpdateSettings: (newSettings: Partial<OverlaySettings>) => void;
  isElectron: boolean;
  onApiDataSynced?: (account: Gw2AccountInfo | null, achievements: Map<number, Gw2AccountAchievement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isElectron,
  onApiDataSynced,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(settings.apiKey || '');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<Gw2AccountInfo | null>(null);
  const [syncedAchCount, setSyncedAchCount] = useState<number>(0);
  const [showKeyText, setShowKeyText] = useState<boolean>(false);

  // Load existing cached API key info on open
  useEffect(() => {
    if (isOpen) {
      const cached = loadCachedApiData();
      if (cached.apiKey) {
        setApiKeyInput(cached.apiKey);
      } else if (settings.apiKey) {
        setApiKeyInput(settings.apiKey);
      }
      if (cached.account) {
        setAccountInfo(cached.account);
      }
      if (cached.achievements) {
        setSyncedAchCount(cached.achievements.size);
      }
      setApiError(null);
    }
  }, [isOpen, settings.apiKey]);

  if (!isOpen) return null;

  const handleValidateAndSync = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setApiError('Bitte gib einen gültigen Guild Wars 2 API-Schlüssel ein.');
      return;
    }

    setIsValidating(true);
    setApiError(null);

    // 1. Validate Account
    const accResult = await validateApiKey(trimmed);
    if (!accResult.success || !accResult.account) {
      setIsValidating(false);
      setApiError(accResult.error || 'Fehler beim Überprüfen des API-Schlüssels.');
      return;
    }

    // 2. Fetch Achievements
    const achResult = await fetchAccountAchievements(trimmed);
    const achievementsList = achResult.achievements || [];

    // 3. Save Cache & Settings
    const achMap = new Map<number, Gw2AccountAchievement>();
    achievementsList.forEach((a) => achMap.set(a.id, a));

    saveCachedApiData(trimmed, accResult.account, achievementsList);
    setAccountInfo(accResult.account);
    setSyncedAchCount(achievementsList.length);
    onUpdateSettings({ apiKey: trimmed });

    try {
      await syncAccountData(trimmed);
    } catch (e) {
      console.warn('Erweiterte Accountdaten konnten nicht synchronisiert werden', e);
    }

    if (onApiDataSynced) {
      onApiDataSynced(accResult.account, achMap);
    }

    setIsValidating(false);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    setAccountInfo(null);
    setSyncedAchCount(0);
    setApiError(null);
    clearAccountData();
    saveCachedApiData('', null, []);
    onUpdateSettings({ apiKey: '' });
    if (onApiDataSynced) {
      onApiDataSynced(null, new Map());
    }
  };

  const handleTemplateChange = (tmpl: MessageTemplateType) => {
    onUpdateSettings({ messageTemplate: tmpl });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ opacity: val });
    const api = (window as unknown as { electronAPI?: { setOpacity: (o: number) => void } }).electronAPI;
    if (api) {
      api.setOpacity(val);
    }
  };

  const handleResetPosition = () => {
    const api = (window as unknown as { electronAPI?: { resetPosition: () => void } }).electronAPI;
    if (api) {
      api.resetPosition();
    }
  };

  const templateSamples: { type: MessageTemplateType; title: string; sample: string }[] = [
    {
      type: 'standard',
      title: 'Standard (Empfohlen für Karten- & Squad-Chat)',
      sample: '[&BMIDAAA=] Svanir-Schamane (Frostgipfel) - startet in 04m 12s',
    },
    {
      type: 'compact',
      title: 'Kompakte Kurzform',
      sample: '[&BMIDAAA=] Svanir-Schamane (startet in 04m 12s)',
    },
    {
      type: 'waypointOnly',
      title: 'Nur Wegmarken-Code (Minimal)',
      sample: '[&BMIDAAA=]',
    },
    {
      type: 'detailed',
      title: 'Detailliert mit Kategorie & Zone',
      sample: '[&BMIDAAA=] [Core Weltboss] Svanir-Schamane (Wanderer-Hügel) - startet in 04m 12s',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-solid-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-solid-header">
          <div className="modal-title-wrap">
            <Sliders size={16} className="modal-gold-icon" />
            <span className="modal-title-text">Heldin • Overlay-Einstellungen</span>
          </div>
          <button className="gw2-parchment-close-btn" onClick={onClose} title="Schließen">
            <span className="close-x">✕</span>
          </button>
        </div>

        {/* Modal Body with Solid Background and High Contrast */}
        <div className="modal-solid-body">
          {/* SECTION 1: Guild Wars 2 API Key & Achievements Sync */}
          <div className="settings-card-panel api-panel">
            <div className="card-panel-header">
              <Key size={14} className="gold-accent" />
              <span className="card-panel-title">Guild Wars 2 API-Schlüssel (Erfolge live synchronisieren)</span>
            </div>

            <div className="card-panel-desc">
              Verbinde deinen offiziellen ArenaNet API-Schlüssel, um deinen <strong>echten Account-Namen</strong>, <strong>Erfolgspunkte</strong> und den Status deiner <strong>Weltenboss-Erfolge</strong> live im Overlay anzuzeigen.
            </div>

            {/* Input & Action Buttons */}
            <div className="api-input-row">
              <div className="api-input-wrap">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  className="gw2-api-text-input"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="api-reveal-btn"
                  onClick={() => setShowKeyText(!showKeyText)}
                  title={showKeyText ? 'Schlüssel verbergen' : 'Schlüssel im Klartext anzeigen'}
                >
                  <Eye size={12} />
                </button>
              </div>

              <button
                className="gw2-gw-btn send-btn sync-btn"
                onClick={handleValidateAndSync}
                disabled={isValidating}
                title="Mit ArenaNet-Servern abgleichen"
              >
                <RefreshCw size={12} className={isValidating ? 'spin' : ''} />
                <span>{isValidating ? 'Prüfe...' : 'Synchronisieren'}</span>
              </button>

              {accountInfo && (
                <button
                  className="gw2-gw-btn danger-btn"
                  onClick={handleClearApiKey}
                  title="Schlüssel und Account-Verbindung trennen"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Status Feedback Box */}
            {accountInfo ? (
              <div className="api-status-box success">
                <CheckCircle2 size={14} className="status-icon green" />
                <div className="status-text-wrap">
                  <div className="account-tag-row">
                    <span className="acc-label">Verbunden mit Account:</span>
                    <strong className="acc-name">{accountInfo.name}</strong>
                  </div>
                  <div className="acc-meta-row">
                    <span className="acc-sync-badge">
                      <Award size={11} className="gold-accent" />
                      <span>{syncedAchCount} Account-Erfolge synchronisiert</span>
                    </span>
                    {accountInfo.commander && <span className="commander-badge">Kommandeur</span>}
                  </div>
                </div>
              </div>
            ) : apiError ? (
              <div className="api-status-box error">
                <AlertCircle size={14} className="status-icon red" />
                <div className="status-text-wrap">
                  <span className="error-title">Verbindungsfehler:</span>
                  <span className="error-desc">{apiError}</span>
                </div>
              </div>
            ) : (
              <div className="api-status-box neutral">
                <ShieldCheck size={14} className="status-icon gold" />
                <div className="status-text-wrap">
                  <span>Noch kein API-Schlüssel aktiv. Das Overlay zeigt Standard-Erfolge an.</span>
                </div>
              </div>
            )}

            {/* ArenaNet Applications Link */}
            <div className="api-help-footer">
              <a
                href="https://account.arena.net/applications"
                target="_blank"
                rel="noreferrer"
                className="api-help-link"
              >
                <span>Eigenen API-Schlüssel auf account.arena.net erstellen</span>
                <ExternalLink size={10} />
              </a>
              <span className="api-help-hint">
                (Empfohlene Berechtigungen: <code>account</code>, <code>progression</code>, <code>inventories</code>, <code>characters</code>, <code>wallet</code>, <code>unlocks</code>)
              </span>
            </div>

            {/* API-Aktualisierungszyklen & Cache-Zeiten */}
            <div className="api-intervals-card">
              <div className="intervals-header">
                <Activity size={12} className="gold-accent" />
                <span className="intervals-title font-serif">Wie oft aktualisiert die Guild Wars 2 API?</span>
              </div>
              <div className="intervals-grid font-mono">
                <div className="interval-item">
                  <div className="item-title-row">
                    <Database size={11} className="gold-accent" />
                    <span className="item-name">Handelsposten (TP-Preise):</span>
                  </div>
                  <span className="item-desc">
                    ArenaNet-Server cachen TP-Preise für <strong>1–5 Minuten</strong> (Cache-Header 300s). Das Overlay fragt Preise bei Bedarf ab und puffert sie <strong>15 Minuten</strong> lokal.
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <Clock size={11} className="gold-accent" />
                    <span className="item-name">Account-Fortschritt & Erfolge:</span>
                  </div>
                  <span className="item-desc">
                    ArenaNet-Server aktualisieren Account-Endpunkte alle <strong>5 Minuten</strong>. Das Overlay synchronisiert automatisch bei Start und alle <strong>15 Minuten</strong> im Hintergrund (oder sofort per Klick auf „Synchronisieren“).
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <Activity size={11} className="gold-accent" />
                    <span className="item-name">Event- & Weltenboss-Timer:</span>
                  </div>
                  <span className="item-desc">
                    Laufen in <strong>Echtzeit (sekundengenau)</strong>. Basiert auf dem deterministischen 2-Stunden-Rotationszyklus von Tyria (völlig unabhängig von API-Latenzen).
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <ShieldCheck size={11} className="gold-accent" />
                    <span className="item-name">Bilder & Item-Katalog:</span>
                  </div>
                  <span className="item-desc">
                    Statische Daten & Grafiken von <code>render.guildwars2.com</code> werden dauerhaft für <strong>14 Tage</strong> lokal gecacht und automatisch nachgeladen.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Chat-Nachrichtenvorlage */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <MessageSquare size={14} className="gold-accent" />
              <span className="card-panel-title">Format der kopierten Chat-Nachricht</span>
            </div>
            <div className="card-panel-desc">
              Dieses deutsche Format wird bei Klick auf <strong>„Nachricht senden“</strong> direkt in den GW2-Kartenchat geschrieben:
            </div>

            <div className="template-cards-list">
              {templateSamples.map((t) => (
                <div
                  key={t.type}
                  className={`template-tile ${
                    settings.messageTemplate === t.type ? 'selected' : ''
                  }`}
                  onClick={() => handleTemplateChange(t.type)}
                >
                  <input
                    type="radio"
                    name="messageTemplate"
                    className="template-radio-btn"
                    checked={settings.messageTemplate === t.type}
                    onChange={() => handleTemplateChange(t.type)}
                  />
                  <div className="template-info">
                    <div className="template-heading">{t.title}</div>
                    <div className="template-sample-preview">{t.sample}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Transparenz & Darstellung */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Eye size={14} className="gold-accent" />
              <span className="card-panel-title">Hintergrund-Deckkraft & Transparenz</span>
            </div>
            <div className="slider-control-row">
              <span className="slider-bound">30% (Transparent)</span>
              <input
                type="range"
                className="gw2-range-slider"
                min="0.3"
                max="1.0"
                step="0.05"
                value={settings.opacity}
                onChange={handleOpacityChange}
              />
              <span className="slider-bound">100% (Solide)</span>
              <span className="slider-current-badge">{Math.round(settings.opacity * 100)}%</span>
            </div>
          </div>

          {/* SECTION 4: Audio & Signaltöne */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Volume2 size={14} className="gold-accent" />
              <span className="card-panel-title">Audio & Sound-Feedback</span>
            </div>
            <div className="checkbox-setting-row">
              <input
                type="checkbox"
                id="soundToggleModal"
                className="gw2-checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
              />
              <label htmlFor="soundToggleModal" className="checkbox-label">
                Akustisches Glockenspiel beim Senden von Wegmarken abspielen
              </label>
            </div>
          </div>

          {/* SECTION 5: Positionierung & Hotkeys */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Keyboard size={14} className="gold-accent" />
              <span className="card-panel-title">Tastaturkürzel & Bildschirmposition</span>
            </div>

            <div className="hotkeys-grid">
              <div className="hotkey-row">
                <span className="hotkey-label">Overlay schnell ein- / ausblenden:</span>
                <span className="gw2-kbd-key">F9</span>
              </div>
              <div className="hotkey-row">
                <span className="hotkey-label">Klick-Durchlässigkeit (Maus durchklicken):</span>
                <span className="gw2-kbd-key">F10</span>
              </div>
            </div>

            {isElectron && (
              <div className="position-reset-wrap">
                <button
                  className="gw2-gw-btn"
                  onClick={handleResetPosition}
                  title="Setzt das Overlay zurück unten links über den Spiel-Chat"
                >
                  <Compass size={12} />
                  <span>Standardposition über Chat (Unten-Links) wiederherstellen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-solid-footer">
          <button className="gw2-gw-btn send-btn" onClick={onClose}>
            <span>Fertig & Schließen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
