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
} = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { shell } = require('electron');

// Vollmodus: genug Platz für Handwerk & Legendäre Waffen (Master-/Detail-Ansicht)
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
function log(...args) {
  const line = `[${new Date().toISOString()}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  fs.appendFileSync(logFile, line);
  console.log(...args);
}

process.on('uncaughtException', (err) => {
  log('FATAL UNCAUGHT EXCEPTION:', err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  log('FATAL UNHANDLED REJECTION:', reason);
});
log('Main process starting up...');

app.name = 'Omnitria-HUD';
// Prevent Windows file lock conflicts (Zugriff verweigert 0x5) on GPU disk cache
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

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

function saveBounds(bounds) {
  try {
    fs.writeFileSync(boundsPath, JSON.stringify(bounds, null, 2), 'utf8');
  } catch (e) {
    log('Error saving bounds', e);
  }
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
  // Gespeicherte Vollmodus-Größen aus älteren Versionen (440 px) sind für die neuen Bereiche zu klein
  if (!isMini && (savedBounds.width || 0) < MIN_FULL_WIDTH) {
    const fs2 = getFullSize();
    savedBounds.width = fs2.width;
    savedBounds.height = fs2.height;
  }

  // HUD: 380px width fits GW2 chat box width cleanly
  const defaultWidth = isMini ? 380 : getFullSize().width;
  const defaultHeight = isMini ? 245 : getFullSize().height;
  const defaultPos = getChatAnchoredPosition(defaultWidth, defaultHeight);
  log('Window geometry:', { width: defaultWidth, height: defaultHeight, pos: defaultPos });

  const iconPath = path.join(__dirname, '../assets/icon.png');
  let appIcon = null;
  if (fs.existsSync(iconPath)) {
    try {
      appIcon = nativeImage.createFromPath(iconPath);
      log('Icon loaded from png, empty:', appIcon.isEmpty(), 'size:', appIcon.getSize());
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
    icon: (appIcon && !appIcon.isEmpty()) ? appIcon : undefined,
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
  mainWindow.on('close', (e) => {
    log('mainWindow close event, isQuitting:', app.isQuitting);
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
      saveBounds({ ...b, mode: currentMode });
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const b = mainWindow.getBounds();
      saveBounds({ ...b, mode: currentMode });
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
    const targetWidth = 380;
    const targetHeight = 255;
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
    tray.setToolTip('Omnitria HUD • Guild Wars 2');
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
          title: '✨ Omnitria HUD Aktiv!',
          body: 'Omnitria HUD schwebt über dem Chat. [F9] zum Ein-/Ausblenden.',
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
        label: 'Omnitria HUD ein-/ausblenden (F9)',
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
        label: 'Kompakte HUD-Leiste (Mini)',
        type: 'radio',
        checked: currentMode === 'mini',
        click: () => setWindowMode('mini'),
      },
      {
        label: 'Volle Event-Tafel',
        type: 'radio',
        checked: currentMode === 'full',
        click: () => setWindowMode('full'),
      },
      { type: 'separator' },
      {
        label: 'Über GW2-Chat positionieren',
        click: () => {
          if (!mainWindow) return;
          const b = mainWindow.getBounds();
          const pos = getChatAnchoredPosition(b.width, b.height);
          mainWindow.setBounds({ ...pos, width: b.width, height: b.height });
          saveBounds({ ...pos, width: b.width, height: b.height, mode: currentMode });
        },
      },
      {
        label: `Maus-Durchklick: ${isClickThrough ? 'Aktiv (F10)' : 'Inaktiv (F10)'}`,
        click: () => toggleClickThrough(),
      },
      { type: 'separator' },
      {
        label: 'Beenden',
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

// Keystroke simulation: Send to GW2 Chat automatically
function sendTextToGw2(text, pressEnterAfter = true) {
  clipboard.writeText(text);

  // Focus Guild Wars 2 process and simulate Enter -> Ctrl+V -> Enter
  const vbsScript = `
    Set WshShell = CreateObject("WScript.Shell")
    If WshShell.AppActivate("Guild Wars 2") Then
      WScript.Sleep 60
      WshShell.SendKeys "{ENTER}"
      WScript.Sleep 60
      WshShell.SendKeys "^v"
      ${pressEnterAfter ? 'WScript.Sleep 60 : WshShell.SendKeys "{ENTER}"' : ''}
    End If
  `;
  const tempVbs = path.join(app.getPath('temp'), 'gw2_send.vbs');
  try {
    fs.writeFileSync(tempVbs, vbsScript);
    exec(`wscript //nologo "${tempVbs}"`, () => {
      try { fs.unlinkSync(tempVbs); } catch (_) {}
    });
  } catch (e) {
    log('sendTextToGw2 error:', e);
  }
}

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

ipcMain.on('copy-to-clipboard', (_event, text) => {
  clipboard.writeText(text);
});

// Auto-Send to GW2 Chat handler
ipcMain.on('gw2-send-chat', (_event, text) => {
  sendTextToGw2(text, true);
});

// Auto-Send Waypoint to GW2 Chat handler (opens map/teleport link)
ipcMain.on('gw2-teleport-waypoint', (_event, waypoint) => {
  sendTextToGw2(waypoint, true);
});

// Persistenter Datei-Speicher (Spiegel für den Fortschritt, unabhängig vom Browser-Origin)
const storeDir = path.join(app.getPath('userData'), 'store');
function storePath(name) {
  if (typeof name !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(name)) return null;
  return path.join(storeDir, `${name}.json`);
}
ipcMain.handle('store-read', async (_event, name) => {
  const p = storePath(name);
  if (!p) return null;
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch (e) {
    log('store-read error', e.message);
    return null;
  }
});
ipcMain.on('store-write', (_event, name, json) => {
  const p = storePath(name);
  if (!p || typeof json !== 'string' || json.length > 5 * 1024 * 1024) return;
  try {
    fs.mkdirSync(storeDir, { recursive: true });
    const tmp = `${p}.tmp`;
    fs.writeFileSync(tmp, json, 'utf8');
    if (fs.existsSync(p)) fs.copyFileSync(p, `${p}.bak`);
    fs.renameSync(tmp, p);
  } catch (e) {
    log('store-write error', e.message);
  }
});

// Externe Links (Wiki, ArenaNet-Konto) im Standardbrowser öffnen – nur https und bekannte Hosts
const EXTERNAL_HOSTS = new Set([
  'wiki.guildwars2.com',
  'wiki-de.guildwars2.com',
  'account.arena.net',
  'www.guildwars2.com',
  'api.guildwars2.com',
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
    return { ok: false, status: 0, error: 'URL nicht erlaubt' };
  }
  log('gw2-api-fetch called for:', url.split('?')[0]);
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
      log('gw2-api-fetch non-ok status:', status, errText);
      return { ok: false, status, error: errText };
    }
    const data = await response.json();
    log('gw2-api-fetch success!');
    return { ok: true, status, data };
  } catch (err) {
    log('gw2-api-fetch exception:', err.message);
    return { ok: false, status: 0, error: err.message };
  }
});

app.whenReady().then(() => {
  log('app.whenReady() triggered!');
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
});

app.on('will-quit', () => {
  log('app.on(will-quit) called');
  globalShortcut.unregisterAll();
});
