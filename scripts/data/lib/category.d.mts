/**
 * Type declarations for category.mjs so the tests that assert against it
 * (src/lib/data/__tests__/kgEvents.test.ts) type-check under `tsc --noEmit`.
 */
export declare const CATEGORY_ENUM: string[];
export declare const NON_MUSLIM_TRADITIONS: Set<string>;
export declare function resolveCategory(row: Record<string, unknown>): string;
