/**
 * Ask for the three Nastaliq faces at the moment the reader presses اردو.
 *
 * ## The measurement
 *
 * `index.html` preloads Nastaliq **only when the initial language is already
 * Urdu**, and even then only the 400 and 700 faces — the 600 is never
 * preloaded at all. A reader who arrives in English and taps the toggle gets no
 * preload: the three faces are discovered by the CSS font matcher when Urdu
 * text first renders, and land separately at +169 ms, +285–398 ms and
 * +317–426 ms after the press, each swapping in under `font-display: swap`.
 *
 * A trace of that window shows what the swaps cost — full-tree relayouts with
 * `dirtyObjects` equal to `totalObjects` (2440/2440, 2449/2449, 2473/2473,
 * `partialLayout: false`) at **89–124 ms each**, which after the basemap were
 * the largest single main-thread items in the whole interaction (performance
 * council, 4 September 2026).
 *
 * Three faces discovered one after another is three of those relayouts. Asking
 * for all three at the press starts them in parallel, before any Urdu text has
 * been laid out, so they have the width of the language switch to arrive in
 * rather than being discovered by the render that needs them.
 *
 * ## Why the sample text is not optional
 *
 * Each `@font-face` declares a `unicode-range` covering Arabic script only.
 * `document.fonts.load()` honours it: called with the default sample text —
 * Latin — it matches no character in the range and resolves without fetching
 * anything, silently. The sample below is Urdu, so the match is real.
 *
 * Failures are swallowed. This is a warm-up: if a face cannot be fetched, the
 * swap behaves exactly as it does today, and an unhandled rejection on a
 * font-loading nicety is not worth surfacing to a reader mid-gesture.
 */

/** The three weights `global.css` declares for 'Noto Nastaliq Urdu'. */
const URDU_FACE_WEIGHTS = [400, 600, 700] as const;

/** Urdu for "shrine" — inside every face's `unicode-range`, so the match is real. */
const URDU_SAMPLE = 'مزار';

let warmed = false;

export function warmUrduFonts(): void {
  // Once per page: the faces are cached by the browser after the first request,
  // and a repeated toggle should not re-enter the font-loading machinery.
  if (warmed) return;
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  warmed = true;
  for (const weight of URDU_FACE_WEIGHTS) {
    try {
      void document.fonts.load(`${weight} 1em "Noto Nastaliq Urdu"`, URDU_SAMPLE).catch(() => {});
    } catch {
      /* Font Loading API present but unhappy — the CSS matcher still works. */
    }
  }
}

/** Test seam: lets a spec assert the once-per-page guard from a clean state. */
export function resetUrduFontWarmForTests(): void {
  warmed = false;
}
