# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.8] - 2026-10-28

### Added & Improved

#### Account-Wide Item Search (`Inventory & PvE Hub`)
* **Consolidated Account Inventory Index (`src/domain/inventorySearch.ts`, `src/data/gw2/account.ts`):**
  * Searches items across **Material Storage** (`/v2/account/materials`), **Bank** (`/v2/account/bank`), **Shared Inventory Slots** (`/v2/account/inventory`), **Character Bags** (`/v2/characters?ids=all` + fallback `/v2/characters/:id/inventory`), and **Character Equipment** without double-counting.
  * Supports full-name and partial-name case-insensitive search in both English (`en`) and German (`de`), item ID search, chat code search, and character name search.
  * Displays color-coded per-location and per-character storage badges (`Material Storage`, `Bank`, `Shared Inv.`, `Character Name`, `Equipped`), total account-wide quantity, and live Black Lion Trading Post valuation.
  * Includes filters for storage location (`All`, `Material Storage`, `Bank`, `Shared Inventory`, `Characters`, `Equipped`, `Multiple Locations`), individual character name, item rarity, and item type.

#### Character Overview & PvE Progression Hub
* **Characters & Bags View:** Displays character cards with level, profession, race, playtime hours, bag slot utilization (`used / total` across equipped bags), active crafting disciplines with ratings, notable bag inventory stacks, and equipped Legendary/Ascended gear.
* **PvE Goals & Resources Hub:**
  * Consolidates **Key Resources & Account Currencies** (Gold, Karma, Spirit Shards, Laurels, Imperial Favor, Fractal Relics, Badges of Honor, Mystic Clovers, Mystic Coins, Globs of Ectoplasm, Gifts of Battle, Gifts of Exploration, T6 Materials) with exact storage location breakdowns.
  * **Tracked Legendary Projects & Next Steps:** Shows overall completion percentage and immediate next craftable component step for each tracked Legendary weapon.
  * **Deduplicated Multi-Goal Material Planning (`computeMultiGoalMaterialPlan`):** Aggregates shared material demand across multiple tracked Legendary goals against a single shared account stock pool so owned materials are never double-counted across goals.
  * **Per-Character Breakdown in BOMs:** Enhanced Legendary `MaterialTable`, Crafting `MaterialDemandTable`, and `MaterialDetail` modal to display individual character names holding materials in their bags.

#### WvW Tactical Overview Restructuring (`WvW Tactics`)
* **Central WvW Tactical Command Overview (`src/components/wvw/WvwAdvisorView.tsx`, `src/data/gw2/wvw/progression.ts`):**
  * Consolidates public match standings (Victory Points, Points Per Tick, Kill/Death ratio, Castles/Keeps/Towers/Camps counts), data sync age indicator (`Synced Xs ago`), quick view shortcuts (`Tactical Map`, `Match Dashboard`, `Observed Flips`), and interactive map biome pills (**Eternal Battlegrounds**, **Desert Borderlands [Red]**, **Alpine Borderlands [Blue/Green]**, plus explicit **Edge of the Mists** API limitation notice).
* **Personal WvW Progression Panel (Account):**
  * Clearly separated from public match data; displays WvW Rank, official WvW Title, Prestige Tier progress (*Bronze* through *Diamond*), WvW Ability Mastery progress (toward Rank 1,226 cap), daily Wizard's Vault WvW progress, and account stockpiles of **Gifts of Battle**, **Memories of Battle**, **Badges of Honor**, and **WvW Skirmish Claim Tickets**.
* **Deterministic Rule-Based Situational Insights:**
  * Generates transparent, rule-based alerts for stale match data (>90s), enemy fortifications on the player's Home Borderland, enemy structures in the vulnerable 5–20 minute post-flip T0 window, Stonemist Castle ownership, and leading enemy team momentum.
* **Complete Filterable Objective Browser:**
  * Added full objective browser supporting simultaneous filtering by **Map**, **Objective Type** (`Castle`, `Keep`, `Tower`, `Camp`, `Ruins`, `Mercenary`), **Owner** (`All Teams`, `Enemy Only`, `My Team`, `Red`, `Blue`, `Green`), **Status** (`All`, `Vulnerable T0`, `Active RI`, `Guild Claimed`, `Pinned`), and **Search Query**.

---

## [0.1.7] - 2026-10-27

### Security & ToS Compliance Overhaul

#### Chat Automation & Keystroke Simulation Removed
* **Safe Clipboard-Only Architecture:** Completely removed legacy keystroke simulation, Windows Script Host (`WScript.Shell`), temporary VBScript files (`gw2_send.vbs`), and `child_process.exec` from Electron main process.
* **Explicit Copy Actions:** All chat callout and waypoint buttons now explicitly copy formatted strings to the Windows clipboard via safe `clipboard.writeText` IPC with user toast confirmation ("In Zwischenablage kopiert! Einfügen im Spiel mit [Enter] + [Strg+V]").
* **Legacy IPC Defusal:** Legacy IPC endpoints (`gw2-send-chat`, `gw2-teleport-waypoint`) are completely defused and safely redirected to clipboard copy only.

#### WvW Tactical Assistant Transparency & Staleness Handling
* **Staleness Detection (90s Threshold):** Data older than 90 seconds is actively flagged as stale with a prominent visual warning banner and timer badge in the WvW module.
* **Exponential Backoff:** Implemented adaptive exponential backoff (30s → 45s → 60s → 120s → 300s) on consecutive API polling failures to prevent server spam during ArenaNet outages.
* **Transparent Estimation Models:** All tactical recommendations explicitly declare data source, staleness state, and `isEstimated: true` flags, acknowledging the absence of zerg/stealth radar in public APIs.

#### Electron Window & Auto-Updater Hardening
* **Navigation & Popup Protection:** Added `setWindowOpenHandler` restricting window creation to external default browser with strict domain allowlists (`wiki.guildwars2.com`, `account.arena.net`, `api.guildwars2.com`). Added `will-navigate` guard preventing remote code injection in overlay windows.
* **Strict Auto-Updater Validation:** In-app update downloads are strictly constrained to official HTTPS GitHub release endpoints (`github.com/Booster1212/guildwars2-omnitria/releases/download/` and `objects.githubusercontent.com`).

#### Documentation & Public Claims Overhaul
* **Restructured ToS Compliance Guide:** Completely rewrote `docs/TOS_COMPLIANCE.md` into 8 structured sections with objective, technically verifiable explanations.
* **Removal of Absolute Guarantees:** Removed all unverified claims of "100% ToS-compliant", "garantiert bannsicher", or official ArenaNet endorsement across `README.md` and documentation.

---

## [0.1.6] - 2026-10-27

### Added

#### Comprehensive Meta-Events Expansion (57 Events Total)
* **Core Tyria & Orr Temple Metas**:
  * Added **Ley-Line Anomaly** (`ley-line-anomaly`) with 2-hour schedule (`xx:20 UTC`) for guaranteed daily Mystic Coin tracking.
  * Added all missing Orr Temple Metas: **Cathedral of Glorious Anticipation** (Temple of Balthazar), **Cathedral of Silence** (Temple of Grenth), **Cathedral of Verdance** (Temple of Melandru), and **The Gates of Arah**.
* **Path of Fire (PoF) Expansion Metas**:
  * Added **The Path to Ascension & Branded Doppelganger** (`augury-rock`) in Elon Riverlands.
  * Added **Forged with Fire** (`forged-with-fire`) with the Hounds of Balthazar in Domain of Vabbi.
  * Added **Buried Treasure** (`buried-treasure`) across Desert Highlands.
  * Added **Junundu Rising** (`junundu-rising`) in The Desolation.
* **End of Dragons & Secrets of the Obscure**:
  * Added **Gyala Delve** (`gyala-delve`) - The Jade Miner Crisis & The Haze.
  * Added **Inner Nayos: Heitor's Gate** (`nayos-heitors-gate`) - The Fangs That Gnash / Knaebelag.
* **Janthir Wilds**:
  * Added **Bava Nisos** (`janthir-bava-nisos`) - A Titanic Voyage.
* **The Icebrood Saga (IBS) - Dedicated Category**:
  * Added **Drizzlewood Coast: Assault on the Fort (South Meta)** (`drizzlewood-south`).
  * Added **Drizzlewood Coast: Frost Citadel & Claw of Jormag (North Meta)** (`drizzlewood-north`).
  * Added **Grothmar Valley: Metal Legion Concert** (`grothmar-metal-concert`).
  * Recategorized **Dragonstorm** and **Drakkar** from EoD into the dedicated `ibs` category.
* **Living World Seasons (LWS) - Dedicated Category**:
  * Added **The Silverwastes** (`silverwastes-vinewrath`) - The Vinewrath & The Breach (RIBA / Obsidian Shard farm).
  * Added **Dry Top** (`dry-top-sandstorm`) - Hourly Sandstorm Tier 1-6.
  * Added **Domain of Istan: Palawadan, Jewel of Istan** (`palawadan-jewel`).
  * Added **Jahai Bluffs: Death-Branded Shatterer** (`death-branded-shatterer`).
  * Added **Thunderhead Peaks: Thunderhead Keep & Oil Floes** (`thunderhead-peaks`).
  * Added **The Twisted Marionette** (`twisted-marionette`) - Public instance timer in Eye of the North.

#### UI & Category Filter Enhancements
* Added dedicated **`IBS`** and **`LW`** filter chips in `BossFilterBar`.
* Added distinctive badge color schemes in `index.css` for `.category-ibs` (cyan/sky blue) and `.category-lws` (amber gold).

### Fixed
* **"Gangs of Echovald" Naming & Search Resolution**:
  * Updated German name to official in-game and community title **"Der Bandenkrieg von Echowald"** and English name to **"The Gang War of Echovald (The Gangs of Echovald)"**.
  * Searching for "Bandenkrieg", "Banden", "Gangs", or "Echowald" now matches immediately in all views.
* **EoD / IBS Categorization Alignment**:
  * Corrected Dragonstorm and Drakkar from being listed as EoD to authentic Icebrood Saga grouping.

---

## [0.1.5] - 2026-10-27

### Added

#### World vs. World (WvW) Tactical Assistant
* **Dedicated WvW Navigation Module**:
  * Persistent WvW tab with live match synchronization for European (EU) and North American (NA) servers.
  * Automatic player team detection based on connected ArenaNet account home world.
  * Match selector displaying authentic server and alliance names.
* **Smart Objective Advisor**:
  * Real-time tactical recommendations evaluating Righteous Indignation (RI) timers, Points Per Tick (PPT) strategic value, structure tiers, distance from home spawn, and match leadership momentum.
  * Strategy presets (*Balanced*, *Aggressive*, *Territorial*, *Roamer*) with customizable scoring weight sliders.
  * Top 3 recommendations banner with quick-focus and objective detail view.
  * Activity hotspot banner highlighting optimal WvXP and reward track progression areas.
* **Interactive Tactical Radar Map**:
  * Vector SVG maps for Eternal Battlegrounds (EBG) and Alpine / Desert Borderlands.
  * Live objective pins (Camps, Towers, Keeps, Stonemist Castle, Mercenaries, Ruins) with team color rings, RI countdown badges, and guild claim emblems.
* **Live Match Dashboard**:
  * Real-time match scores, Victory Points (VP), Points Per Tick (PPT), Kill/Death ratios (K/D), skirmish progress bars, and structure possession distribution.
  * Map-specific activity rankings for optimal reward track leveling.
* **Session Flips & Activity Tracker**:
  * Live capture logger tracking objective ownership changes with timestamps, team transitions, and Righteous Indignation countdown timers.
* **Full Bilingual Support**:
  * Complete English and German localization across all WvW views, tactical recommendations, objective notes, and settings.

#### Orr Temple Meta-Events (Dwayna & Lyssa)
* **Cathedral of Zephyrs (Dwayna)**:
  * Integrated into deterministic 2-hour rotation schedule in Malchor's Leap with fast-travel waypoint `[&BLcCAAA=]`, loot highlights, mechanics guide, and achievement tracking.
* **Cathedral of Eternal Radiance (Lyssa)**:
  * Integrated into deterministic 2-hour rotation schedule in Malchor's Leap with fast-travel waypoint `[&BKcCAAA=]`, loot highlights, mechanics guide, and achievement tracking.
* **1-Click Game Chat Broadcast**:
  * Quick-copy waypoint codes and `/m` map chat callouts for Orr temple meta-events.

### Changed
* **Overlay Minimization Shortcut**:
  * Pressing `Escape` now instantly minimizes or hides the overlay window, returning focus directly to Guild Wars 2.

### Fixed
* Fixed missing event schedule entries for Dwayna and Lyssa temple meta-events.
* Fixed keyboard navigation and hotkey event trapping when closing modals and dialogs.

---

## [0.1.4] - 2026-10-25

### Added
* **Learned & Relevant Recipe Catalog (Crafting)**:
  * Dedicated recipe catalog tab in Crafting discipline details.
  * Filter recipes by discipline level/tier (T1 through T6 and Ascended) and recipe categories (Weapons, Armor, Components, Refinement, Consumables, Bags, Trinkets).
  * Search recipes by name with instant status badges (*Directly Craftable*, *Auto-Learned*, *Recipe Sheet*, *Discovery*).
  * Real-time Trading Post crafting cost estimates and live account inventory counts.

### Fixed
* **Legendary Material Stock Allocation**:
  * Fixed an issue where materials shared across multiple legendary sub-branches (such as Obsidian Shards and Ectoplasm in both Mystic Clovers and Gift of Mastery) showed 0 stock in lower branches.
  * Shared leaf materials now accurately display account storage across all branches while the overall Bill of Materials (BOM) prevents duplicate deduction.

---

## [0.1.3] - 2026-10-24

### Added

#### Legendary Armory Procurement & Classification
* **Clear Material Categorization**:
  * Categorized all items into **Craftable** (self-crafted items and Mystic Forge recipes), **Must Buy** (mandatory vendor purchases and Trading Post materials), and **Non-Craftable** (world exploration, currencies, and account rewards).
  * Dedicated inventory tracking column with progress bars, exact counts (`Owned / Required`), and status badges.
  * Header summary cards displaying total progress, gold investment, vendor requirements, and non-craftable items.
  * Grouped view toggle and filter chips (*All*, *Craftable*, *Must Buy*, *Non-Craftable*, *In Stock*, *Missing*).
  * Fixed vendor price integration for mandatory items like Icy Runestones (100g for 100 runestones) and Master Craftsman ingredients.
* **Crafting Tree & Purchase Toggle**:
  * Added undo capability for direct purchases in the crafting tree, allowing users to toggle between crafting and buying any intermediate product.
  * Global one-click reset button to revert all direct purchase overrides.

#### Boss & Event Achievements
* **Achievement Integration on Event Cards**:
  * Added achievement drawers directly onto event cards displaying linked achievements, Mastery Point indicators, and live account completion status.
  * Added expansion category filters for World Bosses and Meta-Events (*Core Tyria*, *Heart of Thorns*, *Path of Fire*, *Icebrood Saga*, *End of Dragons*, *Secrets of the Obscure*, *Janthir Wilds*).
  * Added bilingual boss tactics and loot highlights for all 35 world bosses and meta-events.

#### Recursive Crafting & Leveling Calculator
* **Multi-Tier Recipe Resolution**:
  * Complete recursive calculation resolving intermediate components down to base raw materials.
  * Step preparation cards displaying exact intermediate crafting sequences with clickable icons and inventory counts.
  * Global procurement strategy selector (*Craft All*, *Buy All*, *Custom*).
  * Discovery recipe support with visual badges and ingredient indicators.
  * Account inventory deduction across character bags, bank tabs, material storage, and shared inventory.

### Changed
* Crafting Level Planner options (*Allow Discovery Recipes* and *Craft Intermediates*) now start inactive by default for cleaner baseline routes.
* Step checkmarks strictly start at 0 on launch for full manual player progress tracking.
* Removed deprecated Waypoints tab from navigation to streamline the overlay experience.

### Fixed
* Fixed an issue where pulling maxed character discipline ratings caused an empty leveling route by automatically adding a milestone target and one-click view of the full route.
* Fixed gross and net demand calculation for intermediate crafting steps that previously showed 0 total demand.
* Fixed text spacing and styling for event loot highlights and mechanics badges.
