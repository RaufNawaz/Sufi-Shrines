/**
 * Types for `routeDescriptions.mjs`, which is a build-script module that
 * TypeScript cannot infer from. Its shape is small and fixed: a route path,
 * the `uiStrings` key its description quotes, and that string in both
 * languages. `routeDescriptions.test.ts` is what keeps the two in agreement.
 */
export declare const ROUTE_DESCRIPTIONS: Record<string, { key: string; en: string; ur: string }>;
