# ArenaNet Terms of Service (ToS) Compliance, Security & Architecture Guide

This document provides a comprehensive technical and policy analysis of **Omnitria** regarding its compliance with the **ArenaNet User Agreement**, **Rules of Conduct**, and official **ArenaNet Third-Party Program Policy**.

> **Important Notice:**  
> Omnitria is an independent community project and is **neither reviewed, certified, nor endorsed by ArenaNet or NCsoft**.  
> No third-party program can be declared unconditionally "ban-safe" or "guaranteed rule-compliant". The use of any third-party tool is always at the player's own risk. This document transparently explains the technical architecture and the safeguards implemented to minimize risks.

---

## 1. Project Scope

### What is Omnitria?
Omnitria is an open-source, external desktop companion and HUD overlay for **Guild Wars 2**. It is designed to grant players convenient in-game access to publicly available game information without requiring alt-tabbing or navigating external browsers.

### Core Modules
1. **Event & World Boss Timers:** Local calculation of Tyria's fixed, deterministic 2-hour UTC rotation schedule across Core Tyria, Expansions, and Living World seasons with fast-travel waypoint codes.
2. **WvW Tactical Assistant (World vs. World):** Real-time aggregation of public match standings, objective ownership, and Points Per Tick (PPT) from the official ArenaNet REST API, alongside transparent heuristic priority scoring.
3. **Crafting & Leveling Planner (0–500):** Algorithmic lowest-cost route calculation based on community XP progression formulas, live Black Lion Trading Post prices, and automated inventory deduction.
4. **Legendary Armory & Mystic Forge Trees:** Hierarchical breakdown of legendary weapon recipes and component materials, supporting live material valuations and inventory deductions via API keys.
5. **Hero Panel & Achievement Tracker:** Actionable achievement checklists, daily tracking, and tier rewards synchronized through personal read-only ArenaNet API keys.

### Target Audience
The tool is intended for casual players, veterans, guild commanders, and squads who want routine game data (timers, recipes, waypoints, standings) presented cleanly and conveniently above their game screen.

---

## 2. Technical Architecture

Omnitria is built on Electron with a separated architecture (Chromium Renderer and Node.js Main Process) that runs completely isolated from the game client process:

```mermaid
flowchart TD
    subgraph OS["Operating System (Windows 10 / 11 Desktop)"]
        subgraph GW2Process["Guild Wars 2 Process (Gw2-64.exe)"]
            GW2["Game Client<br/>(No modifications, no hooks, no injected DLLs)"]
        end
        
        subgraph OmnitriaApp["Omnitria Desktop Application"]
            Main["Electron Main Process (main.cjs)<br/>- Window management & tray<br/>- Safe clipboard handler (clipboard.writeText)<br/>- Strict URL allowlisting & updater validation"]
            Preload["Preload Script (preload.cjs)<br/>- contextBridge isolation<br/>- Typed, sanitized IPC channels"]
            Renderer["Renderer Process (React 18 + Vite)<br/>- UI presentation & components<br/>- Domain heuristics & offline calculators"]
        end
        
        Clipboard["Windows Clipboard"]
    end
    
    subgraph External["External Interfaces"]
        API["Official ArenaNet REST API<br/>(https://api.guildwars2.com/v2/)"]
    end

    Main <-->|Sanitized IPC| Preload
    Preload <-->|Secure Context Bridge| Renderer
    Renderer -->|HTTPS Requests (Read-Only)| API
    Main -->|Copy Text / Waypoint| Clipboard
    Clipboard -.->|Manual In-Game Paste by User (Ctrl+V)| GW2
```

### Technical Security Characteristics
- **Process Isolation:** Omnitria runs as an external operating system process. It does not inspect or manipulate the process memory (`ReadProcessMemory` / `WriteProcessMemory`) of `Gw2-64.exe`.
- **Zero DLL Injection or Graphics Hooking:** Omnitria does not inject dynamic link libraries (`.dll`) or hook into DirectX/Vulkan graphics pipelines (`d3d11.dll`, `dxgi.dll`).
- **Standard Desktop Compositing:** Overlay behavior is achieved exclusively through native Windows desktop window flags (`alwaysOnTop: true`, transparent frameless window).
- **Click-Through Mode (`[F10]`):** When Click-Through is enabled, Omnitria applies the Win32 window style `WS_EX_TRANSPARENT`, directing Windows to forward mouse clicks straight through to the underlying application.
- **Electron Hardening:**
  - `contextIsolation: true` and `nodeIntegration: false` prevent direct Node.js access from renderer contexts.
  - Strict `setWindowOpenHandler` blocks unauthorized popups and routes allowlisted external links to the user's default browser.
  - `will-navigate` listeners block unauthorized navigation within the overlay window.
  - Auto-update downloads are strictly constrained to verified GitHub release domains.

---

## 3. Data Sources

Omnitria relies exclusively on information that is either publicly known or retrieved through official interfaces:

| Data Category | Data Source | Technical Mechanism | Known Constraints & Boundaries |
|---|---|---|---|
| **Event Rotation Timers** | Local deterministic calculation | Computed against Tyria's fixed, public 2-hour UTC rotation cycle | Does not dynamically detect individual map instance/IP progression states. |
| **WvW Match & Objectives** | ArenaNet REST API (`/v2/wvw/matches`, `/v2/wvw/objectives`) | Public JSON endpoints polled every 30s with adaptive backoff | Reflects macro structure states only. Zero visibility into player counts, zergs, or siege. |
| **Worlds & Server Names** | ArenaNet REST API (`/v2/worlds`) | Public endpoint resolving world IDs to localized server names | Static world metadata; no server capacity data. |
| **Trading Post Prices** | ArenaNet REST API (`/v2/commerce/prices`) | Public market prices cached locally for 5 minutes | Slight server caching delay (typically 1–5 minutes). |
| **Account Progress & Bank** | Authenticated ArenaNet API (`/v2/account/*`) | Read-only requests authenticated with user's personal API key | Read-only by design. Cannot execute trades, delete items, or access account credentials. |
| **Mystic Forge Recipes** | Open-source community dataset (`crafty_legend`) | Local JSON graph files pruned to legendary weapons | Static offline snapshot; newly introduced recipes must be manually updated. |

### Data Explicitly NOT Available or Used
- **No Game Memory Inspection:** Zero reading of entity arrays, character coordinates, health pools, or memory offsets.
- **No Player or Zerg Radar:** Omnitria does not and cannot track enemy player locations, team formations, or stealthed units.
- **No Fog-of-War Bypass:** Omnitria cannot reveal contested areas beyond what the public API publishes.

---

## 4. Game Interaction & Input Architecture

### Zero Input Automation
ArenaNet's Third-Party Program Policy and Macro Policy strictly prohibit automation that executes multi-action gameplay sequences or acts without direct, deliberate player input (*"one keypress = one combat action"*).

Omnitria enforces the following architecture:
1. **No Automated Chat Opening:** Omnitria does not send keystrokes to the game client.
2. **No Automated Text Insertion or Enter Keys:** Legacy automation helpers (such as Windows Script Host, VBScript `gw2_send.vbs`, or `SendKeys` simulating `Enter -> Ctrl+V -> Enter`) have been **completely eliminated**.
3. **Explicit Clipboard-Only Workflow:**
   - Clicking a waypoint code or callout button exclusively places the formatted text into the Windows clipboard via Electron's native `clipboard.writeText`.
   - The user interface immediately displays clear confirmation toast feedback (*"Copied to clipboard! Paste in-game with [Enter] + [Ctrl+V]"*).
   - The player always retains full control over when to open in-game chat, paste the content, and press Enter.
4. **No Background Input Loops or Macros:** The codebase contains zero timers, loops, or background processes that simulate keyboard or mouse actions in the operating system.

---

## 5. World vs. World (WvW) Tactical Features

### How the Module Works
The WvW module aggregates data from `/v2/wvw/matches` and `/v2/wvw/objectives`. Using this public information, Omnitria computes transparent heuristics to support strategic situational awareness:

- **Righteous Indignation (RI) Timers:**  
  The 5-minute post-capture invulnerability window is calculated based on the recorded objective capture timestamp.  
  *Note:* Because the API does not expose a dedicated countdown field, this value is an **algorithmic estimation**.
- **Tactical Prioritization:**  
  A multi-factor heuristic scores objectives based on Points Per Tick (PPT), upgrade tier (T0–T3), proximity to home spawn, and match leadership deficit.  
  Every recommendation in the UI is explicitly marked as a **heuristic suggestion** (`isEstimated: true`) and lists its underlying rationale.
- **Data Staleness & Outage Tolerance:**  
  - If data has not refreshed for more than **90 seconds**, the interface displays a prominent staleness warning banner.
  - If API requests fail, an exponential backoff policy engages (30s → 45s → 60s → 120s → 300s), preventing aggressive retry loops and server load during ArenaNet outages.

### Inherent Boundaries of the Assistant
The tactical assistant has zero insight into actual battlefield combat conditions, defensive siege equipment, or defending squad sizes. It functions strictly as a macro-level situational overview.

---

## 6. Risk Assessment & Remaining Risks

We categorize compliance and technical risk into three distinct tiers:

### A. Technically Standard-Compliant / Low Risk
- **Rotation Timers & Calculators:** Purely informative mathematical models derived from public rotation data without game interaction.
- **Read-Only REST API Ingestion:** Standard HTTP queries conforming to ArenaNet rate limits and local caching guidelines.
- **Manual Clipboard Copying:** Placing text into the OS clipboard is a standard system utility action that involves zero game process tampering.

### B. Areas Subject to Interpretation
- **Algorithmic Tactical Recommendations in WvW:**  
  Although recommendations rely exclusively on public API data, they organize strategic choices for players and commanders. While the data is public, ArenaNet maintains a broad policy against software offering an "unfair competitive advantage." It remains a matter of interpretation whether automated tactical scoring is viewed as neutral situational awareness or an unfair edge.
- **Persistent Desktop Overlay Window:**  
  Frameless desktop overlays are widely used and tolerated (e.g., Blish HUD, Discord, OBS), but they remain external overlays rather than native game features.

### C. Open Questions That Only ArenaNet Can Authoritatively Answer
1. Does ArenaNet define specific complexity thresholds for heuristic priority scoring built on public WvW API feeds?
2. Does ArenaNet distinguish between manually pasted clipboard callouts and other external coordination tools?

---

## 7. Official Review & Approval Status

- **No Official Approval:** Omnitria has not been reviewed, certified, or endorsed by ArenaNet.
- **ArenaNet Policy on Third-Party Tools:** ArenaNet does not officially validate or certify third-party software. Their standing stance is: *“Use of any third-party application is at your own risk.”*
- **No Absolute Immunity Guarantee:** Neither the developers of Omnitria nor this guide can guarantee that ArenaNet will not alter policies or exercise enforcement discretion in the future.

---

## 8. Compliance-Relevant Changelog

### Version 0.1.7 (Compliance & Security Overhaul)
- **Removal of Input and Keystroke Simulation:**
  - Removed `sendTextToGw2`, VBScript generation (`gw2_send.vbs`), `WScript.Shell`, and `child_process.exec` from `electron/main.cjs`.
  - Converted all chat and waypoint interactions to explicit, manual clipboard copying (`clipboard.writeText`).
  - Defused legacy IPC routes (`gw2-send-chat`, `gw2-teleport-waypoint`) to safely copy to clipboard only.
- **Electron Security Hardening:**
  - Added strict URL allowlisting for external links via `shell.openExternal`.
  - Constrained auto-updater package downloads strictly to official GitHub release URLs.
  - Implemented window navigation locks (`will-navigate`) against unauthorized URL transitions.
- **WvW Data Staleness & Resilience:**
  - Added a 90-second staleness threshold (`isStale: true`) with prominent UI warning banners.
  - Implemented exponential backoff for failed API polling (capping at 300s).
  - Explicitly labeled all tactical suggestions with `isEstimated: true` and underlying data source tags.
- **Documentation Overhaul:**
  - Removed all unverified claims regarding absolute ban immunity, 100% guarantees, or official ArenaNet endorsement.
  - Restructured compliance documentation into 8 comprehensive, objective sections.
