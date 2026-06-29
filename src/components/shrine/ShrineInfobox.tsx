import React from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { INFOBOX_PRIORITY_KEYS, MAX_INFOBOX_ROWS, NON_DETAIL_KEYS } from '../../lib/data/constants';
import { isLikelyUrl, isUrduVariantKey } from '../../lib/data/fieldAliasing';

interface Props {
  shrine: Shrine;
}

export function ShrineInfobox({ shrine }: Props) {
  const { lang, t, localizeField } = useLang();

  // Build ordered rows: priority keys first, then remaining, up to max
  const allEntries = Object.entries(shrine.raw).filter(([key, value]) => {
    if (!value || String(value).trim() === '') return false;
    if (key.startsWith('_')) return false;
    if (NON_DETAIL_KEYS.has(key)) return false;
    if (isUrduVariantKey(key)) return false;
    if (key === 'Name' || key === 'Slug') return false;
    return true;
  });

  const priorityRows: [string, string][] = [];
  const remainingRows: [string, string][] = [];

  for (const key of INFOBOX_PRIORITY_KEYS) {
    const entry = allEntries.find(([k]) => k === key);
    if (entry) {
      const localValue = localizeField(shrine.raw, entry[0]);
      if (localValue) priorityRows.push([entry[0], localValue]);
    }
  }

  for (const [key, value] of allEntries) {
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
    ) continue;
    // Skip gallery keys
    if (/^Gallery\s*\d+|^Image\s*\d+|^Caption\s*\d+/i.test(key)) continue;

    const localValue = localizeField(shrine.raw, key);
    if (localValue) remainingRows.push([key, localValue]);
  }

  const rows = [...priorityRows, ...remainingRows].slice(0, MAX_INFOBOX_ROWS);

  if (rows.length === 0) return null;

  return (
    <aside className="shrine-infobox" aria-label={t('shrineFacts')}>
      <h2 className="infobox-title">{t('shrineFacts')}</h2>
      {rows.map(([key, value]) => {
        const localKey = localizeField(shrine.raw, key) !== value
          ? localizeField(shrine.raw, key)
          : key;
        return (
          <div className="infobox-row" key={key}>
            <dt className="infobox-label">{localKey || key}</dt>
            <dd className="infobox-value">
              {isLikelyUrl(value) ? (
                <a href={value} target="_blank" rel="noopener noreferrer">
                  {value.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        );
      })}
    </aside>
  );
}
