import React, { useState } from 'react';
import type { DisciplineId } from '../../domain/types';
import { useAccountState } from '../../data/gw2/account';
import { useRecipeDb } from '../../data/gw2/recipes';
import { useProgress } from '../../data/progressStore';
import { getDisciplineName, getRecipeTypeName } from '../common/labels';
import { DisciplineIcon, ItemIcon, ProgressBar, Tabs } from '../common/ui';
import { LevelPlanner } from './LevelPlanner';
import { DiscoveryView } from './DiscoveryView';
import { CURATED_DISCOVERIES } from '../../data/crafting/curatedDiscoveries';
import { isDiscoveryRecipe } from '../../domain/discovery';
import { getItem } from '../../data/gw2/items';
import { User } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface DisciplineDetailProps {
  discipline: DisciplineId;
  maxRank: number;
  onOpenItem: (id: number) => void;
}

export const DisciplineDetail: React.FC<DisciplineDetailProps> = ({ discipline, maxRank, onOpenItem }) => {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'planner' | 'discovery' | 'recipes'>('planner');
  const account = useAccountState();
  const progress = useProgress();
  const recipeDb = useRecipeDb(true);

  const accountCrafting = account.data?.crafting?.[discipline];
  const manualProgress = progress.crafting[discipline];
  const currentRank = accountCrafting?.rating ?? manualProgress?.start ?? 0;
  const charName = accountCrafting?.character;

  const progressFrac = Math.min(1, currentRank / maxRank);

  // Discoverable recipes count
  const discoveryRecipesCount = React.useMemo(() => {
    const list = recipeDb.status === 'ready' && recipeDb.recipes.length > 0
      ? recipeDb.recipes
      : CURATED_DISCOVERIES;
    return list.filter((r) => r.disciplines.includes(discipline) && isDiscoveryRecipe(r)).length;
  }, [recipeDb.recipes, recipeDb.status, discipline]);

  // Recipes relevant for this discipline around current rank
  const relevantRecipes = React.useMemo(() => {
    if (recipeDb.status !== 'ready') return [];
    return recipeDb.recipes
      .filter((r) => r.disciplines.includes(discipline) && r.rating <= currentRank + 25)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 50);
  }, [recipeDb.recipes, recipeDb.status, discipline, currentRank]);

  const discName = getDisciplineName(discipline, lang);

  return (
    <div className="gw2-detail-panel discipline-detail">
      {/* Discipline Header Banner */}
      <div className="detail-banner-header">
        <div className="banner-left">
          <DisciplineIcon discipline={discipline} size="l" />
          <div className="banner-titles">
            <h2 className="banner-main-title font-serif">{discName}</h2>
            <div className="banner-sub-meta">
              <span className="rank-label">
                {t('crafting.rankOf', { rank: currentRank, max: maxRank })}
              </span>
              {charName ? (
                <span className="char-badge">
                  <User size={11} /> {charName}
                </span>
              ) : (
                <span className="dim">{t('crafting.noCharacter')}</span>
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

      {/* Main Tabs: Levelplaner / Entdeckungsrezepte / Rezepte */}
      <div className="detail-tabs-strip">
        <Tabs
          tabs={[
            { id: 'planner', label: t('crafting.plannerTab') },
            { id: 'discovery', label: `${t('crafting.discoveryTab')} (${discoveryRecipesCount})` },
            { id: 'recipes', label: `${t('crafting.recipesTab')} (${relevantRecipes.length})` },
          ]}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as 'planner' | 'discovery' | 'recipes')}
        />
      </div>

      {/* Tab Content */}
      <div className="detail-content-area">
        {activeTab === 'planner' && (
          <LevelPlanner discipline={discipline} maxRank={maxRank} onOpenItem={onOpenItem} />
        )}
        {activeTab === 'discovery' && (
          <DiscoveryView
            discipline={discipline}
            maxRank={maxRank}
            currentRank={currentRank}
            onOpenItem={onOpenItem}
          />
        )}
        {activeTab === 'recipes' && (
          <div className="discipline-recipes-view">
            <div className="recipes-intro-bar">
              <span className="dim">
                {t('crafting.recipesIntro', { disc: discName, rank: currentRank + 25 })}
              </span>
            </div>

            <div className="recipes-grid">
              {relevantRecipes.map((r) => {
                const outItem = getItem(r.outputId);
                const typeLabel = r.type ? getRecipeTypeName(r.type, lang) : '';
                return (
                  <div key={r.id} className="recipe-card">
                    <div className="rc-header">
                      <ItemIcon id={r.outputId} size="m" onClick={() => onOpenItem(r.outputId)} />
                      <div className="rc-info">
                        <span
                          className="rc-title font-serif cursor-pointer"
                          onClick={() => onOpenItem(r.outputId)}
                        >
                          {outItem?.name ?? `#${r.outputId}`}
                        </span>
                        <div className="rc-rating-meta">
                          <span className="rc-rating">{lang === 'en' ? `Rank ${r.rating}` : `Rang ${r.rating}`}</span>
                          {typeLabel && <span className="rc-type dim">({typeLabel})</span>}
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
