/**
 * The rule for deciding that two figure nodes are the same person, and the
 * record of the pairs that must never be joined.
 *
 * `saintNameKey` folds only case, punctuation and whitespace: an exact-name
 * test. It is deliberately not a similarity test, because a similarity matcher
 * was measured on this corpus on 28 August 2026 and scored **2 right out of
 * 21**. Its nineteen misses were fathers and sons, uncles and nephews, masters
 * and disciples — people standing one edge apart, where a merge deletes the
 * relation that made the pair worth recording.
 *
 * Which assertion guards which, stated precisely, because the obvious guess is
 * wrong:
 *
 *   - Loosening `saintNameKey` itself is caught by `folds case, punctuation and
 *     whitespace`, which pins its exact output. (Checked: adding honorific
 *     stripping fails that assertion, and nothing else here.)
 *   - Honorific stripping alone would NOT collapse any recorded pair — measured,
 *     zero of eleven. So `refuses to join` is a cheap consistency assertion, not
 *     the main defence: it fails only if the identity rule and a recorded
 *     decision come to contradict each other, e.g. after a node is renamed.
 *   - The real defence against a *similarity* merge, however it is computed, is
 *     `keeps every recorded do-not-merge pair as that many distinct nodes` here,
 *     and the same check in scripts/data/validate-kg-identity.mjs. Both read the
 *     built graph, so they fire no matter what did the merging.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  saintNameKey,
  findNameKeyCollisions,
} from '../../../../scripts/data/lib/saintIdentity.mjs';

const ROOT = join(__dirname, '../../../..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8')) as {
  saints: { slug: string; name: string; id: string }[];
};
const seeds = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-seeds.json'), 'utf8')) as {
  saintDoNotMerge?: { slugs: string[]; reason: string; quote: string; source: string }[];
};

const bySlug = new Map(kg.saints.map((s) => [s.slug, s]));
const nameOf = (slug: string) => bySlug.get(slug)?.name ?? `«${slug} absent»`;

describe('saintNameKey', () => {
  it('folds case, punctuation and whitespace', () => {
    expect(saintNameKey('Hazrat Syed Muhammad Khair ul Deen, known as Shah Abul Muali Qadri')).toBe(
      saintNameKey('hazrat syed muhammad khair ul deen known as shah abul muali qadri'),
    );
    expect(saintNameKey('Pir Syed Muhammad Rashid Shah, "Roze Dhani"')).toBe(
      'pir syed muhammad rashid shah roze dhani',
    );
    expect(saintNameKey('Abu’l-Fadl  Muhammad   al-Khuttali')).toBe(
      "abu'l fadl muhammad al khuttali",
    );
  });

  it('keeps honorifics and particles, so they can still tell people apart', () => {
    expect(saintNameKey('Shah Abdul Latif Bhittai')).not.toBe(saintNameKey('Shaikh Abdul Latif'));
    expect(saintNameKey('Sachal Sarmast')).not.toBe(saintNameKey('Shah Saidan Sarmast'));
  });

  it('returns empty for a non-string or blank name', () => {
    expect(saintNameKey(undefined as unknown as string)).toBe('');
    expect(saintNameKey('  —  ')).toBe('');
  });
});

describe('figure identity in the shipped graph', () => {
  it('gives no two figure nodes the same name', () => {
    const collisions = [...findNameKeyCollisions(kg.saints)].map(
      ([key, slugs]) => `${key}: ${slugs.join(', ')}`,
    );
    expect(collisions).toEqual([]);
  });

  it('refuses to join the pairs the corpus says are different people', () => {
    /* Every pair here is one a similarity matcher proposed or the extractor
       flagged, and every one is two people. Consistency check only — see the
       file header for why this is not what stops a similarity merge. */
    const distinct = seeds.saintDoNotMerge ?? [];
    expect(distinct.length).toBeGreaterThan(8);

    const joined: string[] = [];
    for (const entry of distinct) {
      const keys = entry.slugs.map((s) => saintNameKey(nameOf(s)));
      for (let i = 0; i < keys.length; i += 1) {
        for (let j = i + 1; j < keys.length; j += 1) {
          if (keys[i] && keys[i] === keys[j]) {
            joined.push(`${entry.slugs[i]} / ${entry.slugs[j]} — ${entry.reason}`);
          }
        }
      }
    }
    expect(joined).toEqual([]);
  });

  it('keeps every recorded do-not-merge pair as that many distinct nodes', () => {
    const problems: string[] = [];
    for (const entry of seeds.saintDoNotMerge ?? []) {
      const missing = entry.slugs.filter((s) => !bySlug.has(s));
      if (missing.length) problems.push(`absent: ${missing.join(', ')}`);
      const ids = new Set(entry.slugs.filter((s) => bySlug.has(s)).map((s) => bySlug.get(s)!.id));
      if (ids.size === 1 && entry.slugs.length > 1) {
        problems.push(`collapsed into one node: ${entry.slugs.join(' / ')}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('carries evidence on every recorded decision', () => {
    for (const entry of seeds.saintDoNotMerge ?? []) {
      expect(entry.reason?.trim(), `${entry.slugs.join('/')} reason`).toBeTruthy();
      expect(entry.quote?.trim(), `${entry.slugs.join('/')} quote`).toBeTruthy();
      expect(entry.source, `${entry.slugs.join('/')} source`).toMatch(/^(data|entries|docs)\//);
    }
  });
});
