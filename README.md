<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="170" />

# ✨ Omnitria • Guild Wars 2 In-Game Overlay & Companion

[![Latest Release](https://img.shields.io/badge/Release-v0.2.0-d4a359?style=for-the-badge&logo=github)](https://github.com/Booster1212/guildwars2-omnitria/releases/tag/v0.2.0)
[![GitHub Downloads](https://img.shields.io/github/downloads/Booster1212/guildwars2-omnitria/total?color=8b5cf6&label=Downloads&style=for-the-badge)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![CI Pipeline](https://img.shields.io/github/actions/workflow/status/Booster1212/guildwars2-omnitria/ci.yml?branch=main&label=CI%20Status&color=22c55e&style=for-the-badge)](https://github.com/Booster1212/guildwars2-omnitria/actions)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?logo=windows&style=for-the-badge)](#-system-requirements)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Bilingual](https://img.shields.io/badge/Language-English%20%7C%20Deutsch-orange?style=for-the-badge)](#-controls--shortcuts)

<br/>

![Omnitria In-Game Overlay](docs/screenshots/Introduction.png)

<br/>

**Omnitria** is a desktop companion and in-game HUD overlay for **Guild Wars 2**.  
Hovering above your in-game chat box as a compact mini-HUD or expanding into a full Hero Board, Omnitria brings event timers, account-wide item search, character inventory awareness, multi-goal PvE progression planning, 0–500 crafting optimization, Legendary weapon trees, and a WvW tactical overview into a single cohesive window.

[📥 Download v0.2.0 (Windows)](https://github.com/Booster1212/guildwars2-omnitria/releases/tag/v0.2.0) • [🛡️ ArenaNet ToS Compliance](docs/TOS_COMPLIANCE.md) • [📖 Architecture & Data Sources](docs/DATA_SOURCES.md) • [📋 Changelog](docs/CHANGELOG.md) • [🎮 Quick Start](#-quick-start--installation) • [💬 Controls](#-controls--shortcuts)

</div>

> [!TIP]
> ### 🚀 What's New in Omnitria v0.2.0
> * **✨ Daily & Weekly Event Highlights (`Event Timers` & `Mini-HUD`):** Live Wizard's Vault Daily & Weekly objective matching (`/v2/account/wizardsvault/daily` and `/v2/account/wizardsvault/weekly`) directly on event cards with Astral Acclaim (`+AA`) badges, completion status, and deterministic daily Mystic Coin spotlighting (*Ley-Line Anomaly*).
> * **🧭 Interactive Level & Progression Planner Overhaul (`Crafting & Disciplines`):** Features a clear Progression Overview & Recommended Next Action card, 4 personalized planning modes (*Fast Leveling*, *Balanced Progression*, *Completionist*, *Goal-Oriented*), stage-grouped crafting steps with inline **Complete / Defer / Skip / Undo** actions, and a dedicated **Character Progression (Lv 1–80)** tracker with live API verification and expansion ownership checks.
> * **⚡ Performance, WCAG 2.2 AA Accessibility & Asset Caching:** Enabled a 50 MB persistent Chromium HTTP icon cache, per-item `useItem(id)` subscriptions, semantic typography tokens (`--text-2xs` to `--text-xl`), WCAG 2.2 AA high-contrast text tokens, and full keyboard focus/checkbox operability.
> * **🔍 Account-Wide Item Search & Character Overview (`Inventory & PvE Hub`):** Locate items across Material Storage, Bank, Shared Inventory, Character Bags, and Equipped Gear without double-counting, and inspect character levels, professions, crafting ratings, and bag utilization.

---

## 🌟 Key Highlights

* 🕒 **Second-Accurate Rotation Schedule (57 Events):** Continuous live countdowns across *Core Tyria, Heart of Thorns, Path of Fire, End of Dragons, Secrets of the Obscure, Janthir Wilds, Visions of Eternity*, Living World Seasons, and The Icebrood Saga with 1-click waypoint copying.
* 🔍 **Account-Wide Item Search:** Search by full or partial item name (in English or German), item ID, chat link, or character name across Material Storage, Bank tabs, Shared Inventory slots, Character Bags, and Equipped Gear.
* 👥 **Character & Inventory Awareness:** View all characters with level, profession, race, playtime, bag slot usage, active crafting disciplines, bag stacks, and equipped items — plus per-character location badges inside Legendary and Crafting Bills of Materials.
* 🧭 **PvE Progression Hub:** Unified overview of tracked Legendary projects, next craftable steps, deduplicated multi-goal material bottlenecks, active crafting disciplines, pinned achievements, and wallet currencies.
* ⚔️ **WvW Tactical Overview:** Public match standings, map biome breakdowns, personal WvW rank/title/ability mastery progression, rule-based situational insights, heuristic target scoring, interactive SVG radar map, and a complete filterable objective browser.
* 🔨 **0–500 Crafting Level Planner:** Lowest-cost leveling routes across all 8 disciplines with embedded discovery combinations and automatic account stock deductions.
* 🗡️ **Interactive Legendary Armory:** Hierarchical Mystic Forge component trees, live Black Lion Trading Post pricing, and Craft-vs.-Buy toggles across Gen 1, Gen 2, and Gen 3 weapons.
* 🏆 **Hero Panel & Achievements:** Pin achievements to a custom watchlist, track sub-objectives, and link boss achievements directly to live event timers.
* 🛡️ **Read-Only & Local:** Communicates directly with official ArenaNet REST API endpoints (`https://api.guildwars2.com/v2/`). All settings, caches, and API keys stay local on your machine.
* 🌐 **Bilingual UI:** Instant 1-click switch between **English (`EN`)** and **German (`DE`)** across all views.

---

## 🧭 Core Modules & Feature Showcase

### 🏰 1. Event Timers & World Bosses (`Events`)

Stay on top of every meta-event, world boss, and timed group activity in Tyria without alt-tabbing.

| Full Hero Board View | Expanded Boss Tactics & Loot | Compact Mini-HUD (Over-Chat) |
| :---: | :---: | :---: |
| [![Full Hero Board](docs/screenshots/hero-board.png)](docs/screenshots/hero-board.png) | [![Active Events Filter](docs/screenshots/events-active.png)](docs/screenshots/events-active.png) | [![Compact Mini-HUD](docs/screenshots/mini-hud.png)](docs/screenshots/mini-hud.png) |
| *Full Hero Board with live rotation schedule, category filters, and waypoint buttons.* | *Expanded event card with boss mechanics, defiance bar tips, and loot highlights.* | *Minimalist Mini-HUD designed to dock above the in-game GW2 chat box.* |

* **Deterministic 2-Hour Rotation Engine:** Computed locally against Tyria's UTC rotation cycle with zero external scraper dependencies.
* **1-Click Clipboard Callouts & Waypoints:** Copy formatted event callouts or waypoint chat codes (`[&...]`) to the Windows clipboard for manual in-game pasting (`[Enter] + [Ctrl+V]`).
* **Daily Completion Tracking:** Automatically syncs daily world boss kills (`/v2/account/worldbosses`) and meta-event Hero's Choice chests (`/v2/account/mapchests`), or lets you mark completions manually.

---

### 🔍 2. Account-Wide Item Search, Characters & PvE Progression Hub (`Inventory & PvE Hub`)

Eliminate inventory guesswork across your entire Guild Wars 2 account and coordinate long-term PvE goals in one place.

| Account-Wide Item Search | Characters & Bag Inventories | PvE Progression Hub |
| :---: | :---: | :---: |
| [![Account-Wide Item Search](docs/screenshots/account-item-search.png)](docs/screenshots/account-item-search.png) | [![Characters & Bag Inventories](docs/screenshots/character-inventory.png)](docs/screenshots/character-inventory.png) | [![PvE Progression Hub](docs/screenshots/pve-progression.png)](docs/screenshots/pve-progression.png) |
| *Locate any item across Material Storage, Bank, Shared Inventory, and individual Characters.* | *Inspect character levels, professions, playtime, bag slot usage, crafting disciplines, and gear.* | *Track Legendary goals, next crafting steps, shared material demand, and key currencies.* |

* **Account-Wide Item Search (`Item Search`):**
  * Queries `/v2/account/materials`, `/v2/account/bank`, `/v2/account/inventory`, and `/v2/characters?ids=all` (with automatic fallback to `/v2/characters/:id/inventory`).
  * Displays each storage location separately (`Material Storage`, `Bank`, `Shared Inv.`, individual `Character` names, and `Equipped` slots) alongside total account-wide quantity and live Trading Post value — with **zero double-counting**.
  * Filter by location (`All Locations`, `Material Storage`, `Bank`, `Shared Inventory`, `Characters`, `Equipped`, `Multiple Locations`), specific character, item rarity, or item type.
* **Characters & Inventories (`Characters & Bags`):**
  * Shows every character's profession, race, level, playtime hours, bag slot utilization (`used / total` across equipped bags), active crafting disciplines (`0–500`), top bag stacks, and equipped gear.
* **PvE Goals & Multi-Goal Material Planner (`PvE Goals & Resources`):**
  * Displays **Key Resources & Account Currencies** (Gold, Karma, Spirit Shards, Laurels, Imperial Favor, Fractal Relics, Badges of Honor, Mystic Clovers, Mystic Coins, Ectoplasm, Gifts of Battle/Exploration, and T6 materials) with exact storage locations.
  * Shows **Tracked Legendary Projects** with completion progress and the immediate next craftable intermediate step.
  * Computes a **Deduplicated Multi-Goal Material Plan** that aggregates shared ingredients across all tracked Legendaries against your single account stock pool so owned materials are never counted twice.

---

### ⚔️ 3. WvW Tactical Overview & Objective Assistant (`WvW Tactics`)

A structured World vs. World information center combining live public match data, personal WvW progression, rule-based situational insights, and interactive map/objective browsers.

| WvW Tactical Overview | Interactive Tactical Map | Match Dashboard & Map Scores |
| :---: | :---: | :---: |
| [![WvW Tactical Overview](docs/screenshots/wvw-advisor.png)](docs/screenshots/wvw-advisor.png) | [![WvW Tactical Map](docs/screenshots/wvw-map.png)](docs/screenshots/wvw-map.png) | [![WvW Match Dashboard](docs/screenshots/wvw-dashboard.png)](docs/screenshots/wvw-dashboard.png) |
| *Public match standings, map biomes, personal WvW progression, situational insights, and recommendations.* | *Interactive vector map for Eternal Battlegrounds and Alpine/Desert Borderlands.* | *Detailed team scores, Victory Points, PPT, K/D ratios, and per-map breakdowns.* |

* **Central WvW Command Overview (Public Match Data):**
  * Displays live EU/NA match standings (Victory Points, Points Per Tick, Kill/Death ratios, structure counts), linked world alliances, data sync age (`Synced Xs ago`), and quick shortcuts to the Tactical Map, Match Dashboard, and Observed Flips log.
  * **Map Biome Summary:** Covers **Eternal Battlegrounds (`Center`)**, **Desert Borderlands (`RedHome`)**, and **Alpine Borderlands (`BlueHome` / `GreenHome`)** with one-click map filtering, plus a transparent notice explaining that **Edge of the Mists** is not exposed in official `/v2/wvw/matches` live objective arrays.
* **Personal WvW Progression (Account Data):**
  * Clearly separated from public match data; displays your personal **WvW Rank**, official **WvW Title** & **Prestige Tier** progress (*Bronze* through *Diamond*), **WvW Ability Mastery** progress toward the Rank 1,226 cap (`1,226` ability points), daily Wizard's Vault WvW objectives, and account stockpiles of **Gifts of Battle**, **Memories of Battle**, **Badges of Honor**, and **WvW Skirmish Claim Tickets**.
* **Deterministic Situational Insights & Multi-Factor Advisor:**
  * Rule-based alerts highlight stale data (>90s), enemy fortifications on your Home Borderland, enemy structures in the 5–20 minute post-flip T0 vulnerability window, Stonemist Castle control, and match leader momentum.
  * Strategy presets (`Balanced`, `Aggressive`, `Territorial`, `Roamer`) and customizable scoring weights rank enemy objectives transparently (`isEstimated: true`).
* **Complete Filterable Objective Browser:**
  * Browse and filter all match objectives by **Map**, **Objective Type** (`Castle`, `Keep`, `Tower`, `Camp`, `Ruins`, `Mercenary`), **Owner** (`All Teams`, `Enemy Only`, `My Team`, `Red`, `Blue`, `Green`), **Status** (`All`, `Vulnerable T0`, `Active RI`, `Guild Claimed`, `Pinned`), and **Search Query**.

---

### 🏆 4. Hero Panel & Achievements Tracker (`Achievements`)

Track Guild Wars 2 achievements, daily checklists, and mastery rewards synchronized with your ArenaNet account.

| Hero Panel & Watchlist | World Boss & Meta Achievements |
| :---: | :---: |
| [![Hero Panel Overview](docs/screenshots/achievements-hero-panel.png)](docs/screenshots/achievements-hero-panel.png) | [![Achievements Detail Checklist](docs/screenshots/achievements-detail.png)](docs/screenshots/achievements-detail.png) |
| *Hero Panel layout with custom pinned Watchlist and tier progress.* | *Live event status integration, sub-objective checkboxes, and reward badges.* |

* **Custom Watchlist:** Pin priority achievements to a persistent watchlist (also surfaced in the PvE Progression Hub).
* **Live Event Linkage:** Boss achievements link directly to the active event rotation schedule with countdowns and waypoint copy buttons.
* **Reward Badges:** Displays Mastery Point regions, Achievement Points (AP), and title rewards.

---

### 🔨 5. Crafting Level Planner & Discovery Assistant (`Crafting`)

Plan lowest-cost leveling routes from 0 to 400/500 across all 8 crafting disciplines (*Armorsmith, Weaponsmith, Artificer, Jeweler, Leatherworker, Tailor, Chef, Huntsman*).

| 0–500 Level Planner & BOM | Undiscovered Recipe Explorer |
| :---: | :---: |
| [![Crafting Level Planner](docs/screenshots/crafting-planner.png)](docs/screenshots/crafting-planner.png) | [![Discovery Recipe Explorer](docs/screenshots/crafting-discovery.png)](docs/screenshots/crafting-discovery.png) |
| *Step-by-step leveling route with Bill of Materials and per-location stock deductions.* | *Filter and search undiscovered recipes by discipline, tier, and ingredient.* |

* **XP Decay Route Optimizer:** Calculates cost-effective crafting steps from your character's current discipline rating to your target rank, supporting optional intermediate self-crafting and discovery XP bonuses.
* **Location-Aware Inventory Deduction:** Subtracts owned materials and shows where each ingredient is stored (`Material Storage`, `Bank`, `Shared Inventory`, or specific `Character` bags).
* **Discovery Explorer & Recipe Book:** Browse undiscovered combinations or search the complete discipline recipe catalog with live unlock status (`/v2/account/recipes`).

---

### 🗡️ 6. Legendary Armory & Mystic Forge Trees (`Legendary`)

Explore interactive Mystic Forge component trees and real-time Bills of Materials for Legendary weapons across Gen 1, Gen 2, and Gen 3.

| Legendary Weapons Catalog | Hierarchical Mystic Forge Tree | Bill of Materials (BOM) & Storage Locations |
| :---: | :---: | :---: |
| [![Legendary Armory](docs/screenshots/legendary-armory.png)](docs/screenshots/legendary-armory.png) | [![Mystic Forge Tree](docs/screenshots/legendary-tree.png)](docs/screenshots/legendary-tree.png) | [![Bill of Materials](docs/screenshots/legendary-materials.png)](docs/screenshots/legendary-materials.png) |
| *Browse Legendary weapons filtered by generation and weapon type.* | *Interactive component tree with 4 main Mystic Forge branches.* | *Complete BOM with live Trading Post prices and per-location inventory badges.* |

* **Interactive Component Tree:** Expand or collapse Gifts, precursors, and sub-recipes, and mark completed intermediate nodes.
* **Location-Aware Bill of Materials:** Shows how many units you already own, which storage location or character holds them (`Mat`, `Bank`, `Shared`, or `Character Name`), and the live Trading Post cost for remaining items.
* **Craft vs. Buy Toggle:** Switch tradeable intermediates between self-crafting and direct Trading Post purchase.

---

### ⚙️ 7. In-App Settings, Account Sync & Auto-Updater (`Settings`)

Configure language, opacity, chat callout templates, API key synchronization, and in-app release updates.

| Account Sync & Settings Modal | In-App Auto-Updater & Version Management |
| :---: | :---: |
| [![Settings Modal](docs/screenshots/settings-modal.png)](docs/screenshots/settings-modal.png) | [![Auto-Updater Section](docs/screenshots/settings-updater.png)](docs/screenshots/settings-updater.png) |
| *Bilingual toggle (`EN` / `DE`), API key setup, and cache explanations.* | *GitHub release verification, background updater, and progress backup.* |

---

## 🔑 Guild Wars 2 API Key Integration (Official & Read-Only)

Omnitria communicates directly with official **ArenaNet API servers** (`https://api.guildwars2.com/v2/`).

> [!IMPORTANT]
> ### 🛡️ Read-Only Architecture & Policy Transparency
> - **External Desktop Companion:** Operates strictly as an external window without memory reading, DLL injection, or keystroke simulation. Read our full technical documentation in **[docs/TOS_COMPLIANCE.md](docs/TOS_COMPLIANCE.md)**.
> - **Read-Only by Design:** ArenaNet API keys are strictly read-only. They cannot modify items, spend currencies, or access login credentials.
> - **Local Storage Only:** Your API key is saved locally in your application profile (`localStorage`) and is never sent to third-party servers.
> - **Graceful Partial Permissions:** If an API key is missing a scope (such as `inventories` or `characters`), Omnitria clearly explains which permission is missing and why it is needed while continuing to load all other permitted features.

### Recommended ArenaNet Scopes & Permissions Matrix

| ArenaNet Scope | Priority | What It Unlocks in Omnitria | If Unchecked |
| :--- | :---: | :--- | :--- |
| ☑️ **`account`** | 🔴 **Required** | Base account verification, account name, home world (`world` ID for WvW team auto-detection), and `wvw_rank`. | Guest Mode (personal account sync disabled). |
| ☑️ **`inventories`** | 🟢 **Essential** | Material Storage (`/v2/account/materials`), Bank (`/v2/account/bank`), Shared Inventory (`/v2/account/inventory`), and Character Bag contents. | Account-Wide Item Search and BOM stock deductions cannot read stored items. |
| ☑️ **`characters`** | 🟢 **Essential** | Character overview (`/v2/characters?ids=all`), active crafting discipline ratings, bag slot counts, and character inventories. | Character cards and character bag item search are unavailable. |
| ☑️ **`progression`** | 🟢 **Essential** | Achievement progress (`/v2/account/achievements`), daily world bosses, map chests, and Wizard's Vault daily objectives. | Achievements and daily trackers default to manual mode. |
| ☑️ **`unlocks`** | 🟢 **Essential** | Learned crafting recipes (`/v2/account/recipes`) and Legendary Armory unlocks (`/v2/account/legendaryarmory`). | Recipes appear unlearned and armory weapons are not auto-marked. |
| ☑️ **`wallet`** | 🟡 **Recommended** | Account currency balances (`/v2/account/wallet`: Gold, Karma, Spirit Shards, Laurels, Badges of Honor, WvW Skirmish Tickets). | Wallet currency cards show `—`. |
| ☑️ **`builds`** | 🟡 **Optional** | Enhances character equipment metadata returned by `/v2/characters?ids=all`. | Basic character summaries still load via `characters`. |

### How to Connect Your API Key

1. Sign in to the official ArenaNet portal at **[account.arena.net/applications](https://account.arena.net/applications)**.
2. Click **"New Key"**, give it a name (e.g., `Omnitria`), and check the scopes listed above.
3. Copy the generated API key, open **Settings (⚙️)** in Omnitria, paste the key, and click **Synchronize**.

---

## 🎮 Controls & Shortcuts

| Action | Shortcut / Control | Description |
| :--- | :---: | :--- |
| **Minimize Window** | `[Esc]` | Minimizes the overlay window and returns focus to Guild Wars 2. |
| **Toggle Overlay** | `[F9]` | Global hotkey to show or hide the Omnitria window at any time. |
| **Click-Through Mode** | `[F10]` | Toggles `WS_EX_TRANSPARENT` so mouse clicks pass directly through to Guild Wars 2. |
| **Chat Dock Anchor** | `🧭 Compass Icon` | Docks the compact Mini-HUD above your in-game chat box (bottom-left). |
| **Language Switcher** | `🇬🇧 EN` / `🇩🇪 DE` | Instant toggle between English and German UI and item names. |
| **System Tray Menu** | *Right-Click Tray Icon* | Switch window modes, reset position, toggle click-through, or exit. |

---

## ⚡ Quick Start & Installation

### System Requirements
* **Operating System:** Windows 10 or Windows 11 (64-bit)
* **Guild Wars 2 Display Mode:** **Windowed Fullscreen** or **Windowed** *(required for desktop overlays to render above the game)*
* **Node.js:** v20+ *(only needed when building or running from source)*

### Option A: Standalone Windows Release
1. Download `Omnitria-v0.1.9-windows-x64.zip` from **[GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases/tag/v0.1.9)**.
2. Extract the archive to a folder of your choice.
3. Launch `Omnitria.exe` (or `Omnitria-Silent.vbs` / `Omnitria.bat`).

### Option B: Running from Source
```bash
# 1. Install dependencies
npm ci

# 2. Launch the Electron overlay in development mode (Vite + Electron)
npm run overlay
```

---

## 🛠️ Development, Validation & Screenshot Generation

```bash
# Run TypeScript type checking
npm run typecheck

# Run automated unit, domain, translation & compliance tests
npm test

# Build production renderer bundle (dist/)
npm run build

# Capture fresh UI screenshots into docs/screenshots/ via headless Electron
npx electron scripts/capture-screenshots.cjs

# Package standalone Windows portable release
npm run package:win
```

For full technical documentation on data sources, inventory deduplication, WvW heuristics, and caching, see **[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)**.

---

## 📜 Legal & ArenaNet Notice

Guild Wars 2, ArenaNet, and all associated logos and designs are trademarks or registered trademarks of NCsoft Corporation.  
Omnitria is an independent, fan-made open-source companion and is neither reviewed, certified, nor endorsed by ArenaNet or NCsoft. Use of any third-party tool is at the player's own risk. For a detailed technical breakdown of our read-only API usage and clipboard-only workflow, see **[docs/TOS_COMPLIANCE.md](docs/TOS_COMPLIANCE.md)**.
