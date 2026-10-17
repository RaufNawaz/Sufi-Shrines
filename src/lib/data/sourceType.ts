import { isPlaceholderSource } from './sourceKind';

/**
 * What *kind* of thing a bibliography line points at — a book, a newspaper
 * report, a government record, a web page, the project's own field survey.
 *
 * ## Why a reader needs it
 *
 * `/sources` lets a reader browse everything the archive cites, and the first
 * question anyone asks of a bibliography that size is not "which one" but
 * "what sort": a reader who wants something to borrow from a library wants the
 * books, a reader checking a recent restoration wants the press, and a reader
 * weighing how much of the archive rests on its own fieldwork wants the
 * survey. Without the split, 469 lines are one undifferentiated list.
 *
 * ## What it is, honestly
 *
 * A reading of the citation's *form*, not of the work. It looks at the shapes
 * the archive's citations actually take — an italic run, a quoted article
 * title, a URL, a periodical's name, a gazetteer — and nothing else. It never
 * looks anything up, so it can be wrong about a line whose form misleads, and
 * the page says so beside the filter. The citation itself is never altered
 * (RULE 2); this only decides which pile it is shown in.
 *
 * The order of the tests is the classification. A placeholder is a placeholder
 * whatever else it mentions (`isPlaceholderSource`, the archive's own rule);
 * the field survey is the project's own evidence and outranks the form of the
 * line describing it; a dated newspaper report is press even when it carries a
 * URL; and only a line with nothing more specific about it falls to "book".
 * `sourceType.test.ts` pins the distribution over the shipped data so a change
 * to any rule shows up as a changed count rather than as a quietly re-sorted
 * page.
 */
export type SourceType =
  | 'book'
  | 'article'
  | 'press'
  | 'record'
  | 'web'
  | 'field'
  | 'tradition'
  | 'general';

/** Display order: the citable kinds first, the general references last. */
export const SOURCE_TYPE_ORDER: readonly SourceType[] = [
  'book',
  'article',
  'press',
  'record',
  'web',
  'tradition',
  'field',
  'general',
];

/**
 * Periodicals the archive cites, lowercased. A newspaper's name in italics is
 * the publication, not the work — the trap `measure-source-works.mjs` documents
 * — so it must be recognised before the italic run is read as a book title.
 */
const PERIODICALS = [
  'dawn',
  'the express tribune',
  'express tribune',
  'the news',
  'the news on sunday',
  'the friday times',
  'friday times',
  'the tribune',
  'the nation',
  'daily times',
  'arab news',
  'the herald',
  'herald',
  'youlin magazine',
  'scroll',
  'scroll.in',
  'the hindu',
  'hindustan times',
  'times of india',
  'the times of india',
  'the indian express',
  'indian express',
  'the print',
  'theprint',
  'al jazeera',
  'bbc',
  'bbc news',
  'bbc urdu',
  'gulf news',
  'the guardian',
  'the new york times',
  'the washington post',
  'reuters',
  'associated press',
  'pti',
  'sbs',
  'aaj news',
  'geo news',
  'geo',
  'samaa',
  'ary news',
  'business recorder',
  'pakistan today',
  'the diplomat',
  'tns',
  'images',
  'eos',
  'the express',
  'daily jang',
  'jang',
  'nawa-i-waqt',
  'the frontier post',
  'the statesman',
  'sikh24',
  'outlook',
  'national herald',
  'wion',
  'the karachi walla',
  'bolan voice',
  'sindh courier',
  'asia samachar',
  'ndtv',
  'india today',
  'the wire',
  'the quint',
];

const MONTHS =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+\d{4}\b|\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i;

const LITERATURE_POINTER =
  /^(?:[A-Z][\w.'’ -]{2,40},\s+)?(general works|studies|histories|accounts|works of|writings|essays|published (accounts|surveys|writing|biographical|devotional)|established histories|academic (work|study)|regional histories|ethnographic accounts|documentation|journalistic|pilgrimage guides|traditional accounts|devotional accounts|[\w-]+-era accounts|heritage (surveys|documentation)|reports on)\b/i;

const WEBSITES =
  /\b(discover ?sikhism|allaboutsikhs|sikhnet|odishabytes|world gurudwaras|sikhiwiki|wikipedia)\b/i;

/** A personal name (or "Surname, First (ed.).") followed by an italic title. */
const AUTHOR_THEN_TITLE = /^([^*"“]{3,80}?)[,.]\s+\*[^*]+\*/;

const INSTITUTION =
  /\b(department|government|directorate|board|committee|trust|unesco|ministry|wikipedia|press|authority|foundation)\b|^the\b/i;

const URL = /\bhttps?:\/\/|\bwww\.[a-z]/i;

/** The italic runs of a citation, lowercased: `*Dawn*` → `dawn`. */
function italicRuns(text: string): string[] {
  return [...text.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]!.trim().toLowerCase());
}

function namesPeriodical(text: string): boolean {
  const lower = text.toLowerCase();
  if (italicRuns(text).some((run) => PERIODICALS.includes(run.replace(/[.,;:]+$/, '')))) {
    return true;
  }
  /* Unitalicised wire and broadcast names ("PTI", "Arab News PK"), only as
     whole words, so "dawn" inside "Dawnay" or "bbc" inside a URL path is not
     read as a newspaper. */
  return /(^|[\s,(])(arab news|pti|bbc( urdu| news)?|al jazeera|scroll\.in|the print|sikh24|sbs|reuters)\b/i.test(
    lower,
  );
}

/**
 * The kind of a single bibliography line. Total: every line gets exactly one.
 */
export function sourceType(name: string): SourceType {
  const text = (name ?? '').trim();
  const lower = text.toLowerCase();

  if (isPlaceholderSource(text)) return 'general';

  /* The project's own fieldwork, however the line is phrased. */
  if (/\bfield survey\b|\bshrines project\b|\bsurveyor\b|\bsurvey responses?\b|\bfield (visit|notes|documentation)\b/i.test(text)) {
    return 'field';
  }

  /* A line that points at a body of writing rather than one findable work —
     "Studies of the cult of Jhulelal…", "Zulfiqar Ali Kalhoro, writings on…".
     The archive's placeholder rule catches the "General histories of…" shape;
     these are the same kind of line in other words, and a reader filtering for
     books to look up should not be handed them. */
  if (LITERATURE_POINTER.test(text)) return 'general';

  /* A report in a newspaper or magazine: the periodical named, usually with a
     day and month. Ahead of `web` because most press citations carry a URL. */
  if (namesPeriodical(text)) return 'press';
  if (/\bpress (coverage|reports?|reporting)\b|\bcoverage of\b/i.test(text)) return 'press';

  /* Reference websites cited by name, without a URL. */
  if (WEBSITES.test(text)) return 'web';

  /* "Author, *Title*" — the commonest shape of a book citation in the archive,
     and the one keywords further down would otherwise steal: a monograph
     published by a Department of Archaeology is still a book, and a study of
     the Janamsakhis is not the Janamsakhis. */
  const authored = AUTHOR_THEN_TITLE.exec(text);
  if (authored && !INSTITUTION.test(authored[1]!)) return 'book';

  /* Scholarly articles and chapters: a quoted title inside a journal, volume or
     edited book. Ahead of `record` so a journal article *about* a gazetteer is
     an article. */
  if (
    /["“][^"”]{6,}["”]/.test(text) &&
    /\b(journal|vol\.|volume|no\.\s*\d|pp\.|proceedings|quarterly|review|studies|bulletin|in\s+\*)/i.test(
      text,
    ) &&
    !URL.test(text)
  ) {
    return 'article';
  }
  if (/\bjournal of\b|\*[^*]*journal[^*]*\*/i.test(text)) return 'article';

  /* Government, colonial and institutional records: gazetteers, archaeological
     surveys, departmental lists, UNESCO dossiers, trust-board records. */
  if (
    /\bgazetteer|\barchaeolog|\bdepartment\b|\bdirectorate\b|\bgovernment of\b|\bevacuee trust\b|\bunesco\b|\bauqaf\b|\bnotification|\bantiquities act\b|\bcensus\b|\bboard\b.*\brecords?\b|\brecords? (of|on)\b|\breports? of the\b|\bministry\b|\bcommittee\b/i.test(
      text,
    )
  ) {
    return 'record';
  }

  /* Scripture and the oral-literary traditions the Sikh and Sufi entries cite
     as such — the Janamsakhis, the Granth, a saint's own poetry — which are
     neither a modern book nor a placeholder. */
  if (
    /\bjanamsakhi|\bguru granth|\bgranth sahib\b|\btraditions? (of|preserving|about)\b|\bhagiograph|\bmalfuzat\b|\btazkira\b(?!h? awliya-e-pakistan)|\bpuranas?\b|\bramayana\b|\bmahabharata\b/i.test(
      text,
    ) &&
    !/\(\s*[^)]*\b(1[89]|20)\d{2}\b[^)]*\)/.test(text)
  ) {
    return 'tradition';
  }

  /* A web page: a URL, or a site that is a website by name. */
  if (URL.test(text) || /\bwikipedia\b|\bwebsite\b|\bportal\b|\bonline\b|\baccessed\b|\bsikhiwiki\b|\.com\b|\.org\b|\.pk\b/i.test(lower)) {
    return 'web';
  }

  /* A quoted title with a date in the press shape but no recognised paper. */
  if (/["“][^"”]{6,}["”]/.test(text) && MONTHS.test(text)) return 'press';

  /* What remains with an italic title is a book (or a book-length work). */
  if (italicRuns(text).length > 0) return 'book';
  if (/\b(press|publications?|publishers?|books|university)\b.*\b\d{4}\b/i.test(text)) return 'book';

  /* A quoted title alone is most often an article or chapter. */
  if (/["“][^"”]{6,}["”]/.test(text)) return 'article';

  return 'general';
}
