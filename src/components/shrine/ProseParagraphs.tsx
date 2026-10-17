import React from 'react';
import { renderInlineBold } from './inlineFormat';

/**
 * The archive's prose, rendered.
 *
 * Extracted from `ShrineArticle` when the figure pages started showing an
 * entry's biographical section (A10): the two surfaces print the same recorded
 * markdown, and a second copy of the verse rule would have been a second place
 * for it to be wrong. It lives here rather than being exported from
 * `ShrineArticle` because that module carries the whole shrine article with it,
 * and the figure page needs eleven lines of it.
 */
const ARABIC_SCRIPT_CHAR = /[\u0600-\u06FF\u0750-\u077F]/;

/** A couplet quoted in the prose: a paragraph whose single newlines separate
 * hemistichs, every line Arabic-script verse (never a list/heading marker).
 * Measured over the whole dataset (docs/FRONTEND_NOTES.md §8a): every
 * multi-line paragraph that isn't a list or a "## " heading is one of these,
 * so the rule has no false positives to guard against today. */
function isVerseParagraph(paragraph: string, inLatinProse: boolean): boolean {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return lines.every((l) => ARABIC_SCRIPT_CHAR.test(l) && !/^[-*•#]/.test(l));
  }
  /* A one-line quotation — Bulleh Shah's "بُلھیا! کی جاݨاں میں کوݨ", Lal
     Shahbaz's "حیدریم قلندرم مستم ٭ …" — was set as an LTR prose paragraph
     flush left, while two-line couplets on the same page were centred as verse:
     14 of the archive's 27 verse quotations (reading council, 17 October 2026).
     Only inside Latin prose: in the Urdu view every paragraph is Arabic script,
     and there a lone line is prose until something says otherwise. */
  const [line] = lines;
  return (
    inLatinProse &&
    line !== undefined &&
    line.length <= 160 &&
    ARABIC_SCRIPT_CHAR.test(line) &&
    !/[A-Za-z]/.test(line) &&
    !/^[-*•#]/.test(line)
  );
}

/** A verse paragraph's hemistichs: its lines, or a one-line couplet's halves
 *  split at the ٭ the sources use between them. */
function verseLines(paragraph: string): string[] {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return lines[0]!
    .split(/\s*٭\s*/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Shared paragraph renderer for the lead, sections and the raw fallback:
 * plain paragraphs as <p>, couplets as a centred verse block with one line
 * per hemistich — previously the single newlines collapsed and verse ran on
 * as prose. */
export function ProseParagraphs({
  text,
  localize,
}: {
  text: string;
  localize: (t: string) => string;
}) {
  const inLatinProse = /[A-Za-z]/.test(text);
  return (
    <>
      {text
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, i) =>
          isVerseParagraph(paragraph, inLatinProse) ? (
            // lang/dir make the couplet an isolated RTL island even when the
            // surrounding article is the English view.
            <blockquote className="article-verse" key={i} lang="ur" dir="rtl">
              {verseLines(paragraph).map((line, j) => (
                <span className="article-verse-line" key={j}>
                  {renderInlineBold(localize(line))}
                </span>
              ))}
            </blockquote>
          ) : (
            <p key={i}>{renderInlineBold(localize(paragraph))}</p>
          ),
        )}
    </>
  );
}
