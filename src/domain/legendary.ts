/**
 * Legendäre Waffen: Modell auf Basis des vendorten Community-Datensatzes (Mystische-Schmiede-Rezepte)
 * plus offizieller Item-Daten (Waffentyp wird zur Laufzeit aus /v2/items übernommen).
 */
import type { GameItem, Recipe } from './types.ts';
import type { RecipeProvider } from './recipeTree.ts';

export interface CommunityDataset {
  meta: {
    source: string;
    license: string;
    commit: string;
    commitDate: string;
    syncedAt: string;
    note: string;
  };
  weapons: { id: number; name: string; type: string; gen: number }[];
  recipes: {
    out: number;
    n: number;
    type: string;
    ing: [number, number][];
    cur?: [number | null, number, string][];
    disc?: string[];
    rating?: number;
    vendor?: string;
  }[];
  items: Record<string, { tags: string[] }>;
}

/**
 * Erwarteter Erfolgsanteil bekannter Zufallsrezepte der Mystischen Schmiede.
 * Quelle: Community-Schätzung (nicht offiziell, nicht per API prüfbar) -> in der UI als Schätzung markiert.
 * Betrifft nur das 10er-Rezept für Mystische Kleeblätter (Ausgabe 10 bei Erfolg).
 */
export const RANDOM_RECIPE_YIELD: Record<number, { yield: number; note: string; noteEn?: string }> = {
  19675: {
    yield: 0.31,
    note: 'Mystische Kleeblätter: Zufallsrezept, Erfolgsquote laut Community ca. 31 % (Schätzung, schwankt).',
    noteEn: 'Mystic Clovers: RNG recipe, average success rate ~31% according to community data (estimate, fluctuates).',
  },
};

export type WeaponSlot = 'oneHand' | 'twoHand' | 'offHand' | 'aquatic';

export const SLOT_LABEL: Record<WeaponSlot, string> = {
  oneHand: 'Einhandwaffen',
  twoHand: 'Zweihandwaffen',
  offHand: 'Nebenhandwaffen',
  aquatic: 'Unterwasserwaffen',
};

export const SLOT_LABEL_EN: Record<WeaponSlot, string> = {
  oneHand: 'One-Handed',
  twoHand: 'Two-Handed',
  offHand: 'Off-Hand',
  aquatic: 'Aquatic',
};

export function getSlotLabel(slot: WeaponSlot, lang: string = 'en'): string {
  return lang === 'de' ? SLOT_LABEL[slot] : SLOT_LABEL_EN[slot];
}

const SLOT_BY_TYPE: Record<string, WeaponSlot> = {
  Axe: 'oneHand',
  Dagger: 'oneHand',
  Mace: 'oneHand',
  Pistol: 'oneHand',
  Scepter: 'oneHand',
  Sword: 'oneHand',
  Focus: 'offHand',
  Shield: 'offHand',
  Torch: 'offHand',
  Warhorn: 'offHand',
  Greatsword: 'twoHand',
  Hammer: 'twoHand',
  LongBow: 'twoHand',
  Longbow: 'twoHand',
  Rifle: 'twoHand',
  ShortBow: 'twoHand',
  Shortbow: 'twoHand',
  Staff: 'twoHand',
  Spear: 'twoHand',
  Harpoon: 'aquatic',
  Speargun: 'aquatic',
  Trident: 'aquatic',
};

export const WEAPON_TYPE_DE: Record<string, string> = {
  Axe: 'Axt',
  Dagger: 'Dolch',
  Mace: 'Streitkolben',
  Pistol: 'Pistole',
  Scepter: 'Zepter',
  Sword: 'Schwert',
  Focus: 'Fokus',
  Shield: 'Schild',
  Torch: 'Fackel',
  Warhorn: 'Kriegshorn',
  Greatsword: 'Großschwert',
  Hammer: 'Hammer',
  LongBow: 'Langbogen',
  Longbow: 'Langbogen',
  Rifle: 'Gewehr',
  ShortBow: 'Kurzbogen',
  Shortbow: 'Kurzbogen',
  Staff: 'Stab',
  Spear: 'Speer',
  Harpoon: 'Harpune',
  Speargun: 'Harpunengewehr',
  Trident: 'Dreizack',
};

/** Die Generationsnummern des Datensatzes sind interne Gruppen; hier die Anzeigenamen. */
export const GENERATION_LABEL: Record<number, { short: string; long: string; shortEn: string; longEn: string }> = {
  1: {
    short: 'Generation 1',
    long: 'Generation 1 – Ursprüngliche Legendäre',
    shortEn: 'Generation 1',
    longEn: 'Generation 1 – Core Tyria',
  },
  2: {
    short: 'Generation 2',
    long: 'Generation 2 – Erweiterungs-Legendäre',
    shortEn: 'Generation 2',
    longEn: 'Generation 2 – Heart of Thorns & Path of Fire',
  },
  3: {
    short: 'Generation 3',
    long: 'Generation 3 – Aurenes Waffen',
    shortEn: 'Generation 3',
    longEn: "Generation 3 – Aurene's Variants",
  },
  15: {
    short: 'Generation 4',
    long: 'Generation 4 – Neueste Waffen (Speere u. a.)',
    shortEn: 'Generation 4',
    longEn: 'Generation 4 – Janthir Wilds',
  },
  0: {
    short: 'Unbekannt',
    long: 'Nicht im Datensatz (Generation unbekannt)',
    shortEn: 'Unknown',
    longEn: 'Not in dataset (Generation unknown)',
  },
};

export function getGenerationLabel(gen: number, lang: string = 'en'): { short: string; long: string } {
  const info = GENERATION_LABEL[gen] ?? {
    short: `Gen ${gen}`,
    long: `Generation ${gen}`,
    shortEn: `Gen ${gen}`,
    longEn: `Generation ${gen}`,
  };
  return {
    short: lang === 'de' ? info.short : info.shortEn,
    long: lang === 'de' ? info.long : info.longEn,
  };
}

export function slotOf(weaponType: string | undefined): WeaponSlot | undefined {
  return weaponType ? SLOT_BY_TYPE[weaponType] : undefined;
}

export interface LegendaryWeapon {
  id: number;
  nameEn: string;
  type: string;
  generation: number;
  /** false = offiziell vorhanden, aber ohne Rezept im Datensatz */
  hasRecipe: boolean;
}

export interface LegendaryModel extends RecipeProvider {
  weapons: LegendaryWeapon[];
  tags(itemId: number): string[];
  vendorRecipeFor(itemId: number): Recipe | undefined;
  /** Alle Item-IDs, die in Rezeptbäumen des Datensatzes vorkommen */
  allItemIds(): number[];
  meta: CommunityDataset['meta'];
}

export function createLegendaryModel(
  data: CommunityDataset,
  extraOfficialWeapons: { id: number; name: string; type: string }[] = [],
): LegendaryModel {
  const byOut = new Map<number, Recipe>();
  const vendorByOut = new Map<number, Recipe>();
  data.recipes.forEach((r, idx) => {
    const kind = r.type === 'mf' ? 'mf' : r.type === 'craft' ? 'craft' : 'vendor';
    const rand = RANDOM_RECIPE_YIELD[r.out];
    const recipe: Recipe = {
      id: `c${idx}`,
      outputId: r.out,
      outputCount: r.n,
      kind,
      disciplines: r.disc ?? [],
      rating: r.rating ?? 0,
      ingredients: r.ing.map(([itemId, count]) => ({ itemId, count })),
      yield: kind === 'mf' && rand && r.n > 1 ? rand.yield : undefined,
      vendor: r.vendor,
      source: 'community',
    };
    if (kind === 'vendor') {
      vendorByOut.set(r.out, recipe);
      // Vendor-Rezepte wirken wie normale Rezepte, falls kein anderes existiert
      if (!byOut.has(r.out)) byOut.set(r.out, recipe);
    } else byOut.set(r.out, recipe);
  });

  const known = new Set(data.weapons.map((w) => w.id));
  const weapons: LegendaryWeapon[] = data.weapons.map((w) => ({
    id: w.id,
    nameEn: w.name,
    type: w.type,
    generation: w.gen,
    hasRecipe: byOut.has(w.id),
  }));
  for (const e of extraOfficialWeapons) {
    if (known.has(e.id)) continue;
    weapons.push({ id: e.id, nameEn: e.name, type: e.type, generation: 0, hasRecipe: false });
  }

  const allIds = new Set<number>(Object.keys(data.items).map(Number));
  data.recipes.forEach((r) => {
    allIds.add(r.out);
    r.ing.forEach(([id]) => allIds.add(id));
  });

  return {
    weapons,
    meta: data.meta,
    recipeFor: (id) => byOut.get(id),
    vendorRecipeFor: (id) => vendorByOut.get(id),
    tags: (id) => data.items[String(id)]?.tags ?? [],
    allItemIds: () => [...allIds],
  };
}

export function weaponSlot(w: LegendaryWeapon, item: GameItem | undefined): WeaponSlot | undefined {
  return slotOf(item?.weaponType) ?? slotOf(w.type);
}

/** Ermittelt die Namensbasis für Sammlungs-Erfolge ("Sunrise I: …") */
export function collectionMatches(weaponNameEn: string, achievementNameEn: string): boolean {
  const base = weaponNameEn.toLowerCase();
  const n = achievementNameEn.toLowerCase();
  return n.startsWith(base + ' i:') || n.startsWith(base + ' ii:') || n.startsWith(base + ' iii:') || n.startsWith(base + ' iv:');
}
