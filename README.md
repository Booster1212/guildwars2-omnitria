# ✨ Omnitria • Guild Wars 2 In-Game Overlay

**Omnitria** is a high-performance, immersive in-game companion and overlay for **Guild Wars 2**. Designed to sit seamlessly above your in-game chat box as a compact mini-HUD or expand into a full-screen Hero Board. Built in the authentic Guild Wars 2 visual style (dark slate, antique bronze/gold borders, GW2 rarity colors, and official ArenaNet artwork).

Omnitria comes with full bilingual support (**English** by default, with instant 1-click switching to **German**).

---

## 📸 Screenshots

> [!TIP]
> Place your in-game screenshots inside `docs/screenshots/` and update the links below to showcase Omnitria in action!

### 🏰 Full Hero Board & World Boss Timers
<!-- Add screenshot: Full-screen board displaying the live event schedule and countdowns -->
![Full Hero Board](docs/screenshots/hero-board.png)
*Live event timers, active world boss meta countdowns, and quick chat broadcast actions.*

---

### 💬 Compact Mini-HUD (Over-Chat Mode)
<!-- Add screenshot: Compact widget docked over the in-game chat -->
![Compact Mini-HUD](docs/screenshots/mini-hud.png)
*Unobtrusive in-game widget hovering directly above the Guild Wars 2 chat box.*

---

### 🔨 Crafting Level Planner & Discovery Assistant
<!-- Add screenshot: Crafting planner showing level progression and discovery combinations -->
![Crafting Level Planner](docs/screenshots/crafting-planner.png)
*Step-by-step 0–500 discipline leveling guide with automatic discovery recipe combinations.*

---

### ⚔️ Legendary Armory & Mystic Forge Recipe Tree
<!-- Add screenshot: Legendary weapon component breakdown and material requirements -->
![Legendary Armory](docs/screenshots/legendary-armory.png)
*Interactive Mystic Forge crafting trees, precursor collections, and live Trading Post material costs.*

---

## 🧭 Core Modules

### 1. Event Timers & World Bosses (`Events`)
- **Real-Time Timers:** Precise countdowns for all World Bosses and Meta-Events across all Guild Wars 2 expansions:
  - *Core Tyria, Heart of Thorns (HoT), Path of Fire (PoF), End of Dragons (EoD), Secrets of the Obscure (SotO), Janthir Wilds, and Visions of Eternity*.
- **1-Click Game Chat Callouts:** Broadcast waypoint chat codes and remaining event countdowns directly into map chat (`/m`).
- **Waypoint Fast Travel:** Click to copy waypoint codes into your clipboard for immediate teleportation in-game.
- **Tactics & Notable Drops:** Built-in cheat sheets with boss mechanics, defiance bar requirements, and loot highlights.

### 2. Waypoint Directory (`Waypoints`)
- Searchable catalog of key event waypoints across Tyria, organized by zone and campaign.
- Instant 1-click clipboard copy or direct chat broadcast.

### 3. Hero Panel & Achievements (`Achievements`)
- **Authentic Hero Panel Layout:**
  - `⭐ Watchlist`: Pin individual achievements to your custom persistent watchlist.
  - `Daily`: Daily task tracker (*Daily Completionist, World Boss Hunter, Daily Fractals, Lumberer, WvW*).
  - `World Bosses`: All boss and meta-event achievements (*Tequatl, Triple Trouble, The Shatterer, Claw of Jormag, Tarir, Chak Gerent, Soo-Won*).
  - `Exploration`: Regional completion (*Ascalon, Kryta, Maguuma, Shiverpeaks, Orr*) and jumping puzzles.
  - `Fractals & Raids`: Fractals of the Mists (Tiers 1–4, Challenge Modes), Raids (*Spirit Vale*), and Strike Missions.
  - `Collections`: Legendary precursors and rare curiosities.
- **Interactive Checklists:** Expandable sub-objectives with checkboxes to track your progress.
- **Reward Badges:** Titles, color-coded Mastery Points (*Tyria, Maguuma, Desert, Cantha*), and item chests.
- **Live Event Linking:** Achievements tied to active or upcoming events display live event status and fast-travel buttons.

### 4. Crafting & Disciplines (`Crafting`)
- Covers all 8 crafting disciplines (*Armorsmith, Weaponsmith, Artificer, Jeweler, Leatherworker, Tailor, Chef, Huntsman*).
- **Official Artwork:** High-resolution discipline emblems and official ArenaNet item icons rendered directly from the CDN.
- **Account Sync:** Automatically syncs your account's character crafting levels via official GW2 API keys.
- **Interactive Level Planner:**
  - Custom target ranks (up to 400 or 500).
  - Optimal lowest-cost routes calculated using the GW2-Wiki XP progression algorithm.
  - **Embedded Discovery Helper:** When leveling requires discovery, the exact ingredients and combination instructions are displayed directly on the step card.
  - Material Bill of Materials (BOM) with automatic deduction of items stored in your material storage and bank.
- **Discovery Recipe Explorer:**
  - Dedicated search and filter tool for undiscovered recipes.
  - Filter by discipline, rank tier, status (discovered / undiscovered), and search across item names, ingredients, or localized item types.

### 5. Legendary Armory (`Legendary`)
- Complete database across all generations (*Gen 1, Gen 2, Gen 3 / Aurene variants, Gen 4 / Janthir*).
- **Hierarchical Mystic Forge Tree:**
  - Expandable node tree detailing every tier of crafting.
  - Toggle between *"Craft"* and *"Buy"* for tradeable intermediate components.
- **Bill of Materials (BOM):**
  - Aggregated material quantities across all branches without duplicate counting.
  - Live Trading Post prices (`/v2/commerce/prices`) with total gold, silver, and copper calculations.
  - Item acquisition origins (Gathering, Loot, Karma Vendors, Mystic Forge).
- **Precursor Collections:**
  - Step-by-step progress tracking for precursor achievement tiers.

---

## ⏱️ Guild Wars 2 API Refresh Rates

| Data Category | ArenaNet Server Cache | In-App Overlay Behavior |
| :--- | :--- | :--- |
| **Event & World Boss Timers** | *Real-Time* | **Calculated per second** using Tyria's fixed 2-hour rotation schedule. |
| **Trading Post Prices** | ~**1–5 minutes** (`max-age: 300s`) | Fetched on demand, cached locally for **15 minutes** to prevent rate-limit throttling. |
| **Account Progress & Achievements** | **5 minutes** | Synced at startup and refreshed every **15 minutes** in the background (or instantly via *"Sync Now"*). |
| **Bank, Material Storage & Inventory**| **5 minutes** | Automatic background sync every **15 minutes** or on demand. |
| **Item Catalog & Icons** | Static | Permanently cached locally for **14 days**; icons streamed dynamically from `render.guildwars2.com`. |

*Rate-Limit Protection:* ArenaNet enforces a rate limit of **600 requests / minute**. Omnitria utilizes an asynchronous microtask queue capped at 4 concurrent requests to ensure safe and reliable API communication.

---

## 🎮 Controls & Shortcuts

- **`[F9]`**: Quickly toggle overlay visibility on/off.
- **`[F10]`**: Toggle mouse Click-Through mode (allows clicks to pass directly into Guild Wars 2).
- **`🧭 Compass Icon`** (Title Bar): Automatically positions and docks the window directly above your in-game chat box (bottom-left).
- **Language Switcher (`🇬🇧 EN` / `🇩🇪 DE`)**: Instantly toggle between English and German anywhere in the interface.
- **System Tray Icon**: Right-click the golden dragon in your Windows taskbar tray for quick actions, window modes, and quit.

---

## ⚡ Quick Start & Launching

### System Requirements
- Windows 10 / 11
- Guild Wars 2 running in **Windowed Fullscreen** or **Windowed** mode
- Node.js (v18 or newer) *for development and compiling*

### Launch Options

1. **Silent Background Launch (Recommended):**
   Double-click:
   ```bat
   GW2-Overlay-Silent.vbs
   ```
   *Launches Omnitria silently in the background without opening a terminal window.*

2. **Standard Launcher:**
   Double-click:
   ```bat
   start-overlay.bat
   ```

---

## 🛠️ Development & Building

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript type checks
npm run typecheck

# 3. Run automated domain & calculation tests (18 tests)
npm test

# 4. Build production bundle
npm run build
```

For comprehensive details on architecture, data sources, and caching mechanisms, see [docs/DATENQUELLEN.md](docs/DATENQUELLEN.md).

---

## 📜 Legal & ArenaNet Notice
Guild Wars 2, ArenaNet, and all associated logos and designs are trademarks or registered trademarks of NCsoft Corporation. Omnitria is a fan-made project and is not affiliated with or endorsed by ArenaNet or NCsoft. All in-game art, icons, and item assets are the property of ArenaNet and NCsoft.
