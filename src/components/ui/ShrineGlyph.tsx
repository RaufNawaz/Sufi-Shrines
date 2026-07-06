import React from 'react';

/**
 * The shrine/mosque glyph used in branding and image placeholders.
 * The same path is the source for the PWA icons (scripts/generate-icons.mjs).
 */
export function ShrineGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
    </svg>
  );
}
