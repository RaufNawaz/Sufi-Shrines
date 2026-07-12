/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CSV_URL: string;
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_BEACON_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
