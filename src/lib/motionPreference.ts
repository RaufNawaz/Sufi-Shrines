/**
 * Turning the archive's animations off, without an operating system.
 *
 * `styles/motion.css` already holds a real accessibility contract, enforced by
 * `motion.test.ts`: every `@keyframes` in the app must be switched off under
 * `prefers-reduced-motion: reduce`, off rather than slower, because a reader who
 * asks for reduced motion is not asking for a gentler animation. That contract
 * is only reachable through an OS setting, which is the right primary channel —
 * it is a medical setting and it should follow the person, not the site — and it
 * leaves out the reader on a borrowed phone, a shared library machine, or an
 * Android build whose accessibility panel does not expose it.
 *
 * ## Two values, not three
 *
 * `system` and `reduced`. There is deliberately no `full`, which would mean "the
 * OS says reduce and I want the animations anyway": honouring it would require
 * *un-disabling* twelve per-selector escapes across eight stylesheets, and every
 * one of them is a rule that exists so a specific animation cannot come back by
 * accident. Undoing them wholesale for a preference nobody has asked for would
 * put the medical setting one CSS mistake away from being ignored. So this
 * preference can only ever reduce motion, never restore it.
 *
 * ## Why the CSS is a broad reset rather than a mirror
 *
 * The OS path switches off named selectors, one block per stylesheet, which is
 * precise and auditable. Mirroring all twelve for the attribute would double
 * that surface and put the two paths one forgotten edit apart. The attribute
 * path is therefore the standard universal reset — every animation and
 * transition to nothing — which reaches anything the named blocks reach *and*
 * anything a later commit adds before remembering to add an escape. It is a
 * blunter instrument aimed at an explicit request, where the OS path is a
 * precise instrument aimed at a default.
 *
 * `spin` is exempt in both paths, for the reason `motion.test.ts` already
 * records: a loading spinner frozen mid-turn reads as a hung page rather than a
 * calm one.
 */
import { MOTION_STORAGE_KEY } from './storageKeys';

export type MotionPreference = 'system' | 'reduced';

export const DEFAULT_MOTION: MotionPreference = 'system';

export function readMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return DEFAULT_MOTION;
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'reduced'
      ? 'reduced'
      : DEFAULT_MOTION;
  } catch {
    return DEFAULT_MOTION;
  }
}

export function writeMotionPreference(motion: MotionPreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, motion);
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}

/**
 * Put the preference on the document.
 *
 * `system` removes the attribute rather than writing it, so the plain DOM is the
 * default and the stylesheet has one way to say "follow the OS" instead of two.
 * Same arrangement as the reading size.
 */
export function applyMotionPreference(motion: MotionPreference, root: HTMLElement): void {
  if (motion === 'reduced') root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');
}
