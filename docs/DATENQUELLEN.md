# Datenquellen, Architektur & Grenzen der Daten

Dieses Dokument beschreibt die Architektur der Datenbeschaffung, die Klassifikation der Datenquellen sowie bekannte Grenzen und Annahmen der Anwendung **Omnitria**.

---

## 1. Datenklassifikation

In der Anwendung werden alle Daten streng in fünf Klassen unterteilt und in der Benutzeroberfläche durch entsprechende Abzeichen (`API`, `Konto`, `Community`, `Berechnet`, `Unbekannt`) transparent gekennzeichnet:

| Klasse | Kennzeichnung in UI | Quelle | Beschreibung & Verwendung |
|---|---|---|---|
| **Offiziell** | `API` | Offizielle ArenaNet API (`api.guildwars2.com/v2`) | Gegenstände, Namen, Beschreibungen, Symbole, Waffentypen, offizielle Handwerksrezepte und Erfolgskategorien. |
| **Persönlich** | `Konto` | API-Endpunkte unter `/v2/account/*` | Materiallager, Bankfächer, geteiltes Inventar, Charaktertaschen, Handwerksränge und Erfolgsfortschritt. |
| **Markt** | `API` | `/v2/commerce/prices` | Aktuelle Sofortkauf- und Kaufgesuchs-Preise der Schwarzlöwen-Handelsgesellschaft. |
| **Community** | `Community` | Vendorter Datensatz [`crafty_legend`](https://github.com/PieOrCake/crafty_legend) (MIT-Lizenz) | Rezepte der **Mystischen Schmiede** und Herkunftskategorien (Sammeln, Beute, Händler). |
| **Berechnet** | `Berechnet` | Domänen-Logik (`src/domain/`) | Netto-Bedarfe, aggregierte Stücklisten (BOM), Levelrouten, Kostensummen und Fortschrittsberechnungen. |

---

## 2. API-Endpunkte und erforderliche Berechtigungen

| Feature | API-Endpunkt | Erforderliche Berechtigung | Verhalten bei Fehlen |
|---|---|---|---|
| Basis-Account | `/v2/account` | `account` | Zeigt Standardansicht ohne Account-Bindung |
| Erfolge | `/v2/account/achievements` | `progression` | Keine persönlichen Erfolgsbalken |
| Materiallager | `/v2/account/materials` | `inventories` | Kein Bestandsabzug bei Basismaterialien |
| Bank | `/v2/account/bank` | `inventories` | Kein Bestandsabzug bei Bankfächern |
| Geteiltes Inventar | `/v2/account/inventory` | `inventories` | Kein Bestandsabzug bei geteilten Plätzen |
| Charaktere & Taschen | `/v2/characters?ids=all` | `characters` (+ `inventories` für Taschen) | Handwerksränge müssen manuell gewählt werden |
| Geldbörse | `/v2/account/wallet` | `wallet` | Währungsabgleich nicht aktiv |
| Bekannte Rezepte | `/v2/account/recipes` | `unlocks` | Nur `AutoLearned`-Rezepte im Planer aktiv |
| Legendäre Rüstkammer | `/v2/account/legendaryarmory` | `unlocks` | Bereits freigeschaltete Waffen werden nicht automatisch erkannt |

---

## 3. Bekannte Grenzen und Einschränkungen

### 3.1 Keine Mystische-Schmiede-Rezepte in der API
Die ArenaNet-API bietet **keinen Endpunkt für Rezepte der Mystischen Schmiede** (`/v2/recipes/search?output=…` liefert für legendäre Waffen leere Ergebnisse).
- **Lösung:** Verwendung des unabhängig geprüften Open-Source-Datensatzes von PieOrCake (Commit `8b674229`).
- **Transparenz:** Waffen ohne erfasstes Rezept (z. B. neuere Waffen wie *Ancora Pax* oder *Ancora Bellum*) werden in der Benutzeroberfläche ausdrücklich als *„Unvollständig / Rezept noch nicht erfasst“* markiert, anstatt Spekulationen anzustellen.

### 3.2 Keine Handwerks-XP in der API
Die GW2-API liefert weder den aktuellen XP-Punktestand innerhalb eines Handwerksranges noch die XP-Punkte pro Rezept.
- **Lösung:** Approximation über das etablierte Community-Modell des offiziellen GW2-Wikis (`ranksPerCraft = multiplier * (1 - (rank - minRating) / span)`).
- **Kennzeichnung:** Alle Schrittanzahlen und Gesamtkosten im Levelplaner sind explizit mit dem Hinweis *„Schätzung“* versehen.

### 3.3 Zufallsrezepte (Mystische Kleeblätter)
Das 10er-Rezept für Mystische Kleeblätter in der Mystischen Schmiede besitzt eine Zufallschance:
- **Lösung:** Der Erwartungswert wird mit einer durchschnittlichen Erfolgsquote von **31 %** (`yield = 0.31`) berechnet. Alle abgeleiteten Materialmengen und Kosten werden als Schätzwerte gekennzeichnet.

### 3.4 Wiki-Status
Das offizielle englische Guild Wars 2 Wiki befand sich während der Entwicklung im Wartungsmodus. Relevante Links verweisen auf das deutsche Guild Wars 2 Wiki (`wiki-de.guildwars2.com`) über die gesicherte Electron-IPC-Schnittstelle.

---

## 4. Persistenz und Caching

1. **Persönlicher Fortschritt (`progressStore.ts`):**
   - Versioniertes Schema (`gw2_overlay_progress_v1`).
   - Primär: `localStorage` mit Versionsprüfung und automatischem Backup bei unbekannten Versionen.
   - Sekundär (in Electron): Automatische Spiegelung in eine atomar geschriebene JSON-Datei im `userData`-Verzeichnis über IPC (`store-read` / `store-write`). Der neuere Zeitstempel (`savedAt`) gewinnt beim Start.

2. **Statische Spieldaten (Cache):**
   - Rezepte (`recipes:v1`) und Item-Metadaten (`items:de:v1`) werden komprimiert in der **IndexedDB** gehalten (Gültigkeit 14 Tage bzw. bis zur nächsten Spielversion `/v2/build`).
   - Marktpreise (`commerce/prices`) besitzen einen 5-Minuten-Kurzzeit-Cache.
