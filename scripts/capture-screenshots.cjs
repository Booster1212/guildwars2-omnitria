const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '../docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

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
  await sleep(1500);

  async function snap(filename, width = 1200, height = 800) {
    win.setSize(width, height);
    await sleep(400);
    const img = await win.webContents.capturePage();
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, img.toPNG());
    console.log(`[+] Captured: ${filename} (${width}x${height})`);
  }

  try {
    // 1. Events Full Hero Board
    console.log('[*] Snapping events...');
    await win.webContents.executeJavaScript(`
      document.querySelector('button[title*="Event"]') && document.querySelector('button[title*="Event"]').click();
    `);
    await sleep(600);
    await snap('hero-board.png', 1100, 750);

    // 2. Events Active / Soon Filter
    await win.webContents.executeJavaScript(`
      const activeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Aktiv') || b.textContent.includes('Active'));
      if (activeBtn) activeBtn.click();
    `);
    await sleep(600);
    await snap('events-active.png', 1100, 750);

    // 3. Mini-HUD (Over-Chat Mode)
    console.log('[*] Snapping mini-hud...');
    await win.webContents.executeJavaScript(`
      const widgetBtn = document.querySelector('button[title*="Modus"], button[title*="Widget"], button[title*="In-Game"]');
      if (widgetBtn) widgetBtn.click();
    `);
    await sleep(600);
    await snap('mini-hud.png', 440, 340);

    // Zurück in Vollmodus
    await win.webContents.executeJavaScript(`
      const expandBtn = document.querySelector('button[title*="Voll"], button[title*="Expand"], button[title*="Hero Board"]');
      if (expandBtn) expandBtn.click();
    `);
    win.setSize(1100, 750);
    await sleep(600);

    // 4. Achievements Hero Panel
    console.log('[*] Snapping achievements...');
    await win.webContents.executeJavaScript(`
      const achTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Erfolge') || b.textContent.includes('Achievements'));
      if (achTab) achTab.click();
    `);
    await sleep(800);
    await snap('achievements-hero-panel.png', 1100, 750);

    // 5. Achievements Categories / World Bosses
    await win.webContents.executeJavaScript(`
      const wbCat = Array.from(document.querySelectorAll('.ach-cat-btn, button')).find(b => b.textContent.includes('Weltbosse') || b.textContent.includes('World Bosses'));
      if (wbCat) wbCat.click();
    `);
    await sleep(600);
    await snap('achievements-detail.png', 1100, 750);

    // 6. Crafting Level Planner
    console.log('[*] Snapping crafting...');
    await win.webContents.executeJavaScript(`
      const craftTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Handwerk') || b.textContent.includes('Crafting'));
      if (craftTab) craftTab.click();
    `);
    await sleep(800);
    await snap('crafting-planner.png', 1100, 750);

    // 7. Crafting Discovery Helper
    await win.webContents.executeJavaScript(`
      const discBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Entdeckung') || b.textContent.includes('Discovery'));
      if (discBtn) discBtn.click();
    `);
    await sleep(600);
    await snap('crafting-discovery.png', 1100, 750);

    // 8. Legendary Armory Overview
    console.log('[*] Snapping legendary...');
    await win.webContents.executeJavaScript(`
      const legTab = Array.from(document.querySelectorAll('.nav-rail-item')).find(b => b.textContent.includes('Legendär') || b.textContent.includes('Legendary'));
      if (legTab) legTab.click();
    `);
    await sleep(800);
    await snap('legendary-armory.png', 1100, 750);

    // 9. Legendary Mystic Forge Tree (z.B. erste Waffe anklicken)
    await win.webContents.executeJavaScript(`
      const weaponCard = document.querySelector('.weapon-card, .legendary-item-card, .weapon-grid-item, .weapon-tile');
      if (weaponCard) weaponCard.click();
    `);
    await sleep(800);
    await snap('legendary-tree.png', 1100, 750);

    // 10. Settings & Auto-Updater Modal
    console.log('[*] Snapping settings...');
    await win.webContents.executeJavaScript(`
      const settingsBtn = document.querySelector('.settings-item, button[title*="Einstellung"], button[title*="Settings"]');
      if (settingsBtn) settingsBtn.click();
    `);
    await sleep(800);
    await snap('settings-modal.png', 1100, 750);

    // 11. Settings Auto-Updater Section Focus
    await win.webContents.executeJavaScript(`
      const updatePanel = document.querySelector('.update-card-panel');
      if (updatePanel) updatePanel.scrollIntoView();
    `);
    await sleep(500);
    await snap('settings-updater.png', 1100, 750);

    console.log('[✓] All screenshots successfully captured!');
  } catch (err) {
    console.error('[-] Error capturing screenshots:', err);
  } finally {
    win.destroy();
    app.quit();
  }
});
