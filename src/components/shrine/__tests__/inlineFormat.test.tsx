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
    const { container } = render(<p>{renderInlineBold('A stray ** marker with no closing pair')}</p>);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).not.toContain('**');
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
});
