import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';

/**
 * The footer that carries the licence and the citation route.
 *
 * The comment it was written with — on three of thirteen pages — reads: *"Licence
 * and citation must be reachable from any page — a public archive that states
 * neither is not publishable."* It was true, and it was on the shrine, saint and
 * order pages only. **Ten pages had no route to either**, `/coverage` and
 * `/about`'s own siblings among them: the pages *about* this archive's provenance
 * were the ones that did not say who made it or under what terms.
 *
 * One component now, for the same reason `EntityPageHeader` is one: the three
 * copies were identical, which is exactly the state in which a fourth gets
 * forgotten rather than copied.
 *
 * Pages with something entry-specific to add pass it as children rather than
 * writing their own footer — the shrine page's "report a correction" link is the
 * only such case today.
 *
 * Not on the map. `MapPage` is a fixed full-height layout with a bottom sheet
 * and a tab bar already occupying its bottom edge; a footer there is not a
 * footer, it is a thing on top of the map.
 */
export function SiteFooter({ children }: { children?: React.ReactNode }) {
  const { t } = useLang();
  const { pathname } = useLocation();
  /* `/about` is the licence page. A link from it to itself is a dead control
     that looks like a live one, so it becomes plain text there — the credit
     still shows, which is the part that has to be on every page. */
  const onAbout = pathname === '/about' || pathname === '/ur/about';

  return (
    <footer className="site-footer">
      <Link to="/">{t('backToMap')}</Link>
      {' · '}
      <span>{t('footerCredit')}</span>
      {' · '}
      {onAbout ? <span>{t('aboutTitle')}</span> : <Link to="/about">{t('aboutTitle')}</Link>}
      {/* A page with a per-entry control appends it here — the shrine page's
          "report a correction" carries that entry's own issue URL. Extracting the
          footer must not cost that: it is the one place a reader can push back on
          a specific claim, which on this archive is the point. */}
      {children ? (
        <>
          {' · '}
          {children}
        </>
      ) : null}
    </footer>
  );
}
