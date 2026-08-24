/**
 * A reviewer's verdicts, held in their own browser.
 *
 * The review desk (docs/planning/REVIEW_DESK_2026-08-24.md) has no server and no
 * account, and it should not have either: the archive is a static site reading a
 * published CSV, and the *output* of a review session is a CSV a human imports.
 * What is stored here is only the half-finished session — so a reviewer can
 * close a laptop and come back, which is the only persistence a volunteer
 * actually needs.
 *
 * Storage is deliberately keyed by the claim's evidence digest as well as its id.
 * A verdict recorded against a quote that has since changed is not a verdict on
 * the new quote, and silently carrying it forward would be this tooling putting
 * an unreviewed claim into the reviewed pile.
 */

export type VerdictKind = 'confirm' | 'reject' | 'unsure';

export interface Verdict {
  verdict: VerdictKind;
  /** The reviewer's own words. Optional, and the most valuable field here when
   *  it is filled: "the quote supports the link but not the date". */
  note?: string;
  /** The digest of the evidence this verdict was recorded against. */
  evidence: string;
}

export type VerdictMap = Record<string, Verdict>;

const STORAGE_KEY = 'shrines_review_verdicts';

export function loadVerdicts(): VerdictMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    /* Validated on the way in rather than trusted: this is a value a browser
       kept across an unknown number of releases, and a malformed one should
       cost a reviewer their session, not the page. */
    const out: VerdictMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<Verdict>;
      if (v.verdict !== 'confirm' && v.verdict !== 'reject' && v.verdict !== 'unsure') continue;
      out[id] = {
        verdict: v.verdict,
        evidence: typeof v.evidence === 'string' ? v.evidence : '',
        ...(typeof v.note === 'string' && v.note ? { note: v.note } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveVerdicts(verdicts: VerdictMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(verdicts));
  } catch {
    // Private browsing, or a full quota. The session stays in memory.
  }
}

/** A verdict is stale when the evidence it was recorded against has changed. */
export function isStale(verdict: Verdict | undefined, evidence: string): boolean {
  return Boolean(verdict && verdict.evidence && verdict.evidence !== evidence);
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

/**
 * The worksheet's own columns, in its own order.
 *
 * Matching `scripts/data/build-review-worksheet.mjs` is the whole point: the
 * file this produces has to drop into the flow that already exists rather than
 * start a second one. Agents do not write the sheet or the proposals (RULE 3) —
 * a human takes this file.
 */
export const VERDICT_CSV_COLUMNS = [
  'id',
  'kind',
  'claim',
  'quote',
  'source',
  'evidence',
  'verdict',
  'reviewer_note',
] as const;

/** RFC 4180: quote every field, double an embedded quote. Not optional here —
 *  a citation contains commas, and a reviewer note can contain anything. */
function csvCell(value: string): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export interface VerdictRow {
  id: string;
  kind: string;
  claim: string;
  quote?: string;
  source?: string;
  evidence: string;
  verdict: VerdictKind;
  note?: string;
}

export function verdictsToCsv(rows: readonly VerdictRow[]): string {
  const lines = [VERDICT_CSV_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.kind,
        row.claim,
        row.quote ?? '',
        row.source ?? '',
        row.evidence,
        row.verdict,
        row.note ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  /* Trailing newline: a POSIX text file ends with one, and a CSV that does not
     makes `wc -l` disagree with the row count for the person checking. */
  return lines.join('\n') + '\n';
}
