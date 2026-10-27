# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
