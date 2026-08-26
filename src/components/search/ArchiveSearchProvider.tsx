/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArchiveSearch } from './ArchiveSearch';

/**
 * ⌘K, on the twelve routes that did not have it.
 *
 * `MapSidebar` binds ⌘K and `/` for the map's own palette and has since that
 * palette existed. Everywhere else the shortcut it advertises did nothing, and
 * there was no search control on the page either.
 *
 * This binds the same two keys for the rest of the archive, and **stands down on
 * the map**: two listeners on `document` for the same chord, opening two
 * different overlays, is the kind of thing that works until someone changes
 * either one. The map owns those keys on its own route; this owns them on the
 * others, and `available` tells a header whether to draw a button.
 *
 * The overlay is mounted only while open. That is not tidiness — `ArchiveSearch`
 * starts the shrine search worker and fetches the entity index on mount, and
 * neither should happen on a route where nobody searched.
 */

interface ArchiveSearchApi {
  /** Open the overlay. A no-op on the map, which runs its own. */
  open: () => void;
  /** Whether this route is one this provider serves — the map is not. */
  available: boolean;
}

const ArchiveSearchContext = createContext<ArchiveSearchApi>({
  open: () => {},
  available: false,
});

export function useArchiveSearch(): ArchiveSearchApi {
  return useContext(ArchiveSearchContext);
}

/** The map, in both its plain and its `/ur` crawler-entry form. */
function isMapRoute(pathname: string): boolean {
  const path = pathname.replace(/^\/ur(?=\/|$)/, '') || '/';
  return path === '/' || path === '';
}

export function ArchiveSearchProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const available = !isMapRoute(pathname);
  const [open, setOpen] = useState(false);

  // Leaving the page closes it: a route change behind a modal leaves the reader
  // looking at an overlay onto something else.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!available) return;
    const handler = (event: KeyboardEvent) => {
      const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;
      const isCmdK = (event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K');
      if (!isSlash && !isCmdK) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      /* `/` is a character; never take it from a field someone is typing in.
         ⌘K is not, so it opens from anywhere. Same rule as the map's, on
         purpose — a shortcut that behaves differently per route is worse than
         one that does not exist. */
      if (isSlash && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [available]);

  const api = useMemo<ArchiveSearchApi>(
    () => ({ open: () => setOpen(true), available }),
    [available],
  );
  const close = useCallback(() => setOpen(false), []);

  return (
    <ArchiveSearchContext.Provider value={api}>
      {children}
      {available && open && <ArchiveSearch onClose={close} />}
    </ArchiveSearchContext.Provider>
  );
}
