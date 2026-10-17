import React, { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { useReveal } from '../../lib/useReveal';
import { ShrineGallery } from './ShrineGallery';
import { anchorSlug, useArticleContent } from './useArticleContent';
import { localizeHeading } from '../../lib/data/headingLabels';
import { renderInlineBold } from './inlineFormat';
import { ProseParagraphs } from './ProseParagraphs';
import { SOURCES_HEADING_ALIASES } from '../../lib/data/constants';
import { localizeProseDigits } from '../../lib/i18n/numerals';
import { Link } from 'react-router-dom';
import { useShrineData } from '../../hooks/useShrineData';
import { buildSourceIndex, sourceAnchorId } from '../../lib/data/sourceIndex';
import { citationKey } from '../../lib/data/bibliography';
import { tFn } from '../../lib/i18n/uiStrings';

/** Source lines are often hand-authored with their own "- " / "* " marker —
 * strip it so the real <li> bullet doesn't double up with a literal one. */
function stripLeadingListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, '');
}

/**
 * Where else the archive uses this source.
 *
 * A bibliography line answers "where did this claim come from". It could never
 * answer the next question — "and what else rests on it" — although the archive
 * has known since the source layer landed: 464 distinct sources behind 533
 * citations, **28 of them carrying more than one entry**, one of them carrying
 * twenty-five.
 *
 * Shown only where the answer is more than "this entry", which leaves 436 of
 * the 533 citations exactly as they were. A note reading "cited by this entry
 * alone" under five lines in six would be noise, and the interesting half —
 * that a source is *shared* — would be buried in it. Where the note is absent,
 * the full index on `/sources` still lists the source; the link is a shortcut
 * to a question worth asking, not the only way in.
 *
 * It pointed at `/about#source-…` until 17 October 2026 — a section that
 * renders for the team view only, so every public reader who followed it
 * landed on a page without the row it named.
 */
function SourceReach({ citation, fromSlug }: { citation: string; fromSlug: string }) {
  const { lang, fmtNum } = useLang();
  const { shrines } = useShrineData();
  const index = useMemo(() => buildSourceIndex(shrines), [shrines]);
  const entry = useMemo(() => {
    const key = citationKey(citation);
    return index.sources.find((source) => source.key === key);
  }, [index, citation]);

  if (!entry || entry.shrines.length <= 1) return null;
  return (
    <Link
      className="article-source-reach"
      to={`/sources?from=${encodeURIComponent(fromSlug)}#${sourceAnchorId(entry.name)}`}
    >
      {fmtNum(tFn(lang, 'sourceAlsoCitedBy', entry.shrines.length - 1))}
    </Link>
  );
}

function ArticleSection({
  id,
  heading,
  content,
  isSources = false,
  fromSlug,
}: {
  id: string;
  heading: string;
  content: string;
  isSources?: boolean;
  /** The entry this article belongs to, so /sources can mark it in the row. */
  fromSlug: string;
}) {
  const { lang, numerals } = useLang();
  // Dates inside translated article text were the one place Eastern numerals
  // never reached, so Urdu prose read "1873–1966" mid-Nastaliq. URLs, DOIs
  // and ISBNs keep their Western digits — see localizeProseDigits.
  const localize = (text: string) => localizeProseDigits(text, lang, numerals === 'eastern');

  const revealRef = useReveal<HTMLElement>();

  return (
    <section ref={revealRef} className="article-section" id={id} aria-labelledby={`${id}-heading`}>
      {/* `localize(heading)`, not `{heading}` — the same call the body four
          lines below already makes. Ten entries carry a digit in an Urdu `##`
          heading ("2010 کا دھماکہ…"), so the year rendered Western in the
          heading and Eastern in the paragraph directly beneath it: one year,
          two numeral systems, one screen. */}
      {/* Through the inline formatter as well: four headings carry the
          markdown the body does ("The annual *ʿurs*"), and the asterisks
          printed (epistemic council, 17 October 2026). */}
      <h2 className="article-section-heading" id={`${id}-heading`}>
        {renderInlineBold(localize(heading))}
      </h2>
      {isSources ? (
        <ul className="article-prose article-sources-list">
          {content
            .split('\n')
            .map((line) => stripLeadingListMarker(line.trim()))
            .filter(Boolean)
            .map((line, i) => (
              /* Declared where it is actually Latin, and not otherwise.
                 A citation stays in the source's own script by design — i18n
                 rule 7 exists so an Urdu reader chasing a source gets the exact
                 search string — and 98 entries show the English bibliography in
                 the Urdu view because the Urdu article has none. But Data
                 Darbar's citations *are* Urdu, and declaring those would be
                 claiming a leak that is not there and inflating the budget that
                 counts real ones. Per line, on the evidence. */
              <li key={i} {...(/[A-Za-z]/.test(line) ? { 'data-latin': '' } : {})}>
                {renderInlineBold(localize(line))}
                <SourceReach citation={line} fromSlug={fromSlug} />
              </li>
            ))}
        </ul>
      ) : (
        <div className="article-prose">
          <ProseParagraphs text={content} localize={localize} />
        </div>
      )}
    </section>
  );
}

interface Props {
  shrine: Shrine;
}

export function ShrineArticle({ shrine }: Props) {
  const { lang, numerals, t } = useLang();
  const { leadText, inlineSections, uniqueColumnSections, rawFallback, urduArticleMissing } =
    useArticleContent(shrine);
  // The lead and the raw-Description fallback bypass ArticleSection, so they
  // were the two remaining prose paths where Urdu still showed Western
  // digits (rule 5: fmtNum/localized digits at every number render site).
  const localize = (text: string) => localizeProseDigits(text, lang, numerals === 'eastern');

  return (
    /* When the Urdu article does not exist, the whole article below is English.
       Declared at the wrapper rather than per element: the condition is exactly
       "all of this is the English fallback", so anything narrower would be
       pretending some of it is translated. The budget in
       `e2e/urdu-no-leak.spec.ts` is the size of that debt, and it should go to
       zero when the two entries are written — not be raised again. */
    <div {...(urduArticleMissing ? { 'data-latin': '' } : {})}>
      {urduArticleMissing && (
        <p className="article-untranslated-note" lang="ur" dir="rtl">
          {t('articleUrduMissing')}
        </p>
      )}
      {leadText && (
        <section
          className="article-section article-lead"
          id="overview"
          aria-labelledby="overview-heading"
        >
          <div className="article-prose">
            <ProseParagraphs text={leadText} localize={localize} />
          </div>
        </section>
      )}

      {inlineSections.map((section) => {
        const id = anchorSlug(section.heading);
        return (
          <ArticleSection
            key={id}
            id={id}
            heading={localizeHeading(section.heading, lang)}
            content={section.content}
            isSources={SOURCES_HEADING_ALIASES.has(section.heading.trim().toLowerCase())}
            fromSlug={shrine.slug}
          />
        );
      })}

      {uniqueColumnSections.map((section) => (
        <ArticleSection
          key={section.id}
          id={section.id}
          heading={section.title[lang] || section.title.en}
          content={section.content}
          isSources={section.id === 'sources'}
          fromSlug={shrine.slug}
        />
      ))}

      {rawFallback && (
        <section className="article-section" id="description" aria-labelledby="description-heading">
          <div className="article-prose">
            <ProseParagraphs text={rawFallback} localize={localize} />
          </div>
        </section>
      )}

      {/* An entry that cites nothing used simply end, and a reader could not
          tell "no sources" from "sources further down" (epistemic council,
          17 October 2026). One entry, today. */}
      {!inlineSections.some((s) => SOURCES_HEADING_ALIASES.has(s.heading.trim().toLowerCase())) &&
        !uniqueColumnSections.some((s) => s.id === 'sources') && (
          <p className="article-no-sources">{t('articleNoSources')}</p>
        )}

      <ShrineGallery items={shrine.gallery} category={shrine.category} />
    </div>
  );
}
