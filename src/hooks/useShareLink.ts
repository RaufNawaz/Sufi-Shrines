import { useCallback, useEffect, useRef, useState } from 'react';

interface UseShareLinkOptions {
  /** How long `copied` stays true after a clipboard copy (default 2500 ms). */
  copiedMs?: number;
}

interface ShareExtras {
  /** Included as ShareData.text when provided (e.g. "Name — coords"). */
  text?: string;
  /** Clipboard-fallback payload when it differs from the URL (e.g. coords). */
  clipboardText?: string;
}

/**
 * Shares a URL via the Web Share API when available, falling back to the
 * clipboard. `copied` flips true for ~2.5s (configurable via `copiedMs`)
 * after a successful clipboard copy so callers can show a confirmation.
 * `copy` writes arbitrary text directly, with a hidden-textarea fallback
 * for browsers without the async clipboard API.
 */
export function useShareLink(options?: UseShareLinkOptions) {
  const copiedMs = options?.copiedMs ?? 2500;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), copiedMs);
      } catch {
        // clipboard unavailable — nothing more we can do
      }
    },
    [copiedMs],
  );

  const share = useCallback(
    async (url: string, title?: string, extras?: ShareExtras) => {
      if (navigator.share) {
        try {
          // Spread optional fields conditionally: exactOptionalPropertyTypes
          // forbids passing an explicit `undefined` for ShareData's optionals.
          await navigator.share({
            url,
            ...(title !== undefined ? { title } : {}),
            ...(extras?.text !== undefined ? { text: extras.text } : {}),
          });
          return;
        } catch {
          // user cancelled or share failed — fall through to clipboard
        }
      }
      await copy(extras?.clipboardText ?? url);
    },
    [copy],
  );

  return { share, copy, copied };
}
