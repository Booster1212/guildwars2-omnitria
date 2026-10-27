import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./.cache/recipes.json', import.meta.url), 'utf8'));
const DISCIPLINES = ['Armorsmith', 'Weaponsmith', 'Artificer', 'Jeweler', 'Leatherworker', 'Tailor', 'Chef', 'Huntsman'];
const curated = [];

for (const disc of DISCIPLINES) {
  const discRecipes = data.filter(
    (r) =>
      r.disciplines &&
      r.disciplines.includes(disc) &&
      (!r.flags || (!r.flags.includes('AutoLearned') && !r.flags.includes('LearnedFromItem')))
  );
  const tiers = [0, 75, 150, 225, 300, 400];
  for (const rating of tiers) {
    const tierRecs = discRecipes.filter((r) => r.min_rating === rating);
    for (const r of tierRecs.slice(0, 5)) {
      curated.push({
        id: String(r.id),
        outputId: r.output_item_id,
        outputCount: r.output_item_count,
        kind: 'official',
        disciplines: r.disciplines,
        rating: r.min_rating,
        type: r.type,
        flags: r.flags || [],
        source: 'official',
        ingredients: r.ingredients.map((i) => ({ itemId: i.item_id, count: i.count })),
      });
    }
  }
}

const content = `import type { Recipe } from '../../domain/types';

/**
 * Pre-bundled discovery recipes for instant start without waiting time,
 * structured across all 8 crafting disciplines and rank tiers (0, 75, 150, 225, 300, 400).
 * As soon as the full recipe database is loaded, it is automatically augmented.
 */
export const CURATED_DISCOVERIES: Recipe[] = ${JSON.stringify(curated, null, 2)};
`;

mkdirSync(new URL('../src/data/crafting/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/crafting/curatedDiscoveries.ts', import.meta.url), content, 'utf8');
console.log('Successfully written curatedDiscoveries.ts with ' + curated.length + ' recipes');
