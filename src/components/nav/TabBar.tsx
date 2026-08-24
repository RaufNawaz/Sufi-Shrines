import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { isRtlLang } from '../../lib/i18n/languages';
import { TABS, activeTabId } from '../../lib/nav/tabs';

/**
 * The archive's top-level navigation, on a phone.
 *
 * Before this, a phone reader's only navigation anywhere in the app was "Back to
 * map". The figures explorer, the ʿurs almanac, the typology atlas and the
 * coverage report were reachable only through links inside article bodies —
 * four of six surfaces that a reader had to already know about to find. The map
 * was a front door onto one room.
 *
 * Phone only, by CSS: on a laptop the pages carry their own headers and a
 * fixed bar across the bottom of a wide screen is a mobile idiom borrowed
 * badly. `display: none` above the breakpoint takes it out of the
 * accessibility tree and the tab order too, so a desktop keyboard reader does
 * not tab through five links to a bar they cannot see.
 *
 * Icons are drawn inline rather than loaded: five 24px glyphs are smaller than
 * the request that would fetch them, and an icon font that has not arrived yet
 * is a row of empty boxes exactly where a reader is looking.
 */

/** 24px stroke glyphs, matching the SVG conventions used across the app
 *  (viewBox 24, `currentColor`, round caps). Simple silhouettes on purpose —
 *  at 24px on a phone, detail turns to noise. */
const ICONS: Record<string, React.ReactNode> = {
  map: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  almanac: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8.5 3.5v3M15.5 3.5v3" />
    </>
  ),
  atlas: (
    <>
      <path d="M4 20V9.5L12 4l8 5.5V20" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </>
  ),
};

export function TabBar() {
  const { t, lang } = useLang();
  const { pathname } = useLocation();
  const active = activeTabId(pathname);
  const isRtl = isRtlLang(lang);

  return (
    <nav
      className="tabbar no-print"
      aria-label={t('tabBarLabel')}
      dir={isRtl ? 'rtl' : undefined}
      lang={isRtl ? 'ur' : undefined}
    >
      <ul className="tabbar-list">
        {TABS.map((tab) => {
          const current = active === tab.id;
          return (
            <li key={tab.id} className="tabbar-item">
              <Link
                to={tab.path}
                className={`tabbar-link${current ? ' tabbar-link--current' : ''}`}
                /* `page`, not `true`: this is the page the reader is on, and
                   that distinction is what a screen reader announces. Absent
                   entirely on a route no tab owns — claiming the map is current
                   on a 404 is a lie read out loud. */
                aria-current={current ? 'page' : undefined}
              >
                <svg
                  className="tabbar-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONS[tab.id]}
                </svg>
                <span className="tabbar-label">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
