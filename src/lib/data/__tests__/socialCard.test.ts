// @vitest-environment node
/**
 * The social card is the archive's front door on WhatsApp (RULE 4).
 *
 * `index.html` declared `twitter:card=summary_large_image` and carried no
 * `og:image` at all, so every shared link rendered as a bare URL. Most of this
 * project's readers arrive from a forwarded message; that was the first thing
 * they saw of it, and nothing in the build said a word.
 *
 * Three things are checked, each for a failure that had already happened or was
 * one refactor away:
 *
 * 1. **A declared card has an image.** The original bug, stated as a rule.
 * 2. **The card's baked-in numbers still match the data.** The PNG says "169
 *    documented sites". A PNG cannot recompute itself, so the count is a
 *    measurement with a date on it — exactly the failure mode of the standing
 *    findings in HANDOVER §9, where "49 of 167 entries have no bibliography"
 *    was quoted as current for weeks after it stopped being true.
 * 3. **The relative stub prerender.mjs rewrites is still there.** Crawlers do
 *    not resolve a relative `og:image`, and this site is served from a subpath,
 *    so the absolute rewrite is not optional. prerender.mjs exits non-zero if
 *    the stub is gone; this says so in milliseconds instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const INDEX = readFileSync(join(ROOT, 'index.html'), 'utf8');
const LOCK = JSON.parse(readFileSync(join(ROOT, 'scripts/og-image.lock.json'), 'utf8'));
const SNAPSHOT = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));

const rows: unknown[] = SNAPSHOT.rows ?? SNAPSHOT;

function metaContent(pattern: RegExp): string | null {
  const m = pattern.exec(INDEX);
  return m ? m[1]! : null;
}

describe('social sharing card', () => {
  it('declares an image wherever it declares a large card', () => {
    const declaresLargeCard = /twitter:card"\s+content="summary_large_image"/.test(INDEX);
    if (!declaresLargeCard) return; // a plain summary card needs no image
    expect(
      metaContent(/<meta\s+property="og:image"\s+content="([^"]+)"/),
      'twitter:card is summary_large_image but no og:image is declared — every shared link ' +
        'renders as a bare URL',
    ).toBeTruthy();
    expect(metaContent(/<meta\s+name="twitter:image"\s+content="([^"]+)"/)).toBeTruthy();
  });

  it('keeps the relative stub prerender.mjs rewrites to an absolute URL', () => {
    expect(
      metaContent(/<meta\s+property="og:image"\s+content="([^"]+)"/),
      'prerender.mjs rewrites the literal `content="/og-image.png"`; changing it there and not ' +
        'here (or the reverse) fails the build',
    ).toBe('/og-image.png');
  });

  it('the generated PNG exists and is a plausible size', () => {
    const png = join(ROOT, 'public/og-image.png');
    expect(existsSync(png), 'public/og-image.png is missing — run `npm run og:image`').toBe(true);
    // Facebook rejects images under 200x200 and warns under 600x315; a
    // near-empty file means the render failed and wrote a blank frame.
    expect(statSync(png).size).toBeGreaterThan(10_000);
  });

  it('the dimensions declared in the head match the ones the card was rendered at', () => {
    expect(metaContent(/<meta\s+property="og:image:width"\s+content="([^"]+)"/)).toBe(
      String(LOCK.width),
    );
    expect(metaContent(/<meta\s+property="og:image:height"\s+content="([^"]+)"/)).toBe(
      String(LOCK.height),
    );
    // Below 1200x630 the large card degrades to a small one on Twitter.
    expect(LOCK.width).toBeGreaterThanOrEqual(1200);
    expect(LOCK.height).toBeGreaterThanOrEqual(630);
  });

  it('the site count printed on the card still matches the archive', () => {
    expect(
      LOCK.sites,
      `the card says ${LOCK.sites} documented sites and the archive now holds ${rows.length}. ` +
        'Regenerate it with `npm run og:image` — a shared card advertising a stale number is ' +
        'the same failure as a stale standing finding.',
    ).toBe(rows.length);
  });

  it('the titles printed on the card are the ones the UI uses', () => {
    /* Both tables, because they are two files now: the Urdu strings were split
       into `uiStrings.ur.ts` so an English reader does not download 42 KB of
       Nastaliq copy. Reading only `uiStrings.ts` found one title and this test
       failed with "expected ['Sufi Shrines of Pakistan'] to include
       'پاکستان کے صوفی مزارات'" — which is a correct complaint about the wrong
       thing, and the reason this comment names both paths. */
    const sources = ['src/lib/i18n/uiStrings.ts', 'src/lib/i18n/uiStrings.ur.ts']
      .map((rel) => readFileSync(join(ROOT, rel), 'utf8'))
      .join('\n');
    const titles = [...sources.matchAll(/siteTitle:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(titles).toContain(LOCK.titleEn);
    expect(titles).toContain(LOCK.titleUr);
  });
});
