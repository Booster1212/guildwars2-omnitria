import React from 'react';
import { Search, Clock, Globe, ArrowUpDown, Layers } from 'lucide-react';
import { formatLocalTime } from '../data/events';
import { SortMode } from '../types';

interface BossFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  sortMode: SortMode;
  onSelectSortMode: (mode: SortMode) => void;
  currentTime: Date;
}

export const BossFilterBar: React.FC<BossFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  sortMode,
  onSelectSortMode,
  currentTime,
}) => {
  const utcString = currentTime.toISOString().substring(11, 16) + ' UTC';
  const localString = formatLocalTime(currentTime);

  const categories = [
    { id: 'all', label: 'Alle' },
    { id: 'active', label: 'Aktiv / Bald' },
    { id: 'bosses', label: 'Weltbosse' },
    { id: 'metas', label: 'Meta-Events' },
    { id: 'core', label: 'Core' },
    { id: 'hardcore', label: 'Hardcore' },
    { id: 'hot', label: 'HoT' },
    { id: 'pof', label: 'PoF' },
    { id: 'eod', label: 'EoD/LW' },
  ];

  return (
    <div className="filter-section">
      {/* Time Ribbon */}
      <div className="time-ribbon" style={{ margin: '-8px -10px 6px -10px' }}>
        <div className="time-item">
          <Globe size={11} />
          <span className="time-val gold">{utcString}</span>
        </div>
        <div className="time-item">
          <Clock size={11} />
          <span className="time-val">{localString}</span>
        </div>
      </div>

      {/* Search Bar + Sort Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search className="search-icon" size={12} />
          <input
            type="text"
            className="search-input"
            placeholder="Event oder Gebiet suchen..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Sort mode selector dropdown */}
        <div className="sort-selector-wrap">
          <select
            className="sort-dropdown"
            value={sortMode}
            onChange={(e) => onSelectSortMode(e.target.value as SortMode)}
            title="Sortierreihenfolge ändern"
          >
            <option value="time">Zeit (Nächste zuerst)</option>
            <option value="grouped">Typ gruppiert (Bosse / Metas)</option>
            <option value="bossesFirst">Weltbosse zuerst</option>
            <option value="metasFirst">Meta-Events zuerst</option>
          </select>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="category-chips">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};
