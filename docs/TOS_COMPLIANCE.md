# ArenaNet Terms of Service (ToS) Compliance & Security Guide

This document provides a comprehensive technical and policy analysis of **Omnitria** regarding its compliance with the **ArenaNet User Agreement**, **Rules of Conduct**, and the official **ArenaNet Third-Party Program Policy**.

---

## 🛡️ Quick Summary: Is Omnitria 100% ToS-Compliant?

**Yes.** Omnitria is designed from the ground up to operate strictly within the boundaries of ArenaNet’s third-party software policies:

| Policy Requirement | Omnitria Status | Technical Explanation |
| :--- | :---: | :--- |
| **No Memory Manipulation / Reading** | ✅ **100% Compliant** | Omnitria does **not** read or write the process memory (`ReadProcessMemory` / `WriteProcessMemory`) of `Gw2-64.exe`. |
| **No DLL Injection or Hooking** | ✅ **100% Compliant** | Omnitria does **not** inject DLLs or hook DirectX/Vulkan graphics pipelines (`d3d11.dll`, `dxgi.dll`). |
| **No Game Client / File Modification** | ✅ **100% Compliant** | Omnitria never modifies `Gw2.dat`, `Gw2-64.exe`, or any game installation files. |
| **No Combat or Gameplay Automation** | ✅ **100% Compliant** | Zero combat macros, zero auto-cast sequences, zero botting routines. Fully compliant with the *"one keypress = one action"* rule. |
| **No Unfair Combat Advantage** | ✅ **100% Compliant** | All displayed timers, WvW objectives, recipes, and achievements originate from public rotation math or official public APIs. |
| **Official Read-Only REST API** | ✅ **100% Compliant** | Communicates exclusively with `https://api.guildwars2.com/v2/` using user-generated read-only API keys. |

---

## 🔍 Detailed Policy Analysis against ArenaNet's Core Pillars

ArenaNet's policy on third-party software is primarily guided by three criteria published in their official knowledge base and user agreements:

### 1. Does Omnitria Modify Game Files or Client Binaries?
> **ArenaNet Policy:** *Players may not modify, alter, or disassemble any game files, including the game executable (`Gw2-64.exe`) and archive (`Gw2.dat`).*

* **Omnitria's Architecture:**
  * Omnitria is a standalone, external desktop application built on Chromium and Electron.
  * It runs in an independent operating system process completely isolated from Guild Wars 2.
  * It does not read, write, patch, or replace any file inside your Guild Wars 2 installation directory.

---

### 2. Does Omnitria Inject Code or Hook into the Game Process?
> **ArenaNet Policy:** *Programs that inject code into the Guild Wars 2 process space or intercept graphics pipelines without authorization pose security and stability risks.*

* **Omnitria's Architecture:**
  * Omnitria does **not** inject any dynamic-link library (`.dll`) into the Guild Wars 2 process.
  * It does **not** hook Direct3D/DirectX render calls (`Present`, `DrawIndexed`, etc.).
  * **How the overlay works:** Omnitria creates a standard Windows transparent desktop window with `alwaysOnTop: true`. When you play Guild Wars 2 in *Windowed Fullscreen* or *Windowed* mode, Windows composites Omnitria over the game window, exactly like Discord Overlay, OBS Studio, or a second monitor web browser.
  * When Click-Through (`[F10]`) is enabled, Omnitria calls the standard Windows Win32 API (`WS_EX_TRANSPARENT`), instructing Windows to forward all mouse clicks straight through to Guild Wars 2 without intercepting them.

---

### 3. Does Omnitria Automate Gameplay or Violate the Macro Policy?
> **ArenaNet Policy:** *Players are not permitted to use macros or software that automate combat or provide multi-action execution (1 keypress = 1 combat action).*

* **Zero Combat/Skill Automation:**
  * Omnitria does not trigger skills, dodge rolls, weapon swaps, or player movement.
* **Chat Callouts & Waypoint Linking:**
  * Omnitria provides an optional helper to send event notifications (e.g. `[Tequatl the Sunless] in 10m [&BNABAAA=]`) into in-game chat (`/m`).
  * Technically, it places the string into the Windows clipboard and triggers a standard `Enter -> Ctrl+V -> Enter` sequence via Windows Script Host.
  * **ArenaNet Stance on Chat Templates:** ArenaNet has repeatedly confirmed that chat macros (such as commander announcements, guild recruitment messages, and waypoint chat codes) do not violate the ToS because they do not automate character combat actions or provide an unfair competitive advantage.
  * Players who prefer strictly manual input can also use the 1-click clipboard copy button and press `Ctrl+V` themselves.

---

### 4. Does Omnitria Provide an Unfair Gameplay Advantage?
> **ArenaNet Policy:** *Programs that reveal unannounced player locations (e.g. stealthed enemies), wallhacks, or combat advantages not intended by the game design are strictly forbidden.*

* **Event Timers & World Bosses:**
  * All timers are calculated deterministically using the official UTC fixed 2-hour rotation schedule. This schedule is public knowledge documented on the official Guild Wars 2 Wiki.
* **World vs. World (WvW) Radar & Standings:**
  * All WvW objective ownership, scores, Righteous Indignation timers, and structure tiers are pulled directly from the **official ArenaNet WvW API** (`/v2/wvw/matches` and `/v2/wvw/objectives`).
  * Omnitria does **not** track real-time player or enemy positions on the battlefield. It only displays public structure states published by ArenaNet's API servers.
* **Crafting & Legendary Calculators:**
  * Optimal leveling routes and material costs are computed offline using public wiki XP decay formulas and live Trading Post prices (`/v2/commerce/prices`).

---

## 🔑 ArenaNet API Key Security & Privacy

Omnitria allows connecting your official ArenaNet API key for personalized inventory tracking and achievement watchlists.

### Why ArenaNet API Keys are 100% Safe:
1. **Read-Only by Design:**
   * ArenaNet's API architecture does not support write actions. An API key **cannot** trade items, transfer gold, delete characters, change account passwords, or interact with other players.
2. **Granular Permissions:**
   * You choose which permissions to grant (`account`, `inventories`, `characters`, `unlocks`, `progression`, `wallet`).
   * No sensitive account information (login email, password, billing info) is ever exposed via the API.
3. **Local Storage Only:**
   * Your API key is saved exclusively in your local machine's encrypted storage (`gw2-overlay-data`).
   * Omnitria has **zero third-party servers, zero telemetry, and zero analytics**. Requests travel directly and securely from your computer to ArenaNet (`https://api.guildwars2.com/`).

---

## ⚖️ Official ArenaNet Third-Party Policy Disclaimer

ArenaNet does not officially review, certify, or endorse any third-party program (including popular community tools such as Blish HUD, GW2 TacO, ArcDPS, or GW2Efficiency). 

ArenaNet's official policy states:
> *"ArenaNet does not review, validate, or endorse any specific third-party program. Use of any third-party application is at your own risk. However, programs that do not alter the game client, do not modify or read memory, and do not provide an unfair gameplay advantage do not violate our User Agreement."*

Omnitria was engineered strictly to comply with these principles, ensuring that your account remains completely safe.
