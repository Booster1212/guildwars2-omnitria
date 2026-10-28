import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// 1. Complete WvW Deprecation & Codebase Decoupling Audit
// ============================================================================
test('1.1 Zero WvW source files exist in components or data folders', () => {
  const wvwComponentsDir = path.join(projectRoot, 'src', 'components', 'wvw');
  const wvwDataDir = path.join(projectRoot, 'src', 'data', 'gw2', 'wvw');

  assert.ok(!fs.existsSync(wvwComponentsDir), 'src/components/wvw directory must be completely removed');
  assert.ok(!fs.existsSync(wvwDataDir), 'src/data/gw2/wvw directory must be completely removed');
});

test('1.2 Zero WvW navigation items or types remain in core UI modules', () => {
  const navRailPath = path.join(projectRoot, 'src', 'components', 'Gw2NavRail.tsx');
  const headerPath = path.join(projectRoot, 'src', 'components', 'Header.tsx');
  const typesPath = path.join(projectRoot, 'src', 'types.ts');

  const navRail = fs.readFileSync(navRailPath, 'utf8');
  assert.ok(!navRail.includes("'wvw'"), 'Gw2NavRail must not contain wvw tab');
  assert.ok(!navRail.includes('GlyphWvW'), 'Gw2NavRail must not contain GlyphWvW');

  const header = fs.readFileSync(headerPath, 'utf8');
  assert.ok(!header.includes("case 'wvw'"), 'Header must not contain wvw case');

  const types = fs.readFileSync(typesPath, 'utf8');
  assert.ok(!types.includes("| 'wvw'"), 'OverlayTab type must not include wvw');
});

test('1.3 Zero obsolete WvW test suites exist in tests directory', () => {
  const obsoleteTests = [
    'wvwAdvisor.test.ts',
    'wvwMapAdvisor.test.ts',
    'wvwService.test.ts',
    'wvwTranslations.test.ts',
  ];
  for (const t of obsoleteTests) {
    const fullPath = path.join(projectRoot, 'tests', t);
    assert.ok(!fs.existsSync(fullPath), `Obsolete test ${t} must be deleted`);
  }
});

test('1.4 Zero obsolete WvW screenshot files exist in docs/screenshots', () => {
  const obsoleteScreenshots = [
    'wvw-advisor.png',
    'wvw-dashboard.png',
    'wvw-flips.png',
    'wvw-map.png',
  ];
  for (const s of obsoleteScreenshots) {
    const fullPath = path.join(projectRoot, 'docs', 'screenshots', s);
    assert.ok(!fs.existsSync(fullPath), `Obsolete screenshot ${s} must be deleted`);
  }
});

// ============================================================================
// 2. OS Credential Encryption & Key Protection Audit
// ============================================================================
test('2.1 electron/main.cjs implements OS DPAPI safeStorage handlers for API keys', () => {
  const mainCjsPath = path.join(projectRoot, 'electron', 'main.cjs');
  assert.ok(fs.existsSync(mainCjsPath), 'electron/main.cjs must exist');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  assert.ok(mainContent.includes('safeStorage'), 'Must import and use safeStorage');
  assert.ok(mainContent.includes("ipcMain.handle('secure-credentials-save-key'"), 'Must handle secure-credentials-save-key');
  assert.ok(mainContent.includes("ipcMain.handle('secure-credentials-get-key'"), 'Must handle secure-credentials-get-key');
  assert.ok(mainContent.includes("ipcMain.handle('secure-credentials-clear-key'"), 'Must handle secure-credentials-clear-key');
  assert.ok(mainContent.includes("ipcMain.handle('secure-credentials-available'"), 'Must handle secure-credentials-available');
  assert.ok(mainContent.includes('safeStorage.encryptString'), 'Must call safeStorage.encryptString');
  assert.ok(mainContent.includes('safeStorage.decryptString'), 'Must call safeStorage.decryptString');
});

test('2.2 electron/preload.cjs exposes safeCredentials bridge to renderer', () => {
  const preloadPath = path.join(projectRoot, 'electron', 'preload.cjs');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');

  assert.ok(preloadContent.includes('safeCredentials:'), 'Must expose safeCredentials object');
  assert.ok(preloadContent.includes('saveApiKey:'), 'Must expose saveApiKey bridge');
  assert.ok(preloadContent.includes('getApiKey:'), 'Must expose getApiKey bridge');
  assert.ok(preloadContent.includes('clearApiKey:'), 'Must expose clearApiKey bridge');
});

test('2.3 gw2Api.ts provides secure storage utilities with graceful fallback', () => {
  const apiPath = path.join(projectRoot, 'src', 'data', 'gw2Api.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  assert.ok(apiContent.includes('storeApiKeySecurely'), 'Must export storeApiKeySecurely');
  assert.ok(apiContent.includes('retrieveApiKeySecurely'), 'Must export retrieveApiKeySecurely');
  assert.ok(apiContent.includes('clearApiKeySecurely'), 'Must export clearApiKeySecurely');
  assert.ok(apiContent.includes('getSafeCredentials'), 'Must export getSafeCredentials');
});

// ============================================================================
// 3. Electron IPC & Script Security Audit Tests
// ============================================================================
test('3.1 electron/main.cjs contains zero VBScript, WScript.Shell, or keystroke simulation', () => {
  const mainCjsPath = path.join(projectRoot, 'electron', 'main.cjs');
  assert.ok(fs.existsSync(mainCjsPath), 'electron/main.cjs must exist');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  // Verify dangerous input automation tools are completely removed
  assert.ok(!mainContent.includes('WScript.Shell'), 'WScript.Shell must be completely removed');
  assert.ok(!mainContent.includes('gw2_send.vbs'), 'VBScript file generation must be removed');
  assert.ok(!mainContent.includes('SendKeys'), 'SendKeys keystroke simulation must be removed');
  assert.ok(!mainContent.includes('AppActivate'), 'AppActivate game targeting must be removed');
  assert.ok(!mainContent.includes('sendTextToGw2'), 'Legacy sendTextToGw2 function must be removed');

  // Verify clipboard handler exists and handles errors
  assert.ok(mainContent.includes("ipcMain.handle('copy-to-clipboard'"), 'copy-to-clipboard handler must exist');
  assert.ok(mainContent.includes('clipboard.writeText'), 'Must use native Electron clipboard.writeText');

  // Verify legacy routes are defused to clipboard only
  assert.ok(mainContent.includes("ipcMain.on('gw2-send-chat'"), 'gw2-send-chat legacy listener must exist');
  assert.ok(mainContent.includes("ipcMain.on('gw2-teleport-waypoint'"), 'gw2-teleport-waypoint legacy listener must exist');
});

test('3.2 electron/main.cjs strictly validates auto-update download URLs', () => {
  const mainCjsPath = path.join(projectRoot, 'electron', 'main.cjs');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  // Check URL validation in app-apply-update
  assert.ok(
    mainContent.includes('/Booster1212/guildwars2-omnitria/releases/download/'),
    'Auto-updater must enforce official GitHub releases download prefix'
  );
  assert.ok(
    mainContent.includes('objects.githubusercontent.com'),
    'Auto-updater must allow official GitHub redirect domains'
  );
});

test('3.3 electron/main.cjs enforces webContents security rules (window-open & will-navigate)', () => {
  const mainCjsPath = path.join(projectRoot, 'electron', 'main.cjs');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  assert.ok(mainContent.includes('setWindowOpenHandler'), 'Must define window open handler');
  assert.ok(mainContent.includes('will-navigate'), 'Must define will-navigate listener to prevent external navigation');
});

test('3.4 electron/preload.cjs exposes only sanitized, safe bridge methods', () => {
  const preloadPath = path.join(projectRoot, 'electron', 'preload.cjs');
  assert.ok(fs.existsSync(preloadPath), 'electron/preload.cjs must exist');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');

  assert.ok(preloadContent.includes('contextBridge.exposeInMainWorld'), 'Must use contextBridge');
  assert.ok(preloadContent.includes('copyToClipboard'), 'Must expose copyToClipboard');
  assert.ok(!preloadContent.includes('child_process'), 'Preload must not access child_process');
});

// ============================================================================
// 4. Documentation & Compliance Claims Audit Tests
// ============================================================================
test('4.1 README.md contains no absolute guarantees or automated chat claims', () => {
  const readmePath = path.join(projectRoot, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');

  // Forbidden unverified claims
  assert.ok(!readme.includes('100% ToS-Compliant'), 'Must not claim 100% ToS-Compliant');
  assert.ok(!readme.includes('100% Safe'), 'Must not claim 100% Safe');
  assert.ok(!readme.includes('100% Policy Compliant'), 'Must not claim 100% Policy Compliant');
  assert.ok(!readme.includes('garantiert bannsicher'), 'Must not claim garantiert bannsicher');
  assert.ok(!readme.includes('ArenaNet-approved'), 'Must not claim ArenaNet-approved');
  assert.ok(!readme.includes('approved by ArenaNet'), 'Must not claim approved by ArenaNet');

  // Must accurately reflect clipboard workflow
  assert.ok(readme.includes('Clipboard Callouts') || readme.includes('Clipboard'), 'Must describe clipboard workflow');
  assert.ok(readme.includes('TOS_COMPLIANCE.md'), 'Must link to compliance guide');
});

test('4.2 docs/TOS_COMPLIANCE.md is cleanly structured into the 8 required sections and contains mandated disclaimer', () => {
  const tosPath = path.join(projectRoot, 'docs', 'TOS_COMPLIANCE.md');
  assert.ok(fs.existsSync(tosPath), 'docs/TOS_COMPLIANCE.md must exist');
  const tos = fs.readFileSync(tosPath, 'utf8');

  // Check mandated verbatim disclaimer
  const mandatedDisclaimer = "Omnitria is designed to minimize risk under ArenaNet's published third-party-program guidelines. It has not been reviewed, approved, or endorsed by ArenaNet. Use at your own risk.";
  assert.ok(tos.includes(mandatedDisclaimer), 'Must include mandated ArenaNet third-party disclaimer verbatim');

  // Check required sections (English)
  assert.ok(tos.includes('## 1. Project Scope'), 'Must contain Section 1: Project Scope');
  assert.ok(tos.includes('## 2. Technical Architecture'), 'Must contain Section 2: Technical Architecture');
  assert.ok(tos.includes('## 3. Data Sources'), 'Must contain Section 3: Data Sources');
  assert.ok(tos.includes('## 4. Game Interaction & Input Architecture'), 'Must contain Section 4: Game Interaction & Input Architecture');
  assert.ok(tos.includes('## 5. Achievement Intelligence & Informational Decision Support'), 'Must contain Section 5: Achievement Intelligence & Informational Decision Support');
  assert.ok(tos.includes('## 6. Risk Assessment & Remaining Risks'), 'Must contain Section 6: Risk Assessment & Remaining Risks');
  assert.ok(tos.includes('## 7. Official Review & Approval Status'), 'Must contain Section 7: Official Review & Approval Status');
  assert.ok(tos.includes('## 8. Compliance-Relevant Changelog'), 'Must contain Section 8: Compliance-Relevant Changelog');

  // Check absence of false guarantees
  assert.ok(!tos.includes('100% ToS-Compliant'), 'Must not contain 100% ToS-Compliant');
  assert.ok(!tos.includes('100% Safe'), 'Must not contain 100% Safe');
  assert.ok(!tos.includes('Omnitria is ban-safe'), 'Must not claim Omnitria is ban-safe');
  assert.ok(tos.includes('neither reviewed, certified, nor endorsed by ArenaNet'), 'Must clearly state lack of ArenaNet certification');
});

// ============================================================================
// 5. Source Code Secret & Credential Scanning
// ============================================================================
test('5.1 Source tree contains zero hardcoded API keys or secret credentials', () => {
  const srcFiles: string[] = [];
  function collectFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'scratch') {
          collectFiles(full);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.cjs'))) {
        srcFiles.push(full);
      }
    }
  }

  collectFiles(path.join(projectRoot, 'src'));
  collectFiles(path.join(projectRoot, 'electron'));

  // Regex pattern for 72-char GW2 API Key (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
  const gw2KeyPattern = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{20,}/i;

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!gw2KeyPattern.test(content), `File ${path.relative(projectRoot, file)} must not contain real hardcoded API keys`);
  }
});
