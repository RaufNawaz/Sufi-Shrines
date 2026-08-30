// @vitest-environment node
/**
 * A tab bar that highlights nothing tells a reader they have left the app.
 *
 * Two properties matter and neither is obvious from the table:
 *
 * 1. **Every route the app serves belongs to a tab, or deliberately does not.**
 *    A detail page has to light up the index that leads to it — a shrine belongs
 *    to the map, a figure to the explorer — or a reader who arrived from a search
 *    engine sees five unselected tabs and no sense of place. This asserts against
 *    the real route table in App.tsx, so a route added there without a home is a
 *    failing test rather than a dead tab bar on a new page.
 * 2. **A route no tab owns must resolve to null, not to a default.** Marking the
 *    map current on a 404 is a claim, and `aria-current="page"` has a screen
 *    reader say it out loud.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TABS, activeTabId } from '../tabs';
import { UI_TEXT } from '../../i18n/uiStrings';

describe('the tab table', () => {
  it('is five tabs, which is what fits on a phone', () => {
    expect(TABS).toHaveLength(5);
  });

  it('has a label in both languages for every tab', () => {
    /* The Urdu table is read as *source text* rather than imported: it is a
       separate chunk on purpose (uiStringSplit.test.ts forbids a static import
       anywhere under src/, because one folds 42 KB back into the importer). */
    const urdu = readFileSync(join(__dirname, '..', '..', 'i18n', 'uiStrings.ur.ts'), 'utf8');
    for (const tab of TABS) {
      expect(UI_TEXT.en[tab.labelKey], `en ${tab.id}`).toBeTruthy();
      const line = new RegExp(`^\\s*${tab.labelKey}: '([^']+)',`, 'm').exec(urdu);
      expect(line, `ur ${tab.id} has no entry`).toBeTruthy();
      /* A tab bar is the first thing a reader sees, so an untranslated label
         here is the most visible leak in the app. */
      expect(line![1], `ur ${tab.id} is Latin`).not.toMatch(/[A-Za-z]/);
    }
  });

  it('points every tab at a distinct path', () => {
    const paths = TABS.map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('which tab owns a route', () => {
  it('selects a tab on its own path', () => {
    expect(activeTabId('/')).toBe('map');
    expect(activeTabId('/graph')).toBe('explore');
    expect(activeTabId('/almanac')).toBe('almanac');
    expect(activeTabId('/typology')).toBe('atlas');
    expect(activeTabId('/about')).toBe('about');
  });

  it('gives a detail page the index that leads to it', () => {
    expect(activeTabId('/shrine/data-darbar')).toBe('map');
    expect(activeTabId('/place/lahore')).toBe('map');
    expect(activeTabId('/saint/data-ganj-bakhsh')).toBe('explore');
    expect(activeTabId('/order/chishtiyya')).toBe('explore');
    expect(activeTabId('/coverage')).toBe('about');
    expect(activeTabId('/report')).toBe('about');
  });

  it('resolves the crawler-facing /ur mirror to the same tab', () => {
    /* A real browser is on one of these for at most one paint, and that paint
       should not be the one with nothing selected. */
    expect(activeTabId('/ur')).toBe('map');
    expect(activeTabId('/ur/')).toBe('map');
    expect(activeTabId('/ur/graph')).toBe('explore');
    expect(activeTabId('/ur/shrine/data-darbar')).toBe('map');
  });

  it('ignores a trailing slash', () => {
    expect(activeTabId('/graph/')).toBe('explore');
    expect(activeTabId('/shrine/data-darbar/')).toBe('map');
  });

  it('claims nothing on a route no tab owns', () => {
    expect(activeTabId('/not-a-page')).toBeNull();
    expect(activeTabId('/shrine.html')).toBeNull();
  });

  it('never matches a path merely because it starts the same way', () => {
    /* `/place/` owns `/place/lahore`; a hypothetical `/placeholder` is not the
       map's. Prefix matching without the trailing slash would claim it. */
    expect(activeTabId('/placeholder')).toBeNull();
    expect(activeTabId('/graphology')).toBeNull();
  });
});

describe('the route table in App.tsx', () => {
  const app = readFileSync(join(__dirname, '..', '..', '..', 'App.tsx'), 'utf8');
  const paths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

  it('was found', () => {
    expect(paths.length).toBeGreaterThan(10);
  });

  it('has every real route owned by a tab', () => {
    /* The two exemptions are deliberate and are the only ones: the catch-all,
       and the legacy `?id=` redirect that resolves elsewhere before anything
       renders. Everything else is a page a reader can be on, and a page a
       reader can be on needs a tab lit. */
    /* `/review` is team-only and unlisted by design: it is not one of the
       archive's six public surfaces, and lighting a tab for it would advertise
       a page a reader cannot open. Its `/ur` mirror inherits the exemption for
       the same reason — `activeTabId` strips the prefix, so the two can never
       disagree about which tab owns a page, only about whether one does. */
    const EXEMPT = new Set(['*', '/shrine.html', '/review', '/ur/review']);
    const homeless = paths
      .filter((p) => !EXEMPT.has(p))
      .map((p) => p.replace(/:\w+/g, 'sample'))
      .filter((p) => activeTabId(p) === null);
    expect(
      homeless,
      'These routes render a page with no tab selected, so a reader arriving on one sees five ' +
        'unselected tabs. Give the owning tab a prefix in TABS.',
    ).toEqual([]);
  });
});
