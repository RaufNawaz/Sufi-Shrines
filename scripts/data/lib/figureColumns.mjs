/**
 * figureColumns.mjs — one reading of the two columns that could define a
 * figure's identity, shared by everything that reports on them.
 *
 * **Why this is a library and not two copies.** It was two copies, and they
 * disagreed. `measure-figure-identity-columns.mjs` was written on 28 August 2026
 * and reported "49 rows move, 46 of 132 figure slugs vanish", which
 * `docs/planning/DECISION_figure_identity_column.md` recorded. Later the same
 * day, commit 3c6fb1a moved `"Guru Nanak and Bhai Mardana"` out of
 * `saintMergeVariants` and into `saintCompositeFigures`, because that merge was
 * the reason Bhai Mardana appeared nowhere in the graph. The measurement script
 * knew about `saintMergeVariants` and nothing about composites, so from that
 * commit on it silently began reporting **50 rows and 47 slugs** — and three of
 * the slugs it named were not nodes in the graph at all:
 *
 *     guru-nanak-and-bhai-mardana
 *     guru-arjan-dev-and-guru-hargobind
 *     guru-nanak-dev-ji-associated-with-bhai-lalo
 *
 * Each is a whole composite cell slugified as if it were one person's name. No
 * such page has ever been published, so "47 published URLs would retire" was
 * counting three URLs that do not exist, in a document whose entire purpose is
 * to price a URL migration.
 *
 * Nobody wrote a wrong number here. A correct instrument was invalidated by a
 * correct data fix four commits later, which is the failure this repository has
 * now recorded five times (HANDOVER §9, `feedback_measure_before_recording`).
 * The fix that generalises is not a more careful reader: it is that the two
 * things that report these counts cannot hold two different definitions, because
 * there is only one definition and it is here.
 *
 * The honest figures, from this module, on 28 August 2026: **47 rows would move
 * to a different figure slug, retiring 44 of the current 132 figure slugs.**
 */
import { slugify } from './slugs.mjs';

/**
 * Split a `principal_figure` cell on `;`, but only outside parentheses.
 *
 * `darbar-wasif-ali-wasif` reads
 * `Hazrat Wasif Ali Wasif Awan (born Muhammad Wasif Awan; "Wasif" was his pen
 * name/takhallus)` — a semicolon inside a parenthetical. A naive split yields
 * `hazrat-wasif-ali-wasif-awan-born-muhammad-wasif-awan` and
 * `wasif-was-his-pen-nametakhallus`, two nodes that are not people. The first,
 * throwaway version of the measurement probe did exactly that, and that is where
 * the brief's original off-by-one came from.
 */
export function splitFigureCell(cell) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of cell) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Read both columns for every row, and the cross-row consequences of switching.
 *
 * `rows` is `data/shrines.json`'s rows; `seeds` is `data/kg-seeds.json`.
 *
 * The legacy side goes through `saintCompositeFigures` first and
 * `saintMergeVariants` second — the same order and the same two steps
 * `build-kg.mjs` applies, so "the slug this row has today" means the slug the
 * published site actually serves rather than a plausible reconstruction of it.
 */
export function analyseFigureColumns(rows, seeds) {
  const mergeVariants = seeds.saintMergeVariants ?? {};
  const composites = seeds.saintCompositeFigures ?? {};
  const overrides = seeds.saintFigureByShrine ?? {};
  const descriptiveCells = seeds.saintDescriptiveCells ?? {};
  /* Same order build-kg.mjs applies: a descriptive cell resolves before a merge
     variant, then parentheticals come off. Check 7 of validate-kg-identity fired
     the moment this was missing — it derived five slugs that had just stopped
     being nodes. */
  const canon = (raw) =>
    (descriptiveCells[raw] ?? mergeVariants[raw] ?? raw).replace(/\s*\([^)]*\)/g, '').trim();

  const perRow = rows.map((row) => {
    const name = String(row.Name ?? '').trim();
    /* `saintFigureByShrine` first, exactly as build-kg.mjs applies it, or this
       module reports the slug a row *would* have rather than the one the site
       serves. Tomb of Javindi Bibi is the case: its cell names a different
       monument's figure, the graph is pointed at Bibi Jawindi, and a worksheet
       that still showed the cell's slug would invite a reviewer to decide
       something already corrected. */
    const override = overrides[slugify(name)];
    const legacyCell = override
      ? String(override.figure ?? '').trim()
      : String(row['Sufi Saint'] ?? '').trim();
    const pfCell = String(row['principal_figure'] ?? '').trim();
    const legacySlugs = (composites[legacyCell] ?? (legacyCell ? [canon(legacyCell)] : []))
      .map((n) => slugify(n))
      .filter(Boolean);
    const pfSlugs = splitFigureCell(pfCell)
      .map((part) => slugify(canon(part)))
      .filter(Boolean);

    /* A row "moves" only when it has somewhere to move to. The one row with an
       empty `principal_figure` (Shaktipeeth Shri Hinglaj Mata Mandir) is not a
       mover — switching the column would leave it with no figure at all, which
       is a different problem and is flagged separately. Counting it as a mover
       is how the worksheet first reported 48 against the instrument's 47. */
    const moves = legacySlugs.length > 0 && pfSlugs.length > 0 && legacySlugs.join('+') !== pfSlugs.join('+');

    return {
      name,
      row,
      legacyCell,
      pfCell,
      legacySlugs,
      pfSlugs,
      moves,
      /* The `;` convention cannot express this cell, so a switch would silently
         collapse two figures into one badly-named node. */
      nestedSemicolon: pfCell.includes(';') && splitFigureCell(pfCell).length === 1,
      isComposite: Boolean(composites[legacyCell]),
      /* True where the cell was replaced by saintFigureByShrine. The row looks
         settled because it was settled out-of-band, not because the two columns
         agreed — a reviewer needs to see the difference. */
      isOverridden: Boolean(override),
      pfEmpty: pfCell === '',
    };
  });

  const legacyUniverse = new Set(perRow.flatMap((r) => r.legacySlugs));
  const pfUniverse = new Set(perRow.flatMap((r) => r.pfSlugs));
  const retiring = [...legacyUniverse].filter((s) => !pfUniverse.has(s)).sort();

  /* How many sites each of today's figures holds, and what each of them would
     become. A figure whose rows would land on different slugs splits back
     apart — the Kalka Cave Temple case, and the concrete reason "adopt the
     better column" is the wrong shape of answer.

     **What a successor is, and why the obvious version is wrong.** The first
     version of this asked whether the rows sharing a legacy slug produce the
     same *row-level* set of `principal_figure` slugs. That flags Guru Nanak as
     splitting, because seventeen of his gurdwaras produce `guru-nanak` and the
     two composite rows produce `guru-nanak+bhai-mardana` and
     `guru-nanak+bhai-lalo`. Guru Nanak is not splitting there — he is present in
     all nineteen, with a companion named alongside him in two. It put all
     eighteen of his rows into the reviewer's contested pile, where the question
     on seventeen of them is "confirm this row does not change".

     So the successor is asked per *figure*, not per row: a legacy slug that
     still appears in its row's `principal_figure` slugs survives that row
     unchanged, whatever else the row gained. It splits only when different rows
     send it to genuinely different places. */
  const successorIn = (slug, slugs) => (slugs.includes(slug) ? slug : slugs.join('+') || '(none)');

  const sitesPerLegacySlug = new Map();
  const outcomesPerLegacySlug = new Map();
  for (const r of perRow) {
    for (const slug of r.legacySlugs) {
      sitesPerLegacySlug.set(slug, (sitesPerLegacySlug.get(slug) ?? 0) + 1);
      if (!outcomesPerLegacySlug.has(slug)) outcomesPerLegacySlug.set(slug, new Set());
      outcomesPerLegacySlug.get(slug).add(successorIn(slug, r.pfSlugs));
    }
  }
  const originsPerPfSlug = new Map();
  for (const r of perRow) {
    for (const slug of r.pfSlugs) {
      if (!originsPerPfSlug.has(slug)) originsPerPfSlug.set(slug, new Set());
      originsPerPfSlug.get(slug).add(successorIn(slug, r.legacySlugs));
    }
  }

  /* Merge-variant keys that exist only in the legacy column. The map is keyed on
     the raw cell, so switching stops each of these merging — silently. */
  const legacyValues = new Set(perRow.map((r) => r.legacyCell));
  const pfValues = new Set(perRow.map((r) => r.pfCell));
  const legacyOnlyMergeKeys = Object.keys(mergeVariants).filter(
    (k) => k !== 'comment' && legacyValues.has(k) && !pfValues.has(k),
  );

  return {
    perRow,
    legacyUniverse,
    pfUniverse,
    retiring,
    sitesPerLegacySlug,
    outcomesPerLegacySlug,
    originsPerPfSlug,
    legacyOnlyMergeKeys,
    totals: {
      rows: perRow.length,
      stringDiffs: perRow.filter((r) => r.legacyCell !== r.pfCell).length,
      pfEmpty: perRow.filter((r) => r.pfEmpty).length,
      legacySlugs: legacyUniverse.size,
      pfSlugs: pfUniverse.size,
      moved: perRow.filter((r) => r.moves).length,
      retiring: retiring.length,
      nestedSemicolon: perRow.filter((r) => r.nestedSemicolon).length,
    },
  };
}
