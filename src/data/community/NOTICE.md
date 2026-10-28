# Community Dataset Attribution & Notice (`crafty_legend`)

The `legendary-weapons.json` dataset in this directory is derived from the open-source project **crafty_legend** by **PieOrCake**:
- **Source Repository:** https://github.com/PieOrCake/crafty_legend
- **License:** MIT License (`Copyright (c) 2024 PieOrCake`)
- **Upstream Commit:** `8b6742297807a19678f863101ceea3cc6399a4f3` (September 19, 2024)

### Why a Community Dataset Is Needed
The official Guild Wars 2 API (`https://api.guildwars2.com/v2`) does not expose **Mystic Forge** recipes (`/v2/recipes/search` only covers crafting discipline stations). Because Legendary weapons and their Gift/Mystic Tribute sub-components are combined in the Mystic Forge, a verified static component graph is required.

### Separation of Data Sources
1. **Community Dataset (`crafty_legend`):**
   - Mystic Forge recipe graphs (ingredient item IDs, output quantities, and discipline tags).
   - Item acquisition source tags (`trading_post`, `gathering`, `vendor`, `drop`, `mystic_forge`, `achievement`, `map_completion`).
2. **Official ArenaNet Guild Wars 2 API (`api.guildwars2.com/v2`):**
   - Localized item names, descriptions, rarities, icons, and weapon types resolved at runtime in English (`en`) and German (`de`) via `/v2/items`.
   - Live Black Lion Trading Post buy/sell prices via `/v2/commerce/prices`.
   - Official discipline crafting recipes via `/v2/recipes`.
   - Personal read-only account, inventory, character, and progression data via `/v2/account/*` and `/v2/characters`.
