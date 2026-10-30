import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ProseParagraphs } from '../ProseParagraphs';

const same = (t: string) => t;

describe('verse in the prose', () => {
  it('sets a one-line quotation inside English prose as verse, split at ٭', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'He is remembered for one line.\n\nحیدریم قلندرم مستم ٭ بندۂ مرتضیٰ علی ہستم\n\nThe shrine stands at Sehwan.'
        }
        localize={same}
      />,
    );
    const verse = container.querySelectorAll('blockquote.article-verse');
    expect(verse).toHaveLength(1);
    expect(verse[0]!.querySelectorAll('.article-verse-line')).toHaveLength(2);
  });

  it('leaves a one-line paragraph as prose in an Urdu section', () => {
    const { container } = render(
      <ProseParagraphs
        text={'یہ مزار سہون میں ہے۔\n\nحیدریم قلندرم مستم ٭ بندۂ مرتضیٰ علی ہستم'}
        localize={same}
      />,
    );
    expect(container.querySelectorAll('blockquote')).toHaveLength(0);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('sets a lone line as verse in an Urdu section when a lead-in ending in a colon introduces it', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'کتبے میں ایک مصرع یہ بھی ہے:\n\nمسجد و چاہ را انکو تعمیر\n\nانیسویں صدی میں یہ مسجد مزار کی ملکیت تھی۔'
        }
        localize={same}
      />,
    );
    expect(container.querySelectorAll('blockquote.article-verse')).toHaveLength(1);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('still sets a two-line couplet as verse in either view', () => {
    const { container } = render(
      <ProseParagraphs text={'بُلھیا! کی جاݨاں میں کوݨ\nنہ میں مومن وچ مسیتاں'} localize={same} />,
    );
    expect(container.querySelectorAll('blockquote .article-verse-line')).toHaveLength(2);
  });
});

/* Rauf, 29 October 2026: the English renderings of verse were italic prose with
   the credit run on in brackets; they are set as verse now, under the original
   when the text gives it, with the translator as a colophon. */
describe('a verse rendering', () => {
  it('sets an English rendering as verse, one line per " / ", with the credit as a colophon', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'He quarrels with the schoolroom:\n\n*The mullah taught me the lesson, but I could not get beyond alif. / I suffered a beating with his slippers* (translated by Christopher Shackle)\n\nThe shrine stands at Kasur.'
        }
        localize={same}
      />,
    );
    const figure = container.querySelector('figure.article-verse-figure')!;
    expect(figure).toBeTruthy();
    expect(figure.querySelector('blockquote.article-verse')).toBeNull();
    const rendering = figure.querySelector('blockquote.article-verse-rendering')!;
    expect(rendering.getAttribute('lang')).toBe('en');
    expect(rendering.querySelectorAll('.article-verse-line')).toHaveLength(2);
    expect(rendering.textContent).not.toContain('translated by');
    expect(figure.querySelector('.article-verse-credit-name')?.textContent).toBe(
      'Christopher Shackle',
    );
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('puts the original and its rendering in one figure', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          "Of learning he wrote:\n\nعِلموں بس کریں او یار\n\n*Enough of learning, my friend / Only one letter 'A' is all you need* (translated by Naveed Alam)"
        }
        localize={same}
      />,
    );
    const figures = container.querySelectorAll('figure.article-verse-figure');
    expect(figures).toHaveLength(1);
    expect(figures[0]!.querySelector('blockquote.article-verse')?.textContent).toBe(
      'عِلموں بس کریں او یار',
    );
    expect(
      figures[0]!.querySelectorAll('.article-verse-rendering .article-verse-line'),
    ).toHaveLength(2);
  });

  it('pairs a one-line original with its Urdu rendering in the Urdu view, but not a lead-in', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'علم کے بارے میں وہ کہتے ہیں:\n\nعِلموں بس کریں او یار\n\n*بس کرو یہ علم، اے یار! / تمہیں تو بس ایک الف درکار ہے۔*\n\nایک نظم میں وہ مکتب کے ایک شاگرد کے روپ میں سامنے آتے ہیں:\n\n*ملا نے مجھے سبق پڑھایا، مگر میں الف سے آگے نہ بڑھ سکا۔ / مجھے اس کی جوتیوں سے مار کھانی پڑی۔*'
        }
        localize={same}
      />,
    );
    const figures = container.querySelectorAll('figure.article-verse-figure');
    expect(figures).toHaveLength(2);
    expect(figures[0]!.querySelector('blockquote.article-verse')?.textContent).toBe(
      'عِلموں بس کریں او یار',
    );
    expect(figures[0]!.querySelector('.article-verse-rendering')?.getAttribute('dir')).toBe('rtl');
    /* The lead-in ends in a colon: it stays prose, and the second rendering stands alone. */
    expect(figures[1]!.querySelector('blockquote.article-verse')).toBeNull();
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('leaves a paragraph that only begins in italics as prose', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          '*Navratri* is a festival dedicated to Durga, for which devotees stay up for nine nights.'
        }
        localize={same}
      />,
    );
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('sets a run of renderings from one translator as stanzas of one figure, credited once', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'The disciple waits at the door:\n\n*I am waiting, pass this way once more* (translated by Taufiq Rafat)\n\n*Who will lead me to the place of my master* (translated by Taufiq Rafat)\n\n*Bullha, let us go and sit at the gate* (translated by Christopher Shackle)'
        }
        localize={same}
      />,
    );
    const figures = container.querySelectorAll('figure.article-verse-figure');
    expect(figures).toHaveLength(2);
    expect(figures[0]!.querySelectorAll('blockquote.article-verse-rendering')).toHaveLength(2);
    expect(figures[0]!.querySelectorAll('.article-verse-credit')).toHaveLength(1);
    expect(figures[0]!.querySelector('.article-verse-credit-name')?.textContent).toBe(
      'Taufiq Rafat',
    );
    expect(figures[1]!.querySelector('.article-verse-credit-name')?.textContent).toBe(
      'Christopher Shackle',
    );
  });
});

/* Rauf, 30 October 2026: every quoted verse shows its original, and where the
   original is not Urdu it is quoted as written, Gurmukhi for Guru Nanak, with
   the English rendering under it in the English article and the Urdu under it
   in the Urdu article. */
describe('a Gurmukhi original', () => {
  it('stands above its English rendering in one figure, as Punjabi set left to right', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'Of water and washing he sang:\n\nਭਰੀਐ ਹਥੁ ਪੈਰੁ ਤਨੁ ਦੇਹ ॥\nਪਾਣੀ ਧੋਤੈ ਉਤਰਸੁ ਖੇਹ ॥\n\n*Hands and feet grown dirty / Water washes clean*\n\nThe gurdwara stands at Rohtas.'
        }
        localize={same}
      />,
    );
    const figures = container.querySelectorAll('figure.article-verse-figure');
    expect(figures).toHaveLength(1);
    const original = figures[0]!.querySelector('blockquote.article-verse')!;
    expect(original.getAttribute('lang')).toBe('pa-Guru');
    expect(original.getAttribute('dir')).toBe('ltr');
    expect(original.classList.contains('article-verse-gurmukhi')).toBe(true);
    expect(original.querySelectorAll('.article-verse-line')).toHaveLength(2);
    expect(
      figures[0]!.querySelector('blockquote.article-verse-rendering')!.getAttribute('lang'),
    ).toBe('en');
  });

  it('pairs a one-line Gurmukhi original with its Urdu rendering in the Urdu view', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'نظم کا ایک مصرع یہ ہے:\n\nਆਵਨਿ ਅਠਤਰੈ …\n\n*اٹھہتر میں آئے*\n\nیہ گوردوارہ ایمن آباد میں ہے۔'
        }
        localize={same}
      />,
    );
    const figure = container.querySelector('figure.article-verse-figure')!;
    expect(figure).toBeTruthy();
    expect(figure.querySelector('blockquote.article-verse')!.getAttribute('lang')).toBe('pa-Guru');
    expect(figure.querySelector('blockquote.article-verse-rendering')!.getAttribute('dir')).toBe(
      'rtl',
    );
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('is verse on its own too, with no rendering after it, in either view', () => {
    const { container } = render(
      <ProseParagraphs
        text={'یہ ان کا ایک مصرع ہے:\n\nਵੇ ਲਾਲੋ\n\nیہ گوردوارہ ہے۔'}
        localize={same}
      />,
    );
    const verse = container.querySelectorAll('blockquote.article-verse-gurmukhi');
    expect(verse).toHaveLength(1);
    expect(verse[0]!.getAttribute('lang')).toBe('pa-Guru');
  });
});
