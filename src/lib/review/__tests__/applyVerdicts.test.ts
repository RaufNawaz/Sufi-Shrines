// @vitest-environment node
/**
 * Landing a reviewer's verdicts on the proposal files.
 *
 * This is the half of the review loop that changes something, so it is the half
 * that can do damage: the files it edits are hand-curated data in an archive
 * whose distinguishing claim is provenance. The three rules from
 * `scripts/data/lib/apply-verdicts.mjs` are asserted here against the **real**
 * proposal documents and the **real** review queue, because a fixture would
 * agree with whatever shape I imagined rather than the shape the pipeline emits.
 *
 * 1. A verdict may only ever *narrow* what the graph asserts — no path here
 *    writes a value into a proposal's fields.
 * 2. All or nothing. A stale file half-applied is worse than one refused.
 * 3. The digest is checked, not trusted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyVerdicts,
  evidenceDigest,
  parseCsv,
  readVerdictCsv,
} from '../../../../scripts/data/lib/apply-verdicts.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (name: string) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));

const documents = () => ({
  lineage: read('kg-lineage-proposals.json'),
  orders: read('kg-order-proposals.json'),
  dates: read('kg-saint-dates-proposals.json'),
});

const queue: { items: { id: string; kind: string; evidence: string }[] } =
  read('kg-review-queue.json');
const pick = (kind: string) => {
  const item = queue.items.find((i) => i.kind === kind);
  expect(item, `no ${kind} item in the queue`).toBeTruthy();
  return item!;
};

const row = (item: { id: string; kind: string; evidence: string }, verdict: string, note = '') => ({
  id: item.id,
  kind: item.kind,
  verdict,
  evidence: item.evidence,
  reviewer_note: note,
});

describe('a confirmed claim', () => {
  it('is marked reviewed, and nothing else about it changes', () => {
    const item = pick('disciple_of');
    const before = documents();
    const result = applyVerdicts([row(item, 'confirm')], before);
    expect(result.errors).toEqual([]);
    expect(result.applied).toBe(1);

    const [, , subjectSlug, objectSlug] = /^(\w+):saint:(.+):saint:(.+)$/.exec(item.id)!;
    const find = (docs: ReturnType<typeof documents>) =>
      (docs.lineage.proposals as Record<string, unknown>[]).find(
        (p) => p.subjectSlug === subjectSlug && p.objectSlug === objectSlug,
      )!;
    const after = find(result.documents as ReturnType<typeof documents>);
    expect(after.reviewed).toBe(true);

    /* Rule 1, asserted rather than trusted: every other field identical. A
       reviewer's judgement about a claim must not be able to edit the claim. */
    const original = find(before);
    for (const key of Object.keys(original)) {
      if (key === 'reviewed' || key === 'reviewerNote') continue;
      expect(JSON.stringify(after[key]), key).toBe(JSON.stringify(original[key]));
    }
  });

  it('lands on an order membership and on a biography too', () => {
    const order = pick('belongs_to_order');
    const bio = pick('biography');
    const result = applyVerdicts([row(order, 'confirm'), row(bio, 'confirm')], documents());
    expect(result.errors).toEqual([]);
    expect(result.applied).toBe(2);

    const docs = result.documents as ReturnType<typeof documents>;
    const orderSlug = /^belongs_to_order:saint:(.+):order:(.+)$/.exec(order.id)![1];
    const bioSlug = /^biography:(.+)$/.exec(bio.id)![1];
    expect(
      (docs.orders.proposals as Record<string, unknown>[]).find((p) => p.saintSlug === orderSlug)
        ?.reviewed,
    ).toBe(true);
    expect(
      (docs.dates.proposals as Record<string, unknown>[]).find((p) => p.saintSlug === bioSlug)
        ?.reviewed,
    ).toBe(true);
  });
});

describe('a rejected claim', () => {
  it('moves into the file’s rejected list, with the reason, and leaves the proposals shorter', () => {
    const item = pick('successor_of');
    const before = documents();
    const beforeCount = before.lineage.proposals.length;
    const beforeRejected = (before.lineage.rejected ?? []).length;

    const result = applyVerdicts([row(item, 'reject', 'the quote names a different man')], before);
    expect(result.errors).toEqual([]);
    expect(result.rejected).toBe(1);

    const docs = result.documents as ReturnType<typeof documents>;
    expect(docs.lineage.proposals).toHaveLength(beforeCount - 1);
    expect(docs.lineage.rejected).toHaveLength(beforeRejected + 1);
    const recorded = docs.lineage.rejected[beforeRejected + 0] as Record<string, unknown>;
    /* Recorded, not deleted: "an editor looked at this and said no" is itself
       provenance, and the extractor should not propose it again next run. */
    expect(recorded.rejectedByReview).toBe(true);
    expect(recorded.rejectedReason).toBe('the quote names a different man');
  });

  it('applies several rejections without losing track of the rows', () => {
    /* Rejections splice the array, so any index resolved before the splice
       shifts. Three at once is what catches an off-by-one that one at a time
       never would. */
    const items = queue.items.filter((i) => i.kind === 'disciple_of').slice(0, 3);
    expect(items).toHaveLength(3);
    const before = documents();
    const beforeCount = before.lineage.proposals.length;
    const result = applyVerdicts(
      items.map((i) => row(i, 'reject', 'no')),
      before,
    );
    expect(result.errors).toEqual([]);
    expect(result.rejected).toBe(3);
    const docs = result.documents as ReturnType<typeof documents>;
    expect(docs.lineage.proposals).toHaveLength(beforeCount - 3);
    /* And the right three: none of the rejected ids is still a proposal. */
    for (const item of items) {
      const [, relation, subjectSlug, objectSlug] = /^(\w+):saint:(.+):saint:(.+)$/.exec(item.id)!;
      expect(
        (docs.lineage.proposals as Record<string, unknown>[]).some(
          (p) =>
            p.relation === relation && p.subjectSlug === subjectSlug && p.objectSlug === objectSlug,
        ),
      ).toBe(false);
    }
  });
});

describe('“needs work”', () => {
  it('keeps the claim unreviewed and keeps the note', () => {
    /* The truth is that it is still unreviewed. The note is the whole value of
       the verdict — the next reviewer's head start. */
    const item = pick('disciple_of');
    const result = applyVerdicts(
      [row(item, 'unsure', 'supports the link but not the date')],
      documents(),
    );
    expect(result.errors).toEqual([]);
    expect(result.applied).toBe(0);
    expect(result.noted).toBe(1);
    const [, , subjectSlug, objectSlug] = /^(\w+):saint:(.+):saint:(.+)$/.exec(item.id)!;
    const proposal = (
      (result.documents as ReturnType<typeof documents>).lineage.proposals as Record<
        string,
        unknown
      >[]
    ).find((p) => p.subjectSlug === subjectSlug && p.objectSlug === objectSlug)!;
    expect(proposal.reviewed).toBeUndefined();
    expect(proposal.reviewerNote).toBe('supports the link but not the date');
  });
});

describe('it refuses rather than half-applying', () => {
  it('rejects the whole file when one digest does not match', () => {
    const good = pick('disciple_of');
    const stale = { ...pick('belongs_to_order'), evidence: 'deadbeef' };
    const before = documents();
    const result = applyVerdicts([row(good, 'confirm'), row(stale, 'confirm')], before);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('does not match');
    expect(result.applied).toBe(0);
    /* And the good row did not land either — that is the point. */
    expect(result.documents).toBe(before);
  });

  it('rejects an id no proposal answers to', () => {
    const result = applyVerdicts(
      [{ id: 'disciple_of:saint:nobody:saint:nobody-else', verdict: 'confirm', evidence: '' }],
      documents(),
    );
    expect(result.errors[0]).toContain('no matching proposal');
    expect(result.applied).toBe(0);
  });

  it('rejects a verdict word it does not know', () => {
    const result = applyVerdicts([row(pick('disciple_of'), 'maybe')], documents());
    expect(result.errors[0]).toContain('unknown verdict');
  });

  it('never mutates the documents it was handed', () => {
    /* The caller writes files from the returned documents. If the inputs were
       mutated in place, a refused run would still have changed them in memory
       and a caller that ignored `errors` would write the damage. */
    const before = documents();
    const snapshot = JSON.stringify(before);
    applyVerdicts([row(pick('disciple_of'), 'confirm')], before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('the CSV the desk writes, read back', () => {
  it('round-trips a citation with commas and a note with a newline', () => {
    const csv =
      'id,kind,claim,quote,source,evidence,verdict,reviewer_note\n' +
      '"a:b","disciple_of","A of B","He said ""hi"", then left","data/shrines.csv#x","abc12345","confirm","first\nsecond"\n';
    const rows = readVerdictCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].quote).toBe('He said "hi", then left');
    expect(rows[0].reviewer_note).toBe('first\nsecond');
    expect(rows[0].verdict).toBe('confirm');
  });

  it('parses CRLF the way a spreadsheet writes it', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('agrees with the desk on what a digest is', () => {
    /* One digest function, three places: the queue builder, the desk, and this
       applier. If they ever disagree every verdict is refused as stale. */
    expect(evidenceDigest('hello')).toBe('aaf4c61d');
    expect(evidenceDigest('')).toBe('');
  });
});
