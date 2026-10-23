# 🐉 Guild Wars 2 - In-Game Overlay (Event HUD, Berufe, Legendäre Waffen & Heldin-Erfolge)

Ein professionelles, immersives In-Game-Overlay für **Guild Wars 2**, das als kompaktes HUD direkt über dem Spielchat schwebt oder als vollständige Heldin-Tafel genutzt werden kann. Gestaltet im authentischen Guild-Wars-2-Interface-Stil (dunkler Schiefer, antike Bronze/Gold-Rahmen, GW2-Raritätsfarben und offizielle ArenaNet-Icons).

---

## 🧭 Hauptbereiche

### 1. Events & Weltbosse (`Events`)
- **Live-Timer:** Echtzeit-Countdown für alle Weltbosse und Meta-Events aller Erweiterungen (*Core, HoT, PoF, EoD, SotO, Janthir*).
- **1-Klick-Chataktionen:** Wegmarke und formatierte Restzeit-Nachricht direkt in den GW2-Kartenchat senden.
- **Wegmarken-Schnellreise:** Wegmarken-Code im Spielchat aufrufen zum schnellen Teleportieren.
- **Taktiken & Beute:** Integrierte Kurz-Leitfäden für Bosse und Beute-Highlights.

### 2. Wegmarken-Verzeichnis (`Wegmarken`)
- Durchsuchbare Datenbank aller wichtigen Event-Wegmarken Tyrias nach Gebiet und Kategorie.
- Ein-Klick-Kopierfunktion in die Zwischenablage oder direkter Chat-Post.

### 3. Heldin • Erfolge (`Erfolge`)
- **GW2-Heldenmenü-Struktur:**
  - `⭐ Verfolgt (Watchlist)`: Individuell angepinnte Erfolge mit Stern (dauerhaft lokal gespeichert).
  - `Täglich`: Tägliche Aufgaben (*Täglicher Komplettierer, Täglicher Weltenboss-Jäger, Tägliche Fraktale, Forstwirt, WvW*).
  - `Weltenbosse`: Alle Boss- und Meta-Event-Erfolge (*Tequatl, Dreifacher Ärger, Zerschmetterer, Jormag, Tarir, Chak-Gerent, Soo-Won*).
  - `Erkundung`: Regions-Erkundungen (*Ascalon, Kryta, Maguuma, Zittergipfel, Orr*) und Sprungrätsel.
  - `Fraktale & Raids`: Fraktale der Nebel (Stufe 1–100, CMs), Schlachtzug *Tal der Geister*, Angriffsmissionen.
  - `Sammlungen`: Legendäre Vorstufen (*Düsterkeit, Bifröst*) und seltene Kuriositäten.
- **Teilziel-Checklisten:** Ausklappbare Unteraufgaben mit Checkboxen zum Nachschlagen und Abhaken.
- **Belohnungen:** Titel, farbcodierte Beherrschungspunkte (*Tyria, Maguuma, Wüste, Cantha*) und Gegenstandstruhen.
- **Live-Boss-Integration:** Ist ein Erfolg an ein anstehendes Event gekoppelt, zeigt die Karte den Live-Status mit Schnellbuttons für Chat und Wegmarke an.

### 4. Berufe & Handwerk (`Berufe`)
- Alle 8 Handwerksdisziplinen (*Rüstungsschmied, Waffenschmied, Konstrukteur, Juwelier, Lederer, Schneider, Koch, Waidmann*).
- **Automatische Bildanzeige:** Offizielle Disziplin-Embleme und hochauflösende ArenaNet-Grafiken.
- **Automatischer Account-Abgleich:** Höchster Charakter-Rang des Accounts oder flexibler manueller Startrang.
- **Interaktiver Levelplaner:**
  - Wählbare Zielstufe (bis Rang 400 bzw. 500).
  - Berechnung der günstigsten Herstellungsfolge auf Basis des GW2-Wiki-XP-Modells.
  - Aggregierte Einkaufsliste mit Gegenüberstellung von Gesamtbedarf und vorhandenem Lagerbestand (`inventories`).
  - Schrittweises Abhaken mit lokaler Persistenz.

### 5. Legendäre Waffen (`Legendär`)
- Vollständiger Katalog aller Generationen (*Gen 1, Gen 2, Gen 3 / Aurene, Gen 4 / Janthir*).
- **Automatische Bildanzeige:** Alle Waffen- und Materialgrafiken werden automatisch vom ArenaNet-Render-CDN geladen.
- **Hierarchischer Komponenten-Baum:**
  - Aufklappbare Rezepturketten der Mystischen Schmiede.
  - Umschalten zwischen *„Herstellen“* und *„Kaufen“* für handelbare Zwischenstufen.
- **Materialien & Stückliste (BOM):**
  - Aggregierte Mengen über alle Äste hinweg (keine Doppelzählung).
  - Live-Preise der Handelsgesellschaft (`/v2/commerce/prices`) und Zukaufsummen.
  - Detaillierte Herkunftsnachweise (Sammeln, Beute, Händler, Schmiede).
- **Vorläufer-Sammlungen:**
  - Automatischer Abgleich mit den offiziellen Sammlungsstufen aus der API.

---

## ⏱️ Wie oft aktualisiert die Guild Wars 2 API?

| Datenbereich | ArenaNet Server-Cache | Verhalten im Overlay |
| :--- | :--- | :--- |
| **Event- & Weltenbosse** | *Echtzeit* | **Sekundengenau** berechnet nach dem festen 2-Stunden-Rotationszyklus von Tyria. |
| **Handelsposten (TP-Preise)** | ca. **1–5 Minuten** (`max-age: 300s`) | Abruf bei Bedarf, lokale Pufferung für **15 Minuten** (schont das Rate-Limit). |
| **Account-Fortschritt & Erfolge** | **5 Minuten** | Automatischer Abgleich bei App-Start und alle **15 Minuten** im Hintergrund (oder sofort per Klick auf *„Synchronisieren“*). |
| **Bank, Materiallager & Inventar** | **5 Minuten** | Automatische Synchronisation alle **15 Minuten** oder manuell. |
| **Item-Katalog & Icons** | Statisch | Dauerhafte Speicherung für **14 Tage** im lokalen Cache; Bilder werden direkt von `render.guildwars2.com` gestreamt. |

*Hinweis:* Das offizielle Rate-Limit der ArenaNet-API beträgt **600 Anfragen / Minute**. Das Overlay nutzt automatisches Microtask-Batching und begrenzt gleichzeitige Anfragen auf maximal 4, sodass das Limit niemals überschritten wird.

---

## ⚡ Schnellstart & Installation

### Voraussetzungen
- Windows 10 / 11
- Node.js (v18 oder neuer) für Entwicklung
- Guild Wars 2 (im Fenstermodus oder Randlos-Fenstermodus)

### Im Spiel starten (lautlos im Hintergrund):
Doppelklicke auf:
```bat
GW2-Overlay-Silent.vbs
```
*(Das Overlay startet direkt als transparente Hintergrundanwendung über Guild Wars 2).*

Alternativ über die Standard-Startdatei:
```bat
start-overlay.bat
```

---

## 🎮 Tastaturkürzel & Steuerung

- **`[F9]`**: Overlay blitzschnell ein- oder ausblenden.
- **`[F10]`**: Maus-Durchklickmodus (*Click-Through*) aktivieren/deaktivieren (Eingaben gehen direkt ins Spiel).
- **Kompass-Symbol** in der Titelleiste: Positioniert das Fenster exakt über dem Standard-Chatfenster unten links.
- **System-Tray**: Rechtsklick auf den goldenen Drachen in der Windows-Taskleiste für Schnellaktionen und Moduswechsel.

---

## 🐙 GitHub Repository vorbereiten

Um das Projekt auf GitHub zu veröffentlichen:

```bash
# 1. Lokales Git-Repository initialisieren (bereits vorkonfiguriert)
git init
git branch -M main

# 2. Dateien zum Commit hinzufügen
git add .
git commit -m "Initial commit: Guild Wars 2 Event Overlay & Hero Panel"

# 3. Mit deinem GitHub-Repository verknüpfen
git remote add origin https://github.com/DEIN_BENUTZERNAME/GW2-Overlay.git

# 4. Pushen
git push -u origin main
```

---

## 🛠️ Entwicklung & Qualitätssicherung

```bash
# Abhängigkeiten installieren
npm install

# TypeScript-Typprüfung
npm run typecheck

# Domänen- & Berechnungs-Tests ausführen (14/14 Tests)
npm test

# Produktions-Build erstellen
npm run build
```

Ausführliche Details zu Architektur, Datenquellen und Persistenz finden sich in [docs/DATENQUELLEN.md](docs/DATENQUELLEN.md).

---

## 📜 Lizenz & ArenaNet-Hinweis
Guild Wars 2 und ArenaNet sind eingetragene Warenzeichen der NCsoft Corporation. Dieses Projekt ist ein Fan-Projekt und steht in keiner offiziellen Verbindung zu ArenaNet oder NCsoft. Alle Bildrechte an Spielgrafiken liegen bei ArenaNet / NCsoft.
