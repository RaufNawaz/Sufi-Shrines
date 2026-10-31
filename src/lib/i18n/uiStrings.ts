import type { Lang } from '../../types/shrine';
/* Type-only, so it is erased: the team table itself reaches a build only through
   the dynamic import in main.tsx, and not at all in the public one. */
import type { TeamStringKey, TeamStrings } from './uiStrings.team';

/**
 * The public English table — what every reader's bundle carries. Strings that
 * only the team view renders live in `uiStrings.team.ts` instead, so a public
 * reader never downloads them; `t()` takes keys from either table.
 */
export const UI_TEXT_EN = {
  /* The archive's own name, renamed 30 August 2026. It called itself "Sufi
     Shrines" on every page while 88 of its 171 sites are not Sufi shrines —
     79 Muslim shrines against 35 Hindu temples, 33 Sikh gurdwaras, 14
     Nanakpanthi/Udasi darbars, 3 Jain temples and 3 secular memorials. A
     reader arriving at a gurdwara was told they were inside a Sufi collection,
     and a shared link to Guru Nanak previewed as "Guru Nanak — Sufi Shrines".
     Only /about named all six.

     The name is the one the project has carried in CLAUDE.md from the start,
     so this is the archive agreeing with itself rather than a rebrand. No slug
     changes and the /Sufi-Shrines/ deploy path is untouched: a URL that is in
     the world stays in the world.

     `UI_TEXT.ur` is deliberately NOT renamed in the same commit — see there. */
  title: 'Mapping the Shrines',
  siteTitle: 'Mapping the Shrines of Pakistan',
  siteMetaDescription:
    'An interactive map of shrines, temples, gurdwaras and darbars across Pakistan. Explore histories, architecture, rituals, and visitor information in English and Urdu.',
  loading: 'Loading data...',
  loadingShrine: 'Loading shrine details...',
  exploreTitle: 'Explore the archive',
  tableButton: 'Search',
  settings: 'Settings',
  directoryModeLabel: 'Search button opens',
  directoryModeSpotlight: 'Spotlight search',
  directoryModeTable: 'Shrine table',
  /* ── Settings page (/settings) ─────────────────────────────────────────
     Every control the archive had lived on the map sidebar, so a reader who
     arrived on a shrine page from a search engine could not reach one. The
     help text under each option is not decoration: `shrines_numerals` decides
     whether a recorded date reads ۱۴۱۶ or 1416, which is an editorial matter
     in a bilingual archive and had no explanation anywhere. */
  settingsIntro:
    'These choices are kept in this browser only. Nothing is sent anywhere, and clearing your browsing data resets them.',
  settingsLanguageSection: 'Language and numerals',
  settingsLanguageLabel: 'Reading language',
  settingsLanguageHelp:
    'The archive reads in English or Urdu. Both are complete: entries, filters, dates and search.',
  settingsNumeralsLabel: 'Numerals',
  settingsNumeralsHelp:
    'Whether numbers appear in Eastern or Western digits. Coordinates stay Western either way, because they get copied into other tools.',
  settingsNumeralsEastern: 'Eastern (۱۲۳)',
  settingsNumeralsWestern: 'Western (123)',
  settingsNumeralsUrduOnly: 'Applies to the Urdu edition.',
  /* The label on the computed date, used when the recorded one leads. Its
     counterpart is `almanacSourceLabel` ("Recorded"), which names the other
     direction — and naming both is the point: a reader must be able to tell
     which of the two dates the archive stands behind. */
  almanacProjectedLabel: 'Projected',
  settingsAppearanceSection: 'Appearance',
  settingsTextSizeLabel: 'Reading size',
  settingsTextSizeHelp:
    'The size of the text in entries and index pages. The map and the navigation keep their own size, which browser zoom already changes.',
  /* The letter at each end of the reading-size slider, small at one end and
     large at the other — the specimen glyph every operating system's type
     control uses. A string and not a literal `A` in the component, because an
     `A` in the Urdu view is a Latin letter in a Nastaliq interface: the no-leak
     guard counts it, and it would be right to. The Urdu edition sets alif. */
  settingsTextSizeScaleMark: 'A',
  settingsTextSizeXsmall: 'Smallest',
  settingsTextSizeSmall: 'Small',
  settingsTextSizeMedium: 'Medium',
  settingsTextSizeLarge: 'Large',
  settingsTextSizeXlarge: 'Largest',
  settingsTextSizeSample: 'The shrine stands where the road bends toward the river.',
  settingsMotionLabel: 'Motion',
  settingsMotionHelp:
    'The archive fades sections in as they arrive and animates the lineage diagrams. If your device already asks for reduced motion, the archive follows it.',
  settingsMotionSystem: 'Follow my device',
  settingsLookLabel: 'Look',
  networkUndated: 'undated',
  graphOpenOrder: 'Open the order',
  lineageShowSource: 'Source',
  lineageTeacherLabel: 'Teacher',
  lineageDisciplesCount: (n: number) => (n === 1 ? '1 disciple' : `${n} disciples`),
  lineageHideSource: 'Hide source',
  lineageFindPlaceholder: 'Find a teacher or disciple',
  lineageNoMatch: 'No teacher or disciple by that name in this scope.',
  lineageMatchesElsewhere: (n: number) =>
    `Not in this order — ${n} ${n === 1 ? 'link' : 'links'} among all recorded lineages. Show ${n === 1 ? 'it' : 'them'}`,
  lineageTeacherPage: 'Open the teacher’s page',
  settingsLookHelp:
    'Modern sets every page in cool greys and one sans-serif typeface, with rounded controls. Classic is the archive’s earlier design: warm whites and serif type. The layout and every word are the same in both.',
  settingsLookModern: 'Modern',
  settingsLookClassic: 'Classic',
  turnOnTeamView: 'Turn on the team view',
  settingsMotionReduced: 'Reduce motion',
  settingsThemeLabel: 'Theme',
  settingsThemeHelp: 'Until you choose here, the archive follows your device.',
  settingsThemeLight: 'Light',
  settingsThemeDark: 'Dark',
  /* ── Saved list, on /settings ─────────────────────────────────────────
     The list is localStorage only — no account, works offline, never leaves
     the device — which is the right design and leaves it one cleared cache
     from gone, and unable to move to a phone. These three controls are the
     durability the design traded away. */
  settingsSavedSection: 'Your saved sites',
  /* The group's own legend, distinct from the section heading above it: the
     section names the subject, the group names what these three controls do to
     it. Reusing the heading printed the same words twice and told the reader
     nothing about the buttons — the same duplication the tours switch had. */
  settingsSavedFileLabel: 'The list as a file',
  settingsSavedHelp:
    'The sites you have starred are kept in this browser and nowhere else. Nothing is uploaded, which also means nothing is backed up — export the list to keep it, or to move it to another device.',
  settingsSavedCount: (n: string) => `${n} saved`,
  settingsSavedEmpty: 'Nothing saved yet. The Save button on a site’s page adds it here.',
  settingsSavedExport: 'Export the list',
  settingsSavedShowMap: 'Show them on the map',
  settingsSavedCopyLink: 'Copy a link to this list',
  settingsSavedImport: 'Import a list',
  settingsSavedClear: 'Clear the list',
  settingsSavedClearConfirm: 'Clear every saved site? This cannot be undone.',
  settingsSavedImported: (n: string) => `${n} added from the file`,
  settingsSavedImportedNone: 'Everything in that file was already saved.',
  settingsSavedImportFailed: 'That file is not a saved-sites export from this archive.',
  settingsSavedMergeNote:
    'An import adds to what is here rather than replacing it, so moving a list between devices never loses the other one. Clear first if you want an exact copy.',
  settingsDistanceSection: 'Distances',
  settingsUnitsLabel: 'Units',
  settingsUnitsHelp:
    'Distances between sites, on shrine pages and along guided tours. The archive records coordinates and computes distances in metric; this converts them for reading.',
  settingsUnitsKm: 'Kilometres',
  settingsUnitsMi: 'Miles',
  settingsDatesSection: 'Dates and observances',
  settingsCalendarLabel: 'Which calendar leads',
  settingsCalendarHelp:
    'An urs recorded in the Hijri calendar has no Gregorian date, only a forecast: the month begins on moon sighting. Both dates are always shown — this chooses which one is printed first.',
  settingsCalendarGregorian: 'Gregorian first',
  settingsCalendarHijri: 'Hijri first',
  settingsCalendarNote:
    'A day the archive recorded as a Gregorian date is left as it is, because no Hijri date was recorded for it and computing one would be inventing a date.',
  settingsMapSection: 'Map and guided tours',
  /* Its own legend rather than reusing `directoryModeLabel` ("Table button
     opens"), which works above two radios in a popover and reads as a
     fragment above a paragraph explaining the same thing. */
  settingsDirectoryLabel: 'Shrine list',
  settingsDirectoryHelp: 'What the Search button on the map opens.',
  settingsToursLabel: 'Guided tours',
  /* The switch says what turning it on does. Repeating the legend beside the
     checkbox told the reader the same words twice and nothing about the
     effect. */
  settingsToursToggle: 'Show tours on the map',
  /* The map popover's way out to the settings *page*. "All" rather than
     "More": the popover holds seven of the nine preferences, so what the page
     adds is the two it deliberately leaves out plus the explanation under each
     control — not a second, deeper tier of options. */
  settingsAllOptions: 'All settings',
  settingsToursHelp:
    'Curated routes through the archive. Off by default — the map’s own subject is the sites themselves.',
  /* ── Entry pages: the two optional sections (14 September 2026) ──────
     Named for what the reader is looking at rather than for the components:
     "entry" is what this archive calls one of its 169 pages, in the citation
     block and in the coverage figures both. */
  settingsEntrySection: 'Entry pages',
  settingsSharedGroundLabel: 'Shared ground',
  settingsSharedGroundHelp:
    'The other sites within walking distance of the entry being read, and how many of them belong to another tradition. Off by default; the archive-wide view at /shared-ground is unaffected either way.',
  settingsSharedGroundToggle: 'Show shared ground on an entry',
  settingsMosquesLabel: 'Auqaf mosques nearby',
  settingsMosquesHelp:
    'What the companion Auqaf mosque survey records around an entry, including its answer on women’s prayer access. Off by default — it is another project’s survey shown beside this archive’s own pages.',
  settingsMosquesToggle: 'Show nearby mosques on an entry',
  /* ── Command palette (⌘K search) ─────────────────────────────────────── */
  paletteTitle: 'Search the archive',
  paletteCancel: 'Cancel',
  paletteOpen: 'Search and filter',
  filtersLabel: 'Filters',
  paletteHintMove: 'to move',
  paletteHintOpen: 'to open',
  paletteReadEntry: 'Read the entry',
  paletteShowOnMap: 'Show on map',
  ariaOpenPalette: 'Search and filter the archive',
  paletteClose: 'Close search',
  /* The archive-wide palette's sites group. Its own key rather than
     `coverageSitesHeading`: "Sites documented" is a coverage claim, and a
     search result group is not making one. */
  searchGroupDays: 'Days',
  searchGroupSites: 'Sites',
  searchPlaceholder: 'Search shrines…',
  noMatches: 'No matches.',
  uncategorized: 'Uncategorized',
  descriptionMore: 'More',
  backToMap: 'Back to map',
  welcomeLegendHeading: 'On the map',
  mapLegendPhoto: 'Larger markers are sites with a photograph.',
  back: 'Back',
  /* ── Tab bar (phone) ─────────────────────────────────────────────────── */
  tabMap: 'Map',
  tabExplore: 'Figures',
  tabAlmanac: 'Calendar',
  tabAtlas: 'Atlas',
  tabSources: 'Sources',
  tabAbout: 'Archive',
  tabBarLabel: 'Archive sections',
  share: 'Share',
  copied: 'Copied',
  openFullMap: 'Open full map',
  viewMapSection: 'View map section',
  copyCoordinates: 'Copy coordinates',
  coordinatesCopied: 'Coordinates copied',
  coordinatesLabel: 'Coordinates',
  imageExpand: 'Open image',
  closeImage: 'Close image',
  photoCredit: 'Photo',
  contents: 'Contents',
  overview: 'Overview',
  descriptionSection: 'Description',
  descriptionUrduLabel: 'Urdu translation',
  details: 'Details',
  locationMap: 'Location Map',
  articleNoSources: 'No sources are cited for this entry yet.',
  locationApproximate:
    'This pin is approximate: the entry records that it is not the site’s exact position. Ask locally before relying on directions.',
  getDirections: 'Get Directions',
  relatedShrines: 'Related Shrines',
  sharedGroundHeading: 'Shared ground',
  sharedGroundIntro: (sites: number, traditions: number) =>
    `${sites} other site${sites === 1 ? '' : 's'} within walking distance, ` +
    `${traditions} of them in another tradition.`,
  sharedGroundIntroSame: (sites: number) =>
    `${sites} other site${sites === 1 ? '' : 's'} within walking distance.`,
  sharedGroundNote:
    'Sites recorded within 800 m of this one. For much of Punjab and Sindh these communities built on the same streets.',
  sharedGroundSamePin: 'same recorded location',
  sharedGroundSamePinHelp:
    'The survey gives no separate position for these, so they share one pin. The distance between them is not recorded.',
  distanceAwayMetres: (value: string) => `${value} m away`,
  shrineFacts: 'Shrine facts',
  /* Four keys rather than a number plus the fragment "km away". Each language
     writes the whole phrase, because the unit does not sit in the same place in
     every language and a component that concatenates the pieces has already
     decided that it does. `formatDistance` picks the key; the reader's units
     preference picks the pair.

     `mi`, not `miles`: the value can be "1", "0.1" or "< 1", and a plural rule
     over a pre-localized string would have to read Eastern digits to decide
     between "mile" and "miles". An abbreviation does not inflect, which is also
     why `km` never had the problem. /settings spells out "Miles" beside the
     option so the abbreviation is introduced before it is used. */
  distanceAwayKm: (value: string) => `${value} km away`,
  distanceAwayMi: (value: string) => `${value} mi away`,
  distanceBareKm: (value: string) => `${value} km`,
  distanceBareMetres: (value: string) => `${value} m`,
  distanceBareMi: (value: string) => `${value} mi`,
  /* "apart", not "away": a shared-ground row names two sites and no vantage
     point, so "222 m away" would be measured from a place the reader is not.
     Three keys rather than a number plus " apart" — see the header of
     formatDistance.ts, and noSentenceFragments.test.ts for what a fragment
     does to a language that puts the unit somewhere else. */
  distanceApartMetres: (value: string) => `${value} m apart`,
  distanceApartKm: (value: string) => `${value} km apart`,
  distanceApartMi: (value: string) => `${value} mi apart`,
  noImage: 'No image found. Add an "Image Link" value in your sheet.',
  imageLoadFailed: 'Image failed to load.',
  notFound: 'Shrine not found.',
  errorLoadingData: 'Failed to load shrine data.',
  offlineDataBanner:
    'You’re offline. This is the archive as last saved on this device; it will update when you reconnect.',
  liveUnreachable:
    'The live archive could not be reached, so this is a saved copy. Recent corrections may not be shown.',
  liveUnreachableSaved: (date: string) =>
    `The live archive could not be reached. This is the copy saved on this device on ${date}.`,
  liveUnreachablePublished: (date: string) =>
    `The live archive could not be reached. This is the copy published with the site on ${date}.`,
  offlineDataBannerDated: (date: string) =>
    `You’re offline. This is the archive as saved on this device on ${date}; it will update when you reconnect.`,
  retry: 'Try Again',
  appErrorMessage: 'Something went wrong. Please reload the page.',
  appErrorReload: 'Reload',
  filterAll: 'All',
  resultCount: (n: number) => `${n} shrine${n === 1 ? '' : 's'}`,
  /* "12 of 169" — the count *and* the denominator, because a bare "12" hides
     how much of the archive a query just excluded. */
  filterNoMatch: 'No sites match these filters',
  paletteResultCount: (shown: number, total: number) =>
    shown === total ? `${total} sites` : `${shown} of ${total} sites`,
  /* The archive-wide search counts more than sites — figures, orders, places
     and traditions are all in its results — so it cannot borrow
     `paletteResultCount`'s noun. Announced, not shown: this is what a screen
     reader is told when a query changes the list. */
  archiveResultCount: (n: number) => `${n} result${n === 1 ? '' : 's'}`,
  /* Appended to the count above when the list is capped. Reporting `shown`
     instead of `matched` would be a different falsehood — the reader would be
     told 40 sites match when 44 do — so both numbers are stated rather than one
     replaced. */
  paletteShowingFirst: (n: number) => `showing first ${n}`,
  tourCount: (n: number) => `${n} tour${n === 1 ? '' : 's'}`,
  /* ── Order pages: what the archive can say about where an order is ────── */
  orderWhereHeading: 'Where this order stands',
  orderWhereNote:
    'Counted from the Location of every site where one of its figures is commemorated.',
  orderSitesHeading: 'Sites of this order',
  /* ── Order pages: the order's own calendar ─────────────────────────────── */
  orderUrsHeading: 'ʿUrs in this order',
  orderUrsNote:
    'Every observance the archive records at a site where one of this order’s figures is commemorated. The date is shown exactly as it was written down; nothing here is projected onto the Gregorian calendar — the Urs Calendar does that, and says how approximate the result is.',
  orderUrsUndatedCount: (n: number) => `${n} with no recorded date`,
  orderUrsNoDate: 'date not recorded',
  orderUrsAnnual: 'annual',
  orderUrsMonthly: 'monthly',
  orderUrsBiannual: 'twice a year',
  /* ── Figure pages: the days kept, and where the figure rests ──────────── */
  saintObservancesHeading: 'Days kept for this figure',
  saintObservancesNote:
    'Every observance the archive records at a site where this figure is commemorated — not only the ones with a date. Dates appear exactly as they were written down.',
  saintPlaceHeading: 'Where these sites are',
  saintPlaceNote:
    'The place comes from the site’s own recorded Location, which is shown beneath it as written — including where it says what the survey did not record.',
  /* ── Figure pages: the entry's own account of the life ─────────────────
     Attributed, always, and as a whole sentence rather than "From" + a link:
     where the phrase's operands sit is a fact about the language. The link's
     text *is* the sentence, so one string per language owns its own word
     order. */
  saintBiographyHeading: 'The life, from the entry',
  saintBiographyNote:
    'Written as part of a site’s entry rather than as a life of this figure, and shown here because it is about them. Each passage keeps the heading the entry gave it and says which entry it came from.',
  saintBiographyFrom: (entry: string) => `From the entry for ${entry}`,
  saintGapBiography: 'No biographical prose beyond the site’s own entry.',
  activeFiltersCount: (n: number) => `${n} filter${n === 1 ? '' : 's'} active`,
  nearMe: 'Near Me',
  mapLocateMe: 'Show my location',
  sortedByDistance: 'Nearest first',
  switchToUrdu: 'اردو',
  switchToEnglish: 'English',
  darkMode: 'Dark mode',
  lightMode: 'Light mode',
  skipToContent: 'Skip to content',
  skipToShrineList: 'Skip to shrine list',
  skipToSearch: 'Skip to search',
  gallery: 'Gallery',
  scrollToTop: 'Scroll to top',
  openInMaps: 'Open in Maps',
  sufiOrder: 'Sufi Order',
  sufiOrders: 'Sufi orders',
  spiritualLineage: 'Spiritual Lineage',
  orderMembers: 'Members of this order',
  orderMemberCount: (n: number) => `${n} saint${n === 1 ? '' : 's'}`,
  orderBranchCount: (n: number) => `${n} branch${n === 1 ? '' : 'es'}`,
  orderBranchesLabel: 'Branches',
  orderMembersLabel: 'Members',
  orderAlsoIn: 'Also in',
  orderMultiCount: (n: number) => `${n} figure${n === 1 ? '' : 's'} in more than one silsila`,
  orderMultiHelp:
    'A figure can hold allegiance in several silsilas at once. Each affiliation here is a separate edge with its own quoted source, not an inference from the others.',
  orderBranchHelp:
    'A branch (\u0634\u0627\u062e) is a sub-line within a silsila. The same branch name can belong to two different orders, so a branch is only meaningful together with its parent.',
  orderSpan: (from: string, to: string) => `${from}\u2013${to} c.`,
  orderSpanOne: (century: string) => `${century} c.`,
  orderUndated: (n: number) => `${n} undated`,
  orderUndatedHelp:
    'Figures the record places in the Hijri calendar only, or in no year at all. The span is not computed for them \u2014 converting a Hijri year here would be this archive inventing a date.',
  /* ── Order pages: the members on a century axis ────────────────────────
     Every string here has to hold one line: a mark on an axis is a claim, and
     the archive cannot place everyone. The heading names people rather than
     the drawing ("When these figures lived", not "Timeline") because what the
     reader is looking at is lives, and the note says where the numbers behind
     the bars come from and where the dates themselves are. */
  orderTimelineHeading: 'When these figures lived',
  orderTimelineNote:
    'Each bar runs from the year the record gives for a birth to the year it gives for a death; each dot is a figure the record dates once. Positions are read off those years only \u2014 nothing here is converted from the Hijri calendar, and the dates themselves, with the hedges the sources wrote, are in the list below.',
  orderTimelinePointHelp:
    'The record gives one year for this figure. The mark is that year, not a lifespan \u2014 drawing a bar would mean inventing the other end.',
  orderTimelineUnplacedLabel: 'Not on the axis',
  orderTimelineContradictoryHelp:
    'The two years recorded for this figure cannot both be true \u2014 the birth comes after the death. The archive shows neither on the axis rather than choosing one or quietly reversing them.',
  graphTraditionsHeading: 'The other traditions',
  graphTraditionsNote:
    'The silsilas above are the Sufi half of the archive. These are the other traditions its sites belong to, each with its own page.',
  orderCompareHeading: 'The silsilas at a glance',
  orderCompareNote:
    'Every figure, century span and place below is counted from the graph on load, so this table cannot go stale the way a sentence can. Each row is what the archive holds, not what the order is.',
  orderCompareFigures: 'Figures',
  orderCompareFigureOne: 'Figure',
  orderCompareSpan: 'Century span',
  orderCompareSites: 'Sites',
  /* ── What the archive says about an order (OrderPage) ────────────────────
     Four of the nine orders had no summary at all and the other five had one
     written for this site. The corpus meanwhile carried whole authored sections
     on the same orders. These strings frame the difference honestly rather than
     letting an unsourced sentence pass as the archive's own. */
  orderProseHeading: 'What the archive says',
  orderProseNote:
    'Passages from this archive’s own entries, quoted exactly and linked to the entry each was read from. Where two entries word the same thing differently, both are kept.',
  orderProseFrom: 'From the entry for',
  teachersHeading: 'Teachers',
  disciplesHeading: 'Disciples & successors',
  lineageChainHeading: 'Chain of transmission',
  lineageChainNote:
    'Followed one master at a time, as far as the record goes without guessing. Nearest first.',
  lineageChainRoot: 'The record names no teacher beyond this point.',
  lineageChainForks: (n: number) =>
    `The record names ${n} teachers here, so the chain does not continue as a single line.`,
  lineageChainCycle: 'The record turns back on itself here.',
  lineageChainRemove: (n: number) => `${n} removed`,
  discipleOfLabel: 'Disciple',
  successorOfLabel: 'Successor',
  /* ── Family (SaintPage) ──────────────────────────────────────────────────
     One stored edge is read from both figures' pages, so every tie carries two
     labels rather than one predicate: "grandson of" is unreadable on the
     grandfather's page. And the vocabulary is closed because **Urdu splits what
     English does not** — دادا is a father's father and نانا a mother's, چچا a
     father's brother and ماموں a mother's — so a single translated "grandfather"
     would assert a line most of these entries never state. English keeps the
     plain term throughout, because English has no ambiguity to resolve here and
     the source's own sentence is shown directly beneath the row; the Urdu is
     specific where the entry says which side and keeps both readings where it
     does not. */
  kinHeading: 'Family recorded',
  kinNote:
    'Blood and marriage as this archive’s own entries state them, with the sentence each was read from. In this corpus a seat passes down a family at least as often as down a chain of initiation.',
  kinRoleFather: 'father',
  kinRoleMother: 'mother',
  kinRoleSon: 'son',
  kinRoleDaughter: 'daughter',
  kinRoleDaughters: 'daughters',
  kinRoleGrandfatherPaternal: 'grandfather',
  kinRoleGrandfatherUnspecified: 'grandfather',
  kinRoleGrandsonPaternal: 'grandson',
  kinRoleGrandsonUnspecified: 'grandson',
  kinRoleUnclePaternal: 'uncle',
  kinRoleUncleMaternal: 'uncle',
  kinRoleUncleUnspecified: 'uncle',
  kinRoleNephewPaternal: 'nephew',
  kinRoleNephewMaternal: 'nephew',
  kinRoleNephewUnspecified: 'nephew',
  kinRoleFatherInLaw: 'father-in-law',
  kinRoleSonInLaw: 'son-in-law',
  kinRoleAncestor: 'ancestor',
  kinRoleDescendant: 'descendant',
  kinRoleBrother: 'brother',
  kinRoleSister: 'sister',
  kinRoleWife: 'wife',
  kinRoleHusband: 'husband',
  kinGenerationDisputed: 'sources differ on the generation',
  kinGenerationDisputedHelp:
    'The sources agree on the descent and disagree on how many generations it runs. Both counts are kept rather than one chosen.',
  kinContested: 'one of two traditions',
  kinContestedHelp:
    'The entry reports this parentage as one of two competing traditions about the same figure, not as settled.',
  /* ── Descent in a lineage (SaintPage) ────────────────────────────────
     The relation the archive stated twice and could hold neither time: a
     figure standing N removes down a spiritual line. Deliberately worded to
     exclude BOTH readings it is not — "not a direct succession" rules out
     successor_of, "not blood" rules out kin_of's descendant_of — because the
     whole reason the type exists is that either would have been a false
     claim. */
  descentHeading: 'Descent in a lineage',
  descentNote:
    'Recorded as standing some way down a spiritual line — not a direct succession, and not blood.',
  descentAncestor: 'earlier in the lineage',
  descentDescendant: 'later in the lineage',
  descentRemoves: 'generations removed',
  shrinesAssociated: 'Associated shrines',
  alsoKnownAs: 'Also known as',
  born: 'Born',
  died: 'Died',
  era: 'Era',
  floruitLabel: 'Active',
  floruitHelp:
    'The period a figure is recorded as active, where the sources give neither a birth nor a death year.',
  arabicName: 'Arabic name',
  founded: 'Founded',
  notFoundSaint: 'Saint not found.',
  /* ── Review desk (/review, team-gated) ───────────────────────────────── */
  reviewIntro:
    'The claims this archive has extracted and no person has read yet, with the evidence each was read from. A verdict here is a judgement about a claim \u2014 nothing on this page edits the archive.',
  reviewClear: 'Clear my verdicts',
  notFoundOrder: 'Order not found.',
  aboutThisSaint: 'About this saint',
  viewOrder: 'View spiritual order',
  networkConnections: 'Network connections',
  description: 'Description',
  graphExplorerTitle: 'Saints & Orders Explorer',
  /* "and saints" was "and Sufi saints" by implication and the page says so
     itself, eleven lines down: `graphExplorerFiguresNote` reads "not every
     figure here is a Sufi saint." Measured on the running page, 30 August 2026,
     from its own grouping: **70 of 134 figures are Sufi saints**. The other 64
     are 20 deities, 16 sants, 15 historical figures, 5 Sikh Gurus, 5 recorded
     differently and 3 communities. One part of the page already knew what the
     other denied — the third time in two days that shape has turned up here.

     "Sufi orders" stays: all nine orders the page lists are Sufi silsilas, and
     narrowing that would be a different error. Only the figures were overclaimed.

     The page's *title* is still "Saints & Orders Explorer", which excludes a
     deity the same way. Left alone deliberately — it is a name rather than a
     claim, it reaches the document title, breadcrumb, welcome card and a
     hand-synced copy in `scripts/prerender.mjs`, and renaming a page a reader
     may have linked is the same kind of decision as renaming the archive was. */
  graphExplorerIntro:
    'Browse the Sufi orders and the figures behind these shrines, and how they connect to one another.',
  graphExplorerOrders: 'Sufi orders',
  sheetDone: 'Done',
  titlesLabel: 'Titles and honorifics',
  disputedDatesLabel: 'Sources disagree',
  disputedVersus: 'vs',
  yearsApart: 'years apart',
  /* ── Figure provenance (SaintPage) ───────────────────────────────────── */
  figureLineageOnly: 'named in a lineage, no entry here',
  figureLineageOnlyHelp:
    'This figure has no site in the archive, so they are not counted among its entries. They are in the graph because another figure\u2019s recorded lineage names them \u2014 without that, a chain of transmission would stop at the first master who happens not to have a shrine here.',
  graphLineageNote: 'Recorded teacher\u2013disciple links:',
  graphLineageHeading: 'Teacher-disciple relationships',
  graphLineageScopeOrder: (order: string, n: number) => `In the ${order} (${n})`,
  graphLineageScopeAll: (n: number) => `All recorded links (${n})`,
  graphLineageScopeLabel: 'Which links to show',
  graphLineageUnaffiliated: (n: number, total: number) =>
    `Of all ${total} recorded links, ${n} belong to no order this archive records — a Sikh or Hindu lineage is a line of teaching, not a silsila, and some Sufi teachers named in a chain have no order recorded here.`,

  // ── Urs Almanac (DESIGN_VISION.md F1) ──────────────────────────────────
  welcomeExploreMore: 'Elsewhere in the archive',
  /* One line under each destination in the welcome card's list (9 October
     2026): what is there, not what it is called. */
  welcomeDestAlmanac: 'When the shrines gather',
  welcomeDestGraph: 'Lineages, orders and the figures behind the shrines',
  welcomeDestTypology: 'Every site by the form it takes',
  welcomeDestChronology: 'Every dated place, century by century',
  welcomeDestSharedGround: 'Sites that stand beside another tradition',
  welcomeDestSources: 'Every book and record it cites',
  welcomeDestAbout: 'Method, coverage and how to cite',
  /* Shown on the two entries with no Urdu article, above the English one they
     fall back to. Says the thing rather than letting the reader discover it. */
  articleUrduMissing:
    'The Urdu text of this entry has not been written yet. The article below is the English one, shown as recorded rather than withheld.',
  almanacTitle: 'Urs Calendar',
  almanacIntro:
    'When the shrines gather. An ʿurs is the death anniversary of a saint, kept as a festival of union — and for most of these places it is the one day of the year the whole community returns.',
  almanacHonestyHeading: 'What this calendar can and cannot tell you',
  almanacApproximateNote:
    'Dates in the Hijri calendar are shown with their approximate Gregorian equivalent. The ʿurs begins on the local moon sighting, so the actual day can fall one or two days either side. Confirm with the shrine before travelling.',
  /* ── Almanac facets ────────────────────────────────────────────────────
     The filter narrows the *sites* the almanac is built from, so the calendar,
     the listings and the coverage counts all describe the same selection and
     cannot disagree. `filterAll`, `clearFilters` and `ariaFilterByCategory` are
     the map's, reused deliberately: two surfaces that filter by tradition
     should not word it two ways. */
  filterByPlace: 'Place',
  ariaFilterByPlace: 'Filter by place',
  almanacMorePlaces: (n: number) => `${n} more`,
  almanacFewerPlaces: 'Fewer',
  almanacFilterEmpty: 'No site in the archive matches these filters.',
  almanacFilterUndated: (n: number) =>
    n === 1
      ? 'The 1 site these filters match has no observance recorded to a day, so nothing can be placed on the calendar. What is recorded is listed below.'
      : `None of the ${n} sites these filters match has an observance recorded to a day, so nothing can be placed on the calendar. What is recorded is listed below.`,
  almanacUpcoming: 'Coming up',
  almanacNext12Months: 'The next twelve months',
  almanacApproximate: 'approximate',
  almanacApproximateFull: 'Approximate — set by moon sighting',
  almanacExactDate: 'Fixed calendar date',
  almanacHijriLabel: 'Hijri',
  almanacSeasonalHeading: 'Recorded by season only',
  almanacSeasonalNote:
    'The archive records a season for these observances but not a month, so they cannot be placed on the calendar.',
  almanacUndatedHeading: 'Observed, but the date is not recorded',
  almanacUndatedNote:
    'These shrines hold an ʿurs or annual observance. Nobody has written down when. This is the largest gap in the calendar, and it is the easiest one to help close.',
  almanacNoObservanceHeading: 'No observance recorded',
  almanacCoverageHeading: 'Coverage',
  almanacCoverageDayPrecision: 'with a day and month',
  almanacCoverageMonthPrecision: 'with a month only',
  almanacCoverageSeasonal: 'with a season only',
  almanacCoverageUndated: 'observed, date unrecorded',
  almanacCoverageNone: 'no observance recorded',
  /* One sentence, not "of" + "sites" assembled around two numbers. Urdu's
     postposition takes its operands in the opposite order, so the fragments
     reassembled into a claim about the wrong numbers — see the ur entry. */
  almanacCoverageTotal: (dated: number, total: number) =>
    `${dated} of ${total} sites can be placed on the calendar`,
  /* ── Place pages: who is commemorated here, and when ───────────────────
     Both sections are joins over data the graph already held and no page
     rendered. The notes say where the join comes from, because a reader who
     sees a figure listed under "Lahore" is owed the reason the archive puts
     them there — it is the site's own recorded Location, not a claim about
     where anyone lived or died. */
  placeFiguresHeading: 'Figures commemorated here',
  placeFiguresNote:
    'Each figure is here because a site in this place is recorded as commemorating them. Where the same figure is kept at more than one site, they are named once and the sites are listed beside them.',
  placeObservancesHeading: 'Days observed here',
  placeObservancesNote:
    'Every observance the archive records at a site in this place — not only the ones with a date. Dates appear exactly as they were written down; nothing here is projected onto the Gregorian calendar.',
  /* ── Places (Track B) ─────────────────────────────────────────────────── */
  placesTitle: 'Places',
  placeKicker: 'Place',
  provinceKicker: 'Province',
  /* The place article's two lengths (Rauf, 30 October 2026): "an article that is
     short and complete but then switch to the longer one if you want or toggle
     which sections you need more information for". */
  placeArticleLengthLabel: 'How much to read',
  placeArticleShort: 'Short article',
  placeArticleFull: 'Full account',
  placeArticleShortNote:
    'This is the short article. Open any section for its full account, or switch to the full account above.',
  placeSectionMore: 'More on this',
  placeSectionLess: 'Show less',
  placeIntro:
    'What the archive records in one place — which sites, which traditions, and the span of the dates it can read.',
  placeSitesHeading: 'Sites recorded here',
  placeTraditionsHeading: 'Traditions',
  placeSpanHeading: 'Dates recorded',
  placeSpanNone: 'No site here records a date this archive can read.',
  placeNotFound: 'No place by that name is recorded.',
  placeSiteCount: (n: number) => `${n} site${n === 1 ? '' : 's'}`,
  placeSpan: (from: number, to: number) => `${from}–${to}`,
  /* ── Accessible names ─────────────────────────────────────────────────
     Every one of these was a hardcoded English literal, so the Urdu site's
     entire accessible layer — landmark names, button labels, the reading
     progress bar, the filter groups — was announced in English to an Urdu
     screen-reader user. The no-English-leak e2e guard could not see any of
     it: it reads visible text under [dir='rtl'], and an accessible name is
     not visible text. See docs/HANDOVER.md §9.51. */
  ariaBreadcrumb: 'Breadcrumb',
  ariaShrineBrowser: 'Shrine browser',
  /* The mobile bottom sheet's drag handle. Was a hardcoded English literal in
     MapSidebar.tsx — invisible to the Urdu accessible-name sweep, which runs
     at a desktop viewport where this control does not exist. */
  ariaExpandSheet: 'Expand the shrine browser',
  ariaCollapseSheet: 'Collapse the shrine browser',
  ariaShrineList: 'Shrine list',
  ariaFiltersActive: 'filters active',
  ariaClearSearch: 'Clear search',
  ariaFilterByCategory: 'Filter by category',
  ariaFilterByRegion: 'Filter by region',
  ariaFilterByProvenance: 'Filter by provenance',
  ariaReadingProgress: 'Reading progress',
  ariaPreviousImage: 'Previous image',
  ariaNextImage: 'Next image',
  ariaInteractiveMap: 'Interactive shrine map',
  ariaOpenSidebar: 'Open sidebar',
  /* The service-worker update toast. Its two visible strings were English
     literals, and no guard could see them: the toast only appears after a
     controllerchange event, and the e2e config blocks service workers to
     keep the CSV intercept hermetic. */
  swUpdateAvailable: 'A new version is available',
  offlineReady: 'Ready to use offline',
  settingsInstallSection: 'Offline',
  settingsInstallLabel: 'Install the archive',
  settingsInstallHelp:
    'Installed, the archive opens like an app and works without a connection — at a shrine with no signal, for instance.',
  settingsInstallButton: 'Install',
  settingsInstallIos: 'In Safari, tap Share, then “Add to Home Screen”.',
  settingsInstallDone: 'Installed. The archive works offline on this device.',
  /* Leaflet writes its own control titles ("Zoom in", "Layers") and sets
     aria-label from them, so they have to be passed in rather than styled
     away. The reset-view control is ours. */
  mapZoomIn: 'Zoom in',
  mapZoomOut: 'Zoom out',
  mapLayers: 'Basemap layers',
  mapResetView: 'Reset view',
  mapResetViewLabel: 'Reset the map to its default view',
  /* Basemap picker entries. Only the *descriptor* is translated; the provider
     (CARTO, Esri, MapTiler) stays as written, on the same footing as a
     bibliography entry — it is the name of a thing, and a reader chasing an
     attribution needs the exact string. tFn keeps the two in whichever order
     the language wants. */
  mapLayerStreetsEnglish: 'Streets, English labels',
  mapLayerVoyager: 'Voyager',
  mapLayerDark: 'Dark',
  mapLayerLight: 'Light',
  mapLayerStreets: 'Streets',
  mapLayerSatellite: 'Satellite',
  mapLayerTopo: 'Topographic',
  mapLayerFrom: (name: string, provider: string) => `${name} (${provider})`,
  ariaCategoryOf: (category: string) => `Category: ${category}`,
  ariaMapShowing: (name: string) => `Map showing the location of ${name}`,
  ariaExternalMapShowing: (name: string) => `Google Maps showing the location of ${name}`,
  galleryImageLabel: (index: number, action: string) => `Image ${index}: ${action}`,
  almanacSourceLabel: 'Recorded as',
  almanacFigureLabel: 'Commemorating',
  almanacJumpToMonth: 'Jump to month',
  aboutTitle: 'About this archive',
  aboutLede:
    'A public, bilingual record of sacred sites across Pakistan — Muslim shrines, Hindu temples, Sikh gurdwaras, Nanakpanthi and Udasi darbars, Jain temples and secular memorials — built to be cited, and to be honest about what it does not yet know.',
  /* Two names, no institution, no address — the whole of the public credit
     (project head, 11 September 2026). */
  aboutCredit: 'By Adil Ahsan and Rauf Nawaz',
  aboutStateHeading: 'What this archive holds',
  aboutStateSites: 'sites',
  aboutStateSources: 'cited sources',
  aboutStatePhotos: 'photographs',
  aboutStateTraditions: 'traditions',
  aboutKnowsHeading: 'How it knows what it says',
  aboutThinHeading: 'Where it is thin',
  aboutThinNote:
    'The gaps, as counts. An archive is only as useful as its account of its own limits.',
  aboutScopeHeading: 'Scope',
  aboutScopeBody:
    'Each entry records what a source says, with that source named. Entries are labelled by how they were established, from field-verified to web-compiled, so a reader can weigh them without leaving the page.',
  aboutMethodHeading: 'How it is built',
  aboutMethodSheet:
    'Entries are maintained in a spreadsheet and read by this site at load time, so a correction reaches readers immediately.',
  aboutMethodProvenance:
    'Every claim is meant to be traceable to a source. Where sources disagree, the archive reports the disagreement rather than choosing for you.',
  aboutMethodUrdu:
    'The Urdu edition is a first-class edition, not a translation layer. Machine-drafted translations are marked as drafts until a fluent reader signs them off.',
  aboutMethodGaps: 'What the archive does not know is published alongside what it does.',
  aboutLicenceHeading: 'Licence and reuse',
  aboutLicenceData: 'Dataset',
  aboutLicenceCode: 'Site and pipeline code',
  aboutLicenceTypeface: 'Urdu typeface',
  aboutLicenceAttributionLabel: 'Required attribution when reusing the data',
  aboutCiteHeading: 'How to cite',
  aboutCiteArchive: 'The archive',
  aboutCiteEntry: 'A single entry',
  aboutCiteNote:
    'Include the date you consulted the page. This archive reads a live source, so an entry can change after you cite it.',
  aboutCorrectionsHeading: 'Corrections',
  aboutCorrectionsBody:
    'Corrections are welcome and credited. If something here is wrong — a date, a coordinate, a lineage, a name — please say so.',
  aboutCopyDone: 'Copied',
  aboutCopy: 'Copy',
  coverageIntro:
    'Every figure on this page is counted from the published data, not estimated. Where the archive is silent, it says so.',
  coverageEntriesNoun: (n: number) => (n === 1 ? 'entry' : 'entries'),
  coverageSourcesItems: 'citations in total',
  /* ── The source index, made addressable ────────────────────────────────
     A5. The point of an anchor is that a shrine page can send a reader to
     "everything this archive cites this source for", so the index has to hold
     every source rather than only the shared ones — and the entries have to be
     named, not counted. */
  /* On a shrine page, beside a bibliography line. Only where the answer is more
     than "this entry", so 436 of the 533 citations stay unadorned. */
  sourceAlsoCitedBy: (n: number) =>
    n === 1 ? 'also cited by 1 other entry' : `also cited by ${n} other entries`,
  /* ── The same citations, counted by book ───────────────────────────────
     The list below counts *citation strings*, and that is the right unit for
     "what does this entry cite" — the string is the reader's search string, and
     two entries citing different pages of one book have cited different things.
     It is the wrong unit for "what does this archive lean on", because one book
     appears as many sources. Both questions are real and the copy has to say so
     rather than present either as a correction of the other. */
  coverageRestsEntryCount: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
  coverageRestsTail: (n: number) =>
    `${n} further sources are each cited by a single entry, and are not listed.`,
  coveragePhotosItems: 'photographs in total',
  coverageUnrecorded: 'not recorded',
  saintNextUrs: 'Next ʿurs',
  saintNextUrsLink: 'See the calendar',
  almanacNothingUpcoming: 'No dated observance falls in the next twelve months.',
  almanacSeasonSpring: 'Spring',
  almanacSeasonSummer: 'Summer',
  almanacSeasonAutumn: 'Autumn',
  almanacSeasonWinter: 'Winter',
  almanacContribute:
    'Know one of these dates? Corrections and additions are welcome — every date here came from someone who knew it.',
  almanacDownloadIcs: 'Add to calendar (.ics)',
  almanacDownloadIcsHint:
    'Downloads the dated observances. Hijri-based entries carry their approximation in the event notes.',
  almanacIcsFixedDate: 'A fixed date in the Gregorian calendar, as recorded.',
  almanacIcsLeftOut: (n: number) =>
    n === 1
      ? '1 observance recorded only to the month, or by a rule, is left out of the calendar file: a calendar needs a day.'
      : `${n} observances recorded only to the month, or by a rule, are left out of the calendar file: a calendar needs a day.`,
  almanacRule: 'recurrence recorded, not a fixed date',
  almanacMonthOnly: 'month recorded, day not recorded',
  /* ── The calendar view ─────────────────────────────────────────────────── */
  almanacViewList: 'List',
  almanacViewCalendar: 'Month',
  ariaAlmanacView: 'How to show the next twelve months',
  almanacCalendarNote:
    'A square is a day, so only an observance the archive recorded with a day appears on one. Those recorded to a month alone are listed under the grid, unplaced — putting one on the 1st or the 15th would be this archive inventing a date.',
  almanacCalendarCaption: 'observances with a recorded day',
  almanacCalendarPrev: 'Previous month',
  almanacCalendarNext: 'Next month',
  almanacToday: 'Today',
  /* The bars a cell cannot show, folded into one control that opens the
     day's full list. */
  almanacCalendarMore: (n: number) => `+${n} more`,
  almanacCalendarClose: 'Close',
  /* Printed once under the grid in the public view, where the per-date
     "approximate" pill is withheld (11 September 2026). The dashed bar is
     its key. */
  almanacProjectedCaveat:
    'A hollow dot marks a date projected from the Hijri calendar. An ʿurs begins on the local moon sighting, so the day can fall one or two days either side of what is shown.',
  almanacShowList: (n: number) => `Show all ${n}`,
  almanacCalendarPlaced: (n: number) =>
    n === 1
      ? '1 observance falls on a recorded day this month'
      : `${n} observances fall on a recorded day this month`,
  almanacCalendarDayCount: (n: number) => (n === 1 ? '1 observance' : `${n} observances`),
  almanacCalendarShowMonth: 'Show the whole month',
  almanacCalendarNoDays: 'No observance falls on a recorded day this month.',
  almanacCalendarDayEmpty: 'No observance is recorded on this day.',
  almanacFilterByName: 'Filter by name',
  almanacCalendarUnplacedHeading: 'This month, day not recorded',
  almanacCalendarUnplacedNote:
    'The archive records the month for these and no day, so they sit beside the grid rather than on it. A Hijri month straddles two Gregorian ones, which is why one can appear under both.',
  tourTotalDistance: 'Distance in a straight line',
  tourNextStopDistance: 'in a straight line to the next stop,',
  tourNextStopDirections: 'Directions to it',
  tourPreviewTitle: 'Tour overview',
  tourStartButton: 'Start tour',
  tourBackButton: 'Back',
  hoursAbbrev: 'h',
  minutesAbbrev: 'm',
  resumeTourPrompt: 'Continue where you left off',
  resumeButton: 'Resume',
  dismiss: 'Dismiss',
  closeSitePreview: 'Close this site',
  tourCompletedBadge: 'Completed',
  tourInProgressBadge: 'In progress',
  audioPlay: 'Play narration',
  audioPause: 'Pause narration',
  audioStop: 'Stop narration',
  audioStatusPlaying: 'Playing',
  audioStatusPaused: 'Paused',
  autoplayLabel: 'Autoplay',
  autoplayPause: 'Pause autoplay',
  autoplayResume: 'Resume autoplay',
  locationUnavailable: 'Location unavailable',
  nearestToYou: 'Nearest to you',
  tourNearestStop: (stop: string, name: string, distance: string) =>
    `Stop ${stop}, ${name}, is ${distance} from you`,
  tourStartAtStop: (stop: string) => `Start at stop ${stop}`,
  relatedToursHeading: 'You might also like',
  partOfTour: 'Part of the guided tour',
  viewTour: 'View tour',
  printItinerary: 'Print itinerary',
  filterByTradition: 'Tradition',
  filterByRegion: 'Region',
  filterByTheme: 'Theme',
  filterByEra: 'Era',
  categoryLabel: 'Category',
  locationLabel: 'Location',
  /* Labels the Sufi Saint field in the infobox (fieldLabels.ts) — no longer a
     filter: the saint chip list was removed from the sidebar 26 August 2026. */
  saintLabel: 'Saint',
  districtLabel: 'District',
  provinceLabel: 'Province',
  cityLabel: 'City',
  eventsLabel: 'Events',
  nameLabel: 'Name',
  latitudeLabel: 'Latitude',
  longitudeLabel: 'Longitude',
  imageLabel: 'Image',
  /* Renamed with `siteTitle`, and the last site the rename missed — found on
     30 August 2026, on every page of the archive. The rename swept the title,
     the meta description and the manifest, and stopped at the strings a reader
     *arrives* by; the footer is the string a reader *leaves* by, and it sat
     under all 800 prerendered pages still saying the old name. A rename is a
     sweep, not an edit — `uiStringsName.test.ts` now holds the sweep open. */
  footerCredit: 'Mapping the Shrines of Pakistan',
  citeTitle: 'Cite this entry',
  citeTextLabel: 'Text',
  citeCopy: 'Copy',
  citeArchive: 'digital archive',
  citeRetrieved: 'Retrieved',
  citeSupportLevel: 'Support level',
  obsHeading: 'Urs & observances',
  obsViewAlmanac: 'See it in the Urs Calendar',
  obsNextLabel: 'Next',
  paletteSearchArchive: (q: string) => `Search figures, places and sources for “${q}”`,
  obsProjectedCaveat:
    'Projected from the Hijri calendar. An ʿurs begins on the local moon sighting, so the day can fall one or two days either side.',
  fieldSiteType: 'Built form',
  locationNotRecorded: 'Location not recorded — this entry is not on the map yet.',
  srcNotesHeading: 'Where the source contradicts itself',
  srcNotesIntro:
    'The archive reports its source as recorded, contradictions included. Nothing below is resolved or omitted — each item is the survey\u2019s own statement, attributed.',
  mosquesHeading: 'Auqaf mosques nearby',
  mosquesSource: 'From the Auqaf mosque survey — women’s prayer access as the survey records it.',
  mosquesWomens: 'Women’s prayer section',
  mosquesYes: 'Yes',
  mosquesNo: 'No',
  mosquesOwn: 'recorded as this shrine’s mosque',
  mosquesNotRecorded: 'not recorded',
  fieldSilsila: 'Silsila (order)',
  /* ── /sources and /source/:slug — the archive's library ── */
  sourcesTitle: 'Sources',
  sourcesIntro:
    'Every book, article, record and report this archive cites, in one place. Open any of them to see which entries rest on it, where those places are, what is read beside it, and where to look for a copy.',
  sourcesStatShelf: 'works on the shelf',
  sourcesStatRead: 'books read in full',
  sourcesStatLines: 'distinct sources',
  sourcesStatCitations: 'citations',
  sourcesShelfHeading: 'The shelf',
  sourcesShelfNote:
    'The works the archive cites most, however many ways each is written down. A spine’s thickness grows with the square root of the entries resting on it — the number at its foot — and the thinnest are kept wide enough to tap.',
  sourcesReadingHeading: 'Read in full for the archive',
  sourcesReadingNote:
    'Books the project has read cover to cover, in Urdu, Persian and English. What they say is checked before it enters an entry, so most are not cited yet; each one lists its entries here as soon as one cites it.',
  sourcesReadingCited: 'Cited',
  sourcesReadingInReview: 'Read · not yet cited',
  sourcesKindsHeading: 'What kind of sources',
  sourcesKindsNote:
    'Sorted by the form of each citation, not by checking the work itself, so a line can sit in the wrong pile. The citation is always shown exactly as recorded.',
  sourcesAllHeading: 'Every source cited',
  sourcesSearchLabel: 'Search the sources',
  sourcesSearchPlaceholder: 'Title, author, newspaper…',
  sourcesFilterAll: 'All',
  sourcesSortLabel: 'Order',
  sourcesSortCited: 'Most cited',
  sourcesSortAlpha: 'A–Z',
  sourcesReadingCount: (books: number, pages: number) =>
    `${books} books · ${pages.toLocaleString('en-US')} pages`,
  sourcesShowAllBooks: (n: number) => `Show all ${n} books`,
  sourcesShowFewer: 'Show fewer',
  sourcesCameFrom: 'you came from here',
  sourcesJumpSearch: 'Search every source',
  sourcesSearchAllKinds: 'Search all kinds',
  sourcesNoMatchKind: (n: number) =>
    `Nothing of this kind matches, but ${n} ${n === 1 ? 'source of another kind does' : 'sources of other kinds do'}.`,
  sourcesShowMore: 'Show more',
  sourcesNoMatch: 'No source matches that search.',
  sourcesOpenWork: 'About this work',
  sourcesOpenLink: 'Open the source',
  sourcesShowing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  sourceTypeBook: 'Books',
  sourceTypeArticle: 'Articles & entries',
  sourceTypePress: 'Press',
  sourceTypeRecord: 'Records & gazetteers',
  sourceTypeWeb: 'Websites',
  sourceTypeTradition: 'Scripture & tradition',
  sourceTypeField: 'Field survey',
  sourceTypeGeneral: 'General references',
  sourceKicker: 'Source',
  sourceReadBadge: 'Read in full for the archive',
  sourceNotYetCited:
    'No published entry cites this book yet. What it says is still being checked against the archive’s entries.',
  sourceFactWritten: 'Written in',
  sourceFactRead: 'Read in',
  sourceFactYear: 'Year',
  sourceFactPages: 'Pages read',
  sourceFactEntries: 'Entries citing it',
  sourceFactLines: 'Ways it is cited',
  sourcePlacesHeading: 'Places',
  sourceEntriesHeading: 'Entries that rest on it',
  sourceMapHeading: 'Where its sites are',
  sourceMapNote:
    'Each dot is a site whose entry cites this work; a larger, numbered dot is several sites in one place.',
  sourceTraditionsHeading: 'Traditions',
  sourceCitationsHeading: 'How the archive cites it',
  sourceCitationsNote: 'Each line exactly as the entries record it.',
  sourceCoCitedHeading: 'Read alongside it',
  sourceCoCitedNote: 'What the same entries also cite.',
  sourceFindHeading: 'Find a copy',
  sourceFindNote:
    'These are searches, not holdings: the archive does not know which library has a copy.',
  sourceFindWorldcat: 'WorldCat — libraries',
  sourceFindGoogleBooks: 'Google Books',
  sourceFindInternetArchive: 'Internet Archive',
  sourceFindOpenLibrary: 'Open Library',
  sourceNotFound: 'The archive has no source at this address.',
  sourceLangUrdu: 'Urdu',
  sourceLangPersian: 'Persian',
  sourceLangEnglish: 'English',
  sourceLangSindhi: 'Sindhi',
  sourceLangPunjabi: 'Punjabi',
  atlasSwitchLabel: 'View the atlas',
  atlasByForm: 'By built form',
  atlasByCentury: 'By century',
  typologyTitle: 'Atlas of Built Forms',
  typologyIntro:
    'Every place in the archive, grouped by what actually stands there — khanqah, gurdwara, cave shrine. The labels are the survey’s own vocabulary; where the survey described a form in prose, the prose is kept as it was written.',
  typologyAsDescribed: 'As the survey describes it',
  typologyNotRecorded: 'Built form not recorded',
  typologySiteCount: 'sites',
  typologySiteCountOne: 'site',
  reportIntro:
    'An archive that asks to be trusted should grade itself in public. Every number on this page is computed from the dataset the page loaded — nothing is typed in by hand — and what cannot be computed is cited to the project\u2019s own working documents.',
  reportCoverageHeading: 'Coverage',
  reportShrinesLive: 'entries live on this site',
  reportRegisterNote: (pct: number) =>
    `Punjab\u2019s Auqaf department alone administers 534 shrines (its own public functions page, 2026). This archive currently covers about ${pct}% of that single provincial register \u2014 before Sindh, Khyber Pakhtunkhwa or Balochistan are counted at all.`,
  reportSupportHeading: 'How well is each entry supported?',
  reportSupportNote:
    'Support level records how the information was gathered \u2014 never a site\u2019s importance.',
  reportInfoHeading: 'How much does each entry say?',
  reportUnknownLabel: 'not recorded',
  saveShrine: 'Save',
  saveShrineFull: 'Save to your ziyarat list (stored on this device)',
  savedLabel: 'Saved',
  savedFilterLabel: 'Your list',
  savedOnlyFilter: 'Saved shrines',
  ziyaratPackPrint: 'Print your list',
  ziyaratPackTitle: 'My ziyarat list',
  ziyaratPackNote: 'Printed from the Shrines of Pakistan archive. Coordinates are WGS84.',
  ziyaratShareLink: 'Copy list link',
  sharedListBannerTitle: 'A shared ziyarat list',
  sharedListBannerBody:
    'Someone shared their list with you — the shrines below are theirs. Nothing is saved unless you add it.',
  sharedListAdd: 'Add to my list',
  sharedListDismiss: 'Dismiss',
  reportCorrection: 'Report a correction',
  sourcesHeading: 'Sources & Provenance',
  pageNotFoundTitle: 'Page not found',
  pageNotFoundMessage: 'The page you’re looking for doesn’t exist or has been moved.',
  shrineDirectoryLabel: 'Shrine directory',
  mapBreadcrumb: 'Map',
  guidedTourAriaLabel: 'Guided tour',
  guidedTours: 'Guided Tours',
  guidedToursHint: 'Follow a curated route through related shrines',
  turnOnTours: 'Turn on guided tours',
  turnOffTours: 'Turn off guided tours',
  turnOnSharedGround: 'Turn on shared ground',
  turnOffSharedGround: 'Turn off shared ground',
  turnOnMosques: 'Turn on nearby Auqaf mosques',
  turnOffMosques: 'Turn off nearby Auqaf mosques',
  endTourAriaLabel: 'End tour',
  endTour: 'End tour',
  previousStopAriaLabel: 'Previous stop',
  previousButton: 'Previous',
  nextStopAriaLabel: 'Next stop',
  finishTourAriaLabel: 'Finish tour',
  nextButton: 'Next',
  finishButton: 'Finish ✓',
  stopsLabel: 'Stops',
  clearFilters: 'Clear filters',
  viewFullDetails: 'View full details',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  switchToWesternNumerals: 'Switch to Western numerals',
  switchToEasternNumerals: 'Switch to Eastern numerals',
  selectLanguage: 'Select language',
  resetEraFilterAriaLabel: 'Reset era filter',
  resetButton: 'Reset',
  eraUndatedHidden: (n: number) =>
    `${n} undated ${n === 1 ? 'site is' : 'sites are'} left out while an era is set`,
  regionNotRecorded: 'Province not recorded',
  allErasLabel: 'All eras',
  earliestCenturyLabel: 'Earliest century',
  latestCenturyLabel: 'Latest century',
  moreFiltersLabel: 'More filters',
  infoLevelFull: 'Fully documented',
  infoLevelModerate: 'Documented from sources',
  infoLevelLow: 'Limited information',
  trustExplainButton: 'What do these mean?',
  infoLevelTooltip:
    'How thoroughly we have documented this site so far. It reflects our records only — never the site’s significance.',
  infoLevelFilterLabel: 'Information level',
  provenanceFilterLabel: 'Provenance',
  supportLevelFieldVerified: 'Field documented',
  supportLevelSourceDocumented: 'Book verified',
  supportLevelSourceSeeded: 'Text documented',
  supportLevelWebCompiled: 'Web compiled',
  supportLevelTooltip:
    'How this entry’s information was gathered — a field survey, a cited source, or a web compilation. It reflects our research process only — never the site’s significance.',
  verifiedOnlyFilter: 'Field documented only',
  statusOccasional: 'Festival-only',
  statusHeritage: 'Heritage site — worship discontinued',
  statusRuin: 'Ruin',
  statusDestroyed: 'Destroyed',
  sourceNoteLabel: 'Note',
  /* The colophon under a verse rendering: "tr." before the translator's name,
     spoken in full to a screen reader (ProseParagraphs, 29 October 2026). */
  verseTranslatorMark: 'tr.',
  verseTranslatedBy: 'Translated by',
  /* The language of a quoted verse, set above it, and of its translation
     (verseLanguage.ts, 30 October 2026). */
  verseLangPunjabi: 'Punjabi',
  verseLangPunjabiGurmukhi: 'Punjabi, in Gurmukhi',
  verseLangGurmukhi: 'Gurmukhi',
  verseLangPersian: 'Persian',
  verseLangUrdu: 'Urdu',
  verseLangSindhi: 'Sindhi',
  verseLangSeraiki: 'Seraiki',
  verseLangEnglish: 'English',
  figurePrecisionLabel: 'Dates',
  figurePrecisionHelp:
    'How precise the record is about this figure\u2019s dates. Shown where the dates themselves do not say — a bare year the archive knows is an approximation would otherwise read as settled.',
  precisionExact: 'exact',
  precisionCirca: 'circa',
  precisionCentury: 'century',
  precisionRange: 'range',
  precisionUnknown: 'unknown',
  /* ── Chronology (/chronology) ───────────────────────────────────────────
     Track C. A bar's width is how much the archive knows, which is an
     inversion a reader will not guess: the *vaguer* the date, the *wider* the
     mark. The legend has to say that outright or the page reads as the false
     precision the whole track was deferred over. */
  chronologyTitle: 'The Archive in Time',
  chronologyIntro:
    'Every dated place in the archive, drawn across the centuries and banded by tradition. A bar’s width is the archive’s uncertainty, not a building’s lifetime: an exactly dated place is a tick, a place known only to its century is a hundred years wide. Places the archive cannot date are counted below, not guessed at.',
  chronologyDated: 'on the timeline',
  chronologyUndated: 'not dated',
  chronologyLegendHeading: 'How to read a bar',
  chronologyLegendWidth:
    'The wider the bar, the less is known. A circa date is drawn as a fifty-year band around the recorded year — a drawing convention, not a figure from the source.',
  chronologyRangeNote:
    'The two places recorded as a range each give a single year, so the extent the word refers to is not in the data; they are drawn at the same width as circa.',
  chronologyEmptyBand: 'no dated places',
  chronologySpan: (from: string, to: string) => `${from}–${to}`,
  chronologySpanLabel: 'the span drawn',
  chronologyPlacesHeading: 'Places by tradition',
  chronologyFilterLabel: 'Show one tradition',
  chronologyShowFewer: 'Show fewer',
  eventYearLabel: 'Event year',
  contributePrompt:
    'We know little about this site. If you know it, we would like to hear from you.',
  contributeActionGithub: 'Send it on GitHub',
  githubLinkNote: 'opens GitHub in a new tab; a free account is needed',
  contributeAction: 'Write to us',
  stopOf: (current: number, total: number) => `Stop ${current} of ${total}`,
  nextIn: (seconds: number) => `Next in ${seconds}s`,
  photoOf: (current: number, total: number) => `Photo ${current} of ${total}`,
  photoOfSite: (site: string, current: number, total: number) =>
    `${site} — photo ${current} of ${total}`,
  galleryOfSite: (site: string) => `Photographs of ${site}`,
  photoSourceLabel: 'Source',
  notFoundSearch: (q: string) => `Search the archive for “${q}”`,
  heroOpenPhoto: 'Open the photograph',

  /* ── Shared ground, archive-wide (/shared-ground) ──────────────────────
     The per-site section on a shrine page answers "who else is here"; this page
     answers "where does this archive's subject matter overlap", which is a
     question no single row can. The method strings are not boilerplate — the
     page shows a distance for every pair it lists, and each of those four
     sentences is a limit on what that distance means. */
  sharedGroundPageTitle: 'Shared Ground',
  sharedGroundPageLede:
    'This archive documents six traditions and gives every site a page of its own. Its coordinates say something no single page can. For much of Punjab and Sindh these communities did not build in separate places — they built on the same streets, and they still stand there together.',
  sharedGroundStatAdjacent: 'sites stand within walking distance of another',
  sharedGroundStatPairs: 'pairs of neighbouring sites',
  sharedGroundStatCrossSites: 'sites stand beside another tradition',
  sharedGroundCrossOfPairs: (cross: number, pairs: number) =>
    `${cross} of those ${pairs} pairings cross a tradition.`,
  sharedGroundMeetingsHeading: 'Which traditions stand together',
  sharedGroundMeetingsNote:
    'Every tradition this archive documents stands within walking distance of another one somewhere in it. Counted from the pairs below, not asserted.',
  /* A count, not a label after a number: "1 pairings" shipped in the first
     draft of this page, and Urdu inflects the noun too (جوڑا / جوڑے). Each
     language writes the whole phrase — noSentenceFragments.test.ts. */
  sharedGroundMeetingPairs: (n: number) => `${n} pairing${n === 1 ? '' : 's'}`,
  sharedGroundNearestLabel: 'nearest',
  sharedGroundPairsHeading: 'Every crossing, nearest first',
  sharedGroundStripNote:
    'Each dot is one crossing, placed at the distance between its two sites; its two halves are its two traditions.',
  sharedGroundShowEvery: 'Show every crossing',
  sharedGroundBandLabel: 'How far apart',
  sharedGroundBandAll: (n: number) => `All (${n})`,
  sharedGroundBandSame: (n: number) => `Same location (${n})`,
  sharedGroundBandUnder: (to: string, n: number) => `Under ${to} (${n})`,
  sharedGroundBandRange: (from: string, to: string, n: number) => `${from}–${to} (${n})`,
  sharedGroundFindPlaceholder: 'Find a site',
  sharedGroundShowing: (shown: number, total: number) => `Showing ${shown} of ${total} crossings`,
  sharedGroundNoMatch: 'No crossing matches. Clear the search or choose another distance.',
  sharedGroundMethodHeading: 'How this is measured',
  sharedGroundMethodRadius:
    'Two sites share ground here when their recorded coordinates are within 800 m of each other — roughly ten minutes on foot.',
  sharedGroundMethodStraight:
    'The distance is the straight line between two recorded points. It is not a walking route, and no street between them has been checked.',
  sharedGroundMethodNoClusters:
    'Nothing is chained. A pair stays a pair: the archive does not join a site 800 m from a second, and that second 800 m from a third, into one complex. Doing exactly that produced a single group of 15 sites measuring 3,358 m across — the whole of central Lahore, called a courtyard.',
  sharedGroundMethodSamePin:
    'A few records share one recorded position because the survey gives no separate one, and are shown as sharing it. A distance this archive did not measure is never displayed as one it did.',
  sharedGroundEmpty:
    'No two sites of different traditions are recorded within walking distance of each other.',
  sharedGroundToMap: 'Open the map',
  sharedGroundFromShrine: 'Shared ground across the archive',
  /* The lens's own limit, stated rather than hinted. Every line it draws is
     under 800 m, which at the zoom that shows Pakistan is under one pixel — so
     the thing the reader can actually read at that zoom is which pins stay
     lit, and the copy says so instead of leaving them to wonder why the map
     looks unchanged. */
  sharedGroundLensNote:
    'Sites beside another tradition stay lit; the rest dim. The links between them are under 800 m, so zoom in to see them.',

  /* ── The tradition pages (/tradition/:slug) ────────────────────────────
     `/order/:slug` covers Sufi affiliation and every order in the graph is
     Sufi. These six are the other traditions the corpus names and describes —
     Nath, Udasi, Pranami, Swaminarayan, Daduvansi, Shakti Peetha — and the
     copy has one job the order pages do not: to keep the difference between a
     *bucket* (the site's category) and a *claim* (what its entry says it
     belongs to) legible on the same page. */
  /* The search group heading. Plural, unlike `traditionKicker`, which labels
     one page. */
  searchGroupTraditions: 'Traditions',
  recentlyViewed: 'Recently viewed',
  clearRecent: 'Clear',
  ariaClearRecent: 'Clear recently viewed',
  traditionKicker: 'Tradition',
  traditionSiteCount: (n: number) => `${n} site${n === 1 ? '' : 's'}`,
  traditionDefinitionHeading: 'What the archive says',
  traditionFromEntry: 'From the entry for',
  traditionSitesHeading: 'Sites recorded in this tradition',
  placeSitesOther: 'Other sites',
  placeOrdersHeading: 'Sufi orders here',
  placeOrdersNote:
    'The orders of the figures these sites commemorate, with how many of those figures belong to each.',
  orderLineageLinks: (n: number) =>
    n === 1
      ? '1 teacher–disciple link is recorded with a member of this order at one end.'
      : `${n} teacher–disciple links are recorded with a member of this order at one end.`,
  orderLineageOpen: 'Read them as a tree',
  orderLineageNone: 'No teacher–disciple links are recorded for this order yet.',
  traditionFiguresHeading: 'Figures commemorated at these sites',
  traditionFiguresNote:
    'The people these sites remember. A site’s tradition is not necessarily the figure’s own.',
  saintTraditionsHeading: 'Traditions at the sites that commemorate this figure',
  saintTraditionsNote:
    'Recorded for the sites, not the figure: a site’s tradition is not necessarily the figure’s own.',
  traditionSitesNote:
    'Each of these is a site whose own entry places it in this tradition, with the sentence that says so.',
  traditionScopeHeading: 'What this does not include',
  traditionScopeNote:
    'Only sites whose entry names this tradition are listed. A site is never added because a word matched: the same terms recur with other meanings — a Sikh entry uses ʿudasi\u2019 for Guru Nanak\u2019s journeys, and \u2018jogi\u2019 appears in a poem about Ranjha — and each of those is recorded as a deliberate exclusion rather than counted.',
  traditionLabel: 'Tradition',
} as const;
/**
 * The shape every language's table must have: the English table's keys, with
 * plain strings widened and function signatures kept exact.
 *
 * Not `typeof UI_TEXT_EN` — that is `as const`, so every value is a *literal*
 * type and no translation can satisfy it ("منہدم" is not assignable to
 * "Destroyed"). Widening only the strings and preserving the parameter lists
 * keeps the assertion that matters: a translated interpolation must take the
 * same arguments as the English one, so `stopOf: (n: number) => …` against
 * English's `(current, total)` is a compile error rather than a missing number
 * on the page.
 */
export type StringTableOf<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string ? (...args: A) => string : string;
};

/** The public table's shape (see above). The Urdu table is typed with it. */
export type UiStrings = StringTableOf<typeof UI_TEXT_EN>;

/**
 * Every key `t()` accepts: the public table's and the team table's. A typo in
 * either is still a compile error.
 */
export type UiStringKey = keyof UiStrings | TeamStringKey;

/**
 * A language's strings as `t()` reads them: the public table, plus the team
 * table once `registerTeamStrings()` has run. The team half is `Partial`
 * because it is genuinely absent until then — always, in the public build.
 */
type LoadedStrings = UiStrings & Partial<TeamStrings>;

/**
 * The loaded string tables, keyed by language.
 *
 * Same shape it always had — `UI_TEXT.en.siteTitle`, `keyof (typeof UI_TEXT)['en']`
 * — so the fifty-odd call sites that read the *type* of the English table are
 * untouched; that key type now includes the team keys. What changed is that
 * `ur` is now `UiStrings | undefined`: it is absent until `loadUiStrings('ur')`
 * resolves.
 *
 * `t()` and `tFn()` already fell back to English for a missing table, which is
 * what makes this safe to do at all — and is also exactly the flash that must
 * never be seen, so `main.tsx` awaits the active language's table before the
 * first render rather than relying on the fallback. The fallback is the safety
 * net, not the plan.
 *
 * Each entry is the public table merged with that language's team table, once
 * one is registered. The pure tables stay in `PUBLIC_TEXT` and `TEAM_TEXT`
 * below, so the merge can be redone whichever half arrives second.
 */
export const UI_TEXT: { en: LoadedStrings; ur?: LoadedStrings } = { en: UI_TEXT_EN };

const PUBLIC_TEXT: Partial<Record<Lang, UiStrings>> = { en: UI_TEXT_EN };
const TEAM_TEXT: Partial<Record<Lang, TeamStrings>> = {};

/** Rebuild `UI_TEXT[lang]` from whatever halves have arrived. */
function publish(lang: Lang): void {
  const publicTable = PUBLIC_TEXT[lang];
  if (!publicTable) return;
  const teamTable = TEAM_TEXT[lang];
  UI_TEXT[lang] = teamTable ? { ...publicTable, ...teamTable } : publicTable;
}

/**
 * Make the team view's strings available to `t()` and `tFn()`.
 *
 * Called with `TEAM_TEXT` from `uiStrings.team.ts`: by `main.tsx` before the
 * first render, in builds that have team code (`__TEAM_CODE__`), and by the
 * test setup. The public build never calls it, and never renders a team key.
 */
export function registerTeamStrings(tables: Record<Lang, TeamStrings>): void {
  for (const lang of Object.keys(tables) as Lang[]) {
    TEAM_TEXT[lang] = tables[lang];
    publish(lang);
  }
}

/** True once team strings have been registered. */
export function hasTeamStrings(): boolean {
  return TEAM_TEXT.en !== undefined;
}

const warnedMissing = new Set<string>();

/**
 * A key with no string in any loaded table. In practice that is a team key read
 * before `registerTeamStrings()` — which, in a build with team code, means
 * something rendered ahead of `main.tsx`'s await — so it renders as nothing
 * rather than crashing, and says so once per key while developing.
 */
function missing(key: string): string {
  if (import.meta.env.DEV && !warnedMissing.has(key)) {
    warnedMissing.add(key);
    console.warn(`[i18n] "${key}" has no string loaded — team strings not registered yet?`);
  }
  return '';
}

/** Where a language's table comes from. English is static — it is the default
 * and the smaller half, and an English reader should not pay a round trip to
 * read the site. Every other language is a dynamic import, so it becomes its own
 * chunk and reaches only the readers who need it. */
const LOADERS: Partial<
  Record<Lang, () => Promise<{ default?: UiStrings } & Record<string, unknown>>>
> = {
  ur: () => import('./uiStrings.ur'),
};

const inflight = new Map<Lang, Promise<void>>();

/** True once `lang` can be rendered without falling back to English. */
export function hasUiStrings(lang: Lang): boolean {
  return UI_TEXT[lang] !== undefined;
}

/**
 * Load a language's interface strings. Resolves immediately for a language whose
 * table is already present (English always; anything else once fetched), so
 * callers can await it unconditionally.
 *
 * A failed fetch resolves rather than rejects: the reader then gets English,
 * which is the pre-existing fallback and strictly better than an unrendered
 * page. It is logged in dev because silently serving the wrong language is the
 * kind of thing that should be noticed while developing.
 */
export function loadUiStrings(lang: Lang): Promise<void> {
  if (hasUiStrings(lang)) return Promise.resolve();
  const existing = inflight.get(lang);
  if (existing) return existing;
  const loader = LOADERS[lang];
  if (!loader) return Promise.resolve();
  const promise = loader()
    .then((mod) => {
      const table = (mod.UI_TEXT_UR ?? mod.default) as UiStrings | undefined;
      if (table) {
        PUBLIC_TEXT[lang] = table;
        publish(lang);
      }
    })
    .catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] interface strings for "${lang}" failed to load`, error);
      }
    });
  inflight.set(lang, promise);
  return promise;
}

export function t(lang: Lang, key: UiStringKey): string {
  const text = UI_TEXT[lang]?.[key] ?? UI_TEXT.en[key];
  if (text === undefined) return missing(key);
  if (typeof text === 'function') return '';
  return String(text);
}

export function tFn(lang: Lang, key: 'resultCount', n: number): string;
export function tFn(lang: Lang, key: 'stopOf', current: number, total: number): string;
export function tFn(lang: Lang, key: 'nextIn', seconds: number): string;
export function tFn(lang: Lang, key: 'photoOf', current: number, total: number): string;
export function tFn(lang: Lang, key: 'activeFiltersCount', n: number): string;
export function tFn(lang: Lang, key: 'reportRegisterNote', pct: number): string;
export function tFn(lang: Lang, key: 'orderMemberCount', n: number): string;
export function tFn(lang: Lang, key: 'orderBranchCount', n: number): string;
export function tFn(lang: Lang, key: 'orderMultiCount', n: number): string;
export function tFn(lang: Lang, key: 'lineageChainForks', n: number): string;
export function tFn(lang: Lang, key: 'orderUndated', n: number): string;
export function tFn(lang: Lang, key: 'orderUrsUndatedCount', n: number): string;
export function tFn(lang: Lang, key: 'coverageRestsEveryNote', n: number): string;
export function tFn(lang: Lang, key: 'sourceAlsoCitedBy', n: number): string;
export function tFn(lang: Lang, key: 'saintBiographyFrom', entry: string): string;
export function tFn(lang: Lang, key: 'almanacMorePlaces', n: number): string;
export function tFn(lang: Lang, key: 'almanacCalendarPlaced', n: number): string;
export function tFn(lang: Lang, key: 'almanacCalendarDayCount', n: number): string;
export function tFn(lang: Lang, key: 'lineageDisciplesCount', n: number): string;
export function tFn(lang: Lang, key: 'almanacCalendarMore', n: number): string;
export function tFn(lang: Lang, key: 'almanacShowList', n: number): string;
export function tFn(lang: Lang, key: 'orderSpan', from: string, to: string): string;
export function tFn(lang: Lang, key: 'chronologySpan', from: string, to: string): string;
export function tFn(lang: Lang, key: 'graphLineageScopeOrder', order: string, n: number): string;
export function tFn(lang: Lang, key: 'graphLineageScopeAll', n: number): string;
export function tFn(lang: Lang, key: 'graphLineageUnaffiliated', n: number, total: number): string;
export function tFn(lang: Lang, key: 'orderSpanOne', century: string): string;
export function tFn(lang: Lang, key: 'lineageChainRemove', n: number): string;
export function tFn(
  lang: Lang,
  key: 'graphFigureFilterCount',
  shown: number,
  total: number,
): string;
export function tFn(
  lang: Lang,
  key: 'sharedGroundIntro',
  sites: number,
  traditions: number,
): string;
export function tFn(lang: Lang, key: 'sharedGroundIntroSame', sites: number): string;
export function tFn(
  lang: Lang,
  key: 'sharedGroundCrossOfPairs',
  cross: number,
  pairs: number,
): string;
export function tFn(lang: Lang, key: 'sharedGroundMeetingPairs', n: number): string;
export function tFn(lang: Lang, key: 'sharedGroundBandAll', n: number): string;
export function tFn(lang: Lang, key: 'sharedGroundBandSame', n: number): string;
export function tFn(lang: Lang, key: 'sharedGroundBandUnder', to: string, n: number): string;
export function tFn(
  lang: Lang,
  key: 'sharedGroundBandRange',
  from: string,
  to: string,
  n: number,
): string;
export function tFn(lang: Lang, key: 'sharedGroundShowing', shown: number, total: number): string;
export function tFn(lang: Lang, key: 'traditionSiteCount', n: number): string;
export function tFn(lang: Lang, key: 'coverageEntriesNoun', n: number): string;
export function tFn(lang: Lang, key: 'coverageRestsEntryCount', n: number): string;
export function tFn(lang: Lang, key: 'coverageWorksRecords', n: number): string;
export function tFn(lang: Lang, key: 'aboutTrustLineage', total: number): string;
export function tFn(lang: Lang, key: 'aboutTrustMemberships', total: number): string;
export function tFn(lang: Lang, key: 'graphLineageOnlyTeacherOf', name: string): string;
export function tFn(
  lang: Lang,
  key: 'graphLineageOnlyTeacherOfMore',
  name: string,
  n: number,
): string;
export function tFn(lang: Lang, key: 'graphLineageOnlyDiscipleOf', name: string): string;
export function tFn(
  lang: Lang,
  key: 'graphLineageOnlyDiscipleOfMore',
  name: string,
  n: number,
): string;
export function tFn(lang: Lang, key: 'graphLineageOnlyKinOf', role: string, name: string): string;
export function tFn(
  lang: Lang,
  key: 'graphLineageOnlyKinOfMore',
  role: string,
  name: string,
  n: number,
): string;
export function tFn(lang: Lang, key: 'coverageRestsTail', n: number): string;
export function tFn(lang: Lang, key: 'almanacCoverageTotal', dated: number, total: number): string;
/* String-valued interpolations. These exist for the same reason the numeric
   ones do: a label like "Category: X" or "Map showing location of X" puts its
   variable in a different place in Urdu, and a component that concatenates the
   pieces itself decides that placement in English. */
export function tFn(lang: Lang, key: 'settingsSavedCount', n: string): string;
export function tFn(lang: Lang, key: 'offlineDataBannerDated', date: string): string;
export function tFn(lang: Lang, key: 'orderLineageLinks', n: number): string;
export function tFn(lang: Lang, key: 'almanacIcsLeftOut', n: number): string;
export function tFn(
  lang: Lang,
  key: 'tourNearestStop',
  stop: string,
  name: string,
  distance: string,
): string;
export function tFn(lang: Lang, key: 'tourStartAtStop', stop: string): string;
export function tFn(lang: Lang, key: 'paletteSearchArchive', q: string): string;
export function tFn(
  lang: Lang,
  key: 'photoOfSite',
  site: string,
  current: number,
  total: number,
): string;
export function tFn(lang: Lang, key: 'galleryOfSite', site: string): string;
export function tFn(lang: Lang, key: 'liveUnreachableSaved', date: string): string;
export function tFn(lang: Lang, key: 'liveUnreachablePublished', date: string): string;
export function tFn(lang: Lang, key: 'notFoundSearch', q: string): string;
export function tFn(lang: Lang, key: 'almanacFilterUndated', n: number): string;
export function tFn(lang: Lang, key: 'settingsSavedImported', n: string): string;
export function tFn(lang: Lang, key: 'distanceAwayKm', value: string): string;
export function tFn(lang: Lang, key: 'distanceAwayMetres', value: string): string;
export function tFn(lang: Lang, key: 'distanceAwayMi', value: string): string;
export function tFn(lang: Lang, key: 'distanceBareKm', value: string): string;
export function tFn(lang: Lang, key: 'distanceBareMetres', value: string): string;
export function tFn(lang: Lang, key: 'distanceBareMi', value: string): string;
export function tFn(lang: Lang, key: 'distanceApartMetres', value: string): string;
export function tFn(lang: Lang, key: 'distanceApartKm', value: string): string;
export function tFn(lang: Lang, key: 'distanceApartMi', value: string): string;
export function tFn(lang: Lang, key: 'ariaCategoryOf', category: string): string;
export function tFn(lang: Lang, key: 'mapLayerFrom', name: string, provider: string): string;
export function tFn(lang: Lang, key: 'paletteResultCount', shown: number, total: number): string;
export function tFn(lang: Lang, key: 'archiveResultCount', n: number): string;
export function tFn(lang: Lang, key: 'paletteShowingFirst', n: number): string;
export function tFn(lang: Lang, key: 'tourCount', n: number): string;
export function tFn(lang: Lang, key: 'placeSiteCount', n: number): string;
export function tFn(lang: Lang, key: 'sourcesShowing', shown: number, total: number): string;
export function tFn(lang: Lang, key: 'sourcesReadingCount', books: number, pages: number): string;
export function tFn(lang: Lang, key: 'sourcesShowAllBooks', n: number): string;
export function tFn(lang: Lang, key: 'sourcesNoMatchKind', n: number): string;
export function tFn(lang: Lang, key: 'lineageMatchesElsewhere', n: number): string;
export function tFn(lang: Lang, key: 'eraUndatedHidden', n: number): string;
export function tFn(lang: Lang, key: 'placeSpan', from: number, to: number): string;
export function tFn(lang: Lang, key: 'placesUnplaced', n: number): string;
export function tFn(lang: Lang, key: 'ariaMapShowing', name: string): string;
export function tFn(lang: Lang, key: 'ariaExternalMapShowing', name: string): string;
export function tFn(lang: Lang, key: 'galleryImageLabel', index: number, action: string): string;
export function tFn(
  lang: Lang,
  key:
    | 'resultCount'
    | 'lineageDisciplesCount'
    | 'chronologySpan'
    | 'settingsSavedCount'
    | 'offlineDataBannerDated'
    | 'orderLineageLinks'
    | 'almanacIcsLeftOut'
    | 'tourNearestStop'
    | 'tourStartAtStop'
    | 'paletteSearchArchive'
    | 'photoOfSite'
    | 'galleryOfSite'
    | 'liveUnreachableSaved'
    | 'liveUnreachablePublished'
    | 'notFoundSearch'
    | 'almanacFilterUndated'
    | 'settingsSavedImported'
    | 'distanceAwayKm'
    | 'distanceAwayMetres'
    | 'distanceAwayMi'
    | 'distanceBareKm'
    | 'distanceBareMetres'
    | 'distanceBareMi'
    | 'distanceApartMetres'
    | 'distanceApartKm'
    | 'distanceApartMi'
    | 'stopOf'
    | 'nextIn'
    | 'photoOf'
    | 'activeFiltersCount'
    | 'reportRegisterNote'
    | 'orderMemberCount'
    | 'orderBranchCount'
    | 'orderMultiCount'
    | 'lineageChainForks'
    | 'orderUndated'
    | 'orderSpan'
    | 'graphLineageScopeOrder'
    | 'graphLineageScopeAll'
    | 'graphLineageUnaffiliated'
    | 'orderSpanOne'
    | 'lineageChainRemove'
    | 'orderUrsUndatedCount'
    | 'coverageRestsEveryNote'
    | 'sourceAlsoCitedBy'
    | 'saintBiographyFrom'
    | 'almanacMorePlaces'
    | 'almanacCalendarPlaced'
    | 'almanacCalendarDayCount'
    | 'almanacCalendarMore'
    | 'almanacShowList'
    | 'graphFigureFilterCount'
    | 'sharedGroundIntro'
    | 'sharedGroundIntroSame'
    | 'sharedGroundCrossOfPairs'
    | 'sharedGroundMeetingPairs'
    | 'sharedGroundBandAll'
    | 'sharedGroundBandSame'
    | 'sharedGroundBandUnder'
    | 'sharedGroundBandRange'
    | 'sharedGroundShowing'
    | 'traditionSiteCount'
    | 'coverageEntriesNoun'
    | 'coverageRestsEntryCount'
    | 'coverageWorksRecords'
    | 'aboutTrustLineage'
    | 'aboutTrustMemberships'
    | 'graphLineageOnlyTeacherOf'
    | 'graphLineageOnlyTeacherOfMore'
    | 'graphLineageOnlyDiscipleOf'
    | 'graphLineageOnlyDiscipleOfMore'
    | 'graphLineageOnlyKinOf'
    | 'graphLineageOnlyKinOfMore'
    | 'coverageRestsTail'
    | 'almanacCoverageTotal'
    | 'ariaCategoryOf'
    | 'mapLayerFrom'
    | 'paletteResultCount'
    | 'archiveResultCount'
    | 'paletteShowingFirst'
    | 'tourCount'
    | 'placeSiteCount'
    | 'sourcesShowing'
    | 'sourcesReadingCount'
    | 'sourcesShowAllBooks'
    | 'sourcesNoMatchKind'
    | 'lineageMatchesElsewhere'
    | 'eraUndatedHidden'
    | 'placeSpan'
    | 'placesUnplaced'
    | 'ariaMapShowing'
    | 'ariaExternalMapShowing'
    | 'galleryImageLabel',
  ...args: (number | string)[]
): string {
  const fn = UI_TEXT[lang]?.[key] ?? UI_TEXT.en[key];
  if (fn === undefined) return missing(key);
  if (typeof fn === 'function') return (fn as (...a: (number | string)[]) => string)(...args);
  return String(fn);
}
