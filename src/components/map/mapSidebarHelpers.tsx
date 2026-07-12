/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';

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
