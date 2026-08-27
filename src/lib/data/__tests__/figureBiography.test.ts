// @vitest-environment node
/**
 * Whose life is this, and is it a life at all.
 *
 * Two failures are asserted impossible here, and both would have produced a page
 * that reads perfectly and says something false.
 *
 * **A life attributed to the wrong person.** An entry's biographical prose
 * belongs to the figure that entry is about. Echo it onto a second figure's page
 * — because they share a site, because a join was written one degree too loose —
 * and the archive has published a biography of the wrong person with nothing in
 * the text to signal it. In the shipped data every entry names exactly one
 * figure, so the guard never fires; it is tested against synthetic input for the
 * same reason `figureTimeline`'s contradiction check is.
 *
 * **A shrine's devotional practice published as a person's life.** This is the
 * one that would actually have shipped. `/life/i` is the obvious classifier and
 * **eighteen of this archive's headings containing "Life" are about the site**:
 * "Devotional Life", "The Shrine and its Devotional Life", "Festivals and
 * Devotional Life", "Architecture and Devotional Life", "The Temple and Its
 * Life". Each would have arrived on a figure's page under a heading promising a
 * biography and been read as one.
 *
 * The last test is the one that keeps this honest over time: any heading in the
 * shipped data that mentions a life and has been classified as neither must fail
 * the build, so a new heading is an editorial decision rather than a default.
 */
import { describe, it, expect } from 'vitest';
import { biographyForFigure, classifyBiographyHeading } from '../figureBiography';
import { parseInlineSections } from '../articleParsing';
import { figureSlugsForShrine } from '../../kgShrineFigures';
import { buildShrines } from '../shrineModel';
import { getFieldValue } from '../fieldAliasing';
import snapshot from '../../../data/shrines-fallback.json';
import urduContent from '../../../data/urdu-content.json';
import type { Shrine, ShrineRow } from '../../../types/shrine';

const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);
const english = (shrine: Shrine) => getFieldValue(shrine.raw, 'Description');
const urdu = (shrine: Shrine) =>
  (urduContent as Record<string, { descriptionUr?: string }>)[shrine.slug]?.descriptionUr ?? '';

const headingsOf = (text: string) => parseInlineSections(text).map((s) => s.heading);

describe('a heading is a life only when it is about a person', () => {
  it('refuses the shrine’s own devotional life, in both languages', () => {
    for (const heading of [
      'Devotional Life',
      'The Shrine and its Devotional Life',
      'Festivals and Devotional Life',
      'Architecture and Devotional Life',
      'The Temple and Its Life',
      'Devotional Life and the Annual Urs',
      'Shivratri and Devotional Life',
    ]) {
      expect(classifyBiographyHeading(heading, 'en'), heading).toBe('site');
    }
    for (const heading of [
      'عقیدت مندانہ زندگی',
      'مزار اور اس کی عقیدت مندانہ زندگی',
      'عقیدت کی زندگی اور سالانہ عرس',
      'مزار اور اس کی عقیدت',
    ]) {
      expect(classifyBiographyHeading(heading, 'ur'), heading).toBe('site');
    }
  });

  it('accepts the ones that name a person’s life', () => {
    for (const heading of [
      'The Life of the Saint',
      'The Life of the Poet-Saint',
      'The Life of Ali Hujwiri',
      'The Life and Martyrdom of Bhai Taru Singh',
      'The Saint and the Tradition',
      'Wasif Ali Wasif — life and career',
    ]) {
      expect(classifyBiographyHeading(heading, 'en'), heading).toBe('biography');
    }
    for (const heading of ['بزرگ کی زندگی', 'ولی کی زندگی', 'شاعر بزرگ کی زندگی', 'بزرگ اور روایت']) {
      expect(classifyBiographyHeading(heading, 'ur'), heading).toBe('biography');
    }
  });

  it('does not read one language’s headings with the other’s rules', () => {
    /* The property that makes the Urdu view safe without a single guard in the
       component: where no Urdu article exists, `localizeField` hands back the
       English Description, and its Latin headings must classify as nothing at
       all rather than as a life. An Urdu reader gets silence, not a page of
       untranslated English (i18n rule 7). */
    expect(classifyBiographyHeading('The Life of the Saint', 'ur')).toBe('unclassified');
    expect(classifyBiographyHeading('بزرگ کی زندگی', 'en')).toBe('unclassified');
  });
});

describe('an entry may speak only for the figure it is about', () => {
  it('shows nothing for a figure the entry does not name', () => {
    const carrier = shrines.find(
      (s) => parseInlineSections(english(s)).some((x) => classifyBiographyHeading(x.heading, 'en') === 'biography'),
    )!;
    const its = figureSlugsForShrine(carrier.slug)[0]!;
    expect(biographyForFigure(its, [carrier], english, 'en').length).toBeGreaterThan(0);
    expect(biographyForFigure('some-other-figure', [carrier], english, 'en')).toEqual([]);
  });

  it('shows nothing when the entry names more than one figure', () => {
    /* No entry in the shipped data does, which is exactly why the index is
       injected here: a guard that cannot be made to fire is a guard nobody has
       checked. Two figures on one entry means its prose cannot be attributed to
       either of them without guessing, so it is attributed to neither. */
    const carrier = shrines.find((s) =>
      parseInlineSections(english(s)).some(
        (x) => classifyBiographyHeading(x.heading, 'en') === 'biography',
      ),
    )!;
    const its = figureSlugsForShrine(carrier.slug)[0]!;
    expect(figureSlugsForShrine(carrier.slug)).toHaveLength(1);

    // With one figure, the entry speaks.
    expect(
      biographyForFigure(its, [carrier], english, 'en', () => [its]).length,
    ).toBeGreaterThan(0);

    // With two, it says nothing — for either of them.
    const shared = () => [its, 'a-second-figure'];
    expect(biographyForFigure(its, [carrier], english, 'en', shared)).toEqual([]);
    expect(biographyForFigure('a-second-figure', [carrier], english, 'en', shared)).toEqual([]);
  });

  it('keeps the entry’s own heading rather than a generic one', () => {
    const rows = shrines.flatMap((s) => biographyForFigure(
      figureSlugsForShrine(s.slug)[0] ?? '', [s], english, 'en',
    ));
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.every((r) => r.heading.trim().length > 0)).toBe(true);
    expect(new Set(rows.map((r) => r.heading)).size).toBeGreaterThan(5);
  });
});

describe('over the shipped archive', () => {
  const carriers = (read: (s: Shrine) => string, lang: 'en' | 'ur') =>
    shrines.filter((s) =>
      headingsOf(read(s)).some((h) => classifyBiographyHeading(h, lang) === 'biography'),
    );

  it('finds the biographical entries the plan under-counted', () => {
    /* The working plan named three heading forms and put the total at 32. There
       are eleven more forms — entries that name their subject in the heading —
       and the real number is 48. Asserted as a floor with a ceiling, so growth
       is fine and a collapse is not. */
    const found = carriers(english, 'en').length;
    expect(found).toBeGreaterThanOrEqual(45);
    expect(found).toBeLessThanOrEqual(169);
  });

  it('finds Urdu counterparts for most, and the gap is stated rather than filled', () => {
    const en = carriers(english, 'en').map((s) => s.slug);
    const ur = carriers(urdu, 'ur').map((s) => s.slug);
    expect(ur.length).toBeGreaterThanOrEqual(40);
    /* An entry with an English life and no Urdu one shows nothing in the Urdu
       view. That is a real gap in the archive and this is where its size is
       recorded; it must not be closed by relaxing the Urdu classifier. */
    const englishOnly = en.filter((slug) => !ur.includes(slug));
    expect(englishOnly.length).toBeLessThanOrEqual(10);
  });

  it('has classified every heading in the data that mentions a life', () => {
    /* The check that keeps this from rotting. A new entry with a new heading
       must be looked at by a person: it will land here as unclassified and fail,
       rather than defaulting into or out of publication. */
    const undecided = new Set<string>();
    for (const shrine of shrines) {
      for (const heading of headingsOf(english(shrine))) {
        if (!/\blife\b|\blives\b|biograph/i.test(heading)) continue;
        if (classifyBiographyHeading(heading, 'en') === 'unclassified') undecided.add(heading);
      }
      for (const heading of headingsOf(urdu(shrine))) {
        if (!/زندگی|سوانح/.test(heading)) continue;
        if (classifyBiographyHeading(heading, 'ur') === 'unclassified') undecided.add(heading);
      }
    }
    expect(
      [...undecided],
      'These headings mention a life and are classified as neither a person’s nor a ' +
        'site’s. Add each to the allow or the deny list in figureBiography.ts — the point ' +
        'of this failure is that a person decides, rather than a regex defaulting.',
    ).toEqual([]);
  });
});
