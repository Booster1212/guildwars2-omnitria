import React, { useState, useMemo } from 'react';
import type { DisciplineId } from '../../domain/types';
import { maxRankOf } from '../../domain/levelPlanner';
import { DISCIPLINES, useRecipeDb } from '../../data/gw2/recipes';
import { useLegendaryModel } from '../../data/legendaryModel';
import { useItems } from '../../data/gw2/items';
import { DISCIPLINE_ICON_ITEM } from '../common/labels';
import { DisciplineList } from './DisciplineList';
import { DisciplineDetail } from './DisciplineDetail';
import { MaterialDetail } from '../material/MaterialDetail';

export const CraftingView: React.FC = React.memo(() => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineId>('Weaponsmith');
  const [materialHistory, setMaterialHistory] = useState<number[]>([]);
  const recipeDb = useRecipeDb(true);
  const model = useLegendaryModel();

  // Automatically preload discipline items into items cache
  const discItemIds = useMemo(() => Object.values(DISCIPLINE_ICON_ITEM), []);
  useItems(discItemIds);

  // Compute maximum ranks for all 8 disciplines from official recipes
  const maxRanks = useMemo(() => {
    const res: Record<string, number> = {};
    for (const d of DISCIPLINES) {
      if (d === 'Jeweler') {
        res[d] = 400; // Jeweler cap is 400
      } else {
        const computed = maxRankOf(d, recipeDb.recipes);
        res[d] = computed > 0 ? computed : 500;
      }
    }
    return res;
  }, [recipeDb.recipes]);

  const activeMaterialId = materialHistory[materialHistory.length - 1] ?? null;

  const handleOpenItem = (id: number) => {
    if (!id || id <= 0) return;
    setMaterialHistory((prev) => (prev[prev.length - 1] === id ? prev : [...prev, id]));
  };

  const handleBackMaterial = () => {
    setMaterialHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleCloseMaterial = () => {
    setMaterialHistory([]);
  };

  return (
    <div className="gw2-master-detail-layout crafting-layout">
      {/* Left Master Pane: Discipline List */}
      <div className="master-pane">
        <DisciplineList
          selectedDiscipline={selectedDiscipline}
          onSelectDiscipline={setSelectedDiscipline}
          maxRanks={maxRanks}
        />
      </div>

      {/* Right Detail Pane: Discipline Planner & Recipes */}
      <div className="detail-pane">
        <DisciplineDetail
          discipline={selectedDiscipline}
          maxRank={maxRanks[selectedDiscipline] ?? 500}
          onOpenItem={handleOpenItem}
        />
      </div>

      {/* Material Detail Drawer if an item is inspected */}
      {activeMaterialId !== null && (
        <MaterialDetail
          itemId={activeMaterialId}
          model={model}
          need={null}
          canGoBack={materialHistory.length > 1}
          onBack={handleBackMaterial}
          onClose={handleCloseMaterial}
          onOpenItem={handleOpenItem}
        />
      )}
    </div>
  );
});
