# Hinweis zu Community-Daten (Crafty Legend)

Die in diesem Verzeichnis hinterlegte Datei `legendary-weapons.json` basiert auf Daten des Open-Source-Projekts **crafty_legend** von **PieOrCake**:
- **Quelle:** https://github.com/PieOrCake/crafty_legend
- **Lizenz:** MIT License (Copyright (c) 2024 PieOrCake)
- **Commit:** `8b6742297807a19678f863101ceea3cc6399a4f3` (19. September 2024)

### Warum ein Community-Datensatz erforderlich ist:
Die offizielle Guild Wars 2 API (`api.guildwars2.com/v2`) stellt prinzipbedingt keine Rezepte der **Mystischen Schmiede** bereit (wie auch im offiziellen API-Wiki dokumentiert). Da legendäre Waffen und ihre Vorläufer über die Mystische Schmiede kombiniert werden, ist ein geprüfter Datensatz dieser Rezepturen notwendig.

### Trennung der Datenquellen:
1. **Community-Datensatz (`crafty_legend`):**
   - Ausschließlich die Rezepturen der Mystischen Schmiede (Zutaten und Ausgabemengen).
   - Herkunfts-Tags (z. B. `trading_post`, `gathering`, `vendor`, `drop`).
2. **Offizielle ArenaNet GW2-API:**
   - Alle Namen, Beschreibungen, Symbole und Waffentypen (zur Laufzeit in deutscher Sprache).
   - Alle aktuellen Marktpreise der Handelsgesellschaft (`/v2/commerce/prices`).
   - Alle offiziellen Handwerksrezepte (`/v2/recipes`).
   - Alle persönlichen Accountdaten (`/v2/account/*`).
