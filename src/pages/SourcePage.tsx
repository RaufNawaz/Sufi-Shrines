import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { NotFoundSearch } from '../components/ui/NotFoundSearch';
import { useShrineData } from '../hooks/useShrineData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { isRtlLang } from '../lib/i18n/languages';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { useTeamAccess } from '../lib/projectAccess';
import { publicLocation } from '../lib/data/publicLocation';
import { sourceAnchorId } from '../lib/data/sourceIndex';
import { categoryKey } from '../lib/data/categoryKey';
import { buildPlaces, placesForShrine } from '../lib/data/places';
import { localizeRecordedName } from '../lib/i18n/localizeRecordedName';
import {
  bookText,
  buildLibrary,
  coCited,
  copySearchLinks,
  type CopyService,
  type Library,
  type ShelfWork,
} from '../lib/data/sourceLibrary';
import { DotMap } from '../components/sources/DotMap';
import {
  CitationText,
  SourceRow,
  TraditionMix,
  WorkTitle,
} from '../components/sources/SourceParts';
import { LANGUAGE_LABEL_KEYS } from '../components/sources/sourceLabels';
import type { Lang, Shrine } from '../types/shrine';

/**
 * `/source/:slug` — one book, and everything the archive does with it.
 *
 * The question a reader brings is "what rests on this?", and the page answers
 * it in the order they would ask: how much (the facts), where (the map), which
 * traditions, which entries by name, in what words the archive cites it, what
 * those same entries read beside it, and where to find a copy.
 *
 * A book read in full but not yet cited says exactly that, and keeps the parts
 * that are still true of it — what it is, and where to find it — rather than
 * showing a reader empty sections.
 */

const COPY_LABEL_KEYS: Record<CopyService, Parameters<ReturnType<typeof useLang>['t']>[0]> = {
  worldcat: 'sourceFindWorldcat',
  googleBooks: 'sourceFindGoogleBooks',
  internetArchive: 'sourceFindInternetArchive',
  openLibrary: 'sourceFindOpenLibrary',
};

function SourceContent({ work, library, lang }: { work: ShelfWork; library: Library; lang: Lang }) {
  const { t, fmtNum, localizeField } = useLang();
  const { shrines } = useShrineData();
  const headingRef = useFocusHeadingOnMount();
  const teamView = useTeamAccess();
  useDocumentTitle(`${work.title.split(':')[0]} — ${t('siteTitle')}`);

  const shrinesBySlug = useMemo(() => new Map(shrines.map((s) => [s.slug, s])), [shrines]);
  const companions = useMemo(() => coCited(work, library), [work, library]);

  /* The same "where" as the map, by name: how many of this work's sites fall in
     each place the archive has a page for. A place with one site in the whole
     archive has no page (`buildPlaces`' floor), so it is named without a link
     rather than linked to nothing. */
  const places = useMemo(() => {
    const paged = new Set(buildPlaces(shrines).places.map((p) => p.slug));
    const tally = new Map<string, { slug: string; name: string; count: number }>();
    for (const shrine of work.entries) {
      for (const place of placesForShrine(shrine)) {
        const row = tally.get(place.slug) ?? { slug: place.slug, name: place.name, count: 0 };
        row.count += 1;
        tally.set(place.slug, row);
      }
    }
    return [...tally.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((row) => ({ ...row, paged: paged.has(row.slug) }));
  }, [shrines, work.entries]);
  const book = work.book;
  const { year, note } = bookText(book, work.year, lang);
  const original = book && LANGUAGE_LABEL_KEYS[book.original];
  const read = book && LANGUAGE_LABEL_KEYS[book.read];
  const cited = work.entries.length > 0;

  const rowLocation = (shrine: Shrine): string =>
    teamView
      ? shrine.location
      : publicLocation(localizeField(shrine.raw, 'Location') || shrine.location, shrine, lang);

  return (
    <>
      <p className="entity-type-kicker">
        {t('sourceKicker')}
        {book && <span className="source-read-badge">{t('sourceReadBadge')}</span>}
      </p>
      {/* In Urdu, the Urdu title where the archive's own Urdu articles name the
          work (the Tazkirah, 34 times) — with the romanized title kept beneath
          it as the search string (Urdu council, 17 October 2026). */}
      {isRtlLang(lang) && work.titleUr ? (
        <>
          <h1 ref={headingRef} className="entity-title source-title">
            {work.titleUr}
          </h1>
          <p className="source-title-latin">
            <bdi lang="en" data-latin>
              {work.title}
            </bdi>
          </p>
        </>
      ) : (
        <h1 ref={headingRef} className="entity-title source-title">
          <bdi lang="en" data-latin>
            {work.title}
          </bdi>
        </h1>
      )}
      {work.author && (
        <p className="source-author">
          <bdi lang="en" data-latin>
            {work.author}
          </bdi>
        </p>
      )}

      <dl className="source-facts">
        <div className="source-fact">
          <dt>{t('sourceFactEntries')}</dt>
          <dd>{fmtNum(work.entries.length)}</dd>
        </div>
        {work.citations.length > 1 && (
          <div className="source-fact">
            <dt>{t('sourceFactLines')}</dt>
            <dd>{fmtNum(work.citations.length)}</dd>
          </div>
        )}
        {year && (
          <div className="source-fact">
            <dt>{t('sourceFactYear')}</dt>
            <dd {...(/[A-Za-z]/.test(year) ? { 'data-latin': '' } : {})}>{year}</dd>
          </div>
        )}
        {original && (
          <div className="source-fact">
            <dt>{t('sourceFactWritten')}</dt>
            <dd>{t(original)}</dd>
          </div>
        )}
        {read && book!.read !== book!.original && (
          <div className="source-fact">
            <dt>{t('sourceFactRead')}</dt>
            <dd>{t(read)}</dd>
          </div>
        )}
        {book?.pages && (
          <div className="source-fact">
            <dt>{t('sourceFactPages')}</dt>
            <dd>{fmtNum(book.pages)}</dd>
          </div>
        )}
      </dl>

      {note && <p className="source-note">{note}</p>}

      {/* Team only: where the reading notes for this book live. The notes are
          unreviewed working material, not something to publish (HANDOVER §9.183). */}
      {teamView && book && (
        <p className="source-team-note" data-latin>
          <bdi>entries/book_takeaways/{book.id}.md</bdi>
        </p>
      )}

      {!cited && book && <p className="source-callout">{t('sourceNotYetCited')}</p>}

      {/* Near the top, because getting hold of the book is why most readers
          open this page; it sat under every entry and citation, eight phone
          screens down on the Tazkirah (journeys council, 17 Oct 2026). */}
      <section className="kg-section source-find-section" aria-labelledby="source-find-heading">
        <h2 id="source-find-heading" className="kg-section-heading">
          {t('sourceFindHeading')}
        </h2>
        <p className="kg-section-note">{t('sourceFindNote')}</p>
        <ul className="source-find">
          {copySearchLinks(work).map(({ service, url }) => (
            <li key={service}>
              <a className="source-find-link" href={url} target="_blank" rel="noopener noreferrer">
                {t(COPY_LABEL_KEYS[service])}
                <span aria-hidden="true"> ↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {cited && (
        <div className="source-overview">
          <section className="kg-section source-map-section" aria-labelledby="source-map-heading">
            <h2 id="source-map-heading" className="kg-section-heading">
              {t('sourceMapHeading')}
            </h2>
            <DotMap entries={work.entries} />
            <p className="kg-section-note">{t('sourceMapNote')}</p>
          </section>

          <section className="kg-section" aria-labelledby="source-traditions-heading">
            <h2 id="source-traditions-heading" className="kg-section-heading">
              {t('sourceTraditionsHeading')}
            </h2>
            <TraditionMix entries={work.entries} />
            {places.length > 0 && (
              <>
                <h2 className="kg-section-heading source-places-heading">
                  {t('sourcePlacesHeading')}
                </h2>
                <ul className="source-places">
                  {places.map((place) => {
                    const body = (
                      <>
                        <bdi>{localizeRecordedName(place.name, lang)}</bdi>
                        <span className="source-place-count">{fmtNum(place.count)}</span>
                      </>
                    );
                    return (
                      <li key={place.slug}>
                        {place.paged ? (
                          <Link
                            to={`/place/${place.slug}`}
                            className="source-place source-place--link"
                          >
                            {body}
                          </Link>
                        ) : (
                          <span className="source-place">{body}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      {cited && (
        <section className="kg-section" aria-labelledby="source-entries-heading">
          <h2 id="source-entries-heading" className="kg-section-heading">
            {t('sourceEntriesHeading')}
          </h2>
          <ul className="inset-list">
            {work.entries.map((shrine, i) => (
              <li
                key={shrine.slug}
                className="inset-row inset-row--link reveal-rise"
                style={{ '--stagger-index': Math.min(i, 12) } as React.CSSProperties}
              >
                <Link to={`/shrine/${shrine.slug}`}>
                  <span
                    className={`source-entry-dot source-map-dot--${categoryKey(shrine.category)}`}
                    aria-hidden="true"
                  />
                  <span className="inset-row-label inset-row-label--stacked">
                    <span className="inset-row-title">
                      <bdi>{localizeShrineName(shrine, lang)}</bdi>
                    </span>
                    {rowLocation(shrine) && (
                      <span className="inset-row-sub" data-latin>
                        <bdi>{rowLocation(shrine)}</bdi>
                      </span>
                    )}
                  </span>
                  <span className="inset-row-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {work.citations.length > 0 && (
        <section className="kg-section" aria-labelledby="source-citations-heading">
          <h2 id="source-citations-heading" className="kg-section-heading">
            {t('sourceCitationsHeading')}
          </h2>
          <p className="kg-section-note">{t('sourceCitationsNote')}</p>
          <ul className="sources-list">
            {work.citations.map((source) => (
              <SourceRow
                key={source.key}
                source={source}
                shrinesBySlug={shrinesBySlug}
                worksBySlug={new Map()}
              />
            ))}
          </ul>
        </section>
      )}

      {companions.length > 0 && (
        <section className="kg-section" aria-labelledby="source-cocited-heading">
          <h2 id="source-cocited-heading" className="kg-section-heading">
            {t('sourceCoCitedHeading')}
          </h2>
          <p className="kg-section-note">{t('sourceCoCitedNote')}</p>
          <ul className="inset-list source-companions">
            {companions.map((c) => (
              <li key={c.work?.slug ?? c.source!.key} className="inset-row inset-row--link">
                <Link
                  to={
                    c.work ? `/source/${c.work.slug}` : `/sources#${sourceAnchorId(c.source!.name)}`
                  }
                >
                  <span className="inset-row-label inset-row-label--stacked">
                    {c.work ? (
                      <span className="inset-row-title">
                        <WorkTitle work={c.work} />
                      </span>
                    ) : (
                      <CitationText text={c.source!.name} className="source-companion-line" />
                    )}
                    <span className="inset-row-sub">
                      {fmtNum(tFn(lang, 'coverageRestsEntryCount', c.shared))}
                    </span>
                  </span>
                  <span className="inset-row-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function SourcePage() {
  const { slug } = useParams<{ slug: string }>();
  const { shrines, loading, offline, sourceTimestamp, source, error } = useShrineData();
  const { lang, t } = useLang();
  const isRtl = isRtlLang(lang);

  const library = useMemo(() => buildLibrary(shrines), [shrines]);
  /* The read-book list is shipped with the app, so a book page can render
     before the sheet arrives; only cited works need the data. */
  const work = library.works.find((w) => w.slug === slug) ?? null;

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader {...(work ? { title: work.title.split(':')[0] } : {})} />
      <main
        className="entity-page source-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li>
              <Link to="/sources">{t('sourcesTitle')}</Link>
            </li>
            {work && (
              <li aria-current="page">
                {isRtl && work.titleUr ? (
                  work.titleUr
                ) : (
                  <bdi lang="en" data-latin>
                    {work.title.split(':')[0]}
                  </bdi>
                )}
              </li>
            )}
          </ol>
        </nav>

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        {/* Not from the slim index: it holds no bibliographies, so a read book
            would say "no published entry cites this book yet" until the sheet
            arrived — a false sentence, however brief. */}
        {(loading && shrines.length === 0) || (source === 'index' && !error) ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : work ? (
          <SourceContent work={work} library={library} lang={lang} />
        ) : (
          <>
            <h1 className="entity-title">{t('sourcesTitle')}</h1>
            <p className="coverage-intro">{t('sourceNotFound')}</p>
            <NotFoundSearch />
          </>
        )}
        <SiteFooter />
      </main>
      <ScrollToTop />
    </div>
  );
}
