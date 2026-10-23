# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

#### Recursive Crafting & Leveling Calculator
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
* **Comprehensive Test Suite**:
  * Added `tests/craftingCalculator.test.ts` (10 automated unit test cases) covering multi-level intermediates, multiple branches, output count rounding, stock coverage, buy override, partial intermediate stock, missing recipe dependency, cycle detection, and route updates.
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
