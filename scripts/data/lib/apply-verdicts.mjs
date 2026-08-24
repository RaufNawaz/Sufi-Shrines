import { createHash } from 'node:crypto';

/**
 * Applying a reviewer's verdicts to the proposal files.
 *
 * The review desk (`/review`) ends in a downloaded CSV, and until this existed
 * that was where a review session stopped: the verdict was recorded and the
 * graph still said `unreviewed`. This is the other half — phase 3 of
 * docs/planning/REVIEW_DESK_2026-08-24.md.
 *
 * Pure on purpose. The CLI does the file I/O; everything that decides anything
 * lives here and is tested directly, because the thing being edited is
 * hand-curated data and a bug in it is a wrong claim in a provenance archive.
 *
 * **Three rules, and they are the reason to read this file:**
 *
 * 1. **A verdict may only ever narrow what the graph asserts.** `confirm` sets a
 *    flag. `reject` moves the proposal into the file's existing `rejected` array.
 *    Neither path can create a claim, change a quote, or alter a date — there is
 *    no code here that writes a value into a proposal's fields.
 * 2. **All or nothing.** If any row fails to match, *nothing* is written. A
 *    stale verdict file half-applied is worse than one refused: the operator
 *    would have to work out which half landed.
 * 3. **The digest is checked, not trusted.** A verdict carries the digest of the
 *    quote it judged. If the proposal's quote has changed since, the verdict is
 *    a judgement about text that no longer exists and applying it would move an
 *    *unreviewed* claim into the reviewed pile — the exact failure the desk
 *    exists to reduce.
 */

/** Same digest the desk and the worksheet use: first 8 hex of sha1. */
export function evidenceDigest(text) {
  return text ? createHash('sha1').update(text).digest('hex').slice(0, 8) : '';
}

/** The digest for a biography proposal, whose evidence is its *values* rather
 *  than a sentence. Must match build-kg.mjs's queue builder exactly. */
export function biographyDigest(slug, born, died) {
  return evidenceDigest(`${slug}|${born ?? ''}|${died ?? ''}`);
}

/**
 * RFC 4180, enough of it.
 *
 * Written rather than depended on because the scripts have no runtime deps and
 * this file is 30 lines. It handles the two things this archive's data
 * guarantees will appear: commas inside quoted fields (every citation) and
 * newlines inside quoted fields (a reviewer's note).
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const src = text.replace(/\r\n/g, '\n');

  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  /* A trailing newline leaves an empty field, not an empty row — only push the
     last row when something was actually read. */
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** CSV text → objects keyed by the header row. */
export function readVerdictCsv(text) {
  const rows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ''));
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const row = {};
    header.forEach((key, index) => {
      row[key] = cells[index] ?? '';
    });
    return row;
  });
}

const LINEAGE_ID = /^(disciple_of|successor_of):saint:(.+):saint:(.+)$/;
const ORDER_ID = /^belongs_to_order:saint:(.+):order:(.+)$/;
const BIOGRAPHY_ID = /^biography:(.+)$/;

/**
 * Find the proposal a verdict row is about.
 *
 * Ids are reconstructed rather than stored on the proposals, because the id is
 * derived from the slugs in build-kg.mjs and a second copy of that derivation is
 * a second thing to keep in step.
 */
function locate(id, docs) {
  let match = LINEAGE_ID.exec(id);
  if (match) {
    const [, relation, subjectSlug, objectSlug] = match;
    const index = (docs.lineage.proposals ?? []).findIndex(
      (p) => p.relation === relation && p.subjectSlug === subjectSlug && p.objectSlug === objectSlug,
    );
    return index === -1 ? null : { doc: 'lineage', index, kind: 'relation' };
  }
  match = ORDER_ID.exec(id);
  if (match) {
    const [, saintSlug, orderSlug] = match;
    const index = (docs.orders.proposals ?? []).findIndex(
      (p) =>
        p.saintSlug === saintSlug &&
        [p.parentOrder, ...(p.parentOrders ?? [])].filter(Boolean).includes(orderSlug),
    );
    return index === -1 ? null : { doc: 'orders', index, kind: 'relation' };
  }
  match = BIOGRAPHY_ID.exec(id);
  if (match) {
    const index = (docs.dates.proposals ?? []).findIndex((p) => p.saintSlug === match[1]);
    return index === -1 ? null : { doc: 'dates', index, kind: 'biography' };
  }
  return null;
}

/**
 * Apply verdict rows to the three proposal documents.
 *
 * Returns the new documents and a report. When `errors` is non-empty the
 * documents come back **unchanged** — the caller must write nothing.
 */
export function applyVerdicts(rows, documents) {
  /* Deep-cloned so a caller cannot end up with half-mutated inputs when the run
     is refused. structuredClone is in Node 17+; these files are ~1 MB. */
  const docs = structuredClone(documents);
  const errors = [];
  const plan = [];

  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    const verdict = String(row.verdict ?? '').trim();
    if (!id) continue;
    if (!['confirm', 'reject', 'unsure'].includes(verdict)) {
      errors.push(`${id}: unknown verdict "${verdict}"`);
      continue;
    }
    const found = locate(id, docs);
    if (!found) {
      errors.push(`${id}: no matching proposal — the file may predate a rebuild`);
      continue;
    }
    const proposal = docs[found.doc].proposals[found.index];
    const expected =
      found.kind === 'biography'
        ? biographyDigest(proposal.saintSlug, proposal.born, proposal.died)
        : evidenceDigest(proposal.quote ?? '');
    const supplied = String(row.evidence ?? '').trim();
    if (supplied && expected && supplied !== expected) {
      errors.push(
        `${id}: evidence digest ${supplied} does not match the proposal's ${expected} — ` +
          'the quote changed after this verdict was recorded',
      );
      continue;
    }
    plan.push({ id, verdict, found, note: String(row.reviewer_note ?? '').trim() });
  }

  if (errors.length > 0) return { documents, applied: 0, rejected: 0, noted: 0, errors };

  let applied = 0;
  let rejected = 0;
  let noted = 0;

  /* Rejections are applied last and in descending index order: they splice the
     proposals array, and any index resolved before that splice would shift. */
  for (const item of plan.filter((p) => p.verdict !== 'reject')) {
    const proposal = docs[item.found.doc].proposals[item.found.index];
    if (item.verdict === 'confirm') {
      proposal.reviewed = true;
      if (item.note) proposal.reviewerNote = item.note;
      applied += 1;
    } else {
      /* `unsure` changes nothing about the claim — it is still unreviewed, which
         is the truth. The note is the whole value of the verdict: "the quote
         supports the link but not the date" is the next reviewer's head start. */
      if (item.note) {
        proposal.reviewerNote = item.note;
        noted += 1;
      }
    }
  }

  const rejections = plan
    .filter((p) => p.verdict === 'reject')
    .sort((a, b) => b.found.index - a.found.index);
  for (const item of rejections) {
    const doc = docs[item.found.doc];
    const [proposal] = doc.proposals.splice(item.found.index, 1);
    doc.rejected ??= [];
    /* Recorded, not deleted. "An editor looked at this and said no" is itself
       provenance, and the extractor should not propose it again next run. */
    doc.rejected.push({
      ...proposal,
      rejectedByReview: true,
      ...(item.note ? { rejectedReason: item.note } : {}),
    });
    rejected += 1;
  }

  return { documents: docs, applied, rejected, noted, errors };
}
