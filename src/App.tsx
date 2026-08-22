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

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <a href="#shrine-directory" className="skip-link">
            Skip to shrine list
          </a>
          <RouteAnnouncer />
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
                  path="/ur/typology"
                  element={
                    <UrPrefixNormalizer>
                      <TypologyPage />
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
