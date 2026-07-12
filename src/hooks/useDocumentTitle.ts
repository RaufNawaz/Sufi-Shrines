import { useEffect } from 'react';

/**
 * Sets `document.title` on mount and whenever it changes. Pass a falsy title
 * to leave the current one untouched (e.g. while the entity is still loading).
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);
}
