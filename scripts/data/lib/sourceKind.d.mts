/**
 * Type declarations for sourceKind.mjs so the three-way drift guard
 * (src/lib/data/__tests__/sourceKindSync.test.ts) type-checks under
 * `tsc --noEmit`.
 */
export declare const GENERIC_SOURCE: RegExp;
export declare function isPlaceholderSource(name: string): boolean;
