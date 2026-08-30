/** Types for `validate-description-structure.mjs`, whose predicates are unit-tested. */
export declare const LONG_ENOUGH: number;
export declare const KNOWN: Map<string, string>;
export declare const KNOWN_UNBALANCED: Map<string, string>;
export declare function unbroken<T extends { Description?: string; description?: string }>(
  rows: readonly T[],
): T[];
export declare function unbalancedEmphasis<
  T extends { Description?: string; description?: string },
>(rows: readonly T[]): T[];
