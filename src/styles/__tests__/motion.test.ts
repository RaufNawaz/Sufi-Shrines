// @vitest-environment node
/**
 * Every animation must have a reduced-motion escape (RULE 4 — encode
 * invariants, don't rely on intentions).
 *
 * `prefers-reduced-motion: reduce` is a medical accessibility setting, not a
 * taste preference: for some readers vestibular motion causes nausea and
 * migraine. Zeroing `--duration-*` in tokens.css covers animations that use
 * those tokens, but not one written with a hardcoded duration — and that is
 * precisely the kind of thing a later "just add a quick fade" commit
 * introduces. So the check is mechanical: find every `@keyframes` in the
 * stylesheets, find every rule that animates, and assert each has *some*
 * escape. Writing it revealed that this codebase already had three different
 * valid escapes, and the first draft of the check wrongly flagged all of them —
 * so they are named here rather than rediscovered:
 *
 * 1. **Token-timed.** `animation: x var(--duration-base) …` is already off,
 *    because tokens.css sets every `--duration-*` to 0ms under reduce.
 * 2. **Gated on `no-preference`.** An animation declared inside
 *    `@media (prefers-reduced-motion: no-preference)` never applies unless
 *    motion is welcome. This is the strongest of the three: it cannot be
 *    accidentally un-done by a later override.
 * 3. **Explicitly exempt.** One animation's motion *is* its meaning — a
 *    loading spinner frozen mid-turn reads as a hung page, not a calm one. That
 *    is a named exemption below, not a silent pass.
 *
 * Anything else must be switched off under reduce. Off, not slower: a reader
 * who asks for reduced motion is not asking for a gentler animation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLE_DIR = join(__dirname, '..');

const SHEETS = readdirSync(STYLE_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ file: f, css: readFileSync(join(STYLE_DIR, f), 'utf8') }));

/** Strip comments so prose describing CSS is never parsed as CSS. */
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The text of every `@media (prefers-reduced-motion: <pref>)` block, joined. */
function motionBlocks(css: string, pref: 'reduce' | 'no-preference'): string {
  const out: string[] = [];
  const re = new RegExp(
    `@media\\s*\\(\\s*prefers-reduced-motion\\s*:\\s*${pref}\\s*\\)\\s*\\{`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    // Walk braces from the block's opening one to find its matching close.
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
    }
    out.push(css.slice(m.index + m[0].length, i - 1));
  }
  return out.join('\n');
}

const reduceBlocks = (css: string) => motionBlocks(css, 'reduce');

/**
 * Animations whose motion carries the information, exempt by decision rather
 * than by oversight. Keep this list at zero or one entry; anything longer means
 * the bar has moved.
 */
const MOTION_IS_THE_MESSAGE: { keyframes: string; why: string }[] = [
  {
    keyframes: 'spin',
    why: 'a loading spinner frozen mid-turn reads as a hung page rather than a calm one',
  },
];

describe('motion accessibility', () => {
  it('every @keyframes is referenced by a rule that reduced motion disables', () => {
    const offenders: string[] = [];

    for (const { file, css: raw } of SHEETS) {
      const css = strip(raw);
      const reduced = reduceBlocks(css);
      const welcomed = motionBlocks(css, 'no-preference');
      const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!);

      for (const name of names) {
        // Escape 3: motion this animation exists to convey.
        if (MOTION_IS_THE_MESSAGE.some((e) => e.keyframes === name)) continue;

        // Which selectors use this animation, outside the reduce blocks?
        const users = new Set<string>();
        for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
          const selector = rule[1]!.trim();
          const body = rule[2]!;
          if (selector.startsWith('@') || selector.startsWith('from') || selector === 'to')
            continue;
          const decl = new RegExp(`animation(?:-name)?\\s*:([^;]*\\b${name}\\b[^;]*)`).exec(body);
          if (!decl) continue;
          if (reduced.includes(selector)) continue;
          // Escape 1: timed by a --duration-* token, which reduce sets to 0ms.
          if (/var\(--duration-/.test(decl[1]!)) continue;
          // Escape 2: declared only where motion is welcome.
          if (welcomed.includes(selector)) continue;
          users.add(selector);
        }
        if (users.size === 0) continue;

        // At least one of them must be turned off under reduce.
        const disabled = [...users].some((selector) =>
          selector
            .split(',')
            .map((s) => s.trim())
            .some((one) => new RegExp(`${escapeRe(one)}\\s*[,{]`).test(reduced)),
        );
        if (!disabled) {
          offenders.push(`${file}: @keyframes ${name} (used by ${[...users].join(' / ')})`);
        }
      }
    }

    expect(
      offenders,
      'these animations keep running under prefers-reduced-motion: reduce. Add the ' +
        'selector to a @media (prefers-reduced-motion: reduce) block with `animation: none`.',
    ).toEqual([]);
  });

  it('the reader can ask for the same thing the OS asks for', () => {
    /* `lib/motionPreference.ts` writes `data-motion="reduced"` for a reader
       whose device does not offer the setting. The attribute path is a
       universal reset rather than a mirror of the named escapes above — the
       reasoning is in that file — so what is asserted here is that it exists,
       that it reaches animations and transitions, and that it zeroes the
       duration tokens the same way the media query does. */
    const motion = SHEETS.find((s) => s.file === 'motion.css');
    expect(motion, 'motion.css is gone').toBeTruthy();
    const css = strip(motion!.css);
    const block = css.match(/:root\[data-motion='reduced'\][\s\S]*$/);
    expect(block, 'no reader-controlled motion path at all').toBeTruthy();
    const text = block![0];
    expect(text).toMatch(/--duration-fast:\s*0ms/);
    expect(text).toMatch(/--duration-base:\s*0ms/);
    expect(text).toMatch(/--duration-slow:\s*0ms/);
    expect(text).toMatch(/animation-duration:[^;]*!important/);
    expect(text).toMatch(/transition-duration:[^;]*!important/);
    expect(text).toMatch(/scroll-behavior:\s*auto/);
  });

  it('exempts the spinner from the reader path too, not just the OS one', () => {
    /* Same reason as the exemption list above: a loading spinner frozen
       mid-turn reads as a hung page rather than a calm one. An exemption that
       holds on one of two paths is an exemption that will surprise someone. */
    const motion = SHEETS.find((s) => s.file === 'motion.css')!;
    const block = strip(motion.css).match(/:root\[data-motion='reduced'\][\s\S]*$/)![0];
    expect(block).toContain('.spinner');
  });

  it('offers no way to restore motion against the OS setting', () => {
    /* There is deliberately no `[data-motion='full']`. Restoring motion would
       mean un-disabling every escape in this file and seven others, which puts
       a medical setting one CSS mistake from being ignored. */
    for (const sheet of SHEETS) {
      expect(strip(sheet.css), `${sheet.file} re-enables motion`).not.toContain(
        "data-motion='full'",
      );
    }
  });

  it('the exemption list stays short and says why', () => {
    // A growing list of "this one is special" is how an accessibility contract
    // rots. One entry is a decision; five is a habit.
    expect(MOTION_IS_THE_MESSAGE.length).toBeLessThanOrEqual(1);
    for (const entry of MOTION_IS_THE_MESSAGE) {
      expect(entry.why.length, `exemption for ${entry.keyframes} needs a reason`).toBeGreaterThan(
        20,
      );
    }
  });

  it('reduced motion switches animations off rather than shortening them', () => {
    const bad: string[] = [];
    for (const { file, css: raw } of SHEETS) {
      const reduced = reduceBlocks(strip(raw));
      for (const decl of reduced.matchAll(/animation(?:-duration)?\s*:\s*([^;]+);/g)) {
        const value = decl[1]!.trim();
        if (value === 'none' || /\bnone\b/.test(value)) continue;
        if (/^0m?s$/.test(value)) continue;
        bad.push(`${file}: "animation: ${value}" inside a reduce block`);
      }
    }
    expect(bad, 'reduced motion should disable an animation, not re-time it').toEqual([]);
  });

  it('smooth scrolling is switched off under reduced motion', () => {
    /*
     * Scroll animation is motion too, and the kind most likely to trigger
     * vestibular symptoms — a whole viewport of content sliding past rather
     * than one small element fading in. `scroll-behavior: smooth` was set
     * globally on <html> and never switched off, so every anchor jump (the
     * almanac's month nav, the article contents nav, every skip link) animated
     * for a reader who had asked for no animation. The keyframes check above
     * cannot see this: there is no `@keyframes` involved.
     */
    const declaring = SHEETS.filter(({ css }) => /scroll-behavior\s*:\s*smooth/.test(strip(css)));
    expect(declaring.length, 'nothing declares smooth scrolling any more').toBeGreaterThan(0);

    for (const { file, css } of declaring) {
      const reduced = reduceBlocks(strip(css));
      expect(
        /scroll-behavior\s*:\s*auto/.test(reduced),
        `${file} turns on smooth scrolling but never turns it off under ` +
          'prefers-reduced-motion: reduce',
      ).toBe(true);
    }
  });

  it('the motion layer defines the stagger contract it documents', () => {
    const motion = SHEETS.find((s) => s.file === 'motion.css');
    expect(motion, 'src/styles/motion.css is missing').toBeDefined();
    const css = strip(motion!.css);
    expect(css).toMatch(/--stagger-step\s*:/);
    expect(css).toMatch(/--stagger-max\s*:/);
    // The cap is the thing that keeps a 30-item list from taking seconds.
    expect(css).toMatch(/min\(\s*calc\(var\(--stagger-index/);
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
