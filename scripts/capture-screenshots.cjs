const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '../docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

// Echte IPC-Handler registrieren, damit Daten & Icons von ArenaNet geladen werden
ipcMain.handle('gw2-api-fetch', async (_event, url) => {
  if (typeof url !== 'string' || !url.startsWith('https://api.guildwars2.com/')) {
    return { ok: false, status: 0, error: 'URL nicht erlaubt' };
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
    if (!ok) return { ok: false, status, error: response.statusText };
    const data = await response.json();
    return { ok: true, status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
});

const storeDir = path.join(app.getPath('userData'), 'store');
ipcMain.handle('store-read', async (_event, name) => {
  const p = path.join(storeDir, `${name}.json`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
});
ipcMain.on('store-write', (_event, name, json) => {
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(path.join(storeDir, `${name}.json`), json, 'utf8');
});

ipcMain.handle('app-get-version', () => '0.1.2');
ipcMain.handle('app-check-update', async () => ({
  ok: true,
  currentVersion: '0.1.2',
  latestVersion: '0.1.2',
  latestTag: 'v0.1.2',
  hasUpdate: false,
  releaseName: 'Omnitria v0.1.2',
  publishedAt: new Date().toISOString(),
  htmlUrl: 'https://github.com/Booster1212/guildwars2-omnitria/releases',
}));

ipcMain.on('window-set-mode', () => {});
ipcMain.on('window-set-opacity', () => {});
ipcMain.on('window-reset-position', () => {});
ipcMain.on('copy-to-clipboard', () => {});
ipcMain.on('gw2-send-chat', () => {});
ipcMain.on('gw2-teleport-waypoint', () => {});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  await win.loadFile(distHtml);
  console.log('[*] App loaded, waiting for initial API items & icons...');
  await sleep(3500);

  async function waitForImages(timeout = 6000) {
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const start = Date.now();
        function check() {
          const imgs = Array.from(document.querySelectorAll('img'));
          const complete = imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
          if (complete || (Date.now() - start > ${timeout})) {
            resolve(true);
          } else {
            setTimeout(check, 250);
          }
        }
        check();
      })
    `);
    await sleep(500);
  }

  async function snap(filename, width = 1100, height = 750) {
    win.setSize(width, height);
    await sleep(400);
    const img = await win.webContents.capturePage();
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, img.toPNG());
    console.log(`[+] Captured: ${filename} (${width}x${height}, ${(img.toPNG().length / 1024).toFixed(1)} KB)`);
  }

  try {
    // 1. Events Full Hero Board
    console.log('[*] Preparing Events Hero Board...');
    await win.webContents.executeJavaScript(`
      const btn = Array.from(document.querySelectorAll('.nav-rail-item, button')).find(b => b.textContent.includes('Event'));
      if (btn) btn.click();
    `);
    await waitForImages();
    await snap('hero-board.png', 1100, 750);

    // 2. Events Active / Soon Filter
    console.log('[*] Preparing Active Events...');
    await win.webContents.executeJavaScript(`
      const activeBtn = Array.from(document.querySelectorAll('.filter-btn, button')).find(b => b.textContent.includes('Aktiv') || b.textContent.includes('Active'));
      if (activeBtn) activeBtn.click();
    `);
    await waitForImages();
    await snap('events-active.png', 1100, 750);

    // 3. Mini-HUD
    console.log('[*] Preparing Mini-HUD...');
    await win.webContents.executeJavaScript(`
      const widgetBtn = document.querySelector('button[title*="Modus"], button[title*="Widget"], button[title*="In-Game"]');
      if (widgetBtn) widgetBtn.click();
    `);
    await sleep(800);
    await waitForImages();
    await snap('mini-hud.png', 440, 340);

    // Zurück in Vollmodus
    await win.webContents.executeJavaScript(`
      const expandBtn = document.querySelector('button[title*="Voll"], button[title*="Expand"], button[title*="Hero Board"]');
      if (expandBtn) expandBtn.click();
    `);
    win.setSize(1100, 750);
    await sleep(600);

    // 4. Achievements Hero Panel
    console.log('[*] Preparing Achievements...');
    await win.webContents.executeJavaScript(`
      const achTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Erfolge') || b.textContent.includes('Achievements'));
      if (achTab) achTab.click();
    `);
    await sleep(1500);
    await waitForImages();
    await snap('achievements-hero-panel.png', 1100, 750);

    // 5. Achievements World Bosses Category
    console.log('[*] Preparing Achievements Category...');
    await win.webContents.executeJavaScript(`
      const catBtn = Array.from(document.querySelectorAll('.ach-cat-btn, button')).find(b => b.textContent.includes('Weltbosse') || b.textContent.includes('World Bosses'));
      if (catBtn) catBtn.click();
    `);
    await sleep(1000);
    await waitForImages();
    await snap('achievements-detail.png', 1100, 750);

    // 6. Crafting Level Planner
    console.log('[*] Preparing Crafting Planner...');
    await win.webContents.executeJavaScript(`
      const craftTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Handwerk') || b.textContent.includes('Crafting'));
      if (craftTab) craftTab.click();
    `);
    await sleep(2500); // Items und Disziplin-Embleme laden
    await waitForImages(8000);
    await snap('crafting-planner.png', 1100, 750);

    // 7. Crafting Discovery Helper
    console.log('[*] Preparing Crafting Discovery...');
    await win.webContents.executeJavaScript(`
      const discBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Entdeckung') || b.textContent.includes('Discovery'));
      if (discBtn) discBtn.click();
    `);
    await sleep(2000);
    await waitForImages(8000);
    await snap('crafting-discovery.png', 1100, 750);

    // 8. Legendary Armory
    console.log('[*] Preparing Legendary Armory...');
    await win.webContents.executeJavaScript(`
      const legTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Legendär') || b.textContent.includes('Legendary'));
      if (legTab) legTab.click();
    `);
    await sleep(2500); // Waffen-Icons laden
    await waitForImages(8000);
    await snap('legendary-armory.png', 1100, 750);

    // 9. Legendary Mystic Forge Tree
    console.log('[*] Preparing Legendary Mystic Forge Tree...');
    await win.webContents.executeJavaScript(`
      const firstWeapon = document.querySelector('.weapon-card, .legendary-item-card, .weapon-tile, .card');
      if (firstWeapon) firstWeapon.click();
    `);
    await sleep(2500); // Material-Icons & Rezepte laden
    await waitForImages(8000);
    await snap('legendary-tree.png', 1100, 750);

    // 10. Settings Modal
    console.log('[*] Preparing Settings Modal...');
    await win.webContents.executeJavaScript(`
      const settingsBtn = document.querySelector('.settings-item, button[title*="Einstellung"], button[title*="Settings"]');
      if (settingsBtn) settingsBtn.click();
    `);
    await sleep(1500);
    await waitForImages();
    await snap('settings-modal.png', 1100, 750);

    // 11. Settings Auto-Updater
    console.log('[*] Preparing Auto-Updater View...');
    await win.webContents.executeJavaScript(`
      const updatePanel = document.querySelector('.update-card-panel');
      if (updatePanel) updatePanel.scrollIntoView();
    `);
    await sleep(800);
    await snap('settings-updater.png', 1100, 750);

    console.log('[✓] All screenshots with loaded icons captured successfully!');
  } catch (err) {
    console.error('[-] Error capturing screenshots:', err);
  } finally {
    win.destroy();
    app.quit();
  }
});
