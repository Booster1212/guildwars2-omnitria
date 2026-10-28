import React, { useState } from 'react';
import type { DisciplineId } from '../../domain/types';
import { useAccountState, getCharacterDisciplineInfo } from '../../data/gw2/account';
import { useRecipeDb } from '../../data/gw2/recipes';
import { useProgress, progressActions } from '../../data/progressStore';
import { getDisciplineName } from '../common/labels';
import { DisciplineIcon, ProgressBar, Tabs } from '../common/ui';
import { LevelPlanner } from './LevelPlanner';
import { DiscoveryView } from './DiscoveryView';
import { LearnedRecipesView } from './LearnedRecipesView';
import { CURATED_DISCOVERIES } from '../../data/crafting/curatedDiscoveries';
import { isDiscoveryRecipe } from '../../domain/discovery';
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

  const selectedCharacter = progress.plannerPreferences?.selectedCharacter ?? null;
  const accountCrafting = getCharacterDisciplineInfo(account.data, selectedCharacter, discipline);
  const manualProgress = progressActions.getCharacterDiscipline(selectedCharacter, discipline);
  const currentRank =
    manualProgress.start !== null && manualProgress.start !== undefined
      ? manualProgress.start
      : (accountCrafting?.rating ?? 0);
  const charName = accountCrafting?.character ?? selectedCharacter;

  const progressFrac = Math.min(1, currentRank / maxRank);

  // Discoverable recipes count
  const discoveryRecipesCount = React.useMemo(() => {
    const list = recipeDb.status === 'ready' && recipeDb.recipes.length > 0
      ? recipeDb.recipes
      : CURATED_DISCOVERIES;
    return list.filter((r) => r.disciplines.includes(discipline) && isDiscoveryRecipe(r)).length;
  }, [recipeDb.recipes, recipeDb.status, discipline]);

  // All recipes count for this discipline
  const allDisciplineRecipesCount = React.useMemo(() => {
    const list = recipeDb.status === 'ready' && recipeDb.recipes.length > 0
      ? recipeDb.recipes
      : CURATED_DISCOVERIES;
    return list.filter((r) => r.disciplines.includes(discipline)).length;
  }, [recipeDb.recipes, recipeDb.status, discipline]);

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
            { id: 'recipes', label: `${t('crafting.recipesTab')} (${allDisciplineRecipesCount})` },
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
          <LearnedRecipesView
            discipline={discipline}
            maxRank={maxRank}
            currentRank={currentRank}
            onOpenItem={onOpenItem}
          />
        )}
      </div>
    </div>
  );
};
