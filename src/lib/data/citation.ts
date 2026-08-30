/**
 * Publication metadata, in one place, sourced from the repository's own files.
 *
 * A public scholarly archive that does not state its licence or how to cite it
 * is not publishable, whatever else is true of it. `LICENSE` (MIT, code),
 * `LICENSE-data.md` (ODbL-1.0, data, with a prescribed attribution string) and
 * `CITATION.cff` have all existed since the start; none of them reached a
 * visitor. These constants mirror them.
 *
 * Kept in a module rather than inlined in the page so
 * `src/lib/data/__tests__/citation.test.ts` can assert they still match the
 * files. A licence notice that has drifted from the licence is worse than none:
 * it tells a reuser something untrue about their rights.
 */

export const PUBLICATION = {
  /** From CITATION.cff `version`. */
  version: '2.0.0',
  /** From CITATION.cff `authors` / `affiliation`. */
  author: 'Rauf Nawaz',
  affiliation: 'Harvard University',
  /** From LICENSE — applies to the site and pipeline code. */
  codeLicense: 'MIT',
  codeLicenseUrl: 'https://opensource.org/licenses/MIT',
  /** From LICENSE-data.md — applies to the dataset. */
  dataLicense: 'ODbL-1.0',
  dataLicenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
  repository: 'https://github.com/RaufNawaz/Sufi-Shrines',
  siteUrl: 'https://raufnawaz.github.io/Sufi-Shrines',
  /** The exact wording LICENSE-data.md says satisfies ODbL attribution. Not
   * paraphrased: the licence prescribes it.
   *
   * DELIBERATELY NOT RENAMED on 30 August 2026 when the archive became "Mapping
   * the Shrines of Pakistan". The two citation strings in this file serve
   * different masters: `archiveCitation` and `entryCitation` are ACADEMIC
   * citations and follow `CITATION.cff`, which LICENSE-data.md itself points at
   * ("For academic citations use the CITATION.cff file"); this one is the
   * **ODbL attribution the licence prescribes**, and changing what a licence
   * requires of the people using the data is not a rename, it is a licence
   * change. It stays until LICENSE-data.md does, and that is Rauf's call.
   *
   * The version and year disagreement this comment used to record — LICENSE-data.md
   * at v1.0.0, this at v2.0.0, the release README at year 2025 — was settled by
   * Rauf on 30 August 2026 in favour of **v2.0.0 / 2026**, and the other four
   * files were moved to match. `datasetVersionsAgree.test.ts` now fails if they
   * ever drift again, because three strings and three answers is not a thing a
   * reader can be asked to adjudicate. The archive NAME is still unreconciled and
   * is still deliberate — see the paragraph above. */
  attribution:
    'Nawaz, Rauf. Sufi Shrines of Pakistan (v2.0.0). Harvard University, 2026. https://github.com/raufnawaz/sufi-shrines',
} as const;

/** A citation line for the archive as a whole. */
export function archiveCitation(year: number = 2026): string {
  return (
    `${PUBLICATION.author}. ${'Mapping the Shrines of Pakistan'} (v${PUBLICATION.version}). ` +
    `${PUBLICATION.affiliation}, ${year}. ${PUBLICATION.siteUrl}`
  );
}

/**
 * A citation line for one entry. Scholarly practice cites the item and the
 * database it sits in, so both appear — and the accessed date, because this
 * archive reads a live sheet and can change under the reader.
 */
export function entryCitation(
  shrineName: string,
  slug: string,
  accessed: Date,
  year: number = 2026,
): string {
  const iso = accessed.toISOString().slice(0, 10);
  return (
    `"${shrineName}". In ${PUBLICATION.author}, Mapping the Shrines of Pakistan (v${PUBLICATION.version}). ` +
    `${PUBLICATION.affiliation}, ${year}. ${PUBLICATION.siteUrl}/shrine/${slug} (accessed ${iso}).`
  );
}
