import type { Shrine } from '../../types/shrine';
import { getUrduFieldValue } from '../data/fieldAliasing';
import { translateToUrdu } from './urduFallback';

/**
 * Returns the shrine's name in Arabic-script Urdu, or '' when the archive
 * does not actually have one.
 *
 * The emptiness matters. `translateToUrdu` deliberately returns its input
 * unchanged on a dictionary miss rather than emitting character-level
 * transliteration (i18n rule 3), so a miss comes back as the Latin name.
 * Callers that display this as Urdu — the calligraphic masthead above all —
 * would then both look wrong and quietly assert an Urdu name the archive has
 * not got. The Latin-letter check is the honesty check (RULE 2), not a
 * formatting nicety.
 */
export function urduDisplayName(shrine: Shrine): string {
  const candidate = getUrduFieldValue(shrine.raw, 'Name') || translateToUrdu(shrine.name);
  const trimmed = candidate.trim();
  if (!trimmed || /[A-Za-z]/.test(trimmed)) return '';
  return trimmed;
}
