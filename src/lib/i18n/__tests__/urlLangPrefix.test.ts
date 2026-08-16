import { describe, it, expect } from 'vitest';
import { isUrPrefixedPath, stripUrPrefix } from '../urlLangPrefix';

// import.meta.env.BASE_URL is '/' under vitest (command !== 'build'), matching
// local dev — the /Sufi-Shrines/ production base is exercised at build time
// via scripts/prerender.mjs and e2e (build:e2e sets VITE_BASE_PATH=/).
describe('isUrPrefixedPath', () => {
  it('matches the bare /ur root', () => {
    expect(isUrPrefixedPath('/ur')).toBe(true);
  });

  it('matches /ur/ with a trailing slash', () => {
    expect(isUrPrefixedPath('/ur/')).toBe(true);
  });

  it('matches a nested /ur/shrine/:slug path', () => {
    expect(isUrPrefixedPath('/ur/shrine/data-darbar')).toBe(true);
  });

  it('does not match a plain path', () => {
    expect(isUrPrefixedPath('/shrine/data-darbar')).toBe(false);
  });

  it('does not false-positive on a slug that merely starts with "ur"', () => {
    expect(isUrPrefixedPath('/shrine/urs-mela')).toBe(false);
  });
});

describe('stripUrPrefix', () => {
  it('strips /ur from the root', () => {
    expect(stripUrPrefix('/ur')).toBe('/');
  });

  it('strips /ur from a nested shrine path', () => {
    expect(stripUrPrefix('/ur/shrine/data-darbar')).toBe('/shrine/data-darbar');
  });

  it('leaves a non-prefixed path untouched', () => {
    expect(stripUrPrefix('/shrine/data-darbar')).toBe('/shrine/data-darbar');
  });
});
