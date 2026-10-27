/**
 * Legendary weapons model: vendored community dataset (see src/data/community/NOTICE.md) +
 * official Legendary Armory list for weapons missing from the dataset.
 */
import { useMemo } from 'react';
import dataset from './community/legendary-weapons.json';
import { createLegendaryModel } from '../domain/legendary';
import type { CommunityDataset, LegendaryModel } from '../domain/legendary';
import { useArmoryWeapons } from './gw2/armory';

const DATA = dataset as unknown as CommunityDataset;

export function useLegendaryModel(): LegendaryModel {
  const armory = useArmoryWeapons();
  return useMemo(() => createLegendaryModel(DATA, armory), [armory]);
}
