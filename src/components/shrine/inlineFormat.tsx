import React from 'react';

/**
 * Narrow inline-emphasis renderer: turns **text** into <strong>text</strong>
 * and *text* into <em>text</em>. Deliberately not a general markdown parser —
 * these are the only two patterns it understands. Any unpaired stray "*"/"**"
 * (a typo in the sheet) is stripped rather than shown literally to readers.
 */
export function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const boldMatch = /^\*\*([^*]+)\*\*$/.exec(part);
    if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>;
    const italicMatch = /^\*([^*]+)\*$/.exec(part);
    if (italicMatch) return <em key={i}>{italicMatch[1]}</em>;
    return part.includes('*') ? part.replace(/\*+/g, '') : part;
  });
}

/** Plain-text counterpart of {@link renderInlineBold} for contexts that
 * can't hold JSX (e.g. an aria-label). */
export function stripInlineBoldMarkup(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\*+/g, '');
}
