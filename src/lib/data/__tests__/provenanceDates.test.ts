// @vitest-environment node
/**
 * A provenance record may not carry a date it did not observe
 * (RULE 4, and RULE 2 — never invent content).
 *
 * ## The hazard this is for
 *
 * `BASELINE_URDU_DESCRIPTION_PROVENANCE` in `scripts/data/build-provenance.mjs`
 * is the record written for any slug that has an Urdu description and no
 * provenance for it. It carried `date: '2026-07-11'`.
 *
 * A `date` is a per-entry factual claim and that is a **constant**, so all 167
 * records that had one asserted the same translation date. It is a guess for
 * every entry and **demonstrably false for four**: Darbar Ghazi Ilm Din Shaheed,
 * Darbar Hazrat Khawaja Feroz-ud-Din, Darbar Hazrat Tahir Bandagi Qadri and
 * Darbar Wasif Ali Wasif were added to the archive in August, and their records
 * claimed an Urdu translation made in July — a month before the English they
 * translate existed.
 *
 * `date` is optional in `src/types/provenance.ts` and rendered nowhere, so
 * removing it costs a reader nothing. What it stops is `data/provenance.json`,
 * which ships in the Zenodo bundle, stating something untrue about itself.
 * `source` keeps its date, because it describes *the pass* — which did happen
 * that day — rather than asserting that this entry was in it.
 *
 * ## What this does not cover, and it is the larger half
 *
 * The store is frozen at its `updated` stamp by design: `build-provenance.mjs`
 * is additive-only and never revisits a record when the text it describes
 * changes. **62 entries have a substantively different Description under an
 * unchanged record**, 51 of them having gained an entire bibliography, and six
 * `Field-verified` entries are still recorded as "pre-existing entry … origin
 * inferred by elimination". Re-tiering those is a claim about how a passage was
 * written, which is a person's (RULE 2) — recorded in `docs/SESSION_RESUME.md`.
 * A digest of the described text, stored beside `contentTier`, is the guard that
 * would catch the next 62; it is not written here because stamping today's
 * digest onto a record that describes yesterday's text would bless the drift
 * rather than find it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');

type Field = { date?: string; source?: string; contentTier?: string };
type Store = { updated: string; shrines: { shrineSlug: string; fields: Record<string, Field> }[] };

const store = (): Store =>
  JSON.parse(readFileSync(join(ROOT, 'data', 'provenance.json'), 'utf8')) as Store;

describe('provenance dates', () => {
  it('has records to check', () => {
    expect(store().shrines.length).toBeGreaterThan(150);
  });

  it('stamps no constant translation date onto the Urdu records', () => {
    const dated = store()
      .shrines.filter((r) => r.fields['Description Urdu']?.date)
      .map((r) => `  ${r.shrineSlug}: ${r.fields['Description Urdu'].date}`);

    expect(
      dated,
      dated.length === 0
        ? ''
        : `${dated.length} Urdu provenance record(s) carry a date:\n${dated.slice(0, 8).join('\n')}\n\n` +
            'If this is one date shared by many records it is a constant, not an observation — and ' +
            'the four entries added to the archive after that pass will be claiming a translation ' +
            'made before the English existed. A wrong date is worse than none. Put the pass in ' +
            '`source`, which describes the pass rather than the entry.',
    ).toEqual([]);
  });

  it('does not let one date stand for most of the archive on any field', () => {
    /* The general form, so the next constant is caught wherever it lands rather
       than only on `Description Urdu`. A real observation date repeats a handful
       of times; a hardcoded one repeats across the whole store. */
    const counts = new Map<string, number>();
    for (const rec of store().shrines) {
      for (const [field, value] of Object.entries(rec.fields)) {
        if (value?.date) {
          const key = `${field} @ ${value.date}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
    const suspicious = [...counts]
      .filter(([, n]) => n > 40)
      .map(([key, n]) => `  ${key} — on ${n} records`);
    expect(
      suspicious,
      suspicious.length === 0
        ? ''
        : `A single date is recorded on more than 40 entries:\n${suspicious.join('\n')}\n\n` +
            'That is a constant wearing an observation\'s clothes. Provenance records are read by ' +
            'people deciding whether a sentence needs re-checking, and data/provenance.json ships ' +
            'in the release.',
    ).toEqual([]);
  });

  it('keeps the pass description, which is true of the pass', () => {
    // The remedy is removing a false per-entry claim, not erasing what is known.
    const withSource = store().shrines.filter((r) =>
      r.fields['Description Urdu']?.source?.includes('2026-07-11'),
    );
    expect(withSource.length).toBeGreaterThan(150);
  });
});
