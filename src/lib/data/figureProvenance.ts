/**
 * Where a figure's dates, titles and names actually came from — and whether the
 * archive holds an entry for that figure at all.
 *
 * Two fields the graph has carried since the extraction passes and no page
 * showed:
 *
 * - **`biographySource`, on 97 of 196 figures.** The born/died/titles/altNames
 *   on those pages were read out of prose by a machine, `biographyReviewed` is
 *   `false` on every one of them, and the page rendered them in the same type as
 *   a value typed in by hand from the survey. On an archive whose distinguishing
 *   claim is provenance, that is the claim being made and not kept. The lineage
 *   links and the order memberships on the very same page already carry an
 *   `unreviewed` chip and a quoted source; a figure's own dates did not.
 * - **`lineageOnly`, on 60 figures.** These are the masters named in someone
 *   else's chain — Hujwiri's al-Khuttali and 59 others — who have no site in
 *   this archive. `getAllSaints` correctly keeps them out of "Figures in the
 *   archive" so the counts stay honest, but each still has a reachable page,
 *   and that page said nothing to distinguish "the archive documents this
 *   person and knows almost nothing" from "this person is here only because
 *   another figure's lineage names them".
 *
 * Three figures are **both** (Shah Abul Muali Qadri, Shah Gohar Peer, Mian
 * Qurban Ali Shah): no site here, yet a full sourced biography read out of the
 * archive's own entries. So this returns a *list* of statements rather than one
 * classification — collapsing them would have to drop one true sentence to keep
 * the other.
 */

/** A `biographySource` reference, split into the parts a UI can use. */
export interface FigureSourceRef {
  /** Verbatim, as recorded. Shown when nothing better can be made of it. */
  raw: string;
  file: string;
  fragment: string | null;
  /**
   * The fragment when the reference points into the shrine dataset, where a
   * fragment is an entry slug and therefore a route. Null for any other file —
   * two figures cite `entries/*.md`, which is a real citable location with no
   * page behind it.
   *
   * A *candidate*, not a promise: whether that entry is still in the live
   * dataset is a question for the caller holding the data, not for a parser.
   */
  shrineSlug: string | null;
}

/**
 * The files whose fragments are entry slugs.
 *
 * Hardcoded, and guarded: `figureProvenance.test.ts` asserts every
 * `biographySource` in the shipped graph either resolves to a real entry slug
 * or has no fragment at all. If the pipeline renames its export, 95 links stop
 * resolving — this fails the build instead of quietly rendering 95 file paths
 * where there used to be 95 links (RULE 4).
 */
const SHRINE_DATASET_FILES: readonly string[] = ['data/shrines.csv', 'data/shrines.json'];

export function parseFigureSource(raw: string | undefined): FigureSourceRef | null {
  const value = (raw || '').trim();
  if (!value) return null;
  const hash = value.indexOf('#');
  const file = hash === -1 ? value : value.slice(0, hash);
  const fragment = hash === -1 ? null : value.slice(hash + 1).trim() || null;
  return {
    raw: value,
    file,
    fragment,
    shrineSlug: fragment && SHRINE_DATASET_FILES.includes(file) ? fragment : null,
  };
}

export type FigureProvenanceNote =
  | {
      kind: 'lineage-only';
      /** Whether a person has confirmed this figure belongs in the graph. */
      reviewed: boolean;
    }
  | {
      kind: 'biography';
      source: FigureSourceRef | null;
      /** Whether a person has read the extracted dates and titles. */
      reviewed: boolean;
    };

/**
 * Every provenance statement true of this figure, scope before source.
 *
 * Empty for the 42 figures with neither field: their values came from the sheet,
 * which *is* the archive's primary record, and a note saying "recorded in the
 * record" tells a reader nothing. Absence of a note here means hand-entered,
 * which is the strongest provenance the archive has.
 */
export function figureProvenance(figure: {
  lineageOnly?: boolean | undefined;
  reviewed?: boolean | undefined;
  biographySource?: string | undefined;
  biographyReviewed?: boolean | undefined;
}): FigureProvenanceNote[] {
  const notes: FigureProvenanceNote[] = [];
  if (figure.lineageOnly) {
    notes.push({ kind: 'lineage-only', reviewed: figure.reviewed === true });
  }
  /* Keyed on the review flag, not on the source string: a proposal whose
     `source` the extractor left empty still produced a machine-read value, and
     the flag is the field that says so. An unreviewed biography with no
     citation is the one most worth flagging, not the one to stay silent
     about. */
  if (figure.biographyReviewed !== undefined || figure.biographySource) {
    notes.push({
      kind: 'biography',
      source: parseFigureSource(figure.biographySource),
      reviewed: figure.biographyReviewed === true,
    });
  }
  return notes;
}
