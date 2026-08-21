// defineConfig comes from vitest/config (not vite) so the `test` block below
// is typed.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'src/**/*.stories.{ts,tsx}'],
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'Sufi Shrines of Pakistan',
          short_name: 'Sufi Shrines',
          description:
            'An interactive map of Sufi shrines across Pakistan. Explore histories, architecture, rituals, and visitor information in English and Urdu.',
          theme_color: '#2a4d9b',
          background_color: '#f9f6f0',
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
          globIgnores: ['**/urdu-content-*.js', '**/urdu-seed-*.js'],
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
              urlPattern: /\/assets\/urdu-(content|seed)-[^/]*\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'urdu-payloads',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-sheets-csv',
                expiration: { maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles-carto',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
