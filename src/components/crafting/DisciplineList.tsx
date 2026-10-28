import React from 'react';
import type { DisciplineId } from '../../domain/types';
import { DISCIPLINES } from '../../data/gw2/recipes';
import { useAccountState, getCharacterDisciplineInfo } from '../../data/gw2/account';
import { useProgress, progressActions } from '../../data/progressStore';
import { getDisciplineName } from '../common/labels';
import { DisciplineIcon, ProgressBar } from '../common/ui';
import { useTranslation } from '../../i18n';

interface DisciplineListProps {
  selectedDiscipline: DisciplineId;
  onSelectDiscipline: (id: DisciplineId) => void;
  maxRanks: Record<string, number>;
}

export const DisciplineList: React.FC<DisciplineListProps> = ({
  selectedDiscipline,
  onSelectDiscipline,
  maxRanks,
}) => {
  const { t, lang } = useTranslation();
  const account = useAccountState();
  const progress = useProgress();
  const selectedCharacter = progress.plannerPreferences?.selectedCharacter ?? null;

  return (
    <div className="gw2-master-list disciplines-list">
      <div className="list-section-header">
        <span className="section-title">{t('crafting.disciplines')}</span>
        <span className="section-counter">{t('crafting.disciplinesCount', { count: DISCIPLINES.length })}</span>
      </div>

      <div className="list-items-container">
        {DISCIPLINES.map((disc) => {
          const isSelected = disc === selectedDiscipline;
          const maxRank = maxRanks[disc] ?? (disc === 'Jeweler' ? 400 : 500);

          // Resolve character-specific or account-wide discipline rank & progress
          const accountCrafting = getCharacterDisciplineInfo(account.data, selectedCharacter, disc);
          const charProgress = progressActions.getCharacterDiscipline(selectedCharacter, disc);
          const currentRank =
            charProgress.start !== null && charProgress.start !== undefined
              ? charProgress.start
              : (accountCrafting?.rating ?? 0);
          const charName = accountCrafting?.character;

          const progressFrac = Math.min(1, currentRank / maxRank);

          return (
            <button
              key={disc}
              className={`master-list-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDiscipline(disc)}
            >
              <div className="row-icon-wrap">
                <DisciplineIcon discipline={disc} size="m" />
              </div>

              <div className="row-content">
                <div className="row-title-bar">
                  <span className="row-name font-serif">{getDisciplineName(disc, lang)}</span>
                  <span className="row-rank-badge">
                    {currentRank} / {maxRank}
                  </span>
                </div>

                <div className="row-progress-bar">
                  <ProgressBar
                    value={progressFrac}
                    tone={progressFrac >= 1 ? 'gold' : 'green'}
                    slim
                  />
                </div>

                <div className="row-meta-sub">
                  {charName ? (
                    <span className="dim char-indicator">Char: {charName}</span>
                  ) : charProgress.start !== null && charProgress.start !== undefined ? (
                    <span className="dim">{t('crafting.manuallySet')}</span>
                  ) : (
                    <span className="dim">{t('crafting.levelZero')}</span>
                  )}
                  {charProgress.target ? (
                    <span className="target-indicator">{t('crafting.target', { rank: charProgress.target })}</span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
