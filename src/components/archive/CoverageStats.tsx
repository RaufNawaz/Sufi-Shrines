import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import type { Distribution } from '../../lib/data/coverage';

/**
 * The archive's self-description, as reusable parts.
 *
 * These four were private to `CoveragePage` while `/about` and `/report` said
 * the same kinds of thing in their own markup. Since
 * `src/lib/data/__tests__/archiveStatsAgree.test.ts` now holds the two
 * statistics builders to the same *numbers*, it would be odd for the pages to
 * disagree about how a number is *presented* — a bar with no count beside it and
 * a bar with one make different claims about precision. So the components are
 * shared, not the class names copied: `.coverage-*` rules stay the single
 * source of the look, and there is one place for "1 entries" to be fixed.
 */

/** A labelled bar row. Numbers first — this page is a table of facts. */
export function Bar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
}) {
  const { fmtNum } = useLang();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="coverage-bar-row">
      <span className="coverage-bar-label">{label}</span>
      <span className="coverage-bar-track" aria-hidden="true">
        <span
          className={`coverage-bar-fill${tone ? ` coverage-bar-fill--${tone}` : ''}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      {/* The count is the fact; the percentage is the aid. Both, because a
          percentage alone hides how small the denominator is. */}
      <span className="coverage-bar-value">
        {fmtNum(value)} <span className="coverage-bar-pct">({fmtNum(pct)}%)</span>
      </span>
    </li>
  );
}

/**
 * "N entries <predicate>". The noun is pluralised here rather than baked into
 * each label, so there is one place for it to be right — the first draft read
 * "1 entries citing nothing".
 */
export function Fact({
  value,
  label,
  noun,
}: {
  value: number;
  label: string;
  /**
   * The thing being counted, when it is not entries.
   *
   * Most facts on this page count entries, so that noun is the default and is
   * pluralised in one place. But "what the archive rests on" counts *sources*,
   * and the default produced "464 entries distinct sources" — a sentence that
   * is wrong in a way only reading the page catches. Pass `''` to let the label
   * carry its own noun.
   */
  noun?: string;
}) {
  const { lang, fmtNum } = useLang();
  const counted = noun ?? tFn(lang, 'coverageEntriesNoun', value);
  return (
    <li>
      <strong>{fmtNum(value)}</strong>
      {counted ? ` ${counted}` : ''} {label}
    </li>
  );
}

export function Stat({ value, label }: { value: number; label: string }) {
  const { fmtNum } = useLang();
  return (
    <div className="coverage-stat">
      <div className="coverage-stat-value">{fmtNum(value)}</div>
      <div className="coverage-stat-label">{label}</div>
    </div>
  );
}

export function DistributionBlock<K extends string>({
  heading,
  dist,
  keys,
  labelFor,
  toneFor,
}: {
  heading: string;
  dist: Distribution<K>;
  keys: readonly K[];
  labelFor: (key: K) => string;
  toneFor?: (key: K) => string | undefined;
}) {
  const { t } = useLang();
  return (
    <section className="coverage-section">
      <h2 className="coverage-section-heading">{heading}</h2>
      <ul className="coverage-bars">
        {keys.map((key) => (
          <Bar
            key={key}
            label={labelFor(key)}
            value={dist.counts[key]}
            total={dist.total}
            {...(toneFor?.(key) ? { tone: toneFor(key)! } : {})}
          />
        ))}
        {/* Shown even at zero: "the archive does not say" is a fact about the
            archive, and hiding the row would quietly imply there is no such
            case. */}
        <Bar label={t('coverageUnrecorded')} value={dist.unrecorded} total={dist.total} />
      </ul>
    </section>
  );
}
