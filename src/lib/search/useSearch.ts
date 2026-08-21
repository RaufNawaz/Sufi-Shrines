import { useEffect, useRef, useState } from 'react';
import type { Shrine } from '../../types/shrine';
import { getFieldValue } from '../data/fieldAliasing';
import { localizeShrineName } from '../i18n/localizeShrineName';
import {
  translateNameToUrdu,
  translateToUrdu,
  isUrduSeedLoaded,
  loadUrduSeed,
  onUrduSeedLoaded,
} from '../i18n/urduFallback';

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
     * These are dictionary lookups, and the dictionary is now loaded on demand
     * (see the header of urduFallback.ts). This effect re-runs on `dictGen`, so
     * the index is rebuilt with real Urdu fields the moment it arrives — for an
     * Urdu reader that is before the first keystroke, and for an English reader
     * it is triggered by typing Urdu. The Urdu *article* prose is deliberately
     * not indexed:
     * it is a 1 MB lazily-loaded chunk (see urduContentOverride.ts) and pulling
     * it in here would put it back on every route's critical path.
     */
    const docs = shrines.map((s) => ({
      id: s.id,
      name: s.name,
      urduName: localizeShrineName(s, 'ur'),
      location: s.location || '',
      urduLocation: s.location ? translateToUrdu(s.location) : '',
      saint: s.sufiSaint || '',
      urduSaint: s.sufiSaint ? translateNameToUrdu(s.sufiSaint) : '',
      category: s.category || '',
      urduCategory: s.category ? translateToUrdu(s.category) : '',
      description: getFieldValue(s.raw, 'Description').slice(0, 500), // cap length
    }));
    worker.postMessage({ type: 'init', docs });

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
