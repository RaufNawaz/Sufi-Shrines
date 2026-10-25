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
import { readStorage, writeStorage } from './safeStorage';

export type MotionPreference = 'system' | 'reduced';

export const DEFAULT_MOTION: MotionPreference = 'system';

export function readMotionPreference(): MotionPreference {
  return readStorage(MOTION_STORAGE_KEY) === 'reduced' ? 'reduced' : DEFAULT_MOTION;
}

export function writeMotionPreference(motion: MotionPreference): void {
  writeStorage(MOTION_STORAGE_KEY, motion);
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

/**
 * Whether to move things, asked once, everywhere.
 *
 * True for the operating system's reduced-motion setting *or* the archive's own
 * switch on /settings (`data-motion="reduced"` on <html>). Until 17 October
 * 2026 every animation started from script asked only the operating system, so
 * a reader who turned motion off here still had the map fly under them on
 * every tap and every page crossfade — the two largest movements on the site.
 * Only the CSS respected the switch (motion council).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'reduced') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
