// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UI_TEXT } from '../uiStrings';

/**
 * `index.html` is not just the dev entry point — it is the template every one of
 * the ~940 prerendered pages starts from, so a stale sentence in its `<head>`
 * is a stale sentence on the whole site.
 *
 * That is what happened. The archive was renamed on 30 August 2026 and
 * `UI_TEXT.en.siteMetaDescription` was updated with it, from "Sufi shrines" to
 * "shrines, temples, gurdwaras and darbars". `index.html` was not, so **eight
 * routes and their Urdu mirrors kept describing the archive as an interactive
 * map of Sufi shrines** — including `/graph`, whose own intro the other session
 * had just corrected for making exactly this claim about exactly this data.
 * 88 of the 171 sites are not Sufi shrines.
 *
 * The same shape as the footer that survived the same rename: a copy that sits
 * under everything is the one nobody re-reads. Two strings, one source of truth,
 * and nothing tying them together — so this ties them.
 */
const ROOT = join(__dirname, '..', '..', '..', '..');
const TEMPLATE = readFileSync(join(ROOT, 'index.html'), 'utf8');

/** The tag is prettier-formatted across three lines in this file, which is why
 * `<meta name="description" content="…"` on one line finds nothing. A grep that
 * missed it reported the description as absent rather than as wrong. */
const metaContent = (attr: string, value: string): string | undefined =>
  new RegExp(`<meta\\s+${attr}="${value}"\\s+content="([^"]*)"`, 's').exec(TEMPLATE)?.[1];

describe('the static template agrees with the shipped strings', () => {
  it('its meta description IS the English siteMetaDescription, not a copy of it', () => {
    const description = metaContent('name', 'description');
    expect(description, 'no <meta name="description"> in index.html').toBeTruthy();
    expect(description).toBe(UI_TEXT.en.siteMetaDescription);
  });

  it('neither template description calls the archive a collection of Sufi shrines', () => {
    // Not a style rule. Six traditions are represented and 88 of 171 sites are
    // not Muslim shrines at all, so this is a claim about the data.
    for (const [attr, value] of [
      ['name', 'description'],
      ['property', 'og:description'],
    ]) {
      const content = metaContent(attr, value);
      expect(content, `no ${value} in index.html`).toBeTruthy();
      expect(content!.toLowerCase(), `${value} overclaims`).not.toContain('sufi shrine');
    }
  });

  it('the deploy path may still say Sufi-Shrines, because that is the repository name', () => {
    // Guarding the guard: a sweep that banned the string outright would have
    // broken the base path and taken the whole site down to fix a sentence.
    expect(TEMPLATE).toContain('/Sufi-Shrines/');
  });
});
