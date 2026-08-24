/**
 * Type declarations for apply-verdicts.mjs so its test type-checks under
 * `tsc --noEmit`.
 */
export declare function evidenceDigest(text: string): string;
export declare function biographyDigest(slug: string, born?: string, died?: string): string;
export declare function parseCsv(text: string): string[][];
export declare function readVerdictCsv(text: string): Record<string, string>[];
export declare function applyVerdicts(
  rows: readonly Record<string, string>[],
  documents: Record<string, { proposals: Record<string, unknown>[]; rejected?: unknown[] }>,
): {
  documents: Record<string, { proposals: Record<string, unknown>[]; rejected?: unknown[] }>;
  applied: number;
  rejected: number;
  noted: number;
  errors: string[];
};
