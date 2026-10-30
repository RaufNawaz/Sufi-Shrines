import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { ProseParagraphs } from '../ProseParagraphs';
import { verseKeyText } from '../verseLanguage';
import URDU_CONTENT from '../../../data/urdu-content.json';

const ROOT = join(__dirname, '..', '..', '..', '..');
const same = (t: string) => t;

/* Rauf, 30 October 2026, of Bulleh Shah's kafi in the Urdu article: "in urdu
   the shayri itself should again be centered". The screenshot was of the old
   Urdu article, whose renderings were bracketed prose, so only its first line
   was centred; the articles of 29 October set every quoted verse as verse.
   This holds that true: every verse recorded in
   entries/verse_originals/languages.json that an Urdu article quotes is set as
   a centred verse block there, never as a paragraph of prose. */
describe('quoted verse in the Urdu articles', () => {
  it('is set as verse wherever it stands', () => {
    const record = JSON.parse(
      readFileSync(join(ROOT, 'entries', 'verse_originals', 'languages.json'), 'utf8'),
    ) as { entries: { verse: string }[] };
    const verses = new Set(record.entries.map((e) => verseKeyText(e.verse)));
    const prose: string[] = [];
    let seen = 0;
    for (const [slug, entry] of Object.entries(
      URDU_CONTENT as Record<string, { descriptionUr?: string }>,
    )) {
      const text = entry.descriptionUr ?? '';
      if (!text) continue;
      const { container } = render(<ProseParagraphs text={text} localize={same} />);
      for (const p of container.querySelectorAll('p')) {
        if (verses.has(verseKeyText(p.textContent ?? ''))) prose.push(`${slug}: ${p.textContent}`);
      }
      for (const b of container.querySelectorAll('blockquote.article-verse')) {
        const lines = [...b.querySelectorAll('.article-verse-line')].map((l) => l.textContent);
        if (verses.has(lines.join('\n'))) seen += 1;
      }
    }
    expect(prose).toEqual([]);
    expect(seen).toBeGreaterThan(100);
  });
});
