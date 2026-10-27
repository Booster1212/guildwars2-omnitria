// Analysis of community dataset (dev only)
const L = require('./.cache/cl/legendaries.json').legendaries;
const R = require('./.cache/cl/recipes.json').recipes;
const I = require('./.cache/cl/items.json').items;
const C = require('./.cache/cl/currencies.json').currencies;
const items = new Map(I.map((i) => [String(i.id), i]));
const byOut = new Map();
R.forEach((r) => { const k = String(r.output_id); if (!byOut.has(k)) byOut.set(k, []); byOut.get(k).push(r); });
console.log('outputs with >1 recipe:', [...byOut.entries()].filter(([, v]) => v.length > 1).length);
const multi = [...byOut.entries()].filter(([, v]) => v.length > 1).slice(0, 8);
multi.forEach(([k, v]) => console.log(' multi', k, items.get(k)?.name, v.map((r) => r.type + ':' + r.ingredients.map((x) => x.count + 'x' + x.name).join(',')).join('  ||  ')));
const weapons = L.filter((x) => x.type === 'weapon');
const leaves = new Map(); const missing = new Set(); const zero = new Map();
function walk(id, seen = new Set()) {
  const rs = byOut.get(String(id));
  if (!rs) { const it = items.get(String(id)); if (!it) missing.add(id); else leaves.set(id, it); return; }
  if (seen.has(id)) return; const s2 = new Set(seen).add(id);
  rs.forEach((r) => r.ingredients.forEach((g) => {
    if (g.item_id === '0') { zero.set(g.name, (zero.get(g.name) || 0) + 1); return; }
    walk(g.item_id, s2);
  }));
}
const noRecipe = [];
weapons.forEach((w) => { if (!byOut.get(String(w.id))) noRecipe.push(w.name); walk(w.id); });
console.log('weapons w/o recipe:', noRecipe);
console.log('leaves', leaves.size, 'missing items', [...missing]);
const acq = {}; leaves.forEach((it) => { const k = (it.acquisition || ['none']).join('+'); acq[k] = (acq[k] || 0) + 1; });
console.log(acq);
console.log('zero-id ingredient names (currencies?)', [...zero.entries()].slice(0, 60));
const curNames = new Set(C.map((c) => c.name));
console.log('zero names not in currencies.json:', [...zero.keys()].filter((n) => !curNames.has(n)));
console.log('leaves with no acquisition', [...leaves.values()].filter((i) => !i.acquisition || !i.acquisition.length).map((i) => i.name + '#' + i.id).slice(0, 30));
// Sample: Aurene's Wing
const w = weapons.find((x) => x.name === "Aurene's Wing"); console.log(JSON.stringify(byOut.get(String(w.id)), null, 1));
console.log('weapon 15 recipes'); weapons.filter((x) => x.generation === 15).forEach((x) => console.log(x.name, JSON.stringify(byOut.get(String(x.id)))?.slice(0, 700)));
