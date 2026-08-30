// @vitest-environment node
/**
 * The archive may only report that a site records no observance when the site's
 * own cell says so (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `/almanac` publishes a five-way partition of the whole archive, and one of the
 * five is *"no observance recorded"*. On 30 August 2026 that bucket held **52
 * sites, and 51 of them had text in the cell.** Broken down by the archive's own
 * `category`:
 *
 *     Muslim Shrine                 5 of 79   —  6%
 *     Sikh Gurdwara                 9 of 33   — 27%
 *     Nanakpanthi / Udasi Darbar    9 of 14   — 64%
 *     Hindu Temple                 24 of 36   — 67%
 *     Jain Temple                   3 of  3   — 100%
 *
 * `OBSERVANCE_RE` held eleven alternatives. It knew ʿurs and mela; it did not
 * know Diwali, Holi, Janmashtami, Durga Puja, Cheti Chand, Ganesh Chaturthi,
 * Raksha Bandhan, Jayanti, Akhand Path or prakash. So a temple whose cell reads
 * *"Holi; Diwali; Janmashtami"* was counted among the sites recording nothing,
 * on the page whose purpose is to say when these places gather.
 *
 * ## Why this asserts a rule and not a number
 *
 * A pinned count would have passed on the day the bucket was 52, and would pass
 * again the next time a tradition's vocabulary is missing — it only ever objects
 * to *change*, and the defect here was a stable, silent, six-year-old-looking
 * wrong answer.
 *
 * So the assertion is the rule the bucket is supposed to mean: **a row is only
 * reported as recording nothing when its `Events` cell is empty, denies an
 * observance, or places one in the past.** Any other row landing there is a
 * vocabulary gap, and the failure message names the cell so the missing word is
 * visible rather than inferred.
 *
 * The per-tradition rates are checked too, loosely, as a second net. They are
 * loose on purpose: the Jain denominator is 3, so a strict ratio would be noise.
 * What the check refuses is the shape the defect actually had — one tradition
 * classified near-perfectly while another is classified at ten times the rate.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShrines } from '../shrineModel';
import { parseObservances, claimsUndatedObservance } from '../ursDates';
import { getFieldValue } from '../fieldAliasing';
import type { ShrineRow } from '../../../types/shrine';

const ROOT = join(__dirname, '..', '..', '..', '..');

type Bucket = 'dated' | 'undated' | 'none';

function classified(): { name: string; category: string; events: string; bucket: Bucket }[] {
  const rows = (
    JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'shrines-fallback.json'), 'utf8')) as {
      rows: ShrineRow[];
    }
  ).rows;
  return buildShrines(rows).map((s) => {
    const events = String(getFieldValue(s.raw, 'Events') ?? '').trim();
    const bucket: Bucket =
      parseObservances(events).length > 0
        ? 'dated'
        : claimsUndatedObservance(events)
          ? 'undated'
          : 'none';
    return {
      name: s.name,
      category: String(
        getFieldValue(s.raw, 'category') ?? getFieldValue(s.raw, 'Category') ?? '(blank)',
      ),
      events,
      bucket,
    };
  });
}

/** The three ways a cell can honestly mean "no observance to report". */
const DENIES = /\bno\b|\bnone\b|\bnot\b|\bnever\b|\bwithout\b|\bdiscontinued\b/i;
const PAST = /\bhistoric/i;
/**
 * Continuous practice is not an observance.
 *
 * "Community worship; langar-adjacent hospitality" says the place is in regular
 * use and names no gathering with a recurrence. The almanac's bucket is about
 * observances, so "no observance recorded" is the accurate reading — and the
 * distinction has to be stated, or the obvious repair is to add `worship` to
 * OBSERVANCE_RE, which would then read "regular worship discontinued" as a
 * claim that worship happens.
 */
const CONTINUOUS_PRACTICE = /\bworship\b|\bhospitality\b|\blangar\b|\bvisitation\b/i;

/** Clause-level, because a cell can carry a current observance and a past one:
 *  "Occasional pilgrimage; historically a Gur Mela" is currently observed. */
const everyClauseIsPastOrDenied = (events: string): boolean =>
  events
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .every((c) => DENIES.test(c) || PAST.test(c));

describe('the observance vocabulary', () => {
  it('partitions the whole archive exactly once', () => {
    const all = classified();
    const counts = { dated: 0, undated: 0, none: 0 };
    for (const r of all) counts[r.bucket] += 1;
    expect(
      counts.dated + counts.undated + counts.none,
      "the almanac's coverage block presents these as a partition, so they must sum to the row count",
    ).toBe(all.length);
    expect(counts.dated).toBeGreaterThan(0);
    expect(counts.undated).toBeGreaterThan(0);
  });

  it('reports "no observance recorded" only where the cell is empty, denies, or is historic', () => {
    const unexplained = classified()
      .filter((r) => r.bucket === 'none')
      .filter((r) => r.events !== '')
      .filter(
        (r) =>
          !DENIES.test(r.events) && !PAST.test(r.events) && !CONTINUOUS_PRACTICE.test(r.events),
      )
      .map((r) => `  ${r.name}\n      ${r.category}\n      Events: ${JSON.stringify(r.events)}`);

    expect(
      unexplained,
      unexplained.length === 0
        ? ''
        : `${unexplained.length} site(s) are published as recording no observance, and their own\n` +
            `cell names one:\n\n${unexplained.join('\n\n')}\n\n` +
            'This is a vocabulary gap in OBSERVANCE_RE, not a fact about the site. Add the term\n' +
            "— taking it verbatim from the cell, never inventing one (RULE 2) — and re-run. If the\n" +
            'cell instead names something that genuinely is not an observance, widen DENIES here\n' +
            'and say why in a comment.',
    ).toEqual([]);
  });

  it('does not classify one tradition far better than another', () => {
    /* The defect's shape: 6% of Muslim sites unclassified against 67% of Hindu
       and 100% of Jain. Loose because the Jain denominator is 3 — this refuses
       a gross disparity, not an uneven one. */
    /* Measured over rows the classifier could have got right: a cell reading
       "Not documented" is a coverage gap, and folding it in would make a
       tradition the archive simply knows less about look like a vocabulary
       failure. Six of the seven unclassified Nanakpanthi rows are exactly that,
       and the first version of this test reported them as a disparity. */
    const all = classified().filter(
      (r) =>
        r.events !== '' &&
        !DENIES.test(r.events) &&
        !CONTINUOUS_PRACTICE.test(r.events) &&
        !everyClauseIsPastOrDenied(r.events),
    );
    const byCategory = new Map<string, { none: number; total: number }>();
    for (const r of all) {
      const e = byCategory.get(r.category) ?? { none: 0, total: 0 };
      e.total += 1;
      if (r.bucket === 'none') e.none += 1;
      byCategory.set(r.category, e);
    }

    const overall = all.filter((r) => r.bucket === 'none').length / all.length;
    const offenders: string[] = [];
    for (const [category, { none, total }] of byCategory) {
      if (total < 10) continue; // too few to say anything
      const rate = none / total;
      /* A ratio alone is noise at these counts — one unexplained row in 23 trips
         a 2.5x threshold when the base rate is 1%. The defect this refuses was
         systematic: 24 Hindu rows, 9 Nanakpanthi, 9 Sikh, 3 Jain. So a pattern
         needs at least three, and a single row is reported by the rule above
         rather than here. */
      if (none >= 3 && rate > overall * 2.5) {
        offenders.push(
          `  ${category}: ${none} of ${total} (${Math.round(rate * 100)}%) against ${Math.round(overall * 100)}% archive-wide`,
        );
      }
    }
    expect(
      offenders,
      offenders.length === 0
        ? ''
        : `A tradition is being classified far worse than the archive as a whole:\n${offenders.join('\n')}\n\n` +
            "That is the shape of a vocabulary that knows one tradition's festivals and not\n" +
            "another's. Check the `Events` cells for those rows before adjusting this threshold.",
    ).toEqual([]);
  });

  it('holds the historic-observance rows out of both claims, deliberately', () => {
    /* Seven cells place an observance in the past — "Historically a Vaisakhi
       fair; not currently observed". They are in "no observance recorded",
       which is wrong: the archive records one. They are NOT in "observed, date
       unrecorded", which would be worse — four of the seven deny current
       practice in their own next clause.

       The honest destination is a bucket the almanac does not have. Pinned here
       so that adding one is a visible change rather than a silent drift, and so
       nobody "fixes" the vocabulary by promoting them. */
    const pastOnly = classified().filter(
      (r) => r.events !== '' && PAST.test(r.events) && everyClauseIsPastOrDenied(r.events),
    );
    expect(pastOnly.length).toBeGreaterThanOrEqual(6);
    expect(
      pastOnly.filter((r) => r.bucket === 'undated').map((r) => r.name),
      'a cell whose every clause is past or denied must not be reported as currently observed',
    ).toEqual([]);

    /* And the converse, so the guard is not simply suppressing every cell with
       the word in it. "Occasional pilgrimage; historically a Gur Mela" carries a
       current clause beside the past one and is correctly counted as observed —
       the guard is clause-level, not row-level. */
    const mixedCurrent = classified().find((r) =>
      /Occasional pilgrimage; historically a Gur Mela/i.test(r.events),
    );
    expect(mixedCurrent, 'the row this clause-level check is written against has changed')
      .toBeDefined();
    expect(mixedCurrent!.bucket).toBe('undated');
  });
});
