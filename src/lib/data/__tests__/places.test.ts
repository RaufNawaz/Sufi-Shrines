import { describe, it, expect } from 'vitest';
import {
  buildAllPlaces,
  buildPlaces,
  buildProvinces,
  placesForShrine,
  provinceForShrine,
  PLACES,
  PROVINCES,
} from '../places';
import { translateToUrdu } from '../../i18n/urduFallback';
import { buildShrines } from '../shrineModel';
import snapshot from '../../../data/shrines-fallback.json';
import type { ShrineRow } from '../../../types/shrine';

/**
 * Every number here is measured against the shipped snapshot, so each is a claim
 * that can go stale. That is the point: a place vocabulary silently matching
 * fewer rows than it used to is exactly the failure this catches, and it is the
 * failure `extractRegion` had before it was rewritten (six junk chips, Punjab
 * at 30 instead of 87).
 */
const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);

describe('the place vocabulary', () => {
  it('has unique slugs and no empty patterns', () => {
    const slugs = PLACES.map((p) => p.slug);
    expect(new Set(slugs).size, 'duplicate slug in PLACES').toBe(slugs.length);
    for (const p of PLACES) {
      expect(p.name.trim(), `${p.slug} has no name`).not.toBe('');
      expect(p.match.test(''), `${p.slug} matches the empty string`).toBe(false);
    }
  });

  it('is ordered alphabetically by slug, so review is a diff', () => {
    const slugs = PLACES.map((p) => p.slug);
    expect(slugs).toEqual([...slugs].sort());
  });

  it('every place name has an Urdu translation', () => {
    /*
     * A place page in the Urdu view must not be titled in English. The names are
     * therefore spelled the way the archive and the dictionary spell them, which
     * is not always the shortest form — "Sehwan Sharif", "Ghotki District",
     * "Hingol National Park". Five of the sixty-two had no Urdu until their
     * names were spelled that way, so this is the check that keeps a tidier
     * spelling from silently costing a translation.
     *
     * If a name genuinely has no Urdu, add the entry to
     * urdu-i18n/build_dictionary.py's PLACE_TOKENS and rebuild — do not
     * transliterate here, and do not add it to an allowlist.
     */
    const untranslated = PLACES.filter((p) => {
      const urdu = translateToUrdu(p.name);
      return !urdu || /[A-Za-z]/.test(urdu);
    }).map((p) => `${p.slug} ("${p.name}")`);
    expect(
      untranslated,
      'these place names return Latin from the dictionary, so their Urdu page would be ' +
        'titled in English. Add them to PLACE_TOKENS in urdu-i18n/build_dictionary.py and ' +
        'run `npm run data:build:urdu`.',
    ).toEqual([]);
  });

  it('matches nothing in a Location that names no place', () => {
    const nowhere = { ...shrines[0]!, location: 'somewhere entirely unrecorded' };
    expect(placesForShrine(nowhere)).toEqual([]);
  });
});

describe('buildPlaces over the shipped snapshot', () => {
  const { places, unplaced } = buildPlaces(shrines);

  it('found the snapshot', () => {
    // A build over an empty array would make every assertion below vacuous.
    expect(shrines.length).toBeGreaterThan(150);
  });

  it('groups the archive into places that each hold at least two sites', () => {
    expect(places.length).toBeGreaterThanOrEqual(25);
    for (const p of places) expect(p.shrines.length).toBeGreaterThanOrEqual(2);
  });

  it('puts Lahore first, and it is much the largest', () => {
    // 35 of 169 sites are in or around Lahore — the observation Track B exists
    // for. If this stops being true the vocabulary has probably regressed.
    expect(places[0]!.slug).toBe('lahore');
    expect(places[0]!.shrines.length).toBeGreaterThanOrEqual(30);
  });

  it('leaves at most the one site whose survey names no place at all', () => {
    /* Unplaced means "the Location names nowhere in the vocabulary", not "this
       place has only one site".
     *
     * Exactly one row qualifies as of 21 August 2026, and it qualifies
     * honestly: Darbar Malik Ahmad Ayaz's Location is a paragraph saying, in
     * as many words, that "no city, district, tehsil or province is stated
     * anywhere in the survey for the shrine itself". Nothing can place it, and
     * inventing a city for it would be the exact thing RULE 2 forbids.
     *
     * The threshold was 10 while the vocabulary was still being read off the
     * data; it is 2 now, because the remaining six unplaced rows turned out to
     * be vocabulary gaps rather than data gaps — Quetta, Hyderabad, Kasur and
     * Sharda were simply missing, and Girhor Sharif was unplaced for a vowel
     * ("Umarkot" against a pattern that only matched "Umerkot"). A loose
     * threshold would have hidden all five. */
    /* Since the October 2026 book rows, 18 rows have an EMPTY Location: Hadiqat
     * al-Awliya gives each a list of candidate places ("Satghara, Hujra, Jarwa,
     * Chunian…") and the build refused to choose one (RULE 2). They cannot be
     * placed and are counted apart; the threshold still holds for every row
     * that names somewhere, which is where a vocabulary gap would show. */
    const named = unplaced.filter((s) => s.location);
    expect(named.length).toBeLessThanOrEqual(2);
    expect(named.every((s) => s.location!.length > 80)).toBe(true);
  });

  it('lets one site belong to a town and its district, because it is in both', () => {
    // "Uch Sharif, Bahawalpur District, Punjab" is both, and suppressing either
    // would mean choosing which true statement to hide.
    const uch = places.find((p) => p.slug === 'uch-sharif');
    const bwp = places.find((p) => p.slug === 'bahawalpur');
    expect(uch, 'uch-sharif has no place record').toBeDefined();
    expect(bwp, 'bahawalpur has no place record').toBeDefined();
    const shared = uch!.shrines.filter((s) => bwp!.shrines.includes(s));
    expect(shared.length, 'no site is recorded in both Uch Sharif and Bahawalpur').toBeGreaterThan(
      0,
    );
  });

  it('counts traditions per place without inventing a category', () => {
    for (const p of places) {
      const summed = p.traditions.reduce((a, t) => a + t.count, 0);
      expect(summed, `${p.slug} counts more traditions than it has sites`).toBeLessThanOrEqual(
        p.shrines.length,
      );
      expect(p.traditions.every((t) => t.count > 0)).toBe(true);
    }
    // Lahore is the one place where the archive holds several traditions side
    // by side; that is the whole argument of SHARED_GROUND_VISION.md.
    const lahore = places.find((p) => p.slug === 'lahore')!;
    expect(lahore.traditions.length).toBeGreaterThanOrEqual(3);
  });

  it('reads a year span only from dates it can actually read', () => {
    for (const p of places) {
      if (!p.yearSpan) continue;
      expect(p.yearSpan.earliest).toBeLessThanOrEqual(p.yearSpan.latest);
      expect(p.yearSpan.earliest).toBeGreaterThanOrEqual(1000);
      expect(p.yearSpan.latest).toBeLessThanOrEqual(2099);
    }
  });

  it('never turns a Hijri date into a Gregorian year', () => {
    // "1416 AH" is not 1416 CE. RULE 2: a date the archive hedges must not be
    // flattened into a point, and a calendar it does not convert must not be
    // silently reinterpreted.
    const hijri = {
      ...shrines[0]!,
      location: 'Lahore, Punjab, Pakistan',
      yearBuilt: '1416 AH (as given in the form)',
      founded: '',
    };
    const { places: p } = buildPlaces([hijri, { ...hijri, id: -2 }]);
    expect(p[0]!.yearSpan, 'a Hijri year was read as Gregorian').toBeNull();
  });

  it('drops a one-site place from the pages but does not call it unplaced', () => {
    const one = { ...shrines[0]!, location: 'Sialkot, Punjab, Pakistan' };
    const { places: p, unplaced: u } = buildPlaces([one]);
    expect(p).toEqual([]);
    expect(u, 'a placed site with no neighbours was reported as unplaced').toEqual([]);
  });
});

describe('every place a shrine page links to has a page', () => {
  it('builds a page for every place chip on every shrine', () => {
    /* The shrine page links every place a site is in. Until 30 October 2026 a
       place needed two sites for a page, so 37 chips (Kasur among them) led to
       "No place by that name is recorded." */
    const slugs = new Set(buildAllPlaces(shrines).places.map((p) => p.slug));
    for (const shrine of shrines) {
      for (const place of placesForShrine(shrine)) {
        expect(slugs.has(place.slug), `${shrine.slug} links /place/${place.slug}`).toBe(true);
      }
      const province = provinceForShrine(shrine, shrines);
      if (province) expect(slugs.has(province.slug), province.slug).toBe(true);
    }
    expect(slugs.has('kasur')).toBe(true);
    expect(slugs.has('pakpattan')).toBe(true);
  });
});

describe('provinces', () => {
  const provinces = buildProvinces(shrines);

  it('have slugs that no place uses', () => {
    const placeSlugs = new Set(PLACES.map((p) => p.slug));
    for (const p of PROVINCES) expect(placeSlugs.has(p.slug), p.slug).toBe(false);
  });

  it('every province name has an Urdu translation', () => {
    const untranslated = PROVINCES.filter((p) => {
      const urdu = translateToUrdu(p.name);
      return !urdu || /[A-Za-z]/.test(urdu);
    }).map((p) => p.slug);
    expect(untranslated).toEqual([]);
  });

  it('put a site with no province in its Location in the province of its place', () => {
    const lahoreOnly = shrines.find(
      (s) => s.location === 'Lahore' || (/\bLahore\b/.test(s.location ?? '') && !s.region),
    );
    expect(lahoreOnly, 'no Lahore row without a recorded province').toBeTruthy();
    expect(provinceForShrine(lahoreOnly!, shrines)?.slug).toBe('punjab');
  });

  it('never place a site in two provinces, and say so when a place is split', () => {
    const counted = provinces.reduce((n, p) => n + p.shrines.length, 0);
    const ids = new Set(provinces.flatMap((p) => p.shrines.map((s) => s.id)));
    expect(ids.size).toBe(counted);
  });

  it('give Punjab, Sindh, Khyber Pakhtunkhwa and Balochistan a page', () => {
    const slugs = provinces.map((p) => p.slug);
    for (const slug of ['punjab', 'sindh', 'khyber-pakhtunkhwa', 'balochistan']) {
      expect(slugs).toContain(slug);
    }
    expect(provinces.every((p) => p.kind === 'province')).toBe(true);
    /* Sharada Peeth's Location ends "(Azad Kashmir), Pakistan", which `region`
       reads as the country; the province must still be found. */
    expect(slugs).toContain('azad-kashmir');
  });

  it('do not take a province from a place whose sites disagree', () => {
    const a = { ...shrines[0]!, id: -1, location: 'Testtown, Punjab, Pakistan', region: 'Punjab' };
    const b = { ...shrines[0]!, id: -2, location: 'Testtown, Sindh, Pakistan', region: 'Sindh' };
    const c = { ...shrines[0]!, id: -3, location: 'Multan', region: '' };
    const d = { ...shrines[0]!, id: -4, location: 'Multan, Punjab, Pakistan', region: 'Punjab' };
    expect(provinceForShrine(c, [a, b, c, d])?.slug).toBe('punjab');
    const e = { ...shrines[0]!, id: -5, location: 'Multan, Sindh, Pakistan', region: 'Sindh' };
    expect(provinceForShrine(c, [c, d, e]), 'a split place gave its sites a province').toBeNull();
  });
});
