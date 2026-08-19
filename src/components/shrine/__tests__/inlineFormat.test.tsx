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
