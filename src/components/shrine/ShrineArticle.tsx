import React from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { useReveal } from '../../lib/useReveal';
import { ShrineGallery } from './ShrineGallery';
import { anchorSlug, useArticleContent } from './useArticleContent';
import { localizeHeading } from '../../lib/data/headingLabels';
import { renderInlineBold } from './inlineFormat';
import { SOURCES_HEADING_ALIASES } from '../../lib/data/constants';
import { localizeProseDigits } from '../../lib/i18n/numerals';

/** Source lines are often hand-authored with their own "- " / "* " marker —
 * strip it so the real <li> bullet doesn't double up with a literal one. */
function stripLeadingListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, '');
}

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
function ProseParagraphs({ text, localize }: { text: string; localize: (t: string) => string }) {
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

function ArticleSection({
  id,
  heading,
  content,
  isSources = false,
}: {
  id: string;
  heading: string;
  content: string;
  isSources?: boolean;
}) {
  const { lang, numerals } = useLang();
  // Dates inside translated article text were the one place Eastern numerals
  // never reached, so Urdu prose read "1873–1966" mid-Nastaliq. URLs, DOIs
  // and ISBNs keep their Western digits — see localizeProseDigits.
  const localize = (text: string) => localizeProseDigits(text, lang, numerals === 'eastern');

  const revealRef = useReveal<HTMLElement>();

  return (
    <section ref={revealRef} className="article-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="article-section-heading" id={`${id}-heading`}>
        {heading}
      </h2>
      {isSources ? (
        <ul className="article-prose article-sources-list">
          {content
            .split('\n')
            .map((line) => stripLeadingListMarker(line.trim()))
            .filter(Boolean)
            .map((line, i) => (
              <li key={i}>{renderInlineBold(localize(line))}</li>
            ))}
        </ul>
      ) : (
        <div className="article-prose">
          <ProseParagraphs text={content} localize={localize} />
        </div>
      )}
    </section>
  );
}

interface Props {
  shrine: Shrine;
}

export function ShrineArticle({ shrine }: Props) {
  const { lang, numerals } = useLang();
  const { leadText, inlineSections, uniqueColumnSections, rawFallback } = useArticleContent(shrine);
  // The lead and the raw-Description fallback bypass ArticleSection, so they
  // were the two remaining prose paths where Urdu still showed Western
  // digits (rule 5: fmtNum/localized digits at every number render site).
  const localize = (text: string) => localizeProseDigits(text, lang, numerals === 'eastern');

  return (
    <div>
      {leadText && (
        <section
          className="article-section article-lead"
          id="overview"
          aria-labelledby="overview-heading"
        >
          <div className="article-prose">
            <ProseParagraphs text={leadText} localize={localize} />
          </div>
        </section>
      )}

      {inlineSections.map((section) => {
        const id = anchorSlug(section.heading);
        return (
          <ArticleSection
            key={id}
            id={id}
            heading={localizeHeading(section.heading, lang)}
            content={section.content}
            isSources={SOURCES_HEADING_ALIASES.has(section.heading.trim().toLowerCase())}
          />
        );
      })}

      {uniqueColumnSections.map((section) => (
        <ArticleSection
          key={section.id}
          id={section.id}
          heading={section.title[lang] || section.title.en}
          content={section.content}
          isSources={section.id === 'sources'}
        />
      ))}

      {rawFallback && (
        <section className="article-section" id="description" aria-labelledby="description-heading">
          <div className="article-prose">
            <ProseParagraphs text={rawFallback} localize={localize} />
          </div>
        </section>
      )}

      <ShrineGallery items={shrine.gallery} category={shrine.category} />
    </div>
  );
}
