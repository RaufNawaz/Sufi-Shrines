import React, { useMemo, useState } from 'react';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useShrineData } from '../hooks/useShrineData';
import {
  buildCoverage,
  SUPPORT_KEYS,
  TRADITION_KEYS,
  type CoverageReport,
} from '../lib/data/coverage';
import { SUPPORT_LEVEL_LABEL_KEYS } from '../lib/data/supportLevel';
import { Bar, Fact, Stat } from '../components/archive/CoverageStats';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { PUBLICATION, archiveCitation, entryCitation } from '../lib/data/citation';
import { CONTACT_EMAIL, correctionIssueUrl } from '../lib/data/constants';

import { isRtlLang } from '../lib/i18n/languages';
/**
 * What this archive is, who made it, how to reuse it, and how to cite it.
 *
 * A public scholarly archive that states no licence and no citation is not
 * publishable, whatever else is true of it. `LICENSE` (MIT), `LICENSE-data.md`
 * (ODbL-1.0, with a prescribed attribution string) and `CITATION.cff` have
 * existed since the start of the project and none of them reached a visitor —
 * so a reuser had no way to know what they were permitted to do, and a scholar
 * had no citation to copy.
 *
 * Everything here is sourced from those files through `lib/data/citation.ts`,
 * which a test holds to them. A licence notice that has drifted from the licence
 * is worse than none: it tells a reuser something untrue about their rights.
 *
 * **And what the archive actually holds.** This page used to describe the
 * project and hand the reader a link — "See what this archive knows" — for the
 * only part that is checkable. The archive's own account of itself was split
 * across three pages (`/about`, `/coverage`, `/report`), which means a reader
 * asking the obvious question had to find out that two other pages existed. The
 * measured state now lives here, computed on load, with the two detail pages as
 * the drill-down rather than the only place the numbers appear.
 *
 * Computed, not written: the standing findings in `docs/HANDOVER.md` are the
 * most candid thing in this repository, and the note that "49 of 167 entries
 * have no bibliography at all" was quoted as current for weeks after it stopped
 * being true. A number counted on load cannot go stale that way.
 *
 * The two builders behind these figures — `buildCoverage` here and
 * `buildArchiveReport` on /report — are separate implementations of the same
 * statistics, held to each other by
 * `src/lib/data/__tests__/archiveStatsAgree.test.ts`. An archive whose claim is
 * candour cannot say "14 field-verified" on one page and "13" on another.
 */

/** A citation the reader can copy without selecting it by hand. */
function Citable({ label, text }: { label: string; text: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — the text is selectable
      // anyway, so there is nothing to recover from and nothing to announce.
    }
  };

  return (
    <div className="about-citation">
      <div className="about-citation-label">{label}</div>
      {/* dir/lang forced: a citation is a Latin-script string that must not be
          reordered by the surrounding RTL paragraph, and it carries a URL whose
          punctuation bidi would move. */}
      <p className="about-citation-text" lang="en" dir="ltr" data-latin>
        {text}
      </p>
      <button type="button" className="about-copy-btn" onClick={copy}>
        {copied ? t('aboutCopyDone') : t('aboutCopy')}
      </button>
    </div>
  );
}

/** How many traditions the archive actually has entries for, rather than how
 * many the schema names. Six are defined; a tradition with no entries is not
 * something this archive covers. */
function traditionsCovered(coverage: CoverageReport): number {
  return TRADITION_KEYS.filter((key) => coverage.tradition.counts[key] > 0).length;
}

export default function AboutPage() {
  const { lang, t } = useLang();
  const { shrines, loading } = useShrineData();
  const coverage = useMemo(() => buildCoverage(shrines), [shrines]);
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();

  useDocumentTitle(`${t('aboutTitle')} — ${t('siteTitle')}`);

  /* A worked example rather than a template with placeholders: a reader copying
     a citation should see the shape of a real one. */
  const exampleEntry = entryCitation('Data Darbar', 'data-darbar', new Date());

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={t('aboutTitle')} />

      <article
        className="entity-page about-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <h1 ref={headingRef} className="entity-title">
          {t('aboutTitle')}
        </h1>
        <p className="about-lede">{t('aboutLede')}</p>

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutScopeHeading')}</h2>
          <p>{t('aboutScopeBody')}</p>
        </section>

        {/* The measured state, between "what this is" and "how it is built" —
            a reader who has just been told what the archive is for should learn
            what is actually in it before being told how it was assembled. Held
            back until the data is in rather than rendered as zeros: a headline
            reading "0 sites" is a lie the page tells for one paint. */}
        {!loading || shrines.length > 0 ? (
          <>
            <section className="about-section">
              <h2 className="about-section-heading">{t('aboutStateHeading')}</h2>
              <p className="about-note">{t('aboutStateNote')}</p>
              <div className="coverage-stat-grid">
                <Stat value={coverage.total} label={t('aboutStateSites')} />
                <Stat value={coverage.bibliography.items} label={t('aboutStateSources')} />
                <Stat value={coverage.photos.items} label={t('aboutStatePhotos')} />
                <Stat value={traditionsCovered(coverage)} label={t('aboutStateTraditions')} />
              </div>
            </section>

            <section className="about-section">
              <h2 className="about-section-heading">{t('aboutKnowsHeading')}</h2>
              <p className="about-note">{t('aboutKnowsNote')}</p>
              <ul className="coverage-bars">
                {SUPPORT_KEYS.map((key) => (
                  <Bar
                    key={key}
                    label={t(SUPPORT_LEVEL_LABEL_KEYS[key])}
                    value={coverage.support.counts[key]}
                    total={coverage.support.total}
                    {...(key === 'field-verified' ? { tone: 'strong' } : {})}
                  />
                ))}
                {/* Rendered at zero as well. "The archive does not say" is a fact
                    about the archive, and dropping the row would quietly imply
                    there is no such case. */}
                <Bar
                  label={t('coverageUnrecorded')}
                  value={coverage.support.unrecorded}
                  total={coverage.support.total}
                />
              </ul>
            </section>

            <section className="about-section">
              <h2 className="about-section-heading">{t('aboutThinHeading')}</h2>
              <p className="about-note">{t('aboutThinNote')}</p>
              <ul className="coverage-facts">
                <Fact value={coverage.photos.withNone} label={t('coveragePhotosWithNone')} />
                <Fact value={coverage.bibliography.withNone} label={t('coverageSourcesWithNone')} />
                <Fact
                  value={coverage.location.approximatePin}
                  label={t('coverageLocationApprox')}
                />
                <Fact
                  value={coverage.observances.withNone}
                  label={t('coverageObservancesWithNone')}
                />
                {/* A date the archive argues with is better content than a tidy
                    number (RULE 2), so this sits among the facts rather than
                    among the gaps it is not. */}
                <Fact value={coverage.dates.hedged} label={t('coverageDatesHedged')} />
              </ul>
              <p className="about-note">
                {t('aboutStateMore')} <Link to="/coverage">{t('coverageTitle')}</Link>
                {' · '}
                <Link to="/report">{t('aboutStateReportLink')}</Link>
              </p>
            </section>
          </>
        ) : null}

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutMethodHeading')}</h2>
          <ul className="about-list">
            <li>{t('aboutMethodSheet')}</li>
            <li>{t('aboutMethodProvenance')}</li>
            <li>{t('aboutMethodUrdu')}</li>
            {/* The link that used to hang off this line is now redundant: the
                gaps it pointed at are three sections up, on this page. The
                sentence stays, because it is a claim about method rather than a
                signpost. */}
            <li>{t('aboutMethodGaps')}</li>
          </ul>
        </section>

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutLicenceHeading')}</h2>
          <dl className="about-licence">
            <dt>{t('aboutLicenceData')}</dt>
            <dd>
              <a href={PUBLICATION.dataLicenseUrl} target="_blank" rel="noopener noreferrer">
                <bdi data-latin>Open Database License (ODbL) v1.0</bdi>
              </a>
            </dd>
            <dt>{t('aboutLicenceCode')}</dt>
            <dd>
              <a href={PUBLICATION.codeLicenseUrl} target="_blank" rel="noopener noreferrer">
                <bdi data-latin>MIT</bdi>
              </a>
            </dd>
          </dl>
          {/* The ODbL prescribes this wording; it is quoted, not paraphrased. */}
          <Citable label={t('aboutLicenceAttributionLabel')} text={PUBLICATION.attribution} />
        </section>

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutCiteHeading')}</h2>
          <Citable label={t('aboutCiteArchive')} text={archiveCitation()} />
          <Citable label={t('aboutCiteEntry')} text={exampleEntry} />
          <p className="about-note">{t('aboutCiteNote')}</p>
        </section>

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutCorrectionsHeading')}</h2>
          <p>{t('aboutCorrectionsBody')}</p>
          <p className="about-contact">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <bdi data-latin>{CONTACT_EMAIL}</bdi>
            </a>
            {' · '}
            <a href={correctionIssueUrl('')} target="_blank" rel="noopener noreferrer">
              {t('reportCorrection')}
            </a>
          </p>
          <p className="about-note">
            <a href={PUBLICATION.repository} target="_blank" rel="noopener noreferrer">
              <bdi data-latin>{PUBLICATION.repository}</bdi>
            </a>
          </p>
        </section>
      </article>
      <ScrollToTop />
    </div>
  );
}
