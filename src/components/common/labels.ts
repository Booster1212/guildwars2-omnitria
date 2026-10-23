import { DisciplineId, Rarity } from '../../domain/types';

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

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('de-DE');
export const fmtQty = (n: number): string =>
  Number.isInteger(n) ? fmtInt(n) : n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
export const pct = (f: number): string => `${Math.floor(Math.max(0, Math.min(1, f)) * 100 + 1e-9)} %`;

export function relTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return `vor ${Math.floor(s / 86400)} Tg.`;
}
