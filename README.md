<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="160" />

# Omnitria HUD

[![Release](https://img.shields.io/badge/Release-v0.3.1-d4a359?style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Downloads](https://img.shields.io/github/downloads/Booster1212/guildwars2-omnitria/total?color=8b5cf6&label=Downloads&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square)](#installation)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

Omnitria is an open-source desktop companion and HUD overlay for Guild Wars 2. It calculates local event timers, indexes account-wide inventories, optimizes crafting paths, and recommends achievements using official read-only APIs.

<br/>

![Omnitria In-Game Overlay](docs/screenshots/Introduction.png)

</div>

## Release Changelog

<details open>
<summary><b>v0.3.1 · Crafting Route Intelligence, Unified Discovery Operations & GW2Crafts Validation</b> (Latest Release)</summary>

- **Unified Discovery & Subsequent Production Operations:**
  - Combines recipe discovery and subsequent repeat crafting into ONE single coherent leveling operation (e.g. *Discover & Craft Mighty Bronze Dagger (17x)*).
  - Explicitly communicates: 1x initial discovery producing the first item at the discovery station + 16x subsequent repeat crafts using the unlocked recipe = 17x total items produced.
  - Transparent material breakdown in expanded details without double-counting ingredients or output quantities.
- **Economic Intelligence & Level 400–500 Optimization:**
  - Excludes uncraftable precursor collection weapons (*Handcrafted*, *Experimental*, *Perfected*) and untradable account-bound components (e.g. *Ineffable Inscriptions*), dropping 400–500 leveling costs by up to 70% to match GW2Crafts.
  - Guards against illiquid Trading Post buy-order traps (e.g. expensive lodestone weapons with thin buy orders) by capping resale deductions.
  - Zero-gap 0–400 leveling paths across all 8 disciplines with balanced tier-start refinements and healthy bulk equipment.
- **Discipline Max Rank & Quest Handling:**
  - Jeweler accurately capped at rank 400, preventing invalid 400–500 route generation.
  - Chef capped at rank 450 for standard crafting routes with clear advisory for the in-game Gourmet Training questline (Seimur Oxbone).
- **Master Craftsman Vendor Catalog Fixes:**
  - Corrected official item IDs for cooking ingredients (Flour `12136`, Yeast `12152`, Vinegar `12157`, Soy Sauce `12271`, Buttermilk `12137`, Cheese Wedge `12159`, Sugar `12155`).
  - Dynamic price comparison evaluating `min(NPC, Trading Post)` without prior assumptions.
- **GW2Crafts Independent Validation & Benchmark Engine:**
  - Complete offline structural snapshot across all disciplines with live Trading Post re-pricing, comparing Omnitria routes against GW2Crafts normal guides across all tiers (0–75, 75–150, 150–225, 225–300, 300–400, 400–500).
- **GW2 Wiki Outage Audit & Offline-First Resilience:**
  - Bundled all 8 crafting discipline tango emblems locally in `public/assets/disciplines/`, eliminating external network dependencies and thumbnail 404s.
  - Three-tier icon resilience: Local Asset (0ms) -> Restored Verified Wiki CDN -> Official Render API Item Proxy.
  - Bilingual Wiki integration: routes `wiki-de.guildwars2.com` (German) and `wiki.guildwars2.com` (English) dynamically with direct 1-click lookup buttons for Materials, Achievements, and World Boss / Meta Events.
  - Added `gw2crafts.net` to Electron's external host allowlist alongside the official wikis.

</details>

<details>
<summary><b>v0.3.0 · Crafting Intelligence, Cost Optimizer & Master Craftsman NPC Integration</b></summary>

- **Max Cost Efficiency Mode (0–500):**
  - Dedicated gold quick-select button in the Crafting Planner prioritizing economical bulk production and material refinements under rank 450.
  - Refinements at tier transitions (0–25, 75–100, 150–175, etc.) heavily prioritized (Copper, Iron, Wood, Cloth, Leather).
  - Terminal decay cutoff (`f < 0.20`) and progressive decay penalties eliminate runaway loops.
- **Opportunity Costs & Resale Offsets:**
  - Evaluates liquidation value of owned materials (minus 15% TP fees) and deducts expected resale proceeds from net leveling costs.
- **Overhauled Shopping List & Column Alignment:**
  - Clean grouping into 6 milestone tiers, responsive column widths, and live price freshness indicator with manual refresh.

</details>

<details>
<summary><b>v0.2.9 · MumbleLink Live Telemetry & In-Combat Auto-Stealth</b></summary>

- **MumbleLink Live Telemetry (Shared Memory Integration):**
  - Standalone reader connects directly to Tyria's `MumbleLink` shared memory (strict read-only, 100% ArenaNet TOS compliant).
  - Automatically synchronizes the active character in the Level Planner and Inventory views with the character currently logged in and active in Guild Wars 2.
  - Highlights active World Bosses and Meta-Events on the player's current map with an emerald `📍 ON YOUR MAP` badge.
  - **In-Combat Full Auto-Stealth:** Completely hides the overlay (`opacity: 0, visibility: hidden`) and passes mouse clicks directly to the game window during combat (`uiState & 0x40`).

</details>

<details>
<summary><b>v0.2.8 · 450–500 Endgame & Performance</b></summary>

- **Crafting Level Planner (450–500 Endgame & Discovery Routes):**
  - Targeted exotic armor and weapon discoveries for bonus XP, accelerating progression from rank 450 to 500.
  - Single-craft discovery enforcement (`crafts: 1`) preventing accidental duplicate production.
  - Excluded time-gated ascended recipes (Damask, Spiritwood) from bulk leveling routes.
  - Performance optimization: full 0–500 routes computed in under 50ms across all 8 disciplines.
  - Update notification badge in the header bar for new GitHub releases.

</details>

> For complete version history, see [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Features

- **Event Timers & World Bosses:** Live countdowns for 57 world bosses and expansion meta-events based on Tyria's deterministic 2-hour UTC rotation cycle, with one-click Clipboard copying for fast-travel waypoints (`[&...]`).
- **Account-Wide Item Search:** Indexed lookup across Material Storage, Bank tabs, Shared Inventory slots, Character Bags, and Equipped Gear without double-counting items stored across multiple locations.
- **Achievement Recommendations & Total AP:** Deterministic ranking of achievements by obtainable points, completion progress, and remaining objectives across five strategies (*Best Next*, *Best Efficiency*, *Quick Wins*, *Highest Reward*, *Continue Progress*). Enforces point caps on repeatable achievements (e.g. *Agent of Entropy* at 250 AP) and calculates total account AP according to official cap rules (`min(15000, daily + monthly) + permanent`). Public metadata is browsable in Guest Mode without an API key.
- **0–500 Crafting Level Planner:** Computes lowest-cost leveling paths across all 8 crafting disciplines using community XP formulas, with automatic deductions for materials already in your account inventory.
- **Legendary Armory Trees:** Interactive component graphs and bills of materials for Gen 1, Gen 2, and Gen 3 Legendary weapons with live Black Lion Trading Post pricing and Craft-vs.-Buy toggles.
- **Overlay Modes & Hotkeys:** Full Hero Board or compact Mini-HUD docked above the in-game chat box, with global hotkeys (`F9` to toggle overlay visibility, `F10` for click-through mode) and bilingual UI (English and German).

## Screenshots

| Event Rotation Board | Achievement Recommendations |
| :---: | :---: |
| ![Event Board](docs/screenshots/hero-board.png) | ![Achievement Recommendations](docs/screenshots/achievements-hero-panel.png) |
| **Account Item Search** | **Crafting & Leveling Planner** |
| ![Account Item Search](docs/screenshots/account-item-search.png) | ![Crafting Planner](docs/screenshots/crafting-planner.png) |

## Installation

### Standalone Binary (Windows)

1. Download `Omnitria-v0.3.1-windows-x64.zip` from [GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases).
2. Extract the archive to any folder (portable, no installer required).
3. Launch `Omnitria.exe`.

> **Display Requirement:** Guild Wars 2 must run in **Windowed Fullscreen** or **Windowed** mode for the overlay to render above the game window.

### Connecting an API Key

Public event timers, crafting recipes, and achievement definitions are available immediately in Guest Mode. Connecting an official ArenaNet API key (read-only scopes: `account`, `inventories`, `characters`, `progression`, `unlocks`) enables account inventory search and personal achievement progress. Keys are stored locally and encrypted using Windows DPAPI (`safeStorage`).

## Development

Prerequisites: **Node.js 20+** and **npm**.

```bash
# Install dependencies
npm ci

# Start Vite dev server and Electron overlay concurrently
npm run overlay

# Run tests
npm test

# Check TypeScript types
npm run typecheck

# Build renderer production bundle
npm run build

# Package standalone Windows executable
npm run package:win
```

## Documentation

- [ArenaNet Policy & Compliance Review](docs/TOS_COMPLIANCE.md) — Technical audit covering read-only API access, zero memory modification, and clipboard-only integration.
- [Architecture & Data Sources](docs/DATA_SOURCES.md) — Event rotation algorithms, inventory indexing, crafting XP decay model, and caching tiers.
- [Changelog](docs/CHANGELOG.md) — Version history and release notes.

## Legal & Compliance

Guild Wars 2, ArenaNet, and all associated logos are trademarks or registered trademarks of NCsoft Corporation.

Omnitria is designed to minimize risk under ArenaNet's published third-party-program guidelines. It has not been reviewed, approved, or endorsed by ArenaNet. Use at your own risk.
