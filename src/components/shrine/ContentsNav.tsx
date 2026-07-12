import React, { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

interface NavItem {
  id: string;
  label: string;
}

interface Props {
  items: NavItem[];
}

export function ContentsNav({ items }: Props) {
  const { t, fmtNum } = useLang();
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
              {fmtNum(i + 1)}. {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
