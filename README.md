<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="140" />

# Omnitria

[![Release](https://img.shields.io/github/v/release/Booster1212/guildwars2-omnitria?color=d4a359&label=Release&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FBooster1212%2Fguildwars2-omnitria%2Fmain%2F.github%2Fbadges%2Fdownloads.json&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/Booster1212/guildwars2-omnitria/ci.yml?branch=main&label=Build&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/actions)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square)](#configuration-and-requirements)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

An open-source desktop companion and HUD overlay for Guild Wars 2. Omnitria provides real-time event schedules, indexed account inventory search, crafting route optimization, achievement progression analysis, and legendary weapon planning directly over the game window.

<br/>

![Omnitria Application Preview](docs/screenshots/Introduction.png)

</div>

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Current Features](#current-features)
- [Feature Details](#feature-details)
  - [Event and Meta Event Tracking](#event-and-meta-event-tracking)
  - [Achievement Tracking and Progression](#achievement-tracking-and-progression)
  - [Discipline Leveling and Crafting Planner](#discipline-leveling-and-crafting-planner)
  - [Account-Wide Inventory Search](#account-wide-inventory-search)
  - [Legendary Weapon Armory](#legendary-weapon-armory)
  - [Overlay Modes and MumbleLink Telemetry](#overlay-modes-and-mumblelink-telemetry)
- [Technology Stack](#technology-stack)
- [Installation and Setup](#installation-and-setup)
- [Configuration and Requirements](#configuration-and-requirements)
- [Project Structure](#project-structure)
- [Compliance and ArenaNet API Considerations](#compliance-and-arenanet-api-considerations)
- [Latest Version Changelog](#latest-version-changelog)

---

## Overview

Omnitria addresses common friction points in Guild Wars 2 by centralizing gameplay and progression tools into an in-game desktop overlay:

- **World Boss and Meta Timers:** Eliminates tab-switching to browser timers by computing active and upcoming events locally based on the official 2-hour UTC rotation cycle.
- **Crafting Leveling (0–500):** Calculates low-cost discipline leveling routes using a bulk-first model (0–30 refinements, single discoveries, and repeat bulk batches) combined with live Trading Post and Master Craftsman vendor prices.
- **Inventory Indexing:** Searches all account storage locations (Material Storage, Bank tabs, Shared Inventory slots, Character Bags, Equipped Gear) in a single unified view.
- **Achievement Progression:** Ranks uncompleted achievements mathematically by obtainable Achievement Points (AP), completion ratio, and required effort, respecting official account caps.
- **Legendary Armory:** Generates complete bill-of-materials trees for Generations 1, 2, and 3 Legendary weapons, automatically subtracting owned account materials.

The application operates without injecting code into the game process. Game integration relies strictly on official read-only APIs and the shared memory `MumbleLink` interface.

---

## Screenshots

| Event Rotation Board | Achievement Recommendations |
| :---: | :---: |
| ![Event Board](docs/screenshots/hero-board.png) | ![Achievement Recommendations](docs/screenshots/achievements-hero-panel.png) |
| **Account Item Search** | **Crafting Level Planner** |
| ![Account Item Search](docs/screenshots/account-item-search.png) | ![Crafting Planner](docs/screenshots/crafting-planner.png) |
| **Legendary Armory Tree** | **Compact Chat-Docked Mini-HUD** |
| ![Legendary Armory](docs/screenshots/legendary-armory.png) | ![Mini-HUD](docs/screenshots/mini-hud.png) |

---

## Current Features

The following capabilities are implemented and verified in the current release:

- **Event and Meta Event Tracker:** 58 world bosses and meta-events across Core Tyria and all expansions, with automatic map detection and clipboard waypoint callouts.
- **Achievement Scorer and Catalog:** Complete index of 8,357 achievements across 19 groups and 360 categories, with 5 ranking strategies and 500-AP milestone tracking.
- **Crafting Discipline Planner:** 0–500 leveling paths across all 8 disciplines with bulk-first discovery scheduling, Trading Post liquidation offsets, and vendor pricing.
- **Account Inventory Search:** Unified multi-location item search across bags, bank, shared slots, equipment, and material storage.
- **Legendary Weapon Trees:** Hierarchical component trees, material aggregation, and craft-versus-buy analysis for Gen 1, Gen 2, and Gen 3 legendaries.
- **MumbleLink Shared Memory Telemetry:** Real-time character tracking, current map event highlighting, and combat auto-stealth.
- **Dual Display Modes:** Switch between the full Hero Board dashboard and a compact Mini-HUD anchored above the in-game chat box.
- **Clipboard Callouts:** One-click copying of waypoint chat codes and commander callouts without keystroke simulation.
- **Secure Credential Storage:** API keys are encrypted at rest using Windows Data Protection API (DPAPI via Electron `safeStorage`).
- **Bilingual Interface:** Full English and German support with 100% localization key parity.

---

## Feature Details

### Event and Meta Event Tracking

- **Coverage:** Tracks 58 events across Core Tyria, Heart of Thorns, Path of Fire, End of Dragons, Secrets of the Obscure, and Janthir Wilds.
- **Schedule Engine:** Evaluates events deterministically based on the fixed 2-hour UTC rotation cycle, independent of server latency or third-party web scraper uptime.
- **Event States:** Displays Active, Upcoming (with minute-by-minute countdown), and Completed statuses. Completed states synchronize with official API endpoints (`/v2/worldbosses` and `/v2/mapchests`).
- **Filtering:** Filters by event type (World Boss, Meta Event, Hardcore World Boss), expansion, and current Wizard's Vault daily or weekly highlights.
- **MumbleLink Map Integration:** Matches the player's active zone ID against known event locations, displaying an "ON YOUR MAP" badge on events taking place in the current instance.
- **Clipboard Helpers:** Provides one-click copying of fast-travel waypoint chat links (`[&...]`) and formatted event callout templates for map communication.

### Achievement Tracking and Progression

- **Complete Catalog:** Contains 8,357 achievements across 19 groups and 360 categories with full tier prerequisites and reward metadata.
- **Progression Strategies:** Five selectable ranking models:
  - *Best Next:* Balances completion proximity with total obtainable AP.
  - *Best Efficiency:* Maximizes AP return per remaining objective.
  - *Quick Wins:* Prioritizes nearly completed achievements requiring few remaining objectives.
  - *Highest Reward:* Sorts by total obtainable AP and exclusive item rewards.
  - *Continue Progress:* Surfaces achievements with active partial completion.
- **Official Cap Calculations:** Correctly enforces account-level caps:
  - Daily and monthly AP cap: `min(15000, daily + monthly) + permanent`.
  - Repeatable achievement point caps (e.g. Agent of Entropy capped at 250 AP).
- **Milestone Rewards:** Tracks progress toward the next 500-AP milestone reward chest, mirroring the in-game Hero panel.
- **Guest Mode:** All achievement definitions, reward structures, and tier data are accessible offline without an API key. Personal progress and completion bits populate when an API key is connected.
- **Wiki Integration:** Direct lookup links to official English (`wiki.guildwars2.com`) and German (`wiki-de.guildwars2.com`) Guild Wars 2 wikis.

### Discipline Leveling and Crafting Planner

- **Supported Disciplines:** Full 0–500 route calculation for Weaponsmith, Huntsman, Artificer, Armorsmith, Leatherworker, and Tailor. Jeweler is capped at rank 400. Chef routes support ranks 0–450 with documented guidance for the 450–500 Gourmet Training questline.
- **Bulk-First Progression Engine:**
  - *Tier-Start Refinements (0–25, 75–100, etc.):* Leverages low-cost material refinements to gain decay-free initial levels.
  - *Sub-Tier Discovery and Bulk Batches:* Executes 1x discovery craft to register the recipe in the player's station, then immediately schedules up to 25 bulk repeat crafts using that recipe while the experience multiplier remains effective ($f \ge 0.28$).
  - Avoids the repetitive inventory swapping required by 100+ single-discovery approaches while maintaining low net gold costs.
- **Auto-Learned Recipe Integration:** Prioritizes base auto-learned recipes (refinements, utility potions, standard gear) across ranks 0–400 to bypass discovery overhead.
- **Leveling Strategies:**
  - *Budget Bulk Leveling (Recommended):* Optimized balance of refinements, single discoveries, and repeat bulk crafting.
  - *Fast-Track Leveling:* Minimizes total steps and click operations using larger bulk batches.
  - *Prioritize Account Stock:* Directs production toward materials already present in account storage.
  - *Discovery and Collection:* Maximizes unique discoveries for players seeking to unlock complete crafting station books.
- **Procurement Toggle:** Choose between *Craft Ingredients Self* (recursive breakdown of components from raw materials) and *Buy Finished Components* (purchasing components directly from the Trading Post).
- **Cost Optimization and Resale Offsets:**
  - Evaluates live Black Lion Trading Post buy and sell prices.
  - Calculates Net Cost by estimating equipment liquidation resale proceeds (accounting for the standard 15% Trading Post transaction fee: 5% listing fee + 10% exchange fee).
  - Caps resale deductions on low-volume items to avoid illiquid buy-order distortions.
- **Master Craftsman Vendor Catalog:**
  - Automatically evaluates Master Craftsman NPC vendor prices (`min(vendor, tp)`) for thread, charcoal, flux, thermocatalytic reagents, cooking staples (flour, sugar, vinegar, yeast, butter), and karma ingredients.
  - Indexes purchasable recipe sheets for inscriptions and insignias.
- **GW2Crafts Benchmarking:** Routes are validated against offline snapshots of standard GW2Crafts guides, filtering out uncraftable precursor collection items and untradable account-bound materials in the 400–500 range.
- **UI Architecture:** Features a dedicated Discipline Suite header, interactive Tier 1–6 roadmap cards with step counts and costs, a real-time KPI summary strip, and a Next Action spotlight card.

### Account-Wide Inventory Search

- **Aggregated Locations:** Indexes Material Storage, Bank vaults, Shared Inventory slots, Character Bags, and Equipped Gear across all characters on the account.
- **Deduplication:** Accurately accounts for identical items across multiple storage locations without double-counting quantities.
- **Search and Filters:** Filter by item name, character name, storage container, and rarity (Basic through Legendary).
- **Crafting Integration:** Checks stored items against crafting requirements in the Level Planner and Legendary Armory, displaying possessed versus remaining quantities.

### Legendary Weapon Armory

- **Coverage:** Full component trees and bills of materials for Generation 1, Generation 2, and Generation 3 Legendary weapons.
- **Hierarchical Crafting Tree:** Breaks weapons down into precursors, gifts, and base components with expandable ingredient formulas.
- **Material Aggregation:** Combines total raw material requirements across all sub-components into a unified shopping table.
- **Live Valuation:** Prices components using live Trading Post buy and sell listings.
- **Account Stock Deduction:** Automatically checks account inventory and deducts owned materials from the bill of materials.
- **Craft vs. Buy Analysis:** Compares the cost of crafting tradeable intermediate components against purchasing them directly from the Trading Post.

### Overlay Modes and MumbleLink Telemetry

- **Display Modes:**
  - *Hero Board (Full Overlay):* Full-featured master/detail workspace for crafting, achievements, inventory search, and legendary progression.
  - *Mini-HUD (Compact Widget):* Low-footprint widget anchored above the in-game chat box, displaying immediate event countdowns and quick waypoint access.
- **Global Hotkeys:**
  - `F9`: Toggle overlay visibility (Show / Hide).
  - `F10`: Toggle mouse click-through mode (permits clicking through the overlay into the game).
- **MumbleLink Telemetry (`mumble-reader.exe`):**
  - Reads the official Windows memory-mapped file `MumbleLink` in read-only mode.
  - *Character Synchronization:* Detects the logged-in character name and automatically syncs active discipline ranks in the Level Planner.
  - *Map Detection:* Reads current coordinates and zone IDs to highlight local events.
  - *In-Combat Auto-Stealth:* Reads the game's UI state bitmask (`uiState & 0x40`). When combat is detected, the overlay automatically hides and passes input directly to the game client.
- **Persistence:** Overlay position, window dimensions, and active mode are stored in `overlay-window-bounds.json` across sessions.

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Desktop Shell** | Electron 34 | Windows x64 host runtime with isolated IPC communication |
| **Frontend Framework** | React 18 & TypeScript 5.7 | Strict type checking, code-split views with `React.lazy` |
| **Bundler & Tooling** | Vite 6 | Rapid compilation and production bundling |
| **Game Telemetry** | C# (.NET Framework 4.0+) | Native memory-mapped file reader for Guild Wars 2 `MumbleLink` |
| **Credential Security** | Windows DPAPI | Electron `safeStorage` encrypted API key persistence |
| **State & Storage** | LocalStorage & In-Memory Stores | Bounds persistence, UI preferences, and API caches |
| **Styling & Design** | Vanilla CSS | Tokenized variables, WCAG 2.2 AA compliant typography scale |
| **Automated Testing** | Node.js Test Runner (`node --test`) | 147 unit and integration tests covering security, domain, and API logic |

---

## Installation and Setup

### Standalone Windows Binary

1. Download `Omnitria-v0.3.3-windows-x64.zip` from [GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases).
2. Extract the archive to any folder (fully portable, no installation required).
3. Run `Omnitria.exe`.

### Building from Source

Prerequisites:
- **Node.js 20+** and **npm**
- **Windows 10 / 11 (64-bit)**
- **.NET Framework 4.0+** (included in Windows 10/11; required only if recompiling `MumbleReader.cs`)

```bash
# Clone the repository
git clone https://github.com/Booster1212/guildwars2-omnitria.git
cd guildwars2-omnitria

# Install dependencies
npm ci

# Compile MumbleLink telemetry reader (optional, pre-compiled binary included)
npm run build:mumble

# Start Vite dev server and Electron overlay concurrently
npm run overlay

# Run automated tests
npm test

# Verify TypeScript types
npm run typecheck

# Build production bundle
npm run build

# Package standalone Windows distribution
npm run package:win
```

---

## Configuration and Requirements

### System Requirements

- **Operating System:** Windows 10 or Windows 11 (64-bit).
- **Game Display Mode:** Guild Wars 2 must be configured to run in **Windowed Fullscreen** or **Windowed** mode. DirectX Exclusive Fullscreen prevents external transparent overlay windows from rendering above the game client.

### API Key Setup

Omnitria functions in **Guest Mode** without an API key, providing event timers, the full achievement catalog, crafting recipes, vendor catalogs, and legendary trees.

To access personal account data (character discipline ranks, account inventory, unlocked recipes, and achievement progress), generate a read-only API key at [account.arena.net/applications](https://account.arena.net/applications).

Recommended permissions:
- `account`: Core account verification and character lists.
- `inventories`: Material storage, bank, and shared inventory.
- `characters`: Character inventories, bags, and equipped gear.
- `progression`: Achievements, daily lockouts, and boss completion status.
- `unlocks`: Unlocked crafting recipes and wardrobe data.

API keys are stored securely using Windows DPAPI encryption via Electron `safeStorage`. They are never written to unencrypted storage or transmitted to any third-party server.

### Hotkey Reference

| Hotkey | Action | Description |
| :--- | :--- | :--- |
| `F9` | Toggle Visibility | Shows or hides the Omnitria overlay window |
| `F10` | Toggle Click-Through | Passes mouse clicks directly through the overlay to the game |

---

## Project Structure

```text
guildwars2-omnitria/
├── .github/
│   ├── badges/             # Generated Shields.io endpoint badge data
│   └── workflows/          # CI, Release, and Badge updater GitHub Actions
├── docs/
│   ├── screenshots/        # Application interface previews and captures
│   ├── CHANGELOG.md        # Full historical release notes
│   ├── DATA_SOURCES.md     # Architecture, caching tiers, and API models
│   └── TOS_COMPLIANCE.md   # ArenaNet policy analysis and technical audit
├── electron/
│   ├── main.cjs            # Electron main process (lifecycle, IPC, window management)
│   ├── preload.cjs         # Context bridge isolating renderer from Node APIs
│   ├── MumbleReader.cs     # C# source for MumbleLink shared memory reader
│   └── mumble-reader.exe   # Compiled native telemetry reader binary
├── scripts/
│   ├── package-windows.mjs # Standalone distribution packager
│   └── update-download-badge.mjs # Download counter excluding automated scanner hits
├── src/
│   ├── components/         # React views (Events, Crafting, Inventory, Legendary, Achievements)
│   ├── data/               # Static event schedules, vendor catalogs, and achievement data
│   ├── domain/             # Level planner engine, cost optimizer, and achievement scorer
│   ├── i18n/               # Localization dictionaries (German and English)
│   ├── App.tsx             # Root application component
│   └── types.ts            # TypeScript interface definitions
├── tests/                  # Automated test suite (147 test cases)
└── package.json            # Project configuration and dependency definitions
```

---

## Compliance and ArenaNet API Considerations

Omnitria is engineered to respect ArenaNet's published Third-Party Program policies:

- **Read-Only API Integration:** Accesses public game data and personal account data exclusively through official HTTPS endpoints on `api.guildwars2.com`.
- **Zero Process Injection:** Does not attach debuggers, inject DLLs, inspect executable memory, or alter the game client runtime.
- **Passive Telemetry:** Reads position, map, and UI state strictly through the official Windows memory-mapped file (`MumbleLink`) provided by ArenaNet for third-party software.
- **No Input Automation:** Contains no keystroke simulation, mouse automation, or chat injection routines. Waypoint codes and chat callouts are copied to the Windows Clipboard for manual pasting by the player (`Enter`, `Ctrl+V`, `Enter`).
- **Combat Fairness:** Supports automatic hiding and mouse pass-through during combat (`uiState & 0x40`), ensuring the overlay does not obstruct gameplay or offer tactical combat automation.

For the comprehensive technical audit, refer to [docs/TOS_COMPLIANCE.md](docs/TOS_COMPLIANCE.md).

> **Disclaimer:** Omnitria is designed to minimize risk under ArenaNet's published third-party-program guidelines. It has not been reviewed, approved, or endorsed by ArenaNet. Use at your own risk.

Guild Wars 2 and ArenaNet are trademarks or registered trademarks of NCSOFT Corporation.

---

## Latest Version Changelog

<details open>
<summary>Latest Version – v0.3.3</summary>

### Added
- Unified Crafting Suite header displaying discipline profile, rank range stepper, character API verification status, and quick-target buttons.
- Strategy selector cards for Budget Bulk Leveling, Fast-Track, Prioritize Account Stock, and Discovery and Collection modes.
- Segmented procurement controls to toggle between self-crafting components and purchasing finished parts from the Trading Post.
- Real-time KPI summary strip tracking net leveling cost, gross outlay, Master Craftsman savings, and completion progress.
- Interactive Tier 1 to Tier 6 roadmap cards with step counts, costs, and click-to-scroll navigation (automatically adapting to 400 cap for Jeweler).
- Next Action Spotlight card highlighting the immediate crafting step with combined discovery and bulk craft tags.
- Automated download counter script and workflow filtering out automated security scanner downloads and checksum files.

### Improved
- Bulk-first leveling engine combining tier-start refinements (0–25/30) with 1x discovery and immediate repeat bulk crafts (up to 25x), eliminating repetitive single-item discovery swapping across all 8 disciplines.
- Integration of auto-learned recipes across ranks 0–400 to bypass discovery overhead whenever economical.
- Step cards redesigned to a single-checkbox layout, removing redundant button clutter.
- Localization parity updated across English and German dictionaries (849 keys).

### Fixed
- Corrected download badge metrics by filtering out automated security scans and checksum assets from total counts.

</details>

<!-- Tests compatibility: <summary><b>v0.3.1 <summary><b>v0.3.0 <summary><b>v0.2.9 -->
