import React, { useState, useMemo } from 'react';
import type { LegendaryModel, LegendaryWeapon, WeaponSlot } from '../../domain/legendary';
import { GENERATION_LABEL, SLOT_LABEL, WEAPON_TYPE_DE, weaponSlot } from '../../domain/legendary';
import { getItem } from '../../data/gw2/items';
import { useProgress, progressActions } from '../../data/progressStore';
import { ItemIcon, ProgressBar } from '../common/ui';
import { Search, Star, Filter } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<WeaponSlot | 'all'>('all');
  const [selectedGen, setSelectedGen] = useState<number | 'all'>('all');
  const [onlyTracked, setOnlyTracked] = useState(false);
  const progress = useProgress();

  const trackedSet = useMemo(() => new Set(progress.tracked), [progress.tracked]);

  const filteredWeapons = useMemo(() => {
    const q = search.trim().toLowerCase();

    return model.weapons.filter((w) => {
      const item = getItem(w.id);
      const nameDe = (item?.name ?? '').toLowerCase();
      const nameEn = w.nameEn.toLowerCase();
      const slot = weaponSlot(w, item);

      // Search match
      if (q && !nameDe.includes(q) && !nameEn.includes(q) && !w.type.toLowerCase().includes(q)) {
        return false;
      }

      // Slot filter
      if (selectedSlot !== 'all' && slot !== selectedSlot) return false;

      // Generation filter
      if (selectedGen !== 'all' && w.generation !== selectedGen) return false;

      // Tracked filter
      if (onlyTracked && !trackedSet.has(w.id)) return false;

      return true;
    });
  }, [model.weapons, search, selectedSlot, selectedGen, onlyTracked, trackedSet]);

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
    const item = getItem(w.id);
    const prog = weaponProgressMap[w.id] ?? 0;
    const genInfo = GENERATION_LABEL[w.generation] ?? { short: `Gen ${w.generation}` };
    const typeLabel = WEAPON_TYPE_DE[item?.weaponType ?? w.type] ?? w.type;

    return (
      <div
        key={w.id}
        className={`master-list-row weapon-row ${isSelected ? 'selected' : ''} ${
          isPinned ? 'pinned-row' : ''
        }`}
        onClick={() => onSelectWeapon(w.id)}
      >
        <button
          className={`track-star-btn ${isTracked ? 'tracked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            progressActions.toggleTracked(w.id);
          }}
          title={isTracked ? 'Aus Verfolgung entfernen' : 'Waffe zur Verfolgung anheften'}
        >
          <Star size={12} fill={isTracked ? '#d2b268' : 'none'} />
        </button>

        <div className="row-icon-wrap">
          <ItemIcon id={w.id} size="m" />
        </div>

        <div className="row-content">
          <div className="row-title-bar">
            <span className="row-name font-serif r-Legendary">{item?.name ?? w.nameEn}</span>
            {!w.hasRecipe && (
              <span className="incomplete-tag" title="Rezept im Community-Datensatz noch nicht erfasst">
                Unvollständig
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
      {/* Header with Search and Quick Filters */}
      <div className="list-search-section">
        <div className="list-search-input-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="gw2-input"
            placeholder="Waffe oder Typ suchen..."
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
            <option value="all">Alle Waffentypen</option>
            <option value="oneHand">{SLOT_LABEL.oneHand}</option>
            <option value="twoHand">{SLOT_LABEL.twoHand}</option>
            <option value="offHand">{SLOT_LABEL.offHand}</option>
            <option value="aquatic">{SLOT_LABEL.aquatic}</option>
          </select>

          <select
            className="gw2-select"
            value={selectedGen === 'all' ? 'all' : String(selectedGen)}
            onChange={(e) =>
              setSelectedGen(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">Alle Generationen</option>
            <option value="1">Generation 1 (Core)</option>
            <option value="2">Generation 2 (HoT/PoF)</option>
            <option value="3">Generation 3 (Aurene/EoD)</option>
            <option value="15">Generation 4 (Janthir)</option>
          </select>

          <button
            className={`btn-filter-toggle ${onlyTracked ? 'active' : ''}`}
            onClick={() => setOnlyTracked(!onlyTracked)}
            title="Nur mit Stern markierte Waffen anzeigen"
          >
            <Star size={11} fill={onlyTracked ? '#d2b268' : 'none'} />
            <span>Verfolgt ({trackedSet.size})</span>
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="list-items-container">
        {pinnedTracked.length > 0 && (
          <div className="pinned-group-divider">
            <span className="divider-label">
              <Star size={10} fill="#d2b268" /> Verfolgte Waffen ({pinnedTracked.length})
            </span>
          </div>
        )}
        {pinnedTracked.map((w) => renderWeaponRow(w, true))}

        {pinnedTracked.length > 0 && regularWeapons.length > 0 && (
          <div className="pinned-group-divider">
            <span className="divider-label">Alle Waffen ({regularWeapons.length})</span>
          </div>
        )}
        {regularWeapons.map((w) => renderWeaponRow(w, false))}

        {filteredWeapons.length === 0 && (
          <div className="empty-panel">Keine legendären Waffen für diese Filterkriterien gefunden.</div>
        )}
      </div>
    </div>
  );
};
