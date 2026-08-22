import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ShrineInfobox } from '../ShrineInfobox';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';
import { figureTypeKey, figureTypeDisplayLabel } from '../../../lib/data/figureType';

beforeEach(() => {
  localStorage.clear();
});

// route: the built-form row links into /typology, so the infobox needs
// router context.
const ROUTE = { route: '/' } as const;

describe('figureTypeKey', () => {
  it('maps the vocabulary and refuses survey prose', () => {
    expect(figureTypeKey('Sufi saint')).toBe('sufi-saint');
    expect(figureTypeKey('Deity')).toBe('deity');
    expect(figureTypeKey('Sikh Guru')).toBe('sikh-guru');
    expect(figureTypeKey('Sant')).toBe('sant');
    expect(figureTypeKey('Historical person')).toBe('historical-person');
    expect(figureTypeKey('Individual')).toBe('individual');
    expect(figureTypeKey('Collective')).toBe('collective');
    expect(figureTypeKey('Martyr (Shaheed) -- not a Sufi pir or spiritual master')).toBeNull();
    expect(figureTypeKey('')).toBeNull();
  });

  it('labels are bilingual with no Latin leaking into the Urdu side', () => {
    expect(figureTypeDisplayLabel('Deity', 'ur')).toBe('دیوتا');
    expect(figureTypeDisplayLabel('Sikh Guru', 'en')).toBe('Sikh Guru');
    expect(figureTypeDisplayLabel('Deity', 'ur')).not.toMatch(/[A-Za-z]/);
  });
});

describe('ShrineInfobox — the figure row says what the figure is', () => {
  it('labels a deity "Deity", never "Saint"', () => {
    const shrine = buildShrine(
      makeShrineRow({ 'Sufi Saint': 'Shiva (Mahadev)', figure_type: 'Deity' }),
      0,
    )!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, ROUTE);
    expect(screen.getByText('Deity')).toBeInTheDocument();
    expect(screen.queryByText('Saint')).not.toBeInTheDocument();
  });

  it('falls back to the generic label when figure_type is survey prose', () => {
    const shrine = buildShrine(
      makeShrineRow({
        'Sufi Saint': 'Ghazi Ilm Din Shaheed',
        figure_type: 'Martyr (Shaheed) -- not a Sufi pir, per the survey',
      }),
      0,
    )!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, ROUTE);
    // Prose is never paraphrased into a label (RULE 2) — generic fallback.
    expect(screen.getByText('Saint')).toBeInTheDocument();
  });

  it('labels the figure in Urdu by its kind — دیوتا, not ولی', () => {
    const shrine = buildShrine(
      makeShrineRow({ 'Sufi Saint': 'Shiva (Mahadev)', figure_type: 'Deity' }),
      0,
    )!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur', route: '/' });
    expect(screen.getByText('دیوتا')).toBeInTheDocument();
    expect(screen.queryByText('ولی')).not.toBeInTheDocument();
  });
});

describe('ShrineInfobox — silsila row', () => {
  it('renders a clean order name, translated in Urdu via the data dictionary', () => {
    const shrine = buildShrine(makeShrineRow({ silsila: 'Qadiri' }), 0)!;
    const en = renderWithProviders(<ShrineInfobox shrine={shrine} />, ROUTE);
    expect(en.container.textContent).toContain('Silsila');
    expect(en.container.textContent).toContain('Qadiri');
    en.unmount();

    const ur = renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur', route: '/' });
    expect(ur.container.textContent).toContain('سلسلہ');
    expect(ur.container.textContent).toContain('قادری');
    expect(ur.container.textContent).not.toContain('Qadiri');
  });

  it('keeps a survey-prose silsila verbatim, flagged as English in the Urdu view', () => {
    const prose = 'As recorded: "Ahl e Sunnat - Ghaznavi silsila"';
    const shrine = buildShrine(makeShrineRow({ silsila: prose }), 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, {
      lang: 'ur',
      route: '/',
    });
    const bdi = container.querySelector('.infobox-row bdi[lang="en"]');
    expect(bdi?.textContent).toBe(prose);
  });

  it('renders no silsila row when the sheet has none', () => {
    const shrine = buildShrine(makeShrineRow({}), 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, ROUTE);
    expect(container.textContent).not.toContain('Silsila');
  });
});
