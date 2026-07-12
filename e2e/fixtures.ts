/**
 * Hermetic Playwright test fixture: every spec imports `test`/`expect` from
 * here instead of '@playwright/test'. The extended context intercepts the
 * app's Google Sheets CSV request and fulfills it from the deterministic
 * fixture at e2e/fixtures/shrines.csv (regenerate with
 * `node e2e/fixtures/generate-shrines-csv.mjs`), so the suite never depends
 * on the live sheet's contents or on network availability.
 *
 * Two things make the interception airtight:
 * - `serviceWorkers: 'block'` in playwright.config.ts — the PWA service
 *   worker has a StaleWhileRevalidate route for docs.google.com whose
 *   fetches would bypass `context.route`.
 * - Playwright gives each test a fresh browser context, so the app's
 *   localStorage CSV cache (useShrineData's cache key) can never leak data
 *   from a previous test or a live fetch. Within a single test, reloads may
 *   serve that cache — it was populated from this same fixture, and the
 *   background refresh is intercepted too. persistence.spec.ts relies on
 *   exactly that within-test persistence, so no init script clears storage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';
import type { Tour } from '../src/lib/tours/tours';

const here = path.dirname(fileURLToPath(import.meta.url));

const csvBody = fs.readFileSync(path.join(here, 'fixtures', 'shrines.csv'), 'utf-8');

// The snapshot the CSV fixture is generated from — read with fs rather than
// imported, because Playwright's ESM runtime rejects JSON imports reached
// through TS modules (`needs an import attribute of "type: json"`).
const snapshot = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'src', 'data', 'shrines-fallback.json'), 'utf-8'),
) as { rows: unknown[] };

/** Exact number of shrines the app builds from the CSV fixture (every row
 * has valid coordinates, so none are dropped). */
export const SHRINE_COUNT: number = snapshot.rows.length;

/** The bundled tour data, typed with the app's own Tour model. tours.ts
 * itself can't be imported here (same JSON-import restriction as above). */
export const TOURS: Tour[] = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'src', 'data', 'tours.json'), 'utf-8'),
) as Tour[];

export function getTour(id: string): Tour {
  const tour = TOURS.find((t) => t.id === id);
  if (!tour) throw new Error(`No tour with id "${id}" in src/data/tours.json`);
  return tour;
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/docs\.google\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csvBody }),
    );
    await use(context);
  },
});

export { expect };
