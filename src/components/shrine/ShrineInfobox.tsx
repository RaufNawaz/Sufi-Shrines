import React from 'react';
import { Link } from 'react-router-dom';
import { orderSlugForSilsila } from '../../lib/data/silsila';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { siteTypeDisplayLabel, siteTypeKey } from '../../lib/data/siteType';
import { figureTypeDisplayLabel } from '../../lib/data/figureType';
import {
  INFOBOX_PRIORITY_KEYS,
  MAX_INFOBOX_ROWS,
  NON_DETAIL_KEYS,
  STRUCTURED_FACET_KEYS,
} from '../../lib/data/constants';
import { isLikelyUrl, isUrduVariantKey, normalizeUrl } from '../../lib/data/fieldAliasing';
import { localizeFieldName } from '../../lib/data/fieldLabels';
import { yearPrecisionKey, YEAR_PRECISION_LABEL_KEYS } from '../../lib/data/yearPrecision';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';
import { localizeObservance } from '../../lib/i18n/localizeObservance';
import type { Lang } from '../../types/shrine';

import { usesLatinScript } from '../../lib/i18n/languages';
import { isRtlLang } from '../../lib/i18n/languages';
import { useShrineTraditions } from './useShrineTraditions';
import { hasProjectAccess } from '../../lib/projectAccess';
import { renderInlineBold } from './inlineFormat';
function isFoundedKey(key: string): boolean {
  return key === 'Founded' || key === 'Founded/Opened';
}

/* `Events` is semicolon-joined ("Annual urs; qawwali and naat; daily langar"),
   so localizeField's whole-string lookup matches almost none of it. Same shape
   of special case as Founded above. */
function isEventsKey(key: string): boolean {
  return key === 'Events';
}

/* The Events cell is semicolon-joined by convention (107 of 168 populated
   cells carry a `;`), so the bullets are exactly the sheet's own segments —
   nothing is re-punctuated or re-ordered. A cell with one segment is one line,
   not a one-item list. */
function splitEvents(value: string): string[] {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveFieldValue(
  shrine: Shrine,
  key: string,
  lang: Lang,
  localizeField: (row: Shrine['raw'], field: string) => string,
): string {
  if (isFoundedKey(key)) return resolveFoundedDate(shrine.raw, lang);
  if (isEventsKey(key)) return localizeObservance(localizeField(shrine.raw, key), lang);
  return localizeField(shrine.raw, key);
}

/** localizeField() only ever returns Latin text in a non-Latin view when
 * translateToUrdu() fell through to the raw original — Latin content is
 * itself the "untranslated" signal (see urduFallback.ts).
 *
 * `usesLatinScript` rather than `lang === 'ur'`: the question is whether Latin
 * text is *foreign to the page*, which is a property of the page's script. Asked
 * as "is this Urdu" it is right by coincidence today and wrong for the next
 * non-Latin language. */
function isUntranslatedInUrdu(lang: Lang, value: string): boolean {
  return !usesLatinScript(lang) && /[A-Za-z]/.test(value);
}

/** Does a recorded value read as an English *sentence* rather than a date?
 *
 * The two are not the same question as "does it contain Latin", and treating
 * them as one is what broke `shrineInfoboxDates.test` on 14 September 2026:
 * its fixture is "1416 AH", which is a date, and the coarse rule demoted it to
 * a grey left-aligned block for having two Latin letters in it.
 *
 * Five of the 127 rows carrying a `year_built` have Latin in it. How this rule
 * sorts them, measured against the shipped snapshot rather than guessed:
 *
 *     date   November 27, 1981 CE / 1402 AH
 *     date   1630 CE (8 Muharram 1040 AH)
 *     date   1041 (as given: "8 August 1041")
 *     PROSE  1024 AH (as given in the form; not a construction date)
 *     PROSE  681 CE / c. 63 AH (popular tradition) — see note; second
 *              tradition dates the events to the early 13th century CE
 *
 * A word standing next to a number is a *unit*; three or more words standing
 * next to each other are a *sentence*. That is the whole rule and it needs no
 * threshold anyone has to defend.
 *
 * The third row is the honest edge: "as given" is two words, so a 33-character
 * parenthetical stays inline as a date. That is the intended side of the line —
 * what this exists to catch is the 110-character fifth row, which was four
 * lines of right-aligned English in the middle of the Urdu fact panel.
 *
 * It decides presentation only — whether the value is demoted to a secondary
 * left-to-right block. Every Latin run is declared either way. */
function looksLikeProse(value: string): boolean {
  const runs = value.match(/[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})*/g) ?? [];
  return runs.some((run) => run.split(/\s+/).length >= 3);
}

interface Props {
  shrine: Shrine;
}

export function ShrineInfobox({ shrine }: Props) {
  const { t, lang, localizeField, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const traditions = useShrineTraditions(shrine.slug);
  /* The founded row's precision qualifier and source note are team-facing
     (project head, 11 September 2026: "remove the notes in the founded" and
     "remove the approximate etc badges in the public-facing"). The data is
     untouched and the team view still shows every word of it; the public reads
     the year. Same soft gate as the provenance block on the page (`?team=1`). */
  const showQualifiers = hasProjectAccess();

  // Build ordered rows: priority keys first, then remaining, up to max
  const allEntries = Object.entries(shrine.raw).filter(([key, value]) => {
    if (!value || String(value).trim() === '') return false;
    if (key.startsWith('_')) return false;
    if (NON_DETAIL_KEYS.has(key)) return false;
    // New structured columns get dedicated UI (badge/status/filters) — never
    // a generic snake_case row.
    if (STRUCTURED_FACET_KEYS.has(key)) return false;
    // The category badge above always shows this (falling back to legacy
    // `Category` itself when the new column is blank) — a plain fact row
    // repeating the same value right underneath it is pure redundancy.
    if (key === 'Category') return false;
    // The dedicated dates block below owns Founded once year_built *or* a
    // year_built_note is present — otherwise this legacy row is still the only
    // source for it. The note half matters: 36 entries have a note and no
    // `year_built`, so the block used to skip the row, this one rendered the
    // legacy value alone, and the qualification never reached the page.
    if ((shrine.yearBuilt || shrine.yearBuiltNote) && isFoundedKey(key)) return false;
    if (isUrduVariantKey(key)) return false;
    if (key === 'Name' || key === 'Slug') return false;
    return true;
  });

  const priorityRows: [string, string][] = [];
  const remainingRows: [string, string][] = [];

  for (const key of INFOBOX_PRIORITY_KEYS) {
    const entry = allEntries.find(([k]) => k === key);
    if (entry) {
      const localValue = resolveFieldValue(shrine, entry[0], lang, localizeField);
      if (localValue) priorityRows.push([entry[0], localValue]);
    }
  }

  for (const [key] of allEntries) {
    if (INFOBOX_PRIORITY_KEYS.includes(key)) continue;
    // Skip section keys — they go in article
    if (
      key === 'Description' ||
      key === 'History' ||
      key === 'Architecture' ||
      key === 'Rituals' ||
      key === 'Saint Biography' ||
      key === 'Events & Urs' ||
      key === 'Visiting Info' ||
      key === 'Sources'
    )
      continue;
    // Skip gallery keys
    if (/^Gallery\s*\d+|^Image\s*\d+|^Caption\s*\d+/i.test(key)) continue;

    const localValue = resolveFieldValue(shrine, key, lang, localizeField);
    if (localValue) remainingRows.push([key, localValue]);
  }

  const rows = [...priorityRows, ...remainingRows].slice(0, MAX_INFOBOX_ROWS);
  /* Notes count. Four entries hold a `year_built_note` and no year of any
     kind, and two hold an `event_note` with no `event_year`; without the note
     terms here their whole date block is absent and the archive silently
     withholds the only thing it knows about their date. */
  const hasDates = Boolean(
    shrine.yearBuilt ||
    shrine.yearBuiltNote ||
    shrine.figureBorn ||
    shrine.figureDied ||
    shrine.eventYear ||
    shrine.eventNote,
  );

  const siteTypeLabel = shrine.siteType ? siteTypeDisplayLabel(shrine.siteType, lang) : null;

  if (rows.length === 0 && !hasDates && !shrine.siteType && !shrine.silsila && !shrine.silsilaNote)
    return null;

  return (
    <aside className="shrine-infobox" aria-label={t('shrineFacts')}>
      {/* No category band here: the kicker above the masthead and the
          breadcrumb already name the category — a third, tinted repetition
          was the loudest element in the panel. */}
      <h2 className="infobox-title">{t('shrineFacts')}</h2>
      <dl className="infobox-list">
        {rows.map(([key, value]) => {
          // The saint row's label says what the figure actually is when the
          // sheet records it — "Deity", "Sikh Guru", "Sant" — instead of
          // calling every tradition's figure a saint (ولی is specifically a
          // Muslim saint; it must not label Shiva or Guru Nanak).
          const figureLabel =
            (key === 'Sufi Saint' || key === 'Saint') && shrine.figureType
              ? figureTypeDisplayLabel(shrine.figureType, lang)
              : null;
          const localKey = figureLabel ?? localizeFieldName(key, lang);
          return (
            <div className="infobox-row" key={key}>
              <dt className="infobox-label">{localKey || key}</dt>
              <dd className="infobox-value">
                {isLikelyUrl(value) ? (
                  <a href={normalizeUrl(value) ?? value} target="_blank" rel="noopener noreferrer">
                    {value.replace(/^https?:\/\//, '')}
                  </a>
                ) : isEventsKey(key) && splitEvents(value).length > 1 ? (
                  // Bullets, one per recorded observance (project head, 11 Sep
                  // 2026). renderInlineBold turns the sheet's *ʿurs* italics
                  // into <em> instead of printing the asterisks.
                  <ul className="infobox-bullets">
                    {splitEvents(value).map((part, i) => (
                      <li key={i}>
                        <bdi lang={isUntranslatedInUrdu(lang, part) ? 'en' : undefined}>
                          {renderInlineBold(fmtNum(part))}
                        </bdi>
                      </li>
                    ))}
                  </ul>
                ) : isEventsKey(key) ? (
                  <bdi lang={isUntranslatedInUrdu(lang, value) ? 'en' : undefined}>
                    {renderInlineBold(fmtNum(value))}
                  </bdi>
                ) : (
                  // <bdi> so an untranslated Latin fallback value can't
                  // garble the surrounding RTL layout (same treatment as
                  // the source notes below). lang="en" flags it as
                  // secondary content in the Urdu view (see shrine.css).
                  <bdi lang={isUntranslatedInUrdu(lang, value) ? 'en' : undefined}>
                    {fmtNum(value)}
                  </bdi>
                )}
              </dd>
            </div>
          );
        })}
        {shrine.siteType && (
          // Built form (site_type): the column existed for a full schema
          // migration before anything displayed it. A vocabulary value
          // localizes and links to its group in the typology atlas; the two
          // survey-prose values render verbatim (RULE 2), unlinked.
          <div className="infobox-row">
            <dt className="infobox-label">{t('fieldSiteType')}</dt>
            <dd className="infobox-value">
              {siteTypeLabel ? (
                <Link to={`/typology#${siteTypeKey(shrine.siteType)}`}>{siteTypeLabel}</Link>
              ) : (
                <bdi lang={isUntranslatedInUrdu(lang, shrine.siteType) ? 'en' : undefined}>
                  {shrine.siteType}
                </bdi>
              )}
              {shrine.siteTypeNote && (
                <p className="infobox-note">
                  {t('sourceNoteLabel')}: <bdi>{shrine.siteTypeNote}</bdi>
                </p>
              )}
            </dd>
          </div>
        )}
        {/* The tradition the site's own entry places it in — ten sites of 169.
            Deliberately *below* silsila and not merged with it: a silsila is
            the Sufi answer to this question and these six are the other five
            traditions' answer, and one row that sometimes means either would
            blur exactly the distinction the layer was built to draw.

            Absent for the other 159, and absence is not "none": it means the
            entry does not name one. It is never filled in from `category`,
            which is a filing bucket rather than a claim. */}
        {traditions.length > 0 && (
          <div className="infobox-row">
            <dt className="infobox-label">{t('traditionLabel')}</dt>
            <dd className="infobox-value">
              {/* Plural: three of the eighteen sites that carry a tradition
                  carry two, because their entry names both in one sentence.
                  Both are shown — picking one would be the archive choosing
                  between two things its own source says. */}
              {traditions.map((tradition, i) => (
                <span key={tradition.slug}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <Link to={`/tradition/${tradition.slug}`}>
                    {isRtl ? tradition.nameUr : tradition.name}
                  </Link>
                </span>
              ))}
            </dd>
          </div>
        )}
        {(shrine.silsila || shrine.silsilaNote) &&
          (() => {
            // The 14 clean order names come back in Urdu from the data
            // dictionary; the four survey-prose values stay verbatim and
            // Latin content is its own "untranslated" signal, as above.
            // silsila_note (22 Aug ruling) qualifies the value — or stands
            // alone when the survey recorded no order at all.
            const silsilaValue = localizeField(shrine.raw, 'silsila') || shrine.silsila;
            /* Linked when the *recorded* cell names exactly one of the nine
               orders — resolved from `shrine.silsila`, not from the localized
               display value, because the patterns are written against what the
               sheet holds and the Urdu rendering is a different string.

               This row was the entity graph's one one-way edge:
               `/order/qadiriyya` links out to 90 shrines and not one linked
               back, while "Built form" and "Tradition" directly above it are
               both links. A cell naming two orders stays plain text — "Chishti
               Nizamia Qadria" is a real dual affiliation, and picking one would
               assert something the sheet declines to (RULE 2). */
            const orderSlug = orderSlugForSilsila(shrine.silsila ?? '');
            const silsilaText = silsilaValue && (
              <bdi lang={isUntranslatedInUrdu(lang, silsilaValue) ? 'en' : undefined}>
                {silsilaValue}
              </bdi>
            );
            return (
              <div className="infobox-row">
                <dt className="infobox-label">{t('fieldSilsila')}</dt>
                <dd className="infobox-value">
                  {silsilaValue &&
                    (orderSlug ? (
                      <Link to={`/order/${orderSlug}`}>{silsilaText}</Link>
                    ) : (
                      silsilaText
                    ))}
                  {shrine.silsilaNote && (
                    <p className="infobox-note">
                      {t('sourceNoteLabel')}: <bdi>{shrine.silsilaNote}</bdi>
                    </p>
                  )}
                </dd>
              </div>
            );
          })()}
      </dl>
      {hasDates && (
        // Split date fields (2026 schema) — kept out of the capped generic
        // rows above so the qualifier and note are never truncated away.
        // The notes are unreviewed source prose, so they're wrapped in
        // <bdi> rather than translated (no-English-leak guard exemption).
        <dl className="infobox-list infobox-dates">
          {(shrine.yearBuilt || shrine.yearBuiltNote) && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('founded')}</dt>
              <dd className="infobox-value">
                {(() => {
                  const recorded = String(shrine.yearBuilt || resolveFoundedDate(shrine.raw, lang));
                  /* Five of the 127 rows that carry a `year_built` carry an
                     English *sentence* in it, because that is what the source
                     says and RULE 2 keeps it: Bibi Pak Daman's reads "681 CE /
                     c. 63 AH (popular tradition) — see note; second tradition
                     dates the events to the early 13th century CE". Rendered
                     as though it were a translated value it was the largest
                     block of undeclared English on the Urdu page — 329px of
                     the fact panel, at full size and full colour.

                     Declared per row on the evidence, the same way
                     ShrineArticle declares a bibliography line: `data-latin`
                     so the no-leak guard counts it, `lang='en'` so the RTL
                     rule in shrine.css sets it as the secondary, untranslated,
                     left-to-right run it is, and a screen reader switches
                     voice for it.

                     Numerals follow the same split, and the first cut of this
                     got it wrong by skipping `fmtNum` for anything with a
                     Latin letter in it. `shrineInfoboxDates.test` caught that
                     and the test is right: "contains a Latin letter" cannot
                     tell "1416 AH", where the Latin is a *unit* and i18n
                     rule 5 wants ۱۴۱۶, from a sentence. So a **date** takes
                     Eastern digits and **prose** keeps Western — which is not
                     an exception to rule 5 but the line this archive already
                     draws between a value and an unreviewed source note.
                     `looksLikeProse` above is what tells them apart. */
                  const isLatinRun = isUntranslatedInUrdu(lang, recorded);
                  const isProse = isLatinRun && looksLikeProse(recorded);
                  const qualifier = (() => {
                    if (!showQualifiers || !shrine.yearBuiltPrecision) return '';
                    // Known precision vocabulary localizes; free-form
                    // qualifiers render verbatim, like the source notes.
                    const pk = yearPrecisionKey(shrine.yearBuiltPrecision);
                    return ` (${pk ? t(YEAR_PRECISION_LABEL_KEYS[pk]) : shrine.yearBuiltPrecision})`;
                  })();
                  if (isProse) {
                    /* The qualifier stays outside the isolate: it is Urdu, and
                       an Urdu phrase inside a `direction: ltr` block reads
                       backwards. */
                    return (
                      <>
                        {/* Western digits, and not an exception to i18n rule 5
                            but the existing reading of it. This archive
                            already draws the line the rule needs: a *value*
                            takes Eastern numerals, and an unreviewed English
                            source *note* keeps Western ones
                            (`shrineInfoboxDates.test` states it in as many
                            words, and `.infobox-note` below renders that way).
                            A `year_built` that is an English sentence is a
                            note that the sheet happens to have put in the
                            value column, and it reads like one: "the early
                            ۱۳th century CE" is the alternative. */}
                        <bdi lang="en" data-latin className="infobox-value-prose">
                          {recorded}
                        </bdi>
                        {qualifier}
                      </>
                    );
                  }
                  /* A date, Latin unit or not: one run, unchanged in
                     appearance. `data-latin` where there is Latin to declare,
                     because until now there was none and the no-leak guard was
                     counting these as undeclared on any route that had one —
                     it had none. */
                  return isLatinRun ? (
                    <bdi data-latin>
                      {fmtNum(recorded)}
                      {qualifier}
                    </bdi>
                  ) : (
                    <bdi>
                      {fmtNum(recorded)}
                      {qualifier}
                    </bdi>
                  );
                })()}
                {showQualifiers && shrine.yearBuiltNote && (
                  <p className="infobox-note" data-latin>
                    {t('sourceNoteLabel')}: <bdi>{shrine.yearBuiltNote}</bdi>
                  </p>
                )}
              </dd>
            </div>
          )}
          {shrine.figureBorn && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('born')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.figureBorn)}</bdi>
              </dd>
            </div>
          )}
          {shrine.figureDied && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('died')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.figureDied)}</bdi>
              </dd>
            </div>
          )}
          {(shrine.eventYear || shrine.eventNote) && (
            <div className="infobox-row">
              <dt className="infobox-label">{t('eventYearLabel')}</dt>
              <dd className="infobox-value">
                <bdi>{fmtNum(shrine.eventYear)}</bdi>
                {shrine.eventNote && (
                  <p className="infobox-note" data-latin>
                    {t('sourceNoteLabel')}: <bdi>{shrine.eventNote}</bdi>
                  </p>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}
      {!shrine.latLng && <p className="infobox-note">{t('locationNotRecorded')}</p>}
      {shrine.latLng && (
        <div className="infobox-actions">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${shrine.latLng.lat},${shrine.latLng.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="infobox-action-btn"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            {t('getDirections')}
          </a>
        </div>
      )}
    </aside>
  );
}
