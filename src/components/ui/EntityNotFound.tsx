import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EntityPageHeader } from './EntityPageHeader';
import { SiteFooter } from './SiteFooter';

/**
 * What an entity route says when the slug names nothing.
 *
 * Four of the archive's five entity routes used to answer an unknown slug with
 * `<Navigate to="/" replace />`. Measured 30 August 2026: `/shrine/zzz`,
 * `/saint/zzz`, `/order/zzz` and `/tradition/zzz` all ended at `/` with the
 * address bar rewritten and nothing said. `/place/zzz` did the right thing and
 * still does — it stays put and says "No place by that name is recorded."
 *
 * **For an archive whose case rests on citability, a URL that silently resolves
 * to something else is worse than a 404.** A reader following a citation cannot
 * tell a typo from a merge from a deletion, and lands somewhere that looks like
 * they typed the bare address. The map is not an error message.
 *
 * This is live risk rather than a hypothetical: merging two figure nodes
 * retires a published `/saint/` URL, 632 saint pages are prerendered and in the
 * sitemap, and the retired-slug redirect that handles the good case runs
 * *before* this — a fallthrough that caught an unknown slug earlier would turn
 * nineteen working redirects into nineteen dead ends.
 *
 * The copy is the archive's own 404 wording rather than four new strings. It is
 * already bilingual and already reviewed, it says the true thing ("doesn't
 * exist or has been moved" is exactly the ambiguity a reader faces), and adding
 * per-entity phrasing would have meant authoring Urdu — which RULE 2 puts
 * beyond an agent for the sake of four sentences nobody needed.
 */
export function EntityNotFound() {
  const { t } = useLang();
  useDocumentTitle(`${t('pageNotFoundTitle')} — ${t('siteTitle')}`);

  return (
    <div className="entity-page page-enter">
      <EntityPageHeader />
      {/* `<main id="main-content">` because the skip link targets it and
          `RouteAnnouncer` returns early without it — the same pair that failed
          silently on the 404 route itself until this morning. */}
      <main id="main-content" className="entity-not-found">
        <h1 className="entity-title">{t('pageNotFoundTitle')}</h1>
        <p className="coverage-intro">{t('pageNotFoundMessage')}</p>
        <p className="coverage-intro">
          <Link to="/">{t('backToMap')}</Link>
        </p>
        <SiteFooter />
      </main>
    </div>
  );
}
