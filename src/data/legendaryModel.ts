/**
 * Legendary Armory model: vendored community dataset (weapons) +
 * extended catalog (Trinkets, Rings, Amulets, Backpacks, Relic, Armor) +
 * official Legendary Armory list for items missing from the dataset.
 */
import { useMemo } from 'react';
import dataset from './community/legendary-weapons.json';
import { createLegendaryModel } from '../domain/legendary.ts';
import type { CommunityDataset, LegendaryModel } from '../domain/legendary.ts';
import { useArmoryLegendaries } from './gw2/armory.ts';
import { EXTRA_LEGENDARY_ITEMS, EXTRA_LEGENDARY_RECIPES } from './community/legendaryTrinketsAndArmor.ts';

const DATA = dataset as unknown as CommunityDataset;

export function useLegendaryModel(): LegendaryModel {
  const armory = useArmoryLegendaries();
  return useMemo(
    () => createLegendaryModel(DATA, armory, EXTRA_LEGENDARY_ITEMS, EXTRA_LEGENDARY_RECIPES),
    [armory],
  );
}
