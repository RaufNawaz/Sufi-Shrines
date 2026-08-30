import { describe, it, expect } from 'vitest';
import {
  unbroken,
  unbalancedEmphasis,
  LONG_ENOUGH,
  KNOWN,
  KNOWN_UNBALANCED,
} from '../../../../scripts/data/validate-description-structure.mjs';
import shrines from '../../../data/shrines-fallback.json';

/**
 * The guard that stands between the archive and its worst recorded accident.
 *
 * `CLAUDE.md` RULE 3 warns that Sheets' **TSV** export silently strips newlines
 * inside cells. One wrong export flattens every `## History` heading, every
 * bibliography item and every paragraph break in all 169 entries at once, and
 * nothing errors — the site loads, the pages render, and the archive becomes
 * 169 walls of text. RULE 4 names the guard: refuse to write if a long
 * Description has lost its newlines.
 *
 * The guard existed and was **not in the build path**. It lives in
 * `pipeline/append_new_shrines.py`, which runs only when a person appends
 * shrines by hand; `data:build`, `data:validate` and `verify` never called it.
 * Measured 30 August 2026: one entry has already lost its newlines, and nothing
 * noticed. One is invisible. This is here for the day it is 169.
 *
 * These test the predicate rather than the script's output, because the script
 * is the gate and the gate's own logic is the thing that must not quietly
 * invert. `validate-description-structure.mjs` is now in `npm run data:validate`.
 */

const long = (n: number) => 'a'.repeat(n);

describe('unbroken description detection', () => {
  it('flags a long description with no line break', () => {
    expect(unbroken([{ Name: 'x', Description: long(LONG_ENOUGH + 1) }])).toHaveLength(1);
  });

  it('leaves a long description that keeps its structure', () => {
    expect(
      unbroken([{ Name: 'x', Description: `${long(800)}\n\n## History\n\n${long(800)}` }]),
    ).toHaveLength(0);
  });

  it('leaves a short entry alone — brief is not damaged', () => {
    /* The distinction the threshold exists for. A one-paragraph stub is a small
       entry; a 1,300-character block is a lost structure. */
    expect(unbroken([{ Name: 'x', Description: long(LONG_ENOUGH - 1) }])).toHaveLength(0);
  });

  it('reads the lowercase field too', () => {
    /* The canonical dataset uses `Description`; some shapes carry `description`.
       A guard that sees only one of them is a guard that passes on the wrong
       file, which is exactly how the 171-vs-169 drift went unnoticed. */
    expect(unbroken([{ Name: 'x', description: long(700) }])).toHaveLength(1);
  });

  it('does not count a trailing newline as structure', () => {
    /* The predicate trims before it looks, so a block that merely *ends* in a
       newline is still a block. Worth pinning: a CSV round-trip can leave one
       on a cell it flattened, and a guard that accepted it would pass on the
       exact damage it exists to catch. */
    expect(unbroken([{ Name: 'x', Description: `${long(700)}\n` }])).toHaveLength(1);
    expect(unbroken([{ Name: 'x', Description: `${long(350)}\n${long(350)}` }])).toHaveLength(0);
  });
});

describe('the shipped archive', () => {
  const rows = (shrines as unknown as { rows: Array<{ Name: string; Description?: string }> }).rows;

  it('has exactly the recorded exceptions and no others', () => {
    /* The assertion that matters. If this ever reports more, either an import
       lost structure or an entry was written without it — and RULE 4 forbids the
       shortcut of widening the threshold to make it pass. */
    const offenders = unbroken(rows).map((r) => r.Name);
    expect(offenders.filter((name) => !KNOWN.has(name))).toEqual([]);
  });

  it('keeps every recorded exception real', () => {
    /* An allowlist that outlives its entries is a lie about the data. When
       someone paragraphs Sant Baba Asudaram in the sheet, this fails and tells
       them to delete the line rather than leaving a stale excuse in the tree. */
    const offenders = new Set(unbroken(rows).map((r) => r.Name));
    for (const name of KNOWN.keys())
      expect(offenders.has(name), `${name} no longer needs its exception — remove it`).toBe(true);
  });

  it('is nowhere near the catastrophic shape', () => {
    /* A share, not a count: the emergency this guards is not "one more entry",
       it is all of them at once. */
    expect(unbroken(rows).length / rows.length).toBeLessThan(0.05);
  });
});

/**
 * The emphasis invariant, added 30 August 2026 when RULE 4's four named guards
 * were audited after the newline one turned out to be orphaned. This one was
 * orphaned too, and weaker: it lived in `snapshot-sheet.mjs`, reachable only
 * through `npm run data:restore-point` — a command a person runs by hand before
 * an import — and where it did run it only warned, "Written anyway."
 *
 * Of the four, `marker-count vs row-count` is genuinely live (CI runs `e2e`),
 * and `RMS pixel comparison before any media sync` has no implementation in the
 * repo or in the legacy `~/shrines` pipeline directory at all.
 */
describe('emphasis in Descriptions', () => {
  const rows = (shrines as unknown as { rows: Array<{ Name: string; Description?: string }> })
    .rows;

  it('pairs up in every entry', () => {
    /* `*ʿurs*` italics are meaningful markdown and bold is `**`, so a
       well-formed Description always has an even count. Odd means a cell was cut
       mid-emphasis. */
    const odd = unbalancedEmphasis(rows).map((r) => r.Name);
    expect(odd.filter((name) => !KNOWN_UNBALANCED.has(name))).toEqual([]);
  });

  it('would catch a truncation, which is the only reason to have it', () => {
    /* Not a tautology over the real data, which currently has zero offenders —
       a check whose passing state and whose broken state look identical proves
       nothing. Both shapes the damage actually takes are asserted. */
    expect(unbalancedEmphasis([{ Name: 'cut', Description: 'the *urs' }])).toHaveLength(1);
    expect(
      unbalancedEmphasis([{ Name: 'stray', Description: 'a **bold** run and a stray *' }]),
    ).toHaveLength(1);
    expect(
      unbalancedEmphasis([{ Name: 'fine', Description: 'the *urs* and **bold**' }]),
    ).toHaveLength(0);
  });

  it('catches a truncated bold run, which a parity count cannot', () => {
    /* The case that motivated counting `*` and `**` as separate runs. A cell cut
       inside a bold marker leaves `**Data Darbar` — two asterisks, an even total,
       and a parity check over every `*` calls it well-formed. It is the same
       truncation that produces `*ʿurs`, and one of the two was invisible.

       Narrow in this corpus — 2 of 169 rows use `**` at all, against 3,224 single
       asterisks — and that is the point: a guard whose whole job is to recognise a
       signature cannot be allowed to miss half of it because the half is rare. */
    expect(unbalancedEmphasis([{ Name: 'cut-bold', Description: 'the **Data Darbar' }])).toHaveLength(
      1,
    );
    expect(
      unbalancedEmphasis([{ Name: 'cut-bold-mid', Description: 'a **bold claim about *urs*' }]),
    ).toHaveLength(1);
  });

  it('does not fail a correctly escaped literal asterisk', () => {
    /* `\\*` is a literal, not emphasis. Counting it would make an escaped cell
       fail a check about damage — the shape RULE 4 warns against, where the
       cheapest way to green is to edit correct content. */
    expect(
      unbalancedEmphasis([{ Name: 'escaped', Description: 'rated 5\\* and 3\\* by two surveys' }]),
    ).toHaveLength(0);
  });

  it('starts with an empty allowlist and should stay that way', () => {
    // Unlike KNOWN, nothing in the archive legitimately carries an odd count.
    expect(KNOWN_UNBALANCED.size).toBe(0);
  });
});
