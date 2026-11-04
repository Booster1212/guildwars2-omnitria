import React, { useState, useMemo } from 'react';
import type { LegendaryModel, LegendaryWeapon, WeaponSlot, LegendaryMainCategory } from '../../domain/legendary';
import { getGenerationLabel, WEAPON_TYPE_DE, weaponSlot, categoryOfSlot } from '../../domain/legendary';
import { getItem } from '../../data/gw2/items';
import { useAccountState } from '../../data/gw2/account';
import { useProgress, progressActions } from '../../data/progressStore';
import { ItemIcon, ProgressBar } from '../common/ui';
import { Search, Star, Check, Sparkles, Shield, Compass, Swords } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface WeaponListProps {
  model: LegendaryModel;
  selectedWeaponId: number;
  onSelectWeapon: (id: number) => void;
  weaponProgressMap: Record<number, number>;
}

export const WeaponList: React.FC<WeaponListProps> = ({
  model,
  selectedWeaponId,
  onSelectWeapon,
  weaponProgressMap,
}) => {
  const { t, lang } = useTranslation();
  const account = useAccountState();
  const armoryMap = account.armoryMap;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LegendaryMainCategory>('all');
  const [selectedSlot, setSelectedSlot] = useState<WeaponSlot | 'all'>('all');
  const [selectedGen, setSelectedGen] = useState<number | 'all'>('all');
  const [onlyTracked, setOnlyTracked] = useState(false);
  const [hideUnlocked, setHideUnlocked] = useState(false);
  const progress = useProgress();

  const trackedSet = useMemo(() => new Set(progress.tracked), [progress.tracked]);

  // When category changes, reset slot filter if it doesn't match
  const handleCategoryChange = (cat: LegendaryMainCategory) => {
    setSelectedCategory(cat);
    setSelectedSlot('all');
  };

  const filteredWeapons = useMemo(() => {
    const q = search.trim().toLowerCase();

    return model.weapons.filter((w) => {
      const item = getItem(w.id);
      const nameDe = (item?.name ?? '').toLowerCase();
      const nameEn = w.nameEn.toLowerCase();
      const slot = weaponSlot(w, item);
      const cat = categoryOfSlot(slot);

      // Search match
      if (q && !nameDe.includes(q) && !nameEn.includes(q) && !w.type.toLowerCase().includes(q)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && cat !== selectedCategory) {
        return false;
      }

      // Slot filter
      if (selectedSlot !== 'all' && slot !== selectedSlot) return false;

      // Generation filter
      if (selectedGen !== 'all' && w.generation !== selectedGen) return false;

      // Tracked filter
      if (onlyTracked && !trackedSet.has(w.id)) return false;

      // Hide unlocked filter
      if (hideUnlocked && armoryMap && armoryMap.has(w.id)) return false;

      return true;
    });
  }, [model.weapons, search, selectedCategory, selectedSlot, selectedGen, onlyTracked, hideUnlocked, armoryMap, trackedSet]);

  // Separate tracked weapons to display pinned on top if no search is active
  const { pinnedTracked, regularWeapons } = useMemo(() => {
    if (onlyTracked || search.trim()) {
      return { pinnedTracked: [], regularWeapons: filteredWeapons };
    }
    const pinned: LegendaryWeapon[] = [];
    const regular: LegendaryWeapon[] = [];
    filteredWeapons.forEach((w) => {
      if (trackedSet.has(w.id)) pinned.push(w);
      else regular.push(w);
    });
    return { pinnedTracked: pinned, regularWeapons: regular };
  }, [filteredWeapons, onlyTracked, search, trackedSet]);

  const renderWeaponRow = (w: LegendaryWeapon, isPinned = false) => {
    const isSelected = w.id === selectedWeaponId;
    const isTracked = trackedSet.has(w.id);
    const isUnlocked = armoryMap ? armoryMap.has(w.id) : false;
    const unlockedCount = isUnlocked ? (armoryMap?.get(w.id) ?? 1) : 0;
    const item = getItem(w.id);
    const prog = isUnlocked ? 1 : (weaponProgressMap[w.id] ?? 0);
    const genInfo = getGenerationLabel(w.generation, lang);
    const rawType = item?.weaponType ?? w.type;
    const typeLabel = lang === 'en' ? rawType : (WEAPON_TYPE_DE[rawType] ?? rawType);

    return (
      <div
        key={w.id}
        className={`master-list-row weapon-row ${isSelected ? 'selected' : ''} ${
          isPinned ? 'pinned-row' : ''
        } ${isUnlocked ? 'armory-unlocked-row' : ''}`}
        onClick={() => onSelectWeapon(w.id)}
      >
        <button
          className={`track-star-btn ${isTracked ? 'tracked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            progressActions.toggleTracked(w.id);
          }}
          title={isTracked ? 'Untrack' : 'Track'}
        >
          <Star size={12} fill={isTracked ? '#d2b268' : 'none'} />
        </button>

        <div className="row-icon-wrap">
          <ItemIcon id={w.id} size="m" />
        </div>

        <div className="row-content">
          <div className="row-title-bar">
            <span className="row-name font-serif r-Legendary">{item?.name ?? w.nameEn}</span>
            {isUnlocked && (
              <span className="armory-unlocked-tag font-sans" title={`${t('legendary.unlockedInArmory')} (${unlockedCount}×)`}>
                <Check size={11} className="armory-check-icon" />
                <span>{lang === 'en' ? 'Armory' : 'Rüstkammer'}</span>
              </span>
            )}
            {!w.hasRecipe && !isUnlocked && (
              <span className="incomplete-tag" title="Incomplete">
                {lang === 'en' ? 'Incomplete' : 'Unvollständig'}
              </span>
            )}
          </div>

          <div className="row-meta-sub">
            <span className="dim">{typeLabel}</span>
            <span className="sep">·</span>
            <span className="gen-tag">{genInfo.short}</span>
            <span className="prog-percent font-mono">{Math.round(prog * 100)} %</span>
          </div>

          <div className="row-progress-bar">
            <ProgressBar value={prog} tone={prog >= 1 ? 'gold' : 'green'} slim />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gw2-master-list weapons-master-list">
      {/* Category Tabs: Weapons, Trinkets, Backpacks, Armor, All */}
      <div className="legendary-cat-bar">
        <button
          type="button"
          className={`legendary-cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('all')}
        >
          <Sparkles size={11} />
          <span>{t('legendary.category.all')}</span>
        </button>
        <button
          type="button"
          className={`legendary-cat-btn ${selectedCategory === 'weapons' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('weapons')}
        >
          <Swords size={11} />
          <span>{t('legendary.category.weapons')}</span>
        </button>
        <button
          type="button"
          className={`legendary-cat-btn ${selectedCategory === 'trinkets' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('trinkets')}
        >
          <Compass size={11} />
          <span>{t('legendary.category.trinkets')}</span>
        </button>
        <button
          type="button"
          className={`legendary-cat-btn ${selectedCategory === 'back' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('back')}
        >
          <span>{t('legendary.category.back')}</span>
        </button>
        <button
          type="button"
          className={`legendary-cat-btn ${selectedCategory === 'armor' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('armor')}
        >
          <Shield size={11} />
          <span>{t('legendary.category.armor')}</span>
        </button>
      </div>

      {/* Header with Search and Quick Filters */}
      <div className="list-search-section">
        <div className="list-search-input-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="gw2-input"
            placeholder={t('legendary.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Bar */}
        <div className="filters-bar-grid">
          <select
            className="gw2-select"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value as WeaponSlot | 'all')}
          >
            <option value="all">{t('legendary.allSlots')}</option>
            {/* Conditional slots based on category */}
            {(selectedCategory === 'all' || selectedCategory === 'weapons') && (
              <>
                <option value="oneHand">{t('legendary.slotOneHand')}</option>
                <option value="twoHand">{t('legendary.slotTwoHand')}</option>
                <option value="offHand">{t('legendary.slotOffHand')}</option>
                <option value="aquatic">{t('legendary.slotAquatic')}</option>
              </>
            )}
            {(selectedCategory === 'all' || selectedCategory === 'trinkets') && (
              <>
                <option value="ring">{t('legendary.slot.ring')}</option>
                <option value="accessory">{t('legendary.slot.accessory')}</option>
                <option value="amulet">{t('legendary.slot.amulet')}</option>
                <option value="relic">{t('legendary.slot.relic')}</option>
              </>
            )}
            {(selectedCategory === 'all' || selectedCategory === 'back') && (
              <option value="back">{t('legendary.category.back')}</option>
            )}
            {(selectedCategory === 'all' || selectedCategory === 'armor') && (
              <>
                <option value="armorHeavy">{t('legendary.slot.armorHeavy')}</option>
                <option value="armorMedium">{t('legendary.slot.armorMedium')}</option>
                <option value="armorLight">{t('legendary.slot.armorLight')}</option>
              </>
            )}
          </select>

          <select
            className="gw2-select"
            value={selectedGen === 'all' ? 'all' : String(selectedGen)}
            onChange={(e) =>
              setSelectedGen(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">{t('legendary.allGens')}</option>
            <option value="1">{t('legendary.gen1')}</option>
            <option value="2">{t('legendary.gen2')}</option>
            <option value="3">{t('legendary.gen3')}</option>
            <option value="15">{t('legendary.gen4')}</option>
          </select>

          <button
            className={`btn-filter-toggle ${onlyTracked ? 'active' : ''}`}
            onClick={() => setOnlyTracked(!onlyTracked)}
            title="Tracked items filter"
          >
            <Star size={11} fill={onlyTracked ? '#d2b268' : 'none'} />
            <span>{t('legendary.trackedOnly', { count: trackedSet.size })}</span>
          </button>

          {armoryMap && armoryMap.size > 0 && (
            <button
              type="button"
              className={`btn-filter-toggle ${hideUnlocked ? 'active' : ''}`}
              onClick={() => setHideUnlocked(!hideUnlocked)}
              title={t('legendary.hideUnlocked')}
            >
              <Check size={11} />
              <span>{t('legendary.hideUnlocked')}</span>
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="list-items-container">
        {pinnedTracked.length > 0 && (
          <div className="pinned-group-divider">
            <span className="divider-label">
              <Star size={10} fill="#d2b268" /> {t('legendary.pinnedHeader', { count: pinnedTracked.length })}
            </span>
          </div>
        )}
        {pinnedTracked.map((w) => renderWeaponRow(w, true))}

        {pinnedTracked.length > 0 && regularWeapons.length > 0 && (
          <div className="pinned-group-divider">
            <span className="divider-label">{t('legendary.allWeaponsHeader', { count: regularWeapons.length })}</span>
          </div>
        )}
        {regularWeapons.map((w) => renderWeaponRow(w, false))}

        {filteredWeapons.length === 0 && (
          <div className="empty-panel">{lang === 'en' ? 'No legendary items found for these filter criteria.' : 'Keine legendären Gegenstände für diese Filterkriterien gefunden.'}</div>
        )}
      </div>
    </div>
  );
};
