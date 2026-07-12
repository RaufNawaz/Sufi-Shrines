/**
 * Type declarations for slugs.mjs so the sync test
 * (src/lib/data/__tests__/slugsSync.test.ts) type-checks under `tsc --noEmit`.
 */
export declare function slugify(text: string): string;
export declare function buildSlugs(rows: Array<Record<string, unknown>>): string[];
