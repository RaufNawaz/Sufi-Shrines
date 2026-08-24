// @vitest-environment node
/**
 * The review queue holds everything, and holds it verbatim.
 *
 * `data/review/kg-review.csv` exists so the 235 machine-extracted proposals can
 * be reviewed at all. Two ways it could fail while looking finished, and neither
 * would raise anything:
 *
 * **It could be short.** A queue missing rows reads as a completed review. The
 * first version of the generator knew four of the six keys the conflict buckets
 * use to name their subject, so `nameVariantsSeen`, `newOrdersNeeded`,
 * `proseValuedSilsila`, `subjectMismatch` and `nameCollisions` silently matched
 * nothing — 33 findings filed as priority 3 "rubber stamp" while being exactly
 * the rows where a human's answer differs from the machine's. Four of those
 * buckets record the *absence* of a claim and so have no proposal row to flag at
 * all; they are their own rows now. `subjectMismatch` is the allo-mahar
 * misidentification — the case `docs/allo_mahar_resolution.md` was written about
 * — and it would have been outside the queue entirely.
 *
 * **A quote could be altered.** `verify-kg-proposals.mjs` checks every quote is a
 * byte-exact substring of the source it names. If the worksheet flattens
 * newlines to open tidily in Sheets, it disagrees with the gate that validates
 * it, and a reviewer is then judging a claim against a sentence nobody verified.
 * That is the Description-flattening failure of RULE 3, one directory over.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import { createHash } from 'node:crypto';

const ROOT = join(__dirname, '..', '..', '..', '..');
const readJson = (name: string) =>
  JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8')) as Record<string, unknown>;

const worksheet = Papa.parse<Record<string, string>>(
  readFileSync(join(ROOT, 'data', 'review', 'kg-review.csv'), 'utf8'),
  { header: true, skipEmptyLines: true },
);

const rows = worksheet.data;
const lineage = readJson('kg-lineage-proposals.json');
const orders = readJson('kg-order-proposals.json');
const dates = readJson('kg-saint-dates-proposals.json');

const proposalsOf = (doc: Record<string, unknown>) =>
  doc.proposals as Array<Record<string, unknown>>;

/** Mirrors the generator. The slug alone is not unique — Guru Nanak has a birth
 * proposal and a death proposal, and five saints have two order proposals for the
 * same parent — so the id carries a digest of the evidence. */
const evidenceKey = (quote: unknown) =>
  createHash('sha1')
    .update(typeof quote === 'string' ? quote : '')
    .digest('hex')
    .slice(0, 8);

describe('the review worksheet parses', () => {
  it('has no CSV errors', () => {
    expect(worksheet.errors).toEqual([]);
  });

  it('carries the columns a reviewer needs, and the two they fill in', () => {
    for (const column of ['id', 'kind', 'priority', 'claim', 'quote', 'source', 'notes']) {
      expect(Object.keys(rows[0]), `missing column: ${column}`).toContain(column);
    }
    expect(Object.keys(rows[0])).toContain('verdict');
    expect(Object.keys(rows[0])).toContain('reviewer_note');
  });

  it('gives every row a unique id, so a verdict survives regeneration', () => {
    const ids = rows.map((r) => r.id);
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect([...new Set(duplicated)], 'duplicate worksheet ids').toEqual([]);
  });
});

describe('every proposal is in the queue', () => {
  const ids = new Set(rows.map((r) => r.id));

  it('covers all three proposal files, row for row', () => {
    const total =
      proposalsOf(lineage).length + proposalsOf(orders).length + proposalsOf(dates).length;
    const proposalRows = rows.filter((r) => !r.kind.startsWith('finding/'));
    expect(proposalRows.length, 'the worksheet is short of the proposal files').toBe(total);
  });

  it('names every lineage proposal by subject, relation and object', () => {
    for (const p of proposalsOf(lineage)) {
      expect(ids, `lineage proposal missing: ${p.subjectSlug} → ${p.objectSlug}`).toContain(
        `lineage:${p.subjectSlug}:${p.relation}:${p.objectSlug}:${evidenceKey(p.quote)}`,
      );
    }
  });

  it('names every date proposal', () => {
    for (const p of proposalsOf(dates)) {
      expect(ids, `date proposal missing: ${p.saintSlug}`).toContain(
        `dates:${p.saintSlug}:${evidenceKey(p.quote)}`,
      );
    }
  });
});

describe('every conflict bucket reaches the queue', () => {
  /* The regression that motivated this file: a bucket whose slug key the
     generator does not know contributes nothing, and nothing says so. Each of
     these named findings must appear as a flag on some row, or as a row of its
     own where the finding is the absence of a proposal. */
  const BUCKETS = [
    'nameVariantsSeen',
    'explicitNonRelations',
    'contradictions',
    'disagreesWithExistingSeed',
    'newOrdersNeeded',
    'proseValuedSilsila',
    'disputedDates',
    'disagreesWithColumn',
    'subjectMismatch',
    'nameCollisions',
  ];

  const allFlags = new Set(rows.flatMap((r) => (r.flags ?? '').split(' ').filter(Boolean)));

  for (const bucket of BUCKETS) {
    it(`${bucket} is represented`, () => {
      const populated =
        (Array.isArray(lineage[bucket]) && (lineage[bucket] as unknown[]).length > 0) ||
        (Array.isArray(orders[bucket]) && (orders[bucket] as unknown[]).length > 0) ||
        (Array.isArray(dates[bucket]) && (dates[bucket] as unknown[]).length > 0);
      if (!populated) return; // Nothing in the source to represent.
      expect(
        allFlags,
        `${bucket} has findings in the proposal files but reaches no worksheet row — ` +
          'the generator probably does not know the key it names its subject with',
      ).toContain(bucket);
    });
  }

  it('puts every flagged row at the front of the queue', () => {
    for (const row of rows) {
      if ((row.flags ?? '').trim()) {
        expect(row.priority, `${row.id} is flagged but not priority 1`).toBe('1');
      }
    }
  });
});

describe('quotes are verbatim', () => {
  it('round-trips every quote through the CSV byte-for-byte', () => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const mismatched: string[] = [];

    for (const p of proposalsOf(lineage)) {
      const id = `lineage:${p.subjectSlug}:${p.relation}:${p.objectSlug}:${evidenceKey(p.quote)}`;
      const row = byId.get(id);
      if (row && row.quote !== (p.quote ?? '')) mismatched.push(id);
    }
    for (const p of proposalsOf(dates)) {
      const id = `dates:${p.saintSlug}:${evidenceKey(p.quote)}`;
      const row = byId.get(id);
      if (row && row.quote !== (p.quote ?? '')) mismatched.push(id);
    }

    expect(
      mismatched,
      'A quote was altered on its way into the worksheet. verify-kg-proposals.mjs checks ' +
        'each one is a byte-exact substring of its source, so an altered quote means the ' +
        'reviewer is judging a claim against a sentence nobody verified.',
    ).toEqual([]);
  });

  it('keeps a multi-line quote multi-line, rather than flattening it', () => {
    /* Papa quotes embedded newlines correctly. If someone "fixes" the CSV to
       open more tidily in Sheets by collapsing them, this fails — which is the
       point, because that is the Description-flattening trap of RULE 3. */
    const anyMultiline = [...proposalsOf(lineage), ...proposalsOf(dates)].some(
      (p) => typeof p.quote === 'string' && p.quote.includes('\n'),
    );
    if (!anyMultiline) return; // Nothing multi-line to preserve today.
    const preserved = rows.some((r) => (r.quote ?? '').includes('\n'));
    expect(preserved, 'every multi-line quote was flattened on the way in').toBe(true);
  });
});
