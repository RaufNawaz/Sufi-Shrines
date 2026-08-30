/**
 * Is a bibliography line a *citation* or a *placeholder*?
 *
 * The archive's own distinction, and it has existed since the source registry
 * was written. `pipeline/build_sources_registry.py`'s docstring states it:
 * *"One is a citation; the other is a placeholder. Until they are separated you
 * cannot tell a sourced claim from an unsourced one."* `docs/HANDOVER.md` §3 and
 * `docs/planning/BADGE_GLOSSARY.md` both call the separation load-bearing — the
 * glossary says that without it *"the badge would be flattering rather than
 * honest"*.
 *
 * ## Why it had to reach the browser
 *
 * The separation was applied to the **badge**: in Python, offline, writing TSVs
 * that nothing ships. It was never applied to the **count**. `/about` builds its
 * source index in the browser from the shipped rows and reports
 * `sources.length` under the heading *"What the archive rests on"* — **464
 * distinct sources**, of which **57 are placeholders**. One is a withdrawal
 * notice: *"Pending. Prior source attribution for this entry has been withdrawn
 * as unreliable."*
 *
 * So the classification lives in three places now — here, in
 * `scripts/data/lib/sourceKind.mjs` for the build, and in the Python that owns
 * it — and `sourceKindSync.test.ts` runs all three over every source name in the
 * archive and requires identical answers. Three copies with a drift guard is the
 * same arrangement `bibliography.ts` and `places.ts` already have, and the guard
 * is what makes it honest.
 *
 * ## What this is not for
 *
 * Deleting or rewriting these lines (RULE 2). The withdrawal notice is among the
 * most honest sentences in the archive and belongs on the page. The point is to
 * be able to count it as what it is.
 */

/**
 * Transcribed from `GENERIC` in `pipeline/build_sources_registry.py:54-63`.
 *
 * Python's `re.I` is JavaScript's `i`; `\b` and `.*` behave identically for
 * these alternatives, and the sync test proves it over the real data rather than
 * by argument.
 */
export const GENERIC_SOURCE =
  /^(general(ly)?\b.*(histories|accounts|studies|literature)|.*\bgeneral (established )?(histories|accounts|studies)|.*\bcomparative literature\b|.*\bstandard biographies\b|.*\breference encyclopaedias\b|.*\blocal (hagiographical|histories|accounts|tradition)|.*\bcommunity (and press )?accounts\b|.*\bcontemporary press\b|.*\bpending\b)/i;

/**
 * True when the line points a reader at a body of literature rather than at
 * something they could go and find.
 */
export function isPlaceholderSource(name: string): boolean {
  return GENERIC_SOURCE.test((name ?? '').trim());
}
