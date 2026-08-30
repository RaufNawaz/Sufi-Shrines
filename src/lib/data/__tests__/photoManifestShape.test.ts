// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `pipeline/photo_manifest.tsv` is the join between Google Drive and the archive,
 * and 44 of its 206 rows were one field too wide.
 *
 * The rows carried a stray empty field at index 2, shifting every value right by
 * one: the Drive ID landed in `drive_filename`, the filename in `mime_type`, and
 * `join_status` came back as a timestamp. Every one of the 44 was an
 * `in_drive_not_in_survey` row — a file sitting in Drive with no survey row to
 * attach it to.
 *
 * **Nothing errored, and the consequence was silence.** `download_media.py` reads
 * this with `csv.DictReader` and its first test is `upload_question not in kinds`,
 * which was `''` on all 44, so they were dropped by `continue` *before* reaching
 * the `skipped` list a person reads. 44 files — 25 JPEG, 12 PNG, 4 video, 3 PDF,
 * 448 MB — were invisible to the manifest's own tooling. `docs/manifest_report.md`
 * tells a reader to find them by `join_status = in_drive_not_in_survey`, which
 * worked by `grep` and failed through any parser.
 *
 * Repaired on 30 August 2026 by dropping the stray field, which is unambiguous:
 * the 162 well-formed rows put `upload_question` at index 2 from a closed
 * vocabulary and a numeric `seq` at index 3, and all 44 had an empty index 2, the
 * question value at index 3 and an empty index 4. The downloader now reports 56
 * unfetched files where it reported 12.
 *
 * There is no generator for this file — it was produced once, externally — so the
 * file is the only place the shape can be held.
 */
const ROOT = join(__dirname, '..', '..', '..', '..');
const PATH = join(ROOT, 'pipeline', 'photo_manifest.tsv');

/* The manifest is GITIGNORED — it sits beside `media/` in `.gitignore`, and its
   ~200 filenames name the surveyor who took the photographs. So it is present on
   the machine that runs the media pipeline and absent from a fresh clone, and a
   test that read it unconditionally would pass here and throw ENOENT in CI.
   `validate-description-structure.mjs` sets the precedent for this shape.

   Whether it SHOULD be tracked is a real question and Rauf's: CLAUDE.md's layout
   table puts manifests in `pipeline/` and RULE 0 says the repo is the only place
   work is retained, which argues for tracking it — against which it carries a
   colleague's name in every row. Recorded in docs/SESSION_RESUME.md rather than
   decided by whoever happened to touch the file. */
const present = existsSync(PATH);
const lines = present
  ? readFileSync(PATH, 'utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0)
  : [];
const header = present ? lines[0].split('\t') : [];
const rows = present ? lines.slice(1).map((l) => l.split('\t')) : [];

describe.skipIf(!present)('the photo manifest', () => {
  it('has rows', () => {
    // A floor: every assertion below filters, and a filter over nothing passes.
    expect(header).toHaveLength(10);
    expect(rows.length).toBeGreaterThan(200);
  });

  it('gives every row exactly the header’s field count', () => {
    const wrong = rows
      .map((f, i) => ({ line: i + 2, got: f.length }))
      .filter((r) => r.got !== header.length);
    expect(
      wrong,
      'a row wider or narrower than the header shifts every value after the gap, and ' +
        'csv.DictReader reports the shifted values without complaint',
    ).toEqual([]);
  });

  it('keeps join_status a closed vocabulary', () => {
    /* The second way to catch the same shift. When those 44 rows were wide, this
       column held ISO timestamps — so a value outside this set is the signature
       of a misalignment even if some future row happens to have the right width. */
    const statuses = new Set(rows.map((f) => f[header.indexOf('join_status')]));
    expect([...statuses].sort()).toEqual(['id_not_in_drive', 'in_drive_not_in_survey', 'matched']);
  });

  it('keeps upload_question a closed vocabulary, and every Drive id present', () => {
    const q = header.indexOf('upload_question');
    const id = header.indexOf('drive_id');
    const odd = [...new Set(rows.map((f) => f[q]))].filter(
      (v) => !['photo', 'book', 'video_audio'].includes(v),
    );
    expect(odd, 'an unknown upload_question means the columns moved').toEqual([]);
    // The Drive id is the only key that survives (HANDOVER §151). A blank one is
    // a row nothing can ever fetch.
    expect(rows.filter((f) => !f[id].trim())).toEqual([]);
  });
});
