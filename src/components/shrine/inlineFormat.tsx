import React from 'react';

/**
 * Narrow inline-bold renderer: turns **text** into <strong>text</strong>.
 * Deliberately not a general markdown parser — this is the only pattern it
 * understands. Any unpaired stray "**" (a typo in the sheet) is stripped
 * rather than shown literally to readers.
 */
export function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) return <strong key={i}>{match[1]}</strong>;
    return part.includes('**') ? part.replace(/\*\*/g, '') : part;
  });
}

/** Plain-text counterpart of {@link renderInlineBold} for contexts that
 * can't hold JSX (e.g. an aria-label). */
export function stripInlineBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*\*/g, '');
}
