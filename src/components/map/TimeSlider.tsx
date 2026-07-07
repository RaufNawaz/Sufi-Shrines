import React, { useCallback, useId } from 'react';
import { ERA_MIN, ERA_MAX, formatCentury, formatCenturyUr } from '../../lib/data/era';
import { t } from '../../lib/i18n/uiStrings';
import type { Lang } from '../../types/shrine';

interface Props {
  value: [number, number];
  onChange: (range: [number, number]) => void;
  lang?: Lang;
  fmtNum?: (n: number | string) => string;
}

export function TimeSlider({ value, onChange, lang = 'en', fmtNum = (n) => String(n) }: Props) {
  const minId = useId();
  const maxId = useId();
  const [selMin, selMax] = value;
  const century = useCallback(
    (c: number) => fmtNum(lang === 'ur' ? formatCenturyUr(c) : formatCentury(c)),
    [lang, fmtNum],
  );

  const handleMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      onChange([Math.min(v, selMax), selMax]);
    },
    [selMax, onChange],
  );

  const handleMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      onChange([selMin, Math.max(v, selMin)]);
    },
    [selMin, onChange],
  );

  const isDefault = selMin === ERA_MIN && selMax === ERA_MAX;

  return (
    <div className="time-slider">
      <div className="time-slider-header">
        <span className="filter-section-label" aria-hidden="true">
          {t(lang, 'era')}
        </span>
        {!isDefault && (
          <button
            className="time-slider-reset"
            onClick={() => onChange([ERA_MIN, ERA_MAX])}
            aria-label={t(lang, 'resetEraFilterAriaLabel')}
          >
            {t(lang, 'resetButton')}
          </button>
        )}
      </div>

      <div className="time-slider-range-label" aria-live="polite">
        {isDefault ? t(lang, 'allErasLabel') : `${century(selMin)} – ${century(selMax)}`}
      </div>

      <div className="time-slider-inputs">
        <label htmlFor={minId} className="sr-only">
          {t(lang, 'earliestCenturyLabel')}
        </label>
        <input
          id={minId}
          type="range"
          className="time-slider-track"
          min={ERA_MIN}
          max={ERA_MAX}
          value={selMin}
          onChange={handleMin}
          aria-valuetext={century(selMin)}
        />

        <label htmlFor={maxId} className="sr-only">
          {t(lang, 'latestCenturyLabel')}
        </label>
        <input
          id={maxId}
          type="range"
          className="time-slider-track"
          min={ERA_MIN}
          max={ERA_MAX}
          value={selMax}
          onChange={handleMax}
          aria-valuetext={century(selMax)}
        />
      </div>

      <div className="time-slider-ticks" aria-hidden="true">
        <span>{century(ERA_MIN)}</span>
        <span>{century(ERA_MAX)}</span>
      </div>
    </div>
  );
}
