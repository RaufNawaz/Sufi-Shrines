/**
 * Type declarations for bibliography.mjs so the drift guard
 * (src/lib/data/__tests__/bibliographySync.test.ts) type-checks under
 * `tsc --noEmit`.
 */
export declare function bibliographyRegion(sourcesColumn: string, description: string): string;
export declare function bibliographyItems(sourcesColumn: string, description: string): string[];
export declare function citationKey(text: string): string;
