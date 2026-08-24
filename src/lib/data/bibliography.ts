/**
 * An entry's bibliography, item by item.
 *
 * Two things needed the same answer and had none in common: `/coverage` counts
 * citations, and the knowledge graph needs their text to build source nodes. So
 * the rule for "what is one bibliography item" lives here, as a pure
 * string-in/array-out function, mirrored for the build scripts in
 * `scripts/data/lib/bibliography.mjs` under a drift guard.
 *
 * **Counting this way corrected a number the site was displaying.** The previous
 * rule was one regex, `/^\s*[-*]\s+\S|https?:\/\//gm`, whose two alternatives
 * both matched inside a single item: a list item that ends in a URL — and nine
 * do — was counted twice. `/coverage` therefore reported **544 citations where
 * the archive holds 533**, and 544 is the figure quoted in CLAUDE.md's standing
 * findings. Small, and exactly the kind of error this archive cannot afford: its
 * whole discipline is that a number on the page is a measurement.
 *
 * Measured 24 August 2026: every bibliography region in the shipped data is
 * *only* list items — 533 of them, no prose, no wrapped continuation lines. So
 * one item is one list line. The bare-URL branch is kept for a `Sources` column
 * that holds nothing but a link, and applies only to lines that are not list
 * items, where it cannot double-count.
 */

/** Headings under which an entry's citations are authored inline in the
 *  Description. Article sections can be authored either inline or in a
 *  dedicated column (see ARTICLE_SECTION_DEFINITIONS), so looking in only one
 *  place undercounts. */
const BIB_HEADING = /^##\s*(Sources|Bibliography|References|Further reading)\b/im;

const LIST_ITEM = /^\s*[-*]\s+(\S.*)$/;

/**
 * The text region holding an entry's citations: the dedicated column if the
 * sheet has one, otherwise everything after the first bibliography heading in
 * the Description.
 */
export function bibliographyRegion(sourcesColumn: string, description: string): string {
  const column = (sourcesColumn ?? '').trim();
  if (column) return column;
  const heading = BIB_HEADING.exec(description ?? '');
  if (!heading) return '';
  return (description ?? '').slice(heading.index + heading[0].length);
}

/**
 * Each citation, verbatim, with its list marker stripped.
 *
 * Nothing is normalised beyond the marker and surrounding space: a citation is
 * the source's real title, publisher and URL, and it is the exact search string
 * a reader is owed (i18n rule 7). Trimming it into a tidier shape would be
 * editing the archive's provenance.
 */
export function bibliographyItems(sourcesColumn: string, description: string): string[] {
  const region = bibliographyRegion(sourcesColumn, description);
  if (!region) return [];
  const items: string[] = [];
  for (const line of region.split(/\r?\n/)) {
    const listed = LIST_ITEM.exec(line);
    if (listed) {
      items.push(listed[1].trim());
      continue;
    }
    /* A line that is not a list item may still be a bare link. Each URL on such
       a line is its own item; a URL *inside* a list item is part of that
       citation, which is the distinction the old single regex lost. */
    for (const url of line.match(/https?:\/\/\S+/g) ?? []) items.push(url);
  }
  return items;
}
