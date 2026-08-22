import React, { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { Lang } from '../../types/shrine';

interface SourceNoteItem {
  en: string;
  ur: string;
}

/**
 * "Where the source contradicts itself" — the reader-facing source-notes
 * disclosure (22 Aug 2026 ruling). The archive's internal qa_note column
 * stays internal; this renders the cleaned, bilingual restatements from
 * src/data/source-notes.json. Nothing here is resolved or omitted — the
 * items exist precisely because the source disagrees with itself, and per
 * the sensitive-content ruling everything is attributed rather than
 * withheld. Renders nothing for entries without notes.
 */
export function SourceNotes({ slug }: { slug: string }) {
  const { lang, t, fmtNum } = useLang();
  const [items, setItems] = useState<SourceNoteItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Lazy chunk: most entries have no notes, and none of this belongs on
    // the critical path.
    import('../../data/source-notes.json').then((m) => {
      if (cancelled) return;
      const table = m.default as Record<string, SourceNoteItem[] | string>;
      const entry = table[slug];
      setItems(Array.isArray(entry) ? entry : []);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!items || items.length === 0) return null;

  return (
    <section className="source-notes article-section" id="source-notes">
      <details className="source-notes-details">
        <summary className="source-notes-summary">
          {t('srcNotesHeading')}
          <span className="source-notes-count">{fmtNum(items.length)}</span>
        </summary>
        <p className="source-notes-intro">{t('srcNotesIntro')}</p>
        <ul className="source-notes-list">
          {items.map((item, i) => (
            <li key={i}>{item[lang as Lang]}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
