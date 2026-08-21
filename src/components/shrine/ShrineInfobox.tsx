import React from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import {
  INFOBOX_PRIORITY_KEYS,
  MAX_INFOBOX_ROWS,
  NON_DETAIL_KEYS,
  STRUCTURED_FACET_KEYS,
} from '../../lib/data/constants';
import { isLikelyUrl, isUrduVariantKey, normalizeUrl } from '../../lib/data/fieldAliasing';
import { localizeFieldName } from '../../lib/data/fieldLabels';
import { yearPrecisionKey, YEAR_PRECISION_LABEL_KEYS } from '../../lib/data/yearPrecision';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';
import { localizeObservance } from '../../lib/i18n/localizeObservance';
import type { Lang } from '../../types/shrine';

function isFoundedKey(key: string): boolean {
  return key === 'Founded' || key === 'Founded/Opened';
}

/* `Events` is semicolon-joined ("Annual urs; qawwali and naat; daily langar"),
   so localizeField's whole-string lookup matches almost none of it. Same shape
   of special case as Founded above. */
function isEventsKey(key: string): boolean {
  return key === 'Events';
}

function resolveFieldValue(
  shrine: Shrine,
  key: string,
  lang: Lang,
  localizeField: (row: Shrine['raw'], field: string) => string,
): string {
  if (isFoundedKey(key)) return resolveFoundedDate(shrine.raw, lang);
  if (isEventsKey(key)) return localizeObservance(localizeField(shrine.raw, key), lang);
  return localizeField(shrine.raw, key);
}

/** localizeField() only ever returns Latin text in the Urdu view when
 * translateToUrdu() fell through to the raw original — Latin content is
 * itself the "untranslated" signal (see urduFallback.ts). */
function isUntranslatedInUrdu(lang: string, value: string): boolean {
  return lang === 'ur' && /[A-Za-z]/.test(value);
}

interface Props {
  shrine: Shrine;
}

export function ShrineInfobox({ shrine }: Props) {
  const { t, lang, localizeField, fmtNum } = useLang();

  // Build ordered rows: priority keys first, then remaining, up to max
  const allEntries = Object.entries(shrine.raw).filter(([key, value]) => {
    if (!value || String(value).trim() === '') return false;
    if (key.startsWith('_')) return false;
    if (NON_DETAIL_KEYS.has(key)) return false;
    // New structured columns get dedicated UI (badge/status/filters) — never
    // a generic snake_case row.
    if (STRUCTURED_FACET_KEYS.has(key)) return false;
    // The category badge above always shows this (falling back to legacy
    // `Category` itself when the new column is blank) — a plain fact row
    // repeating the same value right underneath it is pure redundancy.
    if (key === 'Category') return false;
    // The dedicated dates block below owns Founded once year_built is
    // present — otherwise this legacy row is still the only source for it.
    if (shrine.yearBuilt && isFoundedKey(key)) return false;
    if (isUrduVariantKey(key)) return false;
    if (key === 'Name' || key === 'Slug') return false;
    return true;
  });

  const priorityRows: [string, string][] = [];
  const remainingRows: [string, string][] = [];

  for (const key of INFOBOX_PRIORITY_KEYS) {
    const entry = allEntries.find(([k]) => k === key);
    if (entry) {
      const localValue = resolveFieldValue(shrine, entry[0], lang, localizeField);
      if (localValue) priorityRows.push([entry[0], localValue]);
    }
  }

  for (const [key] of allEntries) {
    if (INFOBOX_PRIORITY_KEYS.includes(key)) continue;
    // Skip section keys — they go in article
    if (
      key === 'Description' ||
      key === 'History' ||
      key === 'Architecture' ||
      key === 'Rituals' ||
      key === 'Saint Biography' ||
      key === 'Events & Urs' ||
      key === 'Visiting Info' ||
      key === 'Sources'
    )
      continue;
    // Skip gallery keys
    if (/^Gallery\s*\d+|^Image\s*\d+|^Caption\s*\d+/i.test(key)) continue;

    const localValue = resolveFieldValue(shrine, key, lang, localizeField);
    if (localValue) remainingRows.push([key, localValue]);
  }

  const rows = [...priorityRows, ...remainingRows].slice(0, MAX_INFOBOX_ROWS);
  const hasDates = Boolean(
    shrine.yearBuilt || shrine.figureBorn || shrine.figureDied || shrine.eventYear,
  );

  if (rows.length === 0 && !hasDates) return null;

  return (
    <aside className="shrine-infobox" aria-label={t('shrineFacts')}>
      {/* No category band here: the kicker above the masthead and the
          breadcrumb already name the category — a third, tinted repetition
          was the loudest element in the panel. */}
      <h2 className="infobox-title">{t('shrineFacts')}</h2>
      <dl className="infobox-list">
        {rows.map(([key, value]) => {
          const localKey = localizeFieldName(key, lang);
          return (
            <div className="infobox-row" key={key}>
              <dt className="infobox-label">{localKey || key}</dt>
              <dd className="infobox-value">
                {isLikelyUrl(value) ? (
                  <a href={normalizeUrl(value) ?? value} target="_blank" rel="noopener noreferrer">
                    {value.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  // <bdi> so an untranslated Latin fallback value can't
                  // garble the surrounding RTL layout (same treatment as
                  // the source notes below). lang="en" flags it as
                  // secondary content in the Urdu view (see shrine.css).
                  <bdi lang={isUntranslatedInUrdu(lang, value) ? 'en' : undefined}>
                    {fmtNum(value)}
                  </bdi>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {hasDates && (
        // Split date fields (2026 schema) — kept out of the capped generic
        // rows above so the qualifier and note are never truncated away.
        // The notes are unreviewed source prose, so they're wrapped in
        // <bdi> rather than translated (no-English-leak guard exemption).
        <dl className="infobox-list infobox-dates">
          {shrine.yearBuilt && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('founded')}</dt>
              <dd className="infobox-value">
                <bdi>
                  {fmtNum(shrine.yearBuilt)}
                  {(() => {
                    if (!shrine.yearBuiltPrecision) return '';
                    // Known precision vocabulary localizes; free-form
                    // qualifiers render verbatim, like the source notes.
                    const pk = yearPrecisionKey(shrine.yearBuiltPrecision);
                    return ` (${pk ? t(YEAR_PRECISION_LABEL_KEYS[pk]) : shrine.yearBuiltPrecision})`;
                  })()}
                </bdi>
                {shrine.yearBuiltNote && (
                  <p className="infobox-note" data-latin>
                    {t('sourceNoteLabel')}: <bdi>{shrine.yearBuiltNote}</bdi>
                  </p>
                )}
              </dd>
            </div>
          )}
          {shrine.figureBorn && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('born')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.figureBorn)}</bdi>
              </dd>
            </div>
          )}
          {shrine.figureDied && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('died')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.figureDied)}</bdi>
              </dd>
            </div>
          )}
          {shrine.eventYear && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('eventYearLabel')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.eventYear)}</bdi>
                {shrine.eventNote && (
                  <p className="infobox-note" data-latin>
                    {t('sourceNoteLabel')}: <bdi>{shrine.eventNote}</bdi>
                  </p>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}
      <div className="infobox-actions">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${shrine.latLng.lat},${shrine.latLng.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="infobox-action-btn"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          {t('getDirections')}
        </a>
      </div>
    </aside>
  );
}
