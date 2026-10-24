# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

#### Boss & Event Achievements and Visual Overhaul
* **Visual Overhaul for Loot & Tactics (Event Cards)**:
  * Resolved text concatenation bug where loot highlights were squished together with zero spacing.
  * Added `<Info size={11} className="info-btn-glyph" />` icon to the card's Info toggle button with dynamic open/close state.
  * Verified 100% of event item IDs against the official ArenaNet API (`47870` Tequatl's Hoard, `85900` Festive Confetti Infusion, `72021` Chak Egg Sac, `78743` Verdant Brink Chest, `78650` Auric Basin Chest, `69392` Ley Line Spark, `75012` Aurillium, etc.) to eliminate mismatched hover tooltips and broken images.
  * Added complete bilingual support for all 35 world bosses and meta events with English & German loot highlights (`lootHighlightsEn`) and boss tactics (`tacticsEn`).
  * Updated `ItemTooltip` to render localized metadata (Rarity, Type, Level, Binding, Vendor/Trading Post value, Inventory count) in both English and German.
  * Conceptual / non-item drops now render crisp themed Lucide icons and clean localized tooltips instead of unrelated item tooltips.
  * Added dynamic mechanic badge icons in the tactics header (`Breakbar/CC`, `Dodge/Waves`, `Glider/Updraft`, `Rifts/Portals`, `Escort/Defend`, `Special Action`).
  * Updated left event medal glyph to dynamically match event types (dragon, golem, elemental, wurm, pirate, karka, choya, crystal, airship, portal).
  * Introduced dedicated `.gw2-tactics-card` with shield icon and authentic typography.
  * Introduced `.gw2-loot-card` with themed rarity chips (`loot-chip-legendary`, `loot-chip-ascended`, `loot-chip-rare`, `loot-chip-standard`) and dynamic icons (`Gift`, `Package`, `Sparkles`, `Award`).
  * Redesigned the in-game achievements drawer with total AP calculation, authentic GW2 gold accents, and status badges.
* **Exclusive Focus on Boss & Meta-Event Achievements**:
  * Filtered achievements in both the Achievements view and Event Cards to strictly list World Bosses and Expansion Meta Events (Core, HoT, PoF/IBS, EoD, SotO, Janthir).
  * Removed non-boss achievements (woodcutting, vista views, map exploration, jumping puzzles, fractals).
  * Added authentic achievements for previously missing boss events (`verdant-brink-night`, `choya-pinata`, `maws-of-torment`, `serpents-ire`, `aetherblade-assault`, `kaineng-blackout`, `gangs-of-echovald`).
  * Removed fallback generic placeholder `Event-Teilnehmer`.
* **Navigation Streamlining**:
  * Removed the standalone "Wegmarken" (Waypoints) section from the navigation rail and routing, focusing the overlay on Events, Achievements, Crafting, and Legendary weapons.

#### Recursive Crafting & Leveling Calculator
* **Prioritized Self-Crafting & Visual Preparation Chain**:
  * **Self-Crafting Priority over TP Purchases**: When `craftIntermediates` is enabled (now active by default with `all_craft` strategy), the route planner strictly prioritizes crafting intermediate components within the discipline over buying from the Trading Post, even if TP prices are low or vendor components lack TP pricing.
  * **Extended Multi-Tier Depth**: Increased recursive acquisition search depth from 3 to 8 tiers, completely resolving multi-stage crafting pipelines (e.g. `Seidenfetzen => Seidenballen => Seiden-Insignie => Seiden-Wams` or `Holzstamm => Planke => Dübel => Inschrift => Waffe`).
  * **Visual Preparation Flow in Step Cards**: Each step in the Level Planner now includes a dedicated preparation box (`planner-step-prep-box`) displaying the exact chronological sequence of intermediate products to craft beforehand, with item icons, exact craft counts, and flow arrows leading to the target product.
  * **Item Data Pre-Loading**: Updated `allNeededItemIds` and `collectPlannerItemIds` to ensure all intermediate and recursive ingredients are fully preloaded for tooltips and icon rendering.
* **Multi-Tier Intermediate Product Tree Resolution**:
  * Implemented recursive material requirement calculation in `src/domain/craftingCalculator.ts`.
  * Fully resolves intermediate products down through all component tiers (e.g., Weapon → Inscription / Blade → Dowel / Ingot → Wood Log / Ore).
  * Cycle detection prevents recursion loops on complex or cyclic item recipes.
* **Accurate Output Math & Rounding**:
  * Ceiling division (`Math.ceil(demand / outputCount)`) ensures whole crafting runs are calculated correctly without fractional runs or ingredient shortages.
  * Multi-target craft runs aggregate accurately across all steps in the route.
* **Account Inventory & Stock Pool Deduction**:
  * Real-time deduction of items already owned in bank tabs, material storage, shared inventory slots, and character bags.
  * Shared surplus pool: Extra units produced from minimum craft run batches are automatically returned to the pool and reused in downstream recipes.
* **Procurement Strategy Bar (Craft vs. Buy)**:
  * Global strategy toggle between:
    * **Craft All (`all_craft`)**: Maximizes self-crafting of all intermediate components.
    * **Buy All (`all_buy`)**: Procures intermediate components directly from the Trading Post.
    * **Custom (`custom`)**: Per-item overrides for fine-grained user control.
* **View A: Material Demand Table (`MaterialDemandTable.tsx`)**:
  * Comprehensive summary table with gross demand, stock, net demand, procurement badges, unit prices, and line cost totals.
  * Search filter by item name and role filters (*All*, *Only Missing*, *Base Materials*, *Intermediates*, *End Products*).
  * Direct inline toggle button to flip individual items between *Craft* and *Buy*.
* **View B: Interactive Crafting Tree View (`CraftingTreeView.tsx`)**:
  * Hierarchical, collapsible tree structure showing step-by-step production flow.
  * Node-level badges for craft runs, gross requirement, available stock, and procurement action.
  * Quick-expand and collapse all controls.
* **Discovery Recipes in Crafting Tree & Material Procurement**:
  * Full end-to-end propagation of discovery recipes (`needsDiscovery`) and discovery ingredients (`requiredForDiscovery`) from `planLevelRoute` and `createDisciplineRecipeProvider` into `calculateCraftingPlan`, `CraftingTreeView`, and `MaterialDemandTable`.
  * **Herstellungskette (`CraftingTreeView`)**: Added prominent `<Sparkles size={10} /> Entdeckung` / `Discovery` badges for all end products and intermediate components that require experimentation in the discovery tab at the crafting station.
  * **Materialbeschaffungsliste (`MaterialDemandTable`)**:
    * Added discovery badges (`Entdeckung` / `Discovery`) on discovery craft rows and ingredient indicators (`Entdeckungs-Zutat` / `Discovery Ingredient`) on all materials required to perform discoveries.
    * Added dedicated `Entdeckungen` / `Discoveries` filter pill in the table toolbar to filter materials down to only items involved in discovery recipes.
    * Summary footer displays the total count of discovery recipes in the planned route.
  * **Accurate Recipe Mapping**: `calculateCraftingPlan` tracks `recipesUsed` across all traversal steps to prevent end-product demands or intermediate recipes from falling back to 0 when resolved via discovery.
  * **Automated Unit Tests**: Added unit tests 11, 12, and 13 in `tests/craftingCalculator.test.ts` covering discovery end products, discovery intermediate components (e.g. Insignias/Inscriptions with `allowDiscovery: true` vs `false`), and account-unlocked recipes.
* **Comprehensive Test Suite**:
  * Added `tests/craftingCalculator.test.ts` (13 automated unit test cases) covering multi-level intermediates, multiple branches, output count rounding, stock coverage, buy override, partial intermediate stock, missing recipe dependency, cycle detection, route updates, and discovery recipes.
  * Added `tests/plannerRestart.test.ts` verifying restart state sanitation and discovery/intermediate resolution.

---

### Changed

* **Startup Configuration & Default Options**:
  * Crafting level planner options for *“Allow Discovery Recipes”* (`allowDiscovery`) and *“Craft Intermediates”* (`craftIntermediates`) now default to inactive (`false`) on startup and reload.
  * Clean routes load standard direct crafts by default without discovery clutter or intermediate loops.
  * Options remain session-based and are not kept active in `localStorage` across restarts.
* **Clean Step Checkmarks on Restart**:
  * Removed automatic checkmark forcing (`isAutoDone`), ensuring step checkmarks strictly start at `0` on launch.
  * Full manual checking control for users tracking crafting progress step-by-step.
* **Discipline Synchronization**:
  * React `key={discipline}` added to `LevelPlanner` in `DisciplineDetail.tsx` to ensure clean state resets when switching between disciplines.
  * Bidirectional synchronization between the strategy bar (`all_craft` / `all_buy`) and the intermediate crafting checkbox.
* **English Documentation**:
  * Translated `docs/DATENQUELLEN.md` to English for international contributors and documentation consistency.

---

### Fixed

* **Start/Target Rank Collision on Restart**:
  * Fixed an issue where pulling profession ratings from account data caused `fromRank >= toRank` (e.g. 400 to 400), resulting in an empty step route.
  * Target rank is now automatically adjusted to the next milestone (`start + 25`, `400`, or `500`).
  * Added a dedicated max-rank banner with a one-click button to view the full route from rank 0 when a profession is already at maximum rating (500/500 or 400/400).
* **Discovery Intermediate Recipes in `acq`**:
  * Fixed intermediate recipe check in `levelPlanner.ts` (`acq`) to evaluate `isUsable(r)` instead of `isLearned(r)`, allowing intermediate discovery recipes (such as Cooking components) to craft properly when discoveries are enabled.
* **Gross & Net Demand for End Products**:
  * Corrected gross and net demand calculation in `craftingCalculator.ts` for end products and intermediate nodes, fixing the bug where end products displayed `0` total requirement.
* **Electron File Store Mirror Overwrite**:
  * Fixed a bug where asynchronous reading of the Electron file store mirror on startup restored old checkmarks and persisted discovery flags.
