import React from 'react';
import { SiteFooter } from '../components/ui/SiteFooter';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
/* The shared header, at last. This page carried a hand-written copy of it —
   the back link and its chevron, the actions row, the two toggles — which is
   the exact duplication `EntityPageHeader` was extracted to end, and it was
   left behind because a 404 is nobody's first thought. It stayed wrong in a
   way that matters: the gear went onto every page through that component, and
   the one page a reader is most likely to reach from outside would have been
   the only one without it. No `title` prop — this page's `<h1>` is the 404
   itself, and a bar that collapses to "Page not found" says nothing twice. */
import { EntityPageHeader } from '../components/ui/EntityPageHeader';

export default function NotFoundPage() {
  const { t } = useLang();
  /* The one route with no title of its own, so an Urdu reader's tab and
     bookmark read "Sufi Shrines of Pakistan" in English — on the page they are
     most likely to have arrived at from outside. Every other route localises. */
  useDocumentTitle(`${t('pageNotFoundTitle')} — ${t('siteTitle')}`);

  return (
    <div className="not-found-page page-enter">
      <EntityPageHeader />

      {/*
        `<main id="main-content">`, which this page did not have.
        Two things depended on it and both failed silently. The skip link is
        the first thing a keyboard reader reaches here: it pointed at nothing,
        so pressing Enter left focus on the link itself — the exact failure
        `e2e/skip-links.spec.ts` exists to catch, on the one route it does not
        cover. And `RouteAnnouncer` returns early when `#main-content` is null,
        so arriving here left focus on `<body>` with nothing announced.

        A 404 is where a stale citation lands. It is the last page that should
        be missing the landmark that says where the content is.
      */}
      <main id="main-content" className="not-found-content">
        <div className="not-found-icon-wrap" aria-hidden="true">
          <svg className="not-found-dome" viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
          </svg>
        </div>

        <p className="not-found-code">404</p>
        <h1 className="not-found-title">{t('pageNotFoundTitle')}</h1>
        <p className="not-found-message">{t('pageNotFoundMessage')}</p>
        <Link to="/" className="not-found-action">
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {t('backToMap')}
        </Link>
        {/* A 404 is the page a reader is most likely to have arrived at from
            outside, so it is the last one that should be missing the licence and
            the route to what this archive is. */}
        <SiteFooter />
      </main>
    </div>
  );
}
