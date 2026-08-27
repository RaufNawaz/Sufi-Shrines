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
function isVerseParagraph(paragraph: string): boolean {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => ARABIC_SCRIPT_CHAR.test(l) && !/^[-*•#]/.test(l));
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
  return (
    <>
      {text
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, i) =>
          isVerseParagraph(paragraph) ? (
            // lang/dir make the couplet an isolated RTL island even when the
            // surrounding article is the English view.
            <blockquote className="article-verse" key={i} lang="ur" dir="rtl">
              {paragraph
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, j) => (
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
