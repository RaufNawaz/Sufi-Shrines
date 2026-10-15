import React from 'react';

/**
 * A lead paragraph's `*italics*` as italics.
 *
 * The Description column is markdown, and the sheet italicises terms —
 * `*tehsil*`, `*ʿurs*` — which the two preview surfaces printed with their
 * asterisks, because they show a plain-text lead rather than running the
 * article renderer. This is the one inline mark those leads carry; the text is
 * otherwise left exactly as written (CLAUDE.md: never strip or normalise the
 * markdown — this renders it).
 */
export function InlineEmphasis({ text }: { text: string }) {
  const parts = text.split(/\*([^*\n]+)\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <em key={i}>{part}</em> : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
    </>
  );
}
