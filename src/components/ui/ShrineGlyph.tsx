import React from 'react';

/**
 * The archive's mark, used in branding and image placeholders: the eight-pointed
 * kashi tile star with a pierced centre (docs/REDESIGN_2026-11.md). Until
 * 8 November 2026 it was a shrine pictogram, which is still the source of the
 * PWA icons (scripts/generate-icons.mjs) — regenerate those if this ships.
 */
export function ShrineGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="5 5 30 30"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6L24.1 10.1H29.9V15.9L34 20L29.9 24.1V29.9H24.1L20 34L15.9 29.9H10.1V24.1L6 20L10.1 15.9V10.1H15.9ZM20 15.8a4.2 4.2 0 1 0 0 8.4a4.2 4.2 0 1 0 0-8.4Z" />
    </svg>
  );
}
