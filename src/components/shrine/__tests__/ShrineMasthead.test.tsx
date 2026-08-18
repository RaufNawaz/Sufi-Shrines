import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { ShrineMasthead } from '../ShrineMasthead';
import { urduDisplayName } from '../../../lib/i18n/urduDisplayName';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

const URDU_NAME = 'داتا دربار';

function shrineWith(extra: Record<string, string>) {
  return buildShrine(
    makeShrineRow({ Name: 'Data Darbar', Latitude: '31.57', Longitude: '74.30', ...extra }),
    0,
  )!;
}

beforeEach(() => {
  localStorage.clear();
});

describe('ShrineMasthead', () => {
  it('sets the Nastaliq name above the Latin heading in the English view', () => {
    const shrine = shrineWith({ 'Urdu Name': URDU_NAME });
    renderWithProviders(
      <ShrineMasthead
        shrine={shrine}
        lang="en"
        latinName="Data Darbar"
        headingRef={createRef<HTMLHeadingElement>()}
      />,
      { lang: 'en' },
    );

    // The Latin name is the heading; the Urdu name is present as content.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Data Darbar');
    const masthead = screen.getByText(URDU_NAME);
    expect(masthead).toBeInTheDocument();
    expect(masthead.closest('bdi')).not.toBeNull();
  });

  it('marks the masthead as Urdu and RTL so bidi cannot bleed into the LTR page', () => {
    const shrine = shrineWith({ 'Urdu Name': URDU_NAME });
    renderWithProviders(
      <ShrineMasthead
        shrine={shrine}
        lang="en"
        latinName="Data Darbar"
        headingRef={createRef<HTMLHeadingElement>()}
      />,
      { lang: 'en' },
    );
    const bdi = screen.getByText(URDU_NAME).closest('bdi')!;
    expect(bdi).toHaveAttribute('lang', 'ur');
    expect(bdi).toHaveAttribute('dir', 'rtl');
  });

  it('uses the Nastaliq name AS the heading in the Urdu view, without duplicating it', () => {
    const shrine = shrineWith({ 'Urdu Name': URDU_NAME });
    renderWithProviders(
      <ShrineMasthead
        shrine={shrine}
        lang="ur"
        latinName="Data Darbar"
        headingRef={createRef<HTMLHeadingElement>()}
      />,
      { lang: 'ur' },
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(URDU_NAME);
    expect(heading.className).toContain('shrine-title--nastaliq');
    // Exactly one rendering of the name — no masthead + heading duplication.
    expect(screen.getAllByText(URDU_NAME)).toHaveLength(1);
  });

  it('introduces no Latin text into the Urdu view (no-English-leak guard)', () => {
    const shrine = shrineWith({ 'Urdu Name': URDU_NAME });
    const { container } = renderWithProviders(
      <ShrineMasthead
        shrine={shrine}
        lang="ur"
        latinName="Data Darbar"
        headingRef={createRef<HTMLHeadingElement>()}
      />,
      { lang: 'ur' },
    );
    expect(container.textContent ?? '').not.toMatch(/[A-Za-z]/);
  });

  describe('honesty: never present a Latin string as the Urdu name', () => {
    it('renders no masthead when the archive has no Urdu name for the shrine', () => {
      // translateToUrdu returns its input unchanged on a dictionary miss
      // (i18n rule 3 — no character-level transliteration), so the fallback
      // for an unknown name is the Latin string itself.
      const shrine = shrineWith({ Name: 'Qqzz Unmapped Placename' });
      expect(urduDisplayName(shrine)).toBe('');

      const { container } = renderWithProviders(
        <ShrineMasthead
          shrine={shrine}
          lang="en"
          latinName="Qqzz Unmapped Placename"
          headingRef={createRef<HTMLHeadingElement>()}
        />,
        { lang: 'en' },
      );
      expect(container.querySelector('.shrine-masthead-nastaliq')).toBeNull();
      // and the page still has its heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Qqzz Unmapped Placename',
      );
    });

    it('rejects a mixed-script value that still carries Latin letters', () => {
      const shrine = shrineWith({ 'Urdu Name': 'داتا Darbar' });
      expect(urduDisplayName(shrine)).toBe('');
    });

    it('falls back to the Latin heading in the Urdu view rather than rendering nothing', () => {
      const shrine = shrineWith({ Name: 'Qqzz Unmapped Placename' });
      renderWithProviders(
        <ShrineMasthead
          shrine={shrine}
          lang="ur"
          latinName="Qqzz Unmapped Placename"
          headingRef={createRef<HTMLHeadingElement>()}
        />,
        { lang: 'ur' },
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Qqzz Unmapped Placename',
      );
    });
  });
});
