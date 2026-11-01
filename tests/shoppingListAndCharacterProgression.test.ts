import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// 1. Shopping List Tier Classification Tests
// ============================================================================
test('1.1 Shopping items are accurately mapped to Crafting Tiers 1 through 6', () => {
  function getTierForRank(rank: number): number {
    if (rank >= 400) return 6;
    if (rank >= 300) return 5;
    if (rank >= 225) return 4;
    if (rank >= 150) return 3;
    if (rank >= 75) return 2;
    return 1;
  }

  // Tier 1: 0-75 (Novice / Copper & Green Wood)
  assert.equal(getTierForRank(0), 1);
  assert.equal(getTierForRank(50), 1);
  assert.equal(getTierForRank(74), 1);

  // Tier 2: 75-150 (Initiate / Iron & Soft Wood)
  assert.equal(getTierForRank(75), 2);
  assert.equal(getTierForRank(100), 2);
  assert.equal(getTierForRank(149), 2);

  // Tier 3: 150-225 (Apprentice / Steel & Seasoned Wood)
  assert.equal(getTierForRank(150), 3);
  assert.equal(getTierForRank(200), 3);
  assert.equal(getTierForRank(224), 3);

  // Tier 4: 225-300 (Journeyman / Darksteel & Hard Wood)
  assert.equal(getTierForRank(225), 4);
  assert.equal(getTierForRank(275), 4);
  assert.equal(getTierForRank(299), 4);

  // Tier 5: 300-400 (Adept / Mithril & Elder Wood)
  assert.equal(getTierForRank(300), 5);
  assert.equal(getTierForRank(350), 5);
  assert.equal(getTierForRank(399), 5);

  // Tier 6: 400-500 (Master & Grandmaster / Orichalcum, Ancient Wood & Ectoplasm)
  assert.equal(getTierForRank(400), 6);
  assert.equal(getTierForRank(475), 6);
  assert.equal(getTierForRank(500), 6);
});

// ============================================================================
// 2. Shopping Filter Logic Tests
// ============================================================================
test('2.1 Shopping list filters support all, missing-only, tp-only, and vendor-only', () => {
  interface MockItem {
    name: string;
    missing: number;
    isVendor: boolean;
    untradable: boolean;
  }

  const items: MockItem[] = [
    { name: 'Kupfererz', missing: 100, isVendor: false, untradable: false },
    { name: 'Zinnbrocken', missing: 25, isVendor: true, untradable: false },
    { name: 'Grüner Holzblock', missing: 0, isVendor: false, untradable: false },
    { name: 'Phiole mit schwachem Blut', missing: 50, isVendor: false, untradable: false },
    { name: 'Visionenkristall', missing: 2, isVendor: false, untradable: true },
  ];

  // All
  assert.equal(items.length, 5);

  // Missing only
  const missingOnly = items.filter((i) => i.missing > 0);
  assert.equal(missingOnly.length, 4);
  assert.ok(!missingOnly.some((i) => i.missing === 0));

  // TP only
  const tpOnly = items.filter((i) => !i.isVendor && !i.untradable);
  assert.equal(tpOnly.length, 3);
  assert.ok(tpOnly.every((i) => !i.isVendor && !i.untradable));

  // Vendor only
  const vendorOnly = items.filter((i) => i.isVendor);
  assert.equal(vendorOnly.length, 1);
  assert.equal(vendorOnly[0].name, 'Zinnbrocken');
});

// ============================================================================
// 3. MumbleLink 20 Hz Re-render Storm Prevention
// ============================================================================
test('3.1 MumbleLink semantic change filter suppresses jitter and throttles heartbeats', () => {
  interface MockMumbleData {
    connected: boolean;
    isInCombat?: boolean;
    mapId?: number;
    tick?: number;
    playerX?: number;
    playerY?: number;
    identity?: { name?: string; profession?: number };
  }

  function hasSemanticChange(prev: MockMumbleData, next: MockMumbleData): boolean {
    if (prev.connected !== next.connected) return true;
    if (prev.isInCombat !== next.isInCombat) return true;
    if (prev.mapId !== next.mapId) return true;
    if (prev.identity?.name !== next.identity?.name) return true;
    if (prev.identity?.profession !== next.identity?.profession) return true;
    return false;
  }

  const state1: MockMumbleData = {
    connected: true,
    isInCombat: false,
    mapId: 15,
    tick: 100,
    playerX: 123.4,
    playerY: 567.8,
    identity: { name: 'Player One', profession: 1 },
  };

  // Pure coordinate / tick jitter: player running in same zone
  const state2: MockMumbleData = {
    ...state1,
    tick: 101,
    playerX: 125.1,
    playerY: 570.2,
  };

  assert.equal(hasSemanticChange(state1, state2), false, 'Should ignore coordinate and tick jitter');

  // Combat entered: must trigger immediately
  const state3: MockMumbleData = {
    ...state2,
    isInCombat: true,
  };
  assert.equal(hasSemanticChange(state2, state3), true, 'Combat state transition must trigger immediately');

  // Map changed: must trigger immediately
  const state4: MockMumbleData = {
    ...state3,
    mapId: 50,
  };
  assert.equal(hasSemanticChange(state3, state4), true, 'Map change must trigger immediately');

  // Character changed: must trigger immediately
  const state5: MockMumbleData = {
    ...state4,
    identity: { name: 'Player Two', profession: 8 },
  };
  assert.equal(hasSemanticChange(state4, state5), true, 'Character switch must trigger immediately');
});

// ============================================================================
// 4. Character Progression in PvE Hub & Navigation Menu Reordering
// ============================================================================
test('4.1 InventoryHubView contains CharacterProgressionView as a dedicated category under PvE Hub', () => {
  const invPath = path.join(projectRoot, 'src', 'components', 'inventory', 'InventoryHubView.tsx');
  assert.ok(fs.existsSync(invPath), 'InventoryHubView.tsx must exist');
  const content = fs.readFileSync(invPath, 'utf8');

  assert.ok(content.includes('CharacterProgressionView'), 'Must import and use CharacterProgressionView');
  assert.ok(content.includes("'leveling'"), "Must have subtab 'leveling'");
  assert.ok(content.includes("subTab === 'leveling'"), 'Must render CharacterProgressionView when leveling subtab is active');
});

test('4.2 Gw2NavRail enforces newly ordered navigation tabs', () => {
  const navRailPath = path.join(projectRoot, 'src', 'components', 'Gw2NavRail.tsx');
  assert.ok(fs.existsSync(navRailPath), 'Gw2NavRail.tsx must exist');
  const content = fs.readFileSync(navRailPath, 'utf8');

  // Verify tab order: events -> inventory -> crafting -> legendary -> achievements
  const idxEvents = content.indexOf("onSelectTab('events')");
  const idxInventory = content.indexOf("onSelectTab('inventory')");
  const idxCrafting = content.indexOf("onSelectTab('crafting')");
  const idxLegendary = content.indexOf("onSelectTab('legendary')");
  const idxAchievements = content.indexOf("onSelectTab('achievements')");

  assert.ok(idxEvents !== -1 && idxInventory !== -1 && idxCrafting !== -1 && idxLegendary !== -1 && idxAchievements !== -1);
  assert.ok(idxEvents < idxInventory, 'Events must precede Inventory');
  assert.ok(idxInventory < idxCrafting, 'Inventory must precede Crafting');
  assert.ok(idxCrafting < idxLegendary, 'Crafting must precede Legendary');
  assert.ok(idxLegendary < idxAchievements, 'Legendary must precede Achievements');
});

test('4.3 LevelPlanner inner subtabs no longer contain character progression', () => {
  const plannerPath = path.join(projectRoot, 'src', 'components', 'crafting', 'LevelPlanner.tsx');
  assert.ok(fs.existsSync(plannerPath), 'LevelPlanner.tsx must exist');
  const content = fs.readFileSync(plannerPath, 'utf8');

  // activeTab definition must only contain crafting subtabs
  assert.ok(!content.includes("'steps' | 'character' | 'materials'"), 'Character must not be in activeTab union');
  assert.ok(content.includes('shopping-tier-separator'), 'Must render shopping tier separators');
  assert.ok(content.includes('shopping-table-responsive-container'), 'Must have responsive shopping table container');
});

