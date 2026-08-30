// @vitest-environment node
/**
 * The observance dictionary must be reachable from every surface that shows an
 * observance (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `SPECIAL_URDU_PHRASES` in `urduFallback.ts` holds **170 hand-translated whole
 * `Events` cells**. `ShrineInfobox` reached them, because it looks the entire
 * cell up before anything else. Four other surfaces did not:
 *
 * - `/almanac`, both views — the page whose entire subject is when the
 *   gatherings happen
 * - `RecordedObservanceList`, so all 9 `/order/:slug`, all 64 `/place/:slug`
 *   and 143 `/saint/:slug`
 * - the archive-wide search
 *
 * All three passed the raw English cell, and `localizeObservance` split on `;`
 * **before** any lookup — so a whole-cell entry was unreachable from them by
 * construction.
 *
 * Measured 30 August 2026 over the 168 live cells: the whole-cell path resolved
 * 168, the segment path 88. **80 cells had a reviewed Urdu translation sitting
 * in this repository that four surfaces never asked for.** On the almanac, 32 of
 * 80 rows read half in English, and some read as `Annual urs (۱۸-۲۰ Safar)` —
 * English with Eastern digits substituted mid-sentence, which is worse than
 * plain English because it looks translated.
 *
 * The fix is in `localizeObservance` rather than at the three call sites, so a
 * fifth caller cannot forget it. Nothing was authored: these are the existing
 * reviewed strings.
 *
 * ## This corrects a note elsewhere in the repository
 *
 * `e2e/urdu-no-leak.spec.ts` explains the `order`, `place` and `almanac` budgets
 * as *"each of these is a segment the observance dictionary does not yet
 * carry"*. For 80 of the 168 cells the dictionary carried the whole thing and
 * only the lookup shape differed. Those budgets were measuring a **wiring** debt,
 * not a translation one.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeObservance } from '../localizeObservance';
import { translateToUrdu } from '../urduFallback';

const ROOT = join(__dirname, '..', '..', '..', '..');

const eventCells = (): string[] => {
  const { rows } = JSON.parse(
    readFileSync(join(ROOT, 'src', 'data', 'shrines-fallback.json'), 'utf8'),
  ) as { rows: Record<string, string>[] };
  return rows.map((r) => String(r.Events ?? '').trim()).filter(Boolean);
};

/** What the old code did: split first, translate the pieces. */
const segmentPathOnly = (raw: string): string =>
  raw
    .split(';')
    .map((p) => {
      const t = p.trim();
      if (!t) return t;
      const urdu = translateToUrdu(t);
      return urdu && urdu !== t && !/[A-Za-z]/.test(urdu) ? urdu : t;
    })
    .filter(Boolean)
    .join('؛ ');

describe('observance localization reaches the whole-cell dictionary', () => {
  it('has cells to translate', () => {
    expect(eventCells().length).toBeGreaterThan(150);
  });

  it('leaves no Latin in any observance cell', () => {
    const leaking = eventCells()
      .map((cell) => ({ cell, out: localizeObservance(cell, 'ur') }))
      .filter(({ out }) => /[A-Za-z]/.test(out))
      .map(({ cell, out }) => `  ${cell.slice(0, 60)}\n      -> ${out.slice(0, 70)}`);

    expect(
      leaking,
      leaking.length === 0
        ? ''
        : `${leaking.length} observance cell(s) still render Latin to an Urdu reader:\n${leaking.join('\n')}\n\n` +
            'This is a dictionary entry to add in `SPECIAL_URDU_PHRASES` (whole cell) or the ' +
            "segment seed — authoring Urdu, so a human's (RULE 2). It is not a reason to relax " +
            'this assertion.',
    ).toEqual([]);
  });

  it('does better than splitting first, which is the whole point', () => {
    /* Without this the fix could be silently reverted and the suite would stay
       green — the shared path would simply resolve fewer cells, on four pages no
       unit test renders. Measured: 168 through the whole-cell path, 88 through
       segments alone. */
    const cells = eventCells();
    const viaShared = cells.filter((c) => !/[A-Za-z]/.test(localizeObservance(c, 'ur'))).length;
    const viaSegments = cells.filter((c) => !/[A-Za-z]/.test(segmentPathOnly(c))).length;

    expect(
      viaSegments,
      'the segment path has improved — update the note, this is good news',
    ).toBeLessThan(viaShared);
    expect(
      viaShared - viaSegments,
      'the whole-cell lookup is no longer adding anything. Either the dictionary changed shape, ' +
        'or `localizeObservance` has gone back to splitting before it looks the cell up.',
    ).toBeGreaterThanOrEqual(60);
  });

  it('normalises the separator on the whole-cell path too', () => {
    /* The whole-cell result is returned early, so it skips the segment path's
       punctuation handling. None of the 170 dictionary entries carries an ASCII
       semicolon, but `translateToUrdu` composes results of its own and one comes
       back as `سالانہ عرس; قوالی` — fully Urdu around a Latin punctuation mark.
       Caught by an existing assertion when the early return was added raw. */
    const out = localizeObservance('Annual urs; qawwali', 'ur');
    expect(out).not.toMatch(/[A-Za-z]/);
    expect(out).toContain('؛');
    expect(out).not.toContain(';');
  });
});
