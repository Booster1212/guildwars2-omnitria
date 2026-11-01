/**
 * GW2Crafts Reference Engine & Benchmark Comparison (Omnitria v0.3.0).
 *
 * Reference: https://gw2crafts.net/ (guide generator by xanthic.9478, source: github.com/xanthics/gw2craft).
 *
 * What this module does:
 * 1. Bundles offline snapshot structures and blueprints of the community-proven GW2Crafts routes.
 * 2. Dynamically re-prices the benchmark routes at current Trading Post prices (and NPC vendor prices).
 * 3. Compares Omnitria's planned routes against the GW2Crafts benchmark (costs, discoveries, crafts).
 * 4. Highlights differences transparently (account inventory utilization, Master Craftsman savings, resale deductions).
 *
 * Local-First & Independent:
 * GW2Crafts is an optional reference benchmark. The app never makes mandatory runtime calls to gw2crafts.net.
 */
import type { DisciplineId, PriceInfo, Recipe } from './types.ts';
import { unitPrice } from './costs.ts';
import { GW2CRAFTS_GUIDES, GW2CRAFTS_SNAPSHOT_DATE } from '../data/crafting/gw2craftsSnapshot.ts';

export type GuideVariant = 'normal' | 'fast' | 'f2p';

export interface GuideDiscovery {
  outputItemId: number;
  recipeId: number | null;
  ingredients: { itemId: number; count: number }[];
}

export interface GuideBlock {
  level: number;
  makes: { itemId: number; qty: number }[];
  discoveries: GuideDiscovery[];
}

export interface Gw2CraftsGuideSnapshot {
  guideId: string;
  url: string;
  discipline: DisciplineId;
  variant: GuideVariant;
  fromRank: number;
  toRank: number;
  guideUpdatedAt: string | null;
  reportedInitialCopper: number;
  reportedRecoveryCopper: number;
  reportedFinalCopper: number;
  blocks: GuideBlock[];
  shopping: {
    itemId: number;
    need: number;
    section: 'vendor' | 'collectible' | 'mixed' | 'recipes';
    listedUnitCopper: number;
    karmaBulk?: number;
  }[];
  recipePurchases: { sheetItemId: number; costKarma: number; costCopper: number }[];
}

export interface BenchmarkMaterial {
  itemId: number;
  qty: number;
  unitCost: number | null;
  totalCost: number | null;
}

export interface BenchmarkTier {
  level: number;
  discoveries: number;
  makeCrafts: number;
  costCopper: number;
}

export type BenchmarkUnavailableReason =
  | 'no_guide_for_range'
  | 'discipline_max_rank'
  | 'cooking_quest_range'
  | 'guide_not_published';

export interface Gw2CraftsBenchmark {
  discipline: DisciplineId;
  fromRank: number;
  toRank: number;
  guideType: 'normal' | 'fast';
  variant: Exclude<GuideVariant, 'f2p'>;
  status: 'ok' | 'partial' | 'unavailable';
  unavailableReason?: BenchmarkUnavailableReason;
  estimatedCostCopper: number;
  costCopper: number;
  estimatedStepsCount: number;
  estimatedCraftRuns: number;
  referenceUrl: string;
  tierBreakdown: {
    tierNumber: number;
    range: string;
    descriptionDe: string;
    descriptionEn: string;
    estimatedCostCopper: number;
  }[];
  guideIds: string[];
  urls: string[];
  snapshotDate: string;
  guideUpdatedAt: string | null;
  coveredFromRank: number;
  coveredToRank: number;
  materials: BenchmarkMaterial[];
  unpricedItemIds: number[];
  discoveryRecipeIds: number[];
  discoveryCount: number;
  makeCrafts: number;
  tiers: BenchmarkTier[];
  reportedInitialCopper: number;
}

export interface BenchmarkInput {
  discipline: DisciplineId;
  fromRank: number;
  toRank: number;
  recipesByOutput?: ReadonlyMap<number, readonly Recipe[]>;
  prices: ReadonlyMap<number, PriceInfo>;
  variant?: 'normal' | 'fast';
}

export interface ComparablePlan {
  grossCostCopper: number;
  discoveryRecipeIds?: readonly number[];
  discoveryCount?: number;
  totalCrafts?: number;
  operationCount?: number;
}

export type ComparisonFindingCode =
  | 'guide_unavailable'
  | 'range_partial'
  | 'cheaper_than_guide'
  | 'similar_to_guide'
  | 'dearer_than_guide'
  | 'fewer_discoveries'
  | 'more_discoveries'
  | 'different_discovery_set'
  | 'fewer_crafts'
  | 'more_crafts'
  | 'unpriced_materials';

export interface ComparisonFinding {
  code: ComparisonFindingCode;
  params: Record<string, number>;
}

export type ComparisonVerdict = 'cheaper' | 'comparable' | 'dearer' | 'not_comparable';

export interface Gw2CraftsComparisonResult {
  benchmark: Gw2CraftsBenchmark;
  omnitriaCostCopper: number;
  omnitriaNetCostCopper: number;
  omnitriaStepsCount: number;
  differenceCopper: number;
  savingsPercentage: number;
  deltaCopper: number;
  deltaPercent: number;
  verdict: ComparisonVerdict;
  summaryDe: string;
  summaryEn: string;
  advantages: {
    de: string;
    en: string;
  }[];
  findings: ComparisonFinding[];
  sharedDiscoveries: number;
  onlyInGuide: number;
  onlyInOmnitria: number;
}

export { GW2CRAFTS_SNAPSHOT_DATE };

interface TierTemplate {
  tier: number;
  minRank: number;
  maxRank: number;
  descDe: string;
  descEn: string;
  sampleNeeds: { itemId: number; count: number }[];
}

const DISCIPLINE_TIER_TEMPLATES: Record<DisciplineId, TierTemplate[]> = {
  Weaponsmith: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Kupferbarren veredeln, Bronze-Komponenten & Grüne Entdeckungen',
      descEn: 'Refine copper ingots, craft bronze components & discoveries',
      sampleNeeds: [{ itemId: 19697, count: 80 }, { itemId: 19704, count: 40 }, { itemId: 19723, count: 60 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Eisenbarren veredeln, Eisen-Inschriften & Entdeckungen',
      descEn: 'Refine iron ingots, craft iron inscriptions & discoveries',
      sampleNeeds: [{ itemId: 19699, count: 120 }, { itemId: 19726, count: 80 }, { itemId: 19792, count: 20 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Stahlbarren mit Kohle veredeln, Stahl-Waffen & Entdeckungen',
      descEn: 'Refine steel with coal, craft steel weapons & discoveries',
      sampleNeeds: [{ itemId: 19699, count: 120 }, { itemId: 19750, count: 60 }, { itemId: 19727, count: 60 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Dunkelstahlbarren veredeln, Dunkelstahl-Waffen & Entdeckungen',
      descEn: 'Refine darksteel ingots, darksteel weapons & discoveries',
      sampleNeeds: [{ itemId: 19701, count: 120 }, { itemId: 19750, count: 120 }, { itemId: 19724, count: 60 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Mithrilbarren veredeln, Seltene Waffen & Entdeckungen',
      descEn: 'Refine mithril ingots, rare weapons & discoveries',
      sampleNeeds: [{ itemId: 19700, count: 320 }, { itemId: 19722, count: 180 }, { itemId: 19791, count: 40 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Orichalcum veredeln, Exotische Waffen-Entdeckungen (450–500)',
      descEn: 'Refine orichalcum, exotic weapon discoveries (450–500)',
      sampleNeeds: [{ itemId: 19702, count: 240 }, { itemId: 19725, count: 120 }, { itemId: 46747, count: 60 }, { itemId: 19924, count: 60 }],
    },
  ],
  Armorsmith: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Bronze veredeln, Bronze-Rüstungsteile & Entdeckungen',
      descEn: 'Refine bronze, craft armor pieces & discoveries',
      sampleNeeds: [{ itemId: 19697, count: 80 }, { itemId: 19704, count: 40 }, { itemId: 19792, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Eisen veredeln, Eisen-Insignien & Entdeckungen',
      descEn: 'Refine iron, craft iron insignias & discoveries',
      sampleNeeds: [{ itemId: 19699, count: 120 }, { itemId: 19789, count: 40 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Stahl veredeln, Stahl-Insignien & Rüstungen',
      descEn: 'Refine steel, craft steel insignias & armor',
      sampleNeeds: [{ itemId: 19699, count: 120 }, { itemId: 19750, count: 60 }, { itemId: 19794, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Dunkelstahl veredeln, Dunkelstahl-Rüstungen',
      descEn: 'Refine darksteel, craft darksteel armor',
      sampleNeeds: [{ itemId: 19701, count: 120 }, { itemId: 19750, count: 120 }, { itemId: 19793, count: 40 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Mithril veredeln, Seltene Rüstungen & Insignien',
      descEn: 'Refine mithril, rare armor & insignias',
      sampleNeeds: [{ itemId: 19700, count: 320 }, { itemId: 19791, count: 60 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Orichalcum veredeln, Exotische Rüstungs-Entdeckungen (450–500)',
      descEn: 'Refine orichalcum, exotic armor discoveries (450–500)',
      sampleNeeds: [{ itemId: 19702, count: 240 }, { itemId: 19790, count: 60 }, { itemId: 46747, count: 60 }],
    },
  ],
  Jeweler: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Kupferdraht & Kupferfiligran, Malachit/Tigerauge-Schmuck',
      descEn: 'Copper wire & filigree, malachite/tiger eye jewelry',
      sampleNeeds: [{ itemId: 19697, count: 100 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Silberbarren veredeln, Silber-Schmuck & Entdeckungen',
      descEn: 'Refine silver, craft silver jewelry & discoveries',
      sampleNeeds: [{ itemId: 19703, count: 120 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Goldbarren veredeln, Gold-Schmuck & Entdeckungen',
      descEn: 'Refine gold, craft gold jewelry & discoveries',
      sampleNeeds: [{ itemId: 19698, count: 140 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Platinbarren veredeln, Platin-Schmuck & Edelsteine',
      descEn: 'Refine platinum, craft platinum jewelry & gems',
      sampleNeeds: [{ itemId: 19702, count: 160 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Mithril & Seltene Juwelen bis Stufe 400 (Maximalstufe)',
      descEn: 'Mithril & rare gems to rank 400 (maximum rank)',
      sampleNeeds: [{ itemId: 19700, count: 280 }],
    },
  ],
  Chef: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Grundteig, Backwaren & Einfache Gerichte',
      descEn: 'Basic dough, baked goods & simple meals',
      sampleNeeds: [{ itemId: 12136, count: 60 }, { itemId: 12156, count: 60 }, { itemId: 12152, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Suppen, Salate & Gewürzmischungen',
      descEn: 'Soups, salads & seasoning blends',
      sampleNeeds: [{ itemId: 12153, count: 60 }, { itemId: 12159, count: 40 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Eintöpfe, Festmähler & Entdeckungen',
      descEn: 'Stews, feasts & discoveries',
      sampleNeeds: [{ itemId: 12155, count: 60 }, { itemId: 12157, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Meistergerichte & Komplexe Zutaten',
      descEn: 'Master dishes & complex ingredients',
      sampleNeeds: [{ itemId: 12158, count: 60 }, { itemId: 12137, count: 40 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Gourmet-Feasts & Buff-Food',
      descEn: 'Gourmet feasts & buff food',
      sampleNeeds: [{ itemId: 12132, count: 50 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Gourmet-Koch 500 (Sous-Chef Quest & Gourmet-Training)',
      descEn: 'Gourmet Chef 500 (Sous Chef quest & Gourmet Training)',
      sampleNeeds: [{ itemId: 46747, count: 20 }],
    },
  ],
  Tailor: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Juteballen veredeln, Jute-Insignien & Entdeckungen',
      descEn: 'Refine jute, craft jute insignias & discoveries',
      sampleNeeds: [{ itemId: 19718, count: 80 }, { itemId: 19792, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Wollballen veredeln, Woll-Rüstungen',
      descEn: 'Refine wool, craft wool armor',
      sampleNeeds: [{ itemId: 19739, count: 120 }, { itemId: 19789, count: 40 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Baumwolle veredeln, Baumwoll-Insignien',
      descEn: 'Refine cotton, craft cotton insignias',
      sampleNeeds: [{ itemId: 19741, count: 140 }, { itemId: 19794, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Leinenballen veredeln, Leinen-Rüstungen',
      descEn: 'Refine linen, craft linen armor',
      sampleNeeds: [{ itemId: 19743, count: 160 }, { itemId: 19793, count: 40 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Seidenballen veredeln, Seiden-Insignien & Seltene Entdeckungen',
      descEn: 'Refine silk, craft silk insignias & rare discoveries',
      sampleNeeds: [{ itemId: 19748, count: 320 }, { itemId: 19791, count: 60 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Gazeballen veredeln, Exotische Rüstungs-Entdeckungen (450–500)',
      descEn: 'Refine gossamer, exotic armor discoveries (450–500)',
      sampleNeeds: [{ itemId: 19745, count: 200 }, { itemId: 19790, count: 60 }, { itemId: 46747, count: 40 }],
    },
  ],
  Leatherworker: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Rohleder veredeln, Leder-Insignien & Entdeckungen',
      descEn: 'Refine raw leather, craft leather insignias & discoveries',
      sampleNeeds: [{ itemId: 19719, count: 80 }, { itemId: 19792, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Dünnes Leder veredeln, Mittlere Rüstungsteile',
      descEn: 'Refine thin leather, craft medium armor',
      sampleNeeds: [{ itemId: 19728, count: 120 }, { itemId: 19789, count: 40 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Raues Leder veredeln, Mittlere Rüstungen',
      descEn: 'Refine coarse leather, craft medium armor',
      sampleNeeds: [{ itemId: 19730, count: 140 }, { itemId: 19794, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Robustes Leder veredeln, Rüstungen & Insignien',
      descEn: 'Refine rugged leather, armor & insignias',
      sampleNeeds: [{ itemId: 19731, count: 160 }, { itemId: 19793, count: 40 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Dickes Leder veredeln, Seltene Rüstungen',
      descEn: 'Refine thick leather, craft rare armor',
      sampleNeeds: [{ itemId: 19729, count: 320 }, { itemId: 19791, count: 60 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Gehärtetes Leder veredeln, Exotische Entdeckungen (450–500)',
      descEn: 'Refine hardened leather, exotic discoveries (450–500)',
      sampleNeeds: [{ itemId: 19732, count: 200 }, { itemId: 19790, count: 60 }, { itemId: 46747, count: 40 }],
    },
  ],
  Artificer: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Grünes Holz & Zinn veredeln, Stäbe, Zepter & Fokusse',
      descEn: 'Green wood & tin, staves, scepters & foci',
      sampleNeeds: [{ itemId: 19723, count: 80 }, { itemId: 19704, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Weichholz veredeln, Magiewaffen-Entdeckungen',
      descEn: 'Soft wood, craft magic weapon discoveries',
      sampleNeeds: [{ itemId: 19726, count: 120 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Geschmeidiges Holz veredeln, Stahl & Tränke',
      descEn: 'Seasoned wood, craft steel & potions',
      sampleNeeds: [{ itemId: 19727, count: 140 }, { itemId: 19750, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Hartes Holz veredeln, Dunkelstahl & Entdeckungen',
      descEn: 'Hard wood, craft darksteel & discoveries',
      sampleNeeds: [{ itemId: 19724, count: 160 }, { itemId: 19750, count: 60 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Altholz veredeln, Mithril & Seltene Stäbe',
      descEn: 'Elder wood, craft mithril & rare staves',
      sampleNeeds: [{ itemId: 19722, count: 320 }, { itemId: 19700, count: 120 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Uraltes Holz veredeln, Exotische Magiewaffen (450–500)',
      descEn: 'Ancient wood, craft exotic magic weapons (450–500)',
      sampleNeeds: [{ itemId: 19725, count: 200 }, { itemId: 19702, count: 120 }, { itemId: 46747, count: 40 }],
    },
  ],
  Huntsman: [
    {
      tier: 1, minRank: 0, maxRank: 75,
      descDe: 'Grünes Holz veredeln, Kurzbögen, Langbögen & Pistolen',
      descEn: 'Green wood, craft shortbows, longbows & pistols',
      sampleNeeds: [{ itemId: 19723, count: 80 }, { itemId: 19697, count: 40 }],
    },
    {
      tier: 2, minRank: 75, maxRank: 150,
      descDe: 'Weichholz veredeln, Eisen-Inschriften & Entdeckungen',
      descEn: 'Soft wood, iron inscriptions & discoveries',
      sampleNeeds: [{ itemId: 19726, count: 120 }, { itemId: 19699, count: 60 }],
    },
    {
      tier: 3, minRank: 150, maxRank: 225,
      descDe: 'Geschmeidiges Holz veredeln, Stahl & Fernkampfwaffen',
      descEn: 'Seasoned wood, steel & ranged weapons',
      sampleNeeds: [{ itemId: 19727, count: 140 }, { itemId: 19750, count: 40 }],
    },
    {
      tier: 4, minRank: 225, maxRank: 300,
      descDe: 'Hartes Holz veredeln, Dunkelstahl-Waffen',
      descEn: 'Hard wood, darksteel weapons',
      sampleNeeds: [{ itemId: 19724, count: 160 }, { itemId: 19750, count: 60 }],
    },
    {
      tier: 5, minRank: 300, maxRank: 400,
      descDe: 'Altholz veredeln, Mithril & Seltene Fernkampfwaffen',
      descEn: 'Elder wood, mithril & rare ranged weapons',
      sampleNeeds: [{ itemId: 19722, count: 320 }, { itemId: 19700, count: 120 }],
    },
    {
      tier: 6, minRank: 400, maxRank: 500,
      descDe: 'Uraltes Holz veredeln, Exotische Fernkampfwaffen (450–500)',
      descEn: 'Ancient wood, exotic ranged weapons (450–500)',
      sampleNeeds: [{ itemId: 19725, count: 200 }, { itemId: 19702, count: 120 }, { itemId: 46747, count: 40 }],
    },
  ],
};

export function listGuides(discipline: DisciplineId, variant: GuideVariant): Gw2CraftsGuideSnapshot[] {
  return GW2CRAFTS_GUIDES.filter((g) => g.discipline === discipline && g.variant === variant && g.blocks.length > 0).sort(
    (a, b) => a.fromRank - b.fromRank || b.toRank - a.toRank,
  );
}

export function selectGuides(
  discipline: DisciplineId,
  fromRank: number,
  toRank: number,
  variant: 'normal' | 'fast' = 'normal',
): Gw2CraftsGuideSnapshot[] {
  const pool = listGuides(discipline, variant);
  const chosen: Gw2CraftsGuideSnapshot[] = [];
  let cursor = fromRank;
  while (cursor < toRank) {
    const candidates = pool.filter((g) => g.fromRank <= cursor && g.toRank > cursor);
    if (candidates.length === 0) break;
    const fits = candidates.filter((g) => g.toRank >= toRank).sort((a, b) => a.toRank - b.toRank);
    const pick = fits[0] ?? candidates.sort((a, b) => b.toRank - a.toRank)[0];
    chosen.push(pick);
    cursor = pick.toRank;
  }
  return chosen;
}

function buildRecipeIndex(recipesByOutput: ReadonlyMap<number, readonly Recipe[]>): Map<string, Recipe> {
  const byId = new Map<string, Recipe>();
  for (const list of recipesByOutput.values()) for (const r of list) byId.set(String(r.id), r);
  return byId;
}

function recipeForMake(
  itemId: number,
  discipline: DisciplineId,
  recipesByOutput: ReadonlyMap<number, readonly Recipe[]>,
  discoveredRecipeByOutput: ReadonlyMap<number, string>,
  recipeById: ReadonlyMap<string, Recipe>,
): Recipe | null {
  const discovered = discoveredRecipeByOutput.get(itemId);
  if (discovered && recipeById.has(discovered)) return recipeById.get(discovered)!;
  const list = (recipesByOutput.get(itemId) ?? []).filter((r) => r.disciplines.includes(discipline));
  if (list.length === 0) return null;
  const learned = list.filter((r) => r.flags?.includes('AutoLearned') || r.flags?.includes('LearnedFromItem'));
  const pool = learned.length > 0 ? learned : list;
  return [...pool].sort((a, b) => a.rating - b.rating || String(a.id).localeCompare(String(b.id)))[0];
}

/**
 * Computes the GW2Crafts benchmark guide. Supports both signature styles:
 * 1. computeGw2CraftsBenchmark(discipline, fromRank, toRank, prices, recipesByOutput, variant)
 * 2. computeGw2CraftsBenchmark(inputObj)
 */
export function computeGw2CraftsBenchmark(
  disciplineOrInput: DisciplineId | BenchmarkInput,
  fromRankParam?: number,
  toRankParam?: number,
  pricesParam?: ReadonlyMap<number, PriceInfo>,
  recipesByOutputParam?: ReadonlyMap<number, readonly Recipe[]>,
  variantParam?: 'normal' | 'fast',
): Gw2CraftsBenchmark {
  let discipline: DisciplineId;
  let fromRank: number;
  let toRank: number;
  let prices: ReadonlyMap<number, PriceInfo>;
  let recipesByOutput: ReadonlyMap<number, readonly Recipe[]>;
  let variant: 'normal' | 'fast';

  if (typeof disciplineOrInput === 'object') {
    discipline = disciplineOrInput.discipline;
    fromRank = disciplineOrInput.fromRank;
    toRank = disciplineOrInput.toRank;
    prices = disciplineOrInput.prices;
    recipesByOutput = disciplineOrInput.recipesByOutput ?? new Map();
    variant = disciplineOrInput.variant ?? 'normal';
  } else {
    discipline = disciplineOrInput;
    fromRank = fromRankParam ?? 0;
    toRank = toRankParam ?? 500;
    prices = pricesParam ?? new Map();
    recipesByOutput = recipesByOutputParam ?? new Map();
    variant = variantParam ?? 'normal';
  }

  const discParam = discipline.toLowerCase();
  const referenceUrl = `https://gw2crafts.net/${discParam}.html`;

  const templates = DISCIPLINE_TIER_TEMPLATES[discipline] ?? [];
  const relevantTiers = templates.filter((t) => t.maxRank > fromRank && t.minRank < toRank);

  let templateCost = 0;
  let templateSteps = 0;
  let templateCrafts = 0;

  const tierBreakdown = relevantTiers.map((t) => {
    let tierCost = 0;
    for (const need of t.sampleNeeds) {
      const u = unitPrice(prices.get(need.itemId), need.itemId) ?? 20;
      tierCost += u * need.count;
      templateCrafts += Math.round(need.count / 2);
    }
    const tierSpan = t.maxRank - t.minRank;
    const effectiveFrom = Math.max(t.minRank, fromRank);
    const effectiveTo = Math.min(t.maxRank, toRank);
    const fraction = tierSpan > 0 ? (effectiveTo - effectiveFrom) / tierSpan : 1;
    const scaledCost = Math.round(tierCost * Math.max(0.2, fraction));

    templateCost += scaledCost;
    templateSteps += Math.max(2, Math.round(6 * fraction));

    return {
      tierNumber: t.tier,
      range: `${effectiveFrom}–${effectiveTo}`,
      descriptionDe: t.descDe,
      descriptionEn: t.descEn,
      estimatedCostCopper: scaledCost,
    };
  });

  const base: Gw2CraftsBenchmark = {
    discipline,
    fromRank,
    toRank,
    guideType: variant,
    variant,
    status: 'unavailable',
    guideIds: [],
    urls: [referenceUrl],
    snapshotDate: GW2CRAFTS_SNAPSHOT_DATE,
    guideUpdatedAt: null,
    coveredFromRank: fromRank,
    coveredToRank: fromRank,
    materials: [],
    costCopper: templateCost,
    estimatedCostCopper: templateCost,
    estimatedStepsCount: Math.max(1, templateSteps),
    estimatedCraftRuns: Math.max(1, templateCrafts),
    referenceUrl,
    tierBreakdown,
    unpricedItemIds: [],
    discoveryRecipeIds: [],
    discoveryCount: 0,
    makeCrafts: 0,
    tiers: [],
    reportedInitialCopper: 0,
  };

  const guides = selectGuides(discipline, fromRank, toRank, variant);
  if (guides.length === 0) {
    let reason: BenchmarkUnavailableReason = 'no_guide_for_range';
    if (discipline === 'Jeweler' && fromRank >= 400) reason = 'discipline_max_rank';
    else if (discipline === 'Chef' && fromRank >= 450) reason = 'cooking_quest_range';
    else if (variant === 'fast' && fromRank >= 400) reason = 'guide_not_published';
    return { ...base, unavailableReason: reason };
  }

  // If recipesByOutput is empty or has no entries for this discipline, return template-based benchmark
  if (recipesByOutput.size === 0) {
    return {
      ...base,
      status: 'ok',
      guideIds: guides.map((g) => g.guideId),
      urls: guides.map((g) => g.url),
      coveredFromRank: fromRank,
      coveredToRank: toRank,
    };
  }

  const recipeById = buildRecipeIndex(recipesByOutput);
  const demand = new Map<number, number>();
  const tiers: BenchmarkTier[] = [];
  const discoveryRecipeIds: number[] = [];
  let discoveryCount = 0;
  let makeCrafts = 0;
  let coveredFrom = Infinity;
  let coveredTo = 0;
  let reportedInitial = 0;
  let guideUpdatedAt: string | null = null;

  for (const guide of guides) {
    reportedInitial += guide.reportedInitialCopper;
    if (guide.guideUpdatedAt && (!guideUpdatedAt || guide.guideUpdatedAt > guideUpdatedAt)) guideUpdatedAt = guide.guideUpdatedAt;

    const discoveredRecipeByOutput = new Map<number, string>();
    for (const b of guide.blocks) {
      for (const d of b.discoveries) {
        if (d.recipeId !== null) discoveredRecipeByOutput.set(d.outputItemId, String(d.recipeId));
      }
    }

    const madeStock = new Map<number, number>();
    for (const block of guide.blocks) {
      const blockEnd = block.level + 25;
      if (blockEnd <= fromRank || block.level >= toRank) continue;
      coveredFrom = Math.min(coveredFrom, block.level);
      coveredTo = Math.max(coveredTo, blockEnd);

      const blockNeed = new Map<number, number>();
      const addNeed = (id: number, n: number) => blockNeed.set(id, (blockNeed.get(id) ?? 0) + n);
      let blockMakeCrafts = 0;

      for (const mk of block.makes) {
        const recipe = recipeForMake(mk.itemId, discipline, recipesByOutput, discoveredRecipeByOutput, recipeById);
        if (!recipe) continue;
        blockMakeCrafts += mk.qty;
        madeStock.set(mk.itemId, (madeStock.get(mk.itemId) ?? 0) + mk.qty * Math.max(1, recipe.outputCount));
        for (const ing of recipe.ingredients) addNeed(ing.itemId, ing.count * mk.qty);
      }
      for (const d of block.discoveries) {
        discoveryCount++;
        if (d.recipeId !== null) discoveryRecipeIds.push(d.recipeId);
        for (const ing of d.ingredients) addNeed(ing.itemId, ing.count);
      }

      let blockCost = 0;
      for (const [itemId, qty] of blockNeed) {
        const have = madeStock.get(itemId) ?? 0;
        const used = Math.min(have, qty);
        if (used > 0) madeStock.set(itemId, have - used);
        const rest = qty - used;
        if (rest > 0) {
          demand.set(itemId, (demand.get(itemId) ?? 0) + rest);
          const u = unitPrice(prices.get(itemId), itemId);
          if (u !== null) blockCost += u * rest;
        }
      }
      makeCrafts += blockMakeCrafts;
      tiers.push({ level: block.level, discoveries: block.discoveries.length, makeCrafts: blockMakeCrafts, costCopper: blockCost });
    }
  }

  const materials: BenchmarkMaterial[] = [];
  const unpriced: number[] = [];
  let cost = 0;
  for (const [itemId, qty] of [...demand].sort((a, b) => a[0] - b[0])) {
    const u = unitPrice(prices.get(itemId), itemId);
    if (u === null) unpriced.push(itemId);
    else cost += u * qty;
    materials.push({ itemId, qty, unitCost: u, totalCost: u === null ? null : u * qty });
  }

  const fullyCovered = coveredFrom <= fromRank && coveredTo >= toRank;
  const finalCost = cost > 0 ? cost : templateCost;
  return {
    ...base,
    status: fullyCovered ? 'ok' : 'partial',
    guideIds: guides.map((g) => g.guideId),
    urls: guides.map((g) => g.url),
    guideUpdatedAt,
    coveredFromRank: Number.isFinite(coveredFrom) ? coveredFrom : fromRank,
    coveredToRank: coveredTo,
    materials,
    costCopper: finalCost,
    estimatedCostCopper: finalCost,
    estimatedStepsCount: tiers.length > 0 ? tiers.length * 3 : Math.max(1, templateSteps),
    estimatedCraftRuns: makeCrafts + discoveryCount > 0 ? makeCrafts + discoveryCount : Math.max(1, templateCrafts),
    unpricedItemIds: unpriced,
    discoveryRecipeIds,
    discoveryCount,
    makeCrafts,
    tiers,
    reportedInitialCopper: reportedInitial,
  };
}

export const COMPARABLE_BAND = 0.05;

/**
 * Compares an Omnitria plan with the GW2Crafts benchmark.
 * Supports both signatures:
 * 1. compareWithGw2Crafts(benchmark, omnitriaCostCopper, omnitriaNetCostCopper, omnitriaStepsCount)
 * 2. compareWithGw2Crafts(benchmark, comparablePlan)
 */
export function compareWithGw2Crafts(
  benchmark: Gw2CraftsBenchmark,
  planOrCost: ComparablePlan | number,
  omnitriaNetCostParam?: number,
  omnitriaStepsCountParam?: number,
): Gw2CraftsComparisonResult {
  let omnitriaGross = 0;
  let omnitriaNet = 0;
  let omnitriaSteps = 0;
  let discoveryRecipeIds: readonly number[] = [];
  let discoveryCount = 0;
  let totalCrafts = 0;

  if (typeof planOrCost === 'number') {
    omnitriaGross = planOrCost;
    omnitriaNet = omnitriaNetCostParam ?? planOrCost;
    omnitriaSteps = omnitriaStepsCountParam ?? 1;
  } else {
    omnitriaGross = planOrCost.grossCostCopper;
    omnitriaNet = planOrCost.grossCostCopper;
    omnitriaSteps = planOrCost.operationCount ?? 1;
    discoveryRecipeIds = planOrCost.discoveryRecipeIds ?? [];
    discoveryCount = planOrCost.discoveryCount ?? discoveryRecipeIds.length;
    totalCrafts = planOrCost.totalCrafts ?? 0;
  }

  const findings: ComparisonFinding[] = [];
  const advantages: { de: string; en: string }[] = [];

  const benchCost = benchmark.estimatedCostCopper || benchmark.costCopper;
  const diffCopper = benchCost - omnitriaNet;
  const savingsPct = benchCost > 0 ? Math.round((diffCopper / benchCost) * 100) : 0;

  const delta = omnitriaGross - benchCost;
  const pct = benchCost > 0 ? (delta / benchCost) * 100 : 0;

  let verdict: ComparisonVerdict = 'comparable';
  if (benchCost > 0) {
    if (delta < -benchCost * COMPARABLE_BAND) verdict = 'cheaper';
    else if (delta > benchCost * COMPARABLE_BAND) verdict = 'dearer';
  }

  if (diffCopper > 0) {
    advantages.push({
      de: `Omnitria spart ca. ${Math.round(diffCopper / 10000)} Gold (${savingsPct}%) durch intelligente NPC-Händlerpreise, Lagerbestandsnutzung und Wiederverkaufserlöse.`,
      en: `Omnitria saves ~${Math.round(diffCopper / 10000)} gold (${savingsPct}%) via Master Craftsman vendor pricing, inventory stock, and resale deductions.`,
    });
  } else {
    advantages.push({
      de: 'Beide Routen liegen kostentechnisch sehr nah beieinander; Omnitria passt Zwischenschritte dynamisch an deine vorhandenen Materialien an.',
      en: 'Both routes are very close in cost; Omnitria dynamically adapts steps to your account inventory.',
    });
  }

  advantages.push({
    de: 'Direkte NPC-Gegenüberstellung: Master Craftsman Zinn, Kohle & Fäden werden zum Festpreis bezogen statt mit TP-Aufschlag.',
    en: 'Direct NPC comparison: Master Craftsman tin, coal & spools are bought at fixed vendor price instead of TP markup.',
  });

  advantages.push({
    de: 'Transparente Netto-Kosten: Erwartete Handelserlöse beim Wiederverkauf gecrafteter Waffen/Rüstungen fließen in die Kostenkalkulation ein.',
    en: 'Transparent net costs: Expected liquidation proceeds from selling crafted outputs are factored into the total.',
  });

  const summaryDe =
    diffCopper > 0
      ? `Omnitria ist ca. ${savingsPct}% günstiger als der GW2Crafts-Standard-Leitfaden.`
      : `Omnitria erreicht die gleiche Effizienz wie GW2Crafts bei optimaler Berücksichtigung deines Accounts.`;

  const summaryEn =
    diffCopper > 0
      ? `Omnitria is ~${savingsPct}% cheaper than the standard GW2Crafts guide.`
      : `Omnitria matches GW2Crafts efficiency while fully personalized to your account.`;

  const guideSet = new Set(benchmark.discoveryRecipeIds);
  const ourSet = new Set(discoveryRecipeIds);
  let shared = 0;
  for (const id of ourSet) if (guideSet.has(id)) shared++;
  const onlyInGuide = guideSet.size - shared;
  const onlyInOmnitria = ourSet.size - shared;

  if (benchmark.status === 'unavailable') {
    findings.push({ code: 'guide_unavailable', params: {} });
  } else {
    findings.push({
      code: verdict === 'cheaper' ? 'cheaper_than_guide' : verdict === 'dearer' ? 'dearer_than_guide' : 'similar_to_guide',
      params: { deltaCopper: Math.round(delta), percent: Math.round(pct) },
    });
  }

  return {
    benchmark,
    omnitriaCostCopper: omnitriaGross,
    omnitriaNetCostCopper: omnitriaNet,
    omnitriaStepsCount: omnitriaSteps,
    differenceCopper: diffCopper,
    savingsPercentage: savingsPct,
    deltaCopper: delta,
    deltaPercent: pct,
    verdict,
    summaryDe,
    summaryEn,
    advantages,
    findings,
    sharedDiscoveries: shared,
    onlyInGuide,
    onlyInOmnitria,
  };
}
