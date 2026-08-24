import React from 'react';
import type { RefObject } from 'react';
import type { Lang, Shrine } from '../../types/shrine';
import { urduDisplayName } from '../../lib/i18n/urduDisplayName';

interface ShrineMastheadProps {
  shrine: Shrine;
  lang: Lang;
  /** The Latin name as already resolved by the page. */
  latinName: string;
  headingRef: RefObject<HTMLHeadingElement>;
}

/**
 * The shrine's name set as a bilingual masthead.
 *
 * The Nastaliq name is the one visual asset every entry already has, and it
 * is the mission ("equally excellent in both languages") made legible in a
 * glance — so it is present in *both* language modes rather than only when
 * the reader has switched:
 *
 * - **English view** — the Nastaliq name sits above the Latin `<h1>` as a
 *   calligraphic superscription. It is `<bdi>`-wrapped with `lang="ur"` and
 *   `dir="rtl"` so bidi reordering cannot bleed into the surrounding LTR run.
 * - **Urdu view** — the `<h1>` already *is* the Nastaliq name, so it is set
 *   at masthead scale and nothing is duplicated. No Latin is introduced into
 *   the Urdu view at all, which keeps the no-English-leak guard
 *   (`e2e/urdu.spec.ts`) trivially satisfied rather than needing an
 *   exemption.
 *
 * Entries with no Urdu name degrade to exactly the previous rendering.
 */
export function ShrineMasthead({ shrine, lang, latinName, headingRef }: ShrineMastheadProps) {
  const urduName = urduDisplayName(shrine);

  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: urduDisplayName reads an Urdu-only field; there is no per-language name record yet
  if (lang === 'ur') {
    return (
      <h1 ref={headingRef} className="shrine-title shrine-title--nastaliq">
        {urduName || latinName}
      </h1>
    );
  }

  return (
    <>
      {/* Deliberately NOT aria-hidden. The Urdu name is content, not ornament
          — hiding it would encode exactly the "English with an Urdu
          afterthought" posture the project is built against. lang/dir let a
          screen reader switch voice for it. */}
      {urduName && (
        <p className="shrine-masthead-nastaliq">
          <bdi lang="ur" dir="rtl">
            {urduName}
          </bdi>
        </p>
      )}
      <h1 ref={headingRef} className="shrine-title">
        {latinName}
      </h1>
    </>
  );
}
