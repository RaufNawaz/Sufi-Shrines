import React from 'react';

// A run of two or more Arabic-script characters (covers Urdu/Persian/Arabic
// text quoted verbatim in otherwise-Latin prose — e.g. a couplet embedded in
// an English Description), plus immediately-adjacent spaces/punctuation so the
// isolated run reads naturally. Arabic block + Arabic Supplement.
const ARABIC_SCRIPT_RUN = /[\s.,:;!?()"'-]*[؀-ۿݐ-ݿ][؀-ۿݐ-ݿ\s.,:;!?()"'-]*/g;

/** Wraps embedded Arabic-script runs in a `<bdi>` carrying `lang="ur"` and the
 * Nastaliq font, so a quoted couplet doesn't silently fall back to a system
 * font when the surrounding page is in English/LTR mode (`--font-urdu` is
 * otherwise only applied under `[dir='rtl']`). */
function wrapArabicScript(text: string, keyPrefix: string): React.ReactNode[] {
  const segments = text.split(ARABIC_SCRIPT_RUN);
  const matches = text.match(ARABIC_SCRIPT_RUN) ?? [];
  if (matches.length === 0) return [text];
  const out: React.ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg) out.push(seg);
    if (matches[i]) {
      out.push(
        <bdi key={`${keyPrefix}-${i}`} lang="ur" className="inline-script">
          {matches[i]}
        </bdi>
      );
    }
  });
  return out;
}

/**
 * Narrow inline-emphasis renderer: turns **text** into <strong>text</strong>
 * and *text* into <em>text</em>. Deliberately not a general markdown parser —
 * these are the only two patterns it understands. Any unpaired stray "*"/"**"
 * (a typo in the sheet) is stripped rather than shown literally to readers.
 * Embedded Arabic-script runs (inside any segment) are additionally isolated
 * via {@link wrapArabicScript} so they render in the Urdu font.
 */
export function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.flatMap((part, i): React.ReactNode[] => {
    const boldMatch = /^\*\*([^*]+)\*\*$/.exec(part);
    if (boldMatch) return [<strong key={i}>{wrapArabicScript(boldMatch[1], `b${i}`)}</strong>];
    const italicMatch = /^\*([^*]+)\*$/.exec(part);
    if (italicMatch) return [<em key={i}>{wrapArabicScript(italicMatch[1], `i${i}`)}</em>];
    const plain = part.includes('*') ? part.replace(/\*+/g, '') : part;
    return wrapArabicScript(plain, `p${i}`);
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
