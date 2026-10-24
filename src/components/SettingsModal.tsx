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
  Globe,
  Sparkles,
  Download,
  ArrowUpCircle,
  PackageCheck,
} from 'lucide-react';
import { OverlaySettings, MessageTemplateType, Language } from '../types';
import {
  validateApiKey,
  fetchAccountAchievements,
  saveCachedApiData,
  loadCachedApiData,
  Gw2AccountInfo,
  Gw2AccountAchievement,
} from '../data/gw2Api';
import { syncAccountData, clearAccountData } from '../data/gw2/account';
import { useTranslation } from '../i18n';

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
  const { t, lang, setLanguage } = useTranslation();
  const [apiKeyInput, setApiKeyInput] = useState<string>(settings.apiKey || '');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<Gw2AccountInfo | null>(null);
  const [syncedAchCount, setSyncedAchCount] = useState<number>(0);
  const [showKeyText, setShowKeyText] = useState<boolean>(false);

  // Auto-Updater State
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0');
  const [updateInfo, setUpdateInfo] = useState<{
    ok: boolean;
    currentVersion: string;
    latestVersion?: string;
    latestTag?: string;
    hasUpdate?: boolean;
    releaseName?: string;
    releaseNotes?: string;
    publishedAt?: string;
    htmlUrl?: string;
    downloadUrl?: string | null;
    assetName?: string | null;
    assetSize?: number;
    isPackaged?: boolean;
    devMode?: boolean;
    error?: string;
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);

  const checkUpdates = async (forceManual = false) => {
    setIsCheckingUpdate(true);
    setUpdateStatusText(null);
    try {
      const api = (window as unknown as { electronAPI?: {
        getAppVersion?: () => Promise<string>;
        checkUpdate?: () => Promise<any>;
      } }).electronAPI;

      let version = currentVersion;
      if (api?.getAppVersion) {
        try {
          const v = await api.getAppVersion();
          if (v) {
            version = v;
            setCurrentVersion(v);
          }
        } catch (_) {}
      }

      if (api?.checkUpdate) {
        const res = await api.checkUpdate();
        setUpdateInfo(res);
      } else {
        // Fallback für Browser-Modus
        const res = await fetch('https://api.github.com/repos/Booster1212/guildwars2-omnitria/releases/latest');
        if (res.ok) {
          const rel = await res.json();
          const latestTag = rel.tag_name || '';
          const latestVer = latestTag.replace(/^v/, '');
          const cleanCur = version.replace(/^v/, '');
          const hasUpdate = latestVer !== cleanCur;
          const assets = Array.isArray(rel.assets) ? rel.assets : [];
          const zipAsset = assets.find((a: any) => a.name?.toLowerCase().endsWith('.zip'));
          setUpdateInfo({
            ok: true,
            currentVersion: version,
            latestVersion: latestVer,
            latestTag,
            hasUpdate,
            releaseName: rel.name || rel.tag_name,
            releaseNotes: rel.body,
            publishedAt: rel.published_at,
            htmlUrl: rel.html_url,
            downloadUrl: zipAsset ? zipAsset.browser_download_url : rel.html_url,
            isPackaged: false,
          });
        } else {
          setUpdateInfo({ ok: false, currentVersion: version, error: `GitHub API (${res.status})` });
        }
      }
    } catch (e: any) {
      setUpdateInfo({ ok: false, currentVersion, error: e.message });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setIsApplyingUpdate(true);
    setUpdateProgress(0);
    setUpdateStatusText(t('settings.downloadingUpdate', { percent: 0 }));

    const api = (window as unknown as { electronAPI?: {
      applyUpdate?: (url: string) => Promise<{ ok: boolean; devMode?: boolean; error?: string }>;
      onUpdateProgress?: (cb: (d: { percent: number }) => void) => () => void;
      openExternal?: (url: string) => void;
    } }).electronAPI;

    let cleanupProgress: (() => void) | undefined;
    if (api?.onUpdateProgress) {
      cleanupProgress = api.onUpdateProgress(({ percent }) => {
        setUpdateProgress(percent);
        setUpdateStatusText(t('settings.downloadingUpdate', { percent }));
      });
    }

    try {
      if (api?.applyUpdate) {
        const res = await api.applyUpdate(updateInfo.downloadUrl);
        if (res.ok) {
          setUpdateProgress(100);
          setUpdateStatusText(t('settings.updateReady'));
        } else if (res.devMode) {
          if (api.openExternal && updateInfo.htmlUrl) {
            api.openExternal(updateInfo.htmlUrl);
          } else if (updateInfo.htmlUrl) {
            window.open(updateInfo.htmlUrl, '_blank');
          }
          setUpdateStatusText(t('settings.devModeNotice'));
        } else {
          setUpdateStatusText(res.error || t('settings.updateError'));
        }
      } else if (updateInfo.htmlUrl) {
        window.open(updateInfo.htmlUrl, '_blank');
      }
    } catch (err: any) {
      setUpdateStatusText(err.message || t('settings.updateError'));
    } finally {
      if (cleanupProgress) cleanupProgress();
      setIsApplyingUpdate(false);
    }
  };

  // Load existing cached API key info on open & check updates
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

      // Beim Öffnen automatisch auf Updates prüfen
      checkUpdates(false);
    }
  }, [isOpen, settings.apiKey]);

  if (!isOpen) return null;

  const handleValidateAndSync = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setApiError(lang === 'en' ? 'Please enter a valid Guild Wars 2 API key.' : 'Bitte gib einen gültigen Guild Wars 2 API-Schlüssel ein.');
      return;
    }

    setIsValidating(true);
    setApiError(null);

    // 1. Validate Account
    const accResult = await validateApiKey(trimmed);
    if (!accResult.success || !accResult.account) {
      setIsValidating(false);
      setApiError(accResult.error || (lang === 'en' ? 'Error validating API key.' : 'Fehler beim Überprüfen des API-Schlüssels.'));
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

  const handleSelectLanguage = (newLang: Language) => {
    setLanguage(newLang);
    onUpdateSettings({ language: newLang });
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
      title: t('settings.tmplStandardTitle'),
      sample: lang === 'en'
        ? '[&BMIDAAA=] Svanir Shaman Chief (Frostgorge Sound) - starts in 04m 12s'
        : '[&BMIDAAA=] Svanir-Schamane (Frostgipfel) - startet in 04m 12s',
    },
    {
      type: 'compact',
      title: t('settings.tmplCompactTitle'),
      sample: lang === 'en'
        ? '[&BMIDAAA=] Svanir Shaman Chief (starts in 04m 12s)'
        : '[&BMIDAAA=] Svanir-Schamane (startet in 04m 12s)',
    },
    {
      type: 'waypointOnly',
      title: t('settings.tmplWaypointTitle'),
      sample: '[&BMIDAAA=]',
    },
    {
      type: 'detailed',
      title: t('settings.tmplDetailedTitle'),
      sample: lang === 'en'
        ? '[&BMIDAAA=] [Core World Boss] Svanir Shaman Chief (Wayfarer Foothills) - starts in 04m 12s'
        : '[&BMIDAAA=] [Core Weltboss] Svanir-Schamane (Wanderer-Hügel) - startet in 04m 12s',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-solid-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-solid-header">
          <div className="modal-title-wrap">
            <Sliders size={16} className="modal-gold-icon" />
            <span className="modal-title-text">{t('settings.title')}</span>
          </div>
          <button className="gw2-parchment-close-btn" onClick={onClose} title={t('settings.doneClose')}>
            <span className="close-x">✕</span>
          </button>
        </div>

        {/* Modal Body with Solid Background and High Contrast */}
        <div className="modal-solid-body">
          {/* SECTION 1: Language Switcher */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Globe size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.language')}</span>
            </div>

            <div className="card-panel-desc">
              {t('settings.languageDesc')}
            </div>

            <div className="gw2-lang-switch-cluster" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className={`gw2-gw-btn ${lang === 'de' ? 'send-btn' : ''}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: lang === 'de' ? '1px solid var(--gw2-gold)' : '1px solid rgba(255,255,255,0.15)',
                  background: lang === 'de' ? 'rgba(210, 178, 104, 0.18)' : 'rgba(0,0,0,0.3)',
                }}
                onClick={() => handleSelectLanguage('de')}
              >
                <span style={{ fontSize: '16px' }}>🇩🇪</span>
                <span style={{ fontWeight: lang === 'de' ? 'bold' : 'normal', color: lang === 'de' ? 'var(--gw2-gold)' : 'var(--gw2-text)' }}>
                  Deutsch (DE)
                </span>
                {lang === 'de' && <CheckCircle2 size={13} className="gold-accent" />}
              </button>

              <button
                type="button"
                className={`gw2-gw-btn ${lang === 'en' ? 'send-btn' : ''}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: lang === 'en' ? '1px solid var(--gw2-gold)' : '1px solid rgba(255,255,255,0.15)',
                  background: lang === 'en' ? 'rgba(210, 178, 104, 0.18)' : 'rgba(0,0,0,0.3)',
                }}
                onClick={() => handleSelectLanguage('en')}
              >
                <span style={{ fontSize: '16px' }}>🇬🇧</span>
                <span style={{ fontWeight: lang === 'en' ? 'bold' : 'normal', color: lang === 'en' ? 'var(--gw2-gold)' : 'var(--gw2-text)' }}>
                  English (EN)
                </span>
                {lang === 'en' && <CheckCircle2 size={13} className="gold-accent" />}
              </button>
            </div>
          </div>

          {/* SECTION 2: Guild Wars 2 API Key & Achievements Sync */}
          <div className="settings-card-panel api-panel">
            <div className="card-panel-header">
              <Key size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.apiKey')}</span>
            </div>

            <div className="card-panel-desc">
              {t('settings.apiKeyDesc')}
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
                  title={showKeyText ? t('settings.hideKey') : t('settings.showKey')}
                >
                  <Eye size={12} />
                </button>
              </div>

              <button
                className="gw2-gw-btn send-btn sync-btn"
                onClick={handleValidateAndSync}
                disabled={isValidating}
                title={t('settings.sync')}
              >
                <RefreshCw size={12} className={isValidating ? 'spin' : ''} />
                <span>{isValidating ? t('settings.checking') : t('settings.sync')}</span>
              </button>

              {accountInfo && (
                <button
                  className="gw2-gw-btn danger-btn"
                  onClick={handleClearApiKey}
                  title="API Key disconnect"
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
                    <span className="acc-label">{t('settings.connected')}</span>
                    <strong className="acc-name">{accountInfo.name}</strong>
                  </div>
                  <div className="acc-meta-row">
                    <span className="acc-sync-badge">
                      <Award size={11} className="gold-accent" />
                      <span>{t('settings.achievementsSynced', { count: syncedAchCount })}</span>
                    </span>
                    {accountInfo.commander && <span className="commander-badge">{t('settings.commander')}</span>}
                  </div>
                </div>
              </div>
            ) : apiError ? (
              <div className="api-status-box error">
                <AlertCircle size={14} className="status-icon red" />
                <div className="status-text-wrap">
                  <span className="error-title">API Error:</span>
                  <span className="error-desc">{apiError}</span>
                </div>
              </div>
            ) : (
              <div className="api-status-box neutral">
                <ShieldCheck size={14} className="status-icon gold" />
                <div className="status-text-wrap">
                  <span>{t('settings.noKeyActive')}</span>
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
                <span>{t('settings.createKeyLink')}</span>
                <ExternalLink size={10} />
              </a>
              <span className="api-help-hint">
                {t('settings.createKeyHint')}
              </span>
            </div>

            {/* API-Aktualisierungszyklen & Cache-Zeiten */}
            <div className="api-intervals-card">
              <div className="intervals-header">
                <Activity size={12} className="gold-accent" />
                <span className="intervals-title font-serif">{t('settings.faqTitle')}</span>
              </div>
              <div className="intervals-grid font-mono">
                <div className="interval-item">
                  <div className="item-title-row">
                    <Database size={11} className="gold-accent" />
                    <span className="item-name">{t('settings.faqTp')}</span>
                  </div>
                  <span className="item-desc">
                    {t('settings.faqTpDesc')}
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <Clock size={11} className="gold-accent" />
                    <span className="item-name">{t('settings.faqAcc')}</span>
                  </div>
                  <span className="item-desc">
                    {t('settings.faqAccDesc')}
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <Activity size={11} className="gold-accent" />
                    <span className="item-name">{t('settings.faqTimers')}</span>
                  </div>
                  <span className="item-desc">
                    {t('settings.faqTimersDesc')}
                  </span>
                </div>

                <div className="interval-item">
                  <div className="item-title-row">
                    <ShieldCheck size={11} className="gold-accent" />
                    <span className="item-name">{t('settings.faqImages')}</span>
                  </div>
                  <span className="item-desc">
                    {t('settings.faqImagesDesc')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Chat-Nachrichtenvorlage */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <MessageSquare size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.chatTemplate')}</span>
            </div>
            <div className="card-panel-desc">
              {t('settings.chatTemplateDesc')}
            </div>

            <div className="template-cards-list">
              {templateSamples.map((item) => (
                <div
                  key={item.type}
                  className={`template-tile ${
                    settings.messageTemplate === item.type ? 'selected' : ''
                  }`}
                  onClick={() => handleTemplateChange(item.type)}
                >
                  <input
                    type="radio"
                    name="messageTemplate"
                    className="template-radio-btn"
                    checked={settings.messageTemplate === item.type}
                    onChange={() => handleTemplateChange(item.type)}
                  />
                  <div className="template-info">
                    <div className="template-heading">{item.title}</div>
                    <div className="template-sample-preview">{item.sample}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: Transparenz & Darstellung */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Eye size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.opacity')}</span>
            </div>
            <div className="slider-control-row">
              <span className="slider-bound">{t('settings.opacityTransparent')}</span>
              <input
                type="range"
                className="gw2-range-slider"
                min="0.3"
                max="1.0"
                step="0.05"
                value={settings.opacity}
                onChange={handleOpacityChange}
              />
              <span className="slider-bound">{t('settings.opacitySolid')}</span>
              <span className="slider-current-badge">{Math.round(settings.opacity * 100)}%</span>
            </div>
          </div>

          {/* SECTION 5: Audio & Signaltöne */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Volume2 size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.sound')}</span>
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
                {t('settings.soundDesc')}
              </label>
            </div>
          </div>

          {/* SECTION 6: Positionierung & Hotkeys */}
          <div className="settings-card-panel">
            <div className="card-panel-header">
              <Keyboard size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.hotkeys')}</span>
            </div>

            <div className="hotkeys-grid">
              <div className="hotkey-row">
                <span className="hotkey-label">{t('settings.hotkeyOverlay')}</span>
                <span className="gw2-kbd-key">F9</span>
              </div>
              <div className="hotkey-row">
                <span className="hotkey-label">{t('settings.hotkeyClickthrough')}</span>
                <span className="gw2-kbd-key">F10</span>
              </div>
            </div>

            {isElectron && (
              <div className="position-reset-wrap">
                <button
                  className="gw2-gw-btn"
                  onClick={handleResetPosition}
                  title={t('settings.resetPos')}
                >
                  <Compass size={12} />
                  <span>{t('settings.resetPos')}</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 7: App-Version & Automatische Aktualisierungen */}
          <div className="settings-card-panel update-card-panel">
            <div className="card-panel-header">
              <ArrowUpCircle size={14} className="gold-accent" />
              <span className="card-panel-title">{t('settings.updateTitle')}</span>
            </div>
            <div className="card-panel-desc">
              {t('settings.currentVersion')}: <strong className="gold-accent">v{currentVersion.replace(/^v/, '')}</strong>
            </div>

            <div className="update-status-box">
              {isCheckingUpdate ? (
                <div className="update-status-row checking">
                  <RefreshCw size={14} className="spin gold-accent" />
                  <span>{t('settings.checkingUpdates')}</span>
                </div>
              ) : updateInfo?.hasUpdate ? (
                <div className="update-available-card">
                  <div className="update-badge-row">
                    <span className="update-badge pulse-badge">
                      <Sparkles size={12} />
                      {t('settings.updateAvailable', { version: `v${updateInfo.latestVersion}` })}
                    </span>
                    {updateInfo.publishedAt && (
                      <span className="update-date">
                        {new Date(updateInfo.publishedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')}
                      </span>
                    )}
                  </div>

                  {updateInfo.releaseName && updateInfo.releaseName !== updateInfo.latestTag && (
                    <div className="update-release-name">{updateInfo.releaseName}</div>
                  )}

                  {isApplyingUpdate ? (
                    <div className="update-progress-container">
                      <div className="update-progress-bar-wrap">
                        <div
                          className="update-progress-bar-fill"
                          style={{ width: `${updateProgress}%` }}
                        />
                      </div>
                      <div className="update-progress-text">{updateStatusText}</div>
                    </div>
                  ) : (
                    <div className="update-actions-row">
                      {isElectron && !updateInfo.devMode ? (
                        <button
                          className="gw2-gw-btn send-btn"
                          onClick={handleApplyUpdate}
                          disabled={isApplyingUpdate}
                        >
                          <Download size={13} />
                          <span>{t('settings.applyUpdate')}</span>
                        </button>
                      ) : (
                        <button
                          className="gw2-gw-btn send-btn"
                          onClick={() => {
                            const api = (window as any).electronAPI;
                            if (api?.openExternal && updateInfo.htmlUrl) {
                              api.openExternal(updateInfo.htmlUrl);
                            } else if (updateInfo.htmlUrl) {
                              window.open(updateInfo.htmlUrl, '_blank');
                            }
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>{t('settings.openReleases')}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {updateStatusText && !isApplyingUpdate && (
                    <div className="update-status-msg">{updateStatusText}</div>
                  )}
                </div>
              ) : updateInfo?.ok ? (
                <div className="update-status-row up-to-date">
                  <PackageCheck size={14} className="green-accent" />
                  <span>{t('settings.upToDate')}</span>
                </div>
              ) : updateInfo?.error ? (
                <div className="update-status-row error">
                  <AlertCircle size={14} className="red-accent" />
                  <span>{updateInfo.error}</span>
                </div>
              ) : null}

              <div className="update-refresh-wrap">
                <button
                  className="gw2-gw-btn"
                  onClick={() => checkUpdates(true)}
                  disabled={isCheckingUpdate || isApplyingUpdate}
                  title={t('settings.checkUpdates')}
                >
                  <RefreshCw size={12} className={isCheckingUpdate ? 'spin' : ''} />
                  <span>{t('settings.checkUpdates')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-solid-footer">
          <button className="gw2-gw-btn send-btn" onClick={onClose}>
            <span>{t('settings.doneClose')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
