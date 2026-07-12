/**
 * schema.mjs — Zod schema for a raw shrine CSV row.
 *
 * Imported by validate.mjs and build-dataset.mjs for per-row validation.
 * Never imported by the app bundle.
 */
import { z } from 'zod';

// ── Controlled vocabularies ───────────────────────────────────────────────

export const CATEGORY_VALUES = [
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
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
