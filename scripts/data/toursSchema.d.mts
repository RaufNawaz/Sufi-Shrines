/**
 * Type declarations for toursSchema.mjs so the sync test
 * (src/lib/tours/__tests__/toursSchemaSync.test.ts) type-checks under
 * `tsc --noEmit`. Zod schema exports are intentionally omitted — only the
 * pieces the test (and other TS callers) need are declared.
 */
export declare const TOUR_TRADITIONS: string[];
export declare function validateTour(tour: unknown): { success: boolean; errors: string[] };
