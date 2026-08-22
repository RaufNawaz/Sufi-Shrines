import { describe, it, expect, beforeEach } from 'vitest';
import { parseSharedList, buildSharedListUrl, importSharedList } from '../sharedList';
import { getSavedSlugs, toggleSaved } from '../savedShrines';

beforeEach(() => {
  localStorage.clear();
  // Nudge the module cache past its raw-string memo of the cleared key.
  window.dispatchEvent(new Event('storage'));
});

describe('parseSharedList', () => {
  it('reads, trims, and dedupes slugs from ?list=', () => {
    expect(parseSharedList('?list=data-darbar,shah-jamal,%20data-darbar')).toEqual([
      'data-darbar',
      'shah-jamal',
    ]);
  });

  it('drops anything that is not a stable slug rather than guessing', () => {
    expect(parseSharedList('?list=data-darbar,<script>,DATA-DARBAR,../etc,shah%20jamal')).toEqual([
      'data-darbar',
    ]);
  });

  it('returns empty for a missing or empty param', () => {
    expect(parseSharedList('')).toEqual([]);
    expect(parseSharedList('?list=')).toEqual([]);
    expect(parseSharedList('?saved=1')).toEqual([]);
  });
});

describe('buildSharedListUrl', () => {
  it('round-trips through parseSharedList', () => {
    const url = buildSharedListUrl(['data-darbar', 'shah-jamal'], 'https://x.test/Sufi-Shrines/');
    expect(parseSharedList(new URL(url).search)).toEqual(['data-darbar', 'shah-jamal']);
  });
});

describe('importSharedList', () => {
  it('merges into the saved list without duplicating or dropping', () => {
    toggleSaved('shah-jamal');
    importSharedList(['data-darbar', 'shah-jamal', 'peer-makki']);
    expect([...getSavedSlugs()].sort()).toEqual(['data-darbar', 'peer-makki', 'shah-jamal']);
    // Idempotent: importing again changes nothing.
    importSharedList(['data-darbar']);
    expect(getSavedSlugs()).toHaveLength(3);
  });
});
