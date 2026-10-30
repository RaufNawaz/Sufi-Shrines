import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getArticleLeadText, parseInlineSections } from '../../lib/data/articleParsing';
import { SOURCES_HEADING_ALIASES } from '../../lib/data/constants';
import { localizeProseDigits } from '../../lib/i18n/numerals';
import { ProseParagraphs } from '../shrine/ProseParagraphs';
import { renderInlineBold } from '../shrine/inlineFormat';
import { anchorSlug } from '../shrine/useArticleContent';
import { localizeHeading } from '../../lib/data/headingLabels';
import { usePlaceArticle } from './usePlaceArticle';

const isSources = (heading: string) => SOURCES_HEADING_ALIASES.has(heading.trim().toLowerCase());

/**
 * The books' account of one place or province (30 October 2026).
 *
 * Written from the place-level and province-level material the book queue
 * attached to every entry in a place, by the same three-version process as the
 * shrine articles (`docs/prompts/PLACE_DESCRIPTION_BRIEF.md`): a team version
 * with every citation stays in `entries/places/`, and the public English and
 * Urdu in `entries/places_public/` are what this renders. A place with no
 * article renders nothing at all: the page above already says what the archive
 * records there, and an empty heading would be a claim that something is
 * missing rather than not yet written.
 *
 * **Two lengths.** Rauf, on the Lahore pilot (30 October 2026): the long public
 * article "is too long"; the page should open on "an article that is short and
 * complete but then switch to the longer one if you want or toggle which
 * sections you need more information for". A place whose long article is long
 * also has a short one (`<slug>.short.md` and `.short.ur.md`, verified on their
 * own and carried as `short` in the data file). The short article has exactly the
 * long one's section headings (`check_place_description.py short`, S1 and S5), so
 * each short section can be swapped for its long text in place ("More on this"),
 * or the whole article switched to the long one ("Full account"). A place with
 * no short article shows the long one, with no switch.
 *
 * The Urdu view shows the Urdu article and, like the shrine pages (i18n rule
 * 7), the English bibliography under it, since the Urdu file carries none.
 */
export function PlaceArticle({ slug }: { slug: string }) {
  const { lang, numerals, t } = useLang();
  const article = usePlaceArticle(slug);
  /* The reader's choice of length and the sections they opened belong to this
     place: a new place starts short again. */
  const [full, setFull] = React.useState(false);
  const [opened, setOpened] = React.useState<ReadonlySet<string>>(() => new Set());
  React.useEffect(() => {
    setFull(false);
    setOpened(new Set());
  }, [slug]);

  if (!article) return null;

  const localize = (text: string) => localizeProseDigits(text, lang, numerals === 'eastern');
  const english = article.en;
  /* The article files exist in English and Urdu only (`<slug>.md`, `<slug>.ur.md`):
     a datum that exists only in Urdu, so the comparison is the honest one. */
  // eslint-disable-next-line no-restricted-syntax -- the Urdu article file is an Urdu-only datum
  const urdu = lang === 'ur';
  const longBody = urdu && article.ur ? article.ur : english;
  /* The short article is used only in the language the long one is shown in, so
     "More on this" always opens the same language it closes. */
  const shortBody = article.short
    ? urdu && article.ur
      ? (article.short.ur ?? null)
      : article.short.en
    : null;
  const hasShort = shortBody !== null;
  const showShort = hasShort && !full;

  const WHOLE = { wholeMarkdownHeadings: true };
  const longSections = parseInlineSections(longBody, WHOLE).filter((s) => !isSources(s.heading));
  const shortByHeading = new Map(
    (shortBody ? parseInlineSections(shortBody, WHOLE) : [])
      .filter((s) => !isSources(s.heading))
      .map((s) => [s.heading.trim(), s.content] as const),
  );
  const lead = getArticleLeadText(showShort && shortBody ? shortBody : longBody);
  const sources = parseInlineSections(english, WHOLE).find((s) => isSources(s.heading));
  const urduMissing = urdu && !article.ur;

  const chooseLength = (wantFull: boolean) => {
    setFull(wantFull);
    setOpened(new Set());
  };

  const toggleSection = (id: string) => {
    const closing = opened.has(id);
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    /* Closing a long section can leave the reader below its short text; bring
       its heading back into view so they do not lose their place. */
    if (closing && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const heading = document.getElementById(`${id}-heading`);
        if (heading && heading.getBoundingClientRect().top < 0) {
          heading.scrollIntoView({ block: 'start' });
        }
      });
    }
  };

  return (
    <div className="place-article" {...(urduMissing ? { 'data-latin': '' } : {})}>
      {hasShort && (
        <div className="place-article-length">
          <div
            className="place-article-length-switch"
            role="group"
            aria-label={t('placeArticleLengthLabel')}
          >
            <button
              type="button"
              className={`place-article-length-option${showShort ? ' active' : ''}`}
              aria-pressed={showShort}
              onClick={() => chooseLength(false)}
            >
              {t('placeArticleShort')}
            </button>
            <button
              type="button"
              className={`place-article-length-option${showShort ? '' : ' active'}`}
              aria-pressed={!showShort}
              onClick={() => chooseLength(true)}
            >
              {t('placeArticleFull')}
            </button>
          </div>
          {showShort && <p className="place-article-length-note">{t('placeArticleShortNote')}</p>}
        </div>
      )}
      {lead && (
        <section className="article-section article-lead">
          <div className="article-prose">
            <ProseParagraphs text={lead} localize={localize} />
          </div>
        </section>
      )}
      {longSections.map((section) => {
        const id = `place-${anchorSlug(section.heading)}`;
        const shortText = showShort ? shortByHeading.get(section.heading.trim()) : undefined;
        const open = opened.has(id);
        const text = shortText !== undefined && !open ? shortText : section.content;
        return (
          <section key={id} className="article-section" id={id} aria-labelledby={`${id}-heading`}>
            <h2 className="article-section-heading" id={`${id}-heading`}>
              {renderInlineBold(localize(section.heading))}
            </h2>
            <div className="article-prose" id={`${id}-prose`}>
              <ProseParagraphs text={text} localize={localize} />
            </div>
            {shortText !== undefined && (
              <button
                type="button"
                className="place-section-more"
                aria-expanded={open}
                aria-controls={`${id}-prose`}
                onClick={() => toggleSection(id)}
              >
                {open ? t('placeSectionLess') : t('placeSectionMore')}
              </button>
            )}
          </section>
        );
      })}
      {sources && (
        <section
          className="article-section"
          id="place-bibliography"
          aria-labelledby="place-bibliography-heading"
        >
          <h2 className="article-section-heading" id="place-bibliography-heading">
            {/* The bibliography is the English one in both views (i18n rule 7), but
                its heading is the reader's language. */}
            {renderInlineBold(localize(localizeHeading(sources.heading, lang)))}
          </h2>
          <ul className="article-prose article-sources-list">
            {sources.content
              .split('\n')
              .map((line) => line.trim().replace(/^[-*•]\s+/, ''))
              .filter(Boolean)
              .map((line, i) => (
                <li key={i} {...(/[A-Za-z]/.test(line) ? { 'data-latin': '' } : {})}>
                  {renderInlineBold(localize(line))}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
