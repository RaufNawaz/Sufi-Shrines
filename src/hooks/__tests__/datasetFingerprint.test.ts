import { describe, it, expect } from 'vitest';
import { fingerprintShrines } from '../useShrineData';
import { buildShrines } from '../../lib/data/shrineModel';
import { mergeUrduContent } from '../../lib/data/urduContentOverride';
import type { ShrineRow } from '../../types/shrine';

/**
 * A merged dataset must never fingerprint as the English dataset it came from.
 *
 * ## What went wrong
 *
 * The fingerprint hashed name, founded and the **English** description length.
 * `applyUrduContentOverrides` changes none of those — it writes
 * `Description Urdu` and the per-section Urdu fields — so an Urdu-merged
 * dataset and its English source were indistinguishable to it. `adoptCsvResult`
 * treats an equal fingerprint as "nothing changed, keep what we have", so it
 * kept the English dataset and discarded the freshly merged Urdu one.
 *
 * Measured on the running site, 30 August 2026, over a 12-entry sample: after
 * visiting the English map first, **9 entries rendered a different article and
 * 8 of those rendered materially more English** — the Latin share of the
 * article body going from 6–20% on a clean start to 45–79%.
 * `shrine-of-shah-yusaf-gardez` went 8% → 53%, `kali-bari-mandir` 0% → 70%.
 * Not a flash: still English seconds later, and it reproduced after an English
 * *map* visit alone, so it reached every shared link and bookmark opened after
 * browsing in English.
 *
 * ## Why this is a unit test and not an e2e one
 *
 * A browser-level assertion would be flaky today, and the flakiness is itself a
 * finding — see the note in `docs/SESSION_RESUME.md`. Measured five times from
 * a *clean* context with no English visit at all, one Urdu page renders one of
 * two settled states (11,115 characters at 30% Latin, or 4,021 at 55%), and a
 * 15-second floor does not change that. So a spec asserting "no English after
 * an English visit" would fail for a reason unrelated to what it names, on a
 * suite another session also runs. This holds the part that is deterministic.
 */

const URDU_PROSE = 'یہ اردو متن ہے جو صرف اردو قاری کے لیے ہے۔';

function rows(): ShrineRow[] {
  return [
    { Name: 'Data Darbar', Latitude: '31.55', Longitude: '74.30', Description: 'English prose.' },
    { Name: 'Bibi Pak Daman', Latitude: '31.56', Longitude: '74.31', Description: 'More English.' },
  ];
}

describe('the dataset fingerprint distinguishes an Urdu merge', () => {
  it('an Urdu-merged dataset does not fingerprint as its English source', () => {
    const english = rows();
    const merged = mergeUrduContent(english, {
      'data-darbar': { descriptionUr: URDU_PROSE },
      'bibi-pak-daman': { descriptionUr: URDU_PROSE },
    } as never);

    /* The premise: the merge really did put Urdu on the rows. Without this the
       test could pass over a merge that silently did nothing. */
    expect(merged.some((r) => r['Description Urdu'])).toBe(true);

    expect(fingerprintShrines(buildShrines(merged))).not.toBe(
      fingerprintShrines(buildShrines(english)),
    );
  });

  it('still recognises a genuine no-op, so a healthy refresh rebuilds nothing', () => {
    /* The other half, and the reason this is not simply "hash everything".
       `adoptCsvResult` reuses the previous array identity when the fingerprint
       matches, which is what keeps a background refresh from rebuilding the
       search index and the marker layer. An English reader never loads the
       payload, so their Urdu term is a constant 0 and equality must survive. */
    expect(fingerprintShrines(buildShrines(rows()))).toBe(fingerprintShrines(buildShrines(rows())));

    const merged = mergeUrduContent(rows(), {
      'data-darbar': { descriptionUr: URDU_PROSE },
    } as never);
    expect(fingerprintShrines(buildShrines(merged))).toBe(fingerprintShrines(buildShrines(merged)));
  });

  it('a longer Urdu article fingerprints differently from a shorter one', () => {
    /* The term is a length, so two different Urdu payloads must not collide —
       otherwise a re-merge with corrected prose would read as a no-op. */
    const short = mergeUrduContent(rows(), { 'data-darbar': { descriptionUr: 'مختصر' } } as never);
    const long = mergeUrduContent(rows(), {
      'data-darbar': { descriptionUr: URDU_PROSE },
    } as never);
    expect(fingerprintShrines(buildShrines(short))).not.toBe(
      fingerprintShrines(buildShrines(long)),
    );
  });
});
