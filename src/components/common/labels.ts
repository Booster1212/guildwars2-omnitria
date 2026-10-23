import type { DisciplineId, Rarity } from '../../domain/types.ts';

export const RARITY_DE: Record<Rarity, string> = {
  Junk: 'Plunder',
  Basic: 'Einfach',
  Fine: 'Edel',
  Masterwork: 'Meisterwerk',
  Rare: 'Selten',
  Exotic: 'Exotisch',
  Ascended: 'Aufgestiegen',
  Legendary: 'Legendär',
};

export const ITEM_TYPE_DE: Record<string, string> = {
  Armor: 'Rüstung',
  Back: 'Rücken',
  Bag: 'Tasche',
  Consumable: 'Verbrauchsgut',
  Container: 'Behälter',
  CraftingMaterial: 'Handwerksmaterial',
  Gathering: 'Sammelwerkzeug',
  Gizmo: 'Apparat',
  Key: 'Schlüssel',
  MiniPet: 'Miniatur',
  Relic: 'Relikt',
  Tool: 'Werkzeug',
  Trinket: 'Schmuck',
  Trophy: 'Trophäe',
  UpgradeComponent: 'Aufwertung',
  Weapon: 'Waffe',
  PowerCore: 'Energiekern',
  JadeTechModule: 'Jade-Modul',
};

export const DISCIPLINE_DE: Record<DisciplineId, string> = {
  Armorsmith: 'Rüstungsschmied',
  Weaponsmith: 'Waffenschmied',
  Artificer: 'Konstrukteur',
  Jeweler: 'Juwelier',
  Leatherworker: 'Lederer',
  Tailor: 'Schneider',
  Chef: 'Koch',
  Huntsman: 'Waidmann',
};

/** Stellvertreter-Item je Beruf, dessen offizielles Icon als Berufssymbol dient (siehe scripts/pick-discipline-icons.cjs) */
export const DISCIPLINE_ICON_ITEM: Record<DisciplineId, number> = {
  Armorsmith: 47929,
  Weaponsmith: 47021,
  Artificer: 47016,
  Jeweler: 13498,
  Leatherworker: 47941,
  Tailor: 47935,
  Chef: 91770,
  Huntsman: 47012,
};

/** Offizielle Embleme der Handwerksdisziplinen */
export const DISCIPLINE_ICONS: Record<DisciplineId, string> = {
  Armorsmith: 'https://wiki.guildwars2.com/images/thumb/a/a2/Armorsmith_tango_icon_200px.png/64px-Armorsmith_tango_icon_200px.png',
  Weaponsmith: 'https://wiki.guildwars2.com/images/thumb/f/f3/Weaponsmith_tango_icon_200px.png/64px-Weaponsmith_tango_icon_200px.png',
  Artificer: 'https://wiki.guildwars2.com/images/thumb/7/77/Artificer_tango_icon_200px.png/64px-Artificer_tango_icon_200px.png',
  Jeweler: 'https://wiki.guildwars2.com/images/thumb/6/6a/Jeweler_tango_icon_200px.png/64px-Jeweler_tango_icon_200px.png',
  Leatherworker: 'https://wiki.guildwars2.com/images/thumb/7/7a/Leatherworker_tango_icon_200px.png/64px-Leatherworker_tango_icon_200px.png',
  Tailor: 'https://wiki.guildwars2.com/images/thumb/d/df/Tailor_tango_icon_200px.png/64px-Tailor_tango_icon_200px.png',
  Chef: 'https://wiki.guildwars2.com/images/thumb/9/91/Chef_tango_icon_200px.png/64px-Chef_tango_icon_200px.png',
  Huntsman: 'https://wiki.guildwars2.com/images/thumb/b/b3/Huntsman_tango_icon_200px.png/64px-Huntsman_tango_icon_200px.png',
};

export const RECIPE_TYPE_DE: Record<string, string> = {
  Sword: 'Schwert',
  Axe: 'Axt',
  Dagger: 'Dolch',
  Greatsword: 'Großschwert',
  Hammer: 'Hammer',
  Mace: 'Streitkolben',
  Shield: 'Schild',
  Staff: 'Stab',
  Trident: 'Dreizack',
  Scepter: 'Zepter',
  Focus: 'Fokus',
  Rifle: 'Gewehr',
  Warhorn: 'Kriegshorn',
  LongBow: 'Langbogen',
  ShortBow: 'Kurzbogen',
  Torch: 'Fackel',
  Speargun: 'Harpunengewehr',
  Harpoon: 'Speer',
  Pistol: 'Pistole',
  Helm: 'Kopf / Helm',
  Shoulders: 'Schulterschutz',
  Coat: 'Wams / Brustpanzer',
  Gloves: 'Handschuhe',
  Leggings: 'Beinschutz / Hose',
  Boots: 'Stiefel',
  Amulet: 'Amulett',
  Ring: 'Ring',
  Earring: 'Ohrring',
  Meal: 'Mahlzeit',
  Soup: 'Suppe',
  Dessert: 'Dessert',
  Snack: 'Snack',
  Feast: 'Festmahl',
  Potion: 'Trank',
  Consumable: 'Verbrauchsgut',
  Bag: 'Tasche',
  Refinement: 'Veredelung',
  Component: 'Komponente',
  Insignia: 'Insignie',
  Inscription: 'Inschrift',
  UpgradeComponent: 'Aufwertung',
};

export interface CraftingTier {
  id: string;
  label: string;
  shortLabel: string;
  minRating: number;
  maxRating: number;
  materials: string;
}

export const CRAFTING_TIERS: CraftingTier[] = [
  { id: 'all', label: 'Alle Stufen (Rang 0–500)', shortLabel: 'Alle', minRating: 0, maxRating: 500, materials: 'Alle Materialien' },
  { id: 't1', label: 'Stufe 1 (Rang 0–74)', shortLabel: 'T1 (0–74)', minRating: 0, maxRating: 74, materials: 'Bronze / Jute / Rohleder / Kupfer' },
  { id: 't2', label: 'Stufe 2 (Rang 75–149)', shortLabel: 'T2 (75–149)', minRating: 75, maxRating: 149, materials: 'Eisen / Wolle / Dünnes Leder / Silber' },
  { id: 't3', label: 'Stufe 3 (Rang 150–224)', shortLabel: 'T3 (150–224)', minRating: 150, maxRating: 224, materials: 'Stahl / Baumwolle / Raues Leder / Gold' },
  { id: 't4', label: 'Stufe 4 (Rang 225–299)', shortLabel: 'T4 (225–299)', minRating: 225, maxRating: 299, materials: 'Dunkelstahl / Leinen / Dickes Leder / Platin' },
  { id: 't5', label: 'Stufe 5 (Rang 300–399)', shortLabel: 'T5 (300–399)', minRating: 300, maxRating: 399, materials: 'Mithril / Seide / Gehärtetes Leder / Mithril' },
  { id: 't6', label: 'Stufe 6 (Rang 400–500)', shortLabel: 'T6 (400–500)', minRating: 400, maxRating: 500, materials: 'Orikalkum / Gaze / Gehärtetes Leder / Orichalcum' },
];

export interface DiscoveryGuideInfo {
  formula: string;
  primary: string;
  secondary: string;
  modifier: string;
  tip: string;
}

export const DISCOVERY_GUIDES: Record<DisciplineId, DiscoveryGuideInfo> = {
  Weaponsmith: {
    formula: '1× Waffenkopf/-klinge + 1× Waffengriff/-heft + 1× Inschrift = Waffe',
    primary: 'Klinge / Kopf (z. B. Schwertklinge, Axtschneide, Streitkolbenkopf)',
    secondary: 'Heft / Griff / Stiel (z. B. Schwertheft, Axtstiel, Streitkolbenstiel)',
    modifier: 'Attribut-Inschrift (Bronze, Eisen, Stahl, Dunkelstahl, Mithril, Orikalkum)',
    tip: 'Kombiniere für jede Waffenart denselben Kopf + Griff mit verschiedenen Inschriften für maximale Entdeckungs-EP!',
  },
  Huntsman: {
    formula: '1× Bogenstab/Lauf/Stiel + 1× Sehne/Gehäuse/Kopf + 1× Inschrift = Fernwaffe',
    primary: 'Stab / Lauf / Mundstück (z. B. Bogenstab, Gewehrlauf, Pistolenlauf)',
    secondary: 'Sehne / Schaft / Horn (z. B. Bogensehne, Gewehrschaft, Kriegshornhorn)',
    modifier: 'Attribut-Inschrift (Bronze, Eisen, Stahl, Dunkelstahl, Mithril, Orikalkum)',
    tip: 'Bögen und Schusswaffen teilen sich dieselben Inschriften – stelle jeweils Sehne + Stab her und entdecke jede Variante.',
  },
  Artificer: {
    formula: '1× Stab-/Zepterkopf/Kern + 1× Schaft/Hülle + 1× Inschrift = Magiewaffe / Trank',
    primary: 'Magiekopf / Kern (z. B. Stabkopf, Zepterkopf, Fokus-Kern, Dreizackkopf)',
    secondary: 'Schaft / Hülle (z. B. Stabschaft, Zepterstab, Fokus-Hülle, Dreizackschaft)',
    modifier: 'Attribut-Inschrift oder Trank-Zutaten (z. B. Wasser + Staub + Giftbeutel)',
    tip: 'Tränke und magische Waffen bieten zusammen das breiteste Spektrum an kostengünstigen Erstentdeckungen.',
  },
  Armorsmith: {
    formula: '1× Rüstungspolsterung + 1× Kettenleiste/Blende + 1× Insignie = Schwere Rüstung',
    primary: 'Polsterung / Futter (z. B. Stiefelpolsterung, Helm-Polsterung, Handschuh-Polsterung)',
    secondary: 'Blende / Panzer (z. B. Stiefelblende, Helmvisier, Handschuhblende)',
    modifier: 'Attribut-Insignie (Jute, Wolle, Baumwolle, Leinen, Seide, Gaze)',
    tip: 'Kombiniere jede der 6 Rüstungsteile mit den jeweiligen Insignien der Stufe für bis zu 3x EP pro Entdeckung.',
  },
  Leatherworker: {
    formula: '1× Lederpolsterung + 1× Lederblende/Riemen + 1× Insignie = Mittlere Rüstung',
    primary: 'Lederpolsterung (z. B. Stiefelpolsterung, Wams-Polsterung, Hosen-Polsterung)',
    secondary: 'Lederblende / Riemen (z. B. Stiefelblende, Wams-Zuschnitt, Hosenriemen)',
    modifier: 'Attribut-Insignie (Jute, Wolle, Baumwolle, Leinen, Seide, Gaze)',
    tip: 'Mittlere Rüstung nutzt Rohleder- und Stoff-Insignien. Entdeckungen sparen massiv Leder-Zwischenprodukte.',
  },
  Tailor: {
    formula: '1× Stoffpolsterung + 1× Stoffblende/Band + 1× Insignie = Leichte Rüstung / Tasche',
    primary: 'Polsterung / Futter (z. B. Schuh-Polsterung, Wams-Polsterung, Handschuh-Polsterung)',
    secondary: 'Blende / Band (z. B. Schuhband, Wams-Aufsatz, Handschuhstoff)',
    modifier: 'Attribut-Insignie (Jute, Wolle, Baumwolle, Leinen, Seide, Gaze)',
    tip: 'Taschen (z. B. 8-Platz, 10-Platz) und Rüstungsteile mit Insignien bieten die höchsten EP-Schübe beim Schneidern.',
  },
  Jeweler: {
    formula: '1× Fassung + 1× Schmuckbasis (Reif/Haken/Kette) + 1× Edelstein/Filigran = Schmuck',
    primary: 'Metallfassung (Bronze-, Silber-, Gold-, Platin-, Mithril-, Orikalkum-Fassung)',
    secondary: 'Schmuckbasis (Reif für Ringe, Haken für Ohrringe, Kette für Amulette)',
    modifier: 'Edelstein / Filigran (Granat, Malachit, Türkis, Amethyst, Karneol, Rubin, Saphir, etc.)',
    tip: 'Aus 1 Fassung + 1 Reif + 1 Juwel entsteht sofort ein Ring! Für jede Stufe gibt es 7–8 verschiedene Edelsteine.',
  },
  Chef: {
    formula: '2 bis 4 Grundzutaten (z. B. Teige + Soßen + Kräuter + Füllungen) = Mahlzeit',
    primary: 'Basis (z. B. Brot, Teig, Nudeln, Brühe, Reis)',
    secondary: 'Hauptzutat (z. B. Fleisch, Geflügel, Gemüse, Obst)',
    modifier: 'Verfeinerung (z. B. Gewürze, Kräuter, Soßen, Dressings)',
    tip: 'Kochen basiert fast vollständig auf Entdeckungen! Entdecke neue Rezepte für extrem schnelles Leveln.',
  },
};

export const RARITY_EN: Record<Rarity, string> = {
  Junk: 'Junk',
  Basic: 'Basic',
  Fine: 'Fine',
  Masterwork: 'Masterwork',
  Rare: 'Rare',
  Exotic: 'Exotic',
  Ascended: 'Ascended',
  Legendary: 'Legendary',
};

export const ITEM_TYPE_EN: Record<string, string> = {
  Armor: 'Armor',
  Back: 'Back item',
  Bag: 'Bag',
  Consumable: 'Consumable',
  Container: 'Container',
  CraftingMaterial: 'Crafting Material',
  Gathering: 'Gathering Tool',
  Gizmo: 'Gizmo',
  Key: 'Key',
  MiniPet: 'Miniature',
  Relic: 'Relic',
  Tool: 'Tool',
  Trinket: 'Trinket',
  Trophy: 'Trophy',
  UpgradeComponent: 'Upgrade Component',
  Weapon: 'Weapon',
  PowerCore: 'Power Core',
  JadeTechModule: 'Jade Tech Module',
};

export const DISCIPLINE_EN: Record<DisciplineId, string> = {
  Armorsmith: 'Armorsmith',
  Weaponsmith: 'Weaponsmith',
  Artificer: 'Artificer',
  Jeweler: 'Jeweler',
  Leatherworker: 'Leatherworker',
  Tailor: 'Tailor',
  Chef: 'Chef',
  Huntsman: 'Huntsman',
};

export const RECIPE_TYPE_EN: Record<string, string> = {
  Sword: 'Sword',
  Axe: 'Axe',
  Dagger: 'Dagger',
  Greatsword: 'Greatsword',
  Hammer: 'Hammer',
  Mace: 'Mace',
  Shield: 'Shield',
  Staff: 'Staff',
  Trident: 'Trident',
  Scepter: 'Scepter',
  Focus: 'Focus',
  Rifle: 'Rifle',
  Warhorn: 'Warhorn',
  LongBow: 'Longbow',
  ShortBow: 'Shortbow',
  Torch: 'Torch',
  Speargun: 'Speargun',
  Harpoon: 'Harpoon',
  Pistol: 'Pistol',
  Helm: 'Helm',
  Shoulders: 'Shoulders',
  Coat: 'Coat',
  Gloves: 'Gloves',
  Leggings: 'Leggings',
  Boots: 'Boots',
  Amulet: 'Amulet',
  Ring: 'Ring',
  Earring: 'Earring',
  Meal: 'Meal',
  Soup: 'Soup',
  Dessert: 'Dessert',
  Snack: 'Snack',
  Feast: 'Feast',
  Potion: 'Potion',
  Consumable: 'Consumable',
  Bag: 'Bag',
  Refinement: 'Refinement',
  Component: 'Component',
  Insignia: 'Insignia',
  Inscription: 'Inscription',
  UpgradeComponent: 'Upgrade Component',
};

export const CRAFTING_TIERS_EN: CraftingTier[] = [
  { id: 'all', label: 'All Tiers (Rank 0–500)', shortLabel: 'All', minRating: 0, maxRating: 500, materials: 'All Materials' },
  { id: 't1', label: 'Tier 1 (Rank 0–74)', shortLabel: 'T1 (0–74)', minRating: 0, maxRating: 74, materials: 'Bronze / Jute / Rawhide / Copper' },
  { id: 't2', label: 'Tier 2 (Rank 75–149)', shortLabel: 'T2 (75–149)', minRating: 75, maxRating: 149, materials: 'Iron / Wool / Thin Leather / Silver' },
  { id: 't3', label: 'Tier 3 (Rank 150–224)', shortLabel: 'T3 (150–224)', minRating: 150, maxRating: 224, materials: 'Steel / Cotton / Coarse Leather / Gold' },
  { id: 't4', label: 'Tier 4 (Rank 225–299)', shortLabel: 'T4 (225–299)', minRating: 225, maxRating: 299, materials: 'Darksteel / Linen / Rugged Leather / Platinum' },
  { id: 't5', label: 'Tier 5 (Rank 300–399)', shortLabel: 'T5 (300–399)', minRating: 300, maxRating: 399, materials: 'Mithril / Silk / Thick Leather / Mithril' },
  { id: 't6', label: 'Tier 6 (Rank 400–500)', shortLabel: 'T6 (400–500)', minRating: 400, maxRating: 500, materials: 'Orichalcum / Gossamer / Hardened Leather / Orichalcum' },
];

export const DISCOVERY_GUIDES_EN: Record<DisciplineId, DiscoveryGuideInfo> = {
  Weaponsmith: {
    formula: '1× Weapon Blade/Head + 1× Weapon Hilt/Shaft + 1× Inscription = Weapon',
    primary: 'Blade / Head (e.g. Sword Blade, Axe Blade, Mace Head)',
    secondary: 'Hilt / Handle / Shaft (e.g. Sword Hilt, Axe Haft, Mace Handle)',
    modifier: 'Attribute Inscription (Bronze, Iron, Steel, Darksteel, Mithril, Orichalcum)',
    tip: 'Combine the same blade + hilt with different inscriptions for every weapon type to get maximum discovery XP!',
  },
  Huntsman: {
    formula: '1× Stave/Barrel/Shaft + 1× String/Stock/Horn + 1× Inscription = Ranged Weapon',
    primary: 'Stave / Barrel / Mouthpiece (e.g. Bow Stave, Rifle Barrel, Pistol Barrel)',
    secondary: 'String / Stock / Horn (e.g. Bowstring, Rifle Stock, Warhorn Horn)',
    modifier: 'Attribute Inscription (Bronze, Iron, Steel, Darksteel, Mithril, Orichalcum)',
    tip: 'Bows and firearms share inscriptions – craft strings + staves and discover every stat variation.',
  },
  Artificer: {
    formula: '1× Head/Core + 1× Shaft/Casing + 1× Inscription = Magic Weapon / Potion',
    primary: 'Magic Head / Core (e.g. Staff Head, Scepter Core, Focus Core, Trident Head)',
    secondary: 'Shaft / Casing (e.g. Staff Shaft, Scepter Rod, Focus Casing, Trident Shaft)',
    modifier: 'Attribute Inscription or Potion Ingredients (e.g. Water + Dust + Venom Sac)',
    tip: 'Potions and magical weapons combined offer the widest selection of low-cost discoveries.',
  },
  Armorsmith: {
    formula: '1× Armor Padding + 1× Armor Panel/Chain + 1× Insignia = Heavy Armor',
    primary: 'Padding / Lining (e.g. Boot Lining, Helm Lining, Gauntlet Lining)',
    secondary: 'Panel / Casing (e.g. Boot Panel, Helm Visor, Gauntlet Plate)',
    modifier: 'Attribute Insignia (Jute, Wool, Cotton, Linen, Silk, Gossamer)',
    tip: 'Combine each of the 6 armor pieces with tier insignias for up to 3x XP per discovery.',
  },
  Leatherworker: {
    formula: '1× Leather Padding + 1× Leather Panel/Strap + 1× Insignia = Medium Armor',
    primary: 'Leather Padding (e.g. Boot Lining, Mask Padding, Leggings Padding)',
    secondary: 'Leather Panel / Strap (e.g. Boot Panel, Mask Strap, Leggings Panel)',
    modifier: 'Attribute Insignia (Jute, Wool, Cotton, Linen, Silk, Gossamer)',
    tip: 'Medium armor uses leather and cloth insignias. Discoveries save massive amounts of leather.',
  },
  Tailor: {
    formula: '1× Cloth Padding + 1× Cloth Panel/Strap + 1× Insignia = Light Armor / Bag',
    primary: 'Padding / Lining (e.g. Footwear Lining, Mask Padding, Wrist Lining)',
    secondary: 'Panel / Strap (e.g. Footwear Strap, Mask Strap, Wrist Casing)',
    modifier: 'Attribute Insignia (Jute, Wool, Cotton, Linen, Silk, Gossamer)',
    tip: 'Bags (e.g. 8-slot, 10-slot) and armor pieces with insignias give the highest XP jumps in tailoring.',
  },
  Jeweler: {
    formula: '1× Setting + 1× Jewelry Base (Band/Hook/Chain) + 1× Gemstone/Filigree = Trinket',
    primary: 'Metal Setting (Bronze, Silver, Gold, Platinum, Mithril, Orichalcum Setting)',
    secondary: 'Jewelry Base (Band for Rings, Hook for Earrings, Chain for Amulets)',
    modifier: 'Gemstone / Filigree (Garnet, Malachite, Turquoise, Amethyst, Carnelian, Ruby, Sapphire, etc.)',
    tip: '1 Setting + 1 Band + 1 Gem creates a ring! Each tier has 7–8 different cut gemstones to discover.',
  },
  Chef: {
    formula: '2 to 4 Cooking Ingredients (e.g. Dough + Sauce + Herbs + Fillings) = Food',
    primary: 'Base (e.g. Bread, Dough, Pasta, Stock, Rice)',
    secondary: 'Main Ingredient (e.g. Meat, Poultry, Vegetables, Fruit)',
    modifier: 'Refinement (e.g. Seasonings, Herbs, Sauces, Dressings)',
    tip: 'Cooking relies almost entirely on discoveries! Discovering new meals gives lightning-fast leveling.',
  },
};

export function getDisciplineName(id: DisciplineId, lang: 'de' | 'en' = 'de'): string {
  return lang === 'en' ? DISCIPLINE_EN[id] || id : DISCIPLINE_DE[id] || id;
}

export function getRarityName(rarity: Rarity, lang: 'de' | 'en' = 'de'): string {
  return lang === 'en' ? RARITY_EN[rarity] || rarity : RARITY_DE[rarity] || rarity;
}

export function getItemTypeName(type: string, lang: 'de' | 'en' = 'de'): string {
  return lang === 'en' ? ITEM_TYPE_EN[type] || type : ITEM_TYPE_DE[type] || type;
}

export function getRecipeTypeName(type: string | undefined, lang: 'de' | 'en' = 'de'): string {
  if (!type) return '';
  return lang === 'en' ? RECIPE_TYPE_EN[type] || type : RECIPE_TYPE_DE[type] || type;
}

export function getCraftingTiers(lang: 'de' | 'en' = 'de'): CraftingTier[] {
  return lang === 'en' ? CRAFTING_TIERS_EN : CRAFTING_TIERS;
}

export function getDiscoveryGuide(id: DisciplineId, lang: 'de' | 'en' = 'de'): DiscoveryGuideInfo {
  return lang === 'en' ? DISCOVERY_GUIDES_EN[id] || DISCOVERY_GUIDES[id] : DISCOVERY_GUIDES[id];
}

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('de-DE');
export const fmtQty = (n: number): string =>
  Number.isInteger(n) ? fmtInt(n) : n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
export const pct = (f: number): string => `${Math.floor(Math.max(0, Math.min(1, f)) * 100 + 1e-9)} %`;

export function relTime(ts: number, lang: 'de' | 'en' = 'de'): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (lang === 'en') {
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} days ago`;
  }
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return `vor ${Math.floor(s / 86400)} Tg.`;
}
