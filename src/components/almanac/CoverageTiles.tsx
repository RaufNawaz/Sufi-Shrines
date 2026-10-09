import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { UiStringKey } from '../../lib/i18n/uiStrings';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * The almanac's coverage, as stat tiles over one proportion bar — the
 * 9 October 2026 redesign of a row that was five numbers on coloured rules.
 *
 * The bar is the shape of the archive's dating in one glance: how much of it
 * can be placed on a day, how much only to a month or a season, how much is
 * observed with no date written down, how much records no observance at all.
 * The tiles below it carry the same five figures large enough to read, each
 * counting up the first time it scrolls into view (`useCountUp`, which puts the
 * true number in the HTML and animates only in a browser that moves).
 *
 * The numbers are computed from the shipped data on every load, as they always
 * were, and the two largest are still gaps rather than holdings — the design
 * changes how they are read, not what they say.
 */

export type CoverageCounts = {
  dayPrecision: number;
  monthPrecision: number;
  seasonal: number;
  undated: number;
  noObservance: number;
  totalShrines: number;
};

const SLICES = [
  ['dayPrecision', 'almanacCoverageDayPrecision', 'day'],
  ['monthPrecision', 'almanacCoverageMonthPrecision', 'month'],
  ['seasonal', 'almanacCoverageSeasonal', 'season'],
  ['undated', 'almanacCoverageUndated', 'undated'],
  ['noObservance', 'almanacCoverageNone', 'none'],
] as const satisfies readonly (readonly [keyof CoverageCounts, UiStringKey, string])[];

function Tile({ count, label, variant }: { count: number; label: string; variant: string }) {
  const { fmtNum } = useLang();
  const { ref, value } = useCountUp<HTMLLIElement>(count);
  return (
    <li ref={ref} className={`almanac-coverage-item almanac-coverage-item--${variant}`}>
      <span className="almanac-coverage-count">{fmtNum(String(value))}</span>
      <span className="almanac-coverage-label">{label}</span>
    </li>
  );
}

export function CoverageTiles({ counts }: { counts: CoverageCounts }) {
  const { t } = useLang();
  const total = Math.max(1, counts.totalShrines);
  return (
    <>
      {/* Decorative: the tiles beneath carry every figure the bar draws. */}
      <div className="almanac-coverage-bar" aria-hidden="true">
        {SLICES.map(([key, , variant]) => (
          <span
            key={key}
            className={`almanac-coverage-bar-slice almanac-coverage-bar-slice--${variant}`}
            style={{ flexGrow: counts[key] / total }}
          />
        ))}
      </div>
      <ul className="almanac-coverage-list">
        {SLICES.map(([key, labelKey, variant]) => (
          <Tile key={key} count={counts[key]} label={t(labelKey)} variant={variant} />
        ))}
      </ul>
    </>
  );
}
