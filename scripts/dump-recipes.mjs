// Entwicklungs-Hilfsskript: lädt alle Rezepte der offiziellen GW2-API in scripts/.cache/recipes.json
// zur Analyse (Disziplinen, Rating-Verteilung, Flags). Wird zur Laufzeit der App NICHT benötigt.
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
