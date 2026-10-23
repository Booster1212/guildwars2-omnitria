import React, { useState } from 'react';
import type { DisciplineId } from '../../domain/types';
import { useAccountState } from '../../data/gw2/account';
import { useRecipeDb } from '../../data/gw2/recipes';
import { useProgress } from '../../data/progressStore';
import { DISCIPLINE_DE, fmtInt } from '../common/labels';
import { DisciplineIcon, ItemIcon, ProgressBar, Tabs } from '../common/ui';
import { LevelPlanner } from './LevelPlanner';
import { getItem } from '../../data/gw2/items';
import { Compass, BookOpen, Sliders, User } from 'lucide-react';

interface DisciplineDetailProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

export const DisciplineDetail: React.FC<DisciplineDetailProps> = ({ discipline, maxRank, onOpenItem }) => {
  const [activeTab, setActiveTab] = useState<'planner' | 'recipes'>('planner');
  const account = useAccountState();
  const progress = useProgress();
  const recipeDb = useRecipeDb(true);

  const accountCrafting = account.data?.crafting?.[discipline];
  const manualProgress = progress.crafting[discipline];
  const currentRank = accountCrafting?.rating ?? manualProgress?.start ?? 0;
  const charName = accountCrafting?.character;

  const progressFrac = Math.min(1, currentRank / maxRank);

  // Recipes relevant for this discipline around current rank
  const relevantRecipes = React.useMemo(() => {
    if (recipeDb.status !== 'ready') return [];
    return recipeDb.recipes
      .filter((r) => r.disciplines.includes(discipline) && r.rating <= currentRank + 25)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 50);
  }, [recipeDb.recipes, recipeDb.status, discipline, currentRank]);

  return (
    <div className="gw2-detail-panel discipline-detail">
      {/* Discipline Header Banner */}
      <div className="detail-banner-header">
        <div className="banner-left">
          <DisciplineIcon discipline={discipline} size="l" />
          <div className="banner-titles">
            <h2 className="banner-main-title font-serif">{DISCIPLINE_DE[discipline]}</h2>
            <div className="banner-sub-meta">
              <span className="rank-label">
                Rang {currentRank} von {maxRank}
              </span>
              {charName ? (
                <span className="char-badge">
                  <User size={11} /> {charName}
                </span>
              ) : (
                <span className="dim">Kein Charakter mit diesem Beruf verknüpft</span>
              )}
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="progress-status-box">
            <div className="progress-number font-mono">
              {Math.round(progressFrac * 100)} %
            </div>
            <div className="progress-bar-container">
              <ProgressBar value={progressFrac} tone={progressFrac >= 1 ? 'gold' : 'green'} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs: Levelplaner / Rezepte */}
      <div className="detail-tabs-strip">
        <Tabs
          tabs={[
            { id: 'planner', label: 'Interaktiver Levelplaner' },
            { id: 'recipes', label: `Erlernte / Relevante Rezepte (${relevantRecipes.length})` },
          ]}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as 'planner' | 'recipes')}
        />
      </div>

      {/* Tab Content */}
      <div className="detail-content-area">
        {activeTab === 'planner' ? (
          <LevelPlanner discipline={discipline} maxRank={maxRank} onOpenItem={onOpenItem} />
        ) : (
          <div className="discipline-recipes-view">
            <div className="recipes-intro-bar">
              <span className="dim">
                Zeigt Rezepte für {DISCIPLINE_DE[discipline]} bis Rang {currentRank + 25}. Klicke auf ein Ergebnis oder eine Zutat für Details.
              </span>
            </div>

            <div className="recipes-grid">
              {relevantRecipes.map((r) => {
                const outItem = getItem(r.outputId);
                return (
                  <div key={r.id} className="recipe-card">
                    <div className="rc-header">
                      <ItemIcon id={r.outputId} size="m" onClick={() => onOpenItem(r.outputId)} />
                      <div className="rc-info">
                        <span
                          className="rc-title font-serif cursor-pointer"
                          onClick={() => onOpenItem(r.outputId)}
                        >
                          {outItem?.name ?? `Gegenstand #${r.outputId}`}
                        </span>
                        <div className="rc-rating-meta">
                          <span className="rc-rating">Rang {r.rating}</span>
                          {r.type && <span className="rc-type dim">({r.type})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="rc-ingredients">
                      {r.ingredients.map((ing) => (
                        <button
                          key={ing.itemId}
                          className="rc-ing-btn"
                          onClick={() => onOpenItem(ing.itemId)}
                          title={`${getItem(ing.itemId)?.name ?? ing.itemId}: ${ing.count}×`}
                        >
                          <ItemIcon id={ing.itemId} count={ing.count} size="s" />
                          <span className="ing-label dim">{getItem(ing.itemId)?.name ?? `#${ing.itemId}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
