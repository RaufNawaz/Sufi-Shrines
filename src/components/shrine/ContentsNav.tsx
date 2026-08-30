import React, { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeProseDigits } from '../../lib/i18n/numerals';

interface NavItem {
  id: string;
  label: string;
}

interface Props {
  items: NavItem[];
}

export function ContentsNav({ items }: Props) {
  const { t, fmtNum, lang, numerals } = useLang();
  const [activeId, setActiveId] = useState(items[0]?.id || '');

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0.1 },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="contents-nav" aria-label={t('contents')}>
      <p className="contents-nav-title">{t('contents')}</p>
      <ol className="contents-nav-list">
        {items.map((item, i) => (
          <li key={item.id} className="contents-nav-item">
            <a
              href={`#${item.id}`}
              className={item.id === activeId ? 'active' : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveId(item.id);
              }}
            >
              {/* The label too, not only the list number: these entries are
                  the same headings the article renders, so a digit inside one
                  ("2010 کا دھماکہ…") appeared Western here and Eastern in the
                  heading it links to. */}
              {fmtNum(i + 1)}. {localizeProseDigits(item.label, lang, numerals === 'eastern')}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
