// @vitest-environment node
/**
 * The gap report and the page must agree about who has an Urdu name.
 *
 * `scripts/data/measure-kb-gaps.mjs` cannot import `localizeFigureName` — it
 * lives outside `tsconfig`, and importing the other way is a TS7016 error — so
 * it mirrors the resolver by reading `urduFallback.ts` as text. Mirrors drift.
 * This test is the thing that makes the mirror safe to have.
 *
 * It exists because the un-mirrored version was WRONG, in the direction that
 * matters most for that particular report. It decided the question with one
 * case-insensitive lookup of the whole name in `urdu-seed.json`, which is only
 * the first of the resolver's three paths, and so reported `bhai-biba-singh` as
 * class `evidence` — *the archive does not record this and nobody at a keyboard
 * can close it*. The archive records it as "Bhai Biba (Beba) Singh", the
 * resolver drops parentheticals when it normalises, and the Urdu page has read
 * بھائی بیبا سنگھ the whole time.
 *
 * A report whose job is to separate the fixable from the unfixable had filed a
 * solved thing under "unfixable". That is worse than having no check, and it is
 * the same failure `docs/KNOWLEDGE_BASE_GAPS.md` warns its own reader about:
 * an agent handed a to-do list of "unrecorded" facts closes it by supplying
 * them from general knowledge.
 *
 * Asserting set equality rather than counts, in both directions: a mirror that
 * is too permissive hides a real gap, and one that is too strict invents one.
 *
 * It also, incidentally, guards a second bug found while writing it. Reading
 * `--json` over a PIPE is not the same as redirecting it to a file: the script
 * ended its JSON branch with `process.exit(0)`, and `process.stdout` is async on
 * a pipe, so the document was cut at exactly 65,536 bytes of ~92 KB — with exit
 * code 0, and only in the automated form, never in the redirect a person types
 * by hand. This test consumes the pipe, so a reintroduced `process.exit` fails
 * here rather than in whatever reads the report next.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeFigureName } from '../localizeKgName';
import type { KGSaint } from '../../../types/kg';

const ROOT = join(__dirname, '../../../..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data/kg.json'), 'utf8')) as { saints: KGSaint[] };

/** What the pages actually render — the authority. */
const latinOnPage = kg.saints
  .filter((s) => /[A-Za-z]/.test(localizeFigureName(s, 'ur')))
  .map((s) => s.slug)
  .sort();

/** What the report claims. */
const reported = (() => {
  const out = execFileSync(
    process.execPath,
    [join(ROOT, 'scripts/data/measure-kb-gaps.mjs'), '--json'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const { gaps } = JSON.parse(out) as { gaps: { kind: string; subject: string }[] };
  return gaps
    .filter((g) => g.kind === 'figure-no-urdu-name')
    .map((g) => g.subject)
    .sort();
})();

describe('measure-kb-gaps vs the real Urdu resolver', () => {
  it('names exactly the figures that render in Latin, and no others', () => {
    expect(
      reported,
      'the gap report and localizeFigureName disagree. If the report names MORE, its mirror of ' +
        'urduFallback.ts has fallen behind and it is inventing an unfixable gap; if it names ' +
        'FEWER, a figure really is untranslated and the report is hiding it. Fix the mirror in ' +
        'scripts/data/measure-kb-gaps.mjs — do not relax this test.',
    ).toEqual(latinOnPage);
  });

  it('agrees that the debt is currently zero', () => {
    /* Not a duplicate of the assertion above: that one would pass if BOTH were
       wrong in the same direction. This pins the actual state, which
       figureNameUrduParity.test.ts also asserts from the other side. */
    expect(latinOnPage).toEqual([]);
  });
});
