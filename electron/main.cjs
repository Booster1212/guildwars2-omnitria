const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  clipboard,
  Tray,
  Menu,
  nativeImage,
  Notification,
  safeStorage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { shell } = require('electron');

// Full mode: sufficient room for Crafting, Legendary Armory & WvW Tactics (Master/Detail view)
const FULL_WIDTH = 1000;
const FULL_HEIGHT = 680;
const MIN_FULL_WIDTH = 720;
function getFullSize() {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.max(MIN_FULL_WIDTH, Math.min(FULL_WIDTH, wa.width - 40)),
    height: Math.max(420, Math.min(FULL_HEIGHT, wa.height - 60)),
  };
}

const logFile = path.join(__dirname, 'electron.log');
const logBuffer = [];
let logFlushTimer = null;
const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2 MB

function flushLogsSync() {
  if (logFlushTimer) {
    clearTimeout(logFlushTimer);
    logFlushTimer = null;
  }
  if (!logBuffer.length) return;
  const chunk = logBuffer.join('');
  logBuffer.length = 0;
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_SIZE) {
      try {
        const oldLog = `${logFile}.old`;
        if (fs.existsSync(oldLog)) fs.unlinkSync(oldLog);
        fs.renameSync(logFile, oldLog);
      } catch (_) {}
    }
    fs.appendFileSync(logFile, chunk);
  } catch (_) {}
}

function flushLogsAsync() {
  if (!logBuffer.length) return;
  const chunk = logBuffer.join('');
  logBuffer.length = 0;
  fs.stat(logFile, (err, stats) => {
    if (!err && stats.size > MAX_LOG_SIZE) {
      const oldLog = `${logFile}.old`;
      fs.unlink(oldLog, () => {
        fs.rename(logFile, oldLog, () => {
          fs.appendFile(logFile, chunk, () => {});
        });
      });
    } else {
      fs.appendFile(logFile, chunk, () => {});
    }
  });
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  logBuffer.push(line);
  if (logBuffer.length >= 25) {
    if (logFlushTimer) clearTimeout(logFlushTimer);
    logFlushTimer = null;
    flushLogsAsync();
  } else if (!logFlushTimer) {
    logFlushTimer = setTimeout(() => {
      logFlushTimer = null;
      flushLogsAsync();
    }, 500);
  }
  console.log(...args);
}

process.on('uncaughtException', (err) => {
  log('FATAL UNCAUGHT EXCEPTION:', err.stack || err);
  flushLogsSync();
});
process.on('unhandledRejection', (reason) => {
  log('FATAL UNHANDLED REJECTION:', reason);
  flushLogsSync();
});
log('Main process starting up...');

app.name = 'Omnitria';
// Prevent Windows file lock conflicts (Zugriff verweigert 0x5) on GPU shader disk cache
// while keeping Chromium's HTTP cache enabled (capped at 50 MB) for fast render.guildwars2.com icon loading
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-size', '52428800');

const customUserData = path.join(app.getPath('appData'), 'gw2-overlay-data');
try {
  if (!fs.existsSync(customUserData)) fs.mkdirSync(customUserData, { recursive: true });
  app.setPath('userData', customUserData);
} catch (e) {
  log('Custom userData setup failed:', e.message);
}

let mainWindow = null;
let tray = null;
let currentMode = 'mini';
let isClickThrough = false;

const boundsPath = path.join(app.getPath('userData'), 'overlay-window-bounds.json');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
log('gotTheLock result:', gotTheLock);
if (!gotTheLock) {
  log('Could not get single instance lock, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance attempted, focusing existing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function loadSavedBounds() {
  try {
    if (fs.existsSync(boundsPath)) {
      return JSON.parse(fs.readFileSync(boundsPath, 'utf8'));
    }
  } catch (e) {
    log('Error loading bounds', e);
  }
  return null;
}

let boundsDebounceTimer = null;
let pendingBounds = null;

function saveBounds(bounds) {
  if (boundsDebounceTimer) {
    clearTimeout(boundsDebounceTimer);
    boundsDebounceTimer = null;
  }
  pendingBounds = null;
  try {
    fs.writeFileSync(boundsPath, JSON.stringify(bounds, null, 2), 'utf8');
  } catch (e) {
    log('Error saving bounds', e);
  }
}

function debouncedSaveBounds(bounds) {
  pendingBounds = bounds;
  if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer);
  boundsDebounceTimer = setTimeout(() => {
    boundsDebounceTimer = null;
    if (pendingBounds) {
      saveBounds(pendingBounds);
    }
  }, 300);
}

function getChatAnchoredPosition(width, height) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height: screenHeight } = primaryDisplay.workAreaSize;
  // GW2 chat is in bottom-left. Place overlay right above it:
  // Typical chat height ~250px from bottom, with 20px left margin
  const defaultX = 20;
  const defaultY = Math.max(30, screenHeight - height - 260);
  return { x: defaultX, y: defaultY };
}

function createWindow() {
  log('createWindow() called');
  const savedBounds = loadSavedBounds() || {};
  const isMini = savedBounds.mode === 'full' ? false : true;
  currentMode = isMini ? 'mini' : 'full';
  // Saved full mode sizes from older versions (440 px) are too small for modern sections
  if (!isMini && (savedBounds.width || 0) < MIN_FULL_WIDTH) {
    const fs2 = getFullSize();
    savedBounds.width = fs2.width;
    savedBounds.height = fs2.height;
  }

  // HUD: 430px width fits GW2 chat box cleanly, 380px height fits up to 6 cards and footer with breathing room
  const defaultWidth = isMini ? 430 : getFullSize().width;
  const defaultHeight = isMini ? 380 : getFullSize().height;
  const defaultPos = getChatAnchoredPosition(defaultWidth, defaultHeight);
  log('Window geometry:', { width: defaultWidth, height: defaultHeight, pos: defaultPos });

  const icoPath = path.join(__dirname, '../assets/icon.ico');
  const pngPath = path.join(__dirname, '../assets/icon.png');
  const winIconPath = (process.platform === 'win32' && fs.existsSync(icoPath)) ? icoPath : pngPath;
  let appIcon = null;
  if (fs.existsSync(winIconPath)) {
    try {
      appIcon = nativeImage.createFromPath(winIconPath);
      log('Icon loaded from', winIconPath, 'empty:', appIcon.isEmpty(), 'size:', appIcon.getSize());
    } catch (e) {
      log('Icon load failed:', e.message);
    }
  }

  mainWindow = new BrowserWindow({
    width: savedBounds.width || defaultWidth,
    height: savedBounds.height || defaultHeight,
    x: savedBounds.x !== undefined ? savedBounds.x : defaultPos.x,
    y: savedBounds.y !== undefined ? savedBounds.y : defaultPos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: false,
    show: true,
    icon: (appIcon && !appIcon.isEmpty()) ? (process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : appIcon) : undefined,
    minWidth: 300,
    minHeight: 160,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  log('BrowserWindow instance created!');

  if (appIcon && !appIcon.isEmpty()) {
    try {
      mainWindow.setIcon(appIcon);
    } catch (e) {
      log('mainWindow.setIcon failed:', e.message);
    }
  }

  try {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } catch (e) {
    log('setAlwaysOnTop fallback:', e.message);
    mainWindow.setAlwaysOnTop(true);
  }

  const distHtml = path.join(__dirname, '../dist/index.html');
  log('distHtml path:', distHtml, 'exists:', fs.existsSync(distHtml));
  if (process.env.ELECTRON_START_URL) {
    log('Loading URL:', process.env.ELECTRON_START_URL);
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (fs.existsSync(distHtml)) {
    log('Loading file:', distHtml);
    mainWindow.loadFile(distHtml);
  } else {
    log('Loading dev server fallback');
    mainWindow.loadURL('http://localhost:5188');
  }

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log('webContents did-fail-load:', code, desc);
  });
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log('webContents render-process-gone:', details);
    if (details.reason !== 'clean-exit' && mainWindow && !mainWindow.isDestroyed()) {
      log('Reloading window after renderer crash...');
      mainWindow.reload();
    }
  });
  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    log(`RENDERER [${level}]:`, message, `at ${sourceId}:${line}`);
  });

  // Security: deny untrusted window creation and restrict navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && EXTERNAL_HOSTS.has(u.hostname)) {
        shell.openExternal(u.toString());
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDev = Boolean(process.env.ELECTRON_START_URL) || url.startsWith('http://localhost:5188');
    if (url !== 'about:blank' && !url.startsWith('file://') && !isDev) {
      log('will-navigate prevented navigation to:', url);
      event.preventDefault();
    }
  });
  mainWindow.on('close', (e) => {
    log('mainWindow close event, isQuitting:', app.isQuitting);
    if (pendingBounds) saveBounds(pendingBounds);
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      log('Window hidden to tray instead of closing');
    }
  });
  mainWindow.on('closed', () => {
    log('mainWindow closed!');
    mainWindow = null;
  });

  mainWindow.show();
  mainWindow.focus();

  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const b = mainWindow.getBounds();
      debouncedSaveBounds({ ...b, mode: currentMode });
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const b = mainWindow.getBounds();
      debouncedSaveBounds({ ...b, mode: currentMode });
    }
  });

  registerHotkeys();
  if (appIcon && !appIcon.isEmpty()) {
    createTray(appIcon);
  }
}

function registerHotkeys() {
  try {
    globalShortcut.register('F9', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    globalShortcut.register('F10', () => {
      toggleClickThrough();
    });
    log('Hotkeys registered successfully (F9, F10)');
  } catch (err) {
    log('Hotkey registration error:', err.message);
  }
}

function toggleClickThrough() {
  if (!mainWindow) return;
  isClickThrough = !isClickThrough;
  mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
  mainWindow.webContents.send('click-through-toggled', isClickThrough);
  updateTrayMenu();
}

function setWindowMode(mode) {
  if (!mainWindow) return;
  currentMode = mode;
  const currentBounds = mainWindow.getBounds();

  if (mode === 'mini') {
    const targetWidth = 430;
    const targetHeight = 380;
    const newY = currentBounds.y + (currentBounds.height - targetHeight);
    mainWindow.setBounds({
      x: currentBounds.x,
      y: Math.max(30, newY),
      width: targetWidth,
      height: targetHeight,
    });
  } else {
    const { width: targetWidth, height: targetHeight } = getFullSize();
    const wa = screen.getPrimaryDisplay().workAreaSize;
    const newY = currentBounds.y - (targetHeight - currentBounds.height);
    mainWindow.setBounds({
      x: Math.max(0, Math.min(currentBounds.x, wa.width - targetWidth)),
      y: Math.max(10, Math.min(newY, wa.height - targetHeight)),
      width: targetWidth,
      height: targetHeight,
    });
  }

  saveBounds({ ...mainWindow.getBounds(), mode });
  mainWindow.webContents.send('window-mode-changed', mode);
  updateTrayMenu();
}

function createTray(icon) {
  if (tray) return;
  try {
    const trayIcon = icon.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('Omnitria • Guild Wars 2');
    updateTrayMenu();
    tray.on('double-click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    log('Tray created successfully!');

    // Show native Windows Toast Notification
    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: '✨ Omnitria Active!',
          body: 'Omnitria is running above game chat. Press [F9] to toggle.',
          icon: icon,
        });
        notif.show();
        log('Windows startup notification displayed');
      } catch (ne) {
        log('Notification failed:', ne.message);
      }
    }
  } catch (err) {
    log('Tray creation error:', err.message);
  }
}

function updateTrayMenu() {
  if (!tray) return;
  try {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Toggle Omnitria (F9)',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Compact HUD (Mini)',
        type: 'radio',
        checked: currentMode === 'mini',
        click: () => setWindowMode('mini'),
      },
      {
        label: 'Full Hero Board',
        type: 'radio',
        checked: currentMode === 'full',
        click: () => setWindowMode('full'),
      },
      { type: 'separator' },
      {
        label: 'Dock Above GW2 Chat',
        click: () => {
          if (!mainWindow) return;
          const b = mainWindow.getBounds();
          const pos = getChatAnchoredPosition(b.width, b.height);
          mainWindow.setBounds({ ...pos, width: b.width, height: b.height });
          saveBounds({ ...pos, width: b.width, height: b.height, mode: currentMode });
        },
      },
      {
        label: `Click-Through: ${isClickThrough ? 'Active (F10)' : 'Inactive (F10)'}`,
        click: () => toggleClickThrough(),
      },
      { type: 'separator' },
      {
        label: 'Exit Omnitria',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    log('updateTrayMenu error:', err.message);
  }
}

// Safe Clipboard Handler: Standard and only method for copying chat text/waypoints
ipcMain.handle('copy-to-clipboard', (_event, text) => {
  if (typeof text !== 'string') return { success: false, error: 'Invalid text' };
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (err) {
    log('copy-to-clipboard error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.on('copy-to-clipboard', (_event, text) => {
  if (typeof text === 'string') {
    try { clipboard.writeText(text); } catch (_) {}
  }
});

// Deprecated / Defused legacy IPC handlers:
// Input and chat automation routines have been completely removed for ToS compliance.
// Legacy calls safely copy to clipboard only, ensuring backward-compatibility without automated input risk.
ipcMain.on('gw2-send-chat', (_event, text) => {
  log('[Compliance] gw2-send-chat called: Keystroke simulation is disabled. Copying to clipboard instead.');
  if (typeof text === 'string') {
    try { clipboard.writeText(text); } catch (_) {}
  }
});

ipcMain.on('gw2-teleport-waypoint', (_event, waypoint) => {
  log('[Compliance] gw2-teleport-waypoint called: Keystroke simulation is disabled. Copying to clipboard instead.');
  if (typeof waypoint === 'string') {
    try { clipboard.writeText(waypoint); } catch (_) {}
  }
});

// IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-set-mode', (_event, mode) => {
  setWindowMode(mode);
});

ipcMain.on('window-set-opacity', (_event, opacity) => {
  if (mainWindow && typeof opacity === 'number') {
    mainWindow.setOpacity(Math.max(0.15, Math.min(1.0, opacity)));
  }
});

ipcMain.on('window-set-always-on-top', (_event, flag) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(flag, 'screen-saver');
  }
});

ipcMain.on('window-set-ignore-mouse', (_event, ignore) => {
  if (mainWindow) {
    isClickThrough = ignore;
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    updateTrayMenu();
  }
});

ipcMain.on('window-reset-position', () => {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  const pos = getChatAnchoredPosition(b.width, b.height);
  mainWindow.setBounds({ ...pos, width: b.width, height: b.height });
  saveBounds({ ...pos, width: b.width, height: b.height, mode: currentMode });
});

// Persistent file store (progress mirror independent of browser origin)
const storeDir = path.join(app.getPath('userData'), 'store');
function storePath(name) {
  if (typeof name !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(name)) return null;
  return path.join(storeDir, `${name}.json`);
}

// Secure OS-level Credential Storage via Electron safeStorage (Windows DPAPI / macOS Keychain / Linux Secret Service)
const secureCredsPath = path.join(storeDir, 'secure-credentials.bin');

ipcMain.handle('secure-credentials-available', () => {
  return Boolean(safeStorage && safeStorage.isEncryptionAvailable());
});

ipcMain.handle('secure-credentials-save-key', async (_event, apiKey) => {
  if (typeof apiKey !== 'string') return { success: false, error: 'Invalid key format' };
  const clean = apiKey.trim();
  if (!clean) {
    try {
      if (fs.existsSync(secureCredsPath)) await fs.promises.unlink(secureCredsPath);
      return { success: true, cleared: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'OS secure storage not available' };
  }

  try {
    await fs.promises.mkdir(storeDir, { recursive: true });
    const encryptedBuf = safeStorage.encryptString(clean);
    await fs.promises.writeFile(secureCredsPath, encryptedBuf);
    return { success: true, encrypted: true };
  } catch (err) {
    log('Failed to encrypt credentials with safeStorage:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('secure-credentials-get-key', async () => {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'OS secure storage not available' };
  }
  try {
    const exists = await fs.promises.stat(secureCredsPath).catch(() => null);
    if (!exists) return { success: true, apiKey: null };
    const buf = await fs.promises.readFile(secureCredsPath);
    const decrypted = safeStorage.decryptString(buf);
    return { success: true, apiKey: decrypted };
  } catch (err) {
    log('Failed to decrypt credentials with safeStorage:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('secure-credentials-clear-key', async () => {
  try {
    if (fs.existsSync(secureCredsPath)) await fs.promises.unlink(secureCredsPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('store-read', async (_event, name) => {
  const p = storePath(name);
  if (!p) return null;
  try {
    const exists = await fs.promises.stat(p).catch(() => null);
    return exists ? await fs.promises.readFile(p, 'utf8') : null;
  } catch (e) {
    log('store-read error', e.message);
    return null;
  }
});
ipcMain.on('store-write', async (_event, name, json) => {
  const p = storePath(name);
  if (!p || typeof json !== 'string' || json.length > 5 * 1024 * 1024) return;
  try {
    await fs.promises.mkdir(storeDir, { recursive: true });
    const tmp = `${p}.tmp`;
    await fs.promises.writeFile(tmp, json, 'utf8');
    const exists = await fs.promises.stat(p).catch(() => null);
    if (exists) await fs.promises.copyFile(p, `${p}.bak`);
    await fs.promises.rename(tmp, p);
  } catch (e) {
    log('store-write error', e.message);
  }
});

// Open external links (Wiki, ArenaNet account) in default browser - strictly https and known hosts
const EXTERNAL_HOSTS = new Set([
  'wiki.guildwars2.com',
  'wiki-de.guildwars2.com',
  'account.arena.net',
  'www.guildwars2.com',
  'api.guildwars2.com',
  'github.com',
]);
ipcMain.on('open-external', (_event, url) => {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && EXTERNAL_HOSTS.has(u.hostname)) shell.openExternal(u.toString());
  } catch (_) {}
});

// Official GW2 API fetch handler (bypasses browser CORS & CSP completely!)
ipcMain.handle('gw2-api-fetch', async (_event, url) => {
  if (typeof url !== 'string' || !url.startsWith('https://api.guildwars2.com/')) {
    log('gw2-api-fetch rejected URL');
    return { ok: false, status: 0, error: 'URL not allowed' };
  }
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GW2-Overlay/1.0',
        'Accept': 'application/json',
      },
    });
    const status = response.status;
    const ok = response.ok;
    if (!ok) {
      let errText = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson && errJson.text) errText = errJson.text;
      } catch (e) {}
      log('gw2-api-fetch non-ok status:', status, errText, url.split('?')[0]);
      return { ok: false, status, error: errText };
    }
    const data = await response.json();
    return { ok: true, status, data };
  } catch (err) {
    log('gw2-api-fetch exception:', err.message, url.split('?')[0]);
    return { ok: false, status: 0, error: err.message };
  }
});

// ==========================================
// Omnitria Auto-Updater & Version Management
// ==========================================
function parseSemver(v) {
  const clean = (v || '').trim().replace(/^v/, '');
  const parts = clean.split('-')[0].split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(current, latest) {
  const [cMaj, cMin, cPat] = parseSemver(current);
  const [lMaj, lMin, lPat] = parseSemver(latest);
  if (lMaj > cMaj) return true;
  if (lMaj < cMaj) return false;
  if (lMin > cMin) return true;
  if (lMin < cMin) return false;
  return lPat > cPat;
}

ipcMain.handle('app-get-version', () => {
  return app.getVersion() || require('../package.json').version;
});

ipcMain.handle('app-check-update', async () => {
  const currentVersion = app.getVersion() || require('../package.json').version;
  log('app-check-update called. Current version:', currentVersion);
  try {
    const res = await fetch('https://api.github.com/repos/Booster1212/guildwars2-omnitria/releases/latest', {
      headers: {
        'User-Agent': `Omnitria-Overlay/${currentVersion}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      log('check-update non-ok status:', res.status, res.statusText);
      return { ok: false, error: `GitHub API: ${res.status} ${res.statusText}`, currentVersion };
    }

    const release = await res.json();
    const latestTag = release.tag_name || '';
    const latestVersion = latestTag.replace(/^v/, '');
    const hasUpdate = isNewerVersion(currentVersion, latestVersion);

    // Suche Windows Standalone ZIP Release Asset
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const zipAsset = assets.find(a => a.name.toLowerCase().endsWith('.zip') && a.name.toLowerCase().includes('windows'))
      || assets.find(a => a.name.toLowerCase().endsWith('.zip'));

    log('Update check result: current =', currentVersion, 'latest =', latestVersion, 'hasUpdate =', hasUpdate);

    return {
      ok: true,
      currentVersion,
      latestVersion,
      latestTag,
      hasUpdate,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      htmlUrl: release.html_url,
      assetName: zipAsset ? zipAsset.name : null,
      assetSize: zipAsset ? zipAsset.size : 0,
      downloadUrl: zipAsset ? zipAsset.browser_download_url : null,
      isPackaged: Boolean(app.isPackaged || !process.defaultApp),
    };
  } catch (err) {
    log('app-check-update exception:', err.message);
    return { ok: false, error: err.message, currentVersion };
  }
});

ipcMain.handle('app-apply-update', async (_event, downloadUrl) => {
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    return { ok: false, error: 'No valid download URL' };
  }

  // Security: Strictly validate download URL against official GitHub release asset origins
  try {
    const parsed = new URL(downloadUrl);
    const isGithubHost = parsed.protocol === 'https:' && (
      (parsed.hostname === 'github.com' && parsed.pathname.startsWith('/Booster1212/guildwars2-omnitria/releases/download/')) ||
      (parsed.hostname === 'objects.githubusercontent.com')
    );
    if (!isGithubHost) {
      log('app-apply-update rejected untrusted URL:', downloadUrl);
      return { ok: false, error: 'Download URL rejected: only official GitHub release assets are allowed.' };
    }
  } catch (err) {
    return { ok: false, error: 'Invalid URL format' };
  }

  const isPackaged = Boolean(app.isPackaged || !process.defaultApp);
  log('app-apply-update called. isPackaged =', isPackaged, 'url =', downloadUrl);

  if (!isPackaged) {
    return {
      ok: false,
      devMode: true,
      error: 'Development mode active. Please update via Git or repository releases.',
    };
  }

  try {
    const updateDir = path.join(app.getPath('temp'), 'omnitria-update');
    if (!fs.existsSync(updateDir)) fs.mkdirSync(updateDir, { recursive: true });

    const zipPath = path.join(updateDir, 'update.zip');
    const extractDir = path.join(updateDir, 'extracted');
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });

    log('Starting download to:', zipPath);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return { ok: false, error: `Download failed (${response.status})` };
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedBytes = 0;

    const fileStream = fs.createWriteStream(zipPath);
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      fileStream.write(Buffer.from(value));

      if (mainWindow && !mainWindow.isDestroyed()) {
        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        mainWindow.webContents.send('update-progress', { percent, downloaded: downloadedBytes, total: totalBytes });
      }
    }
    fileStream.end();

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    log('Update ZIP downloaded. Generating update batch script...');

    const appDir = path.dirname(process.execPath);
    const updateBatPath = path.join(updateDir, 'apply-update.bat');

    // Batch script waits briefly, extracts the new version, and restarts Omnitria.exe
    const batContent = `@echo off
chcp 65001 >nul
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"
for /d %%D in ("${extractDir}\\Omnitria-*") do (
  xcopy /s /e /y "%%D\\*" "${appDir}\\"
)
start "" "${process.execPath}"
exit
`;
    fs.writeFileSync(updateBatPath, batContent, 'utf8');

    log('Launching update batch script and quitting...');
    const { spawn } = require('child_process');
    const child = spawn('cmd.exe', ['/c', updateBatPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    setTimeout(() => {
      app.isQuitting = true;
      app.quit();
    }, 500);

    return { ok: true };
  } catch (err) {
    log('app-apply-update exception:', err.message);
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  log('app.whenReady() triggered!');
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.omnitria.gw2overlay');
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (e) => {
  log('app.on(window-all-closed) called - keeping background process alive');
  // Do not quit - stay alive in background / tray
});

app.on('before-quit', () => {
  log('app.on(before-quit) called');
  if (pendingBounds) saveBounds(pendingBounds);
  flushLogsSync();
});

app.on('will-quit', () => {
  log('app.on(will-quit) called');
  globalShortcut.unregisterAll();
  flushLogsSync();
});
