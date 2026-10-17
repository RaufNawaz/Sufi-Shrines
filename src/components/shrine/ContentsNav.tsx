import React from 'react';
import { useActiveSection } from './useActiveSection';
import { prefersReducedMotion } from '../../lib/motionPreference';
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
  const activeId = useActiveSection(items);

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
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                });
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
