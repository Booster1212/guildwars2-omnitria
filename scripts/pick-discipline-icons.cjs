// Dev: select discipline icon candidates (real GW2 item icons)
const R = require('./.cache/recipes.json');
const pick = {
  Armorsmith: 'Coat',
  Weaponsmith: 'Sword',
  Artificer: 'Scepter',
  Jeweler: 'Amulet',
  Leatherworker: 'Coat',
  Tailor: 'Coat',
  Chef: 'Meal',
  Huntsman: 'LongBow',
};
(async () => {
  for (const [d, t] of Object.entries(pick)) {
    const rs = R.filter((r) => r.type === t && r.disciplines.length === 1 && r.disciplines[0] === d).sort((a, b) => b.min_rating - a.min_rating);
    const ids = [...new Set(rs.slice(0, 40).map((r) => r.output_item_id))].slice(0, 30);
    const res = await fetch('https://api.guildwars2.com/v2/items?lang=en&ids=' + ids.join(','));
    const items = await res.json();
    const best = items.filter((i) => ['Ascended', 'Exotic', 'Rare'].includes(i.rarity)).slice(0, 3);
    console.log(d, t, best.map((i) => `${i.id} ${i.name} [${i.rarity}] ${i.icon}`).join('\n    '));
  }
})();
