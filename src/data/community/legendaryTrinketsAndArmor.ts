/**
 * Additional Legendary Items (Trinkets, Rings, Amulets, Backpacks, Relic, and Armor).
 * Extends the community legendary weapons catalog so players can track their entire Legendary Armory.
 */

export interface ExtraLegendaryItem {
  id: number;
  name: string;
  type: string;
  gen: number;
  category: 'trinket' | 'back' | 'relic' | 'armor';
  slot: 'ring' | 'accessory' | 'amulet' | 'back' | 'relic' | 'armorHeavy' | 'armorMedium' | 'armorLight';
}

export interface ExtraLegendaryRecipe {
  out: number;
  n: number;
  type: string;
  ing: [number, number][];
  disc?: string[];
  rating?: number;
}

export const EXTRA_LEGENDARY_ITEMS: ExtraLegendaryItem[] = [
  // --- RINGS ---
  {
    id: 91234,
    name: 'Coalescence',
    type: 'Ring',
    gen: 2,
    category: 'trinket',
    slot: 'ring',
  },
  {
    id: 92991,
    name: 'Conflux',
    type: 'Ring',
    gen: 2,
    category: 'trinket',
    slot: 'ring',
  },

  // --- ACCESSORIES ---
  {
    id: 81908,
    name: 'Aurora',
    type: 'Accessory',
    gen: 2,
    category: 'trinket',
    slot: 'accessory',
  },
  {
    id: 91048,
    name: 'Vision',
    type: 'Accessory',
    gen: 2,
    category: 'trinket',
    slot: 'accessory',
  },

  // --- AMULETS ---
  {
    id: 95380,
    name: "Prismatic Champion's Regalia",
    type: 'Amulet',
    gen: 3,
    category: 'trinket',
    slot: 'amulet',
  },
  {
    id: 92437,
    name: 'Transcendence',
    type: 'Amulet',
    gen: 2,
    category: 'trinket',
    slot: 'amulet',
  },

  // --- BACKPACKS ---
  {
    id: 79590,
    name: 'Ad Infinitum',
    type: 'Back',
    gen: 2,
    category: 'back',
    slot: 'back',
  },
  {
    id: 77705,
    name: 'The Ascension',
    type: 'Back',
    gen: 2,
    category: 'back',
    slot: 'back',
  },
  {
    id: 81706,
    name: 'Warbringer',
    type: 'Back',
    gen: 2,
    category: 'back',
    slot: 'back',
  },

  // --- RELIC ---
  {
    id: 101582,
    name: 'Legendary Relic',
    type: 'Relic',
    gen: 15,
    category: 'relic',
    slot: 'relic',
  },

  // --- OBSIDIAN ARMOR (Heavy) ---
  { id: 101755, name: 'Obsidian Heavy Helm', type: 'Heavy Helm', gen: 15, category: 'armor', slot: 'armorHeavy' },
  { id: 101662, name: 'Obsidian Heavy Pauldrons', type: 'Heavy Shoulders', gen: 15, category: 'armor', slot: 'armorHeavy' },
  { id: 101878, name: 'Obsidian Heavy Breastplate', type: 'Heavy Coat', gen: 15, category: 'armor', slot: 'armorHeavy' },
  { id: 101666, name: 'Obsidian Heavy Gauntlets', type: 'Heavy Gloves', gen: 15, category: 'armor', slot: 'armorHeavy' },
  { id: 101740, name: 'Obsidian Heavy Cuisses', type: 'Heavy Leggings', gen: 15, category: 'armor', slot: 'armorHeavy' },
  { id: 101874, name: 'Obsidian Heavy Greaves', type: 'Heavy Boots', gen: 15, category: 'armor', slot: 'armorHeavy' },

  // --- OBSIDIAN ARMOR (Medium) ---
  { id: 101700, name: 'Obsidian Medium Cowl', type: 'Medium Helm', gen: 15, category: 'armor', slot: 'armorMedium' },
  { id: 101693, name: 'Obsidian Medium Shoulderguards', type: 'Medium Shoulders', gen: 15, category: 'armor', slot: 'armorMedium' },
  { id: 101799, name: 'Obsidian Medium Jerkin', type: 'Medium Coat', gen: 15, category: 'armor', slot: 'armorMedium' },
  { id: 101859, name: 'Obsidian Medium Gloves', type: 'Medium Gloves', gen: 15, category: 'armor', slot: 'armorMedium' },
  { id: 101830, name: 'Obsidian Medium Leggings', type: 'Medium Leggings', gen: 15, category: 'armor', slot: 'armorMedium' },
  { id: 101758, name: 'Obsidian Medium Boots', type: 'Medium Boots', gen: 15, category: 'armor', slot: 'armorMedium' },

  // --- OBSIDIAN ARMOR (Light) ---
  { id: 101786, name: 'Obsidian Light Hood', type: 'Light Helm', gen: 15, category: 'armor', slot: 'armorLight' },
  { id: 101783, name: 'Obsidian Light Mantle', type: 'Light Shoulders', gen: 15, category: 'armor', slot: 'armorLight' },
  { id: 101844, name: 'Obsidian Light Vestments', type: 'Light Coat', gen: 15, category: 'armor', slot: 'armorLight' },
  { id: 101782, name: 'Obsidian Light Gloves', type: 'Light Gloves', gen: 15, category: 'armor', slot: 'armorLight' },
  { id: 101873, name: 'Obsidian Light Pants', type: 'Light Leggings', gen: 15, category: 'armor', slot: 'armorLight' },
  { id: 101884, name: 'Obsidian Light Shoes', type: 'Light Boots', gen: 15, category: 'armor', slot: 'armorLight' },

  // --- PERFECTED ENVOY ARMOR (Raid Heavy) ---
  { id: 80384, name: 'Perfected Envoy Helm (Heavy)', type: 'Heavy Helm', gen: 2, category: 'armor', slot: 'armorHeavy' },
  { id: 80248, name: 'Perfected Envoy Pauldrons', type: 'Heavy Shoulders', gen: 2, category: 'armor', slot: 'armorHeavy' },
  { id: 80145, name: 'Perfected Envoy Breastplate', type: 'Heavy Coat', gen: 2, category: 'armor', slot: 'armorHeavy' },
  { id: 80190, name: 'Perfected Envoy Gauntlets', type: 'Heavy Gloves', gen: 2, category: 'armor', slot: 'armorHeavy' },
  { id: 80111, name: 'Perfected Envoy Tassets', type: 'Heavy Leggings', gen: 2, category: 'armor', slot: 'armorHeavy' },
  { id: 80356, name: 'Perfected Envoy Greaves', type: 'Heavy Boots', gen: 2, category: 'armor', slot: 'armorHeavy' },

  // --- PERFECTED ENVOY ARMOR (Raid Medium) ---
  { id: 80252, name: 'Perfected Envoy Cap', type: 'Medium Helm', gen: 2, category: 'armor', slot: 'armorMedium' },
  { id: 80281, name: 'Perfected Envoy Shoulderpads', type: 'Medium Shoulders', gen: 2, category: 'armor', slot: 'armorMedium' },
  { id: 80399, name: 'Perfected Envoy Jerkin', type: 'Medium Coat', gen: 2, category: 'armor', slot: 'armorMedium' },
  { id: 80435, name: 'Perfected Envoy Vambraces', type: 'Medium Gloves', gen: 2, category: 'armor', slot: 'armorMedium' },
  { id: 80161, name: 'Perfected Envoy Leggings', type: 'Medium Leggings', gen: 2, category: 'armor', slot: 'armorMedium' },
  { id: 80296, name: 'Perfected Envoy Boots', type: 'Medium Boots', gen: 2, category: 'armor', slot: 'armorMedium' },

  // --- PERFECTED ENVOY ARMOR (Raid Light) ---
  { id: 80277, name: 'Perfected Envoy Cowl', type: 'Light Helm', gen: 2, category: 'armor', slot: 'armorLight' },
  { id: 80557, name: 'Perfected Envoy Mantle', type: 'Light Shoulders', gen: 2, category: 'armor', slot: 'armorLight' },
  { id: 80490, name: 'Perfected Envoy Vestments', type: 'Light Coat', gen: 2, category: 'armor', slot: 'armorLight' },
  { id: 80392, name: 'Perfected Envoy Gloves', type: 'Light Gloves', gen: 2, category: 'armor', slot: 'armorLight' },
  { id: 80340, name: 'Perfected Envoy Pants', type: 'Light Leggings', gen: 2, category: 'armor', slot: 'armorLight' },
  { id: 80131, name: 'Perfected Envoy Shoes', type: 'Light Boots', gen: 2, category: 'armor', slot: 'armorLight' },
];

export const EXTRA_LEGENDARY_RECIPES: ExtraLegendaryRecipe[] = [
  // Coalescence (91234)
  {
    out: 91234,
    n: 1,
    type: 'mf',
    ing: [
      [81743, 1], // Gift of the Mists
      [88165, 1], // Gift of Dedication
      [88373, 1], // Compendium of Knowledge
      [91225, 1], // Haphshepsut
    ],
  },
  // Conflux (92991)
  {
    out: 92991,
    n: 1,
    type: 'mf',
    ing: [
      [81743, 1], // Gift of the Mists
      [92965, 1], // Gift of Conflux
      [92978, 1], // War Band
      [92942, 1], // Slumbering Conflux
    ],
  },
  // Aurora (81908)
  {
    out: 81908,
    n: 1,
    type: 'mf',
    ing: [
      [81775, 1], // Spark of Sentience
      [82156, 1], // Gift of Sentience
      [81743, 1], // Gift of the Mists
      [81889, 1], // Ibach's Claw
    ],
  },
  // Vision (91048)
  {
    out: 91048,
    n: 1,
    type: 'mf',
    ing: [
      [91024, 1], // Trifle of Sentience
      [91016, 1], // Gift of Prescience
      [81743, 1], // Gift of the Mists
      [91042, 1], // Visions of Istan
    ],
  },
  // Transcendence (92437)
  {
    out: 92437,
    n: 1,
    type: 'mf',
    ing: [
      [81743, 1], // Gift of the Mists
      [92408, 1], // Gift of Transcendence
      [92440, 1], // Mist Pendant
      [92430, 1], // Star of Glory
    ],
  },
  // Ad Infinitum (79590)
  {
    out: 79590,
    n: 1,
    type: 'mf',
    ing: [
      [79538, 1], // Upper Bound
      [79549, 1], // Gift of Infinity
      [81743, 1], // Gift of the Mists
      [79524, 1], // Gift of Ascension
    ],
  },
  // The Ascension (77705)
  {
    out: 77705,
    n: 1,
    type: 'mf',
    ing: [
      [77678, 1], // Wings of Ascension
      [77665, 1], // Gift of the Competitor
      [81743, 1], // Gift of the Mists
      [77690, 1], // Gift of Skirmishing
    ],
  },
  // Warbringer (81706)
  {
    out: 81706,
    n: 1,
    type: 'mf',
    ing: [
      [81710, 1], // Commander's Compendium
      [81718, 1], // Gift of War
      [81743, 1], // Gift of the Mists
      [81730, 1], // Record of the Siege
    ],
  },
  // Legendary Relic (101582)
  {
    out: 101582,
    n: 1,
    type: 'mf',
    ing: [
      [71820, 1],  // Mystic Tribute
      [101633, 1], // Gift of Relics
      [81743, 1],  // Gift of the Mists
      [101612, 1], // Concentrated Relic Essence
    ],
  },
  // Gift of the Mists shared component (81743)
  {
    out: 81743,
    n: 1,
    type: 'mf',
    ing: [
      [79418, 1], // Gift of Glory
      [19678, 1], // Gift of Battle
      [81718, 1], // Gift of War
      [79445, 1], // Cube of Annihilation
    ],
  },
];

