<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="160" />

# Omnitria HUD

[![Release](https://img.shields.io/badge/Release-v0.2.8-d4a359?style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Downloads](https://img.shields.io/github/downloads/Booster1212/guildwars2-omnitria/total?color=8b5cf6&label=Downloads&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square)](#installation)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

Omnitria is an open-source desktop companion and HUD overlay for Guild Wars 2. It calculates local event timers, indexes account-wide inventories, optimizes crafting paths, and recommends achievements using official read-only APIs.

<br/>

![Omnitria In-Game Overlay](docs/screenshots/Introduction.png)

</div>

## What's New in v0.2.9

- **MumbleLink Live Telemetry (Shared Memory Integration):**
  - **Live Game Telemetry:** Standalone reader worker connects to Tyria's `MumbleLink` shared memory (read-only, zero DLL injection or keystroke simulation).
  - **Automatic Character Synchronization:** Automatically switches active character context in the Level Planner and Inventory views to match the character currently logged in and active in Guild Wars 2.
  - **Current Map Meta-Event Highlighting:** Displays an emerald `📍 ON YOUR MAP` (`📍 DEINE KARTE`) badge and illuminated card border whenever a World Boss or Meta-Event is active on the player's current map.
  - **In-Combat Full Auto-Stealth:** Completely hides the overlay (`opacity: 0, visibility: hidden`) and passes mouse clicks directly to the game window during combat (`uiState & 0x40`), restoring visibility and controls immediately upon leaving combat.
  - **MumbleLink Settings & Live Status Panel:** Dedicated settings card with live telemetry indicators (character name, profession, current zone, combat state) and customizable toggles.

## What's New in v0.2.8

- **Crafting Level Planner (450–500 Endgame & Discovery Routes):**
  - **Active Discovery Recommendations (450/470+):** Prioritizes exotic armor and weapon discoveries for bonus XP, reducing total material and gold costs from rank 450/470 to 500.
  - **Single-Craft Discovery Enforcement:** Discovery steps are strictly bounded to 1 craft (`crafts: 1`) and marked as known, preventing accidental bulk crafting of undiscovered recipes.
  - **Preserved 0–450 Tier Progression:** Basic material refinements (ores, wood, cloth, leather) remain prioritized at each tier start (ranks 0–25, 75–100, etc.) before intermediate components or discoveries.
  - **Accurate Recipe Tracking:** Automatically synchronizes unlocked recipes from `/v2/account/recipes`, character-specific discoveries, and manual step checkmarks.
- **Crafting Calculation Stability & Fixes:**
  - **Excluded Time-Gated Ascended Recipes:** Ascended daily crafts (e.g. *Bolt of Damask*, *Glob of Elder Spirit Residue*) and account-bound ingredients are excluded from bulk leveling routes.
  - **Prevented `Infinity` / `NaN` Displays:** Added strict finite-number guards across recursive ingredient calculations, procurement costs, and progress totals.
  - **Trading Post Price Reactivity:** Added dynamic store versioning to `usePrices` so that total costs and shopping lists calculate immediately as Trading Post data arrives on startup, without requiring a manual toggle of the discovery checkbox.
  - **Performance Optimization:** Precomputed rank capabilities using typed arrays; all 9 crafting disciplines calculate full 0–500 routes in under 50ms without UI lag.
- **Update Notification Indicator:**
  - Added an update badge on the Settings gear button and a direct version pill in the top header bar when a newer release is published on GitHub.

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

1. Download `Omnitria-v0.2.9-windows-x64.zip` from [GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases).
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
