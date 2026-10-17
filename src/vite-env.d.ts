/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CSV_URL: string;
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_BEACON_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Per-entry Urdu articles, built from src/data/urdu-content.json by
   scripts/vite-urdu-articles.mjs. */
declare module 'virtual:urdu-article-loaders' {
  const loaders: Record<string, () => Promise<{ default: unknown }>>;
  export default loaders;
}
