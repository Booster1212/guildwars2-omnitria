// Dev: coverage of auto-learned recipes per discipline and rank (assumptions see src/domain/craftingXp.ts)
const R = require('./.cache/recipes.json');
const DISC = ['Armorsmith', 'Weaponsmith', 'Artificer', 'Jeweler', 'Leatherworker', 'Tailor', 'Chef', 'Huntsman'];
const cat = (t) => {
  if (/^Refinement/.test(t) || t === 'IngredientCooking') return ['refinement', 0.3, 25];
  if (['Component', 'Insignia', 'Inscription'].includes(t)) return ['component', 0.6, 25];
  if (['Bulk', 'Dye', 'GuildDecoration', 'LegendaryComponent', 'GuildConsumable', 'GuildConsumableWvw', 'Backpack', 'Bag', 'Consumable', 'Potion'].includes(t)) return null;
  return ['item', 1.4, 40];
};
for (const d of DISC) {
  const rs = R.filter((r) => r.disciplines.includes(d) && (r.flags || []).includes('AutoLearned') && cat(r.type));
  const all = R.filter((r) => r.disciplines.includes(d));
  let gaps = [];
  for (let n = 0; n < 500; n++) {
    const ok = rs.filter((r) => { const [, , span] = cat(r.type); return r.min_rating <= n && n - r.min_rating < span; });
    if (!ok.length) gaps.push(n);
  }
  const maxRating = Math.max(...all.map((r) => r.min_rating));
  const types = {}; rs.forEach((r) => (types[r.type] = (types[r.type] || 0) + 1));
  console.log(d.padEnd(14), 'recipes', all.length, 'autolearned-usable', rs.length, 'max min_rating', maxRating, 'gaps', gaps.length, gaps.length ? `${gaps[0]}..${gaps[gaps.length - 1]}` : '', JSON.stringify(types));
}
