<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="160" />

# Omnitria HUD

[![Release](https://img.shields.io/badge/Release-v0.2.7-d4a359?style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Downloads](https://img.shields.io/github/downloads/Booster1212/guildwars2-omnitria/total?color=8b5cf6&label=Downloads&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square)](#installation)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

Omnitria is an open-source desktop companion and HUD overlay for Guild Wars 2. It calculates local event timers, indexes account-wide inventories, optimizes crafting paths, and recommends achievements using official read-only APIs.

<br/>

![Omnitria In-Game Overlay](docs/screenshots/Introduction.png)

</div>

## What's New in v0.2.7

- 🔔 **Visual Update Indicator & Background Notification Service:**
  - **Settings Icon Notification Dots:** Pulsing amber glowing notification dots appear automatically on the settings gear buttons in both the top header controls and the bottom left navigation rail whenever a newer GitHub release is detected.
  - **Header Quick-Action Pill:** An eye-catching, clickable `[✨ Update vX.X.X]` pill badge appears in the top header bar (visible in both Full Hero Panel and compact Mini-HUD modes) providing instant 1-click access to the updater.
  - **Navigation Rail Badge:** A golden `UPDATE` pill badge is displayed directly under the Settings navigation label with subtle amber border lighting.
  - **Automated Background Checks:** A non-blocking background check runs 2.5s after application launch and recurs every 30 minutes, keeping users informed without needing to open the Settings menu manually.
  - **Robust SemVer Comparison Service:** Implemented pure numeric semver comparison logic (`parseSemver` & `isNewerVersion`) in `src/domain/updateChecker.ts` with 100% unit test coverage.
- 🛠️ **Crafting Level Planner & Shopping List Overhaul:**
  - **Account-Bound & Untradable Material Logic:** Fixed an optimizer flaw where unpriced or account-bound materials (e.g. *Bloodstone Dust*, *Obsidian Shards*, *Marauder Inscriptions*) were scored with a dummy fallback price, falsely making high-requirement recipes look virtually free. Unowned untradable materials now incur an unbuyable penalty, prioritizing viable, tradeable recipes.
  - **Recursive Crafting for Untradable Intermediates:** Intermediate components with valid crafting recipes are now recursively routed to craft from base materials instead of being treated as impossible Trading Post purchases.
  - **Clear Untradable Badges & Advisory Banners:** The shopping list and material demand tables prominently flag untradable items with `[Accountgebunden]` / `[Nicht handelbar]` warning badges (`⚠️`) and display an advisory banner reminding players that these items must come from personal account storage or direct gameplay.
  - **Master Craftsman Vendor Pricing:** Added automatic fallback pricing for common vendor reagents (Thermocatalytic Reagents, Spool of Silk Thread, Lump of Coal, etc.).
- 👑 **Official Omnitria Brand Identity:** High-resolution brand logo integrated directly into the top header navigation and native Windows taskbar icon integration with multi-resolution `.ico` and `AppUserModelId`.
- 🎨 **Hero Panel & UI/UX Polish:** Expanded 98px navigation rail, standardized 32px interactive controls, enhanced typography, and authentic in-game Guild Wars 2 Hero Panel style for achievement tracking.

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

1. Download `Omnitria-v0.2.7-windows-x64.zip` from [GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases).
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
