/**
 * Type declarations for places.mjs so the drift guard
 * (src/lib/data/__tests__/placesVocabSync.test.ts) type-checks under
 * `tsc --noEmit`.
 */
export interface PlaceVocabularyRow {
  slug: string;
  name: string;
  pattern: string;
}
export declare const PLACE_VOCABULARY: PlaceVocabularyRow[];
export declare function locationOfRow(row: Record<string, unknown>): string;
export declare function placesForLocation(location: string): PlaceVocabularyRow[];
export declare function countPlaces<T>(
  rows: readonly T[],
  locationOf: (row: T) => string,
  minSites?: number,
): Array<PlaceVocabularyRow & { count: number }>;
