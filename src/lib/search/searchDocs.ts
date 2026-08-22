import type { Shrine } from '../../types/shrine';
import { getFieldValue } from '../data/fieldAliasing';
import { localizeShrineName } from '../i18n/localizeShrineName';
import { translateToUrdu } from '../i18n/urduFallback';

/** The document shape indexed by search.worker.ts. Kept here (not in the
 * worker) so the builder below and its tests never need a Worker context. */
export interface ShrineSearchDoc {
  id: number;
  name: string;
  urduName: string;
  location: string;
  urduLocation: string;
  saint: string;
  urduSaint: string;
  category: string;
  description: string;
}

/** `translateToUrdu` returns its input unchanged when it has no translation
 * (never letter-soup — see urduFallback.ts). An unchanged value would only
 * duplicate the English field's tokens in the index, so keep a value only
 * when the dictionary actually produced something different. */
function urduVariant(english: string): string {
  if (!english) return '';
  const ur = translateToUrdu(english);
  return ur !== english ? ur : '';
}

/**
 * Search documents for the worker index — extracted from useSearch so the
 * Urdu side is unit-testable.
 *
 * The Urdu fields index the same strings the UI *displays*: the sheet's Urdu
 * Name column when it exists, else the seed dictionary via
 * `localizeShrineName`/`translateToUrdu`. Indexing only the sheet column was
 * the 21 Aug 2026 parity bug (docs/planning/NEXT_STEPS_2026-08-21.md §A1):
 * no Urdu-variant column exists in the dataset, so `urduName` was '' for all
 * 169 documents and Urdu-script queries matched nothing the reader could see
 * on screen.
 */
export function buildSearchDocs(shrines: Shrine[]): ShrineSearchDoc[] {
  return shrines.map((s) => {
    // Sheet Urdu column if present, dictionary fallback otherwise — exactly
    // what the list, preview card, and masthead render.
    const displayedUrduName = localizeShrineName(s, 'ur');
    return {
      id: s.id,
      name: s.name,
      urduName: displayedUrduName !== s.name ? displayedUrduName : '',
      location: s.location || '',
      urduLocation: urduVariant(s.location || ''),
      saint: s.sufiSaint || '',
      urduSaint: urduVariant(s.sufiSaint || ''),
      category: s.category || '',
      description: getFieldValue(s.raw, 'Description').slice(0, 500), // cap length
    };
  });
}
