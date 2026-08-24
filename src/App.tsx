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
import { UpdateToast } from './components/ui/UpdateToast';
import { TabBar } from './components/nav/TabBar';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { persistAccessParamIfPresent } from './lib/projectAccess';
import { stripUrPrefix } from './lib/i18n/urlLangPrefix';

persistAccessParamIfPresent();

const MapPage = lazy(() => import('./pages/MapPage'));
const ShrinePage = lazy(() => import('./pages/ShrinePage'));
const SaintPage = lazy(() => import('./pages/SaintPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const GraphPage = lazy(() => import('./pages/GraphPage'));
const AlmanacPage = lazy(() => import('./pages/AlmanacPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const TypologyPage = lazy(() => import('./pages/TypologyPage'));
const CoveragePage = lazy(() => import('./pages/CoveragePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PlacePage = lazy(() => import('./pages/PlacePage'));
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
    window.history.replaceState(null, '', `${newPathname}?${params.toString()}`);
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

function RouteAnnouncer() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // Real page changes only — this effect is keyed on pathname, so in-page
    // anchor navigation (e.g. ContentsNav's scrollIntoView) never triggers it.
    window.scrollTo(0, 0);
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
      <LanguageProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <SkipLinks />
          <RouteAnnouncer />
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
                <Route path="/report" element={<ReportPage />} />
                <Route path="/typology" element={<TypologyPage />} />
                <Route path="/coverage" element={<CoveragePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/place/:slug" element={<PlacePage />} />
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
                <Route
                  path="/ur/report"
                  element={
                    <UrPrefixNormalizer>
                      <ReportPage />
                    </UrPrefixNormalizer>
                  }
                />
                <Route
                  path="/ur/coverage"
                  element={
                    <UrPrefixNormalizer>
                      <CoveragePage />
                    </UrPrefixNormalizer>
                  }
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
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
          <UpdateToast />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
