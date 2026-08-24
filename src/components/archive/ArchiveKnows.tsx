import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { localizeRecordedName } from '../../lib/i18n/localizeRecordedName';
import { INFO_KEYS, SUPPORT_KEYS, TRADITION_KEYS, type CoverageReport } from '../../lib/data/coverage';
import { SUPPORT_LEVEL_LABEL_KEYS } from '../../lib/data/supportLevel';
import { INFO_LEVEL_LABEL_KEYS } from '../../lib/data/infoLevel';
import { CATEGORY_LABELS } from '../../lib/data/categoryKey';
import { buildPlaces } from '../../lib/data/places';
import { buildSourceIndex } from '../../lib/data/sourceIndex';
import { Fact, DistributionBlock } from './CoverageStats';
import type { Shrine } from '../../types/shrine';

/**
 * What this archive knows, and what it does not — computed, not asserted.
 *
 * This was `/coverage`, a page of its own. It is now the middle of `/about`,
 * because the archive's account of itself was split across three routes and a
 * reader asking the obvious question had to discover that two other pages
 * existed. Extracted as a component rather than pasted into `AboutPage`: the
 * merged page is long enough without nine more sections inlined into it.
 *
 * The standing findings in `docs/HANDOVER.md` are the most candid thing in this
 * project and no reader could see any of them. They also went stale: the note
 * that "49 of 167 entries have no bibliography at all" was true when written and
 * is now wrong (168 of 169 carry one). A section computed from the data cannot
 * drift from the data.
 */

/**
 * A citation's `*emphasis*` rendered as emphasis.
 *
 * The bibliography is markdown — "Alam Faqri, *Tazkirah Awliya-e-Pakistan*
 * (Lahore)" — and printing it as plain text put literal asterisks around every
 * title on the page. CLAUDE.md's rule is that this markdown is meaningful and
 * must be rendered, never stripped: a book title set in italics is the
 * distinction between the work and the sentence around it.
 *
 * Emphasis only, deliberately. A full markdown renderer here would parse a
 * citation's brackets, quotes and URLs as syntax, and the one thing a citation
 * must survive is being read literally — it is the reader's search string.
 */
function renderCitation(text: string): React.ReactNode[] {
  /* Split on paired single asterisks. The capture group is kept, so odd indices
     are the emphasised runs; an unpaired asterisk stays a literal asterisk,
     which is the right answer for a citation nobody has proof-read. */
  return text
    .split(/\*([^*]+)\*/g)
    .map((part, i) =>
      i % 2 === 1 ? <em key={i}>{part}</em> : <React.Fragment key={i}>{part}</React.Fragment>,
    );
}

export function ArchiveKnows({
  shrines,
  coverage,
}: {
  shrines: readonly Shrine[];
  coverage: CoverageReport;
}) {
  const { lang, t, fmtNum } = useLang();

  /* What the archive rests on, computed from the same data on every load. The
     graph's source layer is a build-time file on purpose (it is 169 KB of eager
     JS otherwise), so this rebuilds the index from the shrines already in
     memory — same extractor, same dedupe key, and sourceIndex.test.ts asserts
     the two arrive at the same numbers. */
  const restsOn = useMemo(() => buildSourceIndex(shrines), [shrines]);
  /* The index for /place/:slug. It lives among the limits because "35 sites in
     Lahore, 1 in Chiniot" is where the archive is thin, stated by geography. It
     is also the only inbound link to the place pages — a route reachable only by
     typing its URL is a route nobody reads, and the prerenderer needs something
     to crawl. */
  const { places, unplaced } = useMemo(() => buildPlaces(shrines), [shrines]);

  return (
    <>
      <DistributionBlock
        id="traditions"
        heading={t('coverageTraditionHeading')}
        dist={coverage.tradition}
        keys={TRADITION_KEYS}
        labelFor={(k) => CATEGORY_LABELS[k][lang]}
        toneFor={(k) => k}
      />

      <DistributionBlock
        id="support"
        heading={t('coverageSupportHeading')}
        note={t('aboutKnowsNote')}
        dist={coverage.support}
        keys={SUPPORT_KEYS}
        labelFor={(k) => t(SUPPORT_LEVEL_LABEL_KEYS[k])}
        toneFor={(k) => (k === 'field-verified' ? 'strong' : undefined)}
      />

      <DistributionBlock
        id="depth"
        heading={t('coverageInfoHeading')}
        dist={coverage.info}
        keys={INFO_KEYS}
        labelFor={(k) => t(INFO_LEVEL_LABEL_KEYS[k])}
      />

      <section className="coverage-section" id="citations">
        <h2 className="coverage-section-heading">{t('coverageSourcesHeading')}</h2>
        <ul className="coverage-facts">
          <Fact value={coverage.bibliography.withAny} label={t('coverageSourcesWithAny')} />
          <Fact
            value={coverage.bibliography.withThreeOrMore}
            label={t('coverageSourcesWithThree')}
          />
          <Fact value={coverage.bibliography.withNone} label={t('coverageSourcesWithNone')} />
        </ul>
      </section>

      {/* The citations counted the other way round: not how many each entry has,
          but how many entries lean on the same source. Per-entry bibliographies
          are on every shrine page; the question no surface could answer was what
          the archive as a whole rests on. It rests, in large part, on one book. */}
      {restsOn.sources.length > 0 && (
        <section className="coverage-section" id="rests-on">
          <h2 className="coverage-section-heading">{t('coverageRestsHeading')}</h2>
          <p className="coverage-note">{t('coverageRestsNote')}</p>
          <ul className="coverage-facts">
            {/* `noun=""` because these count sources, not entries — the default
                noun read "464 entries distinct sources". */}
            <Fact value={restsOn.sources.length} label={t('coverageRestsDistinct')} noun="" />
            <Fact value={restsOn.shared} label={t('coverageRestsShared')} noun="" />
            <Fact value={restsOn.singleSourced} label={t('coverageRestsSingle')} noun="" />
          </ul>

          <h3 className="inset-list-header">{t('coverageRestsTop')}</h3>
          <ul className="inset-list coverage-rests-list">
            {restsOn.sources
              .filter((source) => source.shrines.length > 1)
              .map((source) => (
                <li key={source.key} className="inset-row">
                  {/* A citation is Latin by design — the source's real title,
                      publisher and URL, which is the exact search string a reader
                      is owed (i18n rule 7). Declared and isolated rather than
                      translated. */}
                  <span className="inset-row-label coverage-rests-citation" data-latin>
                    <bdi>{renderCitation(source.name)}</bdi>
                  </span>
                  <span className="inset-row-note">
                    {fmtNum(tFn(lang, 'coverageRestsEntryCount', source.shrines.length))}
                  </span>
                </li>
              ))}
          </ul>
          <p className="coverage-note">
            {fmtNum(tFn(lang, 'coverageRestsTail', restsOn.sources.length - restsOn.shared))}{' '}
            {t('coverageRestsCaveat')}
          </p>
        </section>
      )}

      <section className="coverage-section" id="photography">
        <h2 className="coverage-section-heading">{t('coveragePhotosHeading')}</h2>
        <ul className="coverage-facts">
          <Fact value={coverage.photos.withNone} label={t('coveragePhotosWithNone')} />
        </ul>
      </section>

      <section className="coverage-section" id="dates">
        <h2 className="coverage-section-heading">{t('coverageDatesHeading')}</h2>
        <ul className="coverage-facts">
          <Fact value={coverage.dates.withYear} label={t('coverageDatesWithYear')} />
          <li>
            <strong>{fmtNum(coverage.dates.exact)}</strong> {t('coverageDatesExact')}
          </li>
          {/* A date the archive argues with is better content than a tidy number
              (CLAUDE.md RULE 2), so this is reported as a feature of the record
              rather than as a defect. */}
          <Fact value={coverage.dates.hedged} label={t('coverageDatesHedged')} />
        </ul>
      </section>

      <section className="coverage-section" id="coordinates">
        <h2 className="coverage-section-heading">{t('coverageLocationHeading')}</h2>
        <ul className="coverage-facts">
          <Fact value={coverage.location.approximatePin} label={t('coverageLocationApprox')} />
        </ul>
      </section>

      <section className="coverage-section" id="observances">
        <h2 className="coverage-section-heading">{t('coverageObservancesHeading')}</h2>
        <ul className="coverage-facts">
          <Fact value={coverage.observances.withText} label={t('coverageObservancesWithText')} />
          <Fact value={coverage.observances.withNone} label={t('coverageObservancesWithNone')} />
        </ul>
      </section>

      <section className="coverage-section" id="places">
        <h2 className="coverage-section-heading">{t('placesTitle')}</h2>
        <p className="coverage-place-note">{t('placesIntro')}</p>
        <ul className="coverage-place-list">
          {places.map((place) => (
            <li key={place.slug}>
              <Link to={`/place/${place.slug}`} className="coverage-place-link">
                <bdi className="coverage-place-name">
                  {localizeRecordedName(place.name, lang)}
                </bdi>
                <span className="coverage-place-count">
                  {fmtNum(tFn(lang, 'placeSiteCount', place.shrines.length))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Stated, not hidden: the places vocabulary is hand-written, so what it
            fails to match is a limit of this page and belongs among the limits. */}
        <ul className="coverage-facts">
          <li>{fmtNum(tFn(lang, 'placesUnplaced', unplaced.length))}</li>
        </ul>
      </section>
    </>
  );
}
