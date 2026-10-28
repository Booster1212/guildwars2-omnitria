# Data Sources, Architecture & Data Limitations

This document describes the complete data acquisition architecture, data source classifications, inventory deduplication rules, algorithmic estimation models, caching strategies, and operational constraints of the **Omnitria** Guild Wars 2 In-Game Overlay.

---

## 1. Data Classification & Source Tiers

All data within Omnitria is strictly partitioned into distinct source classes and labeled transparently across the user interface:

| Class | UI Badge | Source | Description & Usage |
|---|---|---|---|
| **Official Content** | `API` | Official ArenaNet API (`api.guildwars2.com/v2`) | Item definitions, localized names (`en` / `de`), tooltips, official crafting recipes, achievement categories, and icon render URLs. |
| **Account & Inventory** | `Account` | Authenticated endpoints (`/v2/account/*`, `/v2/characters`) | Material Storage, Bank tabs, Shared Inventory slots, Character bag inventories, Equipped character gear, crafting discipline ratings, wallet currencies, and live achievement states. |
| **Market Data** | `API` | `/v2/commerce/prices` | Real-time buy orders (instant sell) and sell listings (instant buy) from the Black Lion Trading Post. |
| **Achievement Intelligence** | `API / Account` | `/v2/achievements/*` & `/v2/account/achievements` | Public achievement definitions, tiered point distributions, repeatable flags/pointCaps, and personalized account progress. |
| **Community Data** | `Community` | Vendored dataset [`crafty_legend`](https://github.com/PieOrCake/crafty_legend) (MIT License) | **Mystic Forge** recipe graphs and item acquisition channels (world exploration, karma vendors, dungeon tokens). |
| **Calculated Engine** | `Calculated` | Domain engine (`src/domain/`) | Consolidated account inventory search index, deduplicated multi-goal material demand, net Bills of Materials (BOM), 0–500 leveling step routes, achievement intelligence recommendations, and event rotation countdowns. |

---

## 2. ArenaNet API Endpoints & Permissions Matrix

Omnitria communicates directly with official ArenaNet API servers (`https://api.guildwars2.com/v2`) without intermediary relay proxies or third-party collection servers.

### 2.1 Authenticated Account Endpoints (Read-Only)

| Feature | API Endpoint | Required Scope | Fallback Behavior if Scope Unchecked / Guest Mode |
|---|---|---|---|
| **Base Account Sync** | `/v2/account` | `account` | Guest Mode: Overlay functions without personal account linkage. |
| **Achievements Progress** | `/v2/account/achievements` | `progression` | Displays static achievement catalog in Guest Mode with 0% progress and full obtainable rewards. |
| **Daily Boss Completions** | `/v2/account/worldbosses` | `progression` | Boss completion checkmarks can still be marked manually. |
| **Map Chest Completions** | `/v2/account/mapchests` | `progression` | Map chest completion states remain unmarked unless toggled manually. |
| **Wizard's Vault Daily** | `/v2/account/wizardsvault/daily` | `progression` | Daily Wizard's Vault objective progress is omitted from daily dashboard summaries. |
| **Material Storage** | `/v2/account/materials` | `inventories` | Material Storage quantities are omitted from Account-Wide Item Search and BOM deductions. |
| **Bank Tabs** | `/v2/account/bank` | `inventories` | Bank tab items are omitted from Account-Wide Item Search and BOM deductions. |
| **Shared Inventory** | `/v2/account/inventory` | `inventories` | Shared inventory slots are omitted from Account-Wide Item Search and BOM deductions. |
| **Characters Overview** | `/v2/characters?ids=all` | `characters` | Character cards (level, profession, playtime, active crafting disciplines) are unavailable; discipline ratings can be set manually. |
| **Character Bag Inventories** | `/v2/characters?ids=all` + fallback `/v2/characters/:id/inventory` | `characters` + `inventories` | Per-character bag stacks are omitted; permission banner explains which scope (`characters` or `inventories`) is missing. |
| **Character Equipment** | `/v2/characters?ids=all` (`equipment` array) | `characters` (+ `builds` / `inventories`) | Equipped items on characters are omitted from the `Equipped` filter and character cards. |
| **Currencies & Wallet** | `/v2/account/wallet` | `wallet` | Wallet balances (Gold, Karma, Spirit Shards, Laurels) are hidden. |
| **Learned Recipes** | `/v2/account/recipes` | `unlocks` | Recipe Book displays recipes as unlearned; only `AutoLearned` recipes are marked known. |
| **Legendary Armory** | `/v2/account/legendaryarmory` | `unlocks` | Owned Legendary Armory items are not automatically marked as unlocked. |

### 2.2 Public Endpoints (No API Key Required)

| Module | API Endpoint | Cache Strategy | Purpose |
|---|---|---|---|
| **Achievement Definitions** | `/v2/achievements` | IndexedDB (14-day TTL) | Full metadata: names, descriptions, requirements, tiers, rewards, flags, and point caps. |
| **Achievement Categories** | `/v2/achievements/categories` | IndexedDB (14-day TTL) | Category hierarchy, localized titles, and assigned achievement IDs. |
| **Achievement Groups** | `/v2/achievements/groups` | IndexedDB (14-day TTL) | Top-level groups (e.g. Story Journal, Slayer, General, Heart of Thorns). |
| **Trading Post Prices** | `/v2/commerce/prices` | 5-Minute In-Memory | Live buy/sell prices for Account Inventory valuation, Legendary BOMs, and Crafting routes. |
| **Item Metadata** | `/v2/items` | IndexedDB (14-day TTL) | Item icons, localized names (`en` / `de`), rarities, item types, vendor values, and chat links. |
| **Crafting Recipes** | `/v2/recipes` | IndexedDB (14-day TTL) | Official discipline recipe inputs, outputs, ratings, and flags. |
| **Worlds & Server Names** | `/v2/worlds?ids=all` | Persistent (14-day TTL) | Resolves numerical world IDs into localized server names in English (`en`) and German (`de`). |
| **Game Build** | `/v2/build` | On Startup | Detects new Guild Wars 2 game builds to invalidate stale item/recipe caches. |

---

## 3. Account-Wide Item Search, Character Inventories & Multi-Goal Planning

### 3.1 Consolidated Inventory Ingestion (`src/data/gw2/account.ts`)
When synchronizing with a valid ArenaNet API key, Omnitria queries `/v2/account/materials`, `/v2/account/bank`, `/v2/account/inventory`, and `/v2/characters?ids=all` in parallel:
- **Empty Slots & Null Safety:** Empty bank tabs, empty shared inventory slots, and unequipped bag slots (`null` entries in ArenaNet arrays) are ignored safely.
- **Character Bag Fallback:** If `/v2/characters?ids=all` omits the `bags` property for a character while the API key includes the `inventories` permission, Omnitria automatically queries `/v2/characters/:id/inventory` (URL-encoded character name) so per-character bag contents are still captured.
- **Zero Double-Counting Guarantees (`src/domain/inventorySearch.ts`):**
  - `totalStock` = `Material Storage` + `Bank` + `Shared Inventory` + `Character Bags`.
  - Each item stack is attributed to its exact storage location (`materials`, `bank`, `shared`, or `character_bag` with `characterName`).
  - `equippedCount` tracks items currently equipped in a character's `equipment` slots (`character_equipped`) separately from `totalStock`, so equipped weapons/armor are searchable without falsely inflating consumable crafting stock.
  - `totalCount` = `totalStock` + `equippedCount`.

### 3.2 Search, Filtering & Location Awareness
- **Bilingual Localized Search:** `filterAndSortAccountInventory` matches full or partial item names (case-insensitive) in the active UI language (`en` or `de`), numeric item IDs, chat codes, or the holding character's name.
- **Storage Location Filters:** Users can filter by `All Locations`, `Material Storage`, `Bank`, `Shared Inventory`, `Characters`, `Equipped`, or `Multiple Locations` (items fragmented across 2+ storage places), as well as by individual character name, item rarity, and item type.
- **BOM & Material Detail Integration:** Both Legendary and Crafting Bills of Materials (`MaterialTable.tsx`, `MaterialDemandTable.tsx`, `MaterialDetail.tsx`) display per-location and per-character stock badges (e.g., `Mat: 250 · Bank: 180 · Shared: 25 · Lyra Dawnblade: 30`) so players know exactly where to withdraw materials.

### 3.3 Multi-Goal Material Deduplication (`computeMultiGoalMaterialPlan`)
When a player tracks multiple Legendary weapons simultaneously, `computeMultiGoalMaterialPlan` aggregates leaf material requirements across all active goals against the account's single `stockMap`:
- If **Goal A** requires `250` Mystic Coins and **Goal B** requires `250` Mystic Coins (`combinedRequired = 500`), and the account holds `340` Mystic Coins in total stock (`accountStock = 340`), Omnitria reports `ownedAllocated = 340` and `netMissing = 160` — preventing the same 340 Mystic Coins from being counted twice across both goals.

---

## 4. Achievement Intelligence & Tracker Architecture

The Achievement Intelligence module (`src/domain/achievementIntelligence.ts`, `src/data/gw2/achievements/`) organizes public achievement definitions and personal account progress into transparent, actionable insights.

```mermaid
flowchart TD
    API_Def["Public Achievement Endpoints<br/>(/v2/achievements, /categories, /groups)"] --> Caching["IndexedDB Metadata Store<br/>(14-day TTL / offline fallback)"]
    API_Acc["Authenticated Account Progress<br/>(/v2/account/achievements)"] --> Enrichment["Enrichment Engine<br/>(achievementIntelligence.ts)"]
    Caching --> Enrichment
    Enrichment --> Hero["Best Next Achievement Hero Card"]
    Enrichment --> Strat["5 Recommendation Strategies<br/>(Best Next, Efficiency, Quick Wins, Highest Reward, Continue)"]
    Enrichment --> Explorer["Categories & Groups Explorer"]
```

### 4.1 Accurate AP & Cap Calculations
- **Tiered AP Parsing:** For multi-tier achievements, Omnitria parses the array of tiers and calculates earned AP by summing completed tier values. `obtainableAp` strictly reflects remaining unearned tiers.
- **Repeatable Achievements & Point Caps:** Certain repeatable achievements enforce an account point ceiling (`pointCap`). For instance, *Agent of Entropy* (`ID: 439`) awards 2 AP per 200 salvages up to a maximum cap of 250 AP. Omnitria computes:
  $$\text{earnedAp} = \min(\text{repeatedCycles} \times \text{cyclePoints}, \text{pointCap})$$
  $$\text{obtainableAp} = \max(0, \text{pointCap} - \text{earnedAp})$$
  Once the cap is reached, `obtainableAp` evaluates to 0 and the achievement is marked as capped, preventing misleading recommendations.
- **Explainable Recommendation Rationale:**
  Every recommendation card provides an explicit, transparent justification (e.g., *"Recommended because you are at 85% completion with 15 AP remaining"*). Omnitria uses pure arithmetic scoring rather than non-deterministic AI generation.

### 4.2 Guest Mode Support
Users without an API key can browse the entire public achievement catalog. The system evaluates all achievements as unstarted (`0% progress`), showing the maximum available rewards and requirements. Once an API key is connected, the UI seamlessly updates with personal progress.

---

## 5. Event Timers & Meta-Event Rotation Schedule

### 5.1 Deterministic Second-by-Second Rotation Model
Tyria's World Boss and Expansion Meta-Event rotations follow a deterministic, periodic **2-hour schedule** anchored to UTC midnight:

$$\text{CycleOffset} = (\text{CurrentTime}_{\text{UTC}} \pmod{7200\text{ seconds}})$$

- **Local Execution:** Rotation calculations run locally without querying external websites or scrapers.
- **Comprehensive Coverage (57 Events):** Covers Core World Bosses, Orr Temple Metas, Living World Seasons, Heart of Thorns, Path of Fire, The Icebrood Saga, End of Dragons, Secrets of the Obscure, Janthir Wilds, and Visions of Eternity.

### 5.2 Clipboard-Only Callout Protocol
- Clicking any waypoint or event callout button copies the formatted text or binary waypoint chat link (`[&...]`) to the Windows clipboard via Electron's `clipboard.writeText` and plays an audio chime. Players paste manually in-game (`[Enter] + [Ctrl+V]`).

---

## 6. Crafting, Recipes & Legendary Armory Architecture

### 6.1 Mystic Forge Component Graphs
Because the official ArenaNet API does not expose Mystic Forge recipes, Omnitria uses the verified open-source [`crafty_legend`](https://github.com/PieOrCake/crafty_legend) dataset (MIT License, commit `8b674229`) for Mystic Forge precursor and Gift trees, while resolving all localized names, icons, discipline recipes, and live Trading Post prices from the official GW2 API.

### 6.2 Algorithmic Crafting Level Progression (0–500)
Leveling routes across all 8 crafting disciplines use the community XP decay model:

$$\text{RanksPerCraft} = \text{Multiplier} \times \left(1 - \frac{\text{CurrentRank} - \text{RecipeRating}}{\text{Span}}\right)$$

Discovery recipes receive their empirical bonus XP multiplier, and owned materials across Material Storage, Bank, Shared Inventory, and Character Bags are automatically deducted from the route's Bill of Materials.

---

## 7. Caching, Persistence & Performance

Omnitria implements a 4-tier storage hierarchy to keep the UI responsive with many characters and inventory slots while respecting ArenaNet API rate limits:

1. **Tier 1 — Referentially Stable In-Memory Snapshots (`useSyncExternalStore`):** Account inventory indexes, achievement snapshots, and progression stores expose immutable references. Search keystrokes filter the in-memory index instantaneously with zero network requests.
2. **Tier 2 — Browser Storage (`localStorage` & `IndexedDB`):** Settings, cached account snapshots (`gw2_overlay_account_data_v1`), achievement metadata caches, and compressed 14-day item/recipe catalogs (`items:en:v1`, `items:de:v1`, `recipes:v1`) persist across restarts and validate against `/v2/build`.
3. **Tier 3 — Atomic Electron Disk Mirror & Secure Storage:** Personal checklists and tracked goals are mirrored to an atomic JSON file in the Electron `userData` directory via IPC (`store-read` / `store-write`). ArenaNet API keys are encrypted at rest using OS-level DPAPI via `safeStorage`.
4. **Tier 4 — Rate-Limited Official API Client:** Batch-fetches items/prices in chunks of 200 IDs, caches Trading Post prices for 5 minutes, and applies adaptive backoff on HTTP 429 or network errors.

---

## 8. Legal & Safety Notice

- **Read-Only API Usage:** Omnitria only reads public and authorized read-only account endpoints. It never requests account credentials or write permissions.
- **No Game Client Modification:** Omnitria does not read or write game process memory, inject DLLs, or automate keystrokes. Refer to [`docs/TOS_COMPLIANCE.md`](TOS_COMPLIANCE.md) for full details.
