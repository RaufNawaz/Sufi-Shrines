import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../lib/data/categoryKey';
import type { UiStringKey } from '../../lib/i18n/uiStrings';

interface WelcomeCardProps {
  t: (k: Parameters<ReturnType<typeof useLang>['t']>[0]) => string;
  embed?: boolean;
}

/* The six places a reader can go from the front door, as a system list:
   an icon tile, the name, one line on what is there, a chevron. The order
   is the one the welcome card has always carried — the almanac first, the
   archive-wide pages, "About" last — and the reasons each one is here are in
   this file's history (the chronology, for one, shipped with no link to it
   from anywhere). */
const DESTINATIONS: readonly {
  to: string;
  title: UiStringKey;
  sub: UiStringKey;
  icon: string;
}[] = [
  {
    to: '/almanac',
    title: 'almanacTitle',
    sub: 'welcomeDestAlmanac',
    /* calendar */
    icon: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
  },
  {
    to: '/graph',
    title: 'graphExplorerTitle',
    sub: 'welcomeDestGraph',
    /* three joined nodes */
    icon: 'M14.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M8.5 19a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M20.5 19a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M12 7.5V12M12 12l-4.5 4.5M12 12l4.5 4.5',
  },
  {
    to: '/typology',
    title: 'typologyTitle',
    sub: 'welcomeDestTypology',
    /* a dome on a base */
    icon: 'M5 20h14M7 20v-7h10v7M12 4c-3 2-5 4-5 9h10c0-5-2-7-5-9z',
  },
  {
    to: '/chronology',
    title: 'chronologyTitle',
    sub: 'welcomeDestChronology',
    /* a clock */
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  },
  {
    to: '/shared-ground',
    title: 'sharedGroundPageTitle',
    sub: 'welcomeDestSharedGround',
    /* two overlapping rings */
    icon: 'M14 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M20 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  },
  {
    to: '/sources',
    title: 'sourcesTitle',
    sub: 'welcomeDestSources',
    /* an open book */
    icon: 'M12 6.5C10.2 5 7.6 4.5 3.5 4.8v13.4c4.1-.3 6.7.2 8.5 1.8 1.8-1.6 4.4-2.1 8.5-1.8V4.8C16.4 4.5 13.8 5 12 6.5zM12 6.5V20',
  },
  {
    to: '/about',
    title: 'aboutTitle',
    sub: 'welcomeDestAbout',
    /* an i in a circle */
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.5',
  },
];

export function WelcomeCard({ t, embed = false }: WelcomeCardProps) {
  const { lang } = useLang();
  return (
    <div className="welcome-card">
      <div className="welcome-card-icon-wrap" aria-hidden="true">
        <svg className="welcome-card-icon" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
        </svg>
      </div>
      <h2 className="welcome-card-title">{t('exploreTitle')}</h2>
      {/* What this is, who made it, and where to read more — said first. The
          card opened on an empty-state message, and the archive's own
          one-sentence account of itself, with its two authors, lived only on
          /about (first-visit council, 17 October 2026). */}
      <p className="welcome-card-lede">{t('aboutLede')}</p>
      <p className="welcome-card-credit">
        {t('aboutCredit')}
        {' · '}
        <Link to="/about">{t('welcomeAboutLink')}</Link>
      </p>
      <p className="welcome-card-text">{t('noSelection')}</p>
      {/* The "list button above" this hint refers to is hidden in embed mode */}
      {!embed && <p className="welcome-card-hint">{t('exploreHint')}</p>}

      {/* The map's key, where a first-time reader looks. A marker's ring is its
          tradition and its size says whether there is a photograph; nothing on
          the front door said either, and a reader took the large photographed
          markers for the major sites (data-viz council, 17 October 2026). */}
      <div className="welcome-legend">
        <p className="welcome-card-links-heading">{t('welcomeLegendHeading')}</p>
        <ul className="welcome-legend-list">
          {CATEGORY_ORDER.map((key) => (
            <li key={key} className="welcome-legend-item">
              <span className={`filter-chip-dot filter-chip-dot--${key}`} aria-hidden="true" />
              {CATEGORY_LABELS[key][lang]}
            </li>
          ))}
        </ul>
        <p className="filter-legend-note welcome-legend-note">{t('mapLegendPhoto')}</p>
      </div>

      {/* Embeds stay link-free so an embedded map can't navigate its host away. */}
      {!embed && (
        <nav className="welcome-card-links" aria-label={t('welcomeExploreMore')}>
          <p className="welcome-card-links-heading">{t('welcomeExploreMore')}</p>
          <ul className="inset-list welcome-card-list">
            {DESTINATIONS.map((dest) => (
              <li key={dest.to} className="inset-row inset-row--link">
                <Link to={dest.to}>
                  <span className="welcome-dest-icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={dest.icon} />
                    </svg>
                  </span>
                  <span className="inset-row-label inset-row-label--stacked">
                    <span className="inset-row-title">{t(dest.title)}</span>
                    <span className="inset-row-sub">{t(dest.sub)}</span>
                  </span>
                  <span className="inset-row-chevron" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
