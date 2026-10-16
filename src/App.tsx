import React, { lazy, Suspense, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';

import { LanguageProvider, useLang } from './lib/i18n/LanguageContext';
import { ThemeProvider } from './lib/i18n/ThemeContext';
import { ReaderPreferencesProvider } from './lib/preferences/ReaderPreferencesContext';
import { ArchiveSearchProvider } from './components/search/ArchiveSearchProvider';
import { UpdateToast } from './components/ui/UpdateToast';
import { TabBar } from './components/nav/TabBar';
import { ROUTE_MODULES, SEGMENT_MODULES, preloadForHref } from './lib/nav/routeModules';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { persistAccessParamIfPresent } from './lib/projectAccess';
import { stripUrPrefix } from './lib/i18n/urlLangPrefix';
import { useRecordRecentEntries } from './lib/recentEntries';

persistAccessParamIfPresent();

/* The five tab destinations load through ROUTE_MODULES, the same importers
   TabLink prefetches on intent (15 October 2026). */
const MapPage = lazy(ROUTE_MODULES['/']);
const ShrinePage = lazy(SEGMENT_MODULES.shrine);
const SaintPage = lazy(SEGMENT_MODULES.saint);
const OrderPage = lazy(SEGMENT_MODULES.order);
const GraphPage = lazy(ROUTE_MODULES['/graph']);
const AlmanacPage = lazy(ROUTE_MODULES['/almanac']);
/* Team-only, unlisted, and prerendered like every other route because GitHub
   Pages serves files rather than routes. See docs/planning/REVIEW_DESK_2026-08-24.md. */
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const TypologyPage = lazy(ROUTE_MODULES['/typology']);
const ChronologyPage = lazy(SEGMENT_MODULES.chronology);
const SharedGroundPage = lazy(SEGMENT_MODULES['shared-ground']);
const TraditionPage = lazy(SEGMENT_MODULES.tradition);
const AboutPage = lazy(ROUTE_MODULES['/about']);
const PlacePage = lazy(SEGMENT_MODULES.place);
const SettingsPage = lazy(SEGMENT_MODULES.settings);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LegacyRedirect() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const lang = params.get('lang') || '';
  const langSuffix = lang ? `?lang=${lang}` : '';
  if (id !== null && id !== '') {
    return <Navigate to={`/shrine/id-${id}${langSuffix}`} replace />;
  }
  return <Navigate to={`/${langSuffix}`} replace />;
}

/**
 * /ur/* routes (see scripts/prerender.mjs, urlLangPrefix.ts) exist only so
 * crawlers get a distinct static Urdu file per page. A real browser lands
 * here for at most one paint: detectInitialLang() already resolved `lang`
 * to 'ur' before this renders (no flash), and this effect just persists
 * that choice and rewrites the URL back to the app's normal ?lang= scheme
 * so every other route/persistence/e2e assumption keeps holding.
 */
function UrPrefixNormalizer({ children }: { children: React.ReactNode }) {
  const { setLang } = useLang();
  useEffect(() => {
    setLang('ur');
    const newPathname = stripUrPrefix(window.location.pathname);
    const params = new URLSearchParams(window.location.search);
    params.set('lang', 'ur');
    /* The hash has to be carried across. This rebuilt the URL from pathname and
       search alone, so every `/ur/...#anchor` entry silently lost its fragment —
       `/ur/coverage` and `/ur/report` name one, and any Urdu link a reader has
       shared into a section of a long page carries one too. The anchor scroll on
       /about, /typology and /almanac all read `window.location.hash`, so a
       dropped fragment is not a cosmetic URL difference: the effect returns
       early and the reader is left at the top of the page, every time and not as
       a race. Guarded by the two Urdu cases in `e2e/about-merge.spec.ts`. */
    window.history.replaceState(
      null,
      '',
      `${newPathname}?${params.toString()}${window.location.hash}`,
    );
    // Run once on mount only — this route is a one-time entry portal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="page-fallback">
      <span className="spinner spinner--lg" />
    </div>
  );
}

/* Entry pages start loading the moment a finger lands on a link to one (or a
   pointer rests on it), so the chunk is arriving before the tap completes —
   what `TabLink` does for the five tabs, for every in-app link at once. One
   delegated listener rather than a handler on each card, row and chip. */
function LinkPrefetcher() {
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const onIntent = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (link) preloadForHref((link as HTMLAnchorElement).href, base);
    };
    document.addEventListener('touchstart', onIntent, { passive: true, capture: true });
    document.addEventListener('pointerover', onIntent, { passive: true, capture: true });
    document.addEventListener('focusin', onIntent, { capture: true });
    return () => {
      document.removeEventListener('touchstart', onIntent, { capture: true });
      document.removeEventListener('pointerover', onIntent, { capture: true });
      document.removeEventListener('focusin', onIntent, { capture: true });
    };
  }, []);
  return null;
}

function RouteAnnouncer() {
  const location = useLocation();
  useRecordRecentEntries();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // Real page changes only — this effect is keyed on pathname, so in-page
    // anchor navigation (e.g. ContentsNav's scrollIntoView) never triggers it.
    // `instant`, whatever any stylesheet says: a new page arrives at its top,
    // it does not scroll there.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Shift focus to main content on navigation so screen readers pick up the new page
    const el = document.getElementById('main-content') as HTMLElement | null;
    if (!el) return;
    if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, [location.pathname]);

  return null;
}

/*
 * The skip links, inside the language provider.
 *
 * They were two English literals rendered on every route, Urdu included — the
 * first two controls a keyboard reader reaches, announcing themselves in the
 * wrong language. They survived because the no-English-leak guard exempted
 * every `<a>` (the sweep now lives in e2e/urdu-no-leak.spec.ts) and because a
 * skip link is invisible until focused, so no screenshot showed them either.
 *
 * They live in a component rather than inline because `useLang` needs to be
 * called below LanguageProvider, and App itself renders the provider.
 */
function SkipLinks() {
  const { t } = useLang();
  const { pathname } = useLocation();
  /* #shrine-directory exists on the map route and nowhere else, so on the other
     eight routes this was a skip link to nothing: the keyboard reader's second
     stop, which silently does not move focus. Every route has #main-content. */
  const onMap = pathname === '/' || pathname === '/ur' || pathname === '/ur/';
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      {onMap && (
        <a href="#shrine-directory" className="skip-link">
          {t('skipToShrineList')}
        </a>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      {/* Inside LanguageProvider is unnecessary — a calendar preference is not a
          language — but nesting it here keeps one provider tree instead of two,
          and every consumer of it is already below both. */}
      <LanguageProvider>
        <ReaderPreferencesProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            {/* Inside the router (it reads the route to stand down on the map),
              outside the error boundary and Suspense: ⌘K keeps working while a
              page chunk is still arriving, and search surviving a crashed page
              is a way out of it. */}
            <ArchiveSearchProvider>
              <SkipLinks />
              <RouteAnnouncer />
              <LinkPrefetcher />
              {/* Top-level navigation, phone only (hidden by CSS above 640px).
              Outside the Suspense boundary on purpose: the bar is the one thing
              on screen while a lazily-loaded page is still arriving, and a
              navigation that disappears during navigation is worse than none. */}
              <TabBar />
              <AppErrorBoundary>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<MapPage />} />
                    <Route path="/shrine/:slug" element={<ShrinePage />} />
                    <Route path="/saint/:slug" element={<SaintPage />} />
                    <Route path="/order/:slug" element={<OrderPage />} />
                    <Route path="/graph" element={<GraphPage />} />
                    <Route path="/almanac" element={<AlmanacPage />} />
                    {/* `/coverage` and `/report` were pages; they are sections of
                    `/about` now. They stay as routes because they are published
                    URLs — a merge is not a reason to 404 a link somebody sent —
                    and because check-routes-prerendered.mjs still writes a file
                    for each, so a direct visit resolves on GitHub Pages before
                    any JavaScript runs. Each lands on the section it was sent
                    for rather than the top of a very long page. */}
                    <Route path="/report" element={<Navigate to="/about#site-status" replace />} />
                    <Route path="/review" element={<ReviewPage />} />
                    <Route path="/typology" element={<TypologyPage />} />
                    <Route path="/chronology" element={<ChronologyPage />} />
                    <Route path="/shared-ground" element={<SharedGroundPage />} />
                    <Route path="/tradition/:slug" element={<TraditionPage />} />
                    <Route path="/coverage" element={<Navigate to="/about#traditions" replace />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/place/:slug" element={<PlacePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Legacy shrine.html?id=N redirect */}
                    <Route path="/shrine.html" element={<LegacyRedirect />} />
                    {/* /ur/* — crawler-discovery mirror of the routes above (see
                    UrPrefixNormalizer); never linked to internally. */}
                    <Route
                      path="/ur"
                      element={
                        <UrPrefixNormalizer>
                          <MapPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/shrine/:slug"
                      element={
                        <UrPrefixNormalizer>
                          <ShrinePage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/saint/:slug"
                      element={
                        <UrPrefixNormalizer>
                          <SaintPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/order/:slug"
                      element={
                        <UrPrefixNormalizer>
                          <OrderPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/graph"
                      element={
                        <UrPrefixNormalizer>
                          <GraphPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/almanac"
                      element={
                        <UrPrefixNormalizer>
                          <AlmanacPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    {/* Straight to the Urdu mirror of the merged page, rather than
                    normalising here and redirecting after: two effects racing to
                    rewrite the same URL. `/ur/about` already does this properly. */}
                    <Route
                      path="/ur/report"
                      element={<Navigate to="/ur/about#site-status" replace />}
                    />
                    <Route
                      path="/ur/coverage"
                      element={<Navigate to="/ur/about#traditions" replace />}
                    />
                    <Route
                      path="/ur/typology"
                      element={
                        <UrPrefixNormalizer>
                          <TypologyPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/chronology"
                      element={
                        <UrPrefixNormalizer>
                          <ChronologyPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/shared-ground"
                      element={
                        <UrPrefixNormalizer>
                          <SharedGroundPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/tradition/:slug"
                      element={
                        <UrPrefixNormalizer>
                          <TraditionPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/about"
                      element={
                        <UrPrefixNormalizer>
                          <AboutPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/place/:slug"
                      element={
                        <UrPrefixNormalizer>
                          <PlacePage />
                        </UrPrefixNormalizer>
                      }
                    />
                    {/* Neither is in the sitemap — a reader's own preferences are
                    not a document, and the review desk is team-only — but
                    prerender.mjs emits a /ur file for every APP_ROUTE, and a
                    published file with no route is worse than either. Both used
                    to paint an Urdu <title> and then render صفحہ نہیں ملا the
                    instant React hydrated. check-routes-prerendered.mjs now
                    fails the build if an emitted /ur file has no route. */}
                    <Route
                      path="/ur/settings"
                      element={
                        <UrPrefixNormalizer>
                          <SettingsPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route
                      path="/ur/review"
                      element={
                        <UrPrefixNormalizer>
                          <ReviewPage />
                        </UrPrefixNormalizer>
                      }
                    />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </AppErrorBoundary>
              <UpdateToast />
            </ArchiveSearchProvider>
          </BrowserRouter>
        </ReaderPreferencesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
