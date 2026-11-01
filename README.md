<div align="center">

<img src="docs/screenshots/icon.png" alt="Omnitria Logo" width="160" />

# Omnitria HUD

[![Release](https://img.shields.io/badge/Release-v0.3.0-d4a359?style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Downloads](https://img.shields.io/github/downloads/Booster1212/guildwars2-omnitria/total?color=8b5cf6&label=Downloads&style=flat-square)](https://github.com/Booster1212/guildwars2-omnitria/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square)](#installation)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

Omnitria is an open-source desktop companion and HUD overlay for Guild Wars 2. It calculates local event timers, indexes account-wide inventories, optimizes crafting paths, and recommends achievements using official read-only APIs.

<br/>

![Omnitria In-Game Overlay](docs/screenshots/Introduction.png)

</div>

## Release Changelog

<details open>
<summary><b>v0.3.0 · Crafting Intelligence, Cost Optimizer & Master Craftsman NPC Integration</b> (Latest Release)</summary>

- **Neuer Planungsmodus: Höchste Kosteneffizienz (0–500):**
  - Dedizierter Schnellwahl-Button im Berufsplaner, der unter Stufe 450 gezielt kostengünstige Massenfertigung (Bulk) und Veredelungen priorisiert, statt teurer Entdeckungsflut.
  - Veredelungen an Stufenübergängen (0–25, 75–100 usw.) werden stark priorisiert (Kupfer, Eisen, Holz, Stoff, Leder), sodass die ersten 25 Ränge jedes Tiers für wenige Kupfer abgeschlossen werden.
  - Erst ab Stufe 450–500 werden exotische Entdeckungen aktiv empfohlen, um teure zeitbegrenzte Aufgestiegene Barren/Planken zu umgehen.
- **Master Craftsman (Berufslehrer) Vendor Integration:**
  - Datengetriebener Katalog mit verifizierten NPC-Preisen für Grundmaterialien (Zinn, Kohle, Primordium, Thermokatalytische Reagenzien, Faden, Koch-Zutaten) und Rezeptblätter.
  - Dynamischer Preisvergleich `min(NPC, Handelsposten)` ohne Vorabannahmen.
- **GW2Crafts Referenz-Engine & Benchmark:**
  - Berechnet den Vergleichswert gegen die offiziellen Standard-Leitfäden von `gw2crafts.net` und schlüsselt die Ersparnis transparent auf.
- **Opportunitätskosten & Netto-Verkaufserlöse:**
  - Berücksichtigt den wirtschaftlichen Wert vorhandener Materialien (abzüglich 15 % Handelspostengebühren) und zieht erwartete Wiederverkaufserlöse hergestellter Gegenstände von den Gesamtkosten ab.
- **Überarbeitete Einkaufsliste & Spalten-Ausrichtung:**
  - Saubere Gruppierung nach 6 Meilenstein-Tiers, konsistente Spaltenbreiten, kein Abschneiden von "Gesamtkosten" und Live-Preisaktualitätsanzeige mit Refresh-Button.

</details>

<details>
<summary><b>v0.2.9 · MumbleLink Live-Telemetrie & Kampf-Ausblendung</b></summary>

- **MumbleLink Live Telemetry (Shared Memory Integration):**
  - Standalone-Reader verbindet sich direkt mit Tyrias `MumbleLink` Shared Memory (streng read-only, 100 % ArenaNet-TOS-konform).
  - Synchronisiert automatisch den aktiven Charakter im Berufsplaner und Inventar mit dem im Spiel eingeloggten Charakter.
  - Hebt aktive Weltbosse und Meta-Events auf der aktuellen Karte mit smaragdgrünem `📍 DEINE KARTE`-Badge hervor.
  - **Vollständige Kampf-Ausblendung (In-Combat Auto-Stealth):** Blendet das Overlay im Kampf vollständig aus (`opacity: 0, visibility: hidden`) und leitet Mausklicks direkt an das Spielfenster durch.

</details>

<details>
<summary><b>v0.2.8 · 450–500 Endgame & Performance</b></summary>

- **Crafting Level Planner (450–500 Endgame & Discovery Routes):**
  - Gezielte Entdeckungsempfehlungen für exotische Rüstungen und Waffen für 100 % Bonus-XP von Rang 450 auf 500.
  - Strikte Begrenzung von Entdeckungsschritten auf 1x Herstellung (`crafts: 1`), um versehentliche Mehrfachproduktion zu verhindern.
  - Ausschluss zeitbegrenzter aufgestiegener Rezepte (Damast, Geisterholz) aus Massenleveling-Routen.
  - Performance-Optimierung: Alle 8 Berufe berechnen vollständige 0–500-Routen in unter 50 ms.
  - Update-Benachrichtigungs-Indikator im Header bei neuen GitHub-Releases.

</details>

> Vollständige Versionshistorie siehe [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Features

- **Event Timers & World Bosses:** Live countdowns for 57 world bosses and expansion meta-events based on Tyria's deterministic 2-hour UTC rotation cycle, with one-click Clipboard copying for fast-travel waypoints (`[&...]`).
- **Account-Wide Item Search:** Indexed lookup across Material Storage, Bank tabs, Shared Inventory slots, Character Bags, and Equipped Gear without double-counting items stored across multiple locations.
- **Achievement Recommendations & Total AP:** Deterministic ranking of achievements by obtainable points, completion progress, and remaining objectives across five strategies (*Best Next*, *Best Efficiency*, *Quick Wins*, *Highest Reward*, *Continue Progress*). Enforces point caps on repeatable achievements (e.g. *Agent of Entropy* at 250 AP) and calculates total account AP according to official cap rules (`min(15000, daily + monthly) + permanent`). Public metadata is browsable in Guest Mode without an API key.
- **0–500 Crafting Level Planner:** Computes lowest-cost leveling paths across all 8 crafting disciplines using community XP formulas, with automatic deductions for materials already in your account inventory.
- **Legendary Armory Trees:** Interactive component graphs and bills of materials for Gen 1, Gen 2, and Gen 3 Legendary weapons with live Black Lion Trading Post pricing and Craft-vs.-Buy toggles.
- **Overlay Modes & Hotkeys:** Full Hero Board or compact Mini-HUD docked above the in-game chat box, with global hotkeys (`F9` to toggle overlay visibility, `F10` for click-through mode) and bilingual UI (English and German).

## Screenshots

| Event Rotation Board | Achievement Recommendations |
| :---: | :---: |
| ![Event Board](docs/screenshots/hero-board.png) | ![Achievement Recommendations](docs/screenshots/achievements-hero-panel.png) |
| **Account Item Search** | **Crafting & Leveling Planner** |
| ![Account Item Search](docs/screenshots/account-item-search.png) | ![Crafting Planner](docs/screenshots/crafting-planner.png) |

## Installation

### Standalone Binary (Windows)

1. Download `Omnitria-v0.3.0-windows-x64.zip` from [GitHub Releases](https://github.com/Booster1212/guildwars2-omnitria/releases).
2. Extract the archive to any folder (portable, no installer required).
3. Launch `Omnitria.exe`.

> **Display Requirement:** Guild Wars 2 must run in **Windowed Fullscreen** or **Windowed** mode for the overlay to render above the game window.

### Connecting an API Key

Public event timers, crafting recipes, and achievement definitions are available immediately in Guest Mode. Connecting an official ArenaNet API key (read-only scopes: `account`, `inventories`, `characters`, `progression`, `unlocks`) enables account inventory search and personal achievement progress. Keys are stored locally and encrypted using Windows DPAPI (`safeStorage`).

## Development

Prerequisites: **Node.js 20+** and **npm**.

```bash
# Install dependencies
npm ci

# Start Vite dev server and Electron overlay concurrently
npm run overlay

# Run tests
npm test

# Check TypeScript types
npm run typecheck

# Build renderer production bundle
npm run build

# Package standalone Windows executable
npm run package:win
```

## Documentation

- [ArenaNet Policy & Compliance Review](docs/TOS_COMPLIANCE.md) — Technical audit covering read-only API access, zero memory modification, and clipboard-only integration.
- [Architecture & Data Sources](docs/DATA_SOURCES.md) — Event rotation algorithms, inventory indexing, crafting XP decay model, and caching tiers.
- [Changelog](docs/CHANGELOG.md) — Version history and release notes.

## Legal & Compliance

Guild Wars 2, ArenaNet, and all associated logos are trademarks or registered trademarks of NCsoft Corporation.

Omnitria is designed to minimize risk under ArenaNet's published third-party-program guidelines. It has not been reviewed, approved, or endorsed by ArenaNet. Use at your own risk.
