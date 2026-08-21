// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLICATION, archiveCitation, entryCitation } from '../citation';

/**
 * The licence notice the site shows must match the licence the repository
 * grants. A notice that has drifted is worse than none: it tells a reuser
 * something untrue about their rights.
 */
const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

describe('publication metadata', () => {
  it('the version matches CITATION.cff', () => {
    const cff = read('CITATION.cff');
    const version = /^version:\s*'([^']+)'/m.exec(cff)?.[1];
    expect(version, 'no version in CITATION.cff').toBeTruthy();
    expect(PUBLICATION.version).toBe(version);
  });

  it('the data licence matches CITATION.cff and LICENSE-data.md', () => {
    expect(/^license:\s*'ODbL-1\.0'/m.test(read('CITATION.cff'))).toBe(true);
    expect(read('LICENSE-data.md')).toContain('ODbL-1.0');
    expect(PUBLICATION.dataLicense).toBe('ODbL-1.0');
  });

  it('the code licence matches LICENSE', () => {
    expect(read('LICENSE').startsWith('MIT License')).toBe(true);
    expect(PUBLICATION.codeLicense).toBe('MIT');
  });

  it('the author and affiliation match CITATION.cff', () => {
    const cff = read('CITATION.cff');
    expect(cff).toContain("family-names: 'Nawaz'");
    expect(cff).toContain("given-names: 'Rauf'");
    expect(cff).toContain("affiliation: 'Harvard University'");
    expect(PUBLICATION.author).toBe('Rauf Nawaz');
    expect(PUBLICATION.affiliation).toBe('Harvard University');
  });

  it('the attribution string carries the version the archive claims', () => {
    // ODbL prescribes the attribution wording; a stale version in it would
    // credit the wrong release.
    expect(PUBLICATION.attribution).toContain(`v${PUBLICATION.version}`);
    expect(PUBLICATION.attribution).toContain('Nawaz, Rauf');
  });

  it('an entry citation names the item, the database and the accessed date', () => {
    // The accessed date is not decoration: this archive reads a live sheet, so a
    // page can change under the reader and a citation without a date is
    // unverifiable.
    const line = entryCitation('Data Darbar', 'data-darbar', new Date('2026-08-21T10:00:00Z'));
    expect(line).toContain('"Data Darbar"');
    expect(line).toContain('Sufi Shrines of Pakistan');
    expect(line).toContain('/shrine/data-darbar');
    expect(line).toContain('accessed 2026-08-21');
  });

  it('the archive citation carries version and URL', () => {
    const line = archiveCitation();
    expect(line).toContain(`v${PUBLICATION.version}`);
    expect(line).toContain(PUBLICATION.siteUrl);
  });
});
