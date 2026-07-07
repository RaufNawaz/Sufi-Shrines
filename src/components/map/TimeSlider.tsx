import React, { useCallback, useId } from 'react';
import { ERA_MIN, ERA_MAX, formatCentury, formatCenturyUr } from '../../lib/data/era';

interface Props {
  value: [number, number];
  onChange: (range: [number, number]) => void;
  lang?: string;
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
          {lang === 'ur' ? 'دور' : 'Era'}
        </span>
        {!isDefault && (
          <button
            className="time-slider-reset"
            onClick={() => onChange([ERA_MIN, ERA_MAX])}
            aria-label={lang === 'ur' ? 'دور فلٹر ہٹائیں' : 'Reset era filter'}
          >
            {lang === 'ur' ? 'ہٹائیں' : 'Reset'}
          </button>
        )}
      </div>

      <div className="time-slider-range-label" aria-live="polite">
        {isDefault
          ? (lang === 'ur' ? 'تمام ادوار' : 'All eras')
          : `${century(selMin)} – ${century(selMax)}`}
      </div>

      <div className="time-slider-inputs">
        <label htmlFor={minId} className="sr-only">
          {lang === 'ur' ? 'شروع کی صدی' : 'Earliest century'}
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
          {lang === 'ur' ? 'آخری صدی' : 'Latest century'}
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
