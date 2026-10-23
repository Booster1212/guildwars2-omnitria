/**
 * Legendäre-Waffen-Modell: vendorter Community-Datensatz (siehe src/data/community/NOTICE.md) +
 * offizielle Rüstkammer-Liste für Waffen, die dem Datensatz fehlen.
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
