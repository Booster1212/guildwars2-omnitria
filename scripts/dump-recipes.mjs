// Dev utility script: fetches all recipes from official GW2 API into scripts/.cache/recipes.json
// for analysis (disciplines, rating distribution, flags). NOT needed at app runtime.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://api.guildwars2.com/v2';
mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });

const first = await fetch(`${BASE}/recipes?page=0&page_size=200`);
const pages = Number(first.headers.get('X-Page-Total'));
const total = Number(first.headers.get('X-Result-Total'));
console.log('pages', pages, 'total', total);
const all = [...(await first.json())];
for (let p = 1; p < pages; p++) {
  const r = await fetch(`${BASE}/recipes?page=${p}&page_size=200`);
  if (!r.ok) throw new Error('page ' + p + ' ' + r.status);
  all.push(...(await r.json()));
}
writeFileSync(new URL('./.cache/recipes.json', import.meta.url), JSON.stringify(all));
console.log('saved', all.length);
