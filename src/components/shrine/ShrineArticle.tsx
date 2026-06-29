import React, { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { buildArticleSections } from '../../lib/data/articleParsing';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { translateToUrdu } from '../../lib/i18n/urduFallback';
import { ShrineGallery } from './ShrineGallery';
import { ContentsNav } from './ContentsNav';

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

  const sections = useMemo(
    () => buildArticleSections(shrine.raw, lang),
    [shrine.raw, lang],
  );

  const leadText = useMemo(() => {
    const raw =
      lang === 'ur'
        ? getUrduFieldValue(shrine.raw, 'Description') ||
          getFieldValue(shrine.raw, 'Description')
        : getFieldValue(shrine.raw, 'Description');

    if (!raw.trim()) return '';

    // Extract lead: everything before the first heading
    const lines = raw.split('\n');
    const leadLines: string[] = [];
    for (const line of lines) {
      if (/^#{1,6}\s/.test(line.trim()) || /^=+\s*.+\s*=+$/.test(line.trim())) break;
      leadLines.push(line);
    }
    return leadLines.join('\n').trim();
  }, [shrine.raw, lang]);

  const navItems = useMemo(() => {
    const items = [];
    if (leadText) items.push({ id: 'overview', label: t('overview') });
    for (const s of sections) {
      items.push({ id: s.id, label: s.title[lang as 'en' | 'ur'] || s.title.en });
    }
    if (shrine.gallery.length > 0) items.push({ id: 'gallery', label: t('gallery') });
    return items;
  }, [leadText, sections, shrine.gallery, lang, t]);

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

      {sections.map((section) => (
        <ArticleSection
          key={section.id}
          id={section.id}
          heading={section.title[lang as 'en' | 'ur'] || section.title.en}
          content={section.content}
        />
      ))}

      <ShrineGallery items={shrine.gallery} />
    </div>
  );
}
