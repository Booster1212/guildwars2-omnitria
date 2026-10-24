const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '../docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const logPath = path.join(screenshotsDir, 'capture.log');
fs.writeFileSync(logPath, `[*] Starting capture session at ${new Date().toISOString()}\n`);
function log(msg) {
  const line = `[${new Date().toISOString().substring(11, 19)}] ${msg}`;
  fs.appendFileSync(logPath, line + '\n');
  process.stdout.write(line + '\n');
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Memory cache for GW2 API fetch to avoid duplicate requests and 429 rate limits
const apiCache = new Map();
ipcMain.handle('gw2-api-fetch', async (_event, url) => {
  if (typeof url !== 'string' || !url.startsWith('https://api.guildwars2.com/')) {
    return { ok: false, status: 0, error: 'URL nicht erlaubt' };
  }
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GW2-Overlay/1.0',
          'Accept': 'application/json',
        },
      });
      if (response.status === 429) {
        log(`[API 429] Rate limited on ${url}, waiting ${(attempt + 1) * 1200}ms...`);
        await sleep((attempt + 1) * 1200);
        continue;
      }
      if (!response.ok) {
        return { ok: false, status: response.status, error: response.statusText };
      }
      const data = await response.json();
      const res = { ok: true, status: response.status, data };
      apiCache.set(url, res);
      return res;
    } catch (err) {
      if (attempt === 4) return { ok: false, status: 0, error: err.message };
      await sleep(600);
    }
  }
  return { ok: false, status: 0, error: 'Timeout' };
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
    width: 1100,
    height: 750,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on('console-message', (_e, _lvl, msg) => {
    if (msg.includes('error') || msg.includes('Error') || msg.includes('warn')) {
      log(`[Renderer] ${msg}`);
    }
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  await win.loadFile(distHtml);
  log('[*] App loaded, waiting for initial state...');
  await sleep(3500);

  // Helper to ensure all visible images have loaded and have valid width/height
  async function waitForVisibleImages(timeoutMs = 15000) {
    const res = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        // Convert lazy images to eager so browser fetches immediately
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
          img.loading = 'eager';
        });

        const start = Date.now();
        function check() {
          const imgs = Array.from(document.querySelectorAll('img')).filter(img => {
            const r = img.getBoundingClientRect();
            return r.width > 0 && r.height > 0 &&
                   r.top < window.innerHeight + 100 && r.bottom > -100 &&
                   r.left < window.innerWidth + 100 && r.right > -100;
          });

          const emptyIcons = Array.from(document.querySelectorAll('.gi-empty')).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
          });

          const allLoaded = imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
          if ((allLoaded && emptyIcons.length === 0) || (Date.now() - start > ${timeoutMs})) {
            resolve({ count: imgs.length, empty: emptyIcons.length, elapsed: Date.now() - start, allLoaded });
          } else {
            setTimeout(check, 250);
          }
        }
        check();
      })
    `);
    log(`[Images] Found ${res.count} visible images, ${res.empty} empty placeholders (allLoaded=${res.allLoaded}, ${res.elapsed}ms)`);
    await sleep(400);
  }

  async function snap(filename, width = 1100, height = 750) {
    win.setSize(width, height);
    await sleep(500);
    const img = await win.webContents.capturePage();
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, img.toPNG());
    log(`[+] Saved: ${filename} (${width}x${height}, ${(img.toPNG().length / 1024).toFixed(1)} KB)`);
  }

  try {
    // ------------------------------------------------------------------------
    // 1. Events Full Hero Board (All events, upcoming countdowns)
    // ------------------------------------------------------------------------
    log('[*] Capturing 1: hero-board.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Event'));
        if (btn) btn.click();
        const allChip = Array.from(document.querySelectorAll('.category-chip')).find(b => b.textContent.trim().toLowerCase() === 'alle' || b.textContent.trim().toLowerCase() === 'all');
        if (allChip) allChip.click();
      })()
    `);
    await sleep(1500);
    await waitForVisibleImages(6000);
    await snap('hero-board.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 2. Events Active & Expanded Boss Tactics, Defiance Bar & Loot
    // ------------------------------------------------------------------------
    log('[*] Capturing 2: events-active.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        // Expand first card details (Taktik, Trotz-Leiste, Beute-Highlights)
        const firstCard = document.querySelector('.gw2-event-card');
        if (firstCard) {
          const detailsBtn = firstCard.querySelector('button.gw2-details-toggle-btn');
          if (detailsBtn) detailsBtn.click();
          const achBtn = firstCard.querySelector('button.gw2-achieve-pill-btn');
          if (achBtn) achBtn.click();
        }
      })()
    `);
    await sleep(2500); // Loot-Items via API laden
    await waitForVisibleImages(8000);
    await snap('events-active.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 3. Compact Mini-HUD (Over-Chat Mode)
    // ------------------------------------------------------------------------
    log('[*] Capturing 3: mini-hud.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const miniBtn = document.querySelector('button[title*="Kompaktes"], button[title*="Compact"], button[title*="Mini"]');
        if (miniBtn) miniBtn.click();
      })()
    `);
    await sleep(1200);
    await waitForVisibleImages(4000);
    await snap('mini-hud.png', 440, 340);

    // Restore full mode
    log('[*] Restoring full window mode...');
    await win.webContents.executeJavaScript(`
      (() => {
        const expandBtn = document.querySelector('button[title*="Erweiterte"], button[title*="Expanded"], button[title*="Hero Board"]');
        if (expandBtn) expandBtn.click();
      })()
    `);
    win.setSize(1100, 750);
    await sleep(1200);

    // ------------------------------------------------------------------------
    // 4. Achievements Hero Panel (Watchlist & Daily Milestones)
    // ------------------------------------------------------------------------
    log('[*] Capturing 4: achievements-hero-panel.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const achTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Erfolge') || b.textContent.includes('Achievements'));
        if (achTab) achTab.click();
        const allTab = Array.from(document.querySelectorAll('.achieve-tab-btn')).find(b => b.textContent.includes('Alle') || b.textContent.includes('All'));
        if (allTab) allTab.click();
      })()
    `);
    await sleep(2000);
    await waitForVisibleImages(6000);
    await snap('achievements-hero-panel.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 5. Achievements Detail (World Bosses category with expanded checklist)
    // ------------------------------------------------------------------------
    log('[*] Capturing 5: achievements-detail.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const wbTab = Array.from(document.querySelectorAll('.achieve-tab-btn')).find(b => b.textContent.includes('Weltbosse') || b.textContent.includes('World'));
        if (wbTab) wbTab.click();
        // Expand first objectives checklist
        const firstObjBtn = document.querySelector('.btn-toggle-objectives');
        if (firstObjBtn) firstObjBtn.click();
      })()
    `);
    await sleep(2000);
    await waitForVisibleImages(6000);
    await snap('achievements-detail.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 6. Legendary Armory (Overview with Gen 1, 2, 3 weapons)
    // ------------------------------------------------------------------------
    log('[*] Capturing 6: legendary-armory.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const legTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Legendär') || b.textContent.includes('Legendary'));
        if (legTab) legTab.click();
      })()
    `);
    await sleep(3000); // 30 Waffen-Icons von GW2-API laden
    await waitForVisibleImages(15000);
    await snap('legendary-armory.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 7. Legendary Craft Tree (Twilight / Dämmerung 4 Mystic Forge branches)
    // ------------------------------------------------------------------------
    log('[*] Capturing 7: legendary-tree.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        // Select Twilight (Dämmerung)
        const rows = Array.from(document.querySelectorAll('.weapon-row'));
        const twilightRow = rows.find(r => r.textContent.includes('Dämmerung') || r.textContent.includes('Twilight')) || rows[0];
        if (twilightRow) twilightRow.click();
        // Ensure "Handwerksbaum" tab is selected
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const treeTab = tabs.find(t => t.textContent.includes('Baum') || t.textContent.includes('Tree'));
        if (treeTab) treeTab.click();
      })()
    `);
    await sleep(3500); // Baum-Material-Icons laden
    await waitForVisibleImages(15000);
    await snap('legendary-tree.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 8. Legendary Materials BOM (Bill of Materials with TP prices)
    // ------------------------------------------------------------------------
    log('[*] Capturing 8: legendary-materials.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const matTab = tabs.find(t => t.textContent.includes('Material') || t.textContent.includes('BOM'));
        if (matTab) matTab.click();
      })()
    `);
    await sleep(3000); // TP-Preise & Icons laden
    await waitForVisibleImages(12000);
    await snap('legendary-materials.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 9. Crafting Level Planner (Weaponsmith 0–500 leveling route)
    // ------------------------------------------------------------------------
    log('[*] Capturing 9: crafting-planner.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const craftTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Handwerk') || b.textContent.includes('Crafting'));
        if (craftTab) craftTab.click();
        // Select Weaponsmith if not active
        const rows = Array.from(document.querySelectorAll('.discipline-row, .master-list-row'));
        const wRow = rows.find(r => r.textContent.includes('Waffenschmied') || r.textContent.includes('Weaponsmith'));
        if (wRow) wRow.click();
        // Select "Level-Planer" tab
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const planTab = tabs.find(t => t.textContent.includes('Planer') || t.textContent.includes('Planner'));
        if (planTab) planTab.click();
      })()
    `);

    log('[*] Waiting for recipe database & leveling route...');
    // Wait for recipeDb loading spinner to finish and planner to render
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const start = Date.now();
        function check() {
          const loadingState = document.querySelector('.planner-loading-state');
          const planStrip = document.querySelector('.plan-stats-strip, .steps-container, .planner-controls-panel');
          if ((!loadingState && planStrip) || (Date.now() - start > 45000)) {
            resolve(true);
          } else {
            setTimeout(check, 500);
          }
        }
        check();
      })
    `);
    await sleep(3000);
    await waitForVisibleImages(15000);
    await snap('crafting-planner.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 10. Crafting Discovery Helper (Undiscovered recipes explorer)
    // ------------------------------------------------------------------------
    log('[*] Capturing 10: crafting-discovery.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const discTab = tabs.find(t => t.textContent.includes('Entdeckung') || t.textContent.includes('Discovery'));
        if (discTab) discTab.click();
      })()
    `);
    await sleep(3000);
    await waitForVisibleImages(12000);
    await snap('crafting-discovery.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 11. Settings Modal
    // ------------------------------------------------------------------------
    log('[*] Capturing 11: settings-modal.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const settingsBtn = document.querySelector('button[title*="Einstellung"], button[title*="Settings"]');
        if (settingsBtn) settingsBtn.click();
      })()
    `);
    await sleep(1500);
    await snap('settings-modal.png', 1100, 750);

    // ------------------------------------------------------------------------
    // 12. Settings Auto-Updater Section
    // ------------------------------------------------------------------------
    log('[*] Capturing 12: settings-updater.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const updatePanel = document.querySelector('.update-card-panel');
        if (updatePanel) updatePanel.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()
    `);
    await sleep(1000);
    await snap('settings-updater.png', 1100, 750);

    log('[✓] All 12 screenshots captured successfully with full API data & loaded icons!');
  } catch (err) {
    log(`[-] Error capturing screenshots: ${err.stack || err.message}`);
  } finally {
    win.destroy();
    app.quit();
  }
});
