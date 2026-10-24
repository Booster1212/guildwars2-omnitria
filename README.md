# ✨ Omnitria • Guild Wars 2 In-Game Overlay

**Omnitria** is a high-performance, immersive in-game companion and overlay for **Guild Wars 2**. Designed to sit seamlessly above your in-game chat box as a compact mini-HUD or expand into a full-screen Hero Board. Built in the authentic Guild Wars 2 visual style (dark slate, antique bronze/gold borders, GW2 rarity colors, and official ArenaNet artwork).

Omnitria comes with full bilingual support (**English** by default, with instant 1-click switching to **German**).

---

## 📸 Screenshots

### 🏰 Full Hero Board & World Boss Timers
![Full Hero Board](docs/screenshots/hero-board.png)
*Live event timers, active world boss meta countdowns, and quick chat broadcast actions.*

---

### 💬 Compact Mini-HUD (Over-Chat Mode)
![Compact Mini-HUD](docs/screenshots/mini-hud.png)
*Unobtrusive in-game widget hovering directly above the Guild Wars 2 chat box.*

---

### 🔨 Crafting Level Planner & Discovery Assistant
![Crafting Level Planner](docs/screenshots/crafting-planner.png)
*Step-by-step 0–500 discipline leveling guide with automatic discovery recipe combinations.*

---

### ⚔️ Legendary Armory & Mystic Forge Recipe Tree
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

## 🔑 Guild Wars 2 API Key Guide (Official Account Integration)

Omnitria seamlessly integrates with the **official ArenaNet Guild Wars 2 API** (`api.guildwars2.com/v2`). Connecting your personal API key brings your in-game character data directly into the overlay — transforming generic guides into personalized, real-time trackers.

---

### 🛡️ Security & Privacy (100% Safe & Read-Only)

> [!IMPORTANT]
> - **Strictly Read-Only:** Guild Wars 2 API keys **cannot** modify your account in any way. Third-party tools cannot spend gold, delete characters, trade items, or alter account credentials.
> - **Stored Locally:** Your key is stored exclusively on your own computer in local application storage (`localStorage`).
> - **Direct Connection:** Omnitria communicates **only** with official ArenaNet servers (`https://api.guildwars2.com/v2/`) via encrypted HTTPS. Your key and account data are **never** transmitted to any third-party server or external analytics.
> - **Revoke Anytime:** You can delete or modify your key at any time directly through your official ArenaNet account dashboard or by clicking *"Clear Key"* in Omnitria Settings.

---

### 🚀 Step-by-Step: How to Generate Your API Key

1. **Log in to ArenaNet:** Open the official [ArenaNet Applications Page](https://account.arena.net/applications).
2. **Create Key:** Click the **"New Key"** button (or *"Neuer Schlüssel"* in German).
3. **Choose Name:** Enter a recognizable name (e.g. `Omnitria Overlay`).
4. **Select Permissions (Scopes):** Select the recommended permissions below (or click *"Select All"* for full functionality).
5. **Generate & Copy:** Click **"Create API Key"**, then copy the generated 72-character alphanumeric key.
6. **Paste in Omnitria:** In Omnitria, click the **Settings (⚙️)** icon in the top header (or click *"Connect Key"* in Achievements/Crafting), paste your key into the input field, and click **Save & Sync**.

---

### 📋 Permissions & Scopes Breakdown (ArenaNet Checkbox Matrix)

When generating a key on [account.arena.net/applications](https://account.arena.net/applications), ArenaNet presents a checklist of permissions. Configure your key using the reference below:

> 💡 **Quick Recommendation:** Check the **6 core boxes** (`account`, `progression`, `inventories`, `characters`, `unlocks`, `wallet`) — or simply click **"Select All"** for complete hassle-free overlay functionality.

| ArenaNet Checkbox | Priority | What it Unlocks in Omnitria | What Happens if Missing |
| :--- | :---: | :--- | :--- |
| ☑️ **`account`** | 🔴 **MANDATORY** | Base key validation, account name (e.g. `Commander.1234`), account age, home world/server, commander tag status, Fractal level, and WvW rank. | **Key cannot be verified.** Omnitria remains in unlinked guest mode. |
| ☑️ **`progression`** | 🟢 **ESSENTIAL** | **Live Achievement Tracking:** Real-time achievement progress bars, daily completionist tracker, mastery point counts, unlocked titles, and sub-objective checkmarks. | Personal achievement progress displays as 0 / grayed out. |
| ☑️ **`inventories`** | 🟢 **ESSENTIAL** | **Material Storage, Bank & Shared Inventory:** Automatically deducts owned items from crafting Bills of Materials (BOM) in the Legendary Armory and Crafting Level Planner. | Crafting BOM displays total raw materials needed without deducting items already stored in your bank/material storage. |
| ☑️ **`characters`** | 🟢 **ESSENTIAL** | **Character Crafting Levels:** Automatically detects active crafting discipline ranks (e.g. Weaponsmith 500, Chef 400) and character bag inventories. | Crafting discipline levels must be entered manually in the level planner. |
| ☑️ **`unlocks`** | 🟢 **ESSENTIAL** | **Known Recipes & Wardrobe:** Identifies already learned recipes and unlocked skins. Automatically highlights undiscovered recipes in the Discovery Explorer. | All recipes appear unlearned; manual discovery checks required. |
| ☑️ **`wallet`** | 🟡 **RECOMMENDED** | Live balances for account currencies (laurels, fractal relics, dungeon tokens, astral acclaim) in the footer dock. | Currencies are not displayed in the account summary. |
| ⬜ `tradingpost` | ⚪ *Not Needed* | Omnitria fetches live Trading Post market prices from the public `/v2/commerce/prices` endpoint (no personal TP auth needed). | No impact. |
| ⬜ `builds` | ⚪ *Not Needed* | Build templates are not currently utilized by Omnitria. | No impact. |
| ⬜ `pvp` | ⚪ *Not Needed* | PvP statistics are not currently tracked by Omnitria. | No impact. |
| ⬜ `guilds` | ⚪ *Not Needed* | Guild list is already included via the base `account` permission. | No impact. |

---

### ❓ Using Omnitria Without an API Key

An API key is **completely optional**! You can use Omnitria right away without an account:
- 🕒 **Event Timers & World Bosses:** 100% operational with live countdowns and chat callouts.
- 🗺️ **Waypoint Directory:** 100% searchable with instant 1-click clipboard copy.
- 📖 **Database & Leveling Guides:** All 0–500 crafting routes and Legendary Mystic Forge trees remain fully accessible with manual discipline selection.
- 🏆 **Achievements View:** Displays full catalog, requirements, rewards, and event linkages with progress shown as 0 / unlinked until an API key is connected.

---

### 🇩🇪 Kurzanleitung auf Deutsch (API-Schlüssel & Berechtigungen)

> [!TIP]
> 1. Gehe auf die offizielle ArenaNet-Seite: **[account.arena.net/applications](https://account.arena.net/applications)** und melde dich mit deinem GW2-Account an.
> 2. Klicke auf **„Neuer Schlüssel“** und gib einen Namen ein (z. B. `Omnitria`).
> 3. **Berechtigungen ankreuzen:**
>    - 🔴 **`account`** *(Zwingend erforderlich für die Schlüssel-Verbindung)*
>    - 🟢 **`progression`** *(Echter Live-Erfolgsfortschritt & Teilziele)*
>    - 🟢 **`inventories`** *(Automatischer Materialabzug aus Lager & Bank)*
>    - 🟢 **`characters`** *(Automatische Erkennung deiner Handwerksstufen)*
>    - 🟢 **`unlocks`** *(Bekannte Rezepte & Entdeckungs-Assistent)*
>    - 🟡 **`wallet`** *(Account-Währungen)*
>    *(Oder einfach **„Alle auswählen“** anklicken)*
> 4. Klicke auf **„API-Schlüssel erstellen“** und kopiere den 72-stelligen Schlüssel.
> 5. Klicke in Omnitria oben rechts auf das **Zahnrad (⚙️ / Einstellungen)**, füge den Schlüssel ein und klicke auf **„Speichern & Synchronisieren“**.
> 
> *Sicherheitshinweis:* Der Schlüssel ist **rein lesend** (kann weder Gold ausgeben noch Gegenstände löschen) und wird ausschließlich **lokal** auf deinem PC gespeichert.

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

# 5. Package Windows standalone distribution locally
npm run package:win
```

For comprehensive details on architecture, data sources, and caching mechanisms, see [docs/DATENQUELLEN.md](docs/DATENQUELLEN.md).

---

## 🚀 CI/CD & Automatische Releases

Omnitria nutzt **GitHub Actions** für Continuous Integration und automatisierte Windows-Releases:

- **CI Pipeline (`.github/workflows/ci.yml`)**:
  - Wird bei jedem Push oder Pull Request auf den Branch `main` ausgeführt.
  - Prüft TypeScript-Typen (`npm run typecheck`), führt alle 38 Unit- und Domain-Tests aus (`npm test`) und validiert den Vite-Produktionsbuild (`npm run build`).
- **Release Pipeline (`.github/workflows/release.yml`)**:
  - Wird automatisch ausgelöst, sobald ein Git-Tag im Format `v*` (z. B. `v0.1.0`) gepusht wird.
  - Läuft auf einem Windows-Runner (`windows-latest`), installiert Abhängigkeiten strikt anhand des Lockfiles (`npm ci`), führt Tests und den Build aus und bündelt das fertige Standalone-Paket (`Omnitria-vX.X.X-windows-x64.zip` inkl. SHA256-Prüfsumme).
  - Erstellt vollautomatisch ein GitHub Release mit Changelog-Notizen und hängt alle Build-Artefakte an.
  - Verhindert das versehentliche Überschreiben bestehender Releases.

### 📦 Neue Version veröffentlichen (z. B. v0.1.0):

1. Sicherstellen, dass alle Änderungen auf `main` committet und gepusht sind:
   ```bash
   git checkout main
   git pull
   ```
2. Git-Tag mit der gewünschten Versionsnummer erstellen:
   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   ```
3. Tag zu GitHub pushen:
   ```bash
   git push origin v0.1.0
   ```
4. Die Pipeline startet automatisch unter **GitHub Actions**. Nach Abschluss (~1–2 Minuten) stehen die Windows-Dateien unter **Releases** zum Download bereit.

---

## 📜 Legal & ArenaNet Notice
Guild Wars 2, ArenaNet, and all associated logos and designs are trademarks or registered trademarks of NCsoft Corporation. Omnitria is a fan-made project and is not affiliated with or endorsed by ArenaNet or NCsoft. All in-game art, icons, and item assets are the property of ArenaNet and NCsoft.
