import Papa from 'papaparse';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Shrine, ShrineDataState, ShrineRow } from '../types/shrine';
import { fetchCsvText, takeCsvText } from '../lib/data/csvPrefetch';
import { getFieldValue, normalizeRow } from '../lib/data/fieldAliasing';
import { buildShrines } from '../lib/data/shrineModel';
import {
  applyUrduContentOverrides,
  isUrduContentLoaded,
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
    ensureUrduSeedForLang(lang),
  ]);
  const rows = (snapshotData.rows as ShrineRow[]).map(normalizeRow) as ShrineRow[];
  const shrines = buildFromRows(rows);
  const generated = Date.parse(snapshotData.generated as string);
  return { shrines, generated: Number.isFinite(generated) ? generated : null };
}

/**
 * The slim index: enough to draw the map, while the sheet is still arriving.
 *
 * ## The measurement this exists for
 *
 * On a phone at slow 4G with a 4× CPU throttle, the first marker took
 * **5,059 ms** against a 1,200 ms first contentful paint. Nothing was slow
 * about the request: the sheet is 837 KB, of which **672 KB (80.3%) is
 * `Description`** — article prose the map never renders. The four fields a pin
 * actually needs are 12 KB, 1.4% of the payload. The front door was spending
 * its entire data budget on content that route does not show.
 *
 * `src/data/shrines-index.json` is ten columns and ~13 KB gzipped against the
 * CSV's 295 KB. It carries `Image 1`, `Location` and both provenance badges as
 * well as the map's four, because the sidebar renders those — an index without
 * them would paint 169 photo-less cards and then pop 118 photographs in, which
 * is a worse "fills in a second later" than the one it was meant to prevent.
 *
 * ## Why it is not simply the fallback snapshot
 *
 * Measured, because it was the obvious first idea: `shrines-fallback.json` is
 * **294 KB gzipped** and the live CSV is **295 KB**. Serving the snapshot first
 * transfers the same bytes and buys only a warm same-origin connection. The
 * saving here comes from the payload being small, not from it being local.
 *
 * ## What a consumer must not do with it
 *
 * These rows have **no `Description`**, so anything rendering article prose has
 * to keep waiting — `ShrinePage` checks `source === 'index'` and holds its
 * skeleton. The rows are not partial *shrines*; they are complete for the ten
 * fields they carry and silent about the rest, and the distinction matters: a
 * page that renders an empty article reads as a broken record rather than as a
 * loading one.
 */
async function loadIndex(): Promise<Shrine[]> {
  const lang = detectInitialLang();
  const [{ default: indexData }] = await Promise.all([
    import('../data/shrines-index.json'),
    ensureUrduSeedForLang(lang),
  ]);
  const rows = (indexData.rows as ShrineRow[]).map(normalizeRow) as ShrineRow[];
  /* Not remembered here — only in the `csvLanded` guard below, once this has
     actually won the race. See buildFromRows. */
  return buildFromRows(rows, false);
}

/**
 * The sheet, and the two Urdu payloads the first build needs.
 *
 * **Both start at once; the build waits for both.** The invariant is unchanged
 * and is the reason this function ever awaited anything: rows are built exactly
 * once, and the search index is built from them, so an index built before the
 * Urdu dictionary lands has an empty `urduName` on all 169 documents — the
 * "Urdu query finds nothing" bug that `e2e/search-bilingual.spec.ts` exists for.
 *
 * **It was three, and the Urdu *articles* are no longer among them.** They were
 * awaited on the same argument — arriving late means a visible re-render — and
 * the cost of applying that argument here was that every Urdu route, the map
 * and the calendar included, downloaded 258,872 gzipped bytes of shrine prose
 * that nothing on those routes reads. The three surfaces that do read it ask
 * for it themselves now (`useUrduArticles`), and the re-render argument is
 * answered where it actually applies: each of those surfaces renders a truthful
 * empty rather than English until the payload lands, and
 * `onUrduContentLoaded` below re-merges the rows already on screen.
 * `docs/planning/URDU_ARTICLE_PAYLOAD.md` carries the measurements.
 *
 * What changed is that the waiting used to be *serial and in front of the
 * network*: two `await`s, then `Papa.parse(CSV_URL, { download: true })`. So
 * the CSV request — a real round trip to Google in production — could not
 * begin until a 1 MB JSON payload had been fetched *and parsed*. Measured on
 * `/?lang=ur` (Lighthouse, 27 August 2026): **LCP 15.1s, of which 14.6s is
 * render delay, not network.** Starting the download first costs nothing and
 * removes the whole Urdu payload from in front of it.
 *
 * An English reader is unaffected either way — `ensureUrduSeedForLang` returns
 * an already-resolved promise when the language is not Urdu.
 */
async function fetchShrines(): Promise<Shrine[]> {
  const lang = detectInitialLang();
  const urduReady = ensureUrduSeedForLang(lang);

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

/**
 * The single place rows become shrines. Also remembers the rows — except for
 * the slim index, which remembers them only if it wins the race.
 *
 * `remember` exists because of a bug the `csvLanded` guard below *looks* like it
 * already covers and does not. That guard stops a late index overwriting real
 * data on screen; it cannot stop `loadIndex` reaching this function first, and
 * this function is where `sharedRows` is set. So a late index left the ten
 * column index rows remembered underneath a full CSV dataset — harmless until
 * something rebuilt from them.
 *
 * `rebuildWithUrduContent` is that something, and after the Urdu article payload
 * stopped being awaited by every loader (30 August 2026) it became reachable on
 * the ordinary path: the payload lands, the rows are re-merged **from the index**
 * and the CSV dataset is replaced by a downgraded one. Measured on the hermetic
 * fixture, `/shrine/data-darbar?lang=ur` against the same page in English:
 * **1 infobox row against 7, and 1 gallery tile against 2**, permanently, while
 * the article read correctly because its prose comes from the Urdu payload
 * rather than from the sheet. Nothing threw; four lightbox cases and one infobox
 * case failed in Urdu and passed in English, which is what pointed at it.
 */
function buildFromRows(rows: ShrineRow[], remember = true): Shrine[] {
  if (remember) sharedRows = rows;
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
 * language.
 *
 * This used to add: "the fingerprint is unchanged by the merge, so a background
 * refresh still recognises a no-op." That was true, and it was the bug — see
 * `fingerprintShrines`.
 */
function rebuildWithUrduContent(): Shrine[] | null {
  const rows = sharedRows ?? sharedShrines?.map((shrine) => shrine.raw) ?? null;
  if (!rows || rows.length === 0) return null;
  const rebuilt = buildFromRows(rows);
  sharedShrines = rebuilt;
  sharedFingerprint = fingerprintShrines(rebuilt);
  return rebuilt;
}

/**
 * Cheap content fingerprint — enough to detect real sheet edits without
 * serializing every row.
 *
 * ## Why the Urdu description length is in the key
 *
 * It hashed name, founded and the **English** description length only, and
 * `applyUrduContentOverrides` changes none of those three: it writes
 * `Description Urdu` and the per-section Urdu fields onto the row. So an
 * Urdu-merged dataset and the English dataset it was merged from fingerprinted
 * **identically**, and `adoptCsvResult` — whose whole job is to treat an equal
 * fingerprint as "nothing changed, keep what we have" — kept the English one
 * and discarded the freshly-merged Urdu one.
 *
 * What that cost a reader, measured on 30 August 2026 across a 12-entry sample:
 * **9 rendered a different article after an English visit, and 8 of those
 * rendered materially more English** — the Latin share of the article body
 * going from 6–20% on a clean start to 45–79% after browsing the English map
 * first. `shrine-of-shah-yusaf-gardez` went 8% → 53%, `kali-bari-mandir`
 * 0% → 70%. It is a state, not a flash: the page is still English seconds
 * later, and it reproduces after an English *map* visit alone, so it reached
 * every shared link, bookmark and hard refresh a reader opened after browsing
 * in English.
 *
 * Adding the Urdu length is deliberately narrower than a generation counter.
 * An English reader never loads the payload, so their term is a constant 0 and
 * a genuine no-op refresh is still recognised as one — no search-index or
 * marker rebuild. An Urdu reader gets a fingerprint that differs from the
 * English dataset's and matches another Urdu-merged one, which is exactly the
 * distinction `adoptCsvResult` needs and never had.
 */
/* Exported for `__tests__/datasetFingerprint.test.ts` only. The invariant it
   holds — that a merged dataset never fingerprints as its English source — is
   not reachable through the hook without standing up a fetch, a cache and a
   payload, and a test that elaborate would be testing the scaffold. */
export function fingerprintShrines(shrines: Shrine[]): string {
  let hash = 0;
  for (const s of shrines) {
    const key =
      `${s.name}\0${s.founded}\0${(s.raw.Description ?? '').length}` +
      `\0${getFieldValue(s.raw, 'Description Urdu').length}`;
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

/**
 * Adopt a fetched CSV result. When nothing actually changed, reuse the previous
 * array identity and skip the localStorage write so downstream consumers
 * (search index, markers) don't rebuild for a no-op refresh.
 *
 * ## Why it re-merges before comparing
 *
 * `fetchShrines` awaits the Urdu *seed* (`ensureUrduSeedForLang`) but not the
 * Urdu *article payload*, and `applyUrduContentOverrides` is a no-op until that
 * payload resolves. So a CSV that lands first is built English-only, and it can
 * arrive after `rebuildWithUrduContent` has already merged the dataset on
 * screen — at which point adopting it verbatim replaces a merged dataset with
 * the English one it was merged from.
 *
 * That race was *masked* while the fingerprint ignored Urdu: the two sides
 * compared equal, so the stale result was discarded as a no-op by accident.
 * Teaching the fingerprint to see Urdu (above) fixed the common case and would
 * have opened this one, which is why the two changes belong in one commit. It
 * showed up as a residue that flipped between runs — `shrine-of-miran-hussain`
 * English in one pass and correct in the next — rather than as a clean failure.
 *
 * Rebuilding from the rows against the *current* payload state removes the race
 * rather than re-hiding it: whatever the CSV was built with, what gets adopted
 * reflects what is loaded now. It costs one rebuild of ~170 rows on a refresh
 * that was already going to compare them, and when nothing changed the
 * fingerprint still matches and the previous array identity is still returned.
 */
function adoptCsvResult(fresh: Shrine[]): Shrine[] {
  const current = isUrduContentLoaded() ? buildFromRows(fresh.map((shrine) => shrine.raw)) : fresh;
  if (sharedShrines && fingerprintShrines(current) === sharedFingerprint) {
    sharedSource = 'csv';
    sharedSourceTimestamp = null;
    return sharedShrines;
  }
  rememberResult(current, 'csv');
  saveCache(current);
  return current;
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

    /* Nothing cached: draw the archive from the slim index while the sheet is
       in flight, rather than showing an empty map for three and a half seconds.
       Started before the CSV is awaited and applied only if it wins the race —
       a late index must never overwrite real data, which is what `csvLanded`
       guards. Failure here is silent on purpose: the index is an optimisation,
       and the CSV (or, if that fails too, the snapshot) is still the answer. */
    let csvLanded = false;
    if (!force) {
      void loadIndex()
        .then((rows) => {
          if (csvLanded || token !== refreshRef.current || rows.length === 0) return;
          rememberResult(rows, 'index', null);
          /* The index won, so its rows are the dataset a later re-merge should
             rebuild from. Set here rather than in `buildFromRows`, which runs
             before this guard and cannot know whether the CSV beat it. */
          sharedRows = rows.map((shrine) => shrine.raw);
          setShrines(rows);
          setSource('index');
          setSourceTimestamp(null);
          setLoading(false);
        })
        .catch(() => {
          /* The sheet is still coming. */
        });
    }

    try {
      const fresh = await nextCsv();
      csvLanded = true;
      if (token !== refreshRef.current) return;
      applyCsv(fresh);
    } catch (err) {
      csvLanded = true;
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
