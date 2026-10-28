import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  markIconUrlFailed,
  isIconUrlFailed,
  clearFailedIconUrls,
} from '../src/data/gw2/items.ts';
import { TRANSLATIONS } from '../src/i18n/index.ts';
import {
  evaluateEventDailyWeekly,
  getDailyRotationEventIds,
  getWeeklyRotationEventIds,
} from '../src/domain/dailyWeeklyEvents.ts';
import { EVENTS } from '../src/data/events.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

function extractCssVar(css: string, varName: string): string {
  const re = new RegExp(`${varName}\\s*:\\s*([^;]+);`);
  const match = css.match(re);
  if (!match) {
    throw new Error(`Missing CSS variable ${varName}`);
  }
  return match[1].trim();
}

const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
const mainCjsContent = fs.readFileSync(path.join(ROOT_DIR, 'electron/main.cjs'), 'utf8');

test('1.1 WCAG 2.2 AA Contrast: primary and body text exceed 9.5:1 on base and panel surfaces', () => {
  const bgBase = extractCssVar(cssContent, '--gw2-bg-base');
  const bgPanel = extractCssVar(cssContent, '--gw2-bg-panel');
  const textBright = extractCssVar(cssContent, '--gw2-text-bright');
  const textBody = extractCssVar(cssContent, '--gw2-text-body');

  assert.ok(contrastRatio(textBright, bgBase) >= 12);
  assert.ok(contrastRatio(textBright, bgPanel) >= 11);
  assert.ok(contrastRatio(textBody, bgBase) >= 10);
  assert.ok(contrastRatio(textBody, bgPanel) >= 9.5);
});

test('1.2 WCAG 2.2 AA Contrast: --gw2-text-dim passes 4.5:1 AA on both base and panel backgrounds', () => {
  const bgBase = extractCssVar(cssContent, '--gw2-bg-base');
  const bgPanel = extractCssVar(cssContent, '--gw2-bg-panel');
  const textDim = extractCssVar(cssContent, '--gw2-text-dim');

  assert.ok(
    contrastRatio(textDim, bgBase) >= 4.5,
    `Expected --gw2-text-dim (${textDim}) on ${bgBase} >= 4.5:1, got ${contrastRatio(textDim, bgBase).toFixed(2)}:1`
  );
  assert.ok(
    contrastRatio(textDim, bgPanel) >= 4.5,
    `Expected --gw2-text-dim (${textDim}) on ${bgPanel} >= 4.5:1, got ${contrastRatio(textDim, bgPanel).toFixed(2)}:1`
  );
});

test('1.3 WCAG 2.2 AA Contrast: --gw2-gold and --gw2-text-muted meet AA / 3:1 thresholds', () => {
  const bgBase = extractCssVar(cssContent, '--gw2-bg-base');
  const bgPanel = extractCssVar(cssContent, '--gw2-bg-panel');
  const gold = extractCssVar(cssContent, '--gw2-gold');
  const textMuted = extractCssVar(cssContent, '--gw2-text-muted');

  assert.ok(contrastRatio(gold, bgBase) >= 6.5);
  assert.ok(contrastRatio(gold, bgPanel) >= 6.0);
  assert.ok(contrastRatio(textMuted, bgBase) >= 3.0);
  assert.ok(contrastRatio(textMuted, bgPanel) >= 3.0);
});

test('2.1 Typography Scale: defines semantic typography tokens in :root', () => {
  assert.equal(extractCssVar(cssContent, '--text-2xs'), '11px');
  assert.equal(extractCssVar(cssContent, '--text-xs'), '12px');
  assert.equal(extractCssVar(cssContent, '--text-sm'), '13px');
  assert.equal(extractCssVar(cssContent, '--text-base'), '14px');
  assert.equal(extractCssVar(cssContent, '--text-md'), '15px');
  assert.equal(extractCssVar(cssContent, '--text-lg'), '17px');
  assert.equal(extractCssVar(cssContent, '--text-xl'), '20px');
});

test('2.2 Keyboard Accessibility: checkbox inputs remain focusable and provide :focus-visible outlines', () => {
  assert.ok(!/\.chk\s+input\[type="checkbox"\]\s*\{\s*display:\s*none/i.test(cssContent));
  assert.ok(cssContent.includes('.chk input[type="checkbox"]:focus-visible + .chk-box'));
  assert.ok(cssContent.includes('button:focus-visible'));
});

test('2.3 Layout & Button Primitives: defines flex utilities, .btn, and search-box icon positioning', () => {
  assert.ok(cssContent.includes('.flex { display: flex; }'));
  assert.ok(cssContent.includes('.items-center { align-items: center; }'));
  assert.ok(cssContent.includes('.justify-between { justify-content: space-between; }'));
  assert.ok(cssContent.includes('.btn {'));
  assert.ok(cssContent.includes('.gw2-achieve-search-box .search-icon'));
});

test('3.1 Asset Caching: enables Chromium HTTP disk cache in electron/main.cjs', () => {
  assert.ok(!mainCjsContent.includes("appendSwitch('disable-http-cache')"));
  assert.ok(mainCjsContent.includes("appendSwitch('disk-cache-size'"));
});

test('3.2 Icon Deduplication: tracks and deduplicates failed icon URLs across ItemIcon mounts', () => {
  clearFailedIconUrls();
  const brokenUrl = 'https://render.guildwars2.com/file/BROKEN/00000.png';
  assert.equal(isIconUrlFailed(brokenUrl), false);
  markIconUrlFailed(brokenUrl);
  assert.equal(isIconUrlFailed(brokenUrl), true);
  clearFailedIconUrls();
  assert.equal(isIconUrlFailed(brokenUrl), false);
});

test('4.1 Localization Parity: maintains 100% key parity between German and English dictionaries', () => {
  const deKeys = Object.keys(TRANSLATIONS.de).sort();
  const enKeys = Object.keys(TRANSLATIONS.en).sort();
  assert.deepEqual(enKeys, deKeys);
});

test('5.1 Daily/Weekly Event Highlighting: matches live Wizards Vault Daily & Weekly objectives', () => {
  const tequatl = EVENTS.find((e) => e.id === 'tequatl');
  assert.ok(tequatl, 'Expected Tequatl in EVENTS');

  const mockDailyProgression = {
    worldBosses: [],
    mapChests: [],
    wizardsVault: {
      meta_progress_current: 1,
      meta_progress_complete: 4,
      meta_reward_claimed: false,
      objectives: [
        {
          id: 101,
          title: 'Defeat Tequatl the Sunless',
          track: 'PvE',
          acclaim: 10,
          progress_current: 0,
          progress_complete: 1,
          claimed: false,
        },
      ],
    },
    wizardsVaultWeekly: {
      meta_progress_current: 2,
      meta_progress_complete: 6,
      meta_reward_claimed: false,
      objectives: [
        {
          id: 202,
          title: 'Complete 10 Events in the Heart of Maguuma',
          track: 'PvE',
          acclaim: 50,
          progress_current: 4,
          progress_complete: 10,
          claimed: false,
        },
      ],
    },
    lastSynced: Date.now(),
  };

  const teqMatch = evaluateEventDailyWeekly(tequatl, mockDailyProgression, 'de');
  assert.equal(teqMatch.isDaily, true);
  assert.equal(teqMatch.dailySource, 'wizards_vault');
  assert.ok(teqMatch.dailyLabel.includes('+10 AA'));

  const chakGerent = EVENTS.find((e) => e.id === 'chak-gerent');
  assert.ok(chakGerent, 'Expected Chak Gerent in EVENTS');
  const chakMatch = evaluateEventDailyWeekly(chakGerent, mockDailyProgression, 'de');
  assert.equal(chakMatch.isWeekly, true);
  assert.equal(chakMatch.weeklySource, 'wizards_vault');
  assert.ok(chakMatch.weeklyLabel.includes('+50 AA'));
});

test('5.2 Daily/Weekly Event Highlighting: provides deterministic UTC daily and weekly rotation spotlights', () => {
  const fixedDate = new Date('2026-10-28T12:00:00Z');
  const dailyIds = getDailyRotationEventIds(fixedDate);
  const weeklyIds = getWeeklyRotationEventIds(fixedDate);

  assert.ok(dailyIds.has('ley-line-anomaly'), 'Ley-Line Anomaly is always a daily Mystic Coin spotlight');
  assert.ok(dailyIds.size >= 4, 'Expected at least 4 daily spotlight events');
  assert.ok(weeklyIds.size >= 4, 'Expected at least 4 weekly spotlight events');
});
