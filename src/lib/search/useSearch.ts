import { useEffect, useRef, useState } from 'react';
import type { Shrine } from '../../types/shrine';
import { getUrduFieldValue, getFieldValue } from '../data/fieldAliasing';

interface SearchState {
  ids: Set<number> | null; // null = "no query / show all"
  query: string;           // the query that produced `ids`
}

export function useSearch(shrines: Shrine[], query: string): SearchState {
  const workerRef = useRef<Worker | null>(null);
  const callIdRef = useRef(0);
  const pendingRef = useRef<Map<number, (ids: number[]) => void>>(new Map());
  const [state, setState] = useState<SearchState>({ ids: null, query: '' });
  const readyRef = useRef(false);

  // Spin up the worker and index once shrines are available
  useEffect(() => {
    if (!shrines.length) return;

    const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        readyRef.current = true;
      } else if (e.data.type === 'results') {
        const cb = pendingRef.current.get(e.data.reqId);
        if (cb) {
          cb(e.data.ids);
          pendingRef.current.delete(e.data.reqId);
        }
      }
    };

    const docs = shrines.map((s) => ({
      id: s.id,
      name: s.name,
      urduName: getUrduFieldValue(s.raw, 'Name') || '',
      location: s.location || '',
      saint: s.sufiSaint || '',
      category: s.category || '',
      description: getFieldValue(s.raw, 'Description').slice(0, 500), // cap length
    }));
    worker.postMessage({ type: 'init', docs });

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, [shrines]);

  // Issue search queries to the worker, debounced via the parent
  useEffect(() => {
    if (!query.trim()) {
      setState({ ids: null, query });
      return;
    }
    if (!readyRef.current || !workerRef.current) return;

    const id = ++callIdRef.current;
    const capturedId = id;

    workerRef.current.postMessage({ type: 'search', query, reqId: id });

    pendingRef.current.set(id, (ids) => {
      // Ignore stale responses from previous queries
      if (capturedId !== callIdRef.current) return;
      setState({ ids: new Set(ids), query });
    });
  }, [query]);

  return state;
}
