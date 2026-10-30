import React from 'react';
import { renderInlineBold } from './inlineFormat';
import { t } from '../../lib/i18n/uiStrings';
import { VERSE_LANGUAGE_LABEL, verseLanguageOf, type VerseLanguage } from './verseLanguage';

/**
 * The archive's prose, rendered.
 *
 * Extracted from `ShrineArticle` when the figure pages started showing an
 * entry's biographical section (A10): the two surfaces print the same recorded
 * markdown, and a second copy of the verse rule would have been a second place
 * for it to be wrong. It lives here rather than being exported from
 * `ShrineArticle` because that module carries the whole shrine article with it,
 * and the figure page needs eleven lines of it.
 */
const ARABIC_SCRIPT_CHAR = /[\u0600-\u06FF\u0750-\u077F]/;

/** Gurmukhi, the script of the Guru Granth Sahib. Guru Nanak's verse, and
 *  Baba Farid's as the Granth preserves it, is quoted in it above its
 *  rendering (Rauf, 30 October 2026: "the original needs to be there", and
 *  for Guru Nanak "the gurmukhi and then an urdu translation"). It is never
 *  the prose of either article, so a paragraph of it is always verse, in
 *  either view, one line or several. */
const GURMUKHI_CHAR = /[\u0A00-\u0A7F]/;

function isGurmukhiVerse(lines: string[]): boolean {
  return (
    lines.length > 0 &&
    lines.every((l) => GURMUKHI_CHAR.test(l) && !/[A-Za-z]/.test(l) && !/^[-*•#]/.test(l))
  );
}

/** The language and direction of a quoted original: Gurmukhi is Punjabi set
 *  left to right in its own face; everything else the archive quotes in verse
 *  is Arabic script, set as Urdu print sets poetry. */
function originalLang(lines: string[]): { lang: string; dir: 'ltr' | 'rtl'; gurmukhi: boolean } {
  return isGurmukhiVerse(lines)
    ? { lang: 'pa-Guru', dir: 'ltr', gurmukhi: true }
    : { lang: 'ur', dir: 'rtl', gurmukhi: false };
}

/** A couplet quoted in the prose: a paragraph whose single newlines separate
 * hemistichs, every line Arabic-script verse (never a list/heading marker).
 * Measured over the whole dataset (docs/FRONTEND_NOTES.md §8a): every
 * multi-line paragraph that isn't a list or a "## " heading is one of these,
 * so the rule has no false positives to guard against today. */
function isVerseParagraph(paragraph: string, inLatinProse: boolean, previous = ''): boolean {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (isGurmukhiVerse(lines)) return true;
  if (lines.length >= 2) {
    return lines.every((l) => ARABIC_SCRIPT_CHAR.test(l) && !/^[-*•#]/.test(l));
  }
  /* A one-line quotation — Bulleh Shah's "بُلھیا! کی جاݨاں میں کوݨ", Lal
     Shahbaz's "حیدریم قلندرم مستم ٭ …" — was set as an LTR prose paragraph
     flush left, while two-line couplets on the same page were centred as verse:
     14 of the archive's 27 verse quotations (reading council, 17 October 2026).
     Only inside Latin prose: in the Urdu view every paragraph is Arabic script,
     and there a lone line is prose until something says otherwise. */
  const [line] = lines;
  const oneArabicLine =
    line !== undefined &&
    line.length <= 160 &&
    ARABIC_SCRIPT_CHAR.test(line) &&
    !/[A-Za-z]/.test(line) &&
    !/^[-*•#]/.test(line);
  if (!oneArabicLine) return false;
  if (inLatinProse) return true;
  /* In the Urdu view a lone line is verse when the paragraph before
     introduces it, ending in a colon, and it does not end as a sentence does.
     Measured over the 94 public Urdu articles on 30 October 2026: 22 one-line
     paragraphs fit, every one a quoted verse (chronograms, kafis, a Sindhi
     bait); 13 already paired with a rendering, and the other 9 were set as
     prose, among them Mian Mir's "میر دنیا و دیں میاں میر ست". */
  return /[:：]\s*$/.test(previous) && !/[:：۔.،؛,؟!]$/.test(line);
}

/** A verse paragraph's hemistichs: its lines, or a one-line couplet's halves
 *  split at the ٭ the sources use between them. */
function verseLines(paragraph: string): string[] {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return lines[0]!
    .split(/\s*٭\s*/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * A verse quoted in rendering: the whole paragraph italic, its lines divided by
 * " / " (the convention the public descriptions use for verse set inside a
 * paragraph), optionally followed by the translator's credit as the source
 * gives it, "(translated by Christopher Shackle)".
 *
 * Measured over the 94 public descriptions on 29 October 2026: 326 paragraphs
 * are wholly italic, every one of them a verse rendering, 141 with that credit
 * and 179 with " / " between lines; 45 follow the original directly. They were
 * set as italic prose, flush left, with the credit run on in brackets, while the
 * original a line above was centred as verse (Rauf, 29 October 2026: "a more
 * aesthetic way of handling such quotations which are still poetry but in
 * english", "centred etc like the urdu ones", and of the credit, "find an
 * aesthetic way to cite the translation"). The Urdu articles carry the same
 * renderings in Urdu, italic and divided the same way, without the credit.
 */
interface Rendering {
  lines: string[];
  translator: string;
  latin: boolean;
}

const RENDERING = /^\*([^*]+)\*(?:\s*\(translated by ([^)]+)\))?$/i;

function asRendering(paragraph: string): Rendering | null {
  const m = RENDERING.exec(paragraph);
  if (!m) return null;
  const body = m[1]!.trim();
  const lines = body
    .split(/\s+\/\s+|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  return { lines, translator: (m[2] ?? '').trim(), latin: /[A-Za-z]/.test(body) };
}

/** The original of a rendering in the Urdu view, where a one-line original
 *  is otherwise read as prose (every paragraph there is Arabic script). It is
 *  verse when a rendering follows it and it does not end as a sentence or a
 *  lead-in does: across the 94 Urdu articles every lead-in before a rendering
 *  ends in a colon, and none of the 14 one-line originals ends in punctuation
 *  at all. */
function isOriginalOfRendering(paragraph: string): boolean {
  const lines = paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (isGurmukhiVerse(lines)) return true;
  if (lines.length !== 1) return false;
  const [line] = lines;
  return (
    line!.length <= 160 &&
    ARABIC_SCRIPT_CHAR.test(line!) &&
    !/[A-Za-z]/.test(line!) &&
    !/^[-*•#]/.test(line!) &&
    !/[:：۔.،؛,]$/.test(line!)
  );
}

/** A quoted original, one line per line of the verse. lang/dir make it an
 *  isolated island in either view: an RTL couplet in the English article, a
 *  left to right Gurmukhi line in the Urdu one. Gurmukhi is not passed through
 *  `localize`, which exists for the Arabic-script text and its numerals. */
function OriginalVerse({ lines, localize }: { lines: string[]; localize: (t: string) => string }) {
  const { lang, dir, gurmukhi } = originalLang(lines);
  return (
    <blockquote
      className={gurmukhi ? 'article-verse article-verse-gurmukhi' : 'article-verse'}
      lang={lang}
      dir={dir}
    >
      {lines.map((line, j) => (
        <span className="article-verse-line" key={j}>
          {gurmukhi ? line : renderInlineBold(localize(line))}
        </span>
      ))}
    </blockquote>
  );
}

/** The language of a quoted original, and then of its translation, set as a
 *  small caption between hairlines (a div, not a p: it is a label, and the
 *  article's paragraphs are counted elsewhere): "پنجابی" above Shah Hussain's kafi and
 *  "اردو" above its Urdu translation, "Punjabi" and "English" in the English
 *  article (Rauf, 30 October 2026: "For the differentiation between the urdu
 *  and punjabi make it more obvious"). Shown only where the original is not in
 *  the language of the article, so an Urdu couplet in the Urdu article carries
 *  none, and only where the language is recorded (verseLanguage.ts). */
type ArticleLang = 'en' | 'ur';

function showsLanguage(language: VerseLanguage | null, articleLang: ArticleLang) {
  return language !== null && !(articleLang === 'ur' && language === 'ur');
}

function VerseLanguageLabel({
  label,
  articleLang,
}: {
  label: VerseLanguage | 'en';
  articleLang: ArticleLang;
}) {
  return (
    <div
      className="article-verse-lang"
      lang={articleLang}
      dir={articleLang === 'ur' ? 'rtl' : 'ltr'}
    >
      {t(articleLang, VERSE_LANGUAGE_LABEL[label])}
    </div>
  );
}

/** One verse quotation: the original (if the text gives it), its rendering,
 *  and who rendered it. The credit is set as a colophon under the verse, a
 *  short rule and the translator's name in small capitals after "tr.", rather
 *  than a bracket run on after the last line. */
function VerseFigure({
  original,
  language = null,
  articleLang = 'en',
  renderings,
  localize,
}: {
  original: string[] | null;
  /** The recorded language of the original, for its label. */
  language?: VerseLanguage | null;
  articleLang?: ArticleLang;
  /** One rendering, or a run of them from the same translator with nothing
   *  between: set as stanzas of one figure with a single credit. */
  renderings: Rendering[];
  localize: (t: string) => string;
}) {
  const rendering = renderings[renderings.length - 1]!;
  const lang = rendering.latin ? 'en' : 'ur';
  const labelled = original !== null && showsLanguage(language, articleLang);
  return (
    <figure className="article-verse-figure">
      {labelled && <VerseLanguageLabel label={language!} articleLang={articleLang} />}
      {original && <OriginalVerse lines={original} localize={localize} />}
      {labelled && <VerseLanguageLabel label={lang} articleLang={articleLang} />}
      {renderings.map((stanza, k) => (
        <blockquote
          className="article-verse-rendering"
          key={k}
          lang={lang}
          dir={rendering.latin ? 'ltr' : 'rtl'}
        >
          {stanza.lines.map((line, j) => (
            <span className="article-verse-line" key={j}>
              {renderInlineBold(localize(line))}
            </span>
          ))}
        </blockquote>
      ))}
      {rendering.translator && (
        <figcaption className="article-verse-credit" lang={lang}>
          <span className="article-verse-credit-mark" aria-hidden="true">
            {t(lang, 'verseTranslatorMark')}
          </span>
          <span className="sr-only">{t(lang, 'verseTranslatedBy')} </span>
          <span className="article-verse-credit-name">{rendering.translator}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** Shared paragraph renderer for the lead, sections and the raw fallback:
 * plain paragraphs as <p>, couplets as a centred verse block with one line
 * per hemistich — previously the single newlines collapsed and verse ran on
 * as prose. */
export function ProseParagraphs({
  text,
  localize,
}: {
  text: string;
  localize: (t: string) => string;
}) {
  const inLatinProse = /[A-Za-z]/.test(text);
  const articleLang: ArticleLang = inLatinProse ? 'en' : 'ur';
  const paragraphs = text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i]!;
    const rendering = asRendering(paragraph);
    if (rendering) {
      /* A run of renderings with nothing between them, from one translator,
         is one passage: Shah Inayat Qadiri's article quotes five of Rafat's
         in a row, and five identical colophons read as a stutter. Set as
         stanzas of one figure, credited once. */
      const run = [rendering];
      while (i + 1 < paragraphs.length) {
        const following = asRendering(paragraphs[i + 1]!);
        if (
          !following ||
          following.translator !== rendering.translator ||
          following.latin !== rendering.latin
        )
          break;
        run.push(following);
        i += 1;
      }
      out.push(<VerseFigure key={i} original={null} renderings={run} localize={localize} />);
      continue;
    }
    const next = i + 1 < paragraphs.length ? asRendering(paragraphs[i + 1]!) : null;
    const isVerse = isVerseParagraph(paragraph, inLatinProse, i > 0 ? paragraphs[i - 1] : '');
    if (next && (isVerse || isOriginalOfRendering(paragraph))) {
      /* The original and its rendering are one quotation, so they are one
         figure: the rendering sits under the verse it renders. */
      out.push(
        <VerseFigure
          key={i}
          original={verseLines(paragraph)}
          language={verseLanguageOf(paragraph)}
          articleLang={articleLang}
          renderings={[next]}
          localize={localize}
        />,
      );
      i += 1;
      continue;
    }
    if (isVerse) {
      /* A verse with no rendering after it still says what language it is in,
         where that is not the article's. */
      const language = verseLanguageOf(paragraph);
      out.push(
        showsLanguage(language, articleLang) ? (
          <figure className="article-verse-figure" key={i}>
            <VerseLanguageLabel label={language!} articleLang={articleLang} />
            <OriginalVerse lines={verseLines(paragraph)} localize={localize} />
          </figure>
        ) : (
          <OriginalVerse key={i} lines={verseLines(paragraph)} localize={localize} />
        ),
      );
      continue;
    }
    out.push(<p key={i}>{renderInlineBold(localize(paragraph))}</p>);
  }
  return <>{out}</>;
}
