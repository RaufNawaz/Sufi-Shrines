/**
 * The `category` column, resolved the one right way.
 *
 * Two casings exist mid-migration — `category` is the current schema column
 * (six values, CLAUDE.md § Schema) and `Category` the legacy one — and the
 * subtlety that has bitten twice is that **a blank string is not nullish**. So
 * `row['category'] ?? row['Category']` lets an empty `category` shadow a
 * perfectly good `Category`: 6 rows carry a blank `Category` and 1 a blank
 * `category`, and either `??` direction gets a different row wrong. First
 * non-empty of the two, matching `getFieldValue` in
 * src/lib/data/fieldAliasing.ts.
 *
 * Lives here rather than in each script because it was written twice — the
 * validator's version is correct and documents the trap, and build-kg.mjs
 * promptly reintroduced the `??` bug the validator's own comment warns about.
 */

/** The six values `category` may take. One shipped row is outside it
 *  (`"Islam"`, Darbar Abul Muali Qadri) — the validator warns, and the fix is a
 *  sheet edit a human has to make (RULE 3). */
export const CATEGORY_ENUM = [
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
  'Secular / Memorial',
];

/**
 * The traditions in which an *urs* is not an observance.
 *
 * An urs is a Sufi death-anniversary commemoration. Naming a Shivratri or a
 * Gurpurab one flattens six traditions into one vocabulary, which is what the
 * event builder used to do for 86 of 168 events.
 */
export const NON_MUSLIM_TRADITIONS = new Set([
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
]);

/** The row's category, or '' when neither column carries one. */
export function resolveCategory(row) {
  return (
    [row['category'], row['Category']].map((v) => String(v ?? '').trim()).find((v) => v !== '') ??
    ''
  );
}
