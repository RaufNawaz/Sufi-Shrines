import React from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { ShrineGallery } from './ShrineGallery';
import { anchorSlug, useArticleContent } from './useArticleContent';
import { localizeHeading } from '../../lib/data/headingLabels';
import { renderInlineBold } from './inlineFormat';

function ArticleSection({
  id,
  heading,
  content,
}: {
  id: string;
  heading: string;
  content: string;
}) {
  const isSources = id === 'sources';
  return (
    <section className="article-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="article-section-heading" id={`${id}-heading`}>
        {heading}
      </h2>
      {isSources ? (
        <ul className="article-prose article-sources-list">
          {content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => <li key={i}>{renderInlineBold(line)}</li>)}
        </ul>
      ) : (
        <div className="article-prose">
          {content
            .split(/\n\n+/)
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{renderInlineBold(p.trim())}</p>
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
          />
        );
      })}

      {uniqueColumnSections.map((section) => (
        <ArticleSection
          key={section.id}
          id={section.id}
          heading={section.title[lang as 'en' | 'ur'] || section.title.en}
          content={section.content}
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
