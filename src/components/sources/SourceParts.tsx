import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { sourceAnchorId } from '../../lib/data/sourceIndex';
import { urlInCitation, type LibrarySource, type ShelfWork } from '../../lib/data/sourceLibrary';
import { CATEGORY_LABELS } from '../../lib/data/categoryKey';
import { SOURCE_TYPE_LABEL_KEYS, traditionMix } from './sourceLabels';
import type { Shrine } from '../../types/shrine';

/**
 * The pieces `/sources` and `/source/:slug` share: a citation drawn as the
 * reader's search string, one expandable source row, and the tradition mix of a
 * set of entries. The dot map is `DotMap.tsx`, apart, so the index page — which
 * draws no map — does not load the country outline.
 */

/**
 * A citation with its emphasis and nothing else.
 *
 * Emphasis only, as on `/about`: a full markdown renderer would read a
 * citation's brackets and URLs as syntax, and the one thing a citation must
 * survive is being read literally. An unpaired asterisk stays an asterisk.
 *
 * `<bdi>` with `data-latin` where the line is Latin — citations stay in the
 * source's own script (i18n rule 7) — and not where it is not: an Urdu
 * citation declared Latin would inflate the leak budget that counts real ones.
 */
export function CitationText({ text, className }: { text: string; className?: string }) {
  const parts = text
    .split(/\*([^*]+)\*/g)
    .map((part, i) =>
      i % 2 === 1 ? <em key={i}>{part}</em> : <React.Fragment key={i}>{part}</React.Fragment>,
    );
  return (
    <bdi
      className={`sources-citation${className ? ` ${className}` : ''}`}
      {...(/[A-Za-z]/.test(text) ? { 'data-latin': '' } : {})}
    >
      {parts}
    </bdi>
  );
}

/** A work's title and author, Latin in both views as a bibliography is. */
export function WorkTitle({ work, as = 'span' }: { work: ShelfWork; as?: 'span' | 'h1' }) {
  const Tag = as;
  return (
    <Tag className={as === 'h1' ? 'entity-title source-title' : 'source-work-title'}>
      <bdi data-latin>{work.title}</bdi>
    </Tag>
  );
}

/**
 * One citation line: what it says, what kind of thing it is, and — opened —
 * every entry citing it, the work it names, and the source itself when the line
 * carries a URL.
 *
 * A native `<details>`: keyboard, screen reader and find-in-page all work
 * without a line of script, and a deep link opens it through `open`.
 */
export function SourceRow({
  source,
  shrinesBySlug,
  worksBySlug,
  open,
  highlighted,
  fromSlug,
  onToggle,
}: {
  source: LibrarySource;
  shrinesBySlug: Map<string, Shrine>;
  worksBySlug: Map<string, ShelfWork>;
  open?: boolean;
  highlighted?: boolean;
  /** The entry the reader followed a link from, marked among the chips. */
  fromSlug?: string;
  onToggle?: (open: boolean) => void;
}) {
  const { lang, t, fmtNum } = useLang();
  const url = urlInCitation(source.name);
  const works = source.works.map((slug) => worksBySlug.get(slug)).filter(Boolean) as ShelfWork[];

  return (
    <li
      id={sourceAnchorId(source.name)}
      className={`sources-row${highlighted ? ' sources-row--targeted' : ''}`}
    >
      <details
        open={open}
        onToggle={(e) => onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="sources-row-summary">
          <span className={`sources-type-dot sources-type--${source.type}`} aria-hidden="true" />
          <span className="sources-row-main">
            <CitationText text={source.name} />
            <span className="sources-row-meta">
              {t(SOURCE_TYPE_LABEL_KEYS[source.type])}
              {' · '}
              {fmtNum(tFn(lang, 'coverageRestsEntryCount', source.shrines.length))}
            </span>
          </span>
        </summary>
        <div className="sources-row-body">
          {/* The way onward first — the work's page, the source itself — and
              then the entries: a widely cited line has twenty-five chips, and
              the link a reader most likely wants sat under all of them. */}
          {(works.length > 0 || url) && (
            <p className="sources-row-actions">
              {works.map((work) => (
                <Link key={work.slug} to={`/source/${work.slug}`} className="sources-action">
                  {t('sourcesOpenWork')}
                  {': '}
                  <bdi data-latin>{work.title.split(':')[0]}</bdi>
                </Link>
              ))}
              {url && (
                <a className="sources-action" href={url} target="_blank" rel="noopener noreferrer">
                  {t('sourcesOpenLink')}
                  <span aria-hidden="true"> ↗</span>
                </a>
              )}
            </p>
          )}
          <ul className="sources-entry-tags">
            {source.shrines.map(({ slug, name }) => {
              const shrine = shrinesBySlug.get(slug);
              return (
                <li key={slug}>
                  <Link
                    to={`/shrine/${slug}`}
                    className={`entity-saint-shrine-tag${slug === fromSlug ? ' sources-entry-tag--from' : ''}`}
                  >
                    <bdi>{shrine ? localizeShrineName(shrine, lang) : name}</bdi>
                    {slug === fromSlug && (
                      <span className="sources-entry-from">{t('sourcesCameFrom')}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </li>
  );
}

/** The typology atlas's tradition bar, with its words, for any set of entries. */
export function TraditionMix({ entries }: { entries: readonly Shrine[] }) {
  const { lang, fmtNum } = useLang();
  const mix = traditionMix(entries);
  const total = mix.reduce((n, m) => n + m.count, 0);
  if (total === 0) return null;
  return (
    <p className="typology-mix-legend">
      <span className="typology-mix" aria-hidden="true">
        {mix.map(({ key, count }) => (
          <span
            key={key}
            className={`typology-mix-slice typology-mix-slice--${key}`}
            style={{ inlineSize: `${(count / total) * 100}%` }}
          />
        ))}
      </span>
      <span className="typology-mix-words">
        {mix.map(({ key, count }) => (
          <span key={key} className={`typology-mix-word typology-mix-word--${key}`}>
            <span className="typology-mix-dot" aria-hidden="true" />
            {CATEGORY_LABELS[key][lang]} {fmtNum(count)}
          </span>
        ))}
      </span>
    </p>
  );
}
