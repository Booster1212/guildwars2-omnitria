# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.6] - 2026-11-05

### Added & Improved

#### 1. Crafting Planner Engine Overhaul (`Berufsplaner`) & 3 Distinct Strategies (`src/domain/types.ts`, `src/domain/levelPlanner.ts`, `src/domain/craftingCalculator.ts`, `src/components/crafting/LevelPlanner.tsx`)
* **Three Clearly Separated Crafting Strategies:**
  * **Mode A: BUY EVERYTHING (`buy_everything`):** Minimizes player effort and crafting operations. Automatically buys finished intermediate products directly from the Trading Post or vendors. Invariant: `step.prepSteps` is strictly empty (`[]`) for buyable items.
  * **Mode B: CRAFT EVERYTHING (`craft_everything`):** Recursively manufactures intermediate products down to raw base materials whenever valid discipline recipes exist. Consumes owned intermediate products first.
  * **Mode C: OPTIMAL HYBRID (`optimal_hybrid` - Recommended):** Minimizes total gold expenditure by dynamically evaluating buy vs. craft cost factoring in owned inventory (cost 0 copper) and batch multi-yield surpluses.
* **Strict 7-Tier Material Accounting Ledger:**
  * Every material requirement in `plan.materials` and `calculateCraftingPlan` tracks 7 explicit tiers: `grossDemand`, `ownedStock`, `stockConsumed`, `netDeficit`, `manufactured`, `intermediateYield`, and `remainingToBuy`.
* **Resolved Intermediate Inventory Blindness:**
  * Owned intermediate stock is now checked and deducted *before* attempting to decompose into raw materials. Owning 100 Refined Ingots satisfies requirements directly without triggering purchases for raw ore.
* **Sequential Multi-Yield Surplus Pooling:**
  * Surpluses from batch recipes (e.g. 5x dowels) are returned to the active `inventoryPool` and tracked under `intermediateYield` for subsequent steps, eliminating over-purchasing.
* **Authentic Guild Wars 2 Crafting XP Mathematics (`src/domain/craftingXp.ts`):**
  * Updated `ranksPerCraft` with authentic $(1 + \text{mod})$ rarity discovery multipliers (Fine: $2.0\times$, Masterwork: $3.0\times$, Rare: $4.25\times$, Exotic: $5.0\times$) matching GW2 Wiki and `gw2craft`.
* **Eliminated Shopping List & Demand Table Split-Brain Divergence:**
  * Fixed the double-subtraction bug in `LevelPlanner.tsx` where the Shopping List subtracted stock a second time. Both the Shopping List and Demand Table now bind directly to the single source of truth in `plan.materials`.

#### 2. Prominent 3-Card Material Strategy Hero UI & Dashboard Redesign (`src/components/crafting/LevelPlanner.tsx`, `src/index.css`)
* **3-Card Material Strategy Hero Deck:**
  * Transformed the previously cramped segmented button bar into a prominent 3-card centerpiece with distinctive color glow themes, clear tags (*Lowest Gold Cost*, *Max Convenience · 0 Preps*, *Full Crafting Chain*), active radio indicators, and explainable tooltips.
* **Streamlined Header & Decluttered Master Dashboard:**
  * Replaced the bulky 2-card bulk-vs-cost banner with an elegant, compact route method pill toggle (`[ ✨ Normal ]  [ ⚡ Bulk ]`) right in the strategy header, significantly reducing vertical bloat and giving immediate visibility to the actual crafting steps.
  * Added a unified controls bar for discovery permissions, open steps filter, custom exception indicator, and live Trading Post pulse status.

#### 3. Automated Benchmark Audit Test Suite (`tests/craftingStrategyAudit.test.ts`)
* Added automated unit tests verifying all 12 competitive benchmark scenarios (empty inventory 0–400 and 400–500, starting level 450, large raw inventory, large intermediate inventory, zero stock, expensive intermediates, TP price dumping, vendor price caps, and partial inventory batch yields).
* Expanded test suite to 176 passing tests with 100% German/English localization parity.

---

## [0.3.5] - 2026-11-05

### Added & Improved

#### 1. MumbleLink 3D Spatial Wayfinding & Combat HUD Beacon (`electron/MumbleReader.cs`, `src/data/gw2/mumble.ts`, `src/components/SpatialWayfindingHud.tsx`, `src/App.tsx`, `src/components/SettingsModal.tsx`)
* **3D Camera Vector Heading (`fCameraFront`):**
  * Upgraded `electron/MumbleReader.cs` and recompiled `electron/mumble-reader.exe` to read `camFrontX` (byte offset `568`), `camFrontZ` (byte offset `576`), `avatarX`/`avatarZ`, and `mapCenterX`/`mapCenterY` directly from Guild Wars 2 shared memory, with `NaN`/`Infinity` float sanitization.
  * Solved the North-locked minimap limitation where `compassRotation` remained `0.0`: `calculateSpatialWayfinding` now computes the player's true 3D camera heading (`Math.atan2(camFrontX, camFrontZ)`) so directional arrows rotate smoothly in real time as you turn your camera.
  * Added `hasSpatialMumbleChange` (~16 FPS / `60ms` delta streaming when moving or turning the camera, `0%` idle CPU when stationary).
* **Authentic ArenaNet Continent Coordinates for All 58 Events:**
  * Populated `EVENT_CONTINENT_COORDS` with verified official ArenaNet `/v2/continents` PoI and Waypoint coordinates for all 58 World Bosses and Meta Events across Core Tyria, HoT, PoF, LWS, IBS, EoD, SotO, and Janthir Wilds, plus `MAP_CONTINENT_CENTERS` fallbacks.
* **Persistent Click-Through Combat HUD Beacon (`SpatialWayfindingHud.tsx`):**
  * Added a dedicated floating tactical wayfinding marker (`pointer-events: none`) rendered outside `.gw2-hero-window` that stays visible even when the main overlay auto-hides during combat (`isCombatDimmed`).
  * Displays a live 360° rotating directional arrow (highlighting emerald when aligned straight ahead), turn-by-turn guidance (*Run Straight Ahead*, *Turn Left*, *Turn Right*, *Turn Around*), live distance (`m` / `km`), compass cardinal, and event countdown timer.
* **Docked Spatial Bar & Settings Toggle (`combatSpatialHudEnabled`):**
  * Out of combat, displays an interactive Spatial Wayfinding Bar below the header with 1-click Waypoint target locking and `<` / `>` event cycling.
  * Added an enable/disable checkbox in **Settings → MumbleLink Telemetry** (*"Show Spatial Compass & Combat HUD Beacon"*).

#### 2. Instant Item & Trading Post Price Streaming (`src/data/gw2/client.ts`, `src/data/gw2/prices.ts`, `src/data/gw2/items.ts`, `src/data/gw2/account.ts`, `src/components/inventory/InventoryHubView.tsx`)
* **Eliminated False *"Bound"* Placeholders During Price Fetch:**
  * Added `isPriceLoading(id)` and `isItemLoading(id)` tracking alongside explicit `AccountBound` / `SoulbindOnAcquire` flag inspection (`isBound`). Tradeable items now show a subtle pulsing loading indicator (`…`) while prices stream in instead of falsely displaying `Bound` or `–`.
  * Fixed immutable snapshot creation (`pricesSnapshot`) in `usePrices` so React components re-render immediately as each price batch arrives.
* **High-Throughput Progressive Chunk Streaming:**
  * Upgraded `src/data/gw2/client.ts` concurrency from `3` to `8` (`MIN_INTERVAL_MS = 25ms`, well within ArenaNet's 300 req/min burst allowance) and added `onChunk` progressive streaming so UI views update after every 200-ID batch instead of waiting for all batches to finish.
* **Persistent IndexedDB Price Cache (`prices:v1`) & Startup Prefetching:**
  * Added Stale-While-Revalidate IndexedDB persistence for Trading Post prices (`src/data/gw2/prices.ts`) and automatic background prefetching (`prefetchAccountItemsAndPrices` in `src/data/gw2/account.ts`), making Inventory & PvE Hub item and price loading nearly instantaneous across sessions.

#### 3. Live-API `gw2crafts.net` Leveling Route Calibration (`src/domain/levelPlanner.ts`, `src/components/crafting/LevelPlanner.tsx`)
* **Mid-Tier Patch & Plated Dowel Discrimination:**
  * Distinguished true tier-start refinements (*Bolts, Leather Squares, Ingots, Planks* at `0, 75, 150, 225, 300, 400`) from mid-tier insignia/inscription sub-components (*Wool/Cotton/Linen/Silk Patches* and *Iron/Steel/Darksteel/Mithril Plated Dowels* at `125, 200, 275, 350`) and crafting backpack tools, preventing `128x` patch or `64x` insignia grinds against the full 13,213-recipe live GW2 API dataset.
* **Smart Intermediate Buy-vs-Craft Resolution & Sub-Tier Quality XP Scaling:**
  * In `cost` and `fast` modes, `acq()` now compares self-craft cost against Trading Post buy price for intermediate refinements and insignias/inscriptions (self-crafting only when cheaper or unlisted), caps speculative low-level TP resale credit (`20%` below rank 400, `35%` at 400+), and models Fine (`Tier+25`), Masterwork (`Tier+50`), Rare (`375`), and Exotic (`400+`) sub-tier XP progression so `0–400` and `0–500` routes match `gw2crafts.net` costs and craft counts.
* **Purchase List & Material Strategy Parity (`Buy All Components` vs. `Self-Craft Ingredients`):**
  * Separated candidate cost evaluation (`evalAcq`) from step ingredient resolution (`acq` / `resolve`) so selecting **Buy all components** (`craftIntermediates: false`) never forces self-crafted preparation steps (`prepSteps`) for tradable components and lists exact direct ingredients in the Shopping List.
  * Synchronized **Self-craft ingredients** (`craftIntermediates: true`) with `craftingCalculator.ts` (`Total Material Demand` & `Crafting Tree`) with topological bottom-up sorting (ensuring sub-components like *Wool Patch* are always listed after their refinements and before their Insignia), and wired the Shopping List to filter out completed/skipped steps when `onlyOpenSteps` is enabled.
* **Regenerated All 19 UI Screenshots (`docs/screenshots/`):**
  * Updated all 19 visual walkthrough screenshots for `v0.3.5`.

---

## [0.3.4] - 2026-11-05

### Added & Improved

#### 1. Unified Crafting Master Dashboard & `gw2crafts.net` Cost/Step Calibration (`src/domain/levelPlanner.ts`, `src/domain/craftingXp.ts`, `src/domain/costs.ts`, `src/components/crafting/LevelPlanner.tsx`)
* **Consolidated Master Control Panel:**
  * Merged the 4 previously disjointed, stacked control boxes into a single cohesive control dashboard (`planner-unified-dashboard`) with an intuitive visual hierarchy:
    1. **Ranks & Character:** Discipline emblem, character selector with live API verification badge, from/to rank steppers, and quick-target pills (`[400 Master]` & `[500 Grandmaster]`).
    2. **Material Strategy:** Placed directly below ranks; toggle between *"Craft Ingredients (Cheaper)"* and *"Buy All Components"*, discovery permissions, and live TP price refresh.
    3. **Procurement Method:** Prominent 2-card hero switcher (*⚡ Bulk 0–450* vs *✨ gw2crafts Normal Discoveries*) that automatically enables intermediate crafting (`craftIntermediates: true`) when selected, plus expandable advanced options.
    4. **Costs & Progress Footer:** Integrated KPI summary displaying net leveling cost, total expense, craft step count, and interactive progress bar.
* **`gw2crafts.net` Craft-Count & Cost Parity:**
  * **10-Rank Tier-Start Refinement Cap (~36–42x instead of 128x):** Restricted tier-start material refinements (*Bolt of Cotton, Bolt of Linen, Stretched Rawhide Leather Square*, etc.) to the fresh first 10 ranks of each tier (`150 → 160`, `225 → 235`), eliminating decayed 20-rank refinement grinds (`128x` bolts) before transitioning to basic components and equipment.
  * **Elimination of 64x Fine-Material Insignia/Inscription Grinds:** Distinguished basic components (*Panels, Linings, Blades, Hilts* — requiring 0 fine materials) from expensive `Insignia`/`Inscription` recipes (requiring 3–5 fine materials per craft). Mid-tier brackets (`125–150`, `175–225`, `250–300`, `325–400`) now use `~6–7x` 1-time discoveries in Normal (`cost`) mode or `1x Discovery + ~15x Bulk Repeat` of a single cheap weapon/armor piece in Bulk (`fast`) mode, cutting mid-tier craft counts by 75%–90% and saving 75%–88% gold.
  * **Inventory Bag Exclusion & Runes of Holding Vendor Pricing:** Added `'Bag'` to `EXCLUDED_TYPES` so 8–20 slot inventory bags are never suggested as leveling filler, and added all 5 Master Craftsman *Runes of Holding* (`13010`, `13006`, `13007`, `13008`, `13009`) to `KNOWN_VENDOR_PRICES` and `MASTER_CRAFTSMAN_MATERIALS`.
  * **Protection Against Scalped/Unlisted TP Intermediates:** Updated `acq()` so unlisted or scalped intermediate armor panels and weapon parts are automatically evaluated via self-crafting cost even if *"Buy All Components"* was previously active.

#### 2. Innovative Item Inspector Drawer (`src/components/material/MaterialDetail.tsx`, `src/data/external.ts`)
* **Prominent Wiki Lookup:**
  * Elevated the wiki lookup to a primary golden header action button (`[ 📖 Wiki Lookup ↗ ]`), opening the official German or English GW2 Wiki article in one click.
* **1-Click In-Game Chat Link Copying (`[&...]`):**
  * Added `encodeItemChatCode` generating official Base64 in-game chat codes (e.g. `[&AgEJTQAA]` for Glob of Ectoplasm, `[&AgGStgAA]` for Deldrimor Steel Ingot) with 1-click clipboard copying and visual checkmark confirmation.
* **Stock & Demand Progress Dashboard:**
  * Added an interactive KPI grid showing total demand, owned quantity (with breakdown across storage locations), remaining missing count, and a visual fulfillment progress bar.
* **Modernized Trading Post Market Card:**
  * Replaced static plain-text tables with a dual-card instant buy vs sell order display with live quantities and spread.
* **Keyboard Navigation & Slide Animation:**
  * Added `Escape` key support to immediately close the drawer, backdrop blur, and smooth slide-in transitions.

#### 3. Storage Hub Clarity & Human-Readable Badges (`src/components/inventory/InventoryHubView.tsx`, `src/components/crafting/MaterialDemandTable.tsx`)
* **Elimination of Cryptic Abbreviations:**
  * Replaced abbreviated text snippets with visual micro-badges featuring authentic icons and full localized names:
    * 📦 **Material Storage** (`Material Storage: 52`)
    * 🏦 **Bank** (`Bank: 10`)
    * 🗃️ **Shared Inventory** (`Shared: 5`)
    * 👤 **Character Bags** (`Lyra Dawnblade: 2`)
  * Displays clean micro-pills with tooltips in both the Key Legendary Materials row and the Material Demand Table.

#### 4. MumbleLink Spatial Telemetry & World Map Auto-Hide (`src/data/gw2/mumble.ts`, `src/App.tsx`, `src/components/SettingsModal.tsx`)
* **Live Spatial Compass Wayfinding:**
  * Added `calculateSpatialWayfinding` evaluating player coordinates (`playerX`, `playerY`) and camera rotation (`compassRotation`).
  * Displays real-time distance labels (`1.4 km`) and dynamic directional compass arrows (`↗ NE`) pointing directly towards active world bosses on the current map in both `EventCard.tsx` and `MiniWidget.tsx`.
* **World Map Auto-Hide (`mumbleAutoMapDim`):**
  * Automatically detects when the in-game full-screen world map is open (`isMapOpen` via `uiState & 0x01`). Fades out the overlay to 4% opacity and enables full mouse click-through so map navigation is never obstructed. Toggleable in Settings with full DE/EN localization.

#### 5. Daily Timegated Crafting Tracker (`src/domain/dailyCrafting.ts`, `src/components/crafting/DailyCraftingCard.tsx`)
* **Account Cooldown Synchronization (`/v2/account/dailycrafting`):**
  * Tracks all 9 core ascended daily crafts with live net profitability modeling (deducting 15% TP fees and factoring in NPC vendor reagent prices).
* **Spacious 2-Tier Card Grid & Compact Status Badges:**
  * Redesigned layout into responsive cards (`minmax(360px, 1fr)`) with clean status badges (`Ready` / `Done`), zero text-icon overlaps, and 1-click waypoint copying (`[&...]`).
* **Tactile Manual Check-Off & Filter Toolbar:**
  * Allows players to immediately toggle crafts as completed locally without waiting for the 5–10 minute GW2 API cache.
  * Added filter pills: *All (9)*, *Ready*, *Completed*, plus category tabs (*Ascended Refinements* vs *Special Collections*).

#### 6. Full Legendary Armory Expansion (`src/components/legendary/`, `src/domain/legendary.ts`, `src/data/community/`)
* **Complete Multi-Category Coverage:**
  * Expanded armory tracking to include all GW2 legendary equipment: Weapons Gen 1–4, Rings (*Coalescence, Conflux*), Accessories (*Aurora, Vision*), Amulets (*Prismatic Champion's Regalia, Transcendence*), Backpacks (*Ad Infinitum, The Ascension, Warbringer*), Relics (*Legendary Relic*), and 6-piece Armor Sets (*Obsidian & Perfected Envoy*).
* **Official Armory Account Integration (`/v2/account/legendaryarmory`):**
  * Live detection of account-unlocked legendaries with golden *"Unlocked in Armory"* tags and a quick-filter toggle: *"Hide Unlocked Legendaries"*.

#### 7. Trading Post Delivery Box Alert (`/v2/commerce/delivery`, `src/components/Header.tsx`, `src/components/MiniWidget.tsx`)
* **Live Delivery Notifications:**
  * Added real-time notification pills in the header and Mini-HUD whenever coins or items are waiting for pickup at the Trading Post, with 1-click waypoint copying to Lion's Arch (`[&BEYAAAA=]`).

#### 8. Quality Assurance & Test Suite
* **163 Automated Unit & Integration Tests:**
  * All 163 tests passing cleanly in Node.js test runner (`node --test tests/*.test.ts`).
* **Strict Type Safety & Internationalization:**
  * 0 errors under `tsc --noEmit`.
  * 100% key parity across German and English dictionaries in `src/i18n/index.ts`.

---

## [0.3.3] - 2026-11-04

### Added & Improved

#### Crafting Suite UI & UX Redesign (`src/components/crafting/LevelPlanner.tsx`, `src/index.css`)
* **Unified Crafting Suite Header (`.planner-suite-header`):**
  * Consolidated disparate control bars into a modern, cohesive header panel.
  * Displays discipline profile with official 44px discipline icon, localized name, and accurate max rank badge (e.g. `0–400` for Jeweler, `0–500` for all other disciplines).
  * Direct character context selector with live API verification badges (`API Verified` / `Locally Tracked`).
  * Interactive rank range stepper with quick-target buttons (`[400 Max]` for Jeweler, `[400 Master]` and `[500 Grandmaster]` for 500-cap professions).
* **Focused Leveling Strategy Selector (`.planner-strategy-selector-suite`):**
  * Replaced cramped, ambiguous mode pills with 4 structured visual strategy cards featuring distinct icons, active golden accents, and clear benefit descriptions:
    * 🌟 **Budget Bulk Leveling (Recommended)** (`cost`): 0–30 refinements, 1x discovery + 25x bulk – saves gold, clicks & effort.
    * ⚡ **Fast-Track Leveling** (`fast`): Larger bulk batches, minimum craft steps & clicks.
    * 📦 **Prioritize Account Stock** (`goal`): Consumes existing materials from bank & material storage first.
    * 🔍 **Discovery & Collection** (`completionist`): Maximum unique recipe discoveries to complete your crafting book.
* **Streamlined Workflow & Procurement Toolbar (`.planner-workflow-toolbar`):**
  * Unified segmented procurement controls: 🔨 *Craft Ingredients Self (Recommended)* (intermediate refinement yields extra XP and saves up to 60% gold) vs 🛒 *Buy Finished Components* (buys blades, hilts, panels on TP to save time).
  * Clear toggle controls for `✨ 1× Discovery + Bulk Crafting` and `👁️ Only Open Steps`.
  * Integrated real-time Trading Post price pulse dot and refresh trigger.
* **Consolidated KPI Summary Strip (`.planner-kpi-summary-strip`):**
  * Floating financial and progression summary bar displaying Net Cost (factoring in liquidation resale proceeds), Gross Outlay, Master Craftsman Savings, Crafts & Steps count, and an interactive progress bar with a 1-click checkmark reset button.
* **Structured Tier Roadmap (0–500):**
  * Prominent tier cards for Tiers 1 through 6 (Novice, Initiate, Apprentice, Journeyman, Adept, Master) featuring step/craft counts, tier investment costs, mini progress bars, and smooth click-to-scroll navigation. Automatically adapts to 400 cap for Jeweler.
* **Actionable Next Action Spotlight & Step Cards:**
  * Prominent spotlight card focusing on the next immediate crafting task with explicit combined operation tags (`✨ 1× Discovery` + `🔨 24× Bulk Craft`).
  * Removed redundant duplicate text buttons on step cards in favor of a clean, responsive single-checkbox design.

#### Algorithmic Bulk-First Leveling Engine (`src/domain/levelPlanner.ts`)
* **Bulk-First Progression Engine (0–30 Refine + 1x Discovery + 25x Bulk):**
  * Overhauled candidate evaluation and execution loop to match how seasoned players actually level crafting efficiently in Guild Wars 2.
  * Tier start ranks (0–25, 75–100, 150–175, etc.) prioritize cheap, decay-free material refinements (ores into ingots, logs into planks, raw leather into sections, cloth scraps into bolts).
  * Sub-tier progression performs a single discovery craft to unlock the recipe in the player's crafting station, then **immediately executes an optimal repeat bulk batch (20–25x)** before yellow/green decay waste occurs.
  * Eliminates the tedious, click-heavy 100+ single-discovery swapping that plagues other calculators while keeping total costs competitive.
* **Full Support Across All 8 Disciplines:**
  * **Weaponsmith, Huntsman, Artificer:** Ore/wood refinement ➔ 1x discovery of cheapest weapon slots (e.g. Dagger, Pistol, Focus) ➔ bulk repeat crafting.
  * **Armorsmith, Leatherworker, Tailor:** Ore/leather/cloth refinement ➔ 1x discovery of cheapest armor slots (Boots, Gloves, Helm) ➔ bulk repeat crafting.
  * **Jeweler:** Refines metal ingots and gems (Pebbles ➔ Nuggets ➔ Ingots) ➔ 1x discovery (Earring/Ring) ➔ bulk repeat crafting. Max rank is strictly capped at 400.
  * **Chef:** 0–50 basic staple cooking ingredient refinements (Dough, Loaf of Bread, Seasonings) ➔ 1x discovery ➔ bulk repeat crafting.
* **Auto-Learned Standard Recipe Utilization (0–400):**
  * Capitalizes on base game auto-learned recipes (refinements, components, utility potions, maintenance oils, standard gear) to bypass discovery friction whenever cost-effective.

#### Internationalization & Localization (`src/i18n/index.ts`)
* **100% Key Parity Maintained:**
  * Added and updated 12 new localization keys for the strategy selector cards, procurement workflow, and quick target buttons.
  * Verified exact key parity between German (`de`) and English (`en`) across 849 dictionary keys.

---

## [0.3.2] - 2026-11-04

### Added & Improved

#### Security & Credential Isolation (`src/App.tsx`, `src/data/gw2Api.ts`)
* **Plain-Text API Key Elimination:**
  * Purged plain-text `apiKey` storage from `localStorage.getItem('gw2_overlay_settings')` on application bootstrap.
  * Sanitized `updateSettings` to ensure plain-text API keys are never serialized to browser `localStorage`.
  * API keys are now exclusively persisted and loaded using Windows DPAPI encryption via Electron `safeStorage` IPC.

#### Master Craftsman Vendor Catalog Overhaul (`src/data/crafting/masterCraftsmanVendors.ts`, `src/domain/costs.ts`)
* **Item ID Verification & Catalog Cleanup:**
  * Resolved 14 corrupted and mismatched item IDs in `MASTER_CRAFTSMAN_MATERIALS` and `KNOWN_VENDOR_PRICES` against the official Guild Wars 2 items database:
    * Stick of Butter: corrected to item ID `12138` (was miscoded as Apple `12165`).
    * Bell Pepper: corrected to item ID `12235` (was miscoded as Cinnamon Sugar `12177`).
    * Vanilla Bean: corrected to item ID `12234` (was miscoded as Salt & Pepper `12178`).
    * Black Peppercorn: corrected to item ID `12236` (was duplicate Soy Sauce `12271`).
    * Thyme Leaf: corrected to item ID `12248` (was Chili Seasoning `12278`).
    * Parsley Leaf: corrected to item ID `12246` (was Zucchini Bread `12285`).
    * Celery Stalk: added official item ID `12240`.
    * Snow Truffle: added official item ID `12144`.
    * Icy Runestone: confirmed official item ID `19676` (10,000c from Rojan the Penitent).
  * Removed obsolete and duplicate entries (`12337`, `12338`, `12176`, `12134`, `12286`, `12290`).
* **Official Master Craftsman Recipe Sheets:**
  * Overhauled `MASTER_CRAFTSMAN_RECIPE_SHEETS` with verified official Guild Wars 2 recipe IDs:
    * Ravaging Iron Imbued Inscription: recipe ID `204`.
    * Rejuvenating Iron Imbued Inscription: recipe ID `205`.
    * Ravaging Steel Imbued Inscription: recipe ID `211`.
    * Rejuvenating Steel Imbued Inscription: recipe ID `212`.
    * Carrion Darksteel Imbued Inscription: recipe ID `218`.
    * Cleric's Darksteel Imbued Inscription: recipe ID `219`.
    * Ravaging Intricate Wool Insignia: recipe ID `225`.
    * Honed Intricate Wool Insignia: recipe ID `227`.
    * Hunter's Intricate Cotton Insignia: recipe ID `235`.
    * Vigorous Intricate Cotton Insignia: recipe ID `237`.
  * Removed auto-learned recipes (`19828`, `19834`, etc.) and non-sheet containers that do not require recipe purchase.

#### Cost Optimizer & Level Planner Fixes (`src/domain/costOptimizer.ts`, `src/domain/levelPlanner.ts`)
* **Intermediate Component Self-Craft Cost Aggregation:**
  * Fixed phantom savings calculation bug in `buildCostComparisonSummary`: ingredient purchase costs for preparation crafts are now accurately summed in `intermediateSelfCraftCost` and compared against direct Trading Post purchases.
* **GW2Crafts Benchmark Integration:**
  * Updated benchmark call in `planDisciplineLeveling` to pass `recipesByOutput` and planning `variant` to `computeGw2CraftsBenchmark`, ensuring accurate real-time reference comparisons.

#### MumbleLink Telemetry & Map Awareness (`src/data/gw2/mumble.ts`, `src/data/events.ts`)
* **Verified Tyrian Map Zone Catalog:**
  * Overhauled `GW2_MAP_ZONE_MAP` with official map IDs covering Core Tyria, Heart of Thorns, Path of Fire, End of Dragons, Secrets of the Obscure, and Janthir Wilds.
* **100% Meta-Event Map ID Coverage:**
  * Bound explicit official `mapId` values across all 58 meta-events and world bosses in `EVENTS`, enabling instant and reliable `📍 ON YOUR MAP` telemetry highlights when traveling through Tyria.

#### Project & Tooling Modernization (`package.json`, `LICENSE`, `README.md`)
* **ESM Modernization:** Added `"type": "module"` to `package.json`, completely eliminating typeless ESM warnings across Node.js 22/24 runners.
* **Dependency Pruning:** Removed unused `cross-env` dependency.
* **License Compliance:** Added standard root `LICENSE` (MIT).
* **Documentation:** Updated `README.md` with v0.3.2 notes and .NET CSC build documentation.

---

## [0.3.1] - 2026-11-01

### Added & Improved

#### Unified Discovery & Subsequent Production Workflow (`src/domain/levelPlanner.ts`, `src/components/crafting/LevelPlanner.tsx`)
* **Combined Discovery and Crafting Operations:**
  * Consolidated recipe discovery and subsequent repeat crafting into ONE single coherent leveling operation card (e.g. *Level 25 → 32: Discover & Craft Mighty Bronze Dagger (17x)*).
  * Explicitly communicates the dual nature of discovery in Guild Wars 2: 1x discovery craft at the discovery station produces the initial item and permanently unlocks the recipe, followed by {N}x repeat crafts using the unlocked recipe.
  * Preserves full material and cost transparency: the expanded details view displays the 1x discovery ingredient formula alongside subsequent repeat craft requirements without double-counting output items or ingredients.
  * Preserves all completion checkboxes, skip buttons, defer actions, and progress tracking seamlessly.

#### Crafting Route Intelligence & GW2Crafts Independent Validation (`src/domain/levelPlanner.ts`, `src/domain/gw2craftsReference.ts`, `src/data/crafting/gw2craftsSnapshot.ts`)
* **GW2Crafts Benchmark & Offline Snapshot Engine:**
  * Created complete offline structural snapshot across all 8 disciplines and tiers, repriced deterministically at live Trading Post prices without external network dependencies.
  * Side-by-side comparison matrix validating Omnitria's leveling paths against GW2Crafts normal guides.
* **Economic Defense Against Precursor and Lodestone Traps:**
  * Excluded 140+ precursor collection items (*Handcrafted*, *Experimental*, *Perfected*) and untradable account-bound components (such as *Ineffable Inscriptions*) from leveling routes.
  * Capped resale deductions against illiquid Trading Post buy orders, eliminating catastrophic runaway production on expensive lodestone weapons (reducing Weaponsmith 400–500 cost from 180g to 59g, and Huntsman from 352g to 53g).
  * Eradicated all 9 artificial gaps across 0–400 leveling by balancing tier-start refinements and healthy bulk items.
* **Discipline Maximum Ranks & Cooking Specialization:**
  * Capped Jeweler strictly at rank 400 (`DISCIPLINE_MAX_RANK.Jeweler = 400`), matching official in-game mechanics.
  * Capped Chef standard crafting routes at rank 450 (`DISCIPLINE_CRAFTING_ROUTE_CAP.Chef = 450`) with an explicit advisory notice directing players to the in-game Gourmet Training questline with Seimur Oxbone for ranks 450–500.

#### Master Craftsman NPC Catalog Corrections (`src/data/crafting/masterCraftsmanVendors.ts`, `src/domain/costs.ts`)
* **Corrected Cooking Ingredient Item IDs:**
  * Fixed incorrect item IDs for chef base ingredients (Flour `12136`, Yeast `12152`, Vinegar `12157`, Soy Sauce `12271`, Buttermilk `12137`, Cheese Wedge `12159`, Sugar `12155`), ensuring authentic vendor purchase decisions and accurate pricing.

#### GW2 Wiki Outage Audit & Offline-First Resilience (`src/components/common/labels.ts`, `src/components/common/ui.tsx`, `src/data/external.ts`, `electron/main.cjs`)
* **Offline Bundled Crafting Discipline Emblems:**
  * Downloaded and bundled all 8 official crafting discipline tango emblems directly into `public/assets/disciplines/*.png`.
  * Eliminated external HTTP requests and hotlinking to `wiki.guildwars2.com/images/thumb/...`, preventing broken images, network stalls, and UI flashing when the wiki experiences downtime or purges thumbnail CDN caches.
* **Three-Tier Icon Resilience Architecture:**
  * Tier 1: Local bundled asset (`./assets/disciplines/*.png`) with 0ms load latency and 100% offline reliability.
  * Tier 2: Verified live GW2 Wiki full-resolution image URL (`https://wiki.guildwars2.com/images/...`) as secondary fallback.
  * Tier 3: Official ArenaNet Render API item proxy (`DISCIPLINE_ICON_ITEM`) as tertiary failover.
* **Bilingual Wiki Search & Direct Article Resolution (`src/data/external.ts`):**
  * Upgraded `wikiSearchUrl(query, lang)` to dynamically route German queries to `wiki-de.guildwars2.com` and English queries to `wiki.guildwars2.com`.
  * Added `wikiArticleUrl(title, lang)` for direct page navigation with automatic space-to-underscore conversion.
  * Fixed language mismatch in `MaterialDetail.tsx` where English item names were previously queried against the German wiki.
* **1-Click Wiki Lookup for Achievements & World Events:**
  * Added contextual Wiki lookup buttons to `AchievementsView.tsx` (card actions) and `EventCard.tsx` (event actions), opening walkthroughs, tactics, and mechanics in the user's active language.
* **Electron External Host Allowlist Hardening (`electron/main.cjs`):**
  * Added `gw2crafts.net` to `EXTERNAL_HOSTS` alongside `wiki.guildwars2.com` and `wiki-de.guildwars2.com`, ensuring external guides and wiki lookups open safely in the default system browser without being blocked.
* **Comprehensive Automated Wiki Resilience Test Suite (`tests/wikiResilience.test.ts`):**
  * Added 7 dedicated unit tests verifying bilingual search URL generation, article link construction, physical disk existence and file integrity of bundled PNG emblems, secondary fallback URLs, item proxies, and Electron host allowlists.

---

## [0.3.0] - 2026-11-01

### Added & Improved

#### Crafting Intelligence & Multi-Option Cost Optimizer (`src/domain/costOptimizer.ts`, `src/domain/costs.ts`, `src/domain/levelPlanner.ts`)
* **Economic Cost Optimization Engine:**
  * Re-architected the Crafting Level Planner from a simple greedy rank solver into a multi-option economic cost optimizer.
  * Evaluates 4 distinct procurement and production pathways for every crafting rank:
    1. Direct Trading Post instant buy vs buy orders.
    2. Master Craftsman / NPC Vendor purchase.
    3. Self-crafting intermediate components vs purchasing finished components.
    4. Discovery recipe combos vs bulk repeat manufacturing.
* **Opportunity Cost Calculation for Owned Materials:**
  * Accurately factors in the economic opportunity cost of owned storage/bank materials (`Math.floor(tpBuy * 0.85)` net liquidation value after 15% Trading Post fees or vendor sell value) rather than treating in-stock items as arbitrarily 0 copper.
  * Reports both **Gross Material Outlay** and **Economic Net Cost** across all plan summaries.
* **Liquidation & Resale Value Deduction:**
  * Automatically calculates expected resale proceeds for crafted weapons, armor, and intermediate products (TP instant sell minus 15% exchange fees or NPC vendor value).
  * Deducts expected resale proceeds to surface the true **Net Leveling Cost** of reaching the target crafting rank.
* **Intermediate Self-Craft vs Purchase Decision:**
  * Fixed an issue where intermediate self-crafting was prioritized unconditionally; the planner now computes the exact sum of sub-ingredients and only recommends self-crafting when it is genuinely cheaper than buying finished components on the Trading Post or when extra crafting XP is desired.

#### Master Craftsman & NPC Vendor Integration (`src/data/crafting/masterCraftsmanVendors.ts`)
* **Comprehensive Data-Driven NPC Catalog:**
  * Integrated complete vendor material lists for all 8 disciplines (Lump of Tin, Lump of Coal, Lump of Primordium, Thermocatalytic Reagent, Spool of Thread from Jute to Gossamer, and Chef base/karma cooking ingredients).
  * Manages vendor pricing data-driven in a dedicated module rather than hardcoded component decisions.
* **Master Craftsman Recipe Sheets & Unlock Costs:**
  * Cataloged Master Craftsman recipe sheets for inscriptions, insignias, and bags requiring recipe sheets (`flags: ['LearnedFromItem']`).
  * Cross-references the player's account unlocked recipes (`/v2/account/recipes`). If not yet known, incorporates the exact purchase cost of the recipe sheet into the leveling comparison.
* **Dynamic NPC vs. Trading Post Price Comparison:**
  * Updated `unitPrice()` to dynamically compare live TP prices against fixed vendor costs, strictly avoiding assumptions that one is always cheaper or more expensive.

#### GW2Crafts Reference Engine & Benchmark Comparison (`src/domain/gw2craftsReference.ts`)
* **Algorithmic Reference Integration:**
  * Modeled the standard proven leveling blueprint of `gw2crafts.net` for all 8 disciplines (0–75, 75–150, 150–225, 225–300, 300–400, 400–500).
  * Computes the real-time benchmark cost of the GW2Crafts standard guide at current Trading Post prices.
* **Comparative Analysis & Transparency:**
  * Added side-by-side comparison displaying cost difference, savings percentage, and specific reasons why Omnitria's plan optimizes the route (e.g. account inventory utilization, Master Craftsman fixed prices, and resale value deductions).
  * Direct one-click link to the official `gw2crafts.net` guide for external verification.

#### Interactive UI & Level Planner Expansion (`src/components/crafting/LevelPlanner.tsx`, `src/index.css`)
* **New "Kosten & GW2Crafts" Subtab:**
  * Added a dedicated subtab featuring 4 KPI metric cards: *Netto-Leveling-Kosten*, *Brutto-Materialaufwand*, *Händler-Ersparnis*, and *Lagerbestands-Wert*.
  * Interactive 4-way Cost Comparison Matrix table (`Möglichkeit | Berechnete Kosten | Bewertung & Einsparung`).
  * Full GW2Crafts Comparative Card with benchmark statistics, advantage bullets, and tier-by-tier blueprint breakdown.
* **Discipline Special Handling:**
  * **Jeweler (Juwelier):** Hard-capped at rank 400 with an informative notice that Jeweler has no rank 500 in Guild Wars 2.
  * **Chef (Koch):** Special advisory notice for ranks 400–500 explaining feast discoveries (400–425) and the Seimur Oxbone Sous Chef questline (450–500).
* **Price Freshness & Timestamp Indicator:**
  * Live status pill in the summary strip displaying a pulsing green indicator, time since last Trading Post price fetch, and an instant manual refresh button.

#### Automated Testing Suite (`tests/craftingIntelligenceV030.test.ts`)
* Added 8 new automated unit tests covering vendor catalog verification, NPC vs TP dynamic price comparison, recipe sheet unlock costs, resale liquidation deductions, 4-way comparison summary output, GW2Crafts benchmark calculation, and full planner route optimization. Total test count increased to 134 passing tests.

---

## [0.2.9] - 2026-11-01

### Added & Improved

#### MumbleLink Live Telemetry & In-Game Context Awareness (`electron/MumbleReader.cs`, `src/data/gw2/mumble.ts`)
* **Real-Time Guild Wars 2 Shared Memory Mapping (`MumbleLink`):**
  * Created a lightweight, standalone C# memory reader (`electron/MumbleReader.cs`, compiled to 6 KB `electron/mumble-reader.exe`) that continuously reads the official ArenaNet `MumbleLink` memory structure.
  * Fully compliant with ArenaNet third-party policies: strictly read-only, zero DLL injection, and zero simulated keystrokes.
  * Captures live telemetry including character name, profession, race, map ID, player coordinates, camera rotation, and UI bitmask state (`uiState`).
* **Automatic Active Character Synchronization (`src/App.tsx`, `src/data/progressStore.ts`):**
  * Automatically switches the active character context in the Level Planner and Inventory views to match the character currently logged in and active in Guild Wars 2, eliminating manual dropdown selection.
* **Current Map Event Highlighting (`src/components/EventCard.tsx`, `src/components/MiniWidget.tsx`):**
  * Added dynamic map matching connecting official GW2 `mapId`s and zone names across Core Tyria, Heart of Thorns, Path of Fire, End of Dragons, Secrets of the Obscure, Janthir Wilds, and Visions of Eternity.
  * Displays an emerald `📍 HIER AUF DEINER KARTE` / `📍 ON YOUR MAP` badge and subtle border illumination whenever an active or upcoming World Boss or Meta-Event takes place on the player's current map.
* **In-Combat Full Auto-Stealth (`src/App.tsx`, `src/index.css`):**
  * Leveraged `uiState & 0x40` (`isInCombat`) to completely hide the overlay (`opacity: 0`, `visibility: hidden`, `pointer-events: none`) during in-game combat.
  * Seamlessly passes mouse clicks through to the game window during combat to prevent accidental interface interactions, instantly restoring full visibility and controls upon leaving combat.
* **MumbleLink Settings & Live Status Panel (`src/components/SettingsModal.tsx`):**
  * Added a dedicated MumbleLink settings card with live connection status indicators (pulsing green dot when connected, character name, profession, current zone, and combat state).
  * Provided user toggles for MumbleLink telemetry, character auto-switching, in-combat auto-dimming, and current map event highlighting.
* **Comprehensive Test Suite (`tests/mumbleLink.test.ts`):**
  * Added 9 automated unit tests verifying map matching, multi-zone handling, profession/race localization in English and German, combat bitmask decoding, and standalone reader executable verification.

#### Shopping List Overhaul, Tier Grouping & Navigation Restructuring (`src/components/crafting/LevelPlanner.tsx`, `src/components/inventory/InventoryHubView.tsx`, `src/components/Gw2NavRail.tsx`)
* **Shopping List Tier-Based Organization:**
  * Categorized all planned crafting purchases into distinct **Tiers 1 to 6** (Novice 0–75 through Master/Grandmaster 400–500) and Master Craftsman NPC vendor supplies.
  * Prominent Tier header rows show tier level, rank range, material count, missing items, and subtotal cost in gold/silver/copper.
  * Added interactive toolbar with live material search and filter chips: `Alle`, `Nur fehlende`, `Handelsposten`, `Händler`.
  * Reworked column proportions and table layout (`Icon`, `Material`, `Gesamtbedarf`, `Vorhanden`, `Noch kaufen`, `Einzelpreis`, `Gesamtkosten`), eliminating horizontal clipping and coin overflow.
  * Solid `#161922` sticky header prevents scrolled rows from bleeding through.
* **Character Progression Hub Category (`src/components/crafting/CharacterProgressionView.tsx`):**
  * Decoupled general character progression (Level 1–80 milestones, story chapters, dungeons, gear checkpoints, and masteries) from crafting subtabs into its own dedicated component.
  * Added `Charakter-Leveling (1–80)` as a primary category under **Inventar & PvE-Zentrale**, keeping the Crafting view 100% focused on handcrafting disciplines.
* **Streamlined Main Navigation Menu (`src/components/Gw2NavRail.tsx`):**
  * Reordered main navigation rail to: **1. Eventübersicht**, **2. Inventar & PvE-Zentrale**, **3. Handwerk & Berufe**, **4. Legendäre Waffen**, **5. Erfolge**.
* **MumbleLink Telemetry Performance Throttle (`src/data/gw2/mumble.ts`):**
  * Implemented semantic change detection to eliminate a 20 Hz React re-render storm across `App.tsx` and 57 `EventCard` components caused by player coordinate jitter.
  * Combat transitions, map changes, and character switches remain instant (< 50ms), reducing idle/movement CPU usage by over 95%.
* **Expanded Automated Test Suite (`tests/shoppingListAndCharacterProgression.test.ts`):**
  * Added 6 unit tests covering tier classification, shopping filters, MumbleLink semantic jitter suppression, and navigation tab order.
  * Total automated test count increased to **126 / 126 passing tests** across 12 test suites.

---

## [0.2.8] - 2026-11-01

### Fixed & Improved

#### Crafting Level Planner & Endgame Discovery Optimization (`src/domain/levelPlanner.ts`, `src/domain/craftingXp.ts`)
* **Endgame Discovery Routing (450–500):**
  * Actively recommends exotic discovery recipes with 2.5x bonus XP for ranks 450/470 to 500, significantly reducing the gold and material costs required to reach max rank.
  * Enforced single-craft execution (`craftsExact: 1`) for discovery steps. Once discovered, recipes are added to the planned set so they cannot be accidentally bulk-crafted.
* **Tier Progression & Refinement Protection (0–450):**
  * Preserved normal 0–450 leveling progression. At each tier start (ranks 0–25, 75–100, etc.), basic material refinements (ores, wood, cloth, leather) remain strictly prioritized before intermediate components or discoveries.
* **Accurate Recipe Discovery Tracking (`src/data/gw2/account.ts`, `src/domain/levelPlanner.ts`):**
  * Merged official `/v2/account/recipes` sheet unlocks, character-specific discoveries, and manual planner checkmarks into a unified set to accurately identify known vs. undiscovered recipes.

#### Crafting Calculation Stability & Reactivity (`src/data/gw2/prices.ts`, `src/domain/craftingCalculator.ts`, `src/components/crafting/LevelPlanner.tsx`)
* **Eliminated `Infinity` and `NaN` Display Errors:**
  * Excluded time-gated ascended recipes (`RefinementEctoplasm`, `RefinementObsidian`) such as *Bolt of Damask* and *Glob of Elder Spirit Residue* from bulk leveling candidates.
  * Added `Number.isFinite` guards to recursive material requirement calculations (`visitGross`, `visitNet`) and procurement sum aggregations.
* **Instant Trading Post Price Synchronization on Startup:**
  * Added an atomic `version` counter in `src/data/gw2/prices.ts` via `useSyncExternalStore`.
  * Wired `prices.version` into `LevelPlanner.tsx`, `DiscoveryView.tsx`, and `LearnedRecipesView.tsx`. When asynchronous price batches arrive on application startup, the plan recalculates immediately without requiring a manual toggle of the discovery checkbox.

#### Performance Audit & Quality Assurance (`tests/craftingPerformanceAndCostAudit.test.ts`)
* Precomputed rank capabilities via $O(C)$ typed array bitmasks, keeping route planning times below 50ms across all 9 crafting disciplines.
* Complete test suite passing cleanly with 111/111 unit tests and 0 TypeScript errors.

---

## [0.2.7] - 2026-10-30

### Added & Improved

#### Visual Update Indicators & Automated Background Service (`src/domain/updateChecker.ts`, `src/components/*`, `src/index.css`)
* **Left Navigation Rail Update Indicator (`src/components/Gw2NavRail.tsx`, `src/index.css`):**
  * Added pulsing amber notification dot (`.nav-update-dot`) on the Settings gear icon.
  * Added distinct golden `UPDATE` pill badge (`.nav-rail-update-pill`) positioned underneath the Settings navigation label.
  * Applied warm amber left-border glow and ambient background highlighting (`.settings-item.has-update`).
  * Enriched tooltip dynamically displaying `Update v{latestVersion} verfügbar – Klicke zum Installieren`.
* **Top Header Quick-Access Pill & Notification Dot (`src/components/Header.tsx`, `src/index.css`):**
  * Added clickable `[✨ Update v{version}]` badge button (`.gw2-header-update-pill`) directly in the header bar, active across both Full Hero Panel and compact Mini-HUD modes for instant 1-click access to the updater.
  * Added pulsing amber notification dot (`.header-update-dot`) on the Settings button in `.gw2-header-controls`.
* **Automated Background Update Service (`src/App.tsx`, `src/domain/updateChecker.ts`):**
  * Added non-blocking update checks running 2.5 seconds after application startup and repeating every 30 minutes.
  * Queries native Electron IPC (`app-check-update`) with resilient GitHub Releases API fallback.
  * Implemented pure numeric semver parser and comparison service (`parseSemver` and `isNewerVersion`).
  * Directly passes detected update info to `<SettingsModal>` so the 1-click update action is pre-populated immediately upon opening.
* **Test Suite & Verification (`tests/updateChecker.test.ts`):**
  * Added dedicated unit test suite covering semver parsing and version comparison across patch, minor, and major release boundaries.
  * Full test suite passing at 100/100 tests with zero TypeScript errors.

---

## [0.2.6] - 2026-10-30

### Fixed & Improved

#### Crafting Level Planner & Material Acquisition Scoring (`src/domain/levelPlanner.ts`)
* **Account-Bound & Untradable Material Optimizer Penalty:**
  * Fixed an issue in candidate evaluation (`evalCandidate`) where unpriced materials (`a.unit === null`, such as Bloodstone Dust `46731`, Obsidian Shards `19925`, or Empyreal Fragments) received a dummy fallback price of 50 copper. This caused the optimizer to treat high-tier conversion recipes (like Bloodstone Bricks yielding only 5,000 XP for 100 dust) as virtually free, suggesting 318 crafts (31,800 dust) for Artificer 425–500.
  * Unowned materials with no Trading Post price now incur an unbuyable penalty (+250,000 copper), guiding the level planner toward realistic, tradeable recipes (e.g. Berserker/Knight/Assassin weapons).
* **Recursive Intermediate Crafting for Untradable Components:**
  * Fixed material acquisition resolution (`acq` function): craftable intermediate components with no Trading Post price (such as Marauder or Seraph Inscriptions/Insignias) are now recursively routed to `'craft'` when `craftIntermediates` is enabled, resolving to their craftable base ingredients rather than failing back to direct purchase.

#### Crafting Shopping List & Material Demand UI (`src/components/crafting/LevelPlanner.tsx`, `src/components/crafting/MaterialDemandTable.tsx`, `src/index.css`)
* **Untradable Item Indicators & Advisory Banners:**
  * Added distinct warning badges (`.badge-untradable`) displaying `[Accountgebunden]` / `[Nicht handelbar]` (`⚠️`) in both the Shopping List and Material Demand tables for untradable or account-bound items.
  * Added top advisory banner (`.planner-untradable-banner`) on the Shopping List when untradable items are present, advising players that these materials must be gathered or supplied from account inventory and cannot be acquired on the Trading Post.
  * Integrated Master Craftsman vendor pricing fallback (`unitPrice(price, itemId)`) for common vendor reagents (Thermocatalytic Reagents, Silk Thread, Coal, Peacemaker/Master reagents).

#### Test Suite & Verification (`tests/craftingCalculator.test.ts`)
* Added unit test #14 validating recursive crafting of untradable intermediate components with active sub-recipes.
* Added unit test #15 validating candidate evaluation penalties for unowned unpriced materials, ensuring tradeable recipes are chosen for leveling.
* All 98 test suites passing cleanly with zero type errors.

---

## [0.2.5] - 2026-10-30

### Added & Improved

#### Official Omnitria Brand Icon & Visual Identity (`assets/icon.png`, `src/components/Header.tsx`, `electron/main.cjs`)
* **Top Header Brand Emblem (`src/components/Header.tsx`, `src/index.css`):**
  * Integrated the official high-resolution Omnitria emblem (`icon.png`) directly into the top header bar (`.gw2-hero-brand` / `.gw2-shield-emblem`), replacing the placeholder vector diamond with authentic branding.
  * Styled with subtle ambient drop-shadow (`filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85))`) and sharp subpixel scaling for both expanded Hero Board and compact Mini-HUD modes.
* **Native Desktop, Windows Taskbar & System Tray Integration (`electron/main.cjs`, `assets/icon.ico`, `index.html`):**
  * Generated multi-resolution Windows ICO (`assets/icon.ico` containing 16, 24, 32, 48, 64, 128, and 256 px frames) for sharp taskbar, Alt+Tab, and thumbnail scaling.
  * Registered Windows Application User Model ID (`app.setAppUserModelId('com.omnitria.gw2overlay')`) ensuring Windows groups the process under Omnitria rather than generic Electron host.
  * Explicitly bound taskbar icon via `mainWindow.setIcon(appIcon)` and ensured persistent visibility (`skipTaskbar: false`).
  * Updated Electron application icon asset (`assets/icon.png`, 1254×1254 RGBA) used for tray context menus and system notifications.
  * Added web favicon declaration in `index.html` (`<link rel="icon" type="image/png" href="./icon.png" />`).
* **Visual Documentation & Multi-Resolution Screenshots (`docs/screenshots/*`):**
  * Re-generated all 15 application view screenshots and high-resolution reference captures (`1520x685` and `1180x780`) reflecting the new brand icon, navigation rail, and UI polish.
  * Prepared version bump to `v0.2.5` across `package.json`, `README.md`, and `SettingsModal.tsx`.

---

## [0.2.4] - 2026-10-30

### Added & Improved

#### Comprehensive UI/UX Redesign & Visual Refinement (`src/index.css`, `src/components/*`)
* **Left Navigation Rail Redesign (`src/components/Gw2NavRail.tsx`, `src/index.css`):**
  * Expanded navigation width from restrictive 68px to optimal 98px layout width (`--nav-width: 98px`), eliminating cramped navigation items and awkward label wrapping.
  * Increased navigation labels from ~10px to 12.5px (`font-size: 12.5px`, semi-bold) with consistent 22px vector pictograms (`Glyphs.tsx`).
  * Distinct active state indicator: illuminated 3px vertical gold edge highlight (`#f1c40f` glow) with rich ambient gold gradient backdrop and high-contrast text.
  * Clear visual separation with consistent 6px vertical spacing between navigation buttons.
  * Added ornamental bronze divider (`.nav-rail-divider`) separating the main navigation tabs from the bottom-anchored Settings & Updates item.
  * Seamless responsive behavior across desktop resolutions (tested at 1180x780 and 1520x685).
* **Typography System & Content Hierarchy (`src/index.css`, `src/components/Header.tsx`, `src/components/EventCard.tsx`):**
  * Centralized typographic scale avoiding micro-text: Main headers at 19px–22px, section titles at 16px–17px, body and navigation at 12.5px–14px, metadata and descriptions at 12px–13px.
  * Upgraded header bar with 19px serif bold title, refined status badges, and proportional 13px–14px control icons.
  * Improved font weight hierarchy, contrast, and line heights throughout all views for readability during intense gameplay.
* **Standardized Interactive Controls & Buttons (`src/index.css`, `src/components/BossFilterBar.tsx`):**
  * Elevated button heights from cramped 24–28px to standardized 32px height (`--btn-h-md: 32px`) across search inputs, action buttons, category filters, and expanders.
  * Implemented clear primary, secondary, and tertiary button visual styles with refined hover, active, and focus states.
  * Polished search inputs with 32px height, generous 10px–12px horizontal padding, and subtle gold focus glow rings.
* **Event Cards & Spatial Separation (`src/index.css`, `src/components/EventCard.tsx`):**
  * Increased vertical gap between event cards from 6px to 10px with enhanced card padding (12px 14px).
  * Prominent event titles (16px bold serif) cleanly differentiated from location, zone, and waypoint metadata (12px).
  * Ambient visual cues for event urgency: active events feature subtle emerald green glow borders and backdrops, imminent events display warm amber accents.
  * Standardized medal boss glyphs (20px) and action buttons (32px height, 13px icons) for rapid waypoint copying and tactics expansion.

#### Authentic In-Game Achievement Catalog & Hero Panel Overhaul (`src/components/AchievementsView.tsx`, `src/data/gw2/achievements/*`)
* **Complete Tyria Achievement Index (8,357 Achievements):**
  * Integrated the full catalog of all 8,357 official Guild Wars 2 achievements spanning all 19 Groups and 360 Categories.
  * Resolved authentic ArenaNet Render icons across all categories and achievements with automatic category-icon fallbacks.
  * Description & instruction fallback normalization: eliminated empty cards for ~5,000 achievements whose objectives were stored in API requirement strings.
* **Authentic In-Game Hero Panel Two-Pane Architecture:**
  * Replicated the in-game Guild Wars 2 Hero panel layout (Heldin / Erfolge `[H]`) with collapsible group tree accordion, live search, and category exploration.
  * Clicking any group row automatically expands and selects its first category.
  * Top milestone reward chest track displaying upcoming 500-AP milestone chests and ornate chests (every 2,500 AP) matching in-game progression.
* **Renamed & Refined Recommendations:**
  * Renamed „KI-Empfehlungen“ to **„Empfohlene Erfolge“** (*„Recommended Achievements“*) with header *„Erfolge & Empfehlungen“*.

### Fixed

#### Status Filter Dropdown & Finished Achievement Recognition (`src/domain/achievementIntelligence.ts`, `src/components/AchievementsView.tsx`)
* **Filter Dropdown Correction:**
  * Removed character world-exploration title (*„Bereits gesehen. Bereits erledigt.“* / *„Been There, Done That“*) from the status filter dropdown.
  * Replaced with clean filter option **„Alle Erfolge“** (*„All Achievements“* / `intel.statusAll`), followed by *„In Arbeit“*, *„Noch offen“*, and *„Abgeschlossen“*.
* **Detection of Completed Achievements:**
  * Handled ArenaNet API (`/v2/account/achievements`) omission of `current` and `bits` on completed achievements (`done: true`), which previously led to `0/177 (0%)` rendering.
  * When `done: true` (or `current >= maxProgress`), achievements are strictly recognized with `isDone: true`, `progressStatus: 'completed'`, `currentProgress: maxProgress`, and `progressFraction: 1.0 (100%)`.
  * Completed cards display badge `✓ Erledigt` (`✓ Completed`), a full golden progress bar, earned AP callout, zero remaining steps, and footer `✓ Erfolg abgeschlossen` instead of open objectives.
  * Fixed sidebar counters to accurately show player's completed achievements tally per category and group (`completed/total`).
  * Hardened map lookups in `getEnrichedAchievements` supporting both number and string ID key resolutions.
  * Added instant fallback to cached API progression on mount to avoid guest-mode flashing during store initialization.
* **Scrollability & Layout Containment:**
  * Resolved flex-basis overflow across `.gw2-main-body-layout`, `.achieve-intelligence-root`, `.gw2-hero-sidebar`, `.gw2-hero-sidebar-tree`, and `.achieve-scroll-view` with `min-height: 0` and custom GW2 bronze/gold scrollbars.

---

## [0.2.3] - 2026-10-29

### Fixed & Improved

#### Full Event Waypoint Audit & Live GW2 API Verification (`src/data/events.ts`, `src/components/AchievementsView.tsx`)
* **Comprehensive Waypoint Audit (58 Events):**
  * Automated full-table verification of every event waypoint against the official Guild Wars 2 REST API (`/v2/continents/1/floors/*`) and official GW2 Wiki event timers.
  * Resolved all invalid chat-link Base64 codes, POI coordinates, and corrected 41 English & German official in-game waypoint designations.
* **Resolved Critical Waypoint Teleport Bugs:**
  * **Tequatl the Sunless:** Fixed typo `[&BNwCAAA=]` (which erroneously routed players to *Izz-Al-Din-Sarayi* in Domain of Vabbi) to official Splintered Coast Waypoint `[&BNABAAA=]`.
  * **The Silverwastes (The Vinewrath & The Breach):** Fixed erroneous code `[&BHoCAAA=]` (which teleported players to Earthshake Waypoint in Frostgorge Sound) to Camp Resolve Waypoint `[&BH8HAAA=]`.
  * **Modniir Ulgoth:** Replaced distant Seraph southern camp `[&BLAAAAA=]` with the direct boss fight Cloven Hoof Waypoint `[&BLEAAAA=]` (*Wegmarke Spalthuf*).
  * **Karka Queen:** Replaced distant southern entry port Pearl Islet `[&BNUGAAA=]` with the canonical Camp Karka Waypoint `[&BNcGAAA=]` (*Wegmarke Karka-Lager*).
  * **Cathedral of Glorious Anticipation (Balthazar):** Corrected typo `[&BPcCAAA=]` (Lone Post) to Glorious Victory Waypoint `[&BPoCAAA=]` (*Wegmarke Glorreicher Sieg*).
  * **Cathedral of Verdance (Melandru):** Corrected typo `[&BB8DAAA=]` (Anchorage) to Verdance Waypoint `[&BBsDAAA=]` (*Wegmarke Kathedrale des frischen Grüns*).
  * **The Gates of Arah:** Corrected typo `[&BCIDAAA=]` (Altar of Murdered Dreams) to Arah Waypoint `[&BCADAAA=]` (*Wegmarke Arah*).
  * **Attack on Tarir (Octovine):** Corrected typo `[&BNYHAAA=]` (Wanderer's Waypoint outside city) to Forgotten City Waypoint `[&BMYHAAA=]` (*Wegmarke Vergessene Stadt*) inside Tarir.
  * **Verdant Brink (Night Bosses):** Replaced Faren's Flyer `[&BO8HAAA=]` with the central Pact Encampment Waypoint `[&BAgIAAA=]` (*Wegmarke Pakt-Lager*).
  * **Serpent's Ire (Vabbi):** Fixed misrouted Vehjin Palace code `[&BO0KAAA=]` to the nearest Market Ruins Waypoint `[&BHQKAAA=]` (*Wegmarke Marktruinen*).
  * **Death-Branded Shatterer (Jahai Bluffs):** Fixed typo `[&BJMLAAA=]` (Venta Pass) to the direct boss staging Soul's Vendetta Waypoint `[&BIMLAAA=]` (*Wegmarke "Rache der Seele"*).
  * **Inner Nayos: Fall of Zakiros (Eparch):** Corrected `[&BEYOAAA=]` (Skywatch Archipelago) to Astral Ward Camp Waypoint `[&BGYOAAA=]`.
  * **Cathedral of Silence (Grenth):** Replaced obsolete code `[&BCgCAAA=]` with Penitent Waypoint `[&BBkDAAA=]`.
  * **The Gang War of Echovald:** Replaced invalid code `[&BO8MAAA=]` with Junkyard Waypoint `[&BIsMAAA=]`.
  * **Gyala Delve (Jade Miner Crisis):** Replaced invalid code `[&BOUOAAA=]` with Luxon Terminus Waypoint `[&BJkNAAA=]`.
  * **Inner Nayos (Heitor's Gate):** Replaced invalid code `[&BNcNAAA=]` with Forward Bivouac Waypoint `[&BHYOAAA=]`.
  * **Lowland Shore: Kodan Gathering:** Corrected typo `[&BO4PAAA=]` to Harvest Den Waypoint `[&BK4OAAA=]`.
  * **Janthir Syntri (Titans Greer & Decima):** Updated to Stricken Plains Waypoint `[&BCoPAAA=]`.
  * **Janthir Convergences:** Updated to Forager's Hunt Waypoint `[&BLcOAAA=]`.
  * **Drizzlewood Coast (South & North Metas):** Fixed Base Camp Waypoint to `[&BGQMAAA=]` and Forward Camp Waypoint to `[&BHIMAAA=]`.
* **In-Game Localization & Name Alignment:**
  * Aligned 41 German and English waypoint names to their exact official in-game strings (e.g. *Wegmarke Schatten der Weissagung* instead of *Augapfel-Felsen*, *Wegmarke Krennaks Gehöft*, *Wegmarke Mantels Ankunft*, *Wegmarke Ende der Geschichte*, *Wegmarke Chalon-Docks*, *Wegmarke Trockenkuppenzugang*).

#### Event Overview & Mini-HUD Performance Optimization (`src/App.tsx`, `src/components/MiniWidget.tsx`)
* **Targeted Schedule Horizon:** Reduced pre-calculated schedule horizon from 16 hours (452 instances) to 4 hours in Mini-HUD mode (123 instances) and 8 hours in Full Board mode, reducing allocation churn and memory footprint by over 60%.
* **Optimized Mini-HUD Category Counters:** Consolidated 4 separate array filtering loops into a single-pass O(N) tally over upcoming instances.
* **Cached Daily/Weekly Evaluation:** Memoized Wizard's Vault daily/weekly event spotlight evaluation in `MiniWidget` per unique event ID, eliminating repetitive regex and timestamp operations on every 1-second countdown tick.
* **Progressive Event Board Rendering:** Added progressive rendering window (first 50 events) with on-demand expansion for the full Hero Board, decreasing DOM tree node count from ~9,000 to ~1,000 elements for sub-1ms render cycles during gameplay.

---

## [0.2.1] - 2026-10-28

### Added & Improved

#### Achievement Intelligence & Decision Support (`Achievements`)
* **First-Class Achievement Intelligence Engine (`src/domain/achievementIntelligence.ts`):**
  * Implemented transparent arithmetic scoring engine replacing arbitrary AI guesses with explainable justifications.
  * Formatted recommendations with clear human-readable rationales in German and English (e.g. *"Empfohlen, da zu 85% abgeschlossen und noch 15 Erfolgspunkte erreichbar sind"* / *"Recommended because you are at 85% completion with 15 AP remaining"*).
* **Live Total Account AP Calculation & Cap Breakdown:**
  * Implemented exact account AP formula conforming to official Guild Wars 2 rules: `Total AP = min(15000, daily_ap + monthly_ap) + sum(permanent_achievements_ap)`.
  * Header dashboard card displays real-time total account AP, 1-click progression refresh button, daily/monthly cap status (`15.000 / 15.000 AP (Cap)`), completed achievements count, and total remaining obtainable points.
  * Synchronized bottom dock with live account AP confirmation (`⭐ [Total AP] AP Gesamt (Konto)`).
* **Central "Best Next Achievement" Hero Card (`src/components/AchievementsView.tsx`):**
  * Prominently highlights the highest-priority upcoming achievement (#1) with category tags, tier progress bar, objective preview chips, remaining obtainable points badge, explainable rationale box, and 1-click clipboard waypoint actions.
  * Resolved flex-shrink layout collision that previously caused the hero card to collapse when rendered above long queues.
* **Rich Achievement Icons (`render.guildwars2.com` & Themed Vector Glyphs):**
  * Integrated full resolution official image URLs with automatic fallback to high-contrast themed vector glyphs (Skull for World Bosses/Metas, Swords for Slayers, Sparkles for Collections, Zap for Fractals, Calendar for Dailies, Layers for Story, Award/Trophy for General).
  * Rendered across the 52px Hero Showcase and 38px card thumbnails with rounded borders and dark gradient backings.
* **Enhanced Visual Separation & Exploration Hierarchy:**
  * **Status Badges:** Distinct visual badges for Completed (`✓ Completed` / `✓ Erledigt`), In Progress (`⏳ In Progress` / `⏳ In Arbeit`), and Unstarted (`○ Unstarted` / `○ Noch offen`).
  * **Podium Rank Badges:** Special gold radiance for #1 (`👑 #1`), silver for #2 (`🥈 #2`), and bronze for #3 (`🥉 #3`).
  * **Card Styling Variations:** Specific background and border tints for completed (`.card-completed`), in-progress (`.card-in-progress`), and rank-1 (`.card-rank-1`) achievements.
  * **Quick Filter Toolbar:** Instant 1-click status filtering with live counters (`All`, `In Progress`, `Unstarted`, `Completed`).
  * **Category Section Banners:** Elegant dividers (`.category-section-banner`) grouping achievements with category icons, completion ratios, and obtainable AP totals.
* **GW2 Tag Sanitization & Typography Polishing:**
  * Automatically filters internal API markup tags (such as `<c=@flavor>...</c>`) from descriptions and objectives for clean readability.
  * Centered header trophy badge with radial dark background and subtle gold glow.
* **Five Tailored Recommendation Strategies:**
  * **Best Next:** Balanced multi-factor ranking combining obtainable points, proximity to completion, and remaining objective counts.
  * **Best Efficiency:** Prioritizes achievements offering the most obtainable AP per remaining objective.
  * **Quick Wins:** Surfaces achievements with the fewest remaining objectives or highest completion percentage.
  * **Highest Reward:** Ranks eligible achievements strictly by maximum remaining obtainable AP.
  * **Continue Progress:** Filters exclusively for partially completed achievements to help players resume in-flight goals.
* **Capped & Repeatable Achievement Accuracy:**
  * Accurately parses tiers and calculates earned AP vs. obtainable AP across multi-tier achievements.
  * Correctly enforces official account point caps on repeatable achievements (such as *Agent of Entropy* [ID: 439] capped at 250 AP), preventing capped achievements from falsely appearing as available AP rewards.
* **Unauthenticated Guest Mode Browsing (`src/data/gw2/achievements/`):**
  * Enables full browsing of public achievement metadata, categories, groups, and requirements without requiring an API key.
  * Connecting an API key with `account` and `progression` scopes automatically synchronizes personal progress without re-fetching static definitions.
* **IndexedDB Metadata Caching & Batch Ingestion:**
  * Caches static achievement definitions, groups, and categories in IndexedDB with a 14-day TTL and offline fallback.

#### Complete WvW Feature Removal
* **Full Removal of WvW Codebase & Assets:**
  * Completely removed all WvW-specific components (`src/components/wvw/`), data services (`src/data/gw2/wvw/`), navigation entries (`Gw2NavRail.tsx`), and types (`src/types.ts`).
  * Removed WvW tactical recommendations, target prioritization heuristics, objective scoring, and background match polling loops.
  * Cleaned up legacy CSS rules, localization keys, and obsolete screenshot assets (`wvw-advisor.png`, `wvw-dashboard.png`, `wvw-flips.png`, `wvw-map.png`).
  * Decoupled Inventory Hub and other views from WvW translation strings.

#### OS Credential Encryption & Key Protection (Windows DPAPI)
* **Secure Credential Storage via Electron safeStorage (`electron/main.cjs`, `electron/preload.cjs`, `src/data/gw2Api.ts`):**
  * Integrated native Windows DPAPI encryption (`CryptProtectData` / `safeStorage`) tying API key encryption directly to the logged-in OS user session.
  * Automatically scrubs plaintext API keys from persistent browser storage upon successful DPAPI encryption.
  * Added visual OS DPAPI Encryption status badge in Settings modal.
  * API keys are completely redacted from console logs, crash reports, and error toasts.

#### Daily & Weekly Event Highlights (`Event Timers` & `Mini-HUD`)
* **Live Wizard's Vault Daily & Weekly Objective Matching (`src/domain/dailyWeeklyEvents.ts`, `src/data/gw2Api.ts`):**
  * Extended official GW2 API progression sync with `/v2/account/wizardsvault/weekly` support alongside `/v2/account/wizardsvault/daily`.
  * Automatically matches active Wizard's Vault Daily and Weekly objectives against corresponding World Events, meta-event maps, and boss encounters via bilingual keyword matchers (`EVENT_TITLE_KEYWORDS`, `REGION_EVENT_MATCHERS`).
  * Displays exact Astral Acclaim rewards (e.g. `DAILY +10 AA`, `WEEKLY +50 AA`) and full objective completion progress in tooltips.
* **Deterministic Daily & Weekly Rotation Highlights:**
  * Added deterministic UTC daily spotlight tracking for high-priority recurring encounters (such as the daily guaranteed Mystic Coin from the *Ley-Line Anomaly* and rotating Core World Bosses) and featured weekly endgame meta-events.
* **Visual Status Badges on Event Cards (`src/components/EventCard.tsx`, `src/index.css`):**
  * Prominent gold `DAILY` (`TÄGLICH`) and cyan-blue `WEEKLY` (`WÖCHENTLICH`) header badges and glow borders on active/upcoming event cards.
  * Dynamically switches to a green checkmark (`.is-done`) once completed today, keeping daily progress clear and immediately visible.
* **In-Game Mini-HUD Daily/Weekly Indicators (`src/components/MiniWidget.tsx`):**
  * Displays clean status badges in Standard view and compact, non-disruptive visual indicators (`Sparkles` / `Award`) in Ultra-Compact view without overflowing or breaking text alignment.
* **Guarded Progression Handling & Stability:**
  * Added crash-proof `Array.isArray` and null-safe guards in `progressStore.ts` and `dailyWeeklyEvents.ts`, ensuring smooth operation regardless of network or API response state.

---

## [0.1.9] - 2026-10-28

### Added & Improved

#### Interactive Level & Progression Planner Overhaul (`Crafting & Disciplines`)
* **Progression Overview & Next Recommended Action (`src/components/crafting/LevelPlanner.tsx`, `src/domain/levelPlanner.ts`):**
  * Added a prominent progression header displaying active character level and next character milestone (e.g., *Lv 10 Personal Story*, *Lv 21 1st Core Specialization*, *Lv 30 Elite Skill*, *Lv 80 Exotic Gear*), current crafting discipline rating and next tier milestone (`75` / `150` / `225` / `300` / `400` / `500`), and overall open/completed/skipped/deferred counts.
  * Highlights the single highest-priority next action (crafting step or character progression task) with a transparent recommendation reason (`Why recommended`), estimated effort (`~X min` based on deterministic crafting and activity formulas), expected progression benefit (`+X ranks`, milestone unlock, or coin cost), and inline 1-click actions (**Complete**, **Defer**, **Skip**, **Undo**).
* **Transparent Multi-Mode Task Prioritization (`Fast Leveling`, `Balanced Progression`, `Completionist`, `Goal-Oriented`):**
  * Added 4 persisted planning modes that directly adjust route calculation and task ordering:
    * **Fast Leveling:** Prioritizes discovery bonus XP (`1.62x` multiplier) and minimum crafting runs.
    * **Balanced Progression:** Combines cost-optimal crafting with exploration, Hero Points, and level-appropriate gear.
    * **Completionist:** Prioritizes undiscovered recipes, intermediate self-crafting, and map completion.
    * **Goal-Oriented:** Prioritizes steps advancing the selected milestone or tracked Legendary weapon dependencies.
  * Automatically filters out completed, skipped, prerequisite-blocked, or unowned-expansion tasks (`HeartOfThorns`, `PathOfFire`, `EndOfDragons`, `SecretsOfTheObscure`, `JanthirWilds` verified via `/v2/account` `access` flags).
* **Stage-Grouped Interactive Workflow & Character Progression (Lv 1–80):**
  * Grouped crafting steps into collapsible tier stages (*Novice 0–75*, *Initiate 75–150*, *Apprentice 150–225*, *Journeyman 225–300*, *Adept 300–400*, *Master 400–500*) with expandable recipe/discovery details on demand.
  * Added a dedicated **Character Progression (Lv 1–80)** sub-tab covering 19 structured Guild Wars 2 progression tasks across 5 stages with live API auto-verification (`/v2/characters`, `/v2/account/worldbosses`, `/v2/account/dailycrafting`) and per-character local persistence (`src/data/progressStore.ts`).

#### Performance, Accessibility (WCAG 2.2 AA) & Asset Loading Overhaul
* **Typography Scale & Readability (`src/index.css`):**
  * Established semantic typography tokens (`--text-2xs: 11px` through `--text-xl: 20px`) and upgraded sub-legible `8px`–`10px` font sizes across navigation labels, progress bars, item stack badges, category pills, dense tables, tooltips, and the compact Mini-HUD.
* **WCAG 2.2 AA Contrast & Keyboard Operability:**
  * Raised `--gw2-text-dim` from `#8e897d` (4.05:1) to `#a6a196` (**5.48:1** on `#15171c` and **5.89:1** on `#111215`, passing WCAG 2.2 AA) and `--gw2-text-muted` from `#5e5a52` (2.14:1) to `#827d73` (**3.65:1**).
  * Replaced `display: none` on `.chk input[type="checkbox"]` with a screen-reader/keyboard-focusable input and `:focus-visible` gold outlines across all interactive controls, tabs, and dialogs.
  * Enlarged cramped interactive hit targets (`.gw2-nav-icon-btn` to `26×26px`, `.mini-icon-btn` to `24×24px`, `.btn-tree-toggle` to `22×22px`) and added dialog/status ARIA semantics (`SettingsModal`, `Header`, `Gw2NavRail`, `Toast`).
* **Faster Icon & Image Loading (`electron/main.cjs`, `src/data/gw2/items.ts`, `src/components/common/ui.tsx`):**
  * Removed `disable-http-cache` in `electron/main.cjs` and configured a 50 MB persistent Chromium HTTP disk cache (`disk-cache-size=52428800`) for `render.guildwars2.com` icons.
  * Added per-item selector hook `useItem(id)` (`useSyncExternalStore`) and `React.memo` on `ItemIcon` and `DisciplineIcon`, eliminating `O(N)` mass re-renders when item batches resolve, plus module-level failed icon URL deduplication (`markIconUrlFailed`, `isIconUrlFailed`) and `decoding="async"`.
* **Layout & Visual Fixes:**
  * Fixed search icon overlap in `AchievementsView`, unstyled flex utilities and `.btn` primitives in `WvwAdvisorView`, Tracked filter button clipping in `WeaponList`, and `widgetMode`/`opacity` hydration normalization in `App.tsx`.

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
