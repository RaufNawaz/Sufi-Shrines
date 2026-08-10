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
import { categoryKey, categoryDisplayLabel } from '../../lib/data/categoryKey';
import { localizeFieldName } from '../../lib/data/fieldLabels';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';

function isFoundedKey(key: string): boolean {
  return key === 'Founded' || key === 'Founded/Opened';
}

interface Props {
  shrine: Shrine;
}

export function ShrineInfobox({ shrine }: Props) {
  const { t, lang, localizeField, fmtNum } = useLang();
  const catKey = categoryKey(shrine.category);
  const categoryLabel =
    categoryDisplayLabel(shrine.category, lang) ??
    (localizeField(shrine.raw, 'Category') || shrine.category);

  // Build ordered rows: priority keys first, then remaining, up to max
  const allEntries = Object.entries(shrine.raw).filter(([key, value]) => {
    if (!value || String(value).trim() === '') return false;
    if (key.startsWith('_')) return false;
    if (NON_DETAIL_KEYS.has(key)) return false;
    // New structured columns get dedicated UI (badge/status/filters) — never
    // a generic snake_case row.
    if (STRUCTURED_FACET_KEYS.has(key)) return false;
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
      // The Category row shows the effective category (new `category` column
      // when present) so it never contradicts the badge above.
      const localValue =
        entry[0] === 'Category'
          ? (categoryDisplayLabel(shrine.category, lang) ?? localizeField(shrine.raw, entry[0]))
          : isFoundedKey(entry[0])
            ? resolveFoundedDate(shrine.raw, lang)
            : localizeField(shrine.raw, entry[0]);
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

    const localValue = isFoundedKey(key)
      ? resolveFoundedDate(shrine.raw, lang)
      : localizeField(shrine.raw, key);
    if (localValue) remainingRows.push([key, localValue]);
  }

  const rows = [...priorityRows, ...remainingRows].slice(0, MAX_INFOBOX_ROWS);
  const hasDates = Boolean(
    shrine.yearBuilt || shrine.figureBorn || shrine.figureDied || shrine.eventYear,
  );

  if (rows.length === 0 && !hasDates) return null;

  return (
    <aside className="shrine-infobox" aria-label={t('shrineFacts')}>
      {categoryLabel && (
        <div className={`infobox-category-badge infobox-category-badge--${catKey}`}>
          {categoryLabel}
        </div>
      )}
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
                  fmtNum(value)
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
                  {shrine.yearBuiltPrecision ? ` (${shrine.yearBuiltPrecision})` : ''}
                </bdi>
                {shrine.yearBuiltNote && (
                  <p className="infobox-note">
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
                  <p className="infobox-note">
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
