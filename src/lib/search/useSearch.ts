import { useEffect, useRef, useState } from 'react';
import type { Shrine } from '../../types/shrine';
import { getFieldValue } from '../data/fieldAliasing';
import { localizeShrineName } from '../i18n/localizeShrineName';
import { translateNameToUrdu, translateToUrdu } from '../i18n/urduFallback';

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
     * These calls are all dictionary lookups already in memory (urdu-seed.json
     * is a static import). The Urdu *article* prose is deliberately not indexed:
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
  }, [shrines]);

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
