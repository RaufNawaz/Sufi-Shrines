import type { Shrine } from '../../types/shrine';
import { figureSlugsForShrine } from '../kgShrineFigures';

/**
 * Which figures a set of sites commemorates — the place page's join, made
 * without the knowledge graph.
 *
 * **Why not `getSaintsForShrine`.** It is the same edge and the obvious call,
 * and it costs 305 KB: `src/lib/kg.ts` statically imports the 426 KB graph, and
 * `/place/:slug` had never carried it. Measured on the first attempt at this
 * feature — the route went 292 KB → 608 KB of eager JavaScript for two
 * sections, and `check-bundle-budget` refused the build. So this uses the
 * established pattern instead, the one `kgShrineFigures.ts` and
 * `ObservanceCard` already follow: **the link target comes from the 11 KB
 * shrine → figure index; the display name comes from the sheet row the page
 * already holds.**
 *
 * **Why the name cannot be derived from the sheet alone.** It is tempting to
 * skip the index too and slugify `principal_figure` for the href. Measured
 * against the graph on 26 August 2026: **86 of 169 slugs and 90 of 169 names
 * diverge.** The graph normalises the sheet's parentheticals and merges
 * variants — "Sayyid Abdul Latif Kazmi (Bari Imam)" is `bari-imam`, "Shiva
 * (Mahadev)" and "Shiva (associated)" are both `shiva`, "Durga (Mata)" is
 * `goddess-durga`. Deriving the href would have produced 86 links to figure
 * pages that do not exist, every one of them looking plausible.
 *
 * So the two halves come from the two places that are actually authoritative
 * for them: identity from the graph's index, wording from the record.
 */
export interface PlaceFigure {
  /** The graph's slug — the only thing `/saint/:slug` can be built from. */
  slug: string;
  /** The sheet's own wording for this figure, unlocalized. The caller runs it
   * through `localizeField`, as the almanac's cards do. Taken from the first
   * site that names them: where a place keeps one figure at several sites the
   * rows can word the name differently, and picking the first is at least a
   * string the record actually contains (RULE 2). */
  recordedName: string;
  /** Every site in this place that commemorates them, in the order given.
   * Guru Nanak is named by six of Nankana Sahib's seven gurdwaras; a list that
   * pushed a row per edge would report that as six figures. */
  shrineSlugs: string[];
}

/**
 * Figures commemorated at these sites, deduplicated by figure, in the order the
 * sites were given.
 *
 * A site the index knows no figure for contributes nothing rather than an empty
 * row — every one of the 169 sites has exactly one today, but the graph and the
 * sheet are separate artefacts and a row the graph has not caught up with
 * should be silent rather than blank.
 */
export function figuresAtShrines(shrines: Shrine[]): PlaceFigure[] {
  const byFigure = new Map<string, PlaceFigure>();
  for (const shrine of shrines) {
    for (const slug of figureSlugsForShrine(shrine.slug)) {
      const seen = byFigure.get(slug);
      if (seen) {
        if (!seen.shrineSlugs.includes(shrine.slug)) seen.shrineSlugs.push(shrine.slug);
        continue;
      }
      byFigure.set(slug, {
        slug,
        recordedName: shrine.sufiSaint,
        shrineSlugs: [shrine.slug],
      });
    }
  }
  return [...byFigure.values()];
}
