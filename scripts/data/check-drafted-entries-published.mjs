#!/usr/bin/env node
/**
 * check-drafted-entries-published.mjs — does the work in this repo reach a reader?
 *
 * ## The question, which is RULE 0's
 *
 * `entries/` holds drafted shrine entries and field survey transcriptions,
 * because RULE 0 says this repository is the only place work is retained. It
 * does not say the work is *published* — and nothing checked, so a finished
 * entry could sit here indefinitely while the site told readers it did not
 * exist. That is the exact failure RULE 0 was written about, one step later:
 * not work that was lost, but work that was kept and never arrived.
 *
 * ## What it found on 30 August 2026
 *
 * Two of four drafted entries — **Darbar Hazrat Shah Gohar Peer** (8,923
 * characters) and **Darbar Mian Qurban Ali Shah** (12,875) — are absent from
 * `data/shrines.json`, so they have no prerendered page and no sitemap entry.
 *
 * They are **not** absent from the archive. Both are live in the sheet right
 * now, at 5,268 and 5,374 characters. The local dataset is 169 rows against the
 * sheet's 171 and was built on 18 August, before the `isValidRow` fix that keeps
 * a named row with no coordinates — and neither of these two has coordinates.
 *
 * **The consequence is a false claim on a published page.** Both figures have
 * `/saint/` pages, prerendered, in the sitemap, in both languages. Because the
 * knowledge graph is built from the same stale dataset, both are marked
 * `lineageOnly`, and both pages therefore tell a reader: *"The archive holds no
 * entry of its own for this figure."* The archive holds five thousand characters
 * about each. On the one surface whose entire claim is provenance, that is the
 * worst kind of wrong — not a gap, a misstatement about the archive's own
 * holdings.
 *
 * ## Why this is a named script and not part of `verify`
 *
 * It is red until a person acts, and the action is sequenced: the ruling of
 * 30 August is **patches first, then `npm run data:build`**, because the live
 * sheet still carries three off-schema categories and four prose-in-status rows
 * that four pending CSV patches fix. Running `data:build` first would pull those
 * into the dataset and redden `data:validate` for both sessions.
 *
 * So this follows `data:check:location`: a check a person runs, which exits
 * non-zero until the thing it is waiting for has happened, and says what that is.
 *
 * Usage:
 *   npm run data:check:unpublished
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ENTRIES = join(ROOT, 'entries');
const SHRINES = join(ROOT, 'data', 'shrines.json');
const KG = join(ROOT, 'data', 'kg.json');
const MANIFEST = join(ROOT, 'pipeline', 'photo_manifest.tsv');

/**
 * Media already filed against a shrine, when the manifest is here to say so.
 *
 * `pipeline/photo_manifest.tsv` is **gitignored** — it sits beside `media/`, and
 * its ~200 filenames name the surveyor — so a fresh clone has none of this and
 * this function returns an empty map rather than failing. The defect is the
 * missing row either way; the manifest only sharpens what it costs.
 *
 * Measured 30 August 2026, with the file present: the two unpublished shrines
 * hold **23 files between them, every one `matched` and fetchable** — Shah Gohar
 * Peer 12 (9 images, 3 video) and Mian Qurban Ali Shah 11 (10 images, 1 video,
 * 365 MB). Against 54 entries with no working photograph, and against 18 video
 * rows in the whole archive, **four of them belong to these two**.
 */
function mediaByShrine() {
  if (!existsSync(MANIFEST)) return null;
  const lines = readFileSync(MANIFEST, 'utf8').split('\n').filter(Boolean);
  const header = lines[0].split('\t');
  const nameAt = header.indexOf('shrine_name');
  const mimeAt = header.indexOf('mime_type');
  if (nameAt < 0) return null;
  const counts = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    const name = (cells[nameAt] ?? '').trim();
    if (!name) continue;
    const entry = counts.get(name) ?? { files: 0, video: 0 };
    entry.files += 1;
    if ((cells[mimeAt] ?? '').startsWith('video')) entry.video += 1;
    counts.set(name, entry);
  }
  return counts;
}

/**
 * The subject of a drafted entry, taken from its `# ` heading rather than its
 * filename. The heading is the shrine's name as written — `entry_shah_gohar_peer.md`
 * opens `# Darbar Hazrat Shah Gohar Peer` — and matching on a filename would mean
 * guessing at how a slug was abbreviated.
 */
function subjectOf(markdown) {
  const heading = /^#\s+(.+)$/m.exec(markdown);
  return heading ? heading[1].trim() : null;
}

function main() {
  if (!existsSync(SHRINES)) {
    console.error('[unpublished] data/shrines.json not found. Run: npm run data:build');
    process.exit(1);
  }
  const rows = JSON.parse(readFileSync(SHRINES, 'utf8')).rows ?? [];
  const published = new Set(rows.map((row) => String(row.Name ?? '').trim()));

  /* Figures the site tells readers the archive holds no entry for. Read only to
     report the consequence — the defect is the missing row, and this is what it
     costs. */
  const lineageOnly = existsSync(KG)
    ? new Map(
        (JSON.parse(readFileSync(KG, 'utf8')).saints ?? [])
          .filter((saint) => saint.lineageOnly)
          .map((saint) => [saint.slug, saint.name]),
      )
    : new Map();

  const media = mediaByShrine();
  const drafts = existsSync(ENTRIES)
    ? readdirSync(ENTRIES).filter((file) => file.startsWith('entry_') && file.endsWith('.md'))
    : [];

  const unpublished = [];
  for (const file of drafts) {
    const markdown = readFileSync(join(ENTRIES, file), 'utf8');
    const subject = subjectOf(markdown);
    if (!subject) {
      console.warn(`[unpublished] ${file} has no "# " heading — cannot tell what it is about`);
      continue;
    }
    if (published.has(subject)) continue;
    /* The figure page that will be making the false claim, matched loosely on
       purpose: this is context for a person, not a join. */
    const key = subject.toLowerCase().replace(/[^a-z]/g, '');
    const claiming = [...lineageOnly.keys()].find((slug) => {
      const bare = slug.replace(/[^a-z]/g, '');
      return key.includes(bare) || bare.includes(key.slice(0, 12));
    });
    unpublished.push({ file, subject, chars: markdown.length, claiming, media: media?.get(subject) });
  }

  console.log(
    `[unpublished] ${drafts.length} drafted entr${drafts.length === 1 ? 'y' : 'ies'} · ` +
      `${rows.length} rows in data/shrines.json · ${unpublished.length} not published`,
  );

  if (unpublished.length === 0) {
    console.log('[unpublished] OK — every drafted entry reaches a reader.\n');
    return;
  }

  console.error('\nFAILED — this repository holds finished work no reader can see:\n');
  for (const item of unpublished) {
    console.error(`  ${item.subject}`);
    console.error(`    entries/${item.file} — ${item.chars.toLocaleString()} characters`);
    console.error('    no row in data/shrines.json, so no prerendered page and no sitemap entry');
    if (item.claiming) {
      console.error(
        `    and /saint/${item.claiming} tells readers "the archive holds no entry of its own"`,
      );
    }
    if (item.media) {
      /* Only when the manifest is present. A clone has no `pipeline/
         photo_manifest.tsv` — it is gitignored — and says nothing here rather
         than guessing at zero. */
      const video = item.media.video ? `, ${item.media.video} of them video` : '';
      console.error(
        `    and ${item.media.files} media file(s) filed against it${video}, which no reader reaches`,
      );
    }
    console.error('');
  }
  console.error(
    'Check the live sheet before assuming these are unwritten: as of 30 August 2026 both\n' +
      'were present in production and missing only from the local dataset, which predates\n' +
      'the isValidRow fix that keeps a named row with no coordinates.\n' +
      '\nThe remedy is `npm run data:build`, and it is sequenced — import the pending CSV\n' +
      'patches first (RULE 3), or data:build pulls the off-schema rows they fix into the\n' +
      'dataset and reddens data:validate. See docs/SESSION_RESUME.md.\n',
  );
  process.exit(1);
}

main();
