// Lighthouse CI configuration.
// Run: npx lhci autorun
// Requires: npm run build first, then npx lhci autorun (starts preview server automatically).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      url: ['http://localhost:4173/', 'http://localhost:4173/shrine/data-darbar'],
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
