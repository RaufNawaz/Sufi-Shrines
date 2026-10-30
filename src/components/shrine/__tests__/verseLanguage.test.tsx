import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { ProseParagraphs } from '../ProseParagraphs';
import { verseHash, verseKeyText, verseLanguageOf } from '../verseLanguage';
import VERSE_LANGUAGES from '../../../data/verse-languages.json';

const same = (t: string) => t;
const ROOT = join(__dirname, '..', '..', '..', '..');

/* Rauf, 30 October 2026: "For the differentiation between the urdu and punjabi
   make it more obvious". Shah Hussain's kafi line below is recorded as Punjabi
   in entries/verse_originals/languages.json. */
const KAFI = 'مائے نی میں کینوں آکھاں، دردِ وچھوڑے دا حال نی';

describe('the language of a quoted verse', () => {
  it('labels a Punjabi original and its Urdu translation in the Urdu article', () => {
    const { container } = render(
      <ProseParagraphs
        text={`ان کی مشہور کافی میں روح ماں سے فریاد کرتی ہے:\n\n${KAFI}\n\n*اے ماں، میں جدائی کا دکھ کس سے کہوں*\n\nیہ مزار باغبان پورہ میں ہے۔`}
        localize={same}
      />,
    );
    const labels = [...container.querySelectorAll('figure .article-verse-lang')].map(
      (l) => l.textContent,
    );
    expect(labels).toEqual(['پنجابی', 'اردو']);
    const figure = container.querySelector('figure')!;
    const order = [...figure.children].map((c) => c.className);
    expect(order).toEqual([
      'article-verse-lang',
      'article-verse',
      'article-verse-lang',
      'article-verse-rendering',
    ]);
  });

  it('labels it Punjabi and English in the English article', () => {
    const { container } = render(
      <ProseParagraphs
        text={`In his best loved kafi the soul cries out:\n\n${KAFI}\n\n*Mother, to whom shall I tell this ache*\n\nThe shrine stands at Baghbanpura.`}
        localize={same}
      />,
    );
    const labels = [...container.querySelectorAll('.article-verse-lang')].map((l) => l.textContent);
    expect(labels).toEqual(['Punjabi', 'English']);
  });

  it('sets no label on an Urdu verse in the Urdu article, nor on an unrecorded one', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'ایک شعر یہ ہے:\n\nجو خدا کے دوست تھے پنجاب میں\nحال ان کا اس سے ہوتا ہے عیان\n\n*قطعۂ تاریخ کا ایک شعر*\n\nایک اور:\n\nیہ ایک فرضی مصرع ہے\nاور یہ دوسرا\n\nیہ مزار لاہور میں ہے۔'
        }
        localize={same}
      />,
    );
    expect(container.querySelectorAll('.article-verse-lang')).toHaveLength(0);
  });

  it('knows a Gurmukhi verse by its script when it is not recorded', () => {
    expect(verseLanguageOf('ਵੇ ਲਾਲੋ ਲਾਲੋ')).toBe('Guru');
  });

  it('agrees with the record: every recorded language is in the map under its hash', () => {
    const record = JSON.parse(
      readFileSync(join(ROOT, 'entries', 'verse_originals', 'languages.json'), 'utf8'),
    ) as { entries: { verse: string; lang: string | null }[] };
    const map = VERSE_LANGUAGES as Record<string, string>;
    const labelled = record.entries.filter((e) => e.lang);
    expect(Object.keys(map)).toHaveLength(labelled.length);
    for (const e of labelled) {
      expect(map[verseHash(verseKeyText(e.verse))]).toBe(e.lang);
    }
  });
});
