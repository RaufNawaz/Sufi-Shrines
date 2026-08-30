import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { SourceNotes } from '../SourceNotes';
import { renderWithProviders } from '../../../test/utils';
import sourceNotes from '../../../data/source-notes.json';
import shrineSnapshot from '../../../data/shrines-fallback.json';
import { SOURCE_NOTE_SLUGS } from '../../../data/sourceNoteSlugs';
import { buildShrines } from '../../../lib/data/shrineModel';
import type { ShrineRow } from '../../../types/shrine';

const table = sourceNotes as unknown as Record<string, Array<{ en: string; ur: string }> | string>;

describe('source-notes content contract', () => {
  it('covers every shrine with an internal QA note, plus the two unmapped survey rows', () => {
    /*
     * The expectation is built from the route slug, not from `row.id`.
     *
     * It used to read `.map((row) => row.id)` and compare that to
     * `Object.keys(table)` — and the table was keyed by `id` too, so both sides
     * were the same column and the assertion could not fail. Six keys were not
     * routes and four of them were live pages publishing no disclosure at all
     * (Tahir Bandagi Qadri, Wasif Ali Wasif, Khawaja Feroz-ud-Din Gharib Nawaz,
     * Ghazi Ilm Din Shaheed). `ShrinePage` looks the table up by `shrine.slug`,
     * so the slug is the only side that can disagree with it.
     *
     * See `src/lib/data/__tests__/sourceNoteKeys.test.ts` for the same
     * invariant asserted against `buildSlugs`, and for why the two survey rows
     * below are still exceptions.
     */
    /* Keyed on Name, because `Shrine.id` is the row index rather than the
       sheet's `id` column — the same distinction that made a shared
       `?selected=` link open a different shrine. */
    const slugByName = new Map(
      buildShrines(shrineSnapshot.rows as unknown as ShrineRow[]).map((s) => [s.name, s.slug]),
    );
    const expected = shrineSnapshot.rows
      .filter((row) => row.qa_note?.trim())
      .map((row) => slugByName.get(row.Name) ?? row.id)
      .concat(['darbar-mian-qurban-ali-shah', 'darbar-hazrat-shah-gohar-peer'])
      .sort();
    const actual = Object.keys(table)
      .filter((slug) => !slug.startsWith('_'))
      .sort();

    expect(actual).toEqual(expected);
  });

  it('the slug index names exactly the entries that have notes', () => {
    /* The index decides whether a shrine page downloads 92.6 KB or nothing, so
       a slug missing from it is a disclosure a reader silently never sees —
       a failure with no symptom, which is why it is asserted in both
       directions rather than by length. Regeneration command is in the header
       of src/data/sourceNoteSlugs.ts. */
    const withNotes = Object.entries(table)
      .filter(([slug, items]) => !slug.startsWith('_') && Array.isArray(items) && items.length > 0)
      .map(([slug]) => slug)
      .sort();

    expect([...SOURCE_NOTE_SLUGS].sort()).toEqual(withNotes);
  });

  it('every entry is bilingual, and the Urdu side carries no Latin', () => {
    const slugs = Object.keys(table).filter((k) => !k.startsWith('_'));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      const items = table[slug];
      expect(Array.isArray(items), `${slug} must hold an item array`).toBe(true);
      for (const item of items as Array<{ en: string; ur: string }>) {
        expect(item.en.length).toBeGreaterThan(20);
        expect(item.ur.length).toBeGreaterThan(20);
        expect(item.ur, `Urdu note leaked Latin in ${slug}`).not.toMatch(/[A-Za-z]/);
      }
    }
  });

  it('the sensitive items are attributed, never asserted in the archive voice', () => {
    // The ruling: attribute everything, withhold nothing. The Dyal Singh
    // College claim must be present AND framed as the survey's statement.
    const items = table['darbar-abul-muali-qadri'] as Array<{ en: string }>;
    const dyal = items.find((i) => i.en.includes('Dyal Singh College'));
    expect(dyal).toBeDefined();
    expect(dyal!.en).toMatch(/survey/i);
  });
});

describe('SourceNotes component', () => {
  it('renders the disclosure for an entry with notes', async () => {
    renderWithProviders(<SourceNotes slug="darbar-abul-muali-qadri" />);
    await waitFor(() =>
      expect(screen.getByText('Where the source contradicts itself')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Dyal Singh College/)).toBeInTheDocument();
  });

  it('renders nothing for an entry without notes', async () => {
    const { container } = renderWithProviders(<SourceNotes slug="data-darbar" />);
    // Let the lazy import settle, then assert absence.
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('.source-notes')).toBeNull();
  });

  it('renders the Urdu side in Urdu', async () => {
    renderWithProviders(<SourceNotes slug="darbar-malik-ahmad-ayaz" />, { lang: 'ur' });
    await waitFor(() =>
      expect(screen.getByText('جہاں ماخذ خود اپنے بیان سے ٹکراتا ہے')).toBeInTheDocument(),
    );
    const list = document.querySelector('.source-notes-list')!;
    expect(list.textContent).not.toMatch(/[A-Za-z]/);
  });
});
