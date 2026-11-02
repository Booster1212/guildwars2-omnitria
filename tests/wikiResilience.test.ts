import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { wikiSearchUrl, wikiArticleUrl } from '../src/data/external.ts';
import { DISCIPLINE_ICONS, DISCIPLINE_WIKI_ICONS, DISCIPLINE_ICON_ITEM } from '../src/components/common/labels.ts';
import type { DisciplineId } from '../src/domain/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const ALL_DISCIPLINES: DisciplineId[] = [
  'Armorsmith',
  'Weaponsmith',
  'Artificer',
  'Jeweler',
  'Leatherworker',
  'Tailor',
  'Chef',
  'Huntsman',
];

// ============================================================================
// 1. Language-Aware Wiki URLs
// ============================================================================
test('1.1 wikiSearchUrl produces correct German and English wiki search links', () => {
  const deUrl = wikiSearchUrl('Mächtiger Bronzedolch', 'de');
  assert.strictEqual(
    deUrl,
    'https://wiki-de.guildwars2.com/index.php?search=M%C3%A4chtiger%20Bronzedolch',
    'German searches must target wiki-de.guildwars2.com with properly encoded characters'
  );

  const enUrl = wikiSearchUrl('Mighty Bronze Dagger', 'en');
  assert.strictEqual(
    enUrl,
    'https://wiki.guildwars2.com/index.php?search=Mighty%20Bronze%20Dagger',
    'English searches must target wiki.guildwars2.com with properly encoded characters'
  );

  // Default parameter fallback is English
  const defaultUrl = wikiSearchUrl('Tequatl the Sunless');
  assert.strictEqual(
    defaultUrl,
    'https://wiki.guildwars2.com/index.php?search=Tequatl%20the%20Sunless',
    'Default language for wikiSearchUrl must be en'
  );
});

test('1.2 wikiArticleUrl produces correct direct article links', () => {
  const deArticle = wikiArticleUrl('Großschwert', 'de');
  assert.strictEqual(
    deArticle,
    'https://wiki-de.guildwars2.com/wiki/Gro%C3%9Fschwert',
    'German articles must target wiki-de.guildwars2.com/wiki/'
  );

  const enArticle = wikiArticleUrl('Crafting', 'en');
  assert.strictEqual(
    enArticle,
    'https://wiki.guildwars2.com/wiki/Crafting',
    'English articles must target wiki.guildwars2.com/wiki/'
  );

  const spacedArticle = wikiArticleUrl('Claw of Jormag', 'en');
  assert.strictEqual(
    spacedArticle,
    'https://wiki.guildwars2.com/wiki/Claw_of_Jormag',
    'Spaces should be converted to underscores for direct wiki articles'
  );
});

// ============================================================================
// 2. Offline-First Discipline Assets & Fallback Resilience
// ============================================================================
test('2.1 DISCIPLINE_ICONS maps all 8 disciplines to bundled local assets', () => {
  for (const disc of ALL_DISCIPLINES) {
    const iconPath = DISCIPLINE_ICONS[disc];
    assert.ok(iconPath, `Discipline ${disc} must have an icon path defined`);
    assert.strictEqual(
      iconPath,
      `./assets/disciplines/${disc.toLowerCase()}.png`,
      `Discipline ${disc} must point to local bundled asset`
    );

    // Verify physical file exists in public/assets/disciplines
    const fullDiskPath = path.join(projectRoot, 'public', 'assets', 'disciplines', `${disc.toLowerCase()}.png`);
    assert.ok(fs.existsSync(fullDiskPath), `Bundled asset must exist on disk: ${fullDiskPath}`);

    const stat = fs.statSync(fullDiskPath);
    assert.ok(stat.size > 5000, `Asset ${disc} must be a valid PNG image (> 5 KB, got ${stat.size} bytes)`);
  }
});

test('2.2 DISCIPLINE_WIKI_ICONS contains verified restored wiki URLs as secondary fallback', () => {
  for (const disc of ALL_DISCIPLINES) {
    const wikiUrl = DISCIPLINE_WIKI_ICONS[disc];
    assert.ok(wikiUrl, `Discipline ${disc} must have a wiki fallback URL`);
    assert.ok(
      wikiUrl.startsWith('https://wiki.guildwars2.com/images/'),
      `Wiki fallback URL for ${disc} must target wiki.guildwars2.com/images/`
    );
    assert.ok(wikiUrl.endsWith('.png'), `Wiki fallback URL for ${disc} must be a PNG image`);
  }
});

test('2.3 DISCIPLINE_ICON_ITEM contains official API item proxies as tertiary fallback', () => {
  for (const disc of ALL_DISCIPLINES) {
    const itemId = DISCIPLINE_ICON_ITEM[disc];
    assert.ok(typeof itemId === 'number' && itemId > 0, `Discipline ${disc} must map to a valid proxy item ID`);
  }
});

// ============================================================================
// 3. Electron Security Host Allowlists
// ============================================================================
test('3.1 electron/main.cjs allows wiki and external crafting domains in EXTERNAL_HOSTS', () => {
  const mainCjsPath = path.join(projectRoot, 'electron', 'main.cjs');
  assert.ok(fs.existsSync(mainCjsPath), 'electron/main.cjs must exist');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  assert.ok(mainContent.includes("'wiki.guildwars2.com'"), 'Must allow English wiki domain');
  assert.ok(mainContent.includes("'wiki-de.guildwars2.com'"), 'Must allow German wiki domain');
  assert.ok(mainContent.includes("'gw2crafts.net'"), 'Must allow gw2crafts.net domain');
  assert.ok(mainContent.includes("'account.arena.net'"), 'Must allow ArenaNet account domain');
});

test('3.2 index.html CSP permits self and wiki image sources', () => {
  const htmlPath = path.join(projectRoot, 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(htmlContent.includes("img-src 'self'"), 'CSP must allow self image source for bundled assets');
  assert.ok(htmlContent.includes('https://wiki.guildwars2.com'), 'CSP must allow wiki image fallback');
  assert.ok(htmlContent.includes('https://render.guildwars2.com'), 'CSP must allow ArenaNet render CDN');
});
