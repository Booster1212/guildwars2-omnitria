import React, { useState, useMemo } from 'react';
import { useLegendaryModel } from '../../data/legendaryModel';
import { useAccountState } from '../../data/gw2/account';
import { useProgress } from '../../data/progressStore';
import { buildTree } from '../../domain/recipeTree';
import type { Gw2AccountAchievement } from '../../data/gw2Api';
import { useItems } from '../../data/gw2/items';
import { WeaponList } from './WeaponList';
import { WeaponDetail } from './WeaponDetail';
import { MaterialDetail } from '../material/MaterialDetail';
import { useTranslation } from '../../i18n';

interface LegendaryViewProps {
  userAchievements: Map<number, Gw2AccountAchievement>;
}

export const LegendaryView: React.FC<LegendaryViewProps> = ({ userAchievements }) => {
  const { lang } = useTranslation();
  const model = useLegendaryModel();
  const account = useAccountState();
  const progress = useProgress();

  // Automatically preload all legendary weapon items and icons in bulk
  const allWeaponIds = useMemo(() => model.weapons.map((w) => w.id), [model.weapons]);
  useItems(allWeaponIds);

  // Default to first weapon (e.g. Sunrise or Bolt or Eternity)
  const [selectedWeaponId, setSelectedWeaponId] = useState<number>(() => {
    return model.weapons[0]?.id ?? 30689;
  });

  const [materialHistory, setMaterialHistory] = useState<number[]>([]);

  // Compute progress percentage map for all weapons
  const weaponProgressMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const w of model.weapons) {
      if (!w.hasRecipe) {
        map[w.id] = 0;
        continue;
      }
      const p = progress.legendary[String(w.id)];
      const res = buildTree(w.id, 1, model, {
        stock: account.stockMap,
        doneNodes: new Set(p?.doneNodes ?? []),
        doneMaterials: new Set(p?.doneMaterials ?? []),
        buyItems: new Set(p?.buyItems ?? []),
      });
      map[w.id] = res.progress;
    }
    return map;
  }, [model, account.stockMap, progress.legendary]);

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

  const selectedWeapon = model.weapons.find((w) => w.id === selectedWeaponId) ?? model.weapons[0];

  return (
    <div className="gw2-master-detail-layout legendary-layout">
      {/* Left Master Pane: Weapon List */}
      <div className="master-pane">
        <WeaponList
          model={model}
          selectedWeaponId={selectedWeapon?.id ?? 0}
          onSelectWeapon={setSelectedWeaponId}
          weaponProgressMap={weaponProgressMap}
        />
      </div>

      {/* Right Detail Pane: Weapon Components & BOM */}
      <div className="detail-pane">
        {selectedWeapon ? (
          <WeaponDetail
            weapon={selectedWeapon}
            model={model}
            userAchievements={userAchievements}
            onOpenItem={handleOpenItem}
          />
        ) : (
          <div className="empty-panel">{lang === 'en' ? 'No weapon selected.' : 'Keine Waffe ausgewählt.'}</div>
        )}
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
};
