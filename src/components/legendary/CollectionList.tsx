import React, { useMemo } from 'react';
import type { LegendaryWeapon } from '../../domain/legendary';
import { collectionMatches } from '../../domain/legendary';
import { useCollections } from '../../data/gw2/collections';
import type { Gw2AccountAchievement } from '../../data/gw2Api';
import { ProgressBar, Notice } from '../common/ui';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CollectionListProps {
  weapon: LegendaryWeapon;
  userAchievements: Map<number, Gw2AccountAchievement>;
}

export const CollectionList: React.FC<CollectionListProps> = ({ weapon, userAchievements }) => {
  const { lang } = useTranslation();
  const collectionsState = useCollections();

  const matchingAchievements = useMemo(() => {
    return collectionsState.list.filter((ach) =>
      collectionMatches(weapon.nameEn, ach.nameEn)
    );
  }, [collectionsState.list, weapon.nameEn]);

  if (collectionsState.status === 'loading') {
    return (
      <div className="planner-loading-state">
        <div className="spinner" />
        <span className="font-serif">
          {lang === 'en' ? 'Loading collection achievements from GW2 API…' : 'Lade Sammlungs-Erfolge der GW2-API …'}
        </span>
      </div>
    );
  }

  if (collectionsState.status === 'error') {
    return (
      <Notice tone="error" title={lang === 'en' ? 'Failed to load collections' : 'Sammlungen konnten nicht geladen werden'}>
        {collectionsState.error}
      </Notice>
    );
  }

  if (matchingAchievements.length === 0) {
    return (
      <div className="collections-empty-panel">
        <div className="empty-title font-serif">
          {lang === 'en' ? 'No associated collection achievements' : 'Keine zugeordneten Sammlungs-Erfolge'}
        </div>
        <div className="empty-desc dim">
          {weapon.generation === 3 ? (
            lang === 'en' ? (
              <>
                For <strong>Generation 3 (Aurene)</strong> weapons, precursor and weapon acquisition is handled
                via crafting disciplines and bartering with merchants in Cantha (expansion <em>End of Dragons</em>) rather
                than classical multi-tier precursor collections.
              </>
            ) : (
              <>
                Für Waffen der <strong>Generation 3 (Aurene)</strong> erfolgt die Freischaltung des Vorläufers und der
                Waffe über Handwerksdisziplinen und Tausch bei Handwerkern in Cantha (Erweiterung <em>End of Dragons</em>) statt
                über klassische mehrstufige Vorläufer-Sammlungen.
              </>
            )
          ) : weapon.generation === 15 ? (
            lang === 'en' ? (
              <>
                For <strong>Generation 4</strong> weapons, acquisition progresses via quests and crafting in{' '}
                <em>Janthir Wilds</em>.
              </>
            ) : (
              <>
                Für Waffen der <strong>Generation 4</strong> erfolgt die Freischaltung über Quests und Handwerk in{' '}
                <em>Janthir Wilds</em>.
              </>
            )
          ) : lang === 'en' ? (
            <>
              No direct collection achievements are linked to this weapon in the official <em>Legendary Weapons</em> category,
              or the precursor is obtained directly via the Mystic Forge.
            </>
          ) : (
            <>
              Für diese Waffe sind in der offiziellen Kategorie <em>„Legendäre Waffen“</em> keine direkten
              Sammlungs-Stufen verknüpft oder der Vorläufer wird direkt über die Mystische Schmiede bezogen.
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="collection-list-container">
      <div className="collections-intro-bar">
        <span className="dim">
          {lang === 'en'
            ? 'Official precursor and weapon collections from GW2 API (Category "Legendary Weapons"). Personal progress is synced with your API key.'
            : 'Offizielle Vorläufer- und Waffen-Sammlungen aus der GW2-API (Kategorie „Legendäre Waffen“). Der persönliche Fortschritt wird über deinen API-Schlüssel synchronisiert.'}
        </span>
      </div>

      <div className="collections-cards-list">
        {matchingAchievements.map((ach) => {
          const userAch = userAchievements.get(ach.id);
          const isDone = userAch?.done ?? false;
          const current = userAch?.current ?? (isDone ? ach.total : 0);
          const total = ach.total > 0 ? ach.total : 1;
          const frac = Math.min(1, current / total);
          const title = lang === 'en' ? (ach.nameEn || ach.name) : ach.name;
          const requirement = lang === 'en' ? (ach.requirementEn || ach.requirement) : ach.requirement;
          const description = lang === 'en' ? (ach.descriptionEn || ach.description) : ach.description;

          return (
            <div key={ach.id} className={`collection-card ${isDone ? 'card-complete' : ''}`}>
              <div className="col-status-icon">
                {isDone ? (
                  <CheckCircle2 size={18} className="good" />
                ) : (
                  <Trophy size={18} className="trophy-gold" />
                )}
              </div>

              <div className="col-body">
                <div className="col-header-line">
                  <span className="col-title font-serif">{title}</span>
                  <div className="col-progress-badge font-mono">
                    {isDone ? (
                      <span className="good font-bold">{lang === 'en' ? 'Completed' : 'Abgeschlossen'}</span>
                    ) : (
                      <span>
                        {current} / {total}
                      </span>
                    )}
                  </div>
                </div>

                {requirement && <div className="col-requirement dim">{requirement}</div>}
                {description && <div className="col-desc">{description}</div>}

                <div className="col-progress-bar">
                  <ProgressBar value={frac} tone={isDone ? 'gold' : 'green'} slim />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
