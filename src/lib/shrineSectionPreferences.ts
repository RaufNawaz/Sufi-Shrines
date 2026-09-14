/**
 * The two optional sections on an entry page: shared ground, and the nearby
 * Auqaf mosques.
 *
 * Both were on for every reader until 14 September 2026, when Rauf asked for
 * them off "for the time being" and behind a switch. Neither is being deleted
 * and neither should be: the shared-ground section is the shrine-page face of
 * the archive's current phase, and the mosque list answers a question a pilgrim
 * actually asks. What they have in common is that they are *adjacent* facts —
 * about the ground and about a companion survey — sitting below the entry's own
 * article, and an entry page reads better when it is about its own subject.
 *
 * Off is therefore the default and an editorial position, not a stub:
 * `DEFAULT_TOURS_ENABLED` carries the same shape for the same reason.
 *
 * **Only the shrine-page sections.** `/shared-ground`, the map's shared-ground
 * lens and the Awqaf site itself are untouched by either switch — turning the
 * section off removes a block from an entry, never a fact from the archive.
 *
 * Same shape as `toursPreference.ts` and `directoryPreference.ts`: read, write,
 * an exported default, every access wrapped, because storage throws rather than
 * returning null in a locked-down browser and a preference is never worth an
 * error boundary.
 */
import {
  NEARBY_MOSQUES_SECTION_STORAGE_KEY,
  SHARED_GROUND_SECTION_STORAGE_KEY,
} from './storageKeys';

export const DEFAULT_SHARED_GROUND_SECTION = false;
export const DEFAULT_NEARBY_MOSQUES_SECTION = false;

/* One reader/writer pair, parameterised, rather than two copies of the same
   four lines. The stored vocabulary is 'on' / 'off' — the same literals the
   tours switch persists — so a value read out of a browser's storage inspector
   says what it means. */
function readSwitch(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'on';
  } catch {
    return fallback;
  }
}

function writeSwitch(key: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, enabled ? 'on' : 'off');
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}

export function readSharedGroundSection(): boolean {
  return readSwitch(SHARED_GROUND_SECTION_STORAGE_KEY, DEFAULT_SHARED_GROUND_SECTION);
}

export function writeSharedGroundSection(enabled: boolean): void {
  writeSwitch(SHARED_GROUND_SECTION_STORAGE_KEY, enabled);
}

export function readNearbyMosquesSection(): boolean {
  return readSwitch(NEARBY_MOSQUES_SECTION_STORAGE_KEY, DEFAULT_NEARBY_MOSQUES_SECTION);
}

export function writeNearbyMosquesSection(enabled: boolean): void {
  writeSwitch(NEARBY_MOSQUES_SECTION_STORAGE_KEY, enabled);
}
