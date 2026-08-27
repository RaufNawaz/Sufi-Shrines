/**
 * The saved list as a file the reader can keep.
 *
 * The list is localStorage only — no account, works offline, never leaves the
 * device — which is the right design and leaves it one cleared cache from gone,
 * and unable to move to a phone. Export and import are the durability that
 * design traded away, and the parser is where the care goes: it is the one place
 * in this app that reads a file a person chose.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSavedListFile,
  clearSaved,
  getSavedSlugs,
  parseSavedListFile,
  replaceSavedSlugs,
  toggleSaved,
} from '../savedShrines';

describe('the saved list as a file', () => {
  beforeEach(() => localStorage.clear());

  it('exports what is saved, with the date for the person reading it', () => {
    toggleSaved('data-darbar');
    toggleSaved('bibi-pak-daman');
    const file = buildSavedListFile(new Date('2026-08-27T12:00:00Z'));
    expect(file.version).toBe(1);
    expect(file.exported).toBe('2026-08-27T12:00:00.000Z');
    expect(file.saved).toEqual(['data-darbar', 'bibi-pak-daman']);
  });

  it('exports slugs and no names, on purpose', () => {
    /* A slug is the archive's stable identity — the published photo URLs ride
       the same contract — while a name is editorial and gets corrected. A file
       carrying names would look more readable and be wrong a year later. */
    toggleSaved('data-darbar');
    const file = buildSavedListFile(new Date());
    expect(JSON.stringify(file)).not.toMatch(/name/i);
  });

  it('round-trips its own export', () => {
    toggleSaved('shah-jamal');
    const text = JSON.stringify(buildSavedListFile(new Date()));
    clearSaved();
    expect(getSavedSlugs()).toEqual([]);
    const parsed = parseSavedListFile(text);
    expect(parsed).toEqual(['shah-jamal']);
  });

  describe('parseSavedListFile', () => {
    it('accepts a list with no entries, because an empty list is a real answer', () => {
      expect(parseSavedListFile('{"version":1,"saved":[]}')).toEqual([]);
    });

    it('rejects anything it cannot vouch for', () => {
      for (const bad of [
        'not json at all',
        '',
        '[]',
        'null',
        '"a string"',
        '{"saved":"data-darbar"}',
        '{"version":1}',
        '{"saved":{"0":"data-darbar"}}',
      ]) {
        expect(parseSavedListFile(bad), `input ${JSON.stringify(bad)}`).toBeNull();
      }
    });

    it('rejects a file whose entries are all unusable rather than reading it as empty', () => {
      /* The distinction that matters for the message the reader sees: "nothing
         was in that file" and "that file is not one of ours" are different
         answers, and reporting the wrong one sends them looking in the wrong
         place. */
      expect(parseSavedListFile('{"saved":[1,2,3]}')).toBeNull();
      expect(parseSavedListFile('{"saved":["", "  "]}')).toBeNull();
    });

    it('keeps a slug the archive no longer has', () => {
      /* Deliberately not filtered against the dataset. The archive gains
         entries, and a reader who saved a site before it was published should
         not have it silently deleted by an import; the surfaces that render the
         list already skip what they cannot resolve. */
      const parsed = parseSavedListFile('{"saved":["a-site-not-in-this-archive"]}');
      expect(parsed).toEqual(['a-site-not-in-this-archive']);
    });

    it('ignores the exported date rather than trusting it', () => {
      expect(parseSavedListFile('{"exported":"not-a-date","saved":["x"]}')).toEqual(['x']);
    });
  });

  describe('replaceSavedSlugs', () => {
    it('de-duplicates, because a merge of two devices will overlap', () => {
      replaceSavedSlugs(['a', 'b', 'a', 'b', 'c']);
      expect(getSavedSlugs()).toEqual(['a', 'b', 'c']);
    });

    it('writes once, so an import of thirty is one update and not thirty', () => {
      let events = 0;
      const onChange = () => {
        events += 1;
      };
      window.addEventListener('shrines:saved-changed', onChange);
      replaceSavedSlugs(Array.from({ length: 30 }, (_, i) => `slug-${i}`));
      window.removeEventListener('shrines:saved-changed', onChange);
      expect(events).toBe(1);
    });
  });

  it('clears to empty and stays readable', () => {
    toggleSaved('data-darbar');
    clearSaved();
    expect(getSavedSlugs()).toEqual([]);
  });
});
