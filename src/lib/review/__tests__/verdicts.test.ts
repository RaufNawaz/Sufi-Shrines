// @vitest-environment node
/**
 * A verdict is a claim about a claim, and it has to survive the trip.
 *
 * The review desk's whole output is a CSV a human imports (RULE 3 — nothing here
 * writes the sheet or the proposals). So two things matter: the file is
 * well-formed for the data this archive actually holds, and a verdict cannot
 * silently attach itself to evidence it was not recorded against.
 *
 * The staleness rule is the load-bearing one. A verdict is stored with the digest
 * of the quote it judged. If a later extraction pass changes that quote, carrying
 * the old verdict forward would move an *unreviewed* claim into the reviewed
 * pile — the exact failure this desk exists to reduce, committed by the tooling
 * built to reduce it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isStale, verdictsToCsv, VERDICT_CSV_COLUMNS, type VerdictRow } from '../verdicts';

describe('staleness', () => {
  it('holds a verdict recorded against the same evidence', () => {
    expect(isStale({ verdict: 'confirm', evidence: 'abc12345' }, 'abc12345')).toBe(false);
  });

  it('drops a verdict once its evidence changes', () => {
    expect(isStale({ verdict: 'confirm', evidence: 'abc12345' }, 'def67890')).toBe(true);
  });

  it('treats a verdict with no recorded digest as current, not stale', () => {
    /* Sessions stored before the digest existed. Discarding them would lose a
       reviewer's work over a field they never had; keeping them is the lesser
       harm, and the CSV carries the digest for whoever applies it. */
    expect(isStale({ verdict: 'reject', evidence: '' }, 'abc12345')).toBe(false);
  });

  it('has nothing to say about a claim with no verdict', () => {
    expect(isStale(undefined, 'abc12345')).toBe(false);
  });
});

describe('the CSV a human imports', () => {
  const row: VerdictRow = {
    id: 'disciple_of:saint:a:saint:b',
    kind: 'disciple_of',
    claim: 'A is recorded as a disciple of B',
    quote: 'His own spiritual guide was B, who linked him to the "sober" Sufism of Baghdad',
    source: 'data/shrines.csv#a',
    evidence: 'abc12345',
    verdict: 'confirm',
    note: 'Supports the link, but not the date',
  };

  it('writes the worksheet’s own columns, in its order', () => {
    expect(verdictsToCsv([row]).split('\n')[0]).toBe(VERDICT_CSV_COLUMNS.join(','));
  });

  it('quotes every field and doubles an embedded quote', () => {
    /* Not optional: a citation contains commas, and the quotes in this archive
       contain ASCII double quotes. An unquoted field turns one row into two and
       the import lands silently wrong. */
    const csv = verdictsToCsv([row]);
    const line = csv.split('\n')[1];
    expect(line.startsWith('"')).toBe(true);
    expect(line).toContain('""sober""');
    expect(csv.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('survives a note containing a newline', () => {
    /* A reviewer will paste one. Inside quotes a newline is legal CSV, so the
       line count is what proves it did not break the file: header, a record
       spanning two physical lines, and the trailing newline. */
    const csv = verdictsToCsv([{ ...row, note: 'first line\nsecond line' }]);
    expect(csv).toContain('first line\nsecond line');
    expect(csv.split('\n')).toHaveLength(4);
  });

  it('ends with a newline', () => {
    expect(verdictsToCsv([row]).endsWith('\n')).toBe(true);
  });

  it('writes a header and nothing else for an empty set', () => {
    expect(verdictsToCsv([])).toBe(`${VERDICT_CSV_COLUMNS.join(',')}\n`);
  });
});

describe('the queue this desk reviews', () => {
  const ROOT = join(__dirname, '..', '..', '..', '..');
  const queue = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-review-queue.json'), 'utf8'));
  const stats = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-stats.json'), 'utf8'));
  const items: { id: string; kind: string; evidence: string; quote?: string }[] = queue.items;

  it('is exactly the unreviewed claims /about publishes', () => {
    /* The desk and the About page must be counting the same debt. If these ever
       disagree, one of the two is lying about the archive's state. */
    const byKind = (kind: string) => items.filter((i) => i.kind === kind).length;
    expect(byKind('biography')).toBe(stats.biographiesMachineRead);
    expect(byKind('disciple_of') + byKind('successor_of')).toBe(stats.lineageLinksUnreviewed);
    expect(byKind('belongs_to_order')).toBe(stats.orderMembershipsUnreviewed);
    expect(items.length).toBe(
      stats.biographiesMachineRead +
        stats.lineageLinksUnreviewed +
        stats.orderMembershipsUnreviewed,
    );
  });

  it('gives every item a stable id and an evidence digest', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) expect(item.evidence, item.id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('carries the quote wherever the extraction captured one', () => {
    /* Not all of them: a biography proposal is a set of values rather than a
       sentence, and 94 of the 218 are those. What matters is that the
       *relations* mostly come with their evidence — a reviewer judging a lineage
       link without the sentence it came from is guessing. */
    const relations = items.filter((i) => i.kind !== 'biography');
    expect(relations.filter((i) => i.quote).length).toBeGreaterThan(relations.length / 2);
  });
});
