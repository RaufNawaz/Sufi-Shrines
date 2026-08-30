import { useEffect, useRef, useState } from 'react';
import type { Shrine } from '../../types/shrine';
import { buildSearchDocs } from './searchDocs';
import { isUrduSeedLoaded, loadUrduSeed, onUrduSeedLoaded } from '../i18n/urduFallback';

interface SearchState {
  ids: number[] | null; // null = "no query / show all"; otherwise ranked best-match-first
  query: string; // the query that produced `ids`
}

export function useSearch(shrines: Shrine[], query: string): SearchState {
  const workerRef = useRef<Worker | null>(null);
  const callIdRef = useRef(0);
  const pendingRef = useRef<Map<number, (ids: number[]) => void>>(new Map());
  const [state, setState] = useState<SearchState>({ ids: null, query: '' });
  // Readiness is state (not a ref) so a query typed before the index finished
  // building is re-issued once it becomes ready; the generation counter does
  // the same for queries that were active across a worker rebuild.
  const [ready, setReady] = useState(false);
  const [workerGen, setWorkerGen] = useState(0);
  /* Bumped when the Urdu dictionary arrives, which re-runs the indexing effect
     below. The index is built from dictionary lookups, so an index built before
     the dictionary lands has an empty urduName for every document. */
  const [dictGen, setDictGen] = useState(() => (isUrduSeedLoaded() ? 1 : 0));

  /*
   * An Urdu query in the *English* interface.
   *
   * The worker indexes both scripts for every field on purpose — a reader in
   * the English interface may well paste an Urdu name they saw in a citation.
   * That used to be free, because the dictionary was a static import on every
   * route. Now that an English reader does not download it, the promise has to
   * be kept explicitly: the moment a query contains Urdu letters, fetch the
   * dictionary and rebuild the index.
   *
   * An English reader who never types Urdu still ships none of it, which is the
   * whole point of the gate. The cost is that the *first* Urdu query in an
   * English session waits one chunk request; every later one is instant.
   */
  useEffect(() => {
    if (isUrduSeedLoaded() || !/[\u0600-\u06FF]/.test(query)) return;
    void loadUrduSeed();
  }, [query]);

  useEffect(() => onUrduSeedLoaded(() => setDictGen((g) => g + 1)), []);

  // Spin up the worker and index once shrines are available
  useEffect(() => {
    if (!shrines.length) return;

    const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const pending = pendingRef.current;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        setReady(true);
        setWorkerGen((g) => g + 1);
      } else if (e.data.type === 'results') {
        const cb = pendingRef.current.get(e.data.reqId);
        if (cb) {
          cb(e.data.ids);
          pendingRef.current.delete(e.data.reqId);
        }
      }
    };

    /*
     * The Urdu fields come from the dictionary — the same source the UI
     * displays — not from a sheet column.
     *
     * `urduName` was `getUrduFieldValue(s.raw, 'Name')`, i.e. an "Urdu Name"
     * column. **The sheet has no Urdu column at all**, so that was the empty
     * string for all 169 rows: the boosted urduName field indexed nothing and
     * an Urdu query on the Urdu site returned zero results. A reader looking at
     * an entirely Urdu interface, with an Urdu placeholder in the search box,
     * had to type English to find anything.
     *
     * Everything needed was already there and correct — the worker folds Arabic
     * letter variants to Urdu ones, strips harakat, boosts urduName to 4, and
     * has unit tests for `داتا دربار`. Those tests build their own index from
     * hand-written docs, so they passed while production indexed empty strings.
     *
     * The mapping itself lives in `searchDocs.ts` — one builder, the one its
     * tests cover. It was inlined here as well until 30 August 2026, and the
     * copies had drifted: this one indexed the *English* string in every Urdu
     * field whenever the dictionary had not loaded, which the module's guard
     * exists to prevent. See HANDOVER §9.146.
     *
     * These are dictionary lookups, and the dictionary is now loaded on demand
     * (see the header of urduFallback.ts). This effect re-runs on `dictGen`, so
     * the index is rebuilt with real Urdu fields the moment it arrives — for an
     * Urdu reader that is before the first keystroke, and for an English reader
     * it is triggered by typing Urdu. The Urdu *article* prose is deliberately
     * not indexed:
     * it is a 1 MB lazily-loaded chunk (see urduContentOverride.ts) and pulling
     * it in here would put it back on every route's critical path.
     */
    /* Built here, in this tick, and measured rather than assumed: on a
       production build at 4× CPU and slow 4G this is **14ms, once**, about 48ms
       before the first marker appears at ~2.4s. Deferring it to
       `requestIdleCallback` was written, built and measured — five runs each
       way — and moved the median time-to-first-marker by 29ms against a spread
       of ~100ms, which is nothing. It is not deferred because there is nothing
       to defer.

       The number that suggested otherwise came from the **dev server**: 59ms,
       then 34ms, on two passes. Dev ships hundreds of unbundled modules and is
       a different program — the same warning `scripts/measure-blocking.mjs`
       carries in its header, and it applies to application code and not only to
       chunk evaluation. */
    worker.postMessage({ type: 'init', docs: buildSearchDocs(shrines) });

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      // Callbacks for the terminated worker can never resolve — drop them.
      pending.clear();
    };
  }, [shrines, dictGen]);

  // Issue search queries to the worker, debounced via the parent
  useEffect(() => {
    if (!query.trim()) {
      setState({ ids: null, query });
      return;
    }
    if (!ready || !workerRef.current) return;

    const id = ++callIdRef.current;
    const capturedId = id;

    workerRef.current.postMessage({ type: 'search', query, reqId: id });

    pendingRef.current.set(id, (ids) => {
      // Ignore stale responses from previous queries
      if (capturedId !== callIdRef.current) return;
      setState({ ids, query });
    });
  }, [query, ready, workerGen]);

  return state;
}
