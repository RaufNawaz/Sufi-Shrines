import type { Shrine } from '../../types/shrine';
import { getFieldValue } from '../data/fieldAliasing';
import { localizeShrineName } from '../i18n/localizeShrineName';
import { translateNameToUrdu, translateToUrdu } from '../i18n/urduFallback';

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
  urduCategory: string;
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

/** As above, for a person's name: `translateNameToUrdu` also consults the
 * figure-name index, which `translateToUrdu` alone does not. */
function urduNameVariant(english: string): string {
  if (!english) return '';
  const ur = translateNameToUrdu(english);
  return ur !== english ? ur : '';
}

/**
 * Search documents for the worker index — **the one builder**, and the reason
 * that emphasis is here: this module existed from 21 August 2026 with tests
 * pinning its behaviour, while `useSearch` kept an inlined copy of the same
 * map that had quietly diverged from it. The tested builder was not the one
 * that ran. See HANDOVER §9.146; the divergence is what the guard below is
 * about, and it changed search ranking for a reader depending on whether the
 * Urdu dictionary happened to have loaded yet.
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
      urduSaint: urduNameVariant(s.sufiSaint || ''),
      category: s.category || '',
      urduCategory: urduVariant(s.category || ''),
      description: getFieldValue(s.raw, 'Description').slice(0, 500), // cap length
    };
  });
}
