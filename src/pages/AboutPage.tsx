import React, { useEffect, useMemo, useState } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useShrineData } from '../hooks/useShrineData';
import { buildCoverage, TRADITION_KEYS, type CoverageReport } from '../lib/data/coverage';
import { AUQAF_PUNJAB_REGISTER } from '../lib/data/archiveReport';
import { Fact, Stat } from '../components/archive/CoverageStats';
import { ArchiveKnows } from '../components/archive/ArchiveKnows';
import { ArchiveState } from '../components/archive/ArchiveState';
import { ContentsNav } from '../components/shrine/ContentsNav';
import graph from '../../data/kg-stats.json';
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
 * asking the obvious question had to find out that two other pages existed.
 *
 * They are one page now. `/coverage` and `/report` are redirects into it, kept
 * because they are published URLs and a merge is no reason to 404 a link
 * somebody sent. Their sections moved wholesale into `ArchiveKnows` and
 * `ArchiveState`; what did *not* move is the duplication, which was the reason
 * to merge rather than concatenate — three pages each drew their own support
 * and info breakdowns from two different builders, and this page now draws each
 * of them once.
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
  const { lang, t, fmtNum } = useLang();
  const { shrines, loading } = useShrineData();
  const coverage = useMemo(() => buildCoverage(shrines), [shrines]);
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();

  useDocumentTitle(`${t('aboutTitle')} — ${t('siteTitle')}`);

  /* A worked example rather than a template with placeholders: a reader copying
     a citation should see the shape of a real one. */
  const exampleEntry = entryCitation('Data Darbar', 'data-darbar', new Date());

  /* How much of the Punjab Auqaf register this archive has reached, under the
     count it qualifies. The denominator is an external figure from one
     province's register, not something this archive computed. */
  const registerNote = tFn(
    lang,
    'reportRegisterNote',
    coverage.total > 0 ? Math.round((coverage.total / AUQAF_PUNJAB_REGISTER) * 100) : 0,
  );

  /* Client-side navigation keeps the hash but does not scroll to it — the same
     effect `TypologyPage` and `AlmanacPage` carry, and the thing that makes the
     `/coverage` and `/report` redirects land on the section they name instead of
     at the top of a page four screens long. Keyed on `coverage.total` rather
     than run once: the sections it is scrolling to do not exist until the
     dataset arrives, and an effect that fired on mount would find nothing and
     silently do nothing. */
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (!anchor || coverage.total === 0) return;
    /* `instant`, against the global `scroll-behavior: smooth`. That rule is for
       an anchor the reader clicked — the contents nav, a skip link — where the
       motion says where they went. This is an arrival: someone opened
       /coverage and the app decided to put them four screens down a page they
       have not seen. Animating that is a long slide through unrelated content,
       and it leaves the page mid-flight for seconds. */
    document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [coverage.total]);

  /* Twenty sections is a page you scroll past, not one you use. The ids are the
     anchors `/coverage` and `/report` redirect into, so an old link still lands
     on what it was sent for.

     Two entries point at sections that are themselves conditional: `rests-on`
     appears once any entry cites anything, and `how-the-words-were-made` once
     the lazily-loaded provenance file arrives. Both are present in every real
     load; neither is worth omitting from the contents to cover the first paint,
     and ContentsNav ignores an id with no element behind it. */
  const contents = useMemo(
    () => [
      { id: 'scope', label: t('aboutScopeHeading') },
      { id: 'holds', label: t('aboutStateHeading') },
      { id: 'graph', label: t('aboutGraphHeading') },
      { id: 'trust', label: t('aboutTrustHeading') },
      { id: 'traditions', label: t('coverageTraditionHeading') },
      { id: 'support', label: t('coverageSupportHeading') },
      { id: 'depth', label: t('coverageInfoHeading') },
      { id: 'citations', label: t('coverageSourcesHeading') },
      { id: 'rests-on', label: t('coverageRestsHeading') },
      { id: 'photography', label: t('coveragePhotosHeading') },
      { id: 'dates', label: t('coverageDatesHeading') },
      { id: 'coordinates', label: t('coverageLocationHeading') },
      { id: 'observances', label: t('coverageObservancesHeading') },
      { id: 'places', label: t('placesTitle') },
      { id: 'site-status', label: t('reportStatusHeading') },
      { id: 'how-the-words-were-made', label: t('reportWordsHeading') },
      { id: 'urdu-mirror', label: t('reportUrduHeading') },
      { id: 'corrected-in-public', label: t('reportCorrectionsHeading') },
      { id: 'what-was-lost', label: t('reportLostHeading') },
      { id: 'why', label: t('coverageWhyHeading') },
      { id: 'method', label: t('aboutMethodHeading') },
      { id: 'licence', label: t('aboutLicenceHeading') },
      { id: 'cite', label: t('aboutCiteHeading') },
      { id: 'corrections', label: t('aboutCorrectionsHeading') },
    ],
    [t],
  );

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

        <div className="about-contents">
          <ContentsNav items={contents} />
        </div>

        <section className="about-section" id="scope">
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
            <section className="about-section" id="holds">
              <h2 className="about-section-heading">{t('aboutStateHeading')}</h2>
              <p className="about-note">{t('aboutStateNote')}</p>
              <div className="coverage-stat-grid">
                <Stat value={coverage.total} label={t('aboutStateSites')} />
                <Stat value={coverage.bibliography.items} label={t('aboutStateSources')} />
                <Stat value={coverage.photos.items} label={t('aboutStatePhotos')} />
                <Stat value={traditionsCovered(coverage)} label={t('aboutStateTraditions')} />
              </div>
              {/* What that total is a share of. The denominator is one province's
                  register and an external figure, not something this archive
                  computed — which is exactly why it is a sentence under the count
                  rather than a statistic beside it. */}
              <p className="about-note">{registerNote}</p>
            </section>

            {/* The graph's own state, from data/kg-stats.json.
                The section above counts the archive's *sites*; this counts the
                people, silsilas and links behind them — and then counts how much
                of that a person has actually checked. An archive that publishes
                "136 figures" and not "94 of their biographies were read out of
                prose by a machine and by no editor" is publishing the flattering
                half. The numbers come from a ~400-byte build artefact rather than
                from the graph itself, because `src/lib/kg.ts` imports kg.json
                statically and six counts are not worth 426 KB. */}
            <section className="about-section" id="graph">
              <h2 className="about-section-heading">{t('aboutGraphHeading')}</h2>
              <p className="about-note">{t('aboutGraphNote')}</p>
              <div className="coverage-stat-grid">
                <Stat value={graph.figures} label={t('aboutGraphFigures')} />
                <Stat value={graph.orders} label={t('aboutGraphOrders')} />
                <Stat value={graph.lineageLinks} label={t('aboutGraphLineageLinks')} />
                <Stat value={graph.observances} label={t('aboutGraphObservances')} />
                <Stat value={graph.sources} label={t('aboutGraphSources')} />
                <Stat value={graph.titles} label={t('aboutGraphTitles')} />
                <Stat value={graph.places} label={t('aboutGraphPlaces')} />
                <Stat value={graph.lineageOnlyFigures} label={t('aboutGraphLineageOnly')} />
              </div>
            </section>

            <section className="about-section" id="trust">
              <h2 className="about-section-heading">{t('aboutTrustHeading')}</h2>
              <p className="about-note">{t('aboutTrustNote')}</p>
              <ul className="coverage-facts">
                <Fact
                  value={graph.biographiesMachineRead}
                  label={t('aboutTrustBiographies')}
                  noun=""
                />
                {/* "80 of 86", not "80 … (86)" — a bare count of unreviewed
                    links says nothing without its denominator, and the
                    denominator belongs *inside* the sentence: Urdu puts it in a
                    different place, which is precisely what tFn is for. The
                    ratio is the fact here — most of this graph's lineage is
                    machine-read. */}
                <Fact
                  value={graph.lineageLinksUnreviewed}
                  label={fmtNum(tFn(lang, 'aboutTrustLineage', graph.lineageLinks))}
                  noun=""
                />
                <Fact
                  value={graph.orderMembershipsUnreviewed}
                  label={fmtNum(tFn(lang, 'aboutTrustMemberships', graph.orderMemberships))}
                  noun=""
                />
                <Fact value={graph.disputedDateFigures} label={t('aboutTrustDisputed')} noun="" />
              </ul>
            </section>

            {/* Everything `/coverage` was. The support and info breakdowns used to
                appear here in summary and again in full one route away; they
                appear once now, in full. */}
            <ArchiveKnows shrines={shrines} coverage={coverage} />

            {/* Everything `/report` was, minus the three breakdowns it drew a
                second time from a second builder. What is left is what only it
                had: the state of the sites, how the prose was made, the Urdu
                mirror's progress, and the two ledgers. */}
            <ArchiveState shrines={shrines} />

            <section className="about-section coverage-why" id="why">
              <h2 className="about-section-heading">{t('coverageWhyHeading')}</h2>
              <p>{t('coverageWhy')}</p>
            </section>
          </>
        ) : null}

        <section className="about-section" id="method">
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

        <section className="about-section" id="licence">
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

        <section className="about-section" id="cite">
          <h2 className="about-section-heading">{t('aboutCiteHeading')}</h2>
          <Citable label={t('aboutCiteArchive')} text={archiveCitation()} />
          <Citable label={t('aboutCiteEntry')} text={exampleEntry} />
          <p className="about-note">{t('aboutCiteNote')}</p>
        </section>

        <section className="about-section" id="corrections">
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
        <SiteFooter />
      </article>
      <ScrollToTop />
    </div>
  );
}
