/**
 * toursSchema.mjs — Zod schema for the curated guided-tours dataset.
 *
 * Imported by validate-tours.mjs for authoring-time validation. Never
 * imported by the app bundle — the browser gets a lightweight defensive
 * check instead (see src/lib/tours/tours.ts's loadTours).
 */
import { z } from 'zod';

export const TOUR_TRADITIONS = ['sufi', 'sikh', 'hindu-jain'];

export const TourStopSchema = z.object({
  shrineSlug: z.string().min(1, 'shrineSlug is required'),
  narrative: z.string().min(1, 'narrative is required'),
  narrativeUr: z.string().min(1, 'narrativeUr is required'),
});

export const TourSchema = z.object({
  id: z.string().min(1, 'id is required'),
  title: z.string().min(1, 'title is required'),
  titleUr: z.string().min(1, 'titleUr is required'),
  description: z.string().min(1, 'description is required'),
  descriptionUr: z.string().min(1, 'descriptionUr is required'),
  tradition: z.enum(TOUR_TRADITIONS, {
    errorMap: () => ({ message: `tradition must be one of: ${TOUR_TRADITIONS.join(', ')}` }),
  }),
  region: z.string().min(1, 'region is required'),
  theme: z.string().min(1, 'theme is required'),
  era: z.string().min(1, 'era is required'),
  stops: z.array(TourStopSchema).min(2, 'a tour needs at least 2 stops'),
});

export const ToursFileSchema = z.array(TourSchema);

export function validateTour(tour) {
  const result = TourSchema.safeParse(tour);
  if (result.success) return { success: true, errors: [] };
  return {
    success: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
