// defineConfig comes from vitest/config (not vite) so the `test` block below
// is typed.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { urduArticlesPlugin } from './scripts/vite-urdu-articles.mjs';

export default defineConfig(({ command }) => {
  // GitHub Pages project sites are served at /<repo-name>/, not the domain
  // root — only the production build needs the prefix; dev/test stay at '/'
  // so localhost keeps working without it. Override with VITE_BASE_PATH for
  // a custom-domain deploy (which serves from '/'). CI builds with
  // VITE_BASE_PATH=/ (see .github/workflows/ci.yml and the build:e2e script)
  // because `vite preview` serves at the domain root.
  const base = command === 'build' ? (process.env.VITE_BASE_PATH ?? '/Sufi-Shrines/') : '/';
  // `base` only ever contains '/' and word characters today, but escape it
  // anyway before embedding it in a RegExp.
  const baseForRegExp = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    base,
    // The dev server is the project's review surface (CLAUDE.md, "Session
    // start"), and the review link must be the same every session:
    // http://localhost:5173. `strictPort` so a taken port fails loudly here
    // instead of Vite silently moving to 5174 — a reviewer's bookmark that
    // sometimes shows a different session's build is worse than an error.
    // If it fails, a server is already up on 5173: reuse it.
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'src/**/*.stories.{ts,tsx}'],
    },
    plugins: [
      react(),
      urduArticlesPlugin(process.cwd()),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'Sufi Shrines of Pakistan',
          short_name: 'Sufi Shrines',
          description:
            'An interactive map of Sufi shrines across Pakistan. Explore histories, architecture, rituals, and visitor information in English and Urdu.',
          theme_color: '#2a4d9b',
          background_color: '#fbfbfa',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          /*
           * The two language payloads are kept out of the precache.
           *
           * The glob pattern above matches every emitted `.js`, so the service
           * worker downloaded the 1 MB Urdu article chunk and the 77 KB
           * dictionary in the background for
           * *every* visitor on their first load — after first paint, so no
           * budget and no Lighthouse run could see it, and the eager-payload
           * work upstream (urduContentOverride.ts, urduFallback.ts) was quietly
           * being undone one layer down for returning readers.
           *
           * They are cached the moment they are actually fetched instead, by the
           * runtime rule below, so an Urdu reader who has read one page still
           * has both offline. An English reader now really does ship neither.
           */
          // The basemap's RTL label plugin too: lazy-loaded by MapLibre only
          // when a tile carries Arabic-script text, so not every reader's cost.
          globIgnores: [
            '**/urdu-content-*.js',
            '**/urdu-seed-*.js',
            /* The per-article Urdu chunks (scripts/vite-urdu-articles.mjs, 17
               October 2026) were named by slug alone, so the two patterns above
               missed them and every visitor's service worker fetched all 170 in
               the background: about 1 MB then, 2.9 MB once the full public
               Urdu articles replaced the short ones (29 October 2026). Named
               `urdu-article-<slug>` below so this pattern can see them; they are
               cached on first read by the runtime rule instead. */
            '**/urdu-article-*.js',
            '**/vendor/mapbox-gl-rtl-text-*.js',
            // Team-only payloads (the provenance panel and /review): a public
            // reader never opens them, so a public phone should not download
            // them (mobile audit, 25 October 2026).
            '**/provenance-*.js',
            '**/kg-review-queue-*.js',
            /* The Gurmukhi face (30 October 2026) is wanted on the gurdwara
               articles and Baba Farid's, where Guru Nanak's and Farid's verse
               is quoted in its own script; its unicode-range already keeps
               every other page from fetching it, and this keeps the service
               worker from fetching it for every visitor in the background. */
            '**/fonts/NotoSansGurmukhi-*.woff2',
          ],
          // The navigation fallback must resolve to a URL that exists in the
          // precache manifest, which is served under `base` — a hardcoded
          // '/index.html' breaks offline navigation on the /Sufi-Shrines/
          // Pages deploy (createHandlerBoundToURL throws for URLs it never
          // precached).
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [new RegExp(`^${baseForRegExp}offline\\.html`)],
          runtimeCaching: [
            {
              // The language payloads excluded from the precache above: cached
              // on first real use, then served from the cache offline.
              urlPattern: /\/assets\/urdu-(content|seed|article)-[^/]*\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'urdu-payloads',
                /* One entry per article read, so room for every article (170)
                   beside the two whole-file payloads and their next versions. */
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              /* NetworkFirst, not StaleWhileRevalidate: under SWR the app's own
                 "live" fetch was answered from this cache, so a sheet edit
                 reached a returning reader only on their second visit. The
                 cache now answers only offline or when the network is slower
                 than the timeout, and is kept a week for field visits. */
              urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'google-sheets-csv',
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles-carto',
                /* Tiles load as no-cors images, so they are opaque responses,
                   which Chrome pads heavily when counting storage quota. On
                   a quota error, drop this cache rather than the whole origin's
                   storage (the precache and the reader's saved data with it). */
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  purgeOnQuotaError: true,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Shrine photos (tour stops included) come from many external
              // hosts (Wikimedia, news sites, etc.) rather than one CDN —
              // match by file extension instead of origin.
              urlPattern: /\.(?:png|jpe?g|webp|avif)(?:\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'shrine-images',
                /* Opaque (status 0) for every external host, and each one is
                   padded to megabytes in Chrome's quota accounting: 300 of
                   them could claim gigabytes on a phone. Fewer, and purged
                   first on a quota error, as for the tiles above. */
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Static per-stop narration assets (see tourAudioAssetPath) —
              // none ship yet, but this precaches any added later on first play.
              urlPattern: /\/audio\/tours\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tour-audio',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      // Emitted so scripts/check-bundle-budget.mjs can walk the real static
      // import graph. Guessing which chunks load eagerly is how 1 MB of Urdu
      // prose sat on the English critical path unnoticed.
      manifest: true,
      rollupOptions: {
        output: {
          /* Vite's own default, except for the per-article Urdu chunks, which
             take a prefix the precache can exclude (globIgnores above). */
          chunkFileNames: (chunk) =>
            chunk.facadeModuleId?.startsWith('\0virtual:urdu-article/')
              ? 'assets/urdu-article-[name]-[hash].js'
              : 'assets/[name]-[hash].js',
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-leaflet': ['leaflet', 'react-leaflet'],
            'vendor-papa': ['papaparse'],
            // Split out so the basemap engine caches independently of app
            // code: it is the largest dependency here and changes rarely.
            'vendor-maplibre': ['maplibre-gl', '@maplibre/maplibre-gl-leaflet'],
          },
        },
      },
    },
  };
});
