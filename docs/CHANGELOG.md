# Changelog

All notable changes to the **Omnitria** Guild Wars 2 In-Game Overlay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
