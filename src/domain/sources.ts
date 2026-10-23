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
  origin: Origin;
  detail: string;
  /** "garantiert" | "zufällig" | "unbekannt" */
  amount: 'guaranteed' | 'random' | 'unknown';
  caveats: string[];
  recipe?: Recipe;
}

export const KIND_META: Record<SourceKind, { label: string; order: number }> = {
  gather: { label: 'Direkt sammelbar', order: 1 },
  drop: { label: 'Gegnerbeute', order: 2 },
  salvage: { label: 'Verwertung', order: 3 },
  craft: { label: 'Handwerk', order: 4 },
  forge: { label: 'Mystische Schmiede', order: 5 },
  unlock: { label: 'Erfolg / Sammlung / Freischaltung', order: 6 },
  vendor: { label: 'Händler', order: 7 },
  trade: { label: 'Handelsgesellschaft', order: 8 },
};

const UNLOCK_LABELS: Record<string, string> = {
  achievement: 'Erfolg',
  collection: 'Sammlung',
  map_completion: 'Kartenabschluss',
  reward_track: 'Belohnungspfad',
  homestead: 'Homestead',
  legendary_armory: 'Legendäre Rüstkammer',
  map_reward: 'Kartenbelohnung',
  pvp: 'PvP-Belohnung',
  wvw: 'WvW-Belohnung',
  map_currency: 'Kartenwährung',
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
      origin: 'community',
      detail: 'Wird an Rohstoffknoten gesammelt. Welche Knoten/Gebiete genau, ist im Datensatz nicht erfasst.',
      amount: 'unknown',
      caveats: ['Menge pro Knoten und Fundorte nicht erfasst – bitte im Wiki prüfen.'],
    });
  }
  if (has('drop')) {
    out.push({
      kind: 'drop',
      label: 'Gegnerbeute',
      origin: 'community',
      detail: 'Fällt als Beute von Gegnern. Quellen und Droprate sind nicht erfasst.',
      amount: 'random',
      caveats: ['Kein garantierter Drop.'],
    });
  }
  if (has('salvage')) {
    out.push({
      kind: 'salvage',
      label: 'Verwertung',
      origin: 'community',
      detail: 'Entsteht beim Verwerten von Gegenständen.',
      amount: 'random',
      caveats: ['Zufallsergebnis – Menge nicht garantiert.', 'Welche Gegenstände sich eignen, ist nicht erfasst.'],
    });
  }
  if (recipe && recipe.kind !== 'mf' && recipe.kind !== 'vendor') {
    out.push({
      kind: 'craft',
      label: 'Handwerk',
      origin: recipe.source === 'official' ? 'official' : 'community',
      detail: recipe.disciplines.length
        ? `Herstellbar (${recipe.disciplines.join(', ')}${recipe.rating ? `, ab Rang ${recipe.rating}` : ''}).`
        : 'Herstellbar.',
      amount: 'guaranteed',
      caveats: [],
      recipe,
    });
  } else if (has('crafting')) {
    out.push({
      kind: 'craft',
      label: 'Handwerk',
      origin: 'community',
      detail: 'Laut Datensatz herstellbar; Rezept ist nicht aufgeschlüsselt.',
      amount: 'unknown',
      caveats: ['Rezeptdetails fehlen.'],
    });
  }
  if (recipe && recipe.kind === 'mf') {
    const random = recipe.yield !== undefined && recipe.yield < 1;
    out.push({
      kind: 'forge',
      label: 'Mystische Schmiede',
      origin: 'community',
      detail: random
        ? `Zufallsrezept: ${recipe.outputCount} Ausgabe(n) bei Erfolg, geschätzte Erfolgsquote ${Math.round((recipe.yield ?? 1) * 100)} %.`
        : 'Rezept der Mystischen Schmiede (deterministisch).',
      amount: random ? 'random' : 'guaranteed',
      caveats: random ? ['Erwartungswert, tatsächlicher Verbrauch schwankt.'] : [],
      recipe,
    });
  } else if (has('mystic_forge')) {
    out.push({
      kind: 'forge',
      label: 'Mystische Schmiede',
      origin: 'community',
      detail: 'Laut Datensatz in der Mystischen Schmiede erhältlich; Rezept nicht aufgeschlüsselt.',
      amount: 'unknown',
      caveats: ['Rezeptdetails fehlen.'],
    });
  }
  for (const t of tags) {
    if (!UNLOCK_TAGS.has(t)) continue;
    out.push({
      kind: 'unlock',
      label: UNLOCK_LABELS[t],
      origin: 'community',
      detail: `Erhältlich über: ${UNLOCK_LABELS[t]}. Voraussetzungen (Erfolge, Meisterschaften, Währungen) sind im Spiel zu prüfen.`,
      amount: 'guaranteed',
      caveats: ['Voraussetzungen nicht vollständig erfasst.'],
    });
  }
  if (has('vendor')) {
    const vr = vendorRecipe;
    out.push({
      kind: 'vendor',
      label: 'Händler',
      origin: 'community',
      detail: vr?.vendor
        ? `Händler: ${vr.vendor}.`
        : 'Wird laut Datensatz bei Händlern verkauft. Händlername und Preis sind nicht erfasst.',
      amount: 'guaranteed',
      caveats: vr ? [] : ['Händler, Standort und Preis nicht erfasst.'],
      recipe: vr,
    });
  }

  // Handelsgesellschaft: offizielle Daten haben Vorrang vor dem Datensatz-Tag
  const untradable = isUntradable(item);
  if (price && (price.sell > 0 || price.buy > 0) && !untradable) {
    out.push({
      kind: 'trade',
      label: 'Handelsgesellschaft',
      origin: 'official',
      detail: 'Aktuell auf der Handelsgesellschaft gelistet (offizielle Preisdaten).',
      amount: price.sell > 0 ? 'guaranteed' : 'unknown',
      caveats: price.sell > 0 ? [] : ['Derzeit kein Verkaufsangebot, nur Kaufgesuche.'],
    });
  } else if (has('trading_post') && !untradable) {
    out.push({
      kind: 'trade',
      label: 'Handelsgesellschaft',
      origin: 'community',
      detail: 'Laut Datensatz handelbar, aktuell liegt aber kein Preis vor.',
      amount: 'unknown',
      caveats: ['Kein aktuelles Angebot gefunden.'],
    });
  }

  const conflicts: string[] = [];
  if (untradable && has('trading_post')) {
    conflicts.push('Der Datensatz nennt die Handelsgesellschaft, laut offizieller API ist der Gegenstand aber kontogebunden/seelengebunden.');
  }
  if (conflicts.length && out.length) out[0].caveats.push(...conflicts);

  if (out.length === 0) {
    out.push({
      kind: 'unlock',
      label: 'Beschaffung unbekannt',
      origin: 'unknown',
      detail: 'Für dieses Material liegen keine verlässlichen Beschaffungsdaten vor.',
      amount: 'unknown',
      caveats: ['Bitte im Wiki recherchieren – es werden keine Quellen geraten.'],
    });
  }
  return out.sort((a, b) => KIND_META[a.kind].order - KIND_META[b.kind].order);
}
