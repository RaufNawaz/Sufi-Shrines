import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { PlaceArticle } from '../PlaceArticle';
import type { PlaceArticleText } from '../usePlaceArticle';
import { renderWithProviders } from '../../../test/utils';
import { loadUiStrings } from '../../../lib/i18n/uiStrings';

/* The short article and its switches (Rauf, 30 October 2026: "an article that
   is short and complete but then switch to the longer one if you want or toggle
   which sections you need more information for"). */

let article: PlaceArticleText | null = null;
vi.mock('../usePlaceArticle', () => ({ usePlaceArticle: () => article }));

const LONG =
  '## Overview\n\nLong overview prose.\n\n## History\n\nLong history prose.\n\n## Bibliography\n\n- A book (1884).';
const SHORT =
  '## Overview\n\nShort overview prose.\n\n## History\n\nShort history prose.\n\n## Bibliography\n\n- A book (1884).';
const LONG_UR = '## تعارف\n\nطویل تعارف۔\n\n## تاریخ\n\nطویل تاریخ۔';
const SHORT_UR = '## تعارف\n\nمختصر تعارف۔\n\n## تاریخ\n\nمختصر تاریخ۔';

describe('PlaceArticle', () => {
  beforeEach(() => {
    article = null;
  });

  it('shows the long article alone, with no switch, when there is no short one', () => {
    article = { en: LONG, ur: LONG_UR };
    renderWithProviders(<PlaceArticle slug="multan" />);
    expect(screen.getByText('Long history prose.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Full account' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More on this' })).toBeNull();
  });

  it('opens on the short article, and opens one section at a time', () => {
    article = { en: LONG, ur: LONG_UR, short: { en: SHORT, ur: SHORT_UR } };
    renderWithProviders(<PlaceArticle slug="lahore" />);
    expect(screen.getByText('Short overview prose.')).toBeInTheDocument();
    expect(screen.getByText('Short history prose.')).toBeInTheDocument();
    expect(screen.queryByText('Long history prose.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Short article' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const more = screen.getAllByRole('button', { name: 'More on this' });
    expect(more).toHaveLength(2);
    fireEvent.click(more[1]);
    expect(screen.getByText('Long history prose.')).toBeInTheDocument();
    // Only that section opened.
    expect(screen.getByText('Short overview prose.')).toBeInTheDocument();
    const less = screen.getByRole('button', { name: 'Show less' });
    expect(less).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(less);
    expect(screen.getByText('Short history prose.')).toBeInTheDocument();
  });

  it('switches the whole article to the full account and back', () => {
    article = { en: LONG, ur: LONG_UR, short: { en: SHORT, ur: SHORT_UR } };
    renderWithProviders(<PlaceArticle slug="lahore" />);
    fireEvent.click(screen.getByRole('button', { name: 'Full account' }));
    expect(screen.getByText('Long overview prose.')).toBeInTheDocument();
    expect(screen.getByText('Long history prose.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More on this' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Short article' }));
    expect(screen.getByText('Short history prose.')).toBeInTheDocument();
  });

  it('keeps the English bibliography in either length', () => {
    article = { en: LONG, ur: LONG_UR, short: { en: SHORT, ur: SHORT_UR } };
    renderWithProviders(<PlaceArticle slug="lahore" />);
    expect(screen.getByText('A book (1884).')).toBeInTheDocument();
  });

  it('uses the Urdu short article in the Urdu view, and opens the Urdu long text', async () => {
    await loadUiStrings('ur');
    article = { en: LONG, ur: LONG_UR, short: { en: SHORT, ur: SHORT_UR } };
    renderWithProviders(<PlaceArticle slug="lahore" />, { lang: 'ur' });
    expect(screen.getByText('مختصر تاریخ۔')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'مزید تفصیل' })[1]);
    expect(screen.getByText('طویل تاریخ۔')).toBeInTheDocument();
  });
});

describe('PlaceArticle headings', () => {
  it('keeps a "History: …" heading whole instead of printing its tail as prose', () => {
    article = {
      en: '## Overview\n\nLong overview.\n\n## History: Mughal Lahore\n\nLong Mughal prose.\n\n## Bibliography\n\n- A book.',
    };
    const { container } = renderWithProviders(<PlaceArticle slug="lahore" />);
    expect(screen.getByRole('heading', { name: 'History: Mughal Lahore' })).toBeInTheDocument();
    const paragraphs = Array.from(container.querySelectorAll('.article-prose p')).map(
      (p) => p.textContent,
    );
    expect(paragraphs).not.toContain('Mughal Lahore');
  });
});
