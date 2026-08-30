/**
 * Is a bibliography line a *citation* or a *placeholder*?
 *
 * MIRROR of `GENERIC` in `pipeline/build_sources_registry.py`, which is the
 * archive's own definition and has been since the source registry was written.
 * Kept in sync by `src/lib/data/__tests__/sourceKindSync.test.ts`, which reads
 * the pattern out of the Python source and requires both to classify all 464
 * source names identically — the arrangement `places.mjs` and
 * `bibliography.mjs` already have.
 *
 * ## Why the distinction has to leave Python
 *
 * `build_sources_registry.py`'s own docstring says it plainly: *"One is a
 * citation; the other is a placeholder. Until they are separated you cannot tell
 * a sourced claim from an unsourced one."* `docs/HANDOVER.md` §3 and
 * `docs/planning/BADGE_GLOSSARY.md` both call the separation load-bearing — the
 * glossary says that without it *"the badge would be flattering rather than
 * honest"*.
 *
 * The separation was applied to the **badge**, in Python, offline, writing TSVs
 * that nothing ships. It was never applied to the **count**, which runs through
 * `build-kg.mjs` → `kg-sources.json` → `sourceIndex.ts` → `/about`. So `/about`
 * tells a reader the archive rests on **464 distinct sources** and 57 of those
 * — 12.3% — are lines this pattern defines as placeholders. One of them is a
 * withdrawal notice:
 *
 *     "Pending. Prior source attribution for this entry has been withdrawn as
 *      unreliable."
 *
 * Two of the 57 sit in the *prominent* shared list rather than the collapsed
 * tail, and a reader can arrive at one from a shrine page: `SourceReach` links
 * any citation shared by two or more entries to `/about#source-…`, so following
 * "also cited by 1" under a Uch Sharif bibliography lands on "General
 * established histories of the Suhrawardi order and of Uch Sharif."
 *
 * ## What this is not for
 *
 * **Deleting or rewriting these lines** (RULE 2). "Pending. Prior source
 * attribution … has been withdrawn as unreliable" is among the most honest
 * sentences in the archive and belongs on the page. The point is to count it as
 * what it is.
 */

/**
 * The placeholder pattern, transcribed from `build_sources_registry.py:54-63`.
 *
 * Python's `re.I` is JavaScript's `i`; `\b` and `.*` behave the same here, and
 * the sync test proves it over the real data rather than by argument.
 */
export const GENERIC_SOURCE = new RegExp(
  '^(general(ly)?\\b.*(histories|accounts|studies|literature)' +
    '|.*\\bgeneral (established )?(histories|accounts|studies)' +
    '|.*\\bcomparative literature\\b' +
    '|.*\\bstandard biographies\\b' +
    '|.*\\breference encyclopaedias\\b' +
    '|.*\\blocal (hagiographical|histories|accounts|tradition)' +
    '|.*\\bcommunity (and press )?accounts\\b' +
    '|.*\\bcontemporary press\\b' +
    '|.*\\bpending\\b)',
  'i',
);

/**
 * True when the line points a reader at a body of literature rather than at
 * something they could go and find.
 */
export function isPlaceholderSource(name) {
  return GENERIC_SOURCE.test(String(name ?? '').trim());
}
