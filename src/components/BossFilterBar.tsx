import React from 'react';
import { Search, Clock, Globe, ArrowUpDown, Layers } from 'lucide-react';
import { formatLocalTime } from '../data/events';
import { SortMode } from '../types';

import { useTranslation } from '../i18n';

interface BossFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  sortMode: SortMode;
  onSelectSortMode: (mode: SortMode) => void;
  currentTime: Date;
}

export const BossFilterBar: React.FC<BossFilterBarProps> = React.memo(({
  searchTerm,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  sortMode,
  onSelectSortMode,
  currentTime,
}) => {
  const { t } = useTranslation();
  const utcString = currentTime.toISOString().substring(11, 16) + ' UTC';
  const localString = formatLocalTime(currentTime);

  const categories = [
    { id: 'all', label: t('events.all') },
    { id: 'active', label: t('events.active') },
    { id: 'bosses', label: t('events.bosses') },
    { id: 'metas', label: t('events.metas') },
    { id: 'core', label: 'Core' },
    { id: 'hardcore', label: 'Hardcore' },
    { id: 'hot', label: 'HoT' },
    { id: 'pof', label: 'PoF' },
    { id: 'eod', label: 'EoD' },
    { id: 'soto', label: 'SotO' },
    { id: 'janthir', label: 'Janthir' },
    { id: 'voe', label: 'VoE' },
    { id: 'ibs', label: 'IBS' },
    { id: 'lws', label: 'LW' },
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
            placeholder={t('events.searchPlaceholder')}
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
            title="Sortierreihenfolge ändern / Change sorting"
          >
            <option value="time">{t('events.sortTime')}</option>
            <option value="grouped">{t('events.sortGrouped')}</option>
            <option value="bossesFirst">{t('events.sortBossesFirst')}</option>
            <option value="metasFirst">{t('events.sortMetasFirst')}</option>
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
});
