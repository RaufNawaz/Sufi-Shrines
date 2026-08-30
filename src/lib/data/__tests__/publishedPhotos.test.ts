// @vitest-environment node
/**
 * Every photograph the archive serves itself must exist in this repository
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * 134 of the archive's image URLs point at its own origin,
 * `raufnawaz.github.io/Sufi-Shrines/photos/…`, and are served from
 * `public/photos/`. Vite copies `public/` wholesale, so a missing or renamed
 * directory produces **no build error, no test failure and no console warning**.
 * The image 404s on the deployed site and nothing here knows.
 *
 * The only instrument that ever saw this class of problem is
 * `pipeline/check_image_liveness.py` — network, hand-run, and its own docstring
 * records that it has been wrong about a host before. This check is offline and
 * exact: an `existsSync` per URL, milliseconds, and it cannot be fooled by a
 * proxy, a certificate, or a server that answers `200` to curl and refuses an
 * `<img>`.
 *
 * ## The "do not break these" list was seven directories short
 *
 * `CLAUDE.md` said, under **Do not break these**, "Eight slugs carry live photo
 * URLs. Renaming any of them breaks published images." Measured on 30 August
 * 2026, **fifteen** directories carry them, and the seven the list omitted serve
 * **67 of the 134 photographs — exactly half**:
 *
 *     abul-muali-qadri · ghazi-ilm-din-shaheed · khawaja-feroz-ud-din-gharib-nawaz
 *     malik-ahmad-ayaz · shah-inayat-qadri-shattari · tahir-bandagi-qadri
 *     wasif-ali-wasif
 *
 * That is the worst place for an under-count to live. A careful agent reads that
 * section *precisely so as not to do this*, treats "eight" as the complete set,
 * reorganises one of the other seven, and takes down half the archive's
 * self-hosted photography. The sentence was a measurement with no date on it.
 *
 * The contract now names all fifteen, and the fourth test below **holds that
 * block equal to what this file derives from the data** — so the two cannot
 * drift, and a sixteenth directory reddens the build rather than sitting
 * unprotected. Same idiom as `siteCountConsistency.test.ts`, which ties the
 * archive's size to the shipped rows wherever it is written down.
 *
 * ## What this does not check
 *
 * That the file exists — not that a browser can paint it. Those are different
 * questions and the archive has been caught by the difference: Gurdwara Bhai
 * Joga Singh's photograph serves 200 and 52 KB of `image/jpeg` to a plain
 * request and is refused to an `<img>`. External hosts are out of scope here
 * entirely; that is `check_image_liveness.py`'s job, and it needs the network.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PHOTOS_DIR = join(ROOT, 'public', 'photos');

/** The origin the site serves its own photographs from. */
const SELF_HOSTED = 'https://raufnawaz.github.io/Sufi-Shrines/photos/';

type Row = Record<string, unknown>;

function selfHostedImages(): { name: string; column: string; url: string; rel: string }[] {
  const rows = (
    JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'shrines-fallback.json'), 'utf8')) as {
      rows: Row[];
    }
  ).rows;

  const out: { name: string; column: string; url: string; rel: string }[] = [];
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      if (!/^Image \d+$/.test(column)) continue;
      const url = String(value ?? '').trim();
      if (!url.startsWith(SELF_HOSTED)) continue;
      out.push({
        name: String(row.Name ?? '(unnamed)'),
        column,
        url,
        rel: decodeURIComponent(url.slice(SELF_HOSTED.length)),
      });
    }
  }
  return out;
}

const directoriesInUse = (): string[] =>
  [...new Set(selfHostedImages().map((i) => i.rel.split('/')[0]))].sort();

describe('self-hosted photographs', () => {
  it('all exist in public/photos', () => {
    const missing = selfHostedImages().filter((i) => !existsSync(join(PHOTOS_DIR, i.rel)));
    expect(
      missing.map((m) => `  ${m.name} · ${m.column}\n      ${m.rel}`),
      missing.length === 0
        ? ''
        : `${missing.length} self-hosted photograph(s) point at files this repository does not\n` +
            'contain. The site will serve a 404 for each, silently — Vite copies public/ wholesale\n' +
            'and nothing else notices. If a directory was renamed, the sheet URLs must be\n' +
            'repatched (RULE 3) before the rename lands.',
    ).toEqual([]);
  });

  it('has something to check, so a clean pass means something', () => {
    // Guards the instrument. If the URL prefix or the column naming changed,
    // the assertion above would pass over an empty list and read as healthy.
    const images = selfHostedImages();
    expect(
      images.length,
      'no self-hosted image URLs were found at all — the prefix or the `Image N` column ' +
        'convention has changed, and the check above is now measuring nothing',
    ).toBeGreaterThan(100);
  });

  it('names every directory that carries a live photo URL', () => {
    /* Derived rather than declared, because CLAUDE.md's hand-written list said
       eight and the real number is fifteen. This is the enumeration that
       sentence now points at. A new directory is not a failure — it is a fact
       this list should state, so update it here and the contract stays true. */
    expect(directoriesInUse()).toEqual([
      'abul-faiz-qalander-ali-suharwardi',
      'abul-muali-qadri',
      'bibi-pak-daman',
      'data-darbar',
      'ganj-e-inayat-sarkar',
      'ghazi-ilm-din-shaheed',
      'khawaja-feroz-ud-din-gharib-nawaz',
      'madho-lal-hussain',
      'malik-ahmad-ayaz',
      'mazar-e-iqbal',
      'peer-makki',
      'shah-inayat-qadri-shattari',
      'shah-jamal',
      'tahir-bandagi-qadri',
      'wasif-ali-wasif',
    ]);
  });

  it("agrees with CLAUDE.md's \"do not break these\" list", () => {
    /* The contract's list said eight while fifteen directories carried live
       URLs, so the two are tied rather than both hand-maintained. Same idiom as
       siteCountConsistency.test.ts: a number written in prose has to match the
       data or the build fails. */
    const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    const block =
      /carry live photo URLs\.\*\* Renaming any of them\nbreaks published images:\n\n```\n([\s\S]*?)```/.exec(
        claudeMd,
      );
    expect(
      block,
      "could not find the protected-directory block in CLAUDE.md's \"Do not break these\". If " +
        'the wording changed, update this pattern — do not delete the check, because an ' +
        'unguarded list there is how it came to be seven directories short.',
    ).not.toBeNull();

    const listed = block![1]
      .split(/[\n·]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .sort();
    expect(
      listed,
      'CLAUDE.md names a different set of photo directories than the data uses. Renaming one ' +
        'that is missing from that list takes down published images, which is exactly what the ' +
        'section exists to prevent.',
    ).toEqual(directoriesInUse());

    const stated = /\*\*(\w+) directories under `public\/photos\/` carry live photo URLs/.exec(
      claudeMd,
    );
    expect(stated, 'the count sentence was reworded').not.toBeNull();
    expect(stated![1]).toBe('Fifteen');
  });

  it('reports a photo directory no row points at', () => {
    /* Not a failure — the two here belong to the two shrines that are drafted,
       live in the sheet and absent from the 169-row snapshot, so their pictures
       arrived before their rows did. It corroborates the unpublished-entry gap
       from a direction nothing else looks from, and it should shrink to zero
       when `npm run data:build` runs. */
    const onDisk = readdirSync(PHOTOS_DIR).filter((d) => statSync(join(PHOTOS_DIR, d)).isDirectory());
    const inUse = new Set(directoriesInUse());
    expect(onDisk.filter((d) => !inUse.has(d)).sort()).toEqual([
      'mian-qurban-ali-shah',
      'shah-gohar-peer',
    ]);
  });
});
