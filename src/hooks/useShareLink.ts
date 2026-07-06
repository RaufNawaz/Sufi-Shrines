import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shares a URL via the Web Share API when available, falling back to the
 * clipboard. `copied` flips true for ~2.5s after a successful clipboard
 * fallback so callers can show a confirmation.
 */
export function useShareLink() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const share = useCallback(async (url: string, title?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }, []);

  return { share, copied };
}
