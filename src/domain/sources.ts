/**
 * Klassifikation der Beschaffungswege eines Materials.
 *
 * Es werden nur Aussagen getroffen, die aus
 *   - der offiziellen API (Bindung/Handelbarkeit, Preise, Item-Beschreibung),
 *   - dem Community-Datensatz (Herkunfts-Tags, Rezepte) oder
 *   - Berechnungen
 * stammen. Alles andere bleibt "unbekannt" und wird ausdrücklich so ausgewiesen.
 */
import type { GameItem, PriceInfo, Recipe } from './types.ts';
import { isUntradable } from './types.ts';

export type SourceKind = 'gather' | 'drop' | 'salvage' | 'craft' | 'forge' | 'unlock' | 'vendor' | 'trade';
export type Origin = 'official' | 'community' | 'derived' | 'unknown';

export interface SourceInfo {
  kind: SourceKind;
  label: string;
  labelEn: string;
  origin: Origin;
  detail: string;
  detailEn: string;
  /** "garantiert" | "zufällig" | "unbekannt" */
  amount: 'guaranteed' | 'random' | 'unknown';
  caveats: string[];
  caveatsEn: string[];
  recipe?: Recipe;
}

export const KIND_META: Record<SourceKind, { label: string; labelEn: string; order: number }> = {
  gather: { label: 'Direkt sammelbar', labelEn: 'Gatherable', order: 1 },
  drop: { label: 'Gegnerbeute', labelEn: 'Enemy Drop', order: 2 },
  salvage: { label: 'Verwertung', labelEn: 'Salvage', order: 3 },
  craft: { label: 'Handwerk', labelEn: 'Crafting', order: 4 },
  forge: { label: 'Mystische Schmiede', labelEn: 'Mystic Forge', order: 5 },
  unlock: { label: 'Erfolg / Sammlung / Freischaltung', labelEn: 'Achievement / Unlock', order: 6 },
  vendor: { label: 'Händler', labelEn: 'Vendor', order: 7 },
  trade: { label: 'Handelsgesellschaft', labelEn: 'Trading Post', order: 8 },
};

const UNLOCK_LABELS: Record<string, { de: string; en: string }> = {
  achievement: { de: 'Erfolg', en: 'Achievement' },
  collection: { de: 'Sammlung', en: 'Collection' },
  map_completion: { de: 'Kartenabschluss', en: 'Map Completion' },
  reward_track: { de: 'Belohnungspfad', en: 'Reward Track' },
  homestead: { de: 'Homestead', en: 'Homestead' },
  legendary_armory: { de: 'Legendäre Rüstkammer', en: 'Legendary Armory' },
  map_reward: { de: 'Kartenbelohnung', en: 'Map Reward' },
  pvp: { de: 'PvP-Belohnung', en: 'PvP Reward' },
  wvw: { de: 'WvW-Belohnung', en: 'WvW Reward' },
  map_currency: { de: 'Kartenwährung', en: 'Map Currency' },
};

const UNLOCK_TAGS = new Set(Object.keys(UNLOCK_LABELS));

export interface SourceContext {
  item: GameItem | undefined;
  tags: string[];
  /** Rezept, das diesen Gegenstand herstellt (Community oder offiziell) */
  recipe?: Recipe;
  vendorRecipe?: Recipe;
  price?: PriceInfo;
}

export function resolveSources(ctx: SourceContext): SourceInfo[] {
  const { item, tags, recipe, vendorRecipe, price } = ctx;
  const out: SourceInfo[] = [];
  const has = (t: string) => tags.includes(t);

  if (has('gathering')) {
    out.push({
      kind: 'gather',
      label: 'Direkt sammelbar',
      labelEn: 'Gatherable',
      origin: 'community',
      detail: 'Wird an Rohstoffknoten gesammelt. Welche Knoten/Gebiete genau, ist im Datensatz nicht erfasst.',
      detailEn: 'Harvested from resource nodes in the world. Specific regions/nodes are not detailed in dataset.',
      amount: 'unknown',
      caveats: ['Menge pro Knoten und Fundorte nicht erfasst – bitte im Wiki prüfen.'],
      caveatsEn: ['Amounts per node and exact locations not tracked – please check the GW2 Wiki.'],
    });
  }
  if (has('drop')) {
    out.push({
      kind: 'drop',
      label: 'Gegnerbeute',
      labelEn: 'Enemy Drop',
      origin: 'community',
      detail: 'Fällt als Beute von Gegnern. Quellen und Droprate sind nicht erfasst.',
      detailEn: 'Dropped as enemy loot. Specific enemy types and drop rates are not tracked.',
      amount: 'random',
      caveats: ['Kein garantierter Drop.'],
      caveatsEn: ['Not a guaranteed drop.'],
    });
  }
  if (has('salvage')) {
    out.push({
      kind: 'salvage',
      label: 'Verwertung',
      labelEn: 'Salvage',
      origin: 'community',
      detail: 'Entsteht beim Verwerten von Gegenständen.',
      detailEn: 'Obtained from salvaging equipment and items.',
      amount: 'random',
      caveats: ['Zufallsergebnis – Menge nicht garantiert.', 'Welche Gegenstände sich eignen, ist nicht erfasst.'],
      caveatsEn: ['RNG result – quantities are not guaranteed.', 'Specific eligible items are not tracked.'],
    });
  }
  if (recipe && recipe.kind !== 'mf' && recipe.kind !== 'vendor') {
    out.push({
      kind: 'craft',
      label: 'Handwerk',
      labelEn: 'Crafting',
      origin: recipe.source === 'official' ? 'official' : 'community',
      detail: recipe.disciplines.length
        ? `Herstellbar (${recipe.disciplines.join(', ')}${recipe.rating ? `, ab Rang ${recipe.rating}` : ''}).`
        : 'Herstellbar.',
      detailEn: recipe.disciplines.length
        ? `Craftable (${recipe.disciplines.join(', ')}${recipe.rating ? `, from rank ${recipe.rating}` : ''}).`
        : 'Craftable.',
      amount: 'guaranteed',
      caveats: [],
      caveatsEn: [],
      recipe,
    });
  } else if (has('crafting')) {
    out.push({
      kind: 'craft',
      label: 'Handwerk',
      labelEn: 'Crafting',
      origin: 'community',
      detail: 'Laut Datensatz herstellbar; Rezept ist nicht aufgeschlüsselt.',
      detailEn: 'Craftable according to dataset; exact recipe details not broken down.',
      amount: 'unknown',
      caveats: ['Rezeptdetails fehlen.'],
      caveatsEn: ['Recipe details missing.'],
    });
  }
  if (recipe && recipe.kind === 'mf') {
    const random = recipe.yield !== undefined && recipe.yield < 1;
    out.push({
      kind: 'forge',
      label: 'Mystische Schmiede',
      labelEn: 'Mystic Forge',
      origin: 'community',
      detail: random
        ? `Zufallsrezept: ${recipe.outputCount} Ausgabe(n) bei Erfolg, geschätzte Erfolgsquote ${Math.round((recipe.yield ?? 1) * 100)} %.`
        : 'Rezept der Mystischen Schmiede (deterministisch).',
      detailEn: random
        ? `RNG recipe: ${recipe.outputCount} yield on success, estimated success rate ~${Math.round((recipe.yield ?? 1) * 100)}%.`
        : 'Mystic Forge recipe (deterministic).',
      amount: random ? 'random' : 'guaranteed',
      caveats: random ? ['Erwartungswert, tatsächlicher Verbrauch schwankt.'] : [],
      caveatsEn: random ? ['Statistical average, actual in-game consumption fluctuates.'] : [],
      recipe,
    });
  } else if (has('mystic_forge')) {
    out.push({
      kind: 'forge',
      label: 'Mystische Schmiede',
      labelEn: 'Mystic Forge',
      origin: 'community',
      detail: 'Laut Datensatz in der Mystischen Schmiede erhältlich; Rezept nicht aufgeschlüsselt.',
      detailEn: 'Obtainable in Mystic Forge according to dataset; recipe not broken down.',
      amount: 'unknown',
      caveats: ['Rezeptdetails fehlen.'],
      caveatsEn: ['Recipe details missing.'],
    });
  }
  for (const t of tags) {
    if (!UNLOCK_TAGS.has(t)) continue;
    const l = UNLOCK_LABELS[t];
    out.push({
      kind: 'unlock',
      label: l.de,
      labelEn: l.en,
      origin: 'community',
      detail: `Erhältlich über: ${l.de}. Voraussetzungen (Erfolge, Meisterschaften, Währungen) sind im Spiel zu prüfen.`,
      detailEn: `Obtainable via: ${l.en}. Check in-game prerequisites (achievements, masteries, currencies).`,
      amount: 'guaranteed',
      caveats: ['Voraussetzungen nicht vollständig erfasst.'],
      caveatsEn: ['Prerequisites not fully detailed in dataset.'],
    });
  }
  if (has('vendor')) {
    const vr = vendorRecipe;
    out.push({
      kind: 'vendor',
      label: 'Händler',
      labelEn: 'Vendor',
      origin: 'community',
      detail: vr?.vendor
        ? `Händler: ${vr.vendor}.`
        : 'Wird laut Datensatz bei Händlern verkauft. Händlername und Preis sind nicht erfasst.',
      detailEn: vr?.vendor
        ? `Vendor: ${vr.vendor}.`
        : 'Sold by vendors according to dataset. Vendor name and cost not recorded.',
      amount: 'guaranteed',
      caveats: vr ? [] : ['Händler, Standort und Preis nicht erfasst.'],
      caveatsEn: vr ? [] : ['Vendor, location and cost not recorded.'],
      recipe: vr,
    });
  }

  // Handelsgesellschaft: offizielle Daten haben Vorrang vor dem Datensatz-Tag
  const untradable = isUntradable(item);
  if (price && (price.sell > 0 || price.buy > 0) && !untradable) {
    out.push({
      kind: 'trade',
      label: 'Handelsgesellschaft',
      labelEn: 'Trading Post',
      origin: 'official',
      detail: 'Aktuell auf der Handelsgesellschaft gelistet (offizielle Preisdaten).',
      detailEn: 'Currently listed on the Trading Post (official live prices).',
      amount: price.sell > 0 ? 'guaranteed' : 'unknown',
      caveats: price.sell > 0 ? [] : ['Derzeit kein Verkaufsangebot, nur Kaufgesuche.'],
      caveatsEn: price.sell > 0 ? [] : ['Currently no sell listings, buy orders only.'],
    });
  } else if (has('trading_post') && !untradable) {
    out.push({
      kind: 'trade',
      label: 'Handelsgesellschaft',
      labelEn: 'Trading Post',
      origin: 'community',
      detail: 'Laut Datensatz handelbar, aktuell liegt aber kein Preis vor.',
      detailEn: 'Tradable according to dataset, but no current price quote available.',
      amount: 'unknown',
      caveats: ['Kein aktuelles Angebot gefunden.'],
      caveatsEn: ['No active listing found.'],
    });
  }

  const conflicts: string[] = [];
  const conflictsEn: string[] = [];
  if (untradable && has('trading_post')) {
    conflicts.push('Der Datensatz nennt die Handelsgesellschaft, laut offizieller API ist der Gegenstand aber kontogebunden/seelengebunden.');
    conflictsEn.push('Dataset indicates Trading Post, but item is Account Bound/Soulbound according to official API.');
  }
  if (conflicts.length && out.length) {
    out[0].caveats.push(...conflicts);
    out[0].caveatsEn.push(...conflictsEn);
  }

  if (out.length === 0) {
    out.push({
      kind: 'unlock',
      label: 'Beschaffung unbekannt',
      labelEn: 'Source Unknown',
      origin: 'unknown',
      detail: 'Für dieses Material liegen keine verlässlichen Beschaffungsdaten vor.',
      detailEn: 'No reliable acquisition data available for this item.',
      amount: 'unknown',
      caveats: ['Bitte im Wiki recherchieren – es werden keine Quellen geraten.'],
      caveatsEn: ['Please check the GW2 Wiki – sources are not guessed.'],
    });
  }
  return out.sort((a, b) => KIND_META[a.kind].order - KIND_META[b.kind].order);
}
