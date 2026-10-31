import type { Lang } from '../../types/shrine';
import type { StringTableOf } from './uiStrings';

/**
 * The team view's interface strings, English and Urdu — kept out of the public
 * build (docs/TEAM_ACCESS_PLAN.md).
 *
 * Every key here is read only by team-only code: the review desk, the measured
 * self-account on /about, the sources-and-provenance panel, the "Team view"
 * badge and switch, and the parts of the shared pages that render only while
 * `useTeamAccess()` is on (the figure index and lineage-only list on /graph, a
 * figure's gaps and provenance, the "unreviewed" chips, the undated list on
 * /chronology). A key that a public path renders must stay in `uiStrings.ts`:
 * moved here, it reads as an empty string to every public reader.
 *
 * **How it is loaded.** `main.tsx` imports this module dynamically, behind
 * `__TEAM_CODE__`, and hands it to `registerTeamStrings()` before the first
 * render. In the public build `__TEAM_CODE__` is `false`, the import sits in a
 * dead branch, and Rollup never emits the chunk — so nothing below reaches a
 * public reader. The test setup registers it statically. Nothing in app source
 * may import it statically (`teamStrings.test.ts` checks): one static import
 * would fold all of it back into the public bundle and nothing would fail.
 *
 * `t()` and `tFn()` take these keys exactly as they take the public ones, and
 * `TEAM_TEXT_UR` is typed from the English table, so a missing Urdu key or a
 * changed interpolation is a compile error, as it is for the public table. Both
 * languages live in one module because the team chunk is small and every team
 * reader needs it; the public Urdu table is still the lazily loaded one.
 *
 * Values are moved byte for byte from `uiStrings.ts` and `uiStrings.ur.ts`; the
 * Urdu is reviewed text and is not to be reworded here (RULE 2).
 */
export const TEAM_TEXT_EN = {
  settingsTeamSection: 'Project team',
  settingsTeamLabel: 'Team view',
  settingsTeamHelp:
    'The public reads a clean page; the team reads every qualification — the measured self-account on About, the precision notes on dates, the sources panel, the review desk. This switch appears only in a browser that has followed the team link.',
  settingsTeamToggle: 'Show the team view',
  turnOffTeamView: 'Turn off the team view',
  /* The absences, named. `/about` computes what the archive does not know and
     says so on the page; this is the same move at the scale of one figure. */
  saintGapsHeading: 'What the archive does not record',
  saintGapsNote:
    'Stated rather than left as an empty page. Each line is a gap in the record, not a claim that no such fact exists — and each is something a source or a field visit could close.',
  saintGapDates: 'No birth or death date.',
  saintGapOrder: 'No silsila.',
  saintGapTeachers: 'No teacher.',
  saintGapDisciples: 'No disciple or successor.',
  saintGapObservance: 'No observance of any kind.',
  saintGapPhoto: 'No photograph of the site.',
  orderDescriptionEditorial:
    'Background written for this site. No source in the archive states it — unlike the passages below, which are quoted from entries.',
  orderAsRecorded: 'As recorded',
  orderAsRecordedHelp:
    'The silsila exactly as this figure\u2019s own record words it, including where the record contradicts itself. It describes the figure rather than any one of the orders above, so it is shown once.',
  kinNotesHeading: 'Recorded, and unnamed',
  kinNoteUnnamed: 'The archive records this family tie and has no second figure to link it to.',
  reviewTitle: 'Review desk',
  reviewGateNote: 'This page is for the project team. Open it with the team link to see the queue.',
  reviewEmpty: 'Nothing is waiting for review.',
  reviewLoading: 'Loading the queue\u2026',
  reviewClaimDiscipleOf: 'is recorded as a disciple of',
  reviewClaimSuccessorOf: 'is recorded as the successor of',
  reviewClaimBelongsToOrder: 'is recorded in the silsila',
  reviewClaimBiography: 'these dates and titles were read out of prose',
  reviewEvidence: 'Read from',
  reviewConfirm: 'Confirm',
  reviewReject: 'Reject',
  reviewUnsure: 'Needs work',
  reviewNotePlaceholder: 'What the evidence does and does not support\u2026',
  reviewProgress: 'Verdicts recorded',
  reviewDownload: 'Download verdicts (CSV)',
  reviewDownloadHelp:
    'A CSV in the review worksheet\u2019s own columns. Import it by hand \u2014 this page never writes to the sheet.',
  reviewStale:
    'The evidence for this claim changed after the verdict was recorded, so the verdict no longer applies to it.',
  reviewNoQuote:
    'No quote was captured for this claim. Judge it against the source, or mark it as needing work.',
  graphExplorerAllFigures: 'Figures in the archive',
  graphFigureFilterLabel: 'Find a figure',
  graphFigureFilterPlaceholder: 'Name, title or tradition…',
  graphFigureFilterClear: 'Clear',
  graphFigureFilterCount: (shown: number, total: number) => `${shown} of ${total}`,
  graphFigureFilterEmpty: 'No figure matches that.',
  graphCenturyFilterLabel: 'Century',
  graphCenturyAll: 'Any',
  graphCenturyUndated: 'Undated',
  graphCenturyUndatedHelp:
    'Figures the record places in the Hijri calendar only, or in no year at all. Converting a Hijri year to a century here would be this archive inventing a date, so they are grouped rather than guessed \u2014 and they are nearly half of the figures the archive holds.',
  graphLineageOnlyHeading: 'Named in a lineage, not documented here',
  graphLaunchArchiveSub: 'Search by name, title or century',
  graphLaunchLineageSub: 'Teachers and disciples the sources name',
  graphBookFiguresHeading: 'Named in the books, no site in Pakistan',
  graphLaunchBookFiguresSub: 'Saints the transcribed books document, unreviewed',
  graphBookFiguresNote:
    'Saints the archive\u2019s transcribed books document who have no grave or shrine in Pakistan \u2014 buried in Delhi, Kashmir, the Hijaz or elsewhere, or not buried anywhere the book records. Each line is the book\u2019s notes word for word, from a transcription nobody has yet checked against the page. Team view only until it has been: they are not in the graph\u2019s counts, its search or its pages.',
  graphBookFiguresInGraph: 'The same figure in the graph',
  graphLineageOnlyNote:
    'Teachers and masters whose names appear in another figure\u2019s recorded chain of transmission, and who have no site in this archive. They are not counted among its entries \u2014 they are here so a chain does not stop at the first master who happens to have no shrine in Pakistan. Until now the only way to reach one was to already be walking the chain that names it.',
  graphLineageOnlyTeacherOf: (name: string) => `teacher of ${name}`,
  graphLineageOnlyTeacherOfMore: (name: string, n: number) => `teacher of ${name} and ${n} more`,
  graphLineageOnlyDiscipleOf: (name: string) => `disciple of ${name}`,
  graphLineageOnlyDiscipleOfMore: (name: string, n: number) => `disciple of ${name} and ${n} more`,
  /* The third way a figure can be in this list and have no site here: named as
     somebody's family and never as a link in a chain. Eight of them, and
     without this they were the one population in the roster whose row was a
     bare name — the same gap that left the 17 disciples blank when the note
     assumed everyone here was a teacher. `role` arrives already translated. */
  graphLineageOnlyKinOf: (role: string, name: string) => `${role} of ${name}`,
  graphLineageOnlyKinOfMore: (role: string, name: string, n: number) =>
    `${role} of ${name} and ${n} more`,
  graphCenturyNote:
    'Centuries are read from a figure\u2019s recorded death year, or birth year where no death is given. Nothing is converted from the Hijri calendar.',
  lineageUnreviewed: 'unreviewed',
  lineageUnreviewedHelp:
    'Extracted from this archive\u2019s own sources and quote-checked, but not yet read by an editor.',
  figureBiographyNote:
    'The dates, titles and other names above were read out of the source below rather than entered by hand.',
  figureProvenanceReadFrom: 'Read from',
  figureLineageOnlyNote:
    'The archive holds no entry of its own for this figure. Everything below comes from what other figures\u2019 records say about them.',
  graphExplorerFiguresNote:
    'Grouped by what the record says each figure is. The archive covers six traditions, so not every figure here is a Sufi saint.',
  placesIntro:
    'Where the archive is, counted from the Location each entry records. A site can appear under both a town and its district, because it is in both.',
  placesUnplaced: (n: number) =>
    `${n} site${n === 1 ? '' : 's'} name${n === 1 ? 's' : ''} no place this archive can identify.`,
  aboutStateNote:
    'Every number in this section is counted from the data this page just loaded, so it cannot drift from the archive the way a sentence can. Each one describes what the archive records \u2014 never an estimate of what is out there.',
  aboutKnowsNote:
    'Every entry records the kind of evidence behind it. A field visit and a web compilation are both honest and they are not the same thing, so the archive says which rather than levelling them.',
  /* ── What the graph holds (/about) ─────────────────────────────────── */
  aboutGraphHeading: 'What this archive knows',
  aboutGraphNote:
    'The entries above are the archive\u2019s sites. This is its graph \u2014 the people, silsilas, places and observances behind them, and the links between. Counted at build time from the graph itself.',
  aboutGraphFigures: 'figures with a site here',
  aboutGraphLineageOnly: 'named in a lineage, with no site here',
  aboutGraphOrders: 'Sufi orders',
  aboutGraphPlaces: 'places',
  aboutGraphObservances: 'recorded observances',
  aboutGraphSources: 'distinct sources',
  aboutGraphTitles: 'honorifics and titles',
  aboutGraphLineageLinks: 'recorded teacher\u2013disciple links',
  aboutTrustHeading: 'How well it knows it',
  aboutTrustNote:
    'The same graph, counted by how much of it a person has actually checked. Machine-extracted claims carry the source quote they were read from and are marked unreviewed wherever they appear; none is hidden, and none is presented as settled.',
  aboutTrustBiographies:
    'figures whose dates and titles were read out of prose by a machine, not yet read by an editor',
  aboutTrustLineage: (total: number) =>
    `of ${total} recorded teacher\u2013disciple links are unreviewed`,
  aboutTrustMemberships: (total: number) =>
    `of ${total} recorded silsila affiliations are unreviewed`,
  aboutTrustDisputed: 'figures whose sources give conflicting dates, reported rather than resolved',
  coverageSupportHeading: 'How each entry was established',
  coverageInfoHeading: 'Depth of each entry',
  coverageTraditionHeading: 'Traditions covered',
  coverageSourcesHeading: 'Citations',
  coverageSourcesWithAny: 'with a bibliography',
  coverageSourcesWithThree: 'citing three or more sources',
  coverageSourcesWithNone: 'citing nothing',
  /* ── What the archive rests on (/coverage) ───────────────────────────── */
  coverageRestsHeading: 'What the archive rests on',
  coverageRestsNote:
    'Its citations counted the other way round \u2014 not how many each entry has, but how many entries lean on the same source. Computed from the shipped data on every load, like every other figure here.',
  coverageRestsDistinct: 'distinct sources',
  coverageRestsShared: 'sources cited by more than one entry',
  coverageRestsSingle: 'entries resting on a single source',
  coverageRestsEvery: 'Every source, in full',
  coverageRestsEveryNote: (n: number) =>
    `The other ${n} are each cited by a single entry. Listed rather than summarised: a claim resting on a source nothing else in the archive uses is worth being able to see.`,
  coverageRestsShow: 'Show all',
  coverageRestsHide: 'Hide',
  coverageWorksHeading: 'Counted by book',
  coverageWorksNote:
    'The list below counts citations, which is what an entry actually cites. Counted instead by the work behind them, the archive leans much harder on a few books than any single row can show — one appears under ten different citations.',
  coverageWorksRecords: (n: number) => `across ${n} citation${n === 1 ? '' : 's'}`,
  coverageRestsTop: 'The sources most of it rests on',
  coverageRestsCaveat:
    'A source cited by many entries is not a weakness \u2014 a standard reference should recur. It is worth seeing, because it says where a single error would travel furthest.',
  coveragePhotosHeading: 'Photography',
  coveragePhotosWithNone: 'with no photograph',
  coverageDatesHeading: 'Dates',
  coverageDatesWithYear: 'recording a construction year',
  coverageDatesExact: 'of those the archive itself calls exact',
  coverageDatesHedged: 'whose date carries a written qualification',
  coverageLocationHeading: 'Coordinates',
  coverageLocationApprox: 'whose own text says the pin is approximate',
  coverageObservancesHeading: 'Urs and festivals',
  coverageObservancesWithText: 'recording an observance',
  coverageObservancesWithNone: 'recording none',
  coverageWhyHeading: 'Why publish this',
  coverageWhy:
    'An archive is only as useful as its account of its own limits. A note in a repository goes stale; a page computed from the data cannot. If a figure here looks low, that is the gap, stated plainly rather than smoothed over.',
  reportStatusHeading: 'The state of the sites themselves',
  reportWordsHeading: 'How the words were made',
  reportWordsNote:
    'The archive tracks, per entry, how its article was produced. Honesty about method is the price of asking to be cited.',
  reportWithCitations: 'articles carrying at least one citation',
  reportAiResearched: 'articles that are AI-researched drafts',
  reportPrimarySource: 'articles researched from primary sources (OCR of printed tazkiras)',
  reportUrduHeading: 'The Urdu mirror',
  reportUrduDrafted: 'entries with a full Urdu article',
  reportUrduReviewed: 'of them read and signed off by a human reader',
  reportUrduReviewNote:
    'Machine and hand-drafted translations alike are drafts until a person has read them. The number above is this archive\u2019s most honest one.',
  reportCorrectionsHeading: 'Corrected in public',
  reportCorrectionsNote:
    'Every serious archive gets things wrong. This one writes them down. A selection from the project\u2019s correction ledger:',
  reportLostHeading: 'What was lost',
  unreviewedLabel: 'Unreviewed',
  confidenceLabel: 'confidence',
  reviewedByLabel: 'reviewed by',
  citationsLabel: 'Citations',
  viewSourceLabel: 'View source',
  statusActive: 'Active',
  chronologyUndatedHeading: 'Not on the timeline',
  chronologyUndatedIntro:
    'These places are in the archive and have no bar. Nothing here is estimated: a site the survey did not date stays undated, and a date the survey qualified keeps its qualification.',
  chronologyNoYear: 'no year recorded',
  chronologyUnknownYear: 'recorded as unknown',
  chronologyQualified: 'the recorded date is qualified',
} as const;

/** The shape both team tables must have — `UiStrings`, for the team keys. */
export type TeamStrings = StringTableOf<typeof TEAM_TEXT_EN>;

export type TeamStringKey = keyof TeamStrings;

/** The oblique/possessed form of a kinship role, for "‹possessor› ‹role›"
 * constructions. See `graphLineageOnlyKinOf` below for why this cannot be the
 * same string as the `kinRole*` chip. */
const KIN_GENITIVE: Record<string, string> = {
  بیٹا: 'کے بیٹے',
  بیٹی: 'کی بیٹی',
  بیٹیاں: 'کی بیٹیاں',
  پوتا: 'کے پوتے',
  'پوتا/نواسا': 'کے پوتے/نواسے',
  بھتیجا: 'کے بھتیجے',
  بھانجا: 'کے بھانجے',
  'بھتیجا/بھانجا': 'کے بھتیجے/بھانجے',
  'اولاد میں سے': 'کی اولاد میں سے',
};

function kinGenitive(role: string): string {
  return KIN_GENITIVE[role] ?? `کے ${role}`;
}

export const TEAM_TEXT_UR: TeamStrings = {
  settingsTeamSection: 'پراجیکٹ ٹیم',
  settingsTeamLabel: 'ٹیم کا منظر',
  settingsTeamHelp:
    'عام قاری صاف صفحہ پڑھتا ہے؛ ٹیم ہر وضاحت پڑھتی ہے — تعارف کے صفحے پر ناپا ہوا احتساب، تاریخوں پر درستی کے نوٹ، ماخذ کا خانہ، جائزہ میز۔ یہ سوئچ صرف اُس براؤزر میں نظر آتا ہے جس نے ٹیم کا لنک کھولا ہو۔',
  settingsTeamToggle: 'ٹیم کا منظر دکھائیں',
  turnOffTeamView: 'ٹیم کا منظر آف کریں',
  saintGapsHeading: 'آرکائیو کیا درج نہیں کرتا',
  saintGapsNote:
    'خالی صفحہ چھوڑنے کے بجائے صاف بتا دیا گیا ہے۔ ہر سطر ریکارڈ میں ایک خلا ہے، یہ دعوٰی نہیں کہ ایسی کوئی بات موجود ہی نہیں — اور ہر ایک کو کوئی ماخذ یا میدانی دورہ پُر کر سکتا ہے۔',
  saintGapDates: 'تاریخِ ولادت یا وصال درج نہیں۔',
  saintGapOrder: 'سلسلہ درج نہیں۔',
  saintGapTeachers: 'کوئی مرشد درج نہیں۔',
  saintGapDisciples: 'کوئی مرید یا جانشین درج نہیں۔',
  saintGapObservance: 'کسی قسم کی تقریب درج نہیں۔',
  saintGapPhoto: 'مقام کی کوئی تصویر نہیں۔',
  orderDescriptionEditorial:
    'یہ تعارف اسی ویب سائٹ کے لیے لکھا گیا ہے۔ آرکائیو کا کوئی ماخذ اسے بیان نہیں کرتا — نیچے دیے گئے اقتباسات کے برعکس، جو اندراجات سے لفظ بہ لفظ نقل کیے گئے ہیں۔',
  orderAsRecorded: 'ماخذ میں درج',
  orderAsRecordedHelp:
    'سلسلہ بعینہٖ اُن الفاظ میں جو اِس شخصیت کے اپنے ریکارڈ میں لکھے ہیں، بشمول اُس صورت کے جہاں ریکارڈ خود اپنی نفی کرتا ہے۔ یہ اوپر دیے گئے کسی ایک سلسلے کے بجائے خود شخصیت کو بیان کرتا ہے، اِس لیے ایک ہی بار دکھایا جاتا ہے۔',
  kinNotesHeading: 'ریکارڈ شدہ، مگر بے نام',
  kinNoteUnnamed:
    'آرکائیو اس خاندانی رشتے کو درج کرتا ہے مگر جوڑنے کے لیے دوسری کوئی شخصیت موجود نہیں۔',
  reviewTitle: 'جانچ ڈیسک',
  reviewGateNote: 'یہ صفحہ منصوبے کی ٹیم کے لیے ہے۔ قطار دیکھنے کے لیے ٹیم کا ربط استعمال کریں۔',
  reviewEmpty: 'جانچ کے لیے کچھ باقی نہیں۔',
  reviewLoading: 'قطار لائی جا رہی ہے…',
  reviewClaimDiscipleOf: 'کو اِن کا مرید درج کیا گیا ہے:',
  reviewClaimSuccessorOf: 'کو اِن کا جانشین درج کیا گیا ہے:',
  reviewClaimBelongsToOrder: 'کو اِس سلسلے میں درج کیا گیا ہے:',
  reviewClaimBiography: 'یہ تاریخیں اور القاب متن سے نکالے گئے',
  reviewEvidence: 'ماخذ',
  reviewConfirm: 'تصدیق',
  reviewReject: 'رد',
  reviewUnsure: 'مزید کام درکار',
  reviewNotePlaceholder: 'شہادت کس بات کی تائید کرتی ہے اور کس کی نہیں…',
  reviewProgress: 'درج شدہ فیصلے',
  reviewDownload: 'فیصلے ڈاؤن لوڈ کریں (CSV)',
  reviewDownloadHelp:
    'یہ CSV جانچ ورک شیٹ کے اپنے کالموں میں ہے۔ اِسے ہاتھ سے درآمد کریں — یہ صفحہ شیٹ میں کبھی نہیں لکھتا۔',
  reviewStale:
    'اِس دعوے کی شہادت فیصلہ درج ہونے کے بعد بدل گئی، اِس لیے وہ فیصلہ اب اِس پر لاگو نہیں۔',
  reviewNoQuote:
    'اِس دعوے کے لیے کوئی اقتباس محفوظ نہیں ہوا۔ اِسے ماخذ کے مقابل جانچیں، یا «مزید کام درکار» کا نشان لگائیں۔',
  graphExplorerAllFigures: 'آرکائیو کی شخصیات',
  graphFigureFilterLabel: 'شخصیت تلاش کریں',
  graphFigureFilterPlaceholder: 'نام، لقب یا روایت…',
  graphFigureFilterClear: 'صاف کریں',
  graphFigureFilterCount: (shown: number, total: number) => `${total} میں سے ${shown}`,
  graphFigureFilterEmpty: 'اس سے مطابقت رکھنے والی کوئی شخصیت نہیں۔',
  graphCenturyFilterLabel: 'صدی',
  graphCenturyAll: 'کوئی بھی',
  graphCenturyUndated: 'بلا تاریخ',
  graphCenturyUndatedHelp:
    'وہ شخصیات جنہیں ریکارڈ صرف ہجری تقویم میں رکھتا ہے، یا کسی سن میں نہیں رکھتا۔ ہجری سن کو یہاں صدی میں بدلنا آرکائیو کی طرف سے تاریخ گھڑنا ہوتا، اِس لیے اُنہیں قیاس کے بجائے الگ گروہ میں رکھا گیا ہے — اور یہ آرکائیو کی تقریباً نصف شخصیات ہیں۔',
  graphLineageOnlyHeading: 'سلسلے میں نامزد، یہاں دستاویز نہیں',
  graphLaunchArchiveSub: 'نام، لقب یا صدی سے تلاش کریں',
  graphLaunchLineageSub: 'وہ مرشد اور مرید جن کا نام ماخذ میں آتا ہے',
  graphBookFiguresHeading: 'کتابوں میں مذکور، پاکستان میں کوئی مقام نہیں',
  graphLaunchBookFiguresSub: 'وہ اولیا جن کا ذکر نقل شدہ کتابوں میں ہے، ابھی جانچے نہیں گئے',
  graphBookFiguresNote:
    'وہ اولیا جن کا ذکر آرکائیو کی نقل شدہ کتابوں میں ہے مگر جن کا کوئی مزار یا مقام پاکستان میں نہیں — دہلی، کشمیر، حجاز یا کہیں اور مدفون، یا جن کی تدفین کا مقام کتاب میں درج نہیں۔ ہر سطر کتاب کے نوٹس سے لفظ بہ لفظ لی گئی ہے، اُس نقل سے جسے ابھی کسی نے اصل صفحے سے نہیں ملایا۔ جب تک یہ نہ ہو، یہ صرف ٹیم کے لیے ہیں: یہ اولیاء اور سلسلے کی گنتی، تلاش یا شخصیات کے صفحات میں شامل نہیں۔',
  graphBookFiguresInGraph: 'یہی شخصیت اولیاء اور سلسلے میں',
  graphLineageOnlyNote:
    'وہ اساتذہ اور مشائخ جن کے نام کسی دوسری شخصیت کے درج شدہ سلسلۂ ارادت میں آتے ہیں اور جن کا کوئی مقام اِس آرکائیو میں درج نہیں۔ اُنہیں آرکائیو کے اندراجات میں شمار نہیں کیا جاتا — وہ یہاں اِس لیے ہیں کہ سلسلہ پہلے ہی ایسے مرشد پر نہ رُک جائے جن کا مزار پاکستان میں درج نہیں۔ اب تک اُن تک پہنچنے کا واحد راستہ وہی زنجیر تھی جس میں اُن کا نام آتا ہے۔',
  graphLineageOnlyTeacherOf: (name: string) => `${name} کے اُستاد`,
  graphLineageOnlyTeacherOfMore: (name: string, n: number) => `${name} اور ${n} دیگر کے اُستاد`,
  graphLineageOnlyDiscipleOf: (name: string) => `${name} کے شاگرد`,
  graphLineageOnlyDiscipleOfMore: (name: string, n: number) => `${name} اور ${n} دیگر کے شاگرد`,
  /* Urdu puts the possessor first and the relation after it — "‹name› کے
     والد", not English's "father of ‹name›" — and the relation then has to
     agree with it. That is not a کے/کی coin-flip: a masculine noun ending in
     -ا goes oblique, so «گرو نانک کے بیٹا» is simply wrong and the form is
     «کے بیٹے». The honorific plural is used throughout rather than the
     singular «کا بیٹا», which is both grammatical and the right register for
     figures the archive venerates — and it is the form the project's own
     dictionary already uses («رام اور سیتا کے بیٹے»).

     Kept as a table keyed by the finished role label rather than composed,
     because the chip on a figure's page needs the nominative («بیٹا») and this
     needs the oblique, and one string cannot be both. A role missing from the
     table falls back to کے + the label, which is correct for every invariant
     noun in the set (والد، دادا، چچا، ماموں، سسر، داماد، جدِ امجد). */
  graphLineageOnlyKinOf: (role: string, name: string) => `${name} ${kinGenitive(role)}`,
  graphLineageOnlyKinOfMore: (role: string, name: string, n: number) =>
    `${name} اور ${n} دیگر ${kinGenitive(role)}`,
  graphCenturyNote:
    'صدی شخصیت کے درج شدہ سنِ وفات سے لی گئی ہے، اور جہاں وفات درج نہیں وہاں سنِ پیدائش سے۔ ہجری تقویم سے کوئی تبدیلی نہیں کی گئی۔',
  lineageUnreviewed: 'غیر نظر ثانی شدہ',
  lineageUnreviewedHelp:
    'اِس آرکائیو کے اپنے مآخذ سے نکالا گیا اور اقتباس کی جانچ ہو چکی ہے، مگر ابھی کسی مدیر نے نہیں پڑھا۔',
  figureBiographyNote:
    'اوپر دی گئی تاریخیں، القاب اور دیگر نام ہاتھ سے درج نہیں کیے گئے بلکہ نیچے دیے گئے ماخذ سے نکالے گئے ہیں۔',
  figureProvenanceReadFrom: 'ماخذ',
  figureLineageOnlyNote:
    'اِس شخصیت کا اپنا کوئی اندراج اِس آرکائیو میں نہیں۔ نیچے جو کچھ ہے وہ دوسری شخصیات کے ریکارڈ اُن کے بارے میں جو کہتے ہیں، اُس سے آیا ہے۔',
  graphExplorerFiguresNote:
    'ہر شخصیت کو اُس کے مطابق درجہ بند کیا گیا ہے جو ریکارڈ اُس کے بارے میں کہتا ہے۔ یہ آرکائیو چھ روایات کا احاطہ کرتا ہے، اِس لیے یہاں ہر شخصیت صوفی ولی نہیں۔',
  placesIntro:
    'آرکائیو کہاں ہے — ہر اندراج کے مقام کے خانے سے گنا گیا۔ ایک مزار شہر اور اُس کے ضلع، دونوں کے تحت آ سکتا ہے، کیونکہ وہ دونوں میں ہے۔',
  placesUnplaced: (n: number) => `${n} مزارات کا ایسا مقام درج ہے جسے یہ آرکائیو پہچان نہیں سکتا۔`,
  aboutStateNote:
    'اِس حصے کا ہر عدد اُسی ڈیٹا سے شمار ہوتا ہے جو ابھی اِس صفحے نے پڑھا ہے، اِس لیے یہ آرکائیو سے اُس طرح جدا نہیں ہو سکتا جیسے کوئی جملہ ہو جاتا ہے۔ ہر عدد بتاتا ہے کہ آرکائیو میں کیا درج ہے \u2014 یہ اندازہ نہیں کہ باہر کیا موجود ہے۔',
  aboutKnowsNote:
    'ہر اندراج کے ساتھ درج ہے کہ اُس کے پیچھے کس قسم کی شہادت ہے۔ میدانی دورہ اور ویب سے مرتب کردہ معلومات، دونوں دیانت دار ہیں مگر ایک جیسے نہیں، اِس لیے آرکائیو دونوں کو برابر کیے بغیر بتاتا ہے کہ کون سی ہے۔',
  /* ── یہ آرکائیو کیا جانتا ہے (/about) ─────────────────────────────────── */
  aboutGraphHeading: 'یہ آرکائیو کیا جانتا ہے',
  aboutGraphNote:
    'اوپر کے اندراجات آرکائیو کے مقامات ہیں۔ یہ اُس کا گراف ہے — اُن کے پیچھے کی شخصیات، سلسلے، مقامات اور تقاریب، اور اُن کے باہمی رشتے۔ یہ سب گراف ہی سے شمار کیے جاتے ہیں۔',
  aboutGraphFigures: 'شخصیات جن کا مقام یہاں درج ہے',
  aboutGraphLineageOnly: 'سلسلے میں نامزد، جن کا مقام یہاں درج نہیں',
  aboutGraphOrders: 'صوفی سلسلے',
  aboutGraphPlaces: 'مقامات',
  aboutGraphObservances: 'درج شدہ تقاریب',
  aboutGraphSources: 'الگ الگ مآخذ',
  aboutGraphTitles: 'القاب و خطابات',
  aboutGraphLineageLinks: 'درج شدہ استاد و شاگرد کے رشتے',
  aboutTrustHeading: 'اور کتنے یقین سے جانتا ہے',
  aboutTrustNote:
    'وہی گراف، اِس اعتبار سے گنا گیا کہ اُس کا کتنا حصہ کسی شخص نے واقعی جانچا ہے۔ مشین سے نکالے گئے دعاوی کے ساتھ وہ اقتباس بھی موجود ہے جس سے وہ نکالے گئے، اور جہاں بھی آئیں اُن پر «غیر نظر ثانی شدہ» کا نشان ہوتا ہے؛ اُن میں سے کوئی چھپایا نہیں گیا، اور کوئی طے شدہ بھی نہیں بتایا گیا۔',
  aboutTrustBiographies:
    'شخصیات جن کی تاریخیں اور القاب مشین نے متن سے نکالے، مدیر نے ابھی نہیں پڑھے',
  aboutTrustLineage: (total: number) =>
    `درج شدہ ${total} استاد و شاگرد کے رشتوں میں سے غیر نظر ثانی شدہ`,
  aboutTrustMemberships: (total: number) =>
    `درج شدہ ${total} سلسلہ وابستگیوں میں سے غیر نظر ثانی شدہ`,
  aboutTrustDisputed: 'شخصیات جن کے مآخذ متضاد تاریخیں دیتے ہیں — جو حل کیے بغیر درج کی گئی ہیں',
  coverageSupportHeading: 'ہر اندراج کی بنیاد',
  coverageInfoHeading: 'ہر اندراج کی گہرائی',
  coverageTraditionHeading: 'شامل روایات',
  coverageSourcesHeading: 'حوالے',
  coverageSourcesWithAny: 'کتابیات رکھنے والے',
  coverageSourcesWithThree: 'تین یا زیادہ حوالے دینے والے',
  coverageSourcesWithNone: 'کوئی حوالہ نہ دینے والے',
  coverageRestsHeading: 'یہ آرکائیو کس پر قائم ہے',
  coverageRestsNote:
    'اِس کے حوالے دوسری طرف سے گنے گئے ہیں — یہ نہیں کہ ہر اندراج کے پاس کتنے حوالے ہیں، بلکہ یہ کہ کتنے اندراج ایک ہی ماخذ پر ٹیکے ہوئے ہیں۔ یہاں کے ہر عدد کی طرح یہ بھی ہر بار شائع شدہ ڈیٹا سے شمار ہوتا ہے۔',
  coverageRestsDistinct: 'الگ الگ مآخذ',
  coverageRestsShared: 'مآخذ جو ایک سے زیادہ اندراجات میں درج ہیں',
  coverageRestsSingle: 'اندراجات جو ایک ہی ماخذ پر قائم ہیں',
  coverageRestsEvery: 'تمام مآخذ، مکمل فہرست',
  coverageRestsEveryNote: (n: number) =>
    `باقی ${n} مآخذ میں سے ہر ایک صرف ایک اندراج میں استعمال ہوا ہے۔ اِنہیں گنتی میں سمیٹنے کے بجائے نام بہ نام دیا گیا ہے: جو دعویٰ ایسے مأخذ پر کھڑا ہو جسے آرکائیو میں اور کہیں استعمال نہیں کیا گیا، اُسے دیکھ سکنا اہم ہے۔`,
  coverageRestsShow: 'سب دکھائیں',
  coverageRestsHide: 'چھپائیں',
  coverageWorksHeading: 'کتاب کے اعتبار سے شمار',
  coverageWorksNote:
    'نیچے دی گئی فہرست حوالوں کو گنتی ہے، اور یہی وہ چیز ہے جو کوئی اندراج دراصل نقل کرتا ہے۔ مگر اُن کے پیچھے موجود کتابوں کے اعتبار سے گنیں تو آرکائیو چند کتابوں پر اُس سے کہیں زیادہ انحصار کرتا ہے جو کوئی ایک سطر دکھا سکے — ایک کتاب دس مختلف حوالوں کے تحت آتی ہے۔',
  coverageWorksRecords: (n: number) => `${n} حوالوں میں`,
  coverageRestsTop: 'وہ مآخذ جن پر اِس کا بڑا حصہ قائم ہے',
  coverageRestsCaveat:
    'کسی ماخذ کا کئی اندراجات میں آنا کمزوری نہیں — ایک بنیادی حوالہ بار بار آنا ہی چاہیے۔ دیکھنے کی بات یہ ہے کہ اِس سے پتہ چلتا ہے کہ ایک غلطی کہاں تک پھیل سکتی ہے۔',
  coveragePhotosHeading: 'عکس بندی',
  coveragePhotosWithNone: 'بغیر تصویر والے',
  coverageDatesHeading: 'تاریخیں',
  coverageDatesWithYear: 'سنِ تعمیر درج کرنے والے',
  coverageDatesExact: 'اِن میں سے جنہیں آرکائیو خود متعین کہتا ہے',
  coverageDatesHedged: 'جن کی تاریخ کے ساتھ تحریری تحفظ درج ہے',
  coverageLocationHeading: 'متعین مقام',
  coverageLocationApprox: 'جن کی اپنی تحریر پن کو تخمینی بتاتی ہے',
  coverageObservancesHeading: 'عرس اور میلے',
  coverageObservancesWithText: 'عرس یا میلہ درج کرنے والے',
  coverageObservancesWithNone: 'کوئی عرس درج نہ رکھنے والے',
  coverageWhyHeading: 'یہ کیوں شائع کیا گیا',
  coverageWhy:
    'کوئی آرکائیو اُتنا ہی کارآمد ہے جتنا اپنی حدود کا بیان۔ ریپازٹری میں لکھا نوٹ پرانا ہو جاتا ہے؛ ڈیٹا سے شمار ہونے والا صفحہ نہیں ہو سکتا۔ اگر یہاں کوئی عدد کم لگے تو وہی خلا ہے، صاف صاف بیان کیا گیا۔',
  reportStatusHeading: 'خود مقامات کا حال',
  reportWordsHeading: 'یہ تحریریں کیسے بنیں',
  reportWordsNote:
    'آرکائیو ہر اندراج کے لیے درج رکھتی ہے کہ اُس کا مضمون کیسے تیار ہوا۔ طریقۂ کار کے بارے میں دیانت داری، حوالہ بننے کی قیمت ہے۔',
  reportWithCitations: 'مضامین جن میں کم از کم ایک حوالہ موجود ہے',
  reportAiResearched: 'مضامین جو اے آئی سے تحقیق شدہ مسودے ہیں',
  reportPrimarySource: 'مضامین جو بنیادی مآخذ (چھپے تذکروں کے او سی آر) سے تحقیق ہوئے',
  reportUrduHeading: 'اردو آئینہ',
  reportUrduDrafted: 'اندراجات جن کا مکمل اردو مضمون موجود ہے',
  reportUrduReviewed: 'اِن میں سے جنہیں کسی انسانی قاری نے پڑھ کر منظور کیا',
  reportUrduReviewNote:
    'مشینی ہوں یا ہاتھ کے لکھے، سب تراجم اُس وقت تک مسودے ہیں جب تک کوئی شخص اُنہیں پڑھ نہ لے۔ اوپر کا عدد اِس آرکائیو کا سب سے سچا عدد ہے۔',
  reportCorrectionsHeading: 'برسرِعام درستی',
  reportCorrectionsNote:
    'ہر سنجیدہ آرکائیو سے غلطیاں ہوتی ہیں۔ یہ آرکائیو اُنہیں لکھ رکھتی ہے۔ پروجیکٹ کے درستی نامے سے ایک انتخاب:',
  reportLostHeading: 'جو ضائع ہوا',
  unreviewedLabel: 'غیر جانچا گیا',
  confidenceLabel: 'اعتماد',
  reviewedByLabel: 'جانچا',
  citationsLabel: 'حوالہ جات',
  viewSourceLabel: 'ماخذ دیکھیں',
  statusActive: 'فعال',
  chronologyUndatedHeading: 'لکیر سے باہر',
  chronologyUndatedIntro:
    'یہ مقامات آرکائیو میں موجود ہیں مگر اِن کی کوئی لکیر نہیں۔ یہاں کچھ بھی اندازے سے نہیں: جس مقام کی تاریخ سروے میں درج نہیں وہ غیر مؤرخ ہی رہتا ہے، اور جس تاریخ پر سروے نے شبہ ظاہر کیا وہ اپنے شبہے سمیت درج ہے۔',
  chronologyNoYear: 'سن درج نہیں',
  chronologyUnknownYear: 'نامعلوم درج ہے',
  chronologyQualified: 'درج تاریخ مشروط ہے',
};

/** What `registerTeamStrings()` takes: one table per language. */
export const TEAM_TEXT: Record<Lang, TeamStrings> = { en: TEAM_TEXT_EN, ur: TEAM_TEXT_UR };
