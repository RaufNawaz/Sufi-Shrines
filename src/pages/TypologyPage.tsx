import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { groupBySiteType, SITE_TYPE_LABELS, type SiteTypeGroup } from '../lib/data/siteType';

/**
 * The typology atlas (blue-sky item N7): the archive browsed by built form —
 * what actually stands at each site — using the survey's own `site_type`
 * vocabulary. Two rows describe their form in prose; those groups render the
 * prose verbatim rather than forcing it into a vocabulary it predates
 * (RULE 2), and the one row with nothing recorded says so.
 */

function GroupHeading({ group, label }: { group: SiteTypeGroup; label: string }) {
  const { t, fmtNum } = useLang();
  const count = group.shrines.length;

  return (
    <>
      <h2 id={group.anchor} className="typology-group-heading">
        {label}
        <span className="typology-group-count">
          {fmtNum(count)} {count === 1 ? t('typologySiteCountOne') : t('typologySiteCount')}
        </span>
      </h2>
      {group.rawValue && (
        // The survey's own words for this form, kept as written. English
        // prose in the Urdu view is sanctioned untranslated source content,
        // so it travels in <bdi lang="en"> like the infobox source notes.
        <p className="typology-group-prose">
          <bdi lang="en">{group.rawValue}</bdi>
        </p>
      )}
    </>
  );
}

export default function TypologyPage() {
  const { shrines } = useShrineData();
  const { lang, t, localizeField } = useLang();
  const isRtl = lang === 'ur';
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('typologyTitle')} — ${t('siteTitle')}`);

  const groups = useMemo(() => groupBySiteType(shrines), [shrines]);
  const groupLabel = (g: SiteTypeGroup): string =>
    g.key
      ? SITE_TYPE_LABELS[g.key][lang]
      : g.rawValue
        ? t('typologyAsDescribed')
        : t('typologyNotRecorded');

  // Client-side navigation keeps the hash but does not scroll to it.
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (!anchor || groups.length === 0) return;
    document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  }, [groups.length]);

  if (shrines.length === 0) return null;

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <header className="shrine-page-header no-print">
        <Link to="/" className="back-link" aria-label={t('backToMap')}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('backToMap')}
        </Link>
        <div className="shrine-page-header-actions">
          <DarkModeToggle />
          <LanguageToggle />
        </div>
      </header>

      <article
        className="entity-page typology-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('typologyTitle')}</li>
          </ol>
        </nav>

        <h1 ref={headingRef} className="entity-title">
          {t('typologyTitle')}
        </h1>
        <p className="typology-intro">{t('typologyIntro')}</p>

        {/* Jump list: one link per group, in display order. */}
        <nav className="typology-jump" aria-label={t('typologyTitle')}>
          <ul>
            {groups.map((g) => (
              <li key={g.anchor}>
                <a href={`#${g.anchor}`}>{groupLabel(g)}</a>
              </li>
            ))}
          </ul>
        </nav>

        {groups.map((group) => (
          <section key={group.anchor} className="typology-group" aria-labelledby={group.anchor}>
            <GroupHeading group={group} label={groupLabel(group)} />
            <div className="related-grid typology-grid stagger-in">
              {group.shrines.map((s) => {
                const name = localizeShrineName(s, lang);
                const location = localizeField(s.raw, 'Location') || s.location;
                return (
                  <Link key={s.id} to={`/shrine/${s.slug}`} className="related-card">
                    <ShrineImage
                      src={s.imageUrl}
                      alt={name}
                      category={s.category}
                      className="related-card-img"
                      placeholderClassName="related-card-img-placeholder"
                      loading="lazy"
                      width={IMAGE_WIDTH.preview}
                    />
                    <div className="related-card-body">
                      <div className="related-card-name">{name}</div>
                      {location && <div className="related-card-meta">{location}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
