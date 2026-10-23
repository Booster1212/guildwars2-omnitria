// Synchronisiert den Community-Datensatz für legendäre Waffen (nur Entwicklung / manuelle Aktualisierung).
//
//   node scripts/sync-community-data.mjs [--ref <git-sha-oder-branch>]
//
// Quelle: https://github.com/PieOrCake/crafty_legend (MIT-Lizenz), Dateien data/CraftyLegend/*.json
// Die offizielle GW2-API enthält KEINE Mystische-Schmiede-Rezepte. Dieser Datensatz liefert die
// Rezeptstruktur (Geschenke, Komponenten, Mengen) und grobe Herkunfts-Tags. Alles andere (Namen, Icons,
// Bindung, Preise, Besitz) kommt zur Laufzeit aus der offiziellen API.
//
// Das Skript
//   1. lädt die Rohdaten an einem festen Commit,
//   2. reduziert sie auf den von legendären WAFFEN erreichbaren Teilgraphen,
//   3. validiert IDs und Waffentypen gegen die offizielle API und gegen /v2/legendaryarmory,
//   4. schreibt src/data/community/legendary-weapons.json.
import { writeFileSync, mkdirSync } from 'node:fs';

const OWNER = 'PieOrCake/crafty_legend';
const UA = { 'User-Agent': 'gw2-overlay-data-sync' };
const refArg = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : 'HEAD';

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

const commit = await json(`https://api.github.com/repos/${OWNER}/commits/${refArg}`);
const sha = commit.sha;
console.log('Commit', sha, commit.commit.committer.date);
const raw = (f) => json(`https://raw.githubusercontent.com/${OWNER}/${sha}/data/CraftyLegend/${f}.json`);
const [{ legendaries }, { recipes }, { items }, { currencies }] = await Promise.all([
  raw('legendaries'),
  raw('recipes'),
  raw('items'),
  raw('currencies'),
]);

const itemById = new Map(items.map((i) => [Number(i.id), i]));
const currencyByName = new Map(currencies.map((c) => [c.name, Number(c.id)]));
const recipeByOut = new Map();
for (const r of recipes) {
  const k = Number(r.output_id);
  if (!recipeByOut.has(k)) recipeByOut.set(k, []);
  recipeByOut.get(k).push(r);
}

const weapons = legendaries.filter((l) => l.type === 'weapon');
const reachableItems = new Set();
const reachableRecipes = new Map();
const unresolvedCurrencies = new Set();

function walk(id) {
  if (reachableItems.has(id)) return;
  reachableItems.add(id);
  for (const r of recipeByOut.get(id) ?? []) {
    reachableRecipes.set(r, true);
    for (const g of r.ingredients) {
      const gid = Number(g.item_id);
      if (gid === 0) {
        if (!currencyByName.has(g.name)) unresolvedCurrencies.add(g.name);
        continue;
      }
      walk(gid);
    }
  }
}
weapons.forEach((w) => walk(Number(w.id)));

// ---- Validierung gegen die offizielle API -------------------------------------------------------
const API = 'https://api.guildwars2.com/v2';
async function batched(endpoint, ids, extra = '') {
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const r = await fetch(`${API}/${endpoint}?ids=${part.join(',')}${extra}`, { headers: UA });
    if (r.status === 404 || r.status === 206) {
      // 206 = teilweise gefunden; fehlende IDs sind einfach nicht im Ergebnis
    } else if (!r.ok) throw new Error(`${endpoint} ${r.status}`);
    const j = await r.json();
    if (Array.isArray(j)) out.push(...j);
  }
  return out;
}

const officialItems = new Map((await batched('items', [...reachableItems], '&lang=en')).map((i) => [i.id, i]));
const missingOfficial = [...reachableItems].filter((id) => !officialItems.has(id));
const nameMismatch = [...reachableItems]
  .filter((id) => officialItems.has(id))
  .filter((id) => (officialItems.get(id).name || '').toLowerCase() !== (itemById.get(id)?.name || '').toLowerCase())
  .map((id) => `${id}: dataset="${itemById.get(id)?.name}" api="${officialItems.get(id).name}"`);

const armory = await json(`${API}/legendaryarmory`);
const armoryItems = new Map((await batched('items', armory, '&lang=en')).map((i) => [i.id, i]));
const officialWeapons = [...armoryItems.values()].filter((i) => i.type === 'Weapon');
const weaponIds = new Set(weapons.map((w) => Number(w.id)));
const officialNotInDataset = officialWeapons.filter((w) => !weaponIds.has(w.id)).map((w) => `${w.id} ${w.name} (${w.details?.type})`);
const datasetNotInArmory = weapons.filter((w) => !armory.includes(Number(w.id))).map((w) => `${w.id} ${w.name}`);

console.log('\n== Validierung ==');
console.log('Waffen im Datensatz:', weapons.length, '| Waffen in /v2/legendaryarmory:', officialWeapons.length);
console.log('Erreichbare Items:', reachableItems.size, '| Rezepte:', reachableRecipes.size);
console.log('Items nicht in offizieller API:', missingOfficial);
console.log('Namensabweichungen (EN):', nameMismatch.length, nameMismatch.slice(0, 10));
console.log('Offizielle Waffen OHNE Datensatz-Rezept:', officialNotInDataset);
console.log('Datensatz-Waffen nicht in Rüstkammer:', datasetNotInArmory);
console.log('Nicht auflösbare Währungen:', [...unresolvedCurrencies]);

// ---- Ausgabe ------------------------------------------------------------------------------------
const outRecipes = [...reachableRecipes.keys()].map((r) => {
  const ing = [];
  const cur = [];
  for (const g of r.ingredients) {
    if (Number(g.item_id) === 0) cur.push([currencyByName.get(g.name) ?? null, g.count, g.name]);
    else ing.push([Number(g.item_id), g.count]);
  }
  const o = {
    out: Number(r.output_id),
    n: r.output_count,
    type: r.type === 'mystic_forge' ? 'mf' : r.type === 'crafting' ? 'craft' : r.type,
    ing,
  };
  if (cur.length) o.cur = cur;
  if (r.disciplines?.length) o.disc = r.disciplines;
  if (r.rating) o.rating = r.rating;
  if (r.vendor) o.vendor = r.vendor;
  return o;
});

const outItems = {};
for (const id of reachableItems) {
  const it = itemById.get(id);
  outItems[id] = { tags: it?.acquisition ?? [] };
}

const out = {
  meta: {
    source: `https://github.com/${OWNER}`,
    license: 'MIT',
    commit: sha,
    commitDate: commit.commit.committer.date,
    syncedAt: new Date().toISOString().slice(0, 10),
    note:
      'Community-gepflegt, nicht offiziell. Die offizielle API enthält keine Mystische-Schmiede-Rezepte. Namen/Icons/Preise stammen zur Laufzeit aus der offiziellen API.',
  },
  weapons: weapons.map((w) => ({
    id: Number(w.id),
    name: w.name,
    type: w.weapon_type,
    gen: w.generation,
  })),
  recipes: outRecipes,
  items: outItems,
};

mkdirSync(new URL('../src/data/community/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/community/legendary-weapons.json', import.meta.url), JSON.stringify(out));
console.log('\nGeschrieben: src/data/community/legendary-weapons.json', (JSON.stringify(out).length / 1024).toFixed(1), 'KB');
