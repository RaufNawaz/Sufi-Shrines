// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractLeadPreviewText, parseInlineSections, buildArticleSections } from '../articleParsing';
import type { ShrineRow } from '../../../types/shrine';

describe('extractLeadPreviewText', () => {
  it('returns full text when no headings present', () => {
    const text = 'This is a description.\n\nAnother paragraph.';
    expect(extractLeadPreviewText(text)).toBe(text);
  });

  it('extracts text before the first heading', () => {
    const text = 'Lead paragraph here.\n\n## History\nSome history text.';
    expect(extractLeadPreviewText(text)).toBe('Lead paragraph here.');
  });

  it('handles markdown ## headings', () => {
    const text = 'Opening.\n\n## Architecture\nThe building is tall.';
    const result = extractLeadPreviewText(text);
    expect(result).toBe('Opening.');
  });

  it('returns first section content when no lead paragraph', () => {
    const text = '## History\nThis is history.';
    const result = extractLeadPreviewText(text);
    expect(result).toBe('This is history.');
  });

  it('returns empty string for empty input', () => {
    expect(extractLeadPreviewText('')).toBe('');
  });
});

describe('parseInlineSections', () => {
  it('extracts sections from markdown headings', () => {
    const text = 'Lead text.\n\n## History\nHistory content.\n\n## Architecture\nArch content.';
    const sections = parseInlineSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe('History');
    expect(sections[0].content).toContain('History content');
    expect(sections[1].heading).toBe('Architecture');
  });

  it('handles colon-style headings', () => {
    const text = '## Rituals\nRituals content here.';
    const sections = parseInlineSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('Rituals');
  });
});

describe('buildArticleSections', () => {
  it('builds sections from explicit column values', () => {
    const row: ShrineRow = {
      Name: 'Test',
      Latitude: '30',
      Longitude: '70',
      History: 'Built in the 11th century.',
      Architecture: 'The complex features a large dome.',
    };
    const sections = buildArticleSections(row, 'en');
    expect(sections.find((s) => s.id === 'history')?.content).toBe('Built in the 11th century.');
    expect(sections.find((s) => s.id === 'architecture')?.content).toBe('The complex features a large dome.');
  });

  it('returns empty array when no section data', () => {
    const row: ShrineRow = { Name: 'Test', Latitude: '30', Longitude: '70' };
    expect(buildArticleSections(row, 'en')).toHaveLength(0);
  });

  it('prefers Urdu columns in Urdu mode', () => {
    const row: ShrineRow = {
      Name: 'Test',
      Latitude: '30',
      Longitude: '70',
      History: 'English history',
      'History Urdu': 'اردو تاریخ',
    };
    const enSections = buildArticleSections(row, 'en');
    const urSections = buildArticleSections(row, 'ur');
    expect(enSections.find((s) => s.id === 'history')?.content).toBe('English history');
    expect(urSections.find((s) => s.id === 'history')?.content).toBe('اردو تاریخ');
  });
});
