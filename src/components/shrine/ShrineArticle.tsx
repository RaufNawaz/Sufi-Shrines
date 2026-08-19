import React from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
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

  return (
    <section className="article-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="article-section-heading" id={`${id}-heading`}>
        {heading}
      </h2>
      {isSources ? (
        <ul className="article-prose article-sources-list">
          {content
            .split('\n')
            .map((line) => stripLeadingListMarker(line.trim()))
            .filter(Boolean)
            .map((line, i) => <li key={i}>{renderInlineBold(localize(line))}</li>)}
        </ul>
      ) : (
        <div className="article-prose">
          {content
            .split(/\n\n+/)
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{renderInlineBold(localize(p.trim()))}</p>
            ))}
        </div>
      )}
    </section>
  );
}

interface Props {
  shrine: Shrine;
}

export function ShrineArticle({ shrine }: Props) {
  const { lang } = useLang();
  const { leadText, inlineSections, uniqueColumnSections, rawFallback } = useArticleContent(shrine);

  return (
    <div>
      {leadText && (
        <section
          className="article-section article-lead"
          id="overview"
          aria-labelledby="overview-heading"
        >
          <div className="article-prose">
            {leadText
              .split(/\n\n+/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{renderInlineBold(p.trim())}</p>
              ))}
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
          heading={section.title[lang as 'en' | 'ur'] || section.title.en}
          content={section.content}
          isSources={section.id === 'sources'}
        />
      ))}

      {rawFallback && (
        <section className="article-section" id="description" aria-labelledby="description-heading">
          <div className="article-prose">
            {rawFallback
              .split(/\n\n+/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{renderInlineBold(p.trim())}</p>
              ))}
          </div>
        </section>
      )}

      <ShrineGallery items={shrine.gallery} category={shrine.category} />
    </div>
  );
}
