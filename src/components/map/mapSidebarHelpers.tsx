/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';

/**
 * Re-orders `items` to match the rank of `rankedIds` (best match first,
 * per MiniSearch's own ordering) — items whose id isn't in `rankedIds`
 * sort last, after everything that is. Does not mutate `items`.
 */
export function sortByRank<T extends { id: number }>(items: T[], rankedIds: number[]): T[] {
  const rank = new Map<number, number>();
  rankedIds.forEach((id, i) => rank.set(id, i));
  return [...items].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-match">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export function ShrineListSkeleton() {
  return (
    <div className="shrine-list-panel" aria-hidden="true" aria-busy="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="shrine-list-item shrine-list-item--skeleton">
          <div className="shrine-list-thumb-slot skeleton" />
          <div className="shrine-list-info">
            <div className="skeleton skeleton-list-name" />
            <div className="skeleton skeleton-list-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}
