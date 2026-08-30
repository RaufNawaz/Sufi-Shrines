import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { formatDistance } from '../lib/i18n/formatDistance';
import { isRtlLang } from '../lib/i18n/languages';
import { CATEGORY_LABELS } from '../lib/data/categoryKey';
import { useReaderPreferences } from '../lib/preferences/ReaderPreferencesContext';
import { buildSharedGroundOverview, type CrossTraditionAdjacency } from '../lib/data/sharedGround';

/**
 * Shared ground, across the whole archive.
 *
 * Track A of `docs/planning/SHARED_GROUND_VISION.md` shipped the per-site
 * section on a shrine page — "who else is within walking distance of *this*
 * one". The archive-wide half of it never did: `crossTraditionAdjacencies()`
 * has been exported and tested since 21 August 2026 and **nothing called it**,
 * so the one fact this phase exists to show — that the traditions this archive
 * documents stand on the same streets — could only be seen one shrine at a
 * time, by a reader who already knew which shrine to open.
 *
 * Two rules this page is built around, both from the vision doc:
 *
 * 1. **No chaining, so no groups.** The obvious layout is a list of complexes.
 *    Single-linking everything within 800 m produces one component of 15 sites
 *    measuring 3,358 m across — central Lahore, presented as a courtyard. The
 *    only units here are a pair with a measured distance and a count of pairs.
 * 2. **A distance the archive did not measure is never shown as one it did.**
 *    Two of the pairs share a recorded pin because the survey gives no separate
 *    position, and they say so instead of printing "0 m".
 *
 * Everything is computed from the loaded data on each render, for the reason
 * `/about` computes its own figures: the count in the vision doc, in
 * `CLAUDE.md` and in two component docstrings said "eight places" for nine days
 * after it stopped being the number. A page cannot go stale the way a note can.
 */

function TraditionName({ tradition }: { tradition: keyof typeof CATEGORY_LABELS }) {
  const { lang } = useLang();
  return (
    <span className={`shared-ground-tradition shared-ground-tradition--${tradition}`}>
      {CATEGORY_LABELS[tradition][lang]}
    </span>
  );
}

/** One crossing: two sites, their traditions, and how far apart the archive
 *  records them. */
function Crossing({ pair }: { pair: CrossTraditionAdjacency }) {
  const { lang, t, fmtNum } = useLang();
  const { units } = useReaderPreferences();

  return (
    <li className="crossing">
      {/* The distance leads. It is the claim the row is making — the names are
          what the claim is about — and putting it first means the list reads
          as a scale from "one recorded position" outwards, which is the shape
          of the finding. */}
      {pair.samePin ? (
        <span
          className="crossing-distance crossing-distance--same"
          title={t('sharedGroundSamePinHelp')}
        >
          {t('sharedGroundSamePin')}
        </span>
      ) : (
        <span className="crossing-distance">
          {formatDistance(pair.distanceM / 1000, units, lang, fmtNum, {
            style: 'apart',
            below: 'metres',
          })}
        </span>
      )}

      <span className="crossing-sites">
        {[pair.a, pair.b].map((shrine, i) => (
          <React.Fragment key={shrine.id}>
            {i > 0 && (
              /* A separator, not a word: "and" would be a sentence fragment
                 assembled by this component, and the two sites are not ordered
                 by anything a reader should read as ranking. */
              <span className="crossing-join" aria-hidden="true">
                ·
              </span>
            )}
            <span className="crossing-site">
              <Link to={`/shrine/${shrine.slug}`} className="shared-ground-name">
                {/* <bdi> because a name with no dictionary entry falls back to
                    Latin, and an unwrapped Latin run inside the RTL page
                    reorders the punctuation around it. */}
                <bdi>{localizeShrineName(shrine, lang)}</bdi>
              </Link>
              <TraditionName tradition={i === 0 ? pair.traditionA : pair.traditionB} />
            </span>
          </React.Fragment>
        ))}
      </span>
    </li>
  );
}

export default function SharedGroundPage() {
  const { shrines, loading, offline, sourceTimestamp } = useShrineData();
  const { t, lang, fmtNum } = useLang();
  const { units } = useReaderPreferences();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('sharedGroundPageTitle')} — ${t('siteTitle')}`);

  const overview = useMemo(() => buildSharedGroundOverview(shrines), [shrines]);

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('sharedGroundPageTitle')} />

      <article
        className="entity-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li className="shrine-breadcrumb-current" aria-current="page">
              {t('sharedGroundPageTitle')}
            </li>
          </ol>
        </nav>

        <h1 className="entity-title" ref={headingRef} tabIndex={-1}>
          {t('sharedGroundPageTitle')}
        </h1>
        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />
        <p className="sg-lede">{t('sharedGroundPageLede')}</p>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : overview.crossTradition.length === 0 ? (
          <p className="sg-empty">{t('sharedGroundEmpty')}</p>
        ) : (
          <>
            {/* The numbers, in the order the argument is made: how much of the
                archive is adjacent at all, then how much of that adjacency
                crosses a tradition. `sharedGroundStatPairs` counts every
                neighbouring pair, not only the crossings, because the second
                number means nothing without the first. */}
            <dl className="sg-stats">
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.sitesWithNeighbours)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatAdjacent')}</dd>
              </div>
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.pairs)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatPairs')}</dd>
              </div>
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.crossTraditionSites)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatCrossSites')}</dd>
              </div>
            </dl>
            <p className="sg-headline">
              {fmtNum(
                tFn(
                  lang,
                  'sharedGroundCrossOfPairs',
                  overview.crossTradition.length,
                  overview.pairs,
                ),
              )}
            </p>

            <section className="sg-section" aria-labelledby="sg-meetings-heading">
              <h2 className="sg-section-heading" id="sg-meetings-heading">
                {t('sharedGroundMeetingsHeading')}
              </h2>
              <p className="sg-section-note">{t('sharedGroundMeetingsNote')}</p>
              <ul className="sg-meetings">
                {overview.meetings.map((meeting) => (
                  <li className="sg-meeting" key={meeting.traditions.join('+')}>
                    <span className="sg-meeting-pair">
                      <TraditionName tradition={meeting.traditions[0]} />
                      <span className="crossing-join" aria-hidden="true">
                        ·
                      </span>
                      <TraditionName tradition={meeting.traditions[1]} />
                    </span>
                    <span className="sg-meeting-count">
                      {fmtNum(tFn(lang, 'sharedGroundMeetingPairs', meeting.pairs))}
                    </span>
                    {/* Through the same formatter the rows below use, and on
                        the reader's own units — a bare number here would be a
                        distance with no unit, and a hardcoded one would let
                        this column and those rows disagree.

                        And where the closest of these pairs shares a recorded
                        pin, this says so rather than printing the number:
                        summarising is not a licence to show a distance the
                        archive never measured. */}
                    <span
                      className={
                        meeting.nearestSamePin
                          ? 'sg-meeting-nearest sg-meeting-nearest--same'
                          : 'sg-meeting-nearest'
                      }
                      title={meeting.nearestSamePin ? t('sharedGroundSamePinHelp') : undefined}
                    >
                      {t('sharedGroundNearestLabel')} ·{' '}
                      {meeting.nearestSamePin
                        ? t('sharedGroundSamePin')
                        : formatDistance(meeting.nearestM / 1000, units, lang, fmtNum, {
                            style: 'apart',
                            below: 'metres',
                          })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="sg-section" aria-labelledby="sg-crossings-heading">
              <h2 className="sg-section-heading" id="sg-crossings-heading">
                {t('sharedGroundPairsHeading')}
              </h2>
              <ul className="sg-crossings">
                {overview.crossTradition.map((pair) => (
                  <Crossing key={`${pair.a.id}-${pair.b.id}`} pair={pair} />
                ))}
              </ul>
              {/* Straight into the lens, not just the map: a reader who has
                  read forty crossings should land on the view that draws them,
                  and `?lens=` is in the URL precisely so this link can exist. */}
              <p className="sg-map-link">
                <Link to="/?lens=shared-ground">{t('sharedGroundToMap')}</Link>
              </p>
            </section>

            <section className="sg-section sg-method" aria-labelledby="sg-method-heading">
              <h2 className="sg-section-heading" id="sg-method-heading">
                {t('sharedGroundMethodHeading')}
              </h2>
              <p>{fmtNum(t('sharedGroundMethodRadius'))}</p>
              <p>{t('sharedGroundMethodStraight')}</p>
              <p>{fmtNum(t('sharedGroundMethodNoClusters'))}</p>
              <p>{t('sharedGroundMethodSamePin')}</p>
            </section>
          </>
        )}

        <SiteFooter />
      </article>
    </div>
  );
}
