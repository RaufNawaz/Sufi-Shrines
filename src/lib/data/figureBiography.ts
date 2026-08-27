import type { Lang, Shrine } from '../../types/shrine';
import { parseInlineSections } from './articleParsing';
import { figureSlugsForShrine } from '../kgShrineFigures';

/**
 * The entry's account of a figure's life, on the figure's own page.
 *
 * 48 of the archive's 169 entries carry an explicitly biographical section, and
 * it rendered only on the shrine page. It is the single largest body of real
 * biographical prose the archive holds, and a reader arriving at
 * `/saint/waris-shah` saw a name, some dates and a list of sites.
 *
 * **The guard is the feature, and it has two halves.**
 *
 * *Which entry may speak for a figure.* An entry's biography belongs to the
 * figure that entry is about, and to no one else. Echoing one entry's prose onto
 * a second figure's page would attribute a life to the wrong person — a RULE 2
 * violation produced entirely by a layout decision, with nothing in the text to
 * signal it. So a section is shown only where the entry names *exactly* this
 * figure and no other. In the shipped data every entry names exactly one, so the
 * guard never fires; it is tested against synthetic input for the same reason
 * `figureTimeline`'s contradiction check is — the day it fires is the day nobody
 * is looking.
 *
 * *Which heading is a life.* This is the half that surprised. A permissive
 * `/life/i` looks obviously right and is obviously wrong: **eighteen of the
 * archive's headings containing "Life" are about the shrine rather than the
 * person** — "Devotional Life", "The Shrine and its Devotional Life",
 * "Festivals and Devotional Life", "Architecture and Devotional Life", "The
 * Temple and Its Life". Every one of those would have arrived on a figure's page
 * under a heading promising a biography, and read as one.
 *
 * So the classification is a deny list checked *before* an allow list, in each
 * language separately, and a heading that matches neither is shown nowhere. That
 * last part is deliberate: a new heading is an editorial decision, and the
 * unit test flags any unclassified heading that mentions a life, so the decision
 * gets made rather than defaulted.
 *
 * **Why each language classifies its own text.** The Urdu articles carry their
 * own headings — 369 distinct ones — so there is no index to map across, and
 * mapping by position would misalign on the seven entries whose two versions
 * have different section counts. Running the Urdu rules over the Urdu prose also
 * makes the language safety fall out for free: `localizeField` returns the
 * English Description when no Urdu one exists, its headings are Latin, the Urdu
 * classifier rejects them, and an Urdu reader is shown nothing rather than a
 * page of untranslated English (i18n rule 7). Measured 26 August 2026: 48
 * entries carry an English biography, 44 an Urdu one, 43 both.
 */

/** What a section heading is about. `unclassified` is a real answer — it means
 * nobody has decided, and an undecided heading is not published as a life. */
export type BiographyVerdict = 'biography' | 'site' | 'unclassified';

/**
 * Headings about the *site's* devotional life, not a person's. Checked first,
 * because several of them also contain the word this function is looking for.
 */
const DENY: Record<Lang, RegExp> = {
  en: /devotional|\bshrine\b|\btemple\b|architect|festival|\burs\b|dhamal|shivratri|gurdwara|mandir|mosque/i,
  /* عقیدت (devotion), مزار / درگاہ (shrine), گرودوارہ, مندر, عرس, تعمیر
     (architecture). "عقیدت مندانہ زندگی" is devotional life and must not be
     read as a life.
     عمارت (building), محل (location, as in محلِ وقوع) and انتظام
     (administration) were added when the unclassified-heading check found three
     Urdu headings that pair a life with the site's own affairs — "سوانحی روایت،
     عمارت اور جانشینی", "محلِ وقوع، سوانح اور انتظام". A section that is half a
     building's history is not a biography, and a figure's page is the wrong
     place to print it under a heading that promises one. */
  ur: /عقیدت|مزار|گرودوارہ|مندر|عرس|تعمیر|مسجد|درگاہ|عمارت|محل|انتظام/,
};

/**
 * Headings that name a person's life.
 *
 * Written against every heading in the shipped data rather than guessed, and
 * deliberately narrow. The Urdu side is one broad rule plus two exact ones,
 * because after the deny list above, زندگی ("life") in an Urdu heading is
 * always a person's.
 */
const ALLOW: Record<Lang, RegExp[]> = {
  en: [
    /* "The Life of the Saint" (26), "The Life of the Poet-Saint" (4), and the
       eleven that name their subject: "The Life of Ali Hujwiri", "The Life and
       Martyrdom of Bhai Taru Singh", "The Life and Cult of the Saint" … */
    /^the life\b/i,
    /^life$/i,
    /^life and poetry$/i,
    /^family and early life$/i,
    /^career, family, and public life$/i,
    /^a life in a changing country$/i,
    /^the saint and the tradition$/i,
    /* Iqbal's entry, which words its biography as the poet rather than the
       saint. */
    /^the poet and his age$/i,
    /^the poet of the east$/i,
    /* "Wasif Ali Wasif — life and career". */
    /—\s*life and career$/i,
  ],
  /* زندگی is "life" and سوانح is "biography"; after the deny list above, either
     in an Urdu heading is always a person's. */
  ur: [/زندگی/, /سوانح/, /^بزرگ اور روایت$/, /^ولی اور روایت$/],
};

export function classifyBiographyHeading(heading: string, lang: Lang): BiographyVerdict {
  const text = heading.trim();
  if (!text) return 'unclassified';
  if (DENY[lang].test(text)) return 'site';
  return ALLOW[lang].some((pattern) => pattern.test(text)) ? 'biography' : 'unclassified';
}

export interface FigureBiography {
  /** The entry the prose comes from. Shown, linked, never implied. */
  shrine: Shrine;
  /** The entry's own heading, verbatim — "The Life of the Poet-Saint" is the
   * archive's wording and a generic "Biography" would lose it. */
  heading: string;
  /** Markdown, exactly as recorded. */
  content: string;
}

/**
 * Biographical sections that may be attributed to this figure.
 *
 * `readDescription` is injected rather than imported so this stays a pure
 * function of its inputs: the page passes `localizeField`, which resolves the
 * reader's language, and a test passes the raw English.
 */
export function biographyForFigure(
  figureSlug: string,
  shrines: Shrine[],
  readDescription: (shrine: Shrine) => string,
  lang: Lang,
  /** Injected so the guard can be exercised. No entry in the shipped data names
   * two figures, and a guard that cannot be made to fire is a guard nobody has
   * checked. */
  figuresForShrine: (shrineSlug: string) => string[] = figureSlugsForShrine,
): FigureBiography[] {
  const out: FigureBiography[] = [];
  for (const shrine of shrines) {
    const figures = figuresForShrine(shrine.slug);
    // The guard: this entry, and this entry alone, is about this figure.
    if (figures.length !== 1 || figures[0] !== figureSlug) continue;
    for (const section of parseInlineSections(readDescription(shrine))) {
      if (classifyBiographyHeading(section.heading, lang) !== 'biography') continue;
      out.push({ shrine, heading: section.heading, content: section.content });
    }
  }
  return out;
}
