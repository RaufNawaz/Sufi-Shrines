/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CSV_URL: string;
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_BEACON_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* The team gate's build-time shape (vite.config.ts `define`, docs/TEAM_ACCESS_PLAN.md).
   __TEAM_CODE__: team-only code is in this build (team and runtime builds; false in the public one).
   __TEAM_ALWAYS__: this is the team build, where the gate is always on. */
declare const __TEAM_CODE__: boolean;
declare const __TEAM_ALWAYS__: boolean;

/* Per-entry Urdu articles, built from src/data/urdu-content.json by
   scripts/vite-urdu-articles.mjs. */
declare module 'virtual:urdu-article-loaders' {
  const loaders: Record<string, () => Promise<{ default: unknown }>>;
  export default loaders;
}
