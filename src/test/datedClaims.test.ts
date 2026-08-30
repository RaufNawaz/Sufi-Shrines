// @vitest-environment node
/**
 * No file may date a claim in the future (RULE 4 — encode invariants, don't
 * rely on intentions).
 *
 * ## The hazard this is for
 *
 * This archive's whole epistemic method is that **a measurement is a
 * measurement with a date on it**. `CLAUDE.md`'s standing findings carry dates,
 * `docs/HANDOVER.md` §9 entries are titled with them, and the lesson written
 * beside the one finding that went stale — 49 entries with no bibliography,
 * quoted as current for weeks after it stopped being true — is that an undated
 * or misdated number is worse than no number.
 *
 * On 30 August 2026 two sessions wrote **48 measurements dated 31 August
 * 2026**, across 23 files, on a day that had not happened. Every one was
 * retrospective — "Measured 31 August 2026", "Ruled 31 August 2026", "Added
 * 31 August 2026", "closed 31 August 2026" — so every one asserted that work
 * had been done on a date still in the future. `git log --all --since=
 * "2026-08-31 00:00"` returned zero commits; every commit that introduced the
 * string was itself stamped 2026-08-30, and 17:25 EDT is 21:25 UTC, so not even
 * a timezone rollover explains it. `docs/MEASUREMENT_FAILURES.md` — the
 * catalogue of about fifteen wrong measurements, written to stop exactly this
 * class of error — was wrong in its own dateline.
 *
 * **Nothing could have caught it.** An agent writing prose has no reliable
 * sense of the date and no reason to check one; the number looks right, reads
 * right, and is off by a day forever. The damage is quiet and compounds: every
 * future session computing "how stale is this finding?" gets the wrong answer,
 * and the miss lands hardest on the documents whose entire value is that their
 * numbers are dated.
 *
 * ## Why the check is one-directional
 *
 * It fails only on dates **later than today**, and that is the whole design.
 *
 * A wrong *past* date is undetectable from here — 12 August and 13 August are
 * both plausible and nothing in the repository distinguishes them. A date in
 * the future is different: it is not a judgement call, it is arithmetic, and no
 * retrospective claim can honestly carry one. So this catches the only half
 * that is decidable, and it can never go stale, never needs re-baselining, and
 * cannot produce a false positive as time passes — an allowed future date
 * simply stops being flagged once the day arrives.
 *
 * ## Why an allowlist rather than narrower matching
 *
 * The first design matched claim-shaped frames ("measured <date>", "as of
 * <date>") and was abandoned: the frames are open-ended, so it would have
 * missed most of the 48 while looking thorough. Matching *every* date and
 * naming the legitimate exceptions is the honest way round — the exceptions are
 * few, each is a sentence someone can go and check, and a new one costs a line.
 *
 * Thirteen legitimate future dates exist and are listed below. All are
 * quotations rather than claims: three projected ʿurs dates, a TLS certificate
 * expiry, a deliberate deadline in a decision document, and one test file whose
 * subject *is* future observance windows.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const repoRoot = join(__dirname, '..', '..');

/**
 * Where prose that dates a claim actually lives.
 *
 * Deliberately excludes `entries/`, `out/` and `data/export/`: those hold survey
 * timestamps and OCR'd source material, where a date is content rather than a
 * claim about work done.
 *
 * `data/` itself is **not** excluded, and that was a correction rather than the
 * first design. Ten of the 48 sat in `data/kg-seeds.json`, in the `_from`
 * strings that say which scanner produced a kin candidate and when — provenance
 * claims, in a data file, invisible to a scan that reasoned "data files hold
 * content, not claims". Only the top level is walked; the exports below it are
 * generated and carry the sheet's own dates.
 */
const SCANNED_DIRS = ['docs', 'src', 'scripts', 'pipeline', 'e2e', 'urdu-i18n'];

/**
 * Single directories walked one level deep, without recursing.
 *
 * `data/*.json` measures clean today. If a build output ever lands a future date
 * here the gate will say so, and that is wanted: a generated future date in this
 * archive is worth one look before it is waved through.
 */
const SCANNED_FLAT_DIRS = ['data'];

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-data',
  'coverage',
  'test-results',
  'storybook-static',
  'playwright-report',
  '__snapshots__',
]);

const SCANNED_EXT = /\.(md|ts|tsx|mjs|js|py|ya?ml|cff)$/;
const SCANNED_FLAT_EXT = /\.json$/;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "31 August 2026" — the form this archive writes dates in. */
const LONG_FORM = new RegExp(`\\b(3[01]|[12]\\d|[1-9]) (${MONTHS.join('|')}) (20\\d{2})\\b`, 'g');

/** "2026-08-31" — in filenames, patch names and test assertions. */
const ISO_FORM = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;

/**
 * Files whose *subject* is future dates, exempt wholesale.
 *
 * A file-and-date pair would need a new line every time one of these gains an
 * assertion, which is churn that teaches nobody anything. Keep this list at the
 * length it is: a file belongs here only when a future date is what it tests.
 */
export const DATE_FIXTURE_FILES = new Set([
  // Asserts the ʿurs window the almanac projects — every expectation in it is a
  // date that has not happened yet, by construction.
  'src/lib/data/__tests__/almanac.test.ts',
  // This file. It quotes the misdated string as the example of what it exists to
  // catch, so it trips itself on its own docstring. Exempting the implementation
  // of a check is a real blind spot and is worth naming as one — but the prose
  // here is *about* dates in the same way the almanac test is, and a docstring
  // that cannot show the bug it describes is worth less than the blind spot
  // costs.
  'src/test/datedClaims.test.ts',
]);

/**
 * Legitimate future dates, keyed `<path>::<date>`, each with the reason.
 *
 * The key is a file-and-date pair rather than a count, so a *second* wrong date
 * in an already-listed file still fails. Repeating an adjudicated date in the
 * same file does not.
 */
export const KNOWN_FUTURE = new Map<string, string>([
  [
    'docs/DECISION_oral_histories.md::31 December 2026',
    'A deliberate deadline: "if three consented recordings do not exist by 31 December 2026, adopt B". Forward-looking by design.',
  ],
  [
    'docs/HANDOVER.md::28 September 2026',
    'A TLS certificate expiry quoted from sultan-bahoo.com, which served an expired cert on one connection and one valid to this date on the next.',
  ],
  [
    'docs/HANDOVER.md::24 July 2027',
    'Quotes the almanac\'s projected ʿurs window, "Projected: 22–24 July 2027 (Hijri)", as the example of a Gregorian date wrongly labelled Hijri.',
  ],
  [
    'docs/TODO.md::24 July 2027',
    'The same projected ʿurs window for Data Ganj Bakhsh, quoted in the calendar-labelling note.',
  ],
  [
    'docs/TODO.md::6 September 2026',
    "Shams Ali Qalandar's projected ʿurs date, quoted as the case that carried no approximate flag.",
  ],
  [
    'docs/planning/SETTINGS_AND_READING_PREFERENCES.md::24 July 2027',
    'The same projected ʿurs window, quoted in the Calendar row of the preferences table.',
  ],
  [
    'src/lib/i18n/__tests__/observanceDates.test.ts::24 July 2027',
    'The projected window under test, quoted in the docstring and in the assertion for the Hijri-label bug.',
  ],
]);

type Hit = { file: string; line: number; date: string; iso: string; context: string };

/**
 * In markdown, a date inside backticks is a literal being **quoted**, not a
 * claim being made.
 *
 * This repository documents its own errors at length, so a note about a
 * misdated measurement has to be able to show the misdated string. Without this
 * the entry recording the 48 would itself have needed three allowlist lines,
 * and so would the next one.
 *
 * It is a narrow permission and worth knowing the edge of: none of the original
 * 48 was backticked — they were bare prose, one italicised with asterisks — so
 * this would have caught every one of them. What it cannot see is a future date
 * inside a backticked **filename**, which is how `docs/SESSION_RESUME.md` came
 * to point at a renamed file. Link integrity is `docsIndex.test.ts`'s job, not
 * this one's.
 */
const INLINE_CODE = /`[^`\n]*`/g;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (SCANNED_EXT.test(name)) out.push(full);
  }
}

function scannedFiles(): string[] {
  const out: string[] = [];
  for (const dir of SCANNED_DIRS) walk(join(repoRoot, dir), out);
  for (const dir of SCANNED_FLAT_DIRS) {
    const base = join(repoRoot, dir);
    let entries: string[];
    try {
      entries = readdirSync(base);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!SCANNED_FLAT_EXT.test(name)) continue;
      const full = join(base, name);
      try {
        if (statSync(full).isFile()) out.push(full);
      } catch {
        /* raced with a sync; not this test's business */
      }
    }
  }
  // Root-level prose: CLAUDE.md, README.md, CHANGELOG.md, CITATION.cff …
  for (const name of readdirSync(repoRoot)) {
    if (!SCANNED_EXT.test(name)) continue;
    const full = join(repoRoot, name);
    try {
      if (statSync(full).isFile()) out.push(full);
    } catch {
      /* raced with a sync; not this test's business */
    }
  }
  return out;
}

/** Midnight today, UTC. A date equal to today is not in the future. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function futureDatesIn(text: string, rel: string, today: Date): Hit[] {
  const hits: Hit[] = [];
  const isMarkdown = rel.endsWith('.md');
  const lines = text.split('\n');
  // The path itself carries a date in several files, and a future-dated
  // filename is the same defect as a future-dated sentence.
  const haystack: Array<[string, number, string]> = lines.map((l, i) => [
    isMarkdown ? l.replace(INLINE_CODE, '') : l,
    i + 1,
    l,
  ]);
  haystack.push([rel, 0, rel]);

  for (const [line, lineNo, original] of haystack) {
    for (const m of line.matchAll(LONG_FORM)) {
      const d = new Date(Date.UTC(Number(m[3]), MONTHS.indexOf(m[2]), Number(m[1])));
      if (d > today) {
        hits.push({
          file: rel,
          line: lineNo,
          date: m[0],
          iso: d.toISOString().slice(0, 10),
          context: original.trim().slice(0, 110),
        });
      }
    }
    for (const m of line.matchAll(ISO_FORM)) {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      if (d > today) {
        hits.push({
          file: rel,
          line: lineNo,
          date: m[0],
          iso: d.toISOString().slice(0, 10),
          context: original.trim().slice(0, 110),
        });
      }
    }
  }
  return hits;
}

function collect(): { flagged: Hit[]; matchedKeys: Set<string> } {
  const today = todayUtc();
  const flagged: Hit[] = [];
  const matchedKeys = new Set<string>();

  for (const full of scannedFiles()) {
    const rel = relative(repoRoot, full).split(sep).join('/');
    if (DATE_FIXTURE_FILES.has(rel)) continue;
    let text: string;
    try {
      text = readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    for (const hit of futureDatesIn(text, rel, today)) {
      const key = `${hit.file}::${hit.date}`;
      if (KNOWN_FUTURE.has(key)) {
        matchedKeys.add(key);
        continue;
      }
      flagged.push(hit);
    }
  }
  return { flagged, matchedKeys };
}

describe('dated claims', () => {
  it('dates no claim in the future', () => {
    const { flagged } = collect();
    const report = flagged
      .map((h) => `  ${h.file}:${h.line}  [${h.date}]\n      ${h.context}`)
      .join('\n');
    expect(
      flagged.length,
      flagged.length === 0
        ? ''
        : `${flagged.length} date(s) later than today (${todayUtc().toISOString().slice(0, 10)}):\n${report}\n\n` +
            'A retrospective claim cannot carry a date that has not happened. Either the\n' +
            'date is wrong — the usual cause, an agent guessing rather than reading a\n' +
            'clock — or it is a quotation, a deadline or a projection, in which case add\n' +
            'it to KNOWN_FUTURE in this file with the reason.',
    ).toBe(0);
  });

  it('lists no exception that has stopped being true', () => {
    const { matchedKeys } = collect();
    const today = todayUtc();
    const stale = [...KNOWN_FUTURE.keys()].filter((key) => {
      if (matchedKeys.has(key)) return false;
      // A date that has simply arrived is not a stale entry to chase; it stops
      // being flagged on its own, and the line can go whenever someone is
      // nearby. Only entries whose *text* is gone are reported.
      const date = key.slice(key.indexOf('::') + 2);
      const long = date.match(
        new RegExp(`^(3[01]|[12]\\d|[1-9]) (${MONTHS.join('|')}) (20\\d{2})$`),
      );
      const parsed = long
        ? new Date(Date.UTC(Number(long[3]), MONTHS.indexOf(long[2]), Number(long[1])))
        : new Date(`${date}T00:00:00Z`);
      return parsed > today;
    });
    expect(
      stale,
      stale.length === 0
        ? ''
        : `KNOWN_FUTURE names ${stale.length} exception(s) that no longer appear in the file they\n` +
            'name. The date was corrected or the text removed — delete the line, so the list\n' +
            'stays a set of claims someone can go and check:\n' +
            stale.map((k) => `  ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('scans the prose directories, not the data ones', () => {
    // Guards the instrument rather than the archive: a scan that silently
    // stopped finding files would pass the assertions above for the wrong
    // reason, which is this repository's most-repeated failure.
    const files = scannedFiles().map((f) => relative(repoRoot, f).split(sep).join('/'));
    expect(files.length).toBeGreaterThan(400);
    expect(files).toContain('CLAUDE.md');
    expect(files).toContain('docs/SESSION_RESUME.md');
    expect(files).toContain('src/lib/i18n/uiStrings.ts');
    // `data/` is walked one level deep and no further: the seeds carry `_from`
    // provenance claims, the exports carry the sheet's own dates.
    expect(files).toContain('data/kg-seeds.json');
    expect(files.filter((f) => f.startsWith('data/export/'))).toEqual([]);
    expect(files.filter((f) => f.startsWith('entries/'))).toEqual([]);
  });
});
