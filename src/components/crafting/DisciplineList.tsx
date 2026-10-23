import React from 'react';
import type { DisciplineId } from '../../domain/types';
import { DISCIPLINES } from '../../data/gw2/recipes';
import { useAccountState } from '../../data/gw2/account';
import { useProgress } from '../../data/progressStore';
import { DISCIPLINE_DE } from '../common/labels';
import { DisciplineIcon, ProgressBar } from '../common/ui';

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
  const account = useAccountState();
  const progress = useProgress();

  return (
    <div className="gw2-master-list disciplines-list">
      <div className="list-section-header">
        <span className="section-title">Handwerksberufe</span>
        <span className="section-counter">8 Disziplinen</span>
      </div>

      <div className="list-items-container">
        {DISCIPLINES.map((disc) => {
          const isSelected = disc === selectedDiscipline;
          const maxRank = maxRanks[disc] ?? (disc === 'Jeweler' ? 400 : 500);

          // Get current rank from account characters or manual start rank in progress
          const accountCrafting = account.data?.crafting?.[disc];
          const manualProgress = progress.crafting[disc];
          const currentRank = accountCrafting?.rating ?? manualProgress?.start ?? 0;
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
                  <span className="row-name font-serif">{DISCIPLINE_DE[disc]}</span>
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
                  ) : manualProgress?.start !== null && manualProgress?.start !== undefined ? (
                    <span className="dim">Manuell gesetzt</span>
                  ) : (
                    <span className="dim">Stufe 0</span>
                  )}
                  {manualProgress?.target ? (
                    <span className="target-indicator">Ziel: {manualProgress.target}</span>
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
