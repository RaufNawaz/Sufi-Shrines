import { beforeEach, describe, expect, it } from 'vitest';
import {
  RECENT_LIMIT,
  clearRecent,
  entryForPath,
  getRecentEntries,
  recordRecent,
} from '../recentEntries';

describe('recentEntries', () => {
  beforeEach(() => clearRecent());

  it('reads the entry a path names, in either language', () => {
    expect(entryForPath('/shrine/data-darbar')).toEqual({ kind: 'shrine', slug: 'data-darbar' });
    expect(entryForPath('/ur/saint/data-ganj-bakhsh')).toEqual({
      kind: 'figure',
      slug: 'data-ganj-bakhsh',
    });
    expect(entryForPath('/place/lahore/')).toEqual({ kind: 'place', slug: 'lahore' });
    expect(entryForPath('/graph')).toBeNull();
    expect(entryForPath('/about')).toBeNull();
  });

  it('keeps the newest first, once each, and no more than the limit', () => {
    recordRecent('shrine', 'a');
    recordRecent('figure', 'b');
    recordRecent('shrine', 'a');
    expect(getRecentEntries()).toEqual([
      { kind: 'shrine', slug: 'a' },
      { kind: 'figure', slug: 'b' },
    ]);
    for (let i = 0; i < RECENT_LIMIT + 3; i++) recordRecent('place', `p${i}`);
    expect(getRecentEntries()).toHaveLength(RECENT_LIMIT);
    expect(getRecentEntries()[0]).toEqual({ kind: 'place', slug: `p${RECENT_LIMIT + 2}` });
  });

  it('treats the same slug under two kinds as two entries', () => {
    recordRecent('shrine', 'x');
    recordRecent('figure', 'x');
    expect(getRecentEntries()).toHaveLength(2);
  });
});
