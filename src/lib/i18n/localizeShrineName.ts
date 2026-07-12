import type { Shrine } from '../../types/shrine';
import { getUrduFieldValue } from '../data/fieldAliasing';
import { translateToUrdu } from './urduFallback';

/**
 * Shrine display name for the active language: the sheet's Urdu Name column
 * when present, dictionary fallback otherwise; English name as-is.
 */
export function localizeShrineName(shrine: Shrine, lang: string): string {
  if (lang !== 'ur') return shrine.name;
  return getUrduFieldValue(shrine.raw, 'Name') || translateToUrdu(shrine.name);
}
