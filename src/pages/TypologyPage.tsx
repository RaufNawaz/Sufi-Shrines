import React, { useEffect, useMemo, useState } from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { ShrineImage } from '../components/ui/ShrineImage';
import { IMAGE_WIDTH } from '../lib/images/thumbnail';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { groupBySiteType, SITE_TYPE_LABELS, type SiteTypeGroup } from '../lib/data/siteType';
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryKey } from '../lib/data/categoryKey';
import { tFn } from '../lib/i18n/uiStrings';

import { isRtlLang } from '../lib/i18n/languages';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
/**
 * The typology atlas (blue-sky item N7): the archive browsed by built form —
 * what actually stands at each site — using the survey's own `site_type`
 * vocabulary. Two rows describe their form in prose; those groups render the
 * prose verbatim rather than forcing it into a vocabulary it predates
 * (RULE 2), and the one row with nothing recorded says so.
 */

/** Cards shown under each form before "Show all". */
const CARD_PREVIEW = 6;

type Tradition = (typeof CATEGORY_ORDER)[number];

/** How many of a group's sites belong to each tradition, in canonical order. */
function traditionMix(group: SiteTypeGroup): { key: Tradition; count: number }[] {
  const counts = new Map<Tradition, number>();
  for (const s of group.shrines) {
    const key = categoryKey(s.category);
    if (key === 'default') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter((k) => counts.has(k)).map((key) => ({
    key,
    count: counts.get(key)!,
  }));
}

/**
 * Which traditions a built form belongs to, as one thin bar in their colours.
 * The fact the old page could not show at all: a "temple" here is Hindu and
 * Jain, a "complex" spans four traditions, a "khanqah" only one. The legend
 * beside it (on a group heading) carries the counts in words, so the colour is
 * never the only channel.
 */
function TraditionBar({ mix, total }: { mix: { key: Tradition; count: number }[]; total: number }) {
  return (
    <span className="typology-mix" aria-hidden="true">
      {mix.map(({ key, count }) => (
        <span
          key={key}
          className={`typology-mix-slice typology-mix-slice--${key}`}
          style={{ inlineSize: `${(count / total) * 100}%` }}
        />
      ))}
    </span>
  );
}

function GroupHeading({ group, label }: { group: SiteTypeGroup; label: string }) {
  const { t, fmtNum, lang } = useLang();
  const count = group.shrines.length;
  const mix = traditionMix(group);

  return (
    <>
      <h2 id={group.anchor} className="typology-group-heading">
        {label}
        <span className="typology-group-count">
          {fmtNum(count)} {count === 1 ? t('typologySiteCountOne') : t('typologySiteCount')}
        </span>
      </h2>
      <p className="typology-mix-legend">
        <TraditionBar mix={mix} total={group.shrines.length} />
        <span className="typology-mix-words">
          {mix.map(({ key, count }) => (
            <span key={key} className={`typology-mix-word typology-mix-word--${key}`}>
              <span className="typology-mix-dot" aria-hidden="true" />
              {CATEGORY_LABELS[key][lang]} {fmtNum(count)}
            </span>
          ))}
        </span>
      </p>
      {group.rawValue && (
        /* The survey's own words for this form, kept as written.
           `<bdi lang="en">` alone was the old convention and the no-leak guard
           rejects it on purpose: `<bdi>` is a *bidi* tool, needed by mixed-script
           text whether or not it is translated, and letting it double as "this
           is deliberately untranslated" made the fix for any leak "wrap it",
           which satisfies the check and changes nothing for the reader.
           `data-latin` is the declaration, and it is countable. */
        <p className="typology-group-prose">
          <bdi lang="en" data-latin>
            {group.rawValue}
          </bdi>
        </p>
      )}
    </>
  );
}

export default function TypologyPage() {
  const { shrines, offline, sourceTimestamp } = useShrineData();
  const { lang, t, localizeField, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('typologyTitle')} — ${t('siteTitle')}`);

  const groups = useMemo(() => groupBySiteType(shrines), [shrines]);
  /* Which forms show every card. A form opened from a tile, or from a link
     elsewhere with its hash, opens in full — the reader asked for that form. */
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(typeof window === 'undefined' ? [] : [window.location.hash.slice(1)]),
  );
  const expand = (anchor: string) => setExpanded((current) => new Set(current).add(anchor));
  const toggle = (anchor: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });
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
      <EntityPageHeader title={t('typologyTitle')} />

      <article
        className="entity-page typology-page"
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
            <li aria-current="page">{t('typologyTitle')}</li>
          </ol>
        </nav>

        {/* The date of what the reader is looking at. Self-hides unless a live

            fetch has actually failed — see OfflineDataBanner. */}

        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />

        <h1 ref={headingRef} className="entity-title">
          {t('typologyTitle')}
        </h1>
        <p className="typology-intro">{t('typologyIntro')}</p>

        {/* The forms as a mosaic of tiles, with how many sites each holds —
            the shape of the archive's built environment before a single card.
            Each tile is a link to its group below, with the count as a large
            numeral and the traditions it spans as a bar. (Was a row of pills,
            9 October 2026: "do similar ones for the other pages".) */}
        <nav className="typology-jump" aria-label={t('typologyTitle')}>
          <ul className="typology-tiles">
            {groups.map((g) => (
              <li key={g.anchor} className="typology-tile-item">
                <a href={`#${g.anchor}`} className="typology-tile" onClick={() => expand(g.anchor)}>
                  <span className="typology-tile-count">{fmtNum(g.shrines.length)}</span>
                  <span className="typology-tile-label">{groupLabel(g)}</span>
                  <TraditionBar mix={traditionMix(g)} total={g.shrines.length} />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {groups.map((group) => (
          <section key={group.anchor} className="typology-group" aria-labelledby={group.anchor}>
            <GroupHeading group={group} label={groupLabel(group)} />
            <div className="related-grid typology-grid stagger-in" id={`${group.anchor}-cards`}>
              {(expanded.has(group.anchor)
                ? group.shrines
                : group.shrines.slice(0, CARD_PREVIEW)
              ).map((s) => {
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
                      {/* The recorded Location, declared. `RelatedShrines`
                          renders the identical value with
                          `<bdi data-latin>` — the column often carries a survey
                          qualification in English rather than a place name —
                          and this copy of the card did not, which put 14
                          undeclared English runs on `/typology?lang=ur`. Found
                          by sweeping the no-leak walker over routes the guard
                          does not visit; `/typology` is in its matrix now. */}
                      {location && (
                        <div className="related-card-meta" data-latin>
                          <bdi>{location}</bdi>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            {group.shrines.length > CARD_PREVIEW && (
              <button
                type="button"
                className="action-btn typology-more"
                aria-expanded={expanded.has(group.anchor)}
                aria-controls={`${group.anchor}-cards`}
                onClick={() => toggle(group.anchor)}
              >
                {expanded.has(group.anchor)
                  ? t('chronologyShowFewer')
                  : fmtNum(tFn(lang, 'almanacShowList', group.shrines.length))}
              </button>
            )}
          </section>
        ))}
        <SiteFooter />
      </article>
    </div>
  );
}
