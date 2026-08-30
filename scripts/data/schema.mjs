/**
 * schema.mjs — Zod schema for a raw shrine CSV row.
 *
 * Imported by validate.mjs and build-dataset.mjs for per-row validation.
 * Never imported by the app bundle.
 */
import { z } from 'zod';

// ── Controlled vocabularies ───────────────────────────────────────────────

/**
 * What the **legacy** `Category` column may hold — the union of two
 * vocabularies, on purpose.
 *
 * `Category` is the legacy column (CLAUDE.md § Schema: "Legacy `Category`,
 * `Sufi Saint`, `Founded/Opened` are still read as fallbacks"). Its historical
 * vocabulary was five values, and the 169 shipped rows still use only three of
 * them: 76 Muslim Shrine, 50 Hindu Temple, 37 Sikh Gurdwara, 6 blank. So the
 * five-value list was accurate for the data and wrong about the future.
 *
 * **It rejected the correct fix.** 20 rows carry a legacy `Category` that
 * disagrees with the modern `category` beside it — `Gori Temple` is
 * `Jain Temple` in one column and `Hindu Temple` in the other; 14 Nanakpanthi
 * darbars are filed as Hindu or Sikh. Bringing those cells into line is the
 * obvious hygiene job, and doing it made `npm run data:validate` **exit 1**,
 * with a message naming `Christian Church` and `Other` as the permitted values.
 * This archive holds no Christian church and abolished `Other`. A check that
 * punishes the correct action and directs the operator to undo it is the
 * "a poet of note:" pattern RULE 4 was written about.
 *
 * The union is the migration-safe answer: a legacy cell may keep its old value
 * or take the modern one, and neither is an error while the two columns
 * coexist. The modern `category` column has its own six-value list in
 * `scripts/data/lib/category.mjs`, and `categoryVocabulary.test.ts` holds this
 * list as a superset of it, so this can never again be the narrower of the two.
 */
export const CATEGORY_VALUES = [
  // The six the modern `category` column uses.
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
  'Secular / Memorial',
  // Legacy-only, retained so an old export still validates. No shipped row
  // uses either.
  'Christian Church',
  'Other',
  '',
];

// Pakistan bounding box (generous: covers border regions)
export const BBOX = { latMin: 20, latMax: 42, lngMin: 55, lngMax: 82 };

// ── Field helpers ─────────────────────────────────────────────────────────

const optionalString = z.string();

const coordinateString = (label, min, max) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(
      (v) => {
        const n = parseFloat(v);
        return isFinite(n);
      },
      { message: `${label} must be a numeric string` },
    )
    .refine(
      (v) => {
        const n = parseFloat(v);
        return n >= min && n <= max;
      },
      { message: `${label} must be in range [${min}, ${max}]` },
    );

// ── ShrineRow schema ──────────────────────────────────────────────────────

export const ShrineRowSchema = z.object({
  Name: z.string().min(1, 'Name is required'),
  Location: optionalString,
  Category: z
    .string()
    .refine((v) => CATEGORY_VALUES.includes(v), {
      message: `Category must be one of: ${CATEGORY_VALUES.filter(Boolean).join(', ')}`,
    }),
  Latitude: coordinateString('Latitude', BBOX.latMin, BBOX.latMax),
  Longitude: coordinateString('Longitude', BBOX.lngMin, BBOX.lngMax),
  'Founded/Opened': optionalString,
  'Sufi Saint': optionalString,
  'Image 1': z
    .string()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: 'Image 1 must be empty or a valid http(s) URL',
    }),
  'Image 2': z
    .string()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: 'Image 2 must be empty or a valid http(s) URL',
    }),
  // Optional photo credit/source line shown under an image that isn't from
  // Wikimedia Commons (e.g. "Dawn.com") — see src/lib/data/galleryParsing.ts.
  // These columns may not exist at all in older sheet snapshots, hence
  // .optional() rather than optionalString (which still requires the key).
  'Image 1 Credit': z.string().optional(),
  'Image 2 Credit': z.string().optional(),
  Events: optionalString,
  Description: optionalString,
});

// ── validate a single row ─────────────────────────────────────────────────

export function validateRow(row) {
  const result = ShrineRowSchema.safeParse(row);
  if (result.success) return { success: true, errors: [] };
  return {
    success: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
