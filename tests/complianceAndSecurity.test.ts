import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeNextPollInterval,
  isWvwDataStale,
  WVW_STALENESS_THRESHOLD_MS,
  buildCombinedObjectives,
} from '../src/data/gw2/wvw/wvwService.ts';
import { evaluateObjective, generateTacticalRecommendations } from '../src/data/gw2/wvw/advisor.ts';
import type { WvwMatch, WvwStaticObjective, WvwCombinedObjective } from '../src/data/gw2/wvw/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// 1. WvW Staleness, Backoff & Error Tolerance Tests
// ============================================================================
test('1.1 WvW Staleness Threshold is configured to 90 seconds', () => {
  assert.equal(WVW_STALENESS_THRESHOLD_MS, 90_000);
});

test('1.2 isWvwDataStale accurately identifies stale data', () => {
  const now = Date.now();
  assert.equal(isWvwDataStale(null), true, 'null timestamp must be flagged as stale');
  assert.equal(isWvwDataStale(now - 10_000), false, '10s old data is fresh');
  assert.equal(isWvwDataStale(now - 89_000), false, '89s old data is fresh');
  assert.equal(isWvwDataStale(now - 91_000), true, '91s old data must be flagged as stale');
  assert.equal(isWvwDataStale(now - 300_000), true, '5m old data must be flagged as stale');
});

test('1.3 computeNextPollInterval applies progressive exponential backoff on errors', () => {
  // Normal poll (0 failures) -> 30s
  assert.equal(computeNextPollInterval(0), 30_000);
  // 1 failure -> 45s
  assert.equal(computeNextPollInterval(1), 45_000);
  // 2 failures -> 60s
  assert.equal(computeNextPollInterval(2), 60_000);
  // 3 failures -> 120s
  assert.equal(computeNextPollInterval(3), 120_000);
  // 4+ failures -> capped at 300s (5 minutes), preventing infinite rapid retry loops
  assert.equal(computeNextPollInterval(4), 300_000);
  assert.equal(computeNextPollInterval(10), 300_000);
});

test('1.4 buildCombinedObjectives gracefully handles missing and malformed data', () => {
  const staticMap = new Map<string, WvwStaticObjective>();
  assert.deepEqual(buildCombinedObjectives(null, staticMap), []);

  const emptyMatch: WvwMatch = {
    id: 'test',
    start_time: '',
    end_time: '',
    scores: { red: 0, blue: 0, green: 0 },
    kills: { red: 0, blue: 0, green: 0 },
    deaths: { red: 0, blue: 0, green: 0 },
    worlds: { red: 1, blue: 2, green: 3 },
    all_worlds: { red: [1], blue: [2], green: [3] },
    maps: [],
  };
  assert.deepEqual(buildCombinedObjectives(emptyMatch, staticMap), []);
});

// ============================================================================
// 2. WvW Tactical Assistant Transparency & Honest Estimation Tests
// ============================================================================
test('2.1 evaluateObjective explicitly marks results as estimated and documents data sources', () => {
  const mockCombined: WvwCombinedObjective = {
    id: '38-9',
    name: 'Schloss Steinnebel',
    type: 'Castle',
    mapType: 'Center',
    mapId: 38,
    coord: [10000, 10000, 0],
    chatLink: '[&DAkAAAAmAAAA]',
    owner: 'Blue',
    lastFlipped: null,
    pointsTick: 12,
    pointsCapture: 12,
    claimedBy: null,
    claimedAt: null,
    guildInfo: null,
    yaksDelivered: 0,
    guildUpgrades: [],
    upgradeLevel: 0,
    isRiActive: false,
    riSecondsRemaining: 0,
    secondsSinceFlip: null,
  };

  const mockMatch: WvwMatch = {
    id: '2-1',
    start_time: '2026-10-23T18:00:00Z',
    end_time: '2026-10-30T18:00:00Z',
    scores: { red: 100, blue: 300, green: 200 },
    kills: { red: 10, blue: 20, green: 15 },
    deaths: { red: 15, blue: 10, green: 12 },
    worlds: { red: 2007, blue: 2011, green: 2001 },
    all_worlds: { red: [2007], blue: [2011], green: [2001] },
    maps: [],
  };

  const mockConfig = {
    weights: { strategicValue: 1, tierDecay: 1, leaderCurbing: 1, distancePenalty: 1 },
    playerTeam: 'Red' as const,
    ignoredObjectiveIds: [],
    pinnedObjectiveIds: [],
    filterMap: 'all' as const,
    filterType: 'all' as const,
  };

  const rec = evaluateObjective(
    mockCombined,
    mockMatch,
    mockConfig,
    'de',
    undefined,
    new Date(),
    true // isStale
  );

  assert.ok(rec, 'Must produce a recommendation');
  assert.ok(rec.dataSource.includes('GW2-API') || rec.dataSource.includes('GW2 API'), 'Must declare public REST API source');
  assert.equal(rec.isEstimated, true, 'Must declare that score is an algorithmic estimate');
  assert.equal(rec.isStale, true, 'Must mirror staleness state');
  assert.ok(rec.lastUpdated instanceof Date);
  assert.ok(rec.reasons.length > 0, 'Must document rationale behind priority');
  assert.ok(rec.reasonsEn.length > 0);
});

test('2.2 generateTacticalRecommendations safely returns empty list on empty inputs', () => {
  const mockMatch: WvwMatch = {
    id: 'test',
    start_time: '',
    end_time: '',
    scores: { red: 0, blue: 0, green: 0 },
    kills: { red: 0, blue: 0, green: 0 },
    deaths: { red: 0, blue: 0, green: 0 },
    worlds: { red: 1, blue: 2, green: 3 },
    all_worlds: { red: [1], blue: [2], green: [3] },
    maps: [],
  };
  const mockConfig = {
    weights: { strategicValue: 1, tierDecay: 1, leaderCurbing: 1, distancePenalty: 1 },
    playerTeam: 'Red' as const,
    ignoredObjectiveIds: [],
    pinnedObjectiveIds: [],
    filterMap: 'all' as const,
    filterType: 'all' as const,
  };
  const result = generateTacticalRecommendations([], mockMatch, mockConfig);
  assert.deepEqual(result.topRecommendations, []);
  assert.deepEqual(result.allRanked, []);
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
  assert.ok(!readme.includes('encrypted application storage'), 'Must not falsely claim encrypted storage for plain localStorage');

  // Must accurately reflect clipboard workflow
  assert.ok(readme.includes('Clipboard Callouts'), 'Must describe clipboard callouts');
  assert.ok(readme.includes('TOS_COMPLIANCE.md'), 'Must link to compliance guide');
});

test('4.2 docs/TOS_COMPLIANCE.md is cleanly structured into the 8 required sections', () => {
  const tosPath = path.join(projectRoot, 'docs', 'TOS_COMPLIANCE.md');
  assert.ok(fs.existsSync(tosPath), 'docs/TOS_COMPLIANCE.md must exist');
  const tos = fs.readFileSync(tosPath, 'utf8');

  // Check required sections (English)
  assert.ok(tos.includes('## 1. Project Scope'), 'Must contain Section 1: Project Scope');
  assert.ok(tos.includes('## 2. Technical Architecture'), 'Must contain Section 2: Technical Architecture');
  assert.ok(tos.includes('## 3. Data Sources'), 'Must contain Section 3: Data Sources');
  assert.ok(tos.includes('## 4. Game Interaction & Input Architecture'), 'Must contain Section 4: Game Interaction & Input Architecture');
  assert.ok(tos.includes('## 5. World vs. World (WvW) Tactical Features'), 'Must contain Section 5: World vs. World (WvW) Tactical Features');
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
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
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
