import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { PUBLICATION, archiveCitation, entryCitation } from '../lib/data/citation';
import { CONTACT_EMAIL, correctionIssueUrl } from '../lib/data/constants';

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

export default function AboutPage() {
  const { lang, t } = useLang();
  const isRtl = lang === 'ur';
  const headingRef = useFocusHeadingOnMount();

  useDocumentTitle(`${t('aboutTitle')} — ${t('siteTitle')}`);

  /* A worked example rather than a template with placeholders: a reader copying
     a citation should see the shape of a real one. */
  const exampleEntry = entryCitation('Data Darbar', 'data-darbar', new Date());

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <header className="shrine-page-header no-print">
        <Link to="/" className="back-link" aria-label={t('backToMap')}>
          {t('backToMap')}
        </Link>
        <div className="shrine-page-header-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </header>

      <article
        className="entity-page about-page"
        id="main-content"
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

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutMethodHeading')}</h2>
          <ul className="about-list">
            <li>{t('aboutMethodSheet')}</li>
            <li>{t('aboutMethodProvenance')}</li>
            <li>{t('aboutMethodUrdu')}</li>
            <li>
              {t('aboutMethodGaps')} <Link to="/coverage">{t('aboutCoverageLink')}</Link>
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2 className="about-section-heading">{t('aboutLicenceHeading')}</h2>
          <dl className="about-licence">
            <dt>{t('aboutLicenceData')}</dt>
            <dd>
              <a href={PUBLICATION.dataLicenseUrl} target="_blank" rel="noopener noreferrer">
                <bdi>Open Database License (ODbL) v1.0</bdi>
              </a>
            </dd>
            <dt>{t('aboutLicenceCode')}</dt>
            <dd>
              <a href={PUBLICATION.codeLicenseUrl} target="_blank" rel="noopener noreferrer">
                <bdi>MIT</bdi>
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
              <bdi>{CONTACT_EMAIL}</bdi>
            </a>
            {' · '}
            <a href={correctionIssueUrl('')} target="_blank" rel="noopener noreferrer">
              {t('reportCorrection')}
            </a>
          </p>
          <p className="about-note">
            <a href={PUBLICATION.repository} target="_blank" rel="noopener noreferrer">
              <bdi>{PUBLICATION.repository}</bdi>
            </a>
          </p>
        </section>
      </article>
      <ScrollToTop />
    </div>
  );
}
