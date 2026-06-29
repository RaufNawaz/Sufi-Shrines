import React, { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import {
  buildArticleSections,
  getLeadText,
  parseInlineSections,
} from '../../lib/data/articleParsing';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { ShrineGallery } from './ShrineGallery';
import { ContentsNav } from './ContentsNav';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[؀-ۿ\s]+/g, (m) => (m.trim() ? '-' : ''))
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    || 'section';
}

function ArticleSection({
  id,
  heading,
  content,
}: {
  id: string;
  heading: string;
  content: string;
}) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);
  return (
    <section className="article-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="article-section-heading" id={`${id}-heading`}>
        {heading}
      </h2>
      <div className="article-prose">
        {paragraphs.map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </div>
    </section>
  );
}

interface Props {
  shrine: Shrine;
}

export function ShrineArticle({ shrine }: Props) {
  const { lang, t } = useLang();

  // Lead text: prose before the first heading in Description, language-aware
  const leadText = useMemo(() => getLeadText(shrine.raw, lang), [shrine.raw, lang]);

  // Inline sections: headings authored inside the Description column
  const inlineSections = useMemo(() => {
    const raw =
      lang === 'ur'
        ? getUrduFieldValue(shrine.raw, 'Description') ||
          getFieldValue(shrine.raw, 'Description')
        : getFieldValue(shrine.raw, 'Description');
    return raw ? parseInlineSections(raw) : [];
  }, [shrine.raw, lang]);

  // Dedicated column sections (History, Architecture, …)
  const columnSections = useMemo(
    () => buildArticleSections(shrine.raw, lang),
    [shrine.raw, lang],
  );

  // Deduplicate: skip column sections already covered by inline sections
  const inlineHeadings = useMemo(
    () => new Set(inlineSections.map((s) => s.heading.toLowerCase())),
    [inlineSections],
  );
  const uniqueColumnSections = useMemo(
    () =>
      columnSections.filter(
        (s) =>
          !inlineHeadings.has(s.title.en.toLowerCase()) &&
          !inlineHeadings.has(s.title.ur.toLowerCase()),
      ),
    [columnSections, inlineHeadings],
  );

  // Last-resort fallback: raw Description when nothing else has content
  const rawFallback = useMemo(() => {
    if (leadText || inlineSections.length || uniqueColumnSections.length) return '';
    return lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
          getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  }, [leadText, inlineSections, uniqueColumnSections, shrine.raw, lang]);

  const navItems = useMemo(() => {
    const items = [];
    if (leadText) items.push({ id: 'overview', label: t('overview') });
    for (const s of inlineSections) {
      items.push({ id: slugify(s.heading), label: s.heading });
    }
    for (const s of uniqueColumnSections) {
      items.push({ id: s.id, label: s.title[lang as 'en' | 'ur'] || s.title.en });
    }
    if (shrine.gallery.length > 0) items.push({ id: 'gallery', label: t('gallery') });
    return items;
  }, [leadText, inlineSections, uniqueColumnSections, shrine.gallery, lang, t]);

  return (
    <div>
      <ContentsNav items={navItems} />

      {leadText && (
        <section className="article-section" id="overview" aria-labelledby="overview-heading">
          <div className="article-prose">
            {leadText.split(/\n\n+/).filter(Boolean).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
        </section>
      )}

      {inlineSections.map((section) => {
        const id = slugify(section.heading);
        return (
          <ArticleSection
            key={id}
            id={id}
            heading={section.heading}
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
            {rawFallback.split(/\n\n+/).filter(Boolean).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
        </section>
      )}

      <ShrineGallery items={shrine.gallery} />
    </div>
  );
}
