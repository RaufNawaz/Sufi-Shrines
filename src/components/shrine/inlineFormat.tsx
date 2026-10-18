import React from 'react';

// Arabic-script letters, marks, digits and punctuation (Arabic, Arabic
// Supplement, Presentation Forms A and B).
const AR = '\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF';
// The transcription flags a quotation can carry inside it ("بہی[OCR?]",
// "[illegible] پناہ"). Part of the run, so a flagged quotation stays one RTL
// island instead of breaking into pieces laid out in the wrong order.
const FLAG = '\\[(?:OCR\\?|\\?|text-layer\\?|illegible(?::[^\\]]*)?)\\]';
/**
 * An Arabic-script run as it is quoted in Latin prose. It starts and ends on
 * an Arabic-script character (or a flag), so the Latin punctuation AROUND a
 * quotation — the quote marks, the comma after it, the citation's parenthesis —
 * stays outside the isolate and keeps its place in the English sentence.
 *
 * Until 18 October 2026 the run also swallowed the adjacent `"`, `,`, `(` and
 * spaces. Inside an RTL isolate those were reordered and mirrored, so every
 * quotation in the rewritten Descriptions read `,"… کرلی"` with the marks on
 * the wrong sides and an "and" or "(Sharib" pulled into the middle of the
 * Urdu (Rauf, 18 Oct, Bulleh Shah's Sharib paragraph; HANDOVER §9.366).
 */
const ARABIC_SCRIPT_RUN = new RegExp(
  `(?:[${AR}]|${FLAG})(?:(?:[${AR}]|${FLAG}|[\\s.,:;!?()'\\-\u2026/])*(?:[${AR}]|${FLAG}))?`,
  'g',
);
const HAS_ARABIC = new RegExp(`[${AR}]`);

/** Wraps embedded Arabic-script runs in a `<bdi>` carrying `lang="ur"` and the
 * Nastaliq font, so a quoted couplet doesn't silently fall back to a system
 * font when the surrounding page is in English/LTR mode (`--font-urdu` is
 * otherwise only applied under `[dir='rtl']`). A run that is only a flag
 * (an "[OCR?]" after a Latin word) is left as Latin text. */
function wrapArabicScript(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(ARABIC_SCRIPT_RUN)) {
    if (!HAS_ARABIC.test(m[0])) continue;
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <bdi key={`${keyPrefix}-${n++}`} lang="ur" dir="rtl" className="inline-script">
        {m[0]}
      </bdi>,
    );
    last = at + m[0].length;
  }
  if (n === 0) return [text];
  if (last < text.length) out.push(text.slice(last));
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
