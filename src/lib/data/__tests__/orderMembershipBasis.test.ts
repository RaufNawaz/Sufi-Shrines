// @vitest-environment node
/**
 * Every order membership must rest on something the archive holds
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `data/kg.json` carries 67 `belongs_to_order` edges. 43 are machine-extracted
 * and each carries a verbatim quote and the file it was read from. 24 are
 * hand-seeded from `kg-seeds.json#saintOrders`, which is a bare
 * `slug → orderSlug` map with no source, no quote and no `_why`.
 *
 * Twenty of those 24 at least have `asRecorded` — the figure's own silsila cell,
 * carried onto the edge. **Four have nothing:**
 *
 *     rahman-baba              → chishtiyya
 *     makhdoom-burhan-ud-din   → suhrawardiyya
 *     sufi-shah-inayat-shaheed → qadiriyya
 *     sachal-sarmast           → qadiriyya
 *
 * All four shrine rows' `silsila` cell is empty, and none of the four
 * Descriptions ever names the order. All four are widely attested in the general
 * literature, and **that is not this archive saying so** — writing them in from
 * general knowledge is precisely what RULE 2 forbids.
 *
 * ## The presentation inverts the truth, which is why this matters
 *
 * `getOrderMemberships` sets `reviewed: r.reviewed !== false`, and `reviewed` is
 * *absent* on every hand-seeded edge, so it resolves to `true`. `SaintPage` and
 * `OrderPage` show the "unreviewed" chip only when `!membership.reviewed`. So
 * the four unsourced claims render as a bare order badge with nothing beside
 * them, while the 43 machine-extracted memberships next to them carry a chip
 * *and* a quote *and* a citation. On an archive whose whole claim is
 * traceability, the unsourced claim is the one with no marker on it.
 *
 * ## Why this reports rather than fixes
 *
 * Two halves, and only one is an agent's.
 *
 * The guard is: `build-kg.mjs`'s `seeded-order-contradicts-sheet` check was
 * nested inside `if (asRecorded)`, so the four seeds with no sheet cell were
 * exactly the four it was structurally unable to question. It now has an `else`
 * branch and reports `seeded-order-has-no-basis`.
 *
 * The reader-facing half is not an agent's. Marking the four `reviewed: false`
 * would put a chip on them, and it would also make `/about` untrue: its copy
 * reads *"Machine-extracted claims … are marked unreviewed wherever they
 * appear"*, which ties the chip to machine extraction. Rewording that needs
 * Urdu. So the four are named here and the decision — name a source, or mark
 * them and reword — is recorded in `docs/SESSION_RESUME.md`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'));

type Relation = {
  type: string;
  subject: string;
  object: string;
  method?: string;
  source?: string;
  quote?: string;
  asRecorded?: string;
  reviewed?: boolean;
};

const memberships = (): Relation[] =>
  (read('data', 'kg.json') as { relations: Relation[] }).relations.filter(
    (r) => r.type === 'belongs_to_order',
  );

/** An edge rests on something when the archive can show a reader where it came from. */
const hasBasis = (r: Relation): boolean =>
  Boolean(r.source) || Boolean(r.quote) || Boolean(r.asRecorded);

/**
 * The four seeds with no basis, named with what would close each.
 *
 * An allowlist rather than a count: a fifth unsupported seed must fail even if
 * one of these is closed the same week. Closing one means giving its
 * `saintOrders` entry the object form — `{ "order": …, "source": …, "note": … }`
 * — with a work the archive actually holds, or recording it in
 * `saintOrdersNotInCell` with the evidence.
 */
export const KNOWN_UNSOURCED = new Map<string, string>([
  ['saint:rahman-baba::order:chishtiyya', 'Silsila cell empty; the Description never says "Chishti".'],
  [
    'saint:makhdoom-burhan-ud-din::order:suhrawardiyya',
    'Silsila cell empty; the Description never says "Suhrawardi". Its own bibliography line calls the tradition "local hagiographical … to be used with due caution".',
  ],
  [
    'saint:sufi-shah-inayat-shaheed::order:qadiriyya',
    'Silsila cell empty; the Description never says "Qadiri".',
  ],
  ['saint:sachal-sarmast::order:qadiriyya', 'Silsila cell empty; the Description never says "Qadiri".'],
]);

describe('order memberships rest on something', () => {
  it('has memberships to check', () => {
    expect(memberships().length).toBeGreaterThan(50);
  });

  it('cites a source, a quote or the sheet for every membership', () => {
    const unsupported = memberships()
      .filter((r) => !hasBasis(r))
      .filter((r) => !KNOWN_UNSOURCED.has(`${r.subject}::${r.object}`))
      .map((r) => `  ${r.subject} → ${r.object} (method: ${r.method ?? 'unset'})`);

    expect(
      unsupported,
      unsupported.length === 0
        ? ''
        : `${unsupported.length} order membership(s) rest on nothing the archive holds:\n` +
            `${unsupported.join('\n')}\n\n` +
            'Each is published on a /saint/ page and an /order/ page with no chip, no quote and\n' +
            'no citation — rendering as more settled than the machine-extracted memberships\n' +
            'beside it. Give the seed the object form { "order", "source", "note" } naming a work\n' +
            'the archive holds, or record it in saintOrdersNotInCell with the evidence. Do not\n' +
            'supply the affiliation from general knowledge (RULE 2), however well attested.',
    ).toEqual([]);
  });

  it('names no exception that has been sourced since', () => {
    const stillUnsourced = new Set(
      memberships()
        .filter((r) => !hasBasis(r))
        .map((r) => `${r.subject}::${r.object}`),
    );
    const stale = [...KNOWN_UNSOURCED.keys()].filter((k) => !stillUnsourced.has(k));
    expect(
      stale,
      stale.length === 0
        ? ''
        : `${stale.length} membership(s) now carry a basis — delete the line:\n` +
            stale.map((k) => `  ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('reports each one in the review queue rather than only here', () => {
    /* The guard that could not see them: `seeded-order-contradicts-sheet` was
       nested inside `if (asRecorded)`, so a seed with no sheet cell was checked
       against nothing. If this drops back to zero, that nesting has returned. */
    const review = read('data', 'kg-review-needed.json') as {
      reviewNeeded?: { issue: string; entityId: string }[];
    };
    const items = review.reviewNeeded ?? [];
    expect(items.length, 'kg-review-needed.json has no `reviewNeeded` array — the file shape changed, ' +
      'and this check would otherwise pass over an empty list and read as healthy').toBeGreaterThan(0);
    const reported = items.filter((i) => i.issue === 'seeded-order-has-no-basis');
    expect(
      reported.length,
      'build-kg.mjs is no longer reporting unsupported order seeds. The check lives in the ' +
        '`else` branch beside `seeded-order-contradicts-sheet`; if it has been folded back ' +
        'inside `if (asRecorded)` it can never see the seeds that have no sheet cell.',
    ).toBe(KNOWN_UNSOURCED.size);
  });
});
