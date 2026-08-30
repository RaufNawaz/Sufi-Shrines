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
    expect(line).toContain('Mapping the Shrines of Pakistan');
    expect(line).toContain('/shrine/data-darbar');
    expect(line).toContain('accessed 2026-08-21');
  });

  it('the archive citation carries version and URL', () => {
    const line = archiveCitation();
    expect(line).toContain(`v${PUBLICATION.version}`);
    expect(line).toContain(PUBLICATION.siteUrl);
  });
});

/**
 * Five files state the dataset's version and four state its year. Until
 * 30 August 2026 they gave THREE different answers — LICENSE-data.md v1.0.0,
 * citation.ts v2.0.0, the release README v1.0.0 and year 2025 — and every one of
 * them was reachable by a reader who wanted to cite the archive correctly. The
 * test above only ever compared citation.ts against CITATION.cff, so the other
 * three drifted in a blind spot for as long as they liked.
 *
 * A version and a year are facts about a release, so this is a RULE 2 matter and
 * not a formatting one. The invariant is cheap; the blind spot was not.
 */
describe('every file that states a version states the same one', () => {
  const SOURCES: Array<{ file: string; re: RegExp }> = [
    { file: 'CITATION.cff', re: /^version:\s*'([^']+)'/m },
    { file: 'codemeta.json', re: /"version":\s*"([^"]+)"/ },
    { file: 'data/datapackage.json', re: /"version":\s*"([^"]+)"/ },
    { file: 'LICENSE-data.md', re: /\(v(\d+\.\d+\.\d+)\)/ },
    { file: 'scripts/data/release.mjs', re: /dataset_version:\s*'([^']+)'/ },
  ];

  it.each(SOURCES)('$file agrees with PUBLICATION.version', ({ file, re }) => {
    const found = re.exec(read(file))?.[1];
    expect(found, `no version found in ${file}`).toBeTruthy();
    expect(found, `${file} disagrees with citation.ts`).toBe(PUBLICATION.version);
  });

  it('the release README template does not still say 2025', () => {
    // It did, for the whole time the archive claimed 2026 everywhere else.
    const release = read('scripts/data/release.mjs');
    const cited = /Harvard University, (\d{4})\./.exec(release)?.[1];
    expect(cited, 'no citation year in release.mjs').toBeTruthy();
    expect(cited).toBe('2026');
  });

  it('the year is the same in the licence, the citation file and codemeta', () => {
    expect(read('LICENSE-data.md')).toContain('Harvard University, 2026.');
    expect(read('CITATION.cff')).toContain("date-released: '2026-");
    expect(read('codemeta.json')).toContain('"copyrightYear": 2026');
    expect(archiveCitation()).toContain('2026');
  });
});
