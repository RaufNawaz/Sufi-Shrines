/** Types for `validate-description-structure.mjs`, whose predicate is unit-tested. */
export declare const LONG_ENOUGH: number;
export declare const KNOWN: Map<string, string>;
export declare function unbroken<T extends { Description?: string; description?: string }>(
  rows: readonly T[],
): T[];
