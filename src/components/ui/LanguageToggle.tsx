import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const isUrdu = lang === 'ur';

  return (
    <button
      className={`icon-btn ${className || ''}`}
      style={{ width: 'auto', padding: '0 12px', fontWeight: 600, fontSize: '0.875rem' }}
      onClick={() => setLang(isUrdu ? 'en' : 'ur')}
      aria-label={isUrdu ? 'Switch language to English' : 'زبان اردو میں تبدیل کریں'}
      title={isUrdu ? 'Switch to English' : 'اردو میں تبدیل کریں'}
    >
      {isUrdu ? 'English' : 'اردو'}
    </button>
  );
}
