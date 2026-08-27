/**
 * How large the archive's prose is set.
 *
 * Why this is a real preference and not a nicety: there are 169 long-form
 * entries here, several of them thousands of words, and `DESIGN_VISION` sets
 * Nastaliq at 1.9 line-height *because it is dense* — the reader most likely to
 * want larger type is the Urdu reader, and until now had no way to ask for it.
 * Browser zoom is the alternative, and it scales the map and the tab bar along
 * with the words.
 *
 * **Scoped to reading surfaces, deliberately.** The CSS applies this to
 * `.shrine-page` and `.entity-page` only, not to `:root`, so the chrome keeps
 * its measured sizes: the tab bar, the map controls and the filter chips are
 * laid out at 390px with an e2e overflow guard over them, and scaling every
 * token by 1.125 is a layout change to all of them for the sake of a reading
 * change. This is a *reading* size, and it says so.
 *
 * Applied as a `data-text-size` attribute on `documentElement` and set before
 * the first paint in `main.tsx`, the same arrangement `THEME_STORAGE_KEY`
 * already has and for the same reason: a size applied from an effect is a
 * reflow the reader watches happen.
 */
import { TEXT_SIZE_STORAGE_KEY } from './storageKeys';

export type TextSize = 'small' | 'medium' | 'large';

export const TEXT_SIZES: readonly TextSize[] = ['small', 'medium', 'large'] as const;

export const DEFAULT_TEXT_SIZE: TextSize = 'medium';

function isTextSize(value: unknown): value is TextSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function readTextSize(): TextSize {
  if (typeof window === 'undefined') return DEFAULT_TEXT_SIZE;
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSize(stored) ? stored : DEFAULT_TEXT_SIZE;
  } catch {
    return DEFAULT_TEXT_SIZE;
  }
}

export function writeTextSize(size: TextSize): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}

/**
 * Put the size on the document.
 *
 * `medium` removes the attribute rather than writing it, so the default state
 * of the DOM is the default state of the preference. A stylesheet that has to
 * handle `[data-text-size='medium']` as well as no attribute at all is a
 * stylesheet with two ways to say the same thing, and one of them eventually
 * drifts.
 */
export function applyTextSize(size: TextSize, root: HTMLElement): void {
  if (size === DEFAULT_TEXT_SIZE) root.removeAttribute('data-text-size');
  else root.setAttribute('data-text-size', size);
}
