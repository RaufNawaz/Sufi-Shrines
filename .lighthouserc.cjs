// Lighthouse CI configuration.
// Run: npx lhci autorun
// Requires: npm run build first, then npx lhci autorun (starts preview server automatically).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      /*
       * Every route, and one of them in Urdu.
       *
       * This measured `/` and `/shrine/data-darbar` and nothing else, while the
       * app grew /saint, /order, /graph, /almanac, /coverage and /about — so it
       * reported the site's performance and SEO having looked at two pages of
       * twelve. Same shape of gap as the axe sweep (HANDOVER §9.46) and the
       * no-leak guard (§9.56): a URL list is a universe, and a check is only as
       * good as the one it ran over.
       *
       * The Urdu entry earns its place separately: RTL flips every layout,
       * Nastaliq changes every line box, and the numeral toggle rewrites text
       * content. None of that is exercised by an English-only run, and the
       * project's standard is that Urdu is a first-class edition.
       *
       * Note: lhci could not be run in the environment where this list was
       * extended (Chrome cannot reach the tile, font or CSV hosts through the
       * agent proxy, and `upload: temporary-public-storage` needs network). The
       * additions rest on the axe sweep, which does run here and reports zero
       * critical or serious violations on all of these routes in both
       * languages — Lighthouse's accessibility audit is a subset of those
       * rules. If a new URL trips an `error`-level assertion, that is a real
       * finding on a page nothing was measuring before, not a bad budget.
       */
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/?lang=ur',
        'http://localhost:4173/shrine/data-darbar',
        'http://localhost:4173/saint/data-ganj-bakhsh',
        'http://localhost:4173/order/qadiriyya',
        'http://localhost:4173/graph',
        'http://localhost:4173/almanac',
        'http://localhost:4173/coverage',
        'http://localhost:4173/about',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        // Category score minimums (0–1 scale)
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.85 }],

        // Core Web Vitals budgets
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],

        // a11y specifics (error = CI fails)
        'color-contrast': 'error',
        'image-alt': 'error',
        label: 'error',
        'link-name': 'error',
        'button-name': 'error',
        'html-has-lang': 'error',
        'document-title': 'error',
        'meta-description': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
