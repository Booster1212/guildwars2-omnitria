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
    return { ok: false, status: 0, error: 'URL not allowed' };
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

ipcMain.handle('app-get-version', () => '0.1.8');
ipcMain.handle('app-check-update', async () => ({
  ok: true,
  currentVersion: '0.1.8',
  latestVersion: '0.1.8',
  latestTag: 'v0.1.8',
  hasUpdate: false,
  releaseName: 'Omnitria v0.1.8',
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

function buildSeedStoragePayload() {
  const now = Date.now();
  const todayStr = new Date(now).toISOString().slice(0, 10);

  const accountInfo = {
    id: 'A1B2C3D4-E5F6-7890-ABCD-1234567890AB',
    name: 'ArcaneCommander.4812',
    age: 9842000,
    world: 2007, // Far Shiverpeaks
    guilds: [],
    created: '2018-04-14T12:00:00Z',
    access: ['GuildWars2', 'HeartOfThorns', 'PathOfFire', 'EndOfDragons', 'SecretsOfTheObscure', 'JanthirWilds'],
    commander: true,
    fractal_level: 100,
    daily_ap: 15000,
    monthly_ap: 0,
    wvw_rank: 1485,
  };

  const dailyProgression = {
    worldBosses: ['tequatl_the_sunless', 'the_shatterer', 'shadow_behemoth'],
    mapChests: ['auric_basin_heros_choice_chest', 'tangled_depths_heros_choice_chest'],
    wizardsVault: {
      meta_progress_current: 3,
      meta_progress_complete: 4,
      meta_reward_astral: 30,
      meta_reward_claimed: false,
      objectives: [
        {
          id: 1,
          title: 'Capture 2 World vs. World Camps or Towers',
          track: 'WvW',
          acclaim: 10,
          progress_current: 2,
          progress_complete: 2,
          claimed: true,
        },
        {
          id: 2,
          title: 'Defeat 1 World Boss or Meta Event Boss',
          track: 'PvE',
          acclaim: 10,
          progress_current: 1,
          progress_complete: 1,
          claimed: true,
        },
        {
          id: 3,
          title: 'Craft 3 Masterwork or Higher Items',
          track: 'PvE',
          acclaim: 10,
          progress_current: 3,
          progress_complete: 3,
          claimed: true,
        },
        {
          id: 4,
          title: 'Earn 1,500 World Experience in WvW',
          track: 'WvW',
          acclaim: 10,
          progress_current: 1120,
          progress_complete: 1500,
          claimed: false,
        },
      ],
    },
    lastSynced: now,
  };

  const accountData = {
    syncedAt: now,
    accountName: 'ArcaneCommander.4812',
    permissions: ['account', 'inventories', 'characters', 'wallet', 'unlocks', 'progression', 'builds'],
    stock: [
      [19721, 500], // Glob of Ectoplasm
      [19976, 340], // Mystic Coin
      [19675, 77],  // Mystic Clover
      [19677, 2],   // Gift of Battle
      [19678, 2],   // Gift of Exploration
      [71581, 440], // Memory of Battle
      [24295, 250], // Vial of Powerful Blood
      [24358, 230], // Ancient Bone
      [24357, 200], // Vicious Fang
      [24289, 220], // Armored Scale
      [24351, 190], // Vicious Claw
      [24283, 240], // Powerful Venom Sac
      [24277, 420], // Pile of Crystalline Dust
      [19700, 600], // Mithril Ore
      [19684, 340], // Mithril Ingot
      [19701, 330], // Orichalcum Ore
      [19685, 230], // Orichalcum Ingot
      [19725, 310], // Ancient Wood Log
      [19729, 370], // Thick Leather Section
      [19748, 450], // Silk Scrap
    ],
    breakdown: {
      19721: [250, 180, 25, 45],
      19976: [250, 25, 65, 0],
      19675: [52, 14, 11, 0],
      19677: [0, 1, 0, 1],
      19678: [0, 2, 0, 0],
      71581: [250, 190, 0, 0],
      24295: [210, 0, 0, 40],
      24358: [195, 0, 0, 35],
      24357: [180, 0, 0, 20],
      24289: [220, 0, 0, 0],
      24351: [165, 25, 0, 0],
      24283: [240, 0, 0, 0],
      24277: [250, 120, 50, 0],
      19700: [250, 250, 0, 100],
      19684: [250, 0, 0, 90],
      19701: [250, 0, 0, 80],
      19685: [190, 40, 0, 0],
      19725: [250, 0, 0, 60],
      19729: [250, 0, 0, 120],
      19748: [250, 0, 0, 200],
    },
    characterBreakdown: {
      19721: { 'Lyra Dawnblade': 30, 'Kaelen Shadowstep': 15 },
      19677: { 'Lyra Dawnblade': 1 },
      24295: { 'Lyra Dawnblade': 40 },
      24358: { 'Kaelen Shadowstep': 35 },
      24357: { 'Veyra Stormcaller': 20 },
      19700: { 'Taimi Sparkwright': 100 },
      19684: { 'Lyra Dawnblade': 90 },
      19701: { 'Kaelen Shadowstep': 80 },
      19725: { 'Veyra Stormcaller': 60 },
      19729: { 'Kaelen Shadowstep': 120 },
      19748: { 'Taimi Sparkwright': 200 },
    },
    characters: [
      {
        name: 'Lyra Dawnblade',
        race: 'Human',
        gender: 'Female',
        profession: 'Guardian',
        level: 80,
        age: 5112000,
        created: '2018-04-14T12:00:00Z',
        deaths: 142,
        crafting: [
          { discipline: 'Armorsmith', rating: 500, active: true },
          { discipline: 'Weaponsmith', rating: 500, active: true },
        ],
        bagCount: 6,
        bagSlotsTotal: 120,
        bagSlotsUsed: 84,
        bagItems: [
          [19721, 30],
          [19677, 1],
          [24295, 40],
          [19684, 90],
        ],
        equipment: [
          [30689, 'WeaponA1'], // Eternity
          [30699, 'WeaponB1'], // Bolt
          [76158, 'WeaponB2'], // Astralaria
        ],
      },
      {
        name: 'Kaelen Shadowstep',
        race: 'Sylvari',
        gender: 'Male',
        profession: 'Thief',
        level: 80,
        age: 3096000,
        created: '2019-09-20T16:30:00Z',
        deaths: 89,
        crafting: [
          { discipline: 'Leatherworker', rating: 500, active: true },
          { discipline: 'Huntsman', rating: 465, active: true },
        ],
        bagCount: 5,
        bagSlotsTotal: 100,
        bagSlotsUsed: 58,
        bagItems: [
          [19721, 15],
          [24358, 35],
          [19701, 80],
          [19729, 120],
        ],
        equipment: [
          [30687, 'WeaponA1'], // Incinerator
          [30686, 'WeaponB1'], // The Dreamer
        ],
      },
      {
        name: 'Veyra Stormcaller',
        race: 'Norn',
        gender: 'Female',
        profession: 'Elementalist',
        level: 80,
        age: 2304000,
        created: '2020-11-05T19:15:00Z',
        deaths: 64,
        crafting: [
          { discipline: 'Tailor', rating: 500, active: true },
          { discipline: 'Artificer', rating: 500, active: true },
        ],
        bagCount: 5,
        bagSlotsTotal: 100,
        bagSlotsUsed: 46,
        bagItems: [
          [24357, 20],
          [19725, 60],
        ],
        equipment: [
          [30698, 'WeaponA1'], // The Bifrost
          [30695, 'WeaponB1'], // Meteorologicus
        ],
      },
      {
        name: 'Taimi Sparkwright',
        race: 'Asura',
        gender: 'Female',
        profession: 'Engineer',
        level: 80,
        age: 1476000,
        created: '2022-02-28T09:45:00Z',
        deaths: 31,
        crafting: [
          { discipline: 'Jeweler', rating: 400, active: true },
          { discipline: 'Chef', rating: 500, active: true },
        ],
        bagCount: 5,
        bagSlotsTotal: 100,
        bagSlotsUsed: 62,
        bagItems: [
          [19700, 100],
          [19748, 200],
        ],
        equipment: [
          [30693, 'WeaponA1'], // Quip
          [30694, 'WeaponB1'], // The Predator
        ],
      },
    ],
    wallet: [
      [1, 4852400], // 485g 24s
      [2, 1845000], // Karma
      [3, 148],     // Laurels
      [7, 6420],    // Fractal Relics
      [15, 4820],   // Badges of Honor
      [23, 1420],   // Spirit Shards
      [26, 2145],   // WvW Skirmish Claim Tickets
      [61, 8400],   // Research Notes
      [68, 3250],   // Imperial Favor
    ],
    knownRecipes: [1001, 1002, 1003, 1004],
    armory: [
      [30689, 1],
      [30699, 1],
      [30687, 1],
      [30698, 1],
    ],
    crafting: {
      Armorsmith: { rating: 500, character: 'Lyra Dawnblade' },
      Weaponsmith: { rating: 325, character: 'Lyra Dawnblade' },
      Leatherworker: { rating: 500, character: 'Kaelen Shadowstep' },
      Huntsman: { rating: 465, character: 'Kaelen Shadowstep' },
      Tailor: { rating: 500, character: 'Veyra Stormcaller' },
      Artificer: { rating: 500, character: 'Veyra Stormcaller' },
      Jeweler: { rating: 400, character: 'Taimi Sparkwright' },
      Chef: { rating: 500, character: 'Taimi Sparkwright' },
    },
    errors: {},
  };

  const progressState = {
    version: 1,
    savedAt: now,
    tracked: [30684, 30692], // Frostfang & The Juggernaut tracked for multi-goal planning
    legendary: {
      '30684': { doneNodes: [], doneMaterials: [], buyItems: [] },
      '30692': { doneNodes: [], doneMaterials: [], buyItems: [] },
    },
    crafting: {
      Weaponsmith: {
        target: 500,
        start: 325,
        doneSteps: [],
        allowDiscovery: false,
        craftIntermediates: false,
      },
      Huntsman: {
        target: 500,
        start: 465,
        doneSteps: [],
        allowDiscovery: false,
        craftIntermediates: false,
      },
    },
    eventCompletions: {
      'tequatl': 24,
      'shatterer': 18,
      'shadow-behemoth': 31,
      'tarir-octovine': 42,
      'chak-gerent': 29,
      'dragons-stand': 14,
    },
    dailyCompletedDates: {
      'tequatl': todayStr,
      'shatterer': todayStr,
      'tarir-octovine': todayStr,
    },
  };

  const settings = {
    language: 'en',
    apiKey: '',
    opacity: 95,
    alwaysOnTop: true,
    soundEnabled: true,
    leadTimeMinutes: 10,
    widgetMode: 'expanded',
    sortMode: 'time',
  };

  const pinnedAchievements = ['wb-tequatl', 'hot-octovine', 'eod-dragons-end'];

  return {
    gw2_overlay_lang: 'en',
    gw2_overlay_settings: JSON.stringify(settings),
    gw2_overlay_account_cache: JSON.stringify(accountInfo),
    gw2_overlay_daily_cache: JSON.stringify(dailyProgression),
    gw2_overlay_account_data_v1: JSON.stringify(accountData),
    gw2_overlay_progress_v1: JSON.stringify(progressState),
    gw2_pinned_achievements: JSON.stringify(pinnedAchievements),
  };
}

app.whenReady().then(async () => {
  const seedPayload = buildSeedStoragePayload();
  // Also write progress_v1 to the file store so the IPC mirror matches our seeded state
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(path.join(storeDir, 'progress_v1.json'), seedPayload.gw2_overlay_progress_v1, 'utf8');

  const win = new BrowserWindow({
    width: 1180,
    height: 780,
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

  // Inject English locale and seeded account/inventory/progression preview state, then reload
  await win.webContents.executeJavaScript(`
    (() => {
      const payload = ${JSON.stringify(seedPayload)};
      for (const [k, v] of Object.entries(payload)) {
        localStorage.setItem(k, v);
      }
    })()
  `);
  await win.reload();
  log('[*] App reloaded with English UI & seeded account/inventory/WvW state...');
  await sleep(4000);

  async function waitForVisibleImages(timeoutMs = 15000) {
    const res = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
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

          const allLoaded = imgs.length === 0 || imgs.every(i => i.complete && i.naturalWidth > 0);
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

  async function snap(filename, width = 1180, height = 780) {
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
        const allChip = Array.from(document.querySelectorAll('.category-chip')).find(b => b.textContent.trim().toLowerCase() === 'all');
        if (allChip) allChip.click();
      })()
    `);
    await sleep(1500);
    await waitForVisibleImages(6000);
    await snap('hero-board.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 2. Events Active & Expanded Boss Tactics, Defiance Bar & Loot
    // ------------------------------------------------------------------------
    log('[*] Capturing 2: events-active.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const firstCard = document.querySelector('.gw2-event-card');
        if (firstCard) {
          const detailsBtn = firstCard.querySelector('button.gw2-details-toggle-btn');
          if (detailsBtn) detailsBtn.click();
          const achBtn = firstCard.querySelector('button.gw2-achieve-pill-btn');
          if (achBtn) achBtn.click();
        }
      })()
    `);
    await sleep(2500);
    await waitForVisibleImages(8000);
    await snap('events-active.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 3. Compact Mini-HUD (Over-Chat Mode)
    // ------------------------------------------------------------------------
    log('[*] Capturing 3: mini-hud.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const miniBtn = document.querySelector('button[title*="Compact"], button[title*="Mini"]');
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
        const expandBtn = document.querySelector('button[title*="Expanded"], button[title*="Hero Board"]');
        if (expandBtn) expandBtn.click();
      })()
    `);
    win.setSize(1180, 780);
    await sleep(1200);

    // ------------------------------------------------------------------------
    // 4. Account-Wide Item Search (NEW)
    // ------------------------------------------------------------------------
    log('[*] Capturing 4: account-item-search.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const invTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Inventory') || b.textContent.includes('PvE'));
        if (invTab) invTab.click();
      })()
    `);
    await sleep(3000);
    await waitForVisibleImages(12000);
    await snap('account-item-search.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 5. Character & Inventory Overview (NEW)
    // ------------------------------------------------------------------------
    log('[*] Capturing 5: character-inventory.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const subTabs = Array.from(document.querySelectorAll('.inv-hub-tab-btn, .wvw-subnav-btn'));
        const charTab = subTabs.find(b => b.textContent.includes('Characters'));
        if (charTab) charTab.click();
      })()
    `);
    await sleep(2500);
    await waitForVisibleImages(10000);
    await snap('character-inventory.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 6. PvE Progression Hub (NEW)
    // ------------------------------------------------------------------------
    log('[*] Capturing 6: pve-progression.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const subTabs = Array.from(document.querySelectorAll('.inv-hub-tab-btn'));
        const pveTab = subTabs.find(b => b.textContent.includes('PvE Goals') || b.textContent.includes('Progression'));
        if (pveTab) pveTab.click();
      })()
    `);
    await sleep(3500);
    await waitForVisibleImages(12000);
    await snap('pve-progression.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 7. Achievements Hero Panel (Watchlist & Daily Milestones)
    // ------------------------------------------------------------------------
    log('[*] Capturing 7: achievements-hero-panel.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const achTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Achievements'));
        if (achTab) achTab.click();
        const allTab = Array.from(document.querySelectorAll('.achieve-tab-btn')).find(b => b.textContent.includes('All'));
        if (allTab) allTab.click();
      })()
    `);
    await sleep(2000);
    await waitForVisibleImages(6000);
    await snap('achievements-hero-panel.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 8. Achievements Detail (World Bosses category with expanded checklist)
    // ------------------------------------------------------------------------
    log('[*] Capturing 8: achievements-detail.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const wbTab = Array.from(document.querySelectorAll('.achieve-tab-btn')).find(b => b.textContent.includes('World'));
        if (wbTab) wbTab.click();
        const firstObjBtn = document.querySelector('.btn-toggle-objectives');
        if (firstObjBtn) firstObjBtn.click();
      })()
    `);
    await sleep(2000);
    await waitForVisibleImages(6000);
    await snap('achievements-detail.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 9. Legendary Armory (Overview with Gen 1, 2, 3 weapons)
    // ------------------------------------------------------------------------
    log('[*] Capturing 9: legendary-armory.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const legTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Legendary'));
        if (legTab) legTab.click();
      })()
    `);
    await sleep(3000);
    await waitForVisibleImages(15000);
    await snap('legendary-armory.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 10. Legendary Craft Tree (Twilight 4 Mystic Forge branches)
    // ------------------------------------------------------------------------
    log('[*] Capturing 10: legendary-tree.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const rows = Array.from(document.querySelectorAll('.weapon-row'));
        const twilightRow = rows.find(r => r.textContent.includes('Twilight')) || rows[0];
        if (twilightRow) twilightRow.click();
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const treeTab = tabs.find(t => t.textContent.includes('Tree'));
        if (treeTab) treeTab.click();
      })()
    `);
    await sleep(3500);
    await waitForVisibleImages(15000);
    await snap('legendary-tree.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 11. Legendary Materials BOM (Bill of Materials with location breakdown)
    // ------------------------------------------------------------------------
    log('[*] Capturing 11: legendary-materials.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const matTab = tabs.find(t => t.textContent.includes('Material') || t.textContent.includes('BOM'));
        if (matTab) matTab.click();
      })()
    `);
    await sleep(3000);
    await waitForVisibleImages(12000);
    await snap('legendary-materials.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 12. Crafting Level Planner (Weaponsmith leveling route)
    // ------------------------------------------------------------------------
    log('[*] Capturing 12: crafting-planner.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const craftTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Crafting'));
        if (craftTab) craftTab.click();
        const rows = Array.from(document.querySelectorAll('.discipline-row, .master-list-row'));
        const wRow = rows.find(r => r.textContent.includes('Weaponsmith'));
        if (wRow) wRow.click();
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const planTab = tabs.find(t => t.textContent.includes('Planner'));
        if (planTab) planTab.click();
      })()
    `);

    log('[*] Waiting for recipe database & leveling route...');
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
    await snap('crafting-planner.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 13. Crafting Discovery Helper (Undiscovered recipes explorer)
    // ------------------------------------------------------------------------
    log('[*] Capturing 13: crafting-discovery.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.detail-tabs-strip .gw2-tab-btn, .detail-tabs-strip button'));
        const discTab = tabs.find(t => t.textContent.includes('Discovery'));
        if (discTab) discTab.click();
      })()
    `);
    await sleep(3000);
    await waitForVisibleImages(12000);
    await snap('crafting-discovery.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 14. WvW Tactical Overview (Central WvW Information Center)
    // ------------------------------------------------------------------------
    log('[*] Capturing 14: wvw-advisor.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const wvwTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('WvW'));
        if (wvwTab) wvwTab.click();
      })()
    `);
    await sleep(4000);
    await waitForVisibleImages(8000);
    await snap('wvw-advisor.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 15. WvW Tactical Map
    // ------------------------------------------------------------------------
    log('[*] Capturing 15: wvw-map.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const subTabs = Array.from(document.querySelectorAll('.wvw-tab-btn'));
        const mapTab = subTabs.find(b => b.textContent.includes('Tactical Map') || b.textContent.includes('Map'));
        if (mapTab) mapTab.click();
      })()
    `);
    await sleep(2000);
    await snap('wvw-map.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 16. WvW Match Dashboard
    // ------------------------------------------------------------------------
    log('[*] Capturing 16: wvw-dashboard.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const subTabs = Array.from(document.querySelectorAll('.wvw-tab-btn'));
        const dashTab = subTabs.find(b => b.textContent.includes('Dashboard'));
        if (dashTab) dashTab.click();
      })()
    `);
    await sleep(2000);
    await snap('wvw-dashboard.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 17. WvW Observed Flips
    // ------------------------------------------------------------------------
    log('[*] Capturing 17: wvw-flips.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const subTabs = Array.from(document.querySelectorAll('.wvw-tab-btn'));
        const flipsTab = subTabs.find(b => b.textContent.includes('Flips'));
        if (flipsTab) flipsTab.click();
      })()
    `);
    await sleep(1500);
    await snap('wvw-flips.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 18. Settings Modal
    // ------------------------------------------------------------------------
    log('[*] Capturing 18: settings-modal.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const settingsBtn = document.querySelector('button[title*="Settings"]');
        if (settingsBtn) settingsBtn.click();
      })()
    `);
    await sleep(1500);
    await snap('settings-modal.png', 1180, 780);

    // ------------------------------------------------------------------------
    // 19. Settings Auto-Updater Section
    // ------------------------------------------------------------------------
    log('[*] Capturing 19: settings-updater.png...');
    await win.webContents.executeJavaScript(`
      (() => {
        const updatePanel = document.querySelector('.update-card-panel');
        if (updatePanel) updatePanel.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()
    `);
    await sleep(1000);
    await snap('settings-updater.png', 1180, 780);

    log('[✓] All 19 screenshots captured successfully with English UI, full API data & loaded icons!');
  } catch (err) {
    log(`[-] Error capturing screenshots: ${err.stack || err.message}`);
  } finally {
    win.destroy();
    app.quit();
  }
});
