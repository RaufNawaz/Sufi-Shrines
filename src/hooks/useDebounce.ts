import { useEffect, useState } from 'react';

/**
 * Returns `value` once it has stayed unchanged for `delay` ms — a trailing
 * debounce for rapidly-changing state such as search input.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
