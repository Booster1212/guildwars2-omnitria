// Dev utility: compares Omnitria's planned routes with the bundled GW2Crafts snapshot at LIVE
// Trading Post prices. NOT used at app runtime.
//
// Usage:
//   node scripts/compare-gw2crafts.mjs [--refresh] [--mode=cost|fast|balanced] [--discipline=Weaponsmith]
//        [--ranges=400-425,425-450,450-475,475-500,400-500] [--src=<dir containing domain/>] [--json=<file>]
//
// Prerequisites: scripts/.cache/recipes.json (node scripts/dump-recipes.mjs). Prices and item data
// are fetched from the official API on first use and cached in scripts/.cache (1 h freshness).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CACHE = path.join(ROOT, 'scripts', '.cache');
mkdirSync(CACHE, { recursive: true });
const srcDir = args.src ? path.resolve(args.src) : path.join(ROOT, 'src');
const API = 'https://api.guildwars2.com/v2';

const DISCIPLINES = ['Weaponsmith', 'Armorsmith', 'Artificer', 'Huntsman', 'Leatherworker', 'Tailor', 'Jeweler', 'Chef'];
const disciplines = args.discipline ? String(args.discipline).split(',') : DISCIPLINES;
const mode = args.mode ?? 'cost';
const ranges = String(args.ranges ?? '400-425,425-450,450-475,475-500,400-500,0-400')
  .split(',')
  .map((r) => r.split('-').map(Number));

const raw = JSON.parse(readFileSync(path.join(CACHE, 'recipes.json'), 'utf8'));
const recipes = raw
  .filter((r) => r.disciplines.some((d) => DISCIPLINES.includes(d)))
  .map((r) => ({
    id: String(r.id),
    outputId: r.output_item_id,
    outputCount: r.output_item_count,
    kind: 'official',
    disciplines: r.disciplines.filter((d) => DISCIPLINES.includes(d)),
    rating: r.min_rating,
    ingredients: r.ingredients.map((i) => ({ itemId: i.item_id, count: i.count })),
    source: 'official',
    flags: r.flags,
    type: r.type,
  }));
const recipesByOutput = new Map();
for (const r of recipes) (recipesByOutput.get(r.outputId) ?? recipesByOutput.set(r.outputId, []).get(r.outputId)).push(r);

const ids = new Set();
for (const r of recipes) {
  ids.add(r.outputId);
  for (const i of r.ingredients) ids.add(i.itemId);
}

async function cachedFetch(name, ttlMs, loader) {
  const f = path.join(CACHE, name);
  if (!args.refresh && existsSync(f) && Date.now() - JSON.parse(readFileSync(f, 'utf8')).savedAt < ttlMs) {
    return JSON.parse(readFileSync(f, 'utf8')).value;
  }
  const value = await loader();
  writeFileSync(f, JSON.stringify({ savedAt: Date.now(), value }));
  return value;
}

const idList = [...ids].sort((a, b) => a - b);
const priceRows = await cachedFetch('prices-live.json', 3600_000, async () => {
  const out = [];
  for (let i = 0; i < idList.length; i += 200) {
    const res = await fetch(`${API}/commerce/prices?ids=${idList.slice(i, i + 200).join(',')}`);
    if (res.ok) out.push(...(await res.json()));
  }
  return out;
});
const prices = new Map(
  priceRows.map((p) => [p.id, { sell: p.sells?.unit_price ?? 0, buy: p.buys?.unit_price ?? 0, sellQty: p.sells?.quantity ?? 0, buyQty: p.buys?.quantity ?? 0 }]),
);
const itemRows = await cachedFetch('items-full.json', 14 * 86400_000, async () => {
  const out = [];
  for (let i = 0; i < idList.length; i += 200) {
    const res = await fetch(`${API}/items?ids=${idList.slice(i, i + 200).join(',')}&lang=en`);
    if (res.ok) out.push(...(await res.json()));
  }
  return out;
});
const items = new Map(
  itemRows.map((i) => [i.id, { id: i.id, name: i.name, rarity: i.rarity, type: i.type, level: i.level, flags: i.flags, vendorValue: i.vendor_value }]),
);
const nameOf = (id) => items.get(id)?.name ?? `#${id}`;

const planner = await import(pathToFileURL(path.join(srcDir, 'domain', 'levelPlanner.ts')).href);
const ref = await import(pathToFileURL(path.join(ROOT, 'src', 'domain', 'gw2craftsReference.ts')).href);
const coins = (c) => {
  const v = Math.round(c);
  return `${Math.floor(v / 10000)}g${String(Math.floor((v % 10000) / 100)).padStart(2, '0')}s${String(v % 100).padStart(2, '0')}c`;
};

const results = [];
console.log(`prices: ${prices.size} items, mode=${mode}, planner=${srcDir}\n`);
console.log('discipline'.padEnd(14), 'range'.padEnd(9), 'omnitria'.padStart(12), 'guide'.padStart(12), 'delta%'.padStart(8), 'steps'.padStart(6), 'disc'.padStart(5), 'g.disc'.padStart(7), 'shared'.padStart(7));
for (const discipline of disciplines) {
  for (const [from, to] of ranges) {
    const plan = planner.planLevelRoute({
      discipline,
      fromRank: from,
      toRank: to,
      recipes,
      recipesByOutput,
      prices,
      items,
      options: { allowDiscovery: true, craftIntermediates: true, mode },
    });
    const bench = ref.computeGw2CraftsBenchmark({ discipline, fromRank: from, toRank: to, recipesByOutput, prices });
    const discSteps = plan.steps.filter((s) => s.needsDiscovery);
    const cmp = ref.compareWithGw2Crafts(bench, {
      grossCostCopper: plan.totalCost,
      discoveryRecipeIds: discSteps.map((s) => Number(s.recipe.id)),
      discoveryCount: discSteps.length,
      totalCrafts: plan.totalCrafts,
      operationCount: plan.steps.length,
    });
    const row = {
      discipline,
      range: `${from}-${to}`,
      omnitria: Math.round(plan.totalCost),
      guide: Math.round(bench.costCopper),
      guideStatus: bench.status,
      deltaPercent: Math.round(cmp.deltaPercent),
      steps: plan.steps.length,
      gaps: plan.gaps.length,
      discoveries: discSteps.length,
      guideDiscoveries: bench.discoveryCount,
      shared: cmp.sharedDiscoveries,
      verdict: cmp.verdict,
    };
    results.push(row);
    console.log(
      discipline.padEnd(14),
      row.range.padEnd(9),
      coins(row.omnitria).padStart(12),
      (bench.status === 'unavailable' ? 'n/a' : coins(row.guide)).padStart(12),
      (bench.status === 'unavailable' ? '' : `${row.deltaPercent}%`).padStart(8),
      String(row.steps).padStart(6),
      String(row.discoveries).padStart(5),
      String(row.guideDiscoveries).padStart(7),
      String(row.shared).padStart(7),
      bench.status === 'partial' ? ' (partial guide coverage)' : '',
      row.gaps ? ` [${row.gaps} gap(s)]` : '',
    );
  }
}
if (args.json) writeFileSync(String(args.json), JSON.stringify(results, null, 2));

