import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderInlineBold, stripInlineBoldMarkup } from '../inlineFormat';

describe('renderInlineBold', () => {
  it('renders **text** as <strong>', () => {
    const { container } = render(<p>{renderInlineBold('A **Book Title**, Author, 1998')}</p>);
    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('Book Title');
    expect(container.textContent).toBe('A Book Title, Author, 1998');
  });

  it('renders plain text unchanged when there is no bold markup', () => {
    const { container } = render(<p>{renderInlineBold('Plain citation, no markup')}</p>);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toBe('Plain citation, no markup');
  });

  it('handles multiple bold spans in one string', () => {
    const { container } = render(<p>{renderInlineBold('**One** and **Two**')}</p>);
    const strongs = container.querySelectorAll('strong');
    expect(strongs).toHaveLength(2);
    expect(strongs[0].textContent).toBe('One');
    expect(strongs[1].textContent).toBe('Two');
  });

  it('strips an unpaired stray ** instead of rendering it literally', () => {
    const { container } = render(
      <p>{renderInlineBold('A stray ** marker with no closing pair')}</p>,
    );
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).not.toContain('**');
  });

  it('renders *text* as <em>', () => {
    const { container } = render(
      <p>
        {renderInlineBold('If any single image belongs to Iqbal, it is the *shaheen* — the eagle')}
      </p>,
    );
    const em = container.querySelector('em');
    expect(em?.textContent).toBe('shaheen');
    expect(container.textContent).not.toContain('*');
  });

  it('renders multi-word *italic spans* including parentheses', () => {
    const { container } = render(
      <p>
        {renderInlineBold(
          'Muhammad Iqbal, *The Reconstruction of Religious Thought in Islam* (English lectures)',
        )}
      </p>,
    );
    const em = container.querySelector('em');
    expect(em?.textContent).toBe('The Reconstruction of Religious Thought in Islam');
    expect(container.textContent).toBe(
      'Muhammad Iqbal, The Reconstruction of Religious Thought in Islam (English lectures)',
    );
  });

  it('handles a bold heading and italic titles in the same string without cross-matching', () => {
    const { container } = render(
      <p>
        {renderInlineBold(
          '**Kulliyat-e-Iqbal** — including *Bang-e-Dara* (1924) and *Bal-e-Jibril* (1935)',
        )}
      </p>,
    );
    expect(container.querySelector('strong')?.textContent).toBe('Kulliyat-e-Iqbal');
    const ems = container.querySelectorAll('em');
    expect(ems).toHaveLength(2);
    expect(ems[0].textContent).toBe('Bang-e-Dara');
    expect(ems[1].textContent).toBe('Bal-e-Jibril');
  });
});

describe('renderInlineBold — Arabic-script quotations in Latin prose', () => {
  // Bulleh Shah's Sharib paragraph (Rauf, 18 Oct 2026, HANDOVER §9.366): the
  // quote marks, commas and the citation's "(" must stay OUTSIDE the RTL
  // isolate, or the browser reorders them into the Urdu.
  const sharib =
    'In Sharib, "آپ کے پیرو مرشد آپ سے کسی بات پر خفا ہو گئے۔ انہوں نے آپ کی ولایت سلب کرلی", his pir grew displeased; ' +
    'where he "روحانی فیوض حاصل کئے" and "فن موسیقی میں کمال حاصل کیا", and "کچھ دنوں کے بعد … عطا کی" (Sharib, p. 343).';

  it('isolates exactly the Arabic-script text of each quotation, never the Latin punctuation around it', () => {
    const { container } = render(<p>{renderInlineBold(sharib)}</p>);
    const runs = Array.from(container.querySelectorAll('bdi')).map((b) => b.textContent);
    expect(runs).toEqual([
      'آپ کے پیرو مرشد آپ سے کسی بات پر خفا ہو گئے۔ انہوں نے آپ کی ولایت سلب کرلی',
      'روحانی فیوض حاصل کئے',
      'فن موسیقی میں کمال حاصل کیا',
      'کچھ دنوں کے بعد … عطا کی',
    ]);
    for (const b of Array.from(container.querySelectorAll('bdi'))) {
      expect(b.getAttribute('dir')).toBe('rtl');
      expect(b.getAttribute('lang')).toBe('ur');
    }
    expect(container.textContent).toBe(sharib);
  });

  it('keeps a quotation carrying a transcription flag as one isolate', () => {
    const text = 'he says "جب زمین بہی[OCR?] فروخت ہو گئی" and "[illegible] پناہ" (p. 111)';
    const { container } = render(<p>{renderInlineBold(text)}</p>);
    const runs = Array.from(container.querySelectorAll('bdi')).map((b) => b.textContent);
    expect(runs).toEqual(['جب زمین بہی[OCR?] فروخت ہو گئی', '[illegible] پناہ']);
    expect(container.textContent).toBe(text);
  });

  it('leaves a flag on a Latin word, and Latin-only text, unwrapped', () => {
    const { container } = render(<p>{renderInlineBold('Sahib[OCR?] Kaur, 1832')}</p>);
    expect(container.querySelector('bdi')).toBeNull();
    expect(container.textContent).toBe('Sahib[OCR?] Kaur, 1832');
  });

  it('isolates Arabic-script inside italics too', () => {
    const { container } = render(<p>{renderInlineBold('the *ولایت* he lost')}</p>);
    expect(container.querySelector('em bdi')?.textContent).toBe('ولایت');
  });
});

describe('stripInlineBoldMarkup', () => {
  it('removes ** wrapping but keeps the inner text', () => {
    expect(stripInlineBoldMarkup('**Book Title**, Author')).toBe('Book Title, Author');
  });

  it('leaves plain text unchanged', () => {
    expect(stripInlineBoldMarkup('Plain text')).toBe('Plain text');
  });

  it('strips an unpaired stray **', () => {
    expect(stripInlineBoldMarkup('A stray ** marker')).not.toContain('**');
  });

  it('removes single * wrapping but keeps the inner text', () => {
    expect(stripInlineBoldMarkup('the *shaheen* — the eagle')).toBe('the shaheen — the eagle');
  });
});
