/** Types for the plain-node mirror of `src/lib/data/silsila.ts`. The mirror is
 *  the one `build-kg.mjs` uses; the app reads the TypeScript original, and
 *  `silsilaSync.test.ts` refuses drift between them. */
export declare const SILSILA_PATTERN_SOURCES: ReadonlyArray<readonly [string, string]>;
export declare const ORDER_CELL_PATTERNS: Record<string, RegExp>;
export declare function ordersNamedIn(value: string): string[];
export declare function orderSlugForSilsila(value: string): string | null;
