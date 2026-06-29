import Papa from 'papaparse';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Shrine, ShrineDataState, ShrineRow } from '../types/shrine';
import { CSV_URL } from '../lib/data/constants';
import { normalizeRow } from '../lib/data/fieldAliasing';
import { buildShrines } from '../lib/data/shrineModel';
import snapshotData from '../data/shrines-fallback.json';

const CACHE_KEY = 'shrines_csv_cache_v2';
const CACHE_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

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

function loadSnapshot(): Shrine[] {
  const rows = (snapshotData.rows as ShrineRow[]).map(normalizeRow) as ShrineRow[];
  return buildShrines(rows);
}

async function fetchShrines(): Promise<Shrine[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map(normalizeRow) as ShrineRow[];
        resolve(buildShrines(rows));
      },
      error: reject,
    });
  });
}

export function useShrineData(): ShrineDataState {
  const [shrines, setShrines] = useState<Shrine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'csv' | 'cache' | 'snapshot' | null>(null);
  const refreshRef = useRef(0);

  const load = useCallback(async (force = false) => {
    const token = ++refreshRef.current;
    setLoading(true);
    setError(null);

    const cached = loadCache();
    if (cached && !force) {
      if (isFresh(cached)) {
        if (token !== refreshRef.current) return;
        setShrines(cached.shrines);
        setSource('cache');
        setLoading(false);
        // Still refresh in background
        fetchShrines()
          .then((fresh) => {
            if (token !== refreshRef.current) return;
            setShrines(fresh);
            setSource('csv');
            saveCache(fresh);
          })
          .catch(() => {
            // Background refresh failed — cached data still shown, no error.
          });
        return;
      }
    }

    try {
      const fresh = await fetchShrines();
      if (token !== refreshRef.current) return;
      setShrines(fresh);
      setSource('csv');
      saveCache(fresh);
    } catch (err) {
      if (token !== refreshRef.current) return;
      if (cached) {
        setShrines(cached.shrines);
        setSource('cache');
      } else {
        const fallback = loadSnapshot();
        if (fallback.length > 0) {
          setShrines(fallback);
          setSource('snapshot');
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

  const refresh = useCallback(() => load(true), [load]);

  return { shrines, loading, error, source, refresh };
}
