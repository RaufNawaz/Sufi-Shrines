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
 * The reader's own calendar date, as `YYYY-MM-DD`.
 *
 * **Not `toISOString().slice(0, 10)`**, which is the obvious spelling and is
 * wrong for exactly the readers this archive is for. `toISOString()` converts to
 * UTC first, so the date it yields is the reader's only where the offset happens
 * to be zero. This archive's primary audience is in Pakistan at **UTC+5**, where
 * **every visit between 00:00 and 05:00 local time cited yesterday**; a reader in
 * the Americas after 20:00 cited tomorrow.
 *
 * It matters more here than it would in most places. The accessed date exists
 * *because* the site reads a live sheet that can change under the reader — it is
 * the field carrying the provenance claim, on an archive whose distinguishing
 * claim is provenance. A citation that misdates its own access by a day is
 * wrong about the one thing it was added to be right about.
 *
 * `CiteThisEntry` was worse than merely off: it took the date in UTC and the
 * *year* from `getFullYear()`, which is local, so on 1 January the two halves of
 * one citation could disagree.
 *
 * Found 4 September 2026 while checking a measurement script for the same
 * defect, and fixed on the 5th. The same shape as
 * `src/test/datedClaims.test.ts`'s subject — that guard defines "today" from the
 * local getters for this reason.
 */
export function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
  const iso = localIsoDate(accessed);
  return (
    `"${shrineName}". In ${PUBLICATION.author}, Mapping the Shrines of Pakistan (v${PUBLICATION.version}). ` +
    `${PUBLICATION.affiliation}, ${year}. ${PUBLICATION.siteUrl}/shrine/${slug} (accessed ${iso}).`
  );
}
