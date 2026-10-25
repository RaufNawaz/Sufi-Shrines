// @vitest-environment node
/**
 * Every stylesheet parses without a warning.
 *
 * A malformed rule is not a build error: the minifier prints a warning in the
 * middle of the build log and the browser drops the rule. On 17 October 2026 a
 * sweep that moved hover styles into `@media (hover: hover)` left the first
 * half of a selector list dangling before the at-rule, and the Urs Calendar's
 * chosen day lost its disc for the rest of the night with every gate green.
 * The minifier had said so on every build. This makes it say so loudly.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformWithEsbuild } from 'vite';

const STYLES = join(__dirname, '..');

describe('stylesheets', () => {
  it('parse without a syntax warning', async () => {
    const problems: string[] = [];
    for (const file of readdirSync(STYLES).filter((f) => f.endsWith('.css'))) {
      // Through vite, which declares esbuild; this package does not.
      const { warnings } = await transformWithEsbuild(
        readFileSync(join(STYLES, file), 'utf8'),
        file,
        { loader: 'css', minify: true },
      );
      for (const w of warnings) problems.push(`${file}:${w.location?.line}: ${w.text}`);
    }
    expect(problems).toEqual([]);
    // esbuild's first transform starts its service process, which on a loaded
    // machine (or Windows) takes longer than the default 5 s on its own.
  }, 30_000);
});
