# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.4] - 2026-10-25

### Fixed
* **Legendary Armory Component Tree Storage Depletion**:
  * Fixed depth-first traversal stock allocation bug where raw leaf materials shared across multiple legendary sub-branches (such as `Obsidian Shard` and `Glob of Ectoplasm` demanded by both *Mystic Clovers* and *Gift of Mastery*) starved lower branches, causing the lower node to show `Storage: 0 / 250` instead of account stock (`29 / 230`).
  * Non-craftable leaf materials now evaluate available account storage dynamically (`Math.min(demand, totalStock)`), ensuring all sub-branches display authentic account inventory while the overall Bill of Materials (BOM) cleanly aggregates net missing quantities without double-counting.

### Added
* **Crafting: Learned & Relevant Recipe Catalog (Rezeptbuch)**:
  * Complete overhaul of the *Gelehrte / Relevante Rezepte* tab in Discipline details.
  * Search by item name and rating/level requirement.
  * Tier & Level filter chips (T1 0–74, T2 75–149, T3 150–224, T4 225–299, T5 300–399, T6 400+, Ascended 500).
  * Recipe type chips (Components, Refinement, Armor, Weapons, Consumables, Bags, Feasts, Trinkets).
  * Status badges indicating whether a recipe is directly craftable with current inventory (`Direkt herstellbar`), auto-learned (`Automatisch`), recipe-sheet bound (`Rezeptbogen`), or discovery-based (`Entdeckung`).
  * Live inventory ingredient badges with green/red stock counts, real-time Trading Post crafting cost estimation, and clean pagination.
* **Branding & Documentation**:
  * Centered official high-resolution Omnitria logo (`docs/screenshots/icon.png`) in `README.md`.

---

## [0.1.3] - 2026-10-24

### Added

#### Legendary Armory Overhaul & Cost-Effective Procurement
* **Kristallklare Strukturierung (Herstellbar / Nicht herstellbar / Was gekauft werden MUSS / Wie viel ich bereits habe)**:
  * **🔨 Herstellbar (Eigenfertigung)**: Saubere Erfassung und Filterung aller Komponenten und Gaben (Gabe der Beherrschung, Gabe des Schicksals, Gabe des Metalls, Mystische Kleeblätter, Vorläufer-Waffen), die in Handwerksberufen oder der Mystischen Schmiede selbst hergestellt werden können.
  * **🛒 Was gekauft werden MUSS**: Dedizierte Hervorhebung aller Posten, die zwingend gekauft werden müssen – aufgeteilt in feste Händler-Pflichtkäufe (z.B. 100g für 100 Eisige Runensteine bei Rojan), Handelsposten-Zukäufe (T6-Trophäen, Ectos, Münzen) und manuell auf Direktkauf gesetzte Zwischenstufen.
  * **📦 Nicht herstellbar (Belohnungen & Rohstoffe)**: Getrennte Erfassung von accountgebundenen Erkundungs- und Spielbelohnungen (Gabe der Erkundung über 100% Core Tyria, Gabe des Kampfes über WvW-Pfad, Obsidianscherben über Karma) und Basis-Rohstoffen.
  * **📊 Wie viel ich bereits habe (Klarer visueller Account-Bestand)**:
    * Dedizierte Tabellenspalte mit dynamischer Mini-Fortschrittsleiste, exakter Zahlenanzeige (`Vorhanden / Benötigt (XX%)`) und klaren Farbstatus-Pills (`Vollständig (100%)`, `Teilweise (+X im Lager)`, `Fehlt komplett (0%)`).
    * 4 interaktive Header-Karten zur Sofort-Übersicht: Gesamtbestand mit Fortschrittsbalken und Goldwert, Gesamte Zukaufkosten mit Händler/TP-Aufschlüsselung, Herstellbare Komponenten, Nicht-herstellbare Posten.
    * **Gruppierte Ansicht & Schnellfilter**: Umschaltung zwischen strukturierter Kategorien-Unterteilung (mit Zwischensummen pro Sektion) und flacher Tabelle mit Filterchips (`Alle`, `🔨 Herstellbar`, `🛒 Muss gekauft werden`, `📦 Nicht herstellbar`, `✅ Bereits im Lager`, `⏳ Noch offen`).
    * **Detail-Umfang (Scope)**: Wählbar zwischen „Vollständig (Inkl. Gaben & Zwischenstufen)“ und „Grund-BOM (Stückliste)“.
* **Undo Direct Purchase Fix in Crafting Tree**:
  * **Root Cause Fix**: Zuvor setzte ein Klick auf „Kauf“ das `recipe` des Knotens auf `undefined`, wodurch die Button-Bedingung `{node.depth > 0 && node.recipe}` fehlschlug und der Button aus dem DOM verschwand.
  * **Persistent Toggle State**: Ergänzung von `canCraft: boolean` auf dem `TreeNode`, wodurch die Herstellbarkeit auch bei Direktkauf erhalten bleibt.
  * **Undoable Button (`CraftTree.tsx`)**: Der Kauf-Button transformiert bei Direktkauf in einen hervorgehobenen „Herstellen“-Button mit `RotateCcw`-Icon, wodurch der Kauf per Klick sofort rückgängig gemacht wird.
  * **Global & Inline Purchase Management**:
    * Globaler 1-Klick-Reset-Banner in `MaterialTable.tsx` (`clearBuyItems`).
    * Inline-Kauf-Badges mit Schnell-Rückgängig-Button direkt in den Materialzeilen.
* **Cost-Effective Procurement & Vendor Pricing Integration**:
  * **Fixed Vendor Pricing for Iconic Legendary Items**: Ergänzung von `[19676, 10000]` (Eisiger Runenstein / Icy Runestone – 1g / 10.000c) in `KNOWN_VENDOR_PRICES` ([costs.ts](file:///e:/GW2-Overlay/src/domain/costs.ts)). Da der Runenstein seelengebunden ist und kein Handelsposten-Listing hat, fehlte er bisher im Budget; nun fließen alle 100 Runensteine (100g) fest in die Kalkulation ein.
  * **Special Legendary Sources Catalog (`src/domain/sources.ts`)**: Spezial-Katalog `SPECIAL_LEGENDARY_SOURCES` für die günstigsten Beschaffungswege (Eisiger Runenstein bei Rojan, Obsidianscherben über Karma am Balthasar-Tempel, Eldritch Scroll über 50 Geisterscherben, Gabe des Kampfes über WvW, Gabe der Erkundung über Welterkundung, Mystische Kleeblätter über Schmiede/WvW/PvP).

#### Boss & Event Achievements and Visual Overhaul
* **Achievements Section Overhaul & Filter Bugfix**:
  * **Expansion Filter Badges**: Resolved bug where expansion category tabs (`HoT`, `PoF`, `IceDragon`, `EoD`, `SotO`, `Janthir`) displayed `0` due to outdated category keys in `categoryCounts`.
  * **Dedicated Icebrood Saga Filter (`IceDragon`)**: Separated `wb-dragonstorm` and `wb-drakkar` into their own `icedragon` category tab (`Eisbrut-Saga` / `Icebrood Saga`).
  * **100% Event Coverage**: Added `wb-castora-ruins-eternity` (`Awakening of Eternity`) to complete authentic 1:1 boss achievements across all 35 world bosses and meta events.
  * **Live Event Card Trophy Drawers**: Connected `getAchievementsForEvent(event.id)` in `EventCard.tsx`, activating the Trophy drawer for every event card with live AP progress and account completion checkmarks.
  * **Bilingual Tab Labels**: Added localized i18n keys for all category filter tabs (`Alle Bosse`, `Verfolgt`, `Core Weltenbosse`, `Heart of Thorns`, `Path of Fire`, `Eisbrut-Saga`, `End of Dragons`, `Secrets of the Obscure`, `Janthir & Zukunft`).
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
  * **Intermediate Recipe Breakdown in Step Cards**: Preparation steps now directly display the recipe ingredients needed for each intermediate product (e.g., for `Brotlaib`: `Herstellung: 28× Krug Wasser + 28× Beutel Mehl + 28× Paket Hefe`), with clickable item icons, item names, and inventory stock indicators.
  * **Raw Material Procurement Line**: When intermediate self-crafting is active, the card's material overview (`step-ings-line`) accurately displays the raw base materials to acquire (`st.purchases`) instead of intermediate components, preventing confusion between crafted and bought items.
  * **Known Vendor Pricing Database**: Added `KNOWN_VENDOR_PRICES` covering Master Craftsman ingredients (flour, yeast, water, salt, vinegar, soy sauce, buttermilk, sugar, charcoal, tin, threads) to resolve unpriced vendor items accurately, eliminating false "unpriced" warnings and cost distortions.
  * **Efficient Leveling Routes & Tier Transitions**:
    * **Tier Aging Penalty**: Penalizes dragging obsolete recipes > 25 ranks beyond their rating, ensuring the planner smoothly transitions to newly unlocked recipes at rank 25, 50, 75, etc. (preventing redundant runs like 70× Fries).
    * **Discovery XP Bonus Modeling**: Integrates GW2's +100% to +200% discovery bonus into `ranksPerCraft` and recipe evaluation, favoring discovery crafts for rapid, cost-effective leveling.
    * **Balanced Cost Scoring**: Prevents recipes with vendor ingredients from being discarded due to strict unknown flags, prioritizing true lowest cost per rank gained.
  * **Self-Crafting Priority over TP Purchases**: When `craftIntermediates` is enabled (now active by default with `all_craft` strategy), the route planner strictly prioritizes crafting intermediate components within the discipline over buying from the Trading Post, even if TP prices are low or vendor components lack TP pricing.
  * **Extended Multi-Tier Depth**: Increased recursive acquisition search depth from 3 to 8 tiers, completely resolving multi-stage crafting pipelines (e.g. `Seidenfetzen => Seidenballen => Seiden-Insignie => Seiden-Wams` or `Holzstamm => Planke => Dübel => Inschrift => Waffe`).
  * **Visual Preparation Flow in Step Cards**: Each step in the Level Planner includes a dedicated preparation box (`planner-step-prep-box`) displaying the exact chronological sequence of intermediate products to craft beforehand, with item icons, exact craft counts, and flow arrows leading to the target product.
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
