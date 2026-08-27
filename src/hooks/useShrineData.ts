import Papa from 'papaparse';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Shrine, ShrineDataState, ShrineRow } from '../types/shrine';
import { fetchCsvText, takeCsvText } from '../lib/data/csvPrefetch';
import { normalizeRow } from '../lib/data/fieldAliasing';
import { buildShrines } from '../lib/data/shrineModel';
import {
  applyUrduContentOverrides,
  ensureUrduContentForLang,
  onUrduContentLoaded,
} from '../lib/data/urduContentOverride';
import { detectInitialLang } from '../lib/i18n/detectLang';
import { ensureUrduSeedForLang, onUrduSeedLoaded } from '../lib/i18n/urduFallback';

/* v6: `parsedArticle` and `articleSections` came off the model. An older cached
   shape would still *read* fine — extra fields are ignored — but it would keep a
   1,891 KB entry alive for up to an hour, about 40% of which was the article
   parse nothing reads. Bumping trades one re-fetch for a cache less than
   two-thirds the size.
   v5: Shrine gained supportLevel/statusNote and the split date fields. */
const CACHE_KEY = 'shrines_csv_cache_v6';
const CACHE_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

type Source = NonNullable<ShrineDataState['source']>;

interface CacheEntry {
  timestamp: number;
  shrines: Shrine[];
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || !Array.isArray(entry.shrines)) return null;
    return entry;
  } catch {
    return null;
  }
}

function saveCache(shrines: Shrine[]) {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), shrines };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage failures.
  }
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_MAX_AGE_MS;
}

async function loadSnapshot(): Promise<{ shrines: Shrine[]; generated: number | null }> {
  // Dynamic import keeps the ~680 KB fallback out of the eager bundle — it
  // is only needed when both the network and the localStorage cache fail.
  /* Same shape as `fetchShrines`: the snapshot import and both Urdu payloads
     are independent, so they run together rather than one after another. */
  const lang = detectInitialLang();
  const [{ default: snapshotData }] = await Promise.all([
    import('../data/shrines-fallback.json'),
    ensureUrduContentForLang(lang),
    ensureUrduSeedForLang(lang),
  ]);
  const rows = (snapshotData.rows as ShrineRow[]).map(normalizeRow) as ShrineRow[];
  const shrines = buildFromRows(rows);
  const generated = Date.parse(snapshotData.generated as string);
  return { shrines, generated: Number.isFinite(generated) ? generated : null };
}

/**
 * The sheet, and the two Urdu payloads the first build needs.
 *
 * **All three start at once; the build waits for all three.** The invariant is
 * unchanged and is the reason this function ever awaited anything: rows are
 * built exactly once, and the search index is built from them, so an index
 * built before the Urdu dictionary lands has an empty `urduName` on all 169
 * documents — the "Urdu query finds nothing" bug that
 * `e2e/search-bilingual.spec.ts` exists for. The Urdu articles are the same
 * argument for the article text: arriving late means a visible re-render.
 *
 * What changed is that the waiting used to be *serial and in front of the
 * network*: two `await`s, then `Papa.parse(CSV_URL, { download: true })`. So
 * the CSV request — a real round trip to Google in production — could not
 * begin until a 1 MB JSON payload had been fetched *and parsed*. Measured on
 * `/?lang=ur` (Lighthouse, 27 August 2026): **LCP 15.1s, of which 14.6s is
 * render delay, not network.** Starting the download first costs nothing and
 * removes the whole Urdu payload from in front of it.
 *
 * An English reader is unaffected either way — both `ensure…` calls return an
 * already-resolved promise when the language is not Urdu.
 */
async function fetchShrines(): Promise<Shrine[]> {
  const lang = detectInitialLang();
  const urduReady = Promise.all([ensureUrduContentForLang(lang), ensureUrduSeedForLang(lang)]);

  /* The bytes, from `main.tsx`'s prefetch if it is still going spare, otherwise
     a fresh request. `Papa.parse` used to do the download itself
     (`download: true`), and it could not start until React mounted — which on
     `/?lang=ur` was 3,790ms in, because the first render waits for the Urdu
     interface strings. `csvPrefetch` starts it at module scope instead; parsing
     stays here, so the parser stays out of the entry chunk. */
  const parsed = (takeCsvText() ?? fetchCsvText()).then((text) => {
    const results = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return results.data.map(normalizeRow) as ShrineRow[];
  });

  const [rows] = await Promise.all([parsed, urduReady]);
  return buildFromRows(rows);
}

// ── Module-level shared state ────────────────────────────────────────────────
// Without it, every route mount re-read localStorage, rebuilt all shrines,
// fired its own background CSV fetch, and minted a new array identity —
// cascading MiniSearch-worker and map-marker rebuilds on each navigation.

let sharedShrines: Shrine[] | null = null;
let sharedSource: Source | null = null;
let sharedSourceTimestamp: number | null = null;
let sharedFingerprint = '';
let inflightFetch: Promise<Shrine[]> | null = null;
// The rows the current dataset was built from, kept so a mid-session switch to
// Urdu can re-merge the (lazily loaded) Urdu articles without a second fetch.
let sharedRows: ShrineRow[] | null = null;

/** The single place rows become shrines. Also remembers the rows. */
function buildFromRows(rows: ShrineRow[]): Shrine[] {
  sharedRows = rows;
  return buildShrines(applyUrduContentOverrides(rows));
}

/**
 * Re-merge Urdu article content into the dataset already on screen.
 *
 * Needed because `urdu-content.json` is language-gated (see
 * urduContentOverride.ts): a reader who starts in English and switches has
 * shrines that were built before the payload existed. Rebuilding from the
 * remembered rows — or, for a dataset restored from localStorage, from each
 * shrine's own `raw` row — avoids re-fetching the sheet just to change
 * language. The fingerprint is unchanged by the merge (it hashes name,
 * founded and English description length), so a background refresh still
 * recognises a no-op.
 */
function rebuildWithUrduContent(): Shrine[] | null {
  const rows = sharedRows ?? sharedShrines?.map((shrine) => shrine.raw) ?? null;
  if (!rows || rows.length === 0) return null;
  const rebuilt = buildFromRows(rows);
  sharedShrines = rebuilt;
  sharedFingerprint = fingerprintShrines(rebuilt);
  return rebuilt;
}

/** Cheap content fingerprint (count + hash of name/founded/description size)
 * — enough to detect real sheet edits without serializing every row. */
function fingerprintShrines(shrines: Shrine[]): string {
  let hash = 0;
  for (const s of shrines) {
    const key = `${s.name}\0${s.founded}\0${(s.raw.Description ?? '').length}`;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return `${shrines.length}:${hash}`;
}

/** Dedupes concurrent CSV fetches — simultaneous mounts share one request. */
function fetchShrinesShared(): Promise<Shrine[]> {
  if (!inflightFetch) {
    inflightFetch = fetchShrines().finally(() => {
      inflightFetch = null;
    });
  }
  return inflightFetch;
}

function rememberResult(shrines: Shrine[], source: Source, timestamp: number | null = null): void {
  sharedShrines = shrines;
  sharedSource = source;
  sharedSourceTimestamp = timestamp;
  sharedFingerprint = fingerprintShrines(shrines);
}

/** Adopt a fetched CSV result. When nothing actually changed, reuse the
 * previous array identity and skip the localStorage write so downstream
 * consumers (search index, markers) don't rebuild for a no-op refresh. */
function adoptCsvResult(fresh: Shrine[]): Shrine[] {
  if (sharedShrines && fingerprintShrines(fresh) === sharedFingerprint) {
    sharedSource = 'csv';
    sharedSourceTimestamp = null;
    return sharedShrines;
  }
  rememberResult(fresh, 'csv');
  saveCache(fresh);
  return fresh;
}

export function useShrineData(): ShrineDataState {
  const [shrines, setShrines] = useState<Shrine[]>(() => sharedShrines ?? []);
  const [loading, setLoading] = useState(sharedShrines === null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(sharedSource);
  const [sourceTimestamp, setSourceTimestamp] = useState<number | null>(sharedSourceTimestamp);
  // True only once a live fetch has actually failed — NOT during the normal
  // instant-cache-then-background-refresh fast path, so the "showing cached
  // data" banner doesn't flash on every healthy online load.
  const [offline, setOffline] = useState(false);
  const refreshRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const token = ++refreshRef.current;

    /* The page-load request if it is still going spare, otherwise a new one.
       Uniform across all three paths below, because every one of them fetches
       the sheet — the cache and fast paths do it in the background — and the
       prefetch should satisfy whichever gets there first. */
    const nextCsv = () => fetchShrinesShared();

    const applyCsv = (fresh: Shrine[]) => {
      const adopted = adoptCsvResult(fresh);
      if (token !== refreshRef.current) return;
      setShrines(adopted);
      setSource('csv');
      setSourceTimestamp(null);
      setOffline(false);
    };

    // Fast path: a previous mount already built the dataset — reuse it (same
    // array identity) and refresh in the background like the cache path.
    if (sharedShrines && !force) {
      setShrines(sharedShrines);
      setSource(sharedSource);
      setSourceTimestamp(sharedSourceTimestamp);
      setError(null);
      setLoading(false);
      nextCsv()
        .then(applyCsv)
        .catch(() => {
          if (token === refreshRef.current) setOffline(true);
        });
      return;
    }

    setLoading(true);
    setError(null);

    const cached = loadCache();
    if (cached && !force && isFresh(cached)) {
      rememberResult(cached.shrines, 'cache', cached.timestamp);
      setShrines(cached.shrines);
      setSource('cache');
      setSourceTimestamp(cached.timestamp);
      setLoading(false);
      // Still refresh in background
      nextCsv()
        .then(applyCsv)
        .catch(() => {
          if (token === refreshRef.current) setOffline(true);
        });
      return;
    }

    try {
      const fresh = await nextCsv();
      if (token !== refreshRef.current) return;
      applyCsv(fresh);
    } catch (err) {
      if (token !== refreshRef.current) return;
      setOffline(true);
      if (cached) {
        rememberResult(cached.shrines, 'cache', cached.timestamp);
        setShrines(cached.shrines);
        setSource('cache');
        setSourceTimestamp(cached.timestamp);
      } else {
        let fallback: Shrine[] = [];
        let fallbackGenerated: number | null = null;
        try {
          const snapshot = await loadSnapshot();
          fallback = snapshot.shrines;
          fallbackGenerated = snapshot.generated;
        } catch {
          // Snapshot chunk failed to load — fall through to the error state.
        }
        if (token !== refreshRef.current) return;
        if (fallback.length > 0) {
          rememberResult(fallback, 'snapshot', fallbackGenerated);
          setShrines(fallback);
          setSource('snapshot');
          setSourceTimestamp(fallbackGenerated);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load shrine data.');
        }
      }
    } finally {
      if (token === refreshRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // A switch to Urdu loads the article payload (LanguageContext triggers it);
  // adopt the re-merged rows when it lands.
  useEffect(
    () =>
      onUrduContentLoaded(() => {
        const rebuilt = rebuildWithUrduContent();
        if (rebuilt) setShrines(rebuilt);
      }),
    [],
  );

  /* A switch to Urdu also loads the dictionary. The rows themselves do not
     change, but everything derived from them — the localized names, and the
     search index built from those names — does, so the same rebuild is the
     right response. */
  useEffect(
    () =>
      onUrduSeedLoaded(() => {
        const rebuilt = rebuildWithUrduContent();
        if (rebuilt) setShrines(rebuilt);
      }),
    [],
  );

  const refresh = useCallback(() => load(true), [load]);

  return { shrines, loading, error, source, sourceTimestamp, offline, refresh };
}
