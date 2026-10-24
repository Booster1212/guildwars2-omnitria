# Data Sources, Architecture & Data Limitations

This document describes the data acquisition architecture, data source classification, and known limitations and assumptions of the **Omnitria** application.

---

## 1. Data Classification

All data in the application is strictly partitioned into five classes and transparently indicated in the user interface via corresponding badges (`API`, `Account`, `Community`, `Calculated`, `Unknown`):

| Class | UI Badge | Source | Description & Usage |
|---|---|---|---|
| **Official** | `API` | Official ArenaNet API (`api.guildwars2.com/v2`) | Items, names, descriptions, icons, weapon types, official crafting recipes, and achievement categories. |
| **Personal** | `Account` | API endpoints under `/v2/account/*` | Material storage, bank tabs, shared inventory, character bags, crafting ranks, and achievement progression. |
| **Market** | `API` | `/v2/commerce/prices` | Current instant-buy (sell price) and buy-order (buy price) prices from the Black Lion Trading Post. |
| **Community** | `Community` | Vendored dataset [`crafty_legend`](https://github.com/PieOrCake/crafty_legend) (MIT License) | **Mystic Forge** recipes and item acquisition origin categories (gathering, drops, vendors). |
| **Calculated** | `Calculated` | Domain engine (`src/domain/`) | Net demand, aggregated Bills of Materials (BOM), leveling routes, cost totals, and progress calculations. |

---

## 2. API Endpoints and Required Permissions

| Feature | API Endpoint | Required Scope | Fallback Behavior if Missing |
|---|---|---|---|
| Base Account | `/v2/account` | `account` | Displays standard view without account binding |
| Achievements | `/v2/account/achievements` | `progression` | No personal achievement progression bars |
| Material Storage | `/v2/account/materials` | `inventories` | No inventory deduction for base materials |
| Bank | `/v2/account/bank` | `inventories` | No inventory deduction for bank tabs |
| Shared Inventory | `/v2/account/inventory` | `inventories` | No inventory deduction for shared inventory slots |
| Characters & Bags | `/v2/characters?ids=all` | `characters` (+ `inventories` for bags) | Crafting ranks must be selected manually |
| Wallet | `/v2/account/wallet` | `wallet` | In-game currency balance comparison disabled |
| Known Recipes | `/v2/account/recipes` | `unlocks` | Only `AutoLearned` recipes active in the planner |
| Legendary Armory | `/v2/account/legendaryarmory` | `unlocks` | Unlocked legendary weapons are not automatically recognized |

---

## 3. Known Limitations and Constraints

### 3.1 No Mystic Forge Recipes in the Official API
The official ArenaNet API **does not provide an endpoint for Mystic Forge recipes** (`/v2/recipes/search?output=…` returns empty results for legendary weapons).
- **Solution:** Omnitria utilizes the independently verified open-source dataset by PieOrCake (commit `8b674229`).
- **Transparency:** Weapons without a recorded recipe in the dataset (e.g. newer weapons such as *Ancora Pax* or *Ancora Bellum*) are explicitly marked in the UI as *“Incomplete / Recipe not yet recorded”*, avoiding guesswork or synthetic data.

### 3.2 No Crafting Experience (XP) in the Official API
The GW2 API exposes neither the current XP within a crafting discipline rank nor the XP granted per recipe.
- **Solution:** Approximation using the established community model from the official GW2 Wiki (`ranksPerCraft = multiplier * (1 - (rank - minRating) / span)`).
- **Labeling:** All craft counts, step groupings, and cost summaries in the level planner are explicitly marked with an *“Estimate”* notice banner.

### 3.3 Random Output Recipes (Mystic Clovers)
The Mystic Clover recipe in the Mystic Forge involves a probability roll:
- **Solution:** Expected value calculation uses the established average success rate of **31%** (`yield = 0.31`). All derived material quantities and costs are labeled as estimated quantities.

### 3.4 Wiki Integration
External references point to official Guild Wars 2 Wiki entries via secured Electron IPC links that open in the user's default browser.

---

## 4. Persistence and Caching

1. **Personal Progression (`progressStore.ts`):**
   - Versioned schema (`gw2_overlay_progress_v1`).
   - Primary: `localStorage` with version sanitization and automated backup for unknown/newer versions.
   - Secondary (in Electron): Automatic mirroring to an atomically written JSON file in the Electron `userData` directory via IPC (`store-read` / `store-write`).
   - Clean startup: Step completion checkmarks reset to `0` on restart, and discovery/intermediate options remain inactive by default to avoid route conflicts.

2. **Static Game Data Caching:**
   - Recipes (`recipes:v1`) and item metadata (`items:de:v1` / `items:en:v1`) are cached in compressed form within **IndexedDB** (TTL of 14 days or until a new game build `/v2/build` is detected).
   - Market prices (`commerce/prices`) utilize a 5-minute in-memory cache to respect API rate limits.
