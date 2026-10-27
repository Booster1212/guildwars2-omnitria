import React, { useEffect } from 'react';
import type { AdvisorWeights, AdvisorPreset } from '../../data/gw2/wvw/types.ts';
import { DEFAULT_ADVISOR_WEIGHTS, ADVISOR_PRESETS } from '../../data/gw2/wvw/constants.ts';
import { useTranslation } from '../../i18n/index.ts';
import { Sliders, RotateCcw, Check } from 'lucide-react';

interface WvwWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weights: AdvisorWeights;
  currentPreset: AdvisorPreset;
  onUpdateWeights: (newWeights: AdvisorWeights, preset?: AdvisorPreset) => void;
}

export const WvwWeightsModal: React.FC<WvwWeightsModalProps> = ({
  isOpen,
  onClose,
  weights,
  currentPreset,
  onUpdateWeights,
}) => {
  const { t, lang } = useTranslation();

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isGerman = lang === 'de';

  const handleSliderChange = (key: keyof AdvisorWeights, value: number) => {
    onUpdateWeights({
      ...weights,
      [key]: value,
    });
  };

  const handleApplyPreset = (p: AdvisorPreset) => {
    onUpdateWeights({ ...ADVISOR_PRESETS[p].weights }, p);
  };

  const handleReset = () => {
    onUpdateWeights({ ...DEFAULT_ADVISOR_WEIGHTS }, 'balanced');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-solid-dialog wvw-weights-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modal-solid-header">
          <div className="modal-title-wrap flex items-center gap-2">
            <Sliders size={16} className="modal-gold-icon" />
            <span className="modal-title-text">{t('wvw.weightsConfig')}</span>
          </div>
          <button
            type="button"
            className="gw2-parchment-close-btn"
            onClick={onClose}
            title={isGerman ? 'Schließen (Esc)' : 'Close (Esc)'}
          >
            <span className="close-x">✕</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-solid-body space-y-4">
          <p className="dim text-xs leading-relaxed">
            {isGerman
              ? 'Passe die Gewichtungen des regelbasierten Zielberaters nach deinen taktischen Bedürfnissen an oder wähle ein vorgefertigtes Profil.'
              : 'Adjust the rule-based advisor weights to your tactical needs or select a ready-made profile.'}
          </p>

          {/* Vordefinierte Profile */}
          <div>
            <span className="dim text-xs font-bold block mb-2">{t('wvw.preset')}:</span>
            <div className="grid grid-cols-2 gap-2">
              {(['balanced', 'aggressive', 'territorial', 'roamer'] as AdvisorPreset[]).map((p) => {
                const info = ADVISOR_PRESETS[p];
                const active = currentPreset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`wvw-preset-card ${active ? 'active' : ''}`}
                    onClick={() => handleApplyPreset(p)}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-serif font-bold">
                        {isGerman ? info.labelDe : info.labelEn}
                      </strong>
                      {active && <Check size={13} className="gold" />}
                    </div>
                    <span className="dim text-[11px] block mt-1 leading-tight">
                      {isGerman ? info.descDe : info.descEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Einzelschieberegler */}
          <div className="space-y-3 pt-3 border-t border-[#252830]">
            {/* 1. Basis-Nutzen & PPT */}
            <div className="wvw-slider-group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#e2dec9]">{t('wvw.strategicBase')}</span>
                <span className="font-mono gold font-bold">{weights.baseStrategicWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.baseStrategicWeight}
                onChange={(e) => handleSliderChange('baseStrategicWeight', Number(e.target.value))}
                className="wvw-slider"
              />
              <span className="dim text-[11px] block mt-0.5">
                {isGerman
                  ? 'Strukturtyp (Schloss > Feste > Turm > Lager) und PPT-Tickwert.'
                  : 'Structure value (Castle > Keep > Tower > Camp) and PPT tick.'}
              </span>
            </div>

            {/* 2. Spitzenreiter-Schwung */}
            <div className="wvw-slider-group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#e2dec9]">{t('wvw.leaderSwing')}</span>
                <span className="font-mono gold font-bold">{weights.leaderSwingWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.leaderSwingWeight}
                onChange={(e) => handleSliderChange('leaderSwingWeight', Number(e.target.value))}
                className="wvw-slider"
              />
              <span className="dim text-[11px] block mt-0.5">
                {isGerman
                  ? 'Fokussiert Angriffe auf das führende Team zur maximalen Punkte-Verschiebung.'
                  : 'Focuses attacks on the match leader to maximize point swings.'}
              </span>
            </div>

            {/* 3. Verwundbarkeit & T0 */}
            <div className="wvw-slider-group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#e2dec9]">{t('wvw.vulnerability')}</span>
                <span className="font-mono gold font-bold">{weights.vulnerabilityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.vulnerabilityWeight}
                onChange={(e) => handleSliderChange('vulnerabilityWeight', Number(e.target.value))}
                className="wvw-slider"
              />
              <span className="dim text-[11px] block mt-0.5">
                {isGerman
                  ? 'Belohnt frische T0-Strukturen (5-20 Min nach Flip); bestraft aktive RI-Aufseher.'
                  : 'Rewards fresh T0 structures (5-20 min post-flip); penalizes active RI.'}
              </span>
            </div>

            {/* 4. Territoriale Lage */}
            <div className="wvw-slider-group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#e2dec9]">{t('wvw.territory')}</span>
                <span className="font-mono gold font-bold">{weights.territoryWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.territoryWeight}
                onChange={(e) => handleSliderChange('territoryWeight', Number(e.target.value))}
                className="wvw-slider"
              />
              <span className="dim text-[11px] block mt-0.5">
                {isGerman
                  ? 'Priorisiert Rückeroberung feindlicher Stellungen auf dem eigenen Heimat-Grenzland.'
                  : 'Prioritizes reclaiming enemy positions on your home borderland.'}
              </span>
            </div>

            {/* 5. Gildenschutz */}
            <div className="wvw-slider-group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#e2dec9]">{t('wvw.guildDefense')}</span>
                <span className="font-mono gold font-bold">{weights.guildDefenseWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={weights.guildDefenseWeight}
                onChange={(e) => handleSliderChange('guildDefenseWeight', Number(e.target.value))}
                className="wvw-slider"
              />
              <span className="dim text-[11px] block mt-0.5">
                {isGerman
                  ? 'Bevorzugt unbeanspruchte Ziele ohne defensive Gildentaktiken (z.B. Not-Wegmarke).'
                  : 'Favors unclaimed targets without defensive guild tactics.'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-solid-footer flex justify-between items-center">
          <button
            type="button"
            className="gw2-parchment-action-btn flex items-center gap-1.5"
            onClick={handleReset}
          >
            <RotateCcw size={13} />
            <span>{t('wvw.resetWeights')}</span>
          </button>

          <button
            type="button"
            className="gw2-gw-btn send-btn"
            onClick={onClose}
          >
            <span>{t('wvw.done')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
