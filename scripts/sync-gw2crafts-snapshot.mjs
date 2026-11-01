// Dev utility: builds src/data/crafting/gw2craftsSnapshot.ts from the public GW2Crafts guides
// (https://gw2crafts.net/, by xanthic.9478 - reuse permitted with attribution, see site FAQ).
//
// NOT needed at app runtime. The generated snapshot is a static, offline reference that the
// planner uses for its optional cross-check. GW2Crafts is never contacted by the app itself.
//
// Usage:  node scripts/sync-gw2crafts-snapshot.mjs [--refresh]
//   --refresh  ignore the local HTML / item-name caches in scripts/.cache and download again.
//
// What is stored: structure only (levels, Make quantities, discovery combinations, shopping-list
// quantities per acquisition section). GW2Crafts' own prices are only kept as the headline totals
// so the UI can show "as reported at snapshot time"; the benchmark is always re-priced with the
// player's own Trading Post data.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const REFRESH = process.argv.includes('--refresh');
const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('scripts/.cache/', ROOT);
const HTML_CACHE = new URL('scripts/.cache/gw2crafts/', ROOT);
mkdirSync(HTML_CACHE, { recursive: true });

const API = 'https://api.guildwars2.com/v2';
const SITE = 'https://gw2crafts.net';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Guide manifest. `file` is the path below the site root (without .html). */
const DISCIPLINES = {
  Weaponsmith: { normal: 'weaponcraft', fast: 'weaponcraft_fast', mid: 'weaponcraft_400', short: 'weaponcraft_450' },
  Armorsmith: { normal: 'armorcraft', fast: 'armorcraft_fast', mid: 'armorcraft_400', short: 'armorcraft_450' },
  Artificer: { normal: 'artificing', fast: 'artificing_fast', mid: 'artificing_400', short: 'artificing_450' },
  Huntsman: { normal: 'huntsman', fast: 'huntsman_fast', mid: 'huntsman_400', short: 'huntsman_450' },
  Leatherworker: { normal: 'leatherworking', fast: 'leatherworking_fast', mid: 'leatherworking_400', short: 'leatherworking_450' },
  Tailor: { normal: 'tailor', fast: 'tailor_fast', mid: 'tailor_400', short: 'tailor_450' },
  Jeweler: { normal: 'jewelcraft', fast: 'jewelcraft_fast' },
  Chef: { normal: 'cooking', fast: 'cooking_fast', short: 'cooking_450' },
};

const manifest = [];
for (const [discipline, g] of Object.entries(DISCIPLINES)) {
  if (g.normal) manifest.push({ id: g.normal, file: g.normal, discipline, variant: 'normal', fromRank: 0, toRank: 400 });
  if (g.fast) manifest.push({ id: g.fast, file: g.fast, discipline, variant: 'fast', fromRank: 0, toRank: 400 });
  if (g.mid) manifest.push({ id: g.mid, file: g.mid, discipline, variant: 'normal', fromRank: 400, toRank: 500 });
  if (g.short) manifest.push({ id: g.short, file: g.short, discipline, variant: 'normal', fromRank: 400, toRank: 450 });
  // F2P guides exist for the 400-500 range only. Keep their headline totals to document the
  // difference; they are never used as the economic benchmark.
  if (g.mid) manifest.push({ id: `f2p_${g.mid}`, file: `f2p/${g.mid}`, discipline, variant: 'f2p', fromRank: 400, toRank: 500, metaOnly: true });
}

async function fetchText(url, cacheName) {
  const f = new URL(cacheName, HTML_CACHE);
  if (!REFRESH && existsSync(f)) return readFileSync(f, 'utf8');
  const res = await fetch(url, { headers: { 'User-Agent': 'Omnitria-snapshot-script (+https://github.com/Booster1212/guildwars2-omnitria)' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const text = await res.text();
  writeFileSync(f, text);
  await sleep(900); // be polite to a community-run site
  return text;
}

// ---------------------------------------------------------------------------------------------
// Recipes + item names (for name -> ID resolution)
// ---------------------------------------------------------------------------------------------
async function loadRecipes() {
  const f = new URL('recipes.json', CACHE);
  if (!existsSync(f)) {
    console.log('recipes.json missing -> downloading (node scripts/dump-recipes.mjs)');
    const first = await fetch(`${API}/recipes?page=0&page_size=200`);
    const pages = Number(first.headers.get('X-Page-Total'));
    const all = [...(await first.json())];
    for (let p = 1; p < pages; p++) all.push(...(await (await fetch(`${API}/recipes?page=${p}&page_size=200`)).json()));
    writeFileSync(f, JSON.stringify(all));
  }
  return JSON.parse(readFileSync(f, 'utf8'));
}

async function loadItemNames(ids) {
  const f = new URL('item-names-en.json', CACHE);
  const cache = !REFRESH && existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  const missing = ids.filter((id) => !(id in cache));
  for (let i = 0; i < missing.length; i += 200) {
    const chunk = missing.slice(i, i + 200);
    const res = await fetch(`${API}/items?ids=${chunk.join(',')}&lang=en`);
    if (res.ok) for (const it of await res.json()) cache[it.id] = it.name;
    for (const id of chunk) if (!(id in cache)) cache[id] = null;
  }
  if (missing.length) writeFileSync(f, JSON.stringify(cache));
  return cache;
}

// ---------------------------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------------------------
const decode = (s) =>
  s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parseCoins(html) {
  // Two renderings exist: <span class="mygold">N</span> and "N<span class="goldIcon">".
  const pick = (cls, icon) =>
    Number(
      new RegExp('class="' + cls + '">(\\d+)').exec(html)?.[1] ??
        new RegExp('(\\d+)\\s*<span class="' + icon + '"').exec(html)?.[1] ??
        0,
    );
  return pick('mygold', 'goldIcon') * 10000 + pick('mysilver', 'silverIcon') * 100 + pick('mycopper', 'copperIcon');
}

function parseHeader(html) {
  const out = {};
  const re = /<dt>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g;
  let m;
  while ((m = re.exec(html))) {
    const k = m[1].trim().toLowerCase();
    const v = parseCoins(m[2]);
    if (k.startsWith('initial')) out.initial ??= v;
    else if (k.startsWith('expected recovery')) out.recovery ??= v;
    else if (k.startsWith('expected final')) out.final ??= v;
  }
  return out;
}

const SECTION_KEYS = [
  ['BUY VENDOR', 'vendor'],
  ['BUY RECIPES', 'recipes'],
  ['COLLECTIBLES', 'collectible'],
  ['Mixed (Buy on TP)', 'mixed'],
];

function sectionSlices(html) {
  const marks = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => ({ title: strip(m[1]), at: m.index }));
  return marks.map((m, i) => ({ ...m, end: i + 1 < marks.length ? marks[i + 1].at : html.length }));
}

function parseShopping(html) {
  const shopping = [];
  const recipePurchases = [];
  for (const sec of sectionSlices(html)) {
    const key = SECTION_KEYS.find(([t]) => sec.title.startsWith(t))?.[1];
    if (!key) continue;
    const body = html.slice(sec.at, sec.end);
    if (key === 'recipes') {
      for (const row of body.matchAll(/<button[^>]*id="(\d+)"[^>]*>([^<]+)<\/button><div class="lsbutton"[^>]*>([\s\S]*?)<\/div>/g)) {
        const text = strip(row[3]);
        const num = Number(/^(\d+)/.exec(text)?.[1] ?? 0);
        const isKarma = /karmaIcon/.test(row[3]);
        recipePurchases.push({
          sheetItemId: Number(row[1]),
          name: decode(row[2]),
          costKarma: isKarma ? num : 0,
          costCopper: isKarma ? 0 : parseCoins(row[3]) || num,
        });
      }
      continue;
    }
    for (const row of body.matchAll(/<div class="s[01]">([\s\S]*?)<\/div>(?=\s*<div class="s[01]">|\s*<br|\s*<dl|\s*$)/g)) {
      const r = row[1];
      const id = /data-item="(\d+)"/.exec(r)?.[1];
      if (!id) continue;
      const need = Number(/data-original-need="(\d+)"/.exec(r)?.[1] ?? 0);
      const unit = Number(/raw_copper="(\d+)"/.exec(r)?.[1] ?? 0);
      const name = decode(/>([^<>]+)<\/(?:span|button)>/.exec(r.replace(/<span class="itemIcon"[^>]*><\/span>/, ''))?.[1] ?? '');
      const bulkKarma = /karmaIcon[\s\S]*?per\s+(\d+)/.exec(r);
      shopping.push({
        itemId: Number(id),
        name,
        need,
        section: key,
        listedUnitCopper: unit,
        ...(bulkKarma ? { karmaBulk: Number(bulkKarma[1]) } : {}),
      });
    }
  }
  return { shopping, recipePurchases };
}

function parseBlocks(html) {
  const starts = [...html.matchAll(/<div class="level-block" data-level="(\d+)">/g)];
  return starts.map((m, i) => {
    const level = Number(m[1]);
    const body = html.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : html.length);
    const makes = [];
    for (const mk of body.matchAll(/Make:\s*(\d+)\s*<span[^>]*>([^<]+)<\/span>/g)) {
      makes.push({ qty: Number(mk[1]), name: decode(mk[2]) });
    }
    const discoveries = [];
    for (const d of body.matchAll(/Discover:\s*<button[^>]*id="(\d+)"[^>]*>([^<]+)<\/button>\s*<div class="sbutton"[^>]*>([\s\S]*?)<\/div>/g)) {
      const rawId = d[1];
      const levelStr = String(level);
      const itemId = Number(rawId.endsWith(levelStr) ? rawId.slice(0, -levelStr.length) : rawId);
      const ingredients = [];
      for (const ing of d[3].matchAll(/<span class="[^"]*select_text">([^<]+)<\/span>\s*\((\d+)\)/g)) {
        ingredients.push({ name: decode(ing[1]), count: Number(ing[2]) });
      }
      discoveries.push({ outputItemId: itemId, outputName: decode(d[2]), ingredients });
    }
    return { level, makes, discoveries };
  });
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------
const recipes = await loadRecipes();
const byDiscipline = new Map();
const wantedIds = new Set();
for (const r of recipes) {
  for (const d of r.disciplines) {
    if (!(d in DISCIPLINES)) continue;
    (byDiscipline.get(d) ?? byDiscipline.set(d, []).get(d)).push(r);
    wantedIds.add(r.output_item_id);
    for (const ing of r.ingredients) wantedIds.add(ing.item_id);
  }
}
const names = await loadItemNames([...wantedIds].sort((a, b) => a - b));
const nameOf = (id) => names[id] ?? null;

const guides = [];
const problems = [];

for (const entry of manifest) {
  let html;
  try {
    html = await fetchText(`${SITE}/${entry.file}.html`, `${entry.id}.html`);
  } catch (e) {
    problems.push(`${entry.id}: download failed (${e.message})`);
    continue;
  }
  const header = parseHeader(html);
  const updated = /Updated:\s*<span class="localtime">([^<]+)/.exec(html)?.[1] ?? null;
  const guide = {
    guideId: entry.id,
    url: `${SITE}/${entry.file}.html`,
    discipline: entry.discipline,
    variant: entry.variant,
    fromRank: entry.fromRank,
    toRank: entry.toRank,
    guideUpdatedAt: updated,
    reportedInitialCopper: header.initial ?? 0,
    reportedRecoveryCopper: header.recovery ?? 0,
    reportedFinalCopper: header.final ?? 0,
    blocks: [],
    shopping: [],
    recipePurchases: [],
  };
  if (entry.metaOnly) {
    guides.push(guide);
    continue;
  }

  const recs = byDiscipline.get(entry.discipline) ?? [];
  const recsByOutName = new Map();
  for (const r of recs) {
    const n = nameOf(r.output_item_id);
    if (!n) continue;
    (recsByOutName.get(n) ?? recsByOutName.set(n, []).get(n)).push(r);
  }

  const { shopping, recipePurchases } = parseShopping(html);
  guide.shopping = shopping.map(({ name, ...rest }) => rest);
  guide.recipePurchases = recipePurchases.map(({ name, ...rest }) => rest);

  const nameToIds = new Map();
  const addName = (id) => {
    const n = nameOf(id);
    if (n) (nameToIds.get(n) ?? nameToIds.set(n, new Set()).get(n)).add(id);
  };
  for (const r of recs) {
    addName(r.output_item_id);
    for (const ing of r.ingredients) addName(ing.item_id);
  }
  for (const s of shopping) (nameToIds.get(s.name) ?? nameToIds.set(s.name, new Set()).get(s.name)).add(s.itemId);

  const idsByName = (n) => [...(nameToIds.get(n) ?? [])];
  const blocks = parseBlocks(html);

  // Items this guide discovers: a later "Make" of an ambiguous name refers to the discovered one.
  const discoveredHere = new Set(blocks.flatMap((b) => b.discoveries.map((d) => d.outputItemId)));
  for (const b of blocks) {
    const makes = [];
    for (const mk of b.makes) {
      const cands = (recsByOutName.get(mk.name) ?? []).filter((r) => r.min_rating <= b.level + 24);
      let outIds = [...new Set(cands.map((r) => r.output_item_id))];
      if (outIds.length > 1) {
        const preferred = outIds.filter((id) => discoveredHere.has(id));
        if (preferred.length === 1) outIds = preferred;
      }
      if (outIds.length === 0) {
        problems.push(`${entry.id} L${b.level}: Make "${mk.name}" has no recipe in ${entry.discipline}`);
        continue;
      }
      if (outIds.length > 1) problems.push(`${entry.id} L${b.level}: Make "${mk.name}" is ambiguous (${outIds.join(',')})`);
      makes.push({ itemId: outIds[0], qty: mk.qty });
    }

    const discoveries = [];
    for (const d of b.discoveries) {
      const ingIds = d.ingredients.map((i) => ({ ids: idsByName(i.name), count: i.count, name: i.name }));
      const unresolved = ingIds.filter((i) => i.ids.length === 0);
      if (unresolved.length) {
        problems.push(`${entry.id} L${b.level}: Discover "${d.outputName}" - unknown ingredient ${unresolved.map((u) => u.name).join(', ')}`);
      }
      // Find the recipe: same output item, identical ingredient multiset.
      const cands = recs.filter((r) => r.output_item_id === d.outputItemId);
      const matches = cands.filter((r) => {
        if (r.ingredients.length !== ingIds.length) return false;
        return ingIds.every((ing) => r.ingredients.some((ri) => ing.ids.includes(ri.item_id) && ri.count === ing.count));
      });
      if (matches.length !== 1) {
        problems.push(
          `${entry.id} L${b.level}: Discover "${d.outputName}" (${d.outputItemId}) matched ${matches.length} recipes (${cands.length} candidates)`,
        );
      }
      const recipe = matches[0] ?? null;
      discoveries.push({
        outputItemId: d.outputItemId,
        recipeId: recipe ? recipe.id : null,
        ingredients: recipe
          ? recipe.ingredients.map((ri) => ({ itemId: ri.item_id, count: ri.count }))
          : ingIds.filter((i) => i.ids[0]).map((i) => ({ itemId: i.ids[0], count: i.count })),
      });
    }
    guide.blocks.push({ level: b.level, makes, discoveries });
  }
  guides.push(guide);
  console.log(
    `${entry.id}: ${guide.blocks.length} blocks, ${guide.blocks.reduce((s, b) => s + b.discoveries.length, 0)} discoveries, ` +
      `${guide.blocks.reduce((s, b) => s + b.makes.length, 0)} make rows, ${shopping.length} shopping lines`,
  );
}

const header = `// AUTO-GENERATED by scripts/sync-gw2crafts-snapshot.mjs - do not edit by hand.
//
// Structural snapshot of the community guides at https://gw2crafts.net/ (by xanthic.9478; reuse is
// permitted with attribution per the site FAQ). Only structure is stored (levels, Make quantities,
// discovery combinations, shopping quantities). The reported headline totals reflect GW2Crafts'
// own prices at the snapshot time and are informational only - the planner always re-prices the
// route with the player's live Trading Post data.
import type { Gw2CraftsGuideSnapshot } from '../../domain/gw2craftsReference.ts';

export const GW2CRAFTS_SNAPSHOT_DATE = '${new Date().toISOString().slice(0, 10)}';

export const GW2CRAFTS_GUIDES: readonly Gw2CraftsGuideSnapshot[] = `;

writeFileSync(new URL('src/data/crafting/gw2craftsSnapshot.ts', ROOT), header + JSON.stringify(guides) + ';\n');
console.log(`\nwrote ${guides.length} guides`);
if (problems.length) {
  console.log(`\n${problems.length} resolution problem(s):`);
  for (const p of problems) console.log(' - ' + p);
  writeFileSync(new URL('gw2crafts-problems.txt', CACHE), problems.join('\n'));
}
