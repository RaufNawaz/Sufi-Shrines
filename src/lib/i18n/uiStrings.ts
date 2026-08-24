import type { Lang } from '../../types/shrine';

const UI_TEXT_EN = {
  title: 'Sufi Shrines',
  siteTitle: 'Sufi Shrines of Pakistan',
  siteMetaDescription:
    'An interactive map of Sufi shrines across Pakistan. Explore histories, architecture, rituals, and visitor information in English and Urdu.',
  loading: 'Loading data...',
  loadingShrine: 'Loading shrine details...',
  noSelection: 'No shrine selected yet. Click a marker to view details.',
  exploreTitle: 'Explore Sufi Shrines',
  exploreHint: 'Use the list button above to browse all shrines.',
  tableButton: 'Table of Shrines',
  settings: 'Settings',
  directoryModeLabel: 'Table button opens',
  directoryModeSpotlight: 'Spotlight search',
  directoryModeTable: 'Shrine table',
  /* ── Command palette (⌘K search) ─────────────────────────────────────── */
  paletteTitle: 'Search the archive',
  paletteOpen: 'Search and filter',
  filtersLabel: 'Filters',
  paletteHintMove: 'to move',
  paletteHintOpen: 'to open',
  ariaOpenPalette: 'Search and filter the archive',
  paletteClose: 'Close search',
  searchPlaceholder: 'Search shrines…',
  noMatches: 'No matches.',
  uncategorized: 'Uncategorized',
  descriptionMore: 'More',
  backToMap: 'Back to map',
  /* ── Tab bar (phone) ─────────────────────────────────────────────────── */
  tabMap: 'Map',
  tabExplore: 'Figures',
  tabAlmanac: 'Almanac',
  tabAtlas: 'Atlas',
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
  getDirections: 'Get Directions',
  relatedShrines: 'Related Shrines',
  nearbyShrines: 'Nearby Shrines',
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
  distanceMetres: 'm away',
  shrineFacts: 'Shrine facts',
  distanceKm: 'km away',
  noImage: 'No image found. Add an "Image Link" value in your sheet.',
  imageLoadFailed: 'Image failed to load.',
  notFound: 'Shrine not found.',
  errorLoadingData: 'Failed to load shrine data.',
  offlineDataBanner: 'Showing cached data from',
  retry: 'Try Again',
  appErrorMessage: 'Something went wrong. Please reload the page.',
  appErrorReload: 'Reload',
  filterAll: 'All',
  resultCount: (n: number) => `${n} shrine${n === 1 ? '' : 's'}`,
  /* "12 of 169" — the count *and* the denominator, because a bare "12" hides
     how much of the archive a query just excluded. */
  paletteResultCount: (shown: number, total: number) =>
    shown === total ? `${total} sites` : `${shown} of ${total} sites`,
  tourCount: (n: number) => `${n} tour${n === 1 ? '' : 's'}`,
  /* ── Order pages: what the archive can say about where an order is ────── */
  orderWhereHeading: 'Where this order stands',
  orderWhereNote:
    'Counted from the Location of every site where one of its figures is commemorated.',
  orderSitesHeading: 'Sites of this order',
  activeFiltersCount: (n: number) => `${n} filter${n === 1 ? '' : 's'} active`,
  nearMe: 'Near Me',
  switchToUrdu: 'اردو',
  switchToEnglish: 'English',
  darkMode: 'Dark mode',
  lightMode: 'Light mode',
  skipToContent: 'Skip to content',
  skipToShrineList: 'Skip to shrine list',
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
  orderCompareHeading: 'The silsilas at a glance',
  orderCompareNote:
    'Every figure, century span and place below is counted from the graph on load, so this table cannot go stale the way a sentence can. Each row is what the archive holds, not what the order is.',
  orderCompareFigures: 'Figures',
  orderCompareSpan: 'Century span',
  orderCompareSites: 'Sites',
  orderAsRecorded: 'As recorded',
  orderAsRecordedHelp:
    'The silsila exactly as this figure\u2019s own record words it, including where the record contradicts itself. It describes the figure rather than any one of the orders above, so it is shown once.',
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
  reviewTitle: 'Review desk',
  reviewIntro:
    'The claims this archive has extracted and no person has read yet, with the evidence each was read from. A verdict here is a judgement about a claim \u2014 nothing on this page edits the archive.',
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
  reviewClear: 'Clear my verdicts',
  reviewStale:
    'The evidence for this claim changed after the verdict was recorded, so the verdict no longer applies to it.',
  reviewNoQuote:
    'No quote was captured for this claim. Judge it against the source, or mark it as needing work.',
  notFoundOrder: 'Order not found.',
  aboutThisSaint: 'About this saint',
  viewOrder: 'View spiritual order',
  networkConnections: 'Network connections',
  description: 'Description',
  graphExplorerTitle: 'Saints & Orders Explorer',
  graphExplorerIntro:
    'Browse the Sufi orders and saints behind these shrines, and how they connect to one another.',
  graphExplorerOrders: 'Sufi orders',
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
  graphLineageOnlyNote:
    'Teachers and masters whose names appear in another figure\u2019s recorded chain of transmission, and who have no site in this archive. They are not counted among its entries \u2014 they are here so a chain does not stop at the first master who happens to have no shrine in Pakistan. Until now the only way to reach one was to already be walking the chain that names it.',
  graphLineageOnlyTeacherOf: (name: string) => `teacher of ${name}`,
  graphLineageOnlyTeacherOfMore: (name: string, n: number) => `teacher of ${name} and ${n} more`,
  graphLineageOnlyDiscipleOf: (name: string) => `disciple of ${name}`,
  graphLineageOnlyDiscipleOfMore: (name: string, n: number) => `disciple of ${name} and ${n} more`,
  graphCenturyNote:
    'Centuries are read from a figure\u2019s recorded death year, or birth year where no death is given. Nothing is converted from the Hijri calendar.',
  lineageUnreviewed: 'unreviewed',
  titlesLabel: 'Titles and honorifics',
  disputedDatesLabel: 'Sources disagree',
  disputedVersus: 'vs',
  yearsApart: 'years apart',
  lineageUnreviewedHelp:
    'Extracted from this archive\u2019s own sources and quote-checked, but not yet read by an editor.',
  /* ── Figure provenance (SaintPage) ───────────────────────────────────── */
  figureBiographyNote:
    'The dates, titles and other names above were read out of the source below rather than entered by hand.',
  figureProvenanceReadFrom: 'Read from',
  figureLineageOnly: 'named in a lineage, no entry here',
  figureLineageOnlyHelp:
    'This figure has no site in the archive, so they are not counted among its entries. They are in the graph because another figure\u2019s recorded lineage names them \u2014 without that, a chain of transmission would stop at the first master who happens not to have a shrine here.',
  figureLineageOnlyNote:
    'The archive holds no entry of its own for this figure. Everything below comes from what other figures\u2019 records say about them.',
  graphLineageNote: 'Recorded teacher\u2013disciple links:',
  graphExplorerFiguresNote:
    'Grouped by what the record says each figure is. The archive covers six traditions, so not every figure here is a Sufi saint.',
  graphLineageHeading: 'Teacher-disciple relationships',
  graphLineageScopeOrder: (order: string, n: number) => `In the ${order} (${n})`,
  graphLineageScopeAll: (n: number) => `All recorded links (${n})`,
  graphLineageScopeLabel: 'Which links to show',
  graphLineageUnaffiliated: (n: number) =>
    `${n} of these links belong to no order this archive records — a Sikh or Hindu lineage is a line of teaching, not a silsila, and some Sufi teachers named in a chain have no order recorded here.`,

  // ── Urs Almanac (DESIGN_VISION.md F1) ──────────────────────────────────
  welcomeExploreMore: 'Elsewhere in the archive',
  almanacTitle: 'The Urs Almanac',
  almanacIntro:
    'When the shrines gather. An ʿurs is the death anniversary of a saint, kept as a festival of union — and for most of these places it is the one day of the year the whole community returns.',
  almanacHonestyHeading: 'What this calendar can and cannot tell you',
  almanacApproximateNote:
    'Dates in the Hijri calendar are shown with their approximate Gregorian equivalent. The ʿurs begins on the local moon sighting, so the actual day can fall one or two days either side. Confirm with the shrine before travelling.',
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
    'These shrines hold an ʿurs or annual observance. Nobody has written down when. This is the largest gap in the almanac, and it is the easiest one to help close.',
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
  almanacCoverageTotal: (dated: number, total: number) => `${dated} of ${total} sites`,
  /* ── Places (Track B) ─────────────────────────────────────────────────── */
  placesTitle: 'Places',
  placeKicker: 'Place',
  placeIntro:
    'What the archive records in one place — which sites, which traditions, and the span of the dates it can read.',
  placeSitesHeading: 'Sites recorded here',
  placeTraditionsHeading: 'Traditions',
  placeSpanHeading: 'Dates recorded',
  placeSpanNone: 'No site here records a date this archive can read.',
  placeNotFound: 'No place by that name is recorded.',
  placesIntro:
    'Where the archive is, counted from the Location each entry records. A site can appear under both a town and its district, because it is in both.',
  placeSiteCount: (n: number) => `${n} site${n === 1 ? '' : 's'}`,
  placeSpan: (from: number, to: number) => `${from}–${to}`,
  placesUnplaced: (n: number) =>
    `${n} site${n === 1 ? '' : 's'} name${n === 1 ? 's' : ''} no place this archive can identify.`,
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
  ariaFilterBySaint: 'Filter by Sufi saint',
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
  aboutStateHeading: 'What this archive holds',
  aboutStateNote:
    'Every number in this section is counted from the data this page just loaded, so it cannot drift from the archive the way a sentence can. Each one describes what the archive records \u2014 never an estimate of what is out there.',
  aboutStateSites: 'sites',
  aboutStateSources: 'cited sources',
  aboutStatePhotos: 'photographs',
  aboutStateTraditions: 'traditions',
  aboutKnowsHeading: 'How it knows what it says',
  aboutKnowsNote:
    'Every entry records the kind of evidence behind it. A field visit and a web compilation are both honest and they are not the same thing, so the archive says which rather than levelling them.',
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
  aboutMethodUrdu:
    'The Urdu edition is a first-class edition, not a translation layer. Machine-drafted translations are marked as drafts until a fluent reader signs them off.',
  aboutMethodGaps: 'What the archive does not know is published alongside what it does.',
  aboutCoverageLink: 'See what this archive knows',
  aboutLicenceHeading: 'Licence and reuse',
  aboutLicenceData: 'Dataset',
  aboutLicenceCode: 'Site and pipeline code',
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
  coverageTitle: 'What this archive knows',
  coverageIntro:
    'Every figure on this page is counted from the published data, not estimated. Where the archive is silent, it says so.',
  coverageSitesHeading: 'Sites documented',
  coverageSupportHeading: 'How each entry was established',
  coverageInfoHeading: 'Depth of each entry',
  coverageTraditionHeading: 'Traditions covered',
  coverageSourcesHeading: 'Citations',
  coverageEntriesNoun: (n: number) => (n === 1 ? 'entry' : 'entries'),
  coverageSourcesWithAny: 'with a bibliography',
  coverageSourcesWithThree: 'citing three or more sources',
  coverageSourcesWithNone: 'citing nothing',
  coverageSourcesItems: 'citations in total',
  /* ── What the archive rests on (/coverage) ───────────────────────────── */
  coverageRestsHeading: 'What the archive rests on',
  coverageRestsNote:
    'Its citations counted the other way round \u2014 not how many each entry has, but how many entries lean on the same source. Computed from the shipped data on every load, like every other figure here.',
  coverageRestsDistinct: 'distinct sources',
  coverageRestsShared: 'sources cited by more than one entry',
  coverageRestsSingle: 'entries resting on a single source',
  coverageRestsTop: 'The sources most of it rests on',
  coverageRestsEntryCount: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
  coverageRestsTail: (n: number) =>
    `${n} further sources are each cited by a single entry, and are not listed.`,
  coverageRestsCaveat:
    'A source cited by many entries is not a weakness \u2014 a standard reference should recur. It is worth seeing, because it says where a single error would travel furthest.',
  coveragePhotosHeading: 'Photography',
  coveragePhotosWithNone: 'with no photograph',
  coveragePhotosItems: 'photographs in total',
  coverageDatesHeading: 'Dates',
  coverageDatesWithYear: 'recording a construction year',
  coverageDatesExact: 'of those the archive itself calls exact',
  coverageDatesHedged: 'whose date carries a written qualification',
  coverageLocationHeading: 'Coordinates',
  coverageLocationApprox: 'whose own text says the pin is approximate',
  coverageObservancesHeading: 'Urs and festivals',
  coverageObservancesWithText: 'recording an observance',
  coverageObservancesWithNone: 'recording none',
  coverageUnrecorded: 'not recorded',
  coverageWhyHeading: 'Why publish this',
  coverageWhy:
    'An archive is only as useful as its account of its own limits. A note in a repository goes stale; a page computed from the data cannot. If a figure here looks low, that is the gap, stated plainly rather than smoothed over.',
  saintNextUrs: 'Next ʿurs',
  saintNextUrsLink: 'See the almanac',
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
  almanacRule: 'recurrence recorded, not a fixed date',
  almanacMonthOnly: 'month recorded, day not recorded',
  kmUnit: 'km',
  tourTotalDistance: 'Total distance',
  tourEstDriveTime: 'Est. drive time',
  tourNextStopDistance: 'to next stop',
  tourPreviewTitle: 'Tour overview',
  tourStartButton: 'Start tour',
  tourBackButton: 'Back',
  hoursAbbrev: 'h',
  minutesAbbrev: 'm',
  resumeTourPrompt: 'Continue where you left off',
  resumeButton: 'Resume',
  dismiss: 'Dismiss',
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
  relatedToursHeading: 'You might also like',
  partOfTour: 'Part of the guided tour',
  viewTour: 'View tour',
  printItinerary: 'Print itinerary',
  filterByTradition: 'Tradition',
  filterByRegion: 'Region',
  filterByTheme: 'Theme',
  filterByEra: 'Era',
  saintLabel: 'Saint',
  categoryLabel: 'Category',
  locationLabel: 'Location',
  districtLabel: 'District',
  provinceLabel: 'Province',
  cityLabel: 'City',
  eventsLabel: 'Events',
  nameLabel: 'Name',
  latitudeLabel: 'Latitude',
  longitudeLabel: 'Longitude',
  imageLabel: 'Image',
  footerCredit: 'Sufi Shrines of Pakistan · Harvard Research Project',
  citeTitle: 'Cite this entry',
  citeTextLabel: 'Text',
  citeCopy: 'Copy',
  citeArchive: 'digital archive',
  citeRetrieved: 'Retrieved',
  citeSupportLevel: 'Support level',
  obsHeading: 'Urs & observances',
  obsViewAlmanac: 'See it in the Urs Almanac',
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
  typologyTitle: 'Atlas of Built Forms',
  typologyIntro:
    'Every place in the archive, grouped by what actually stands there — khanqah, gurdwara, cave shrine. The labels are the survey’s own vocabulary; where the survey described a form in prose, the prose is kept as it was written.',
  typologyAsDescribed: 'As the survey describes it',
  typologyNotRecorded: 'Built form not recorded',
  typologySiteCount: 'sites',
  typologySiteCountOne: 'site',
  reportTitle: 'State of the Archive',
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
  unreviewedLabel: 'Unreviewed',
  confidenceLabel: 'confidence',
  reviewedByLabel: 'reviewed by',
  citationsLabel: 'Citations',
  viewSourceLabel: 'View source',
  pageNotFoundTitle: 'Page not found',
  pageNotFoundMessage: 'The page you’re looking for doesn’t exist or has been moved.',
  shrineDirectoryLabel: 'Shrine directory',
  mapBreadcrumb: 'Map',
  guidedTourAriaLabel: 'Guided tour',
  guidedTours: 'Guided Tours',
  guidedToursHint: 'Follow a curated route through related shrines',
  turnOnTours: 'Turn on guided tours',
  turnOffTours: 'Turn off guided tours',
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
  allErasLabel: 'All eras',
  earliestCenturyLabel: 'Earliest century',
  latestCenturyLabel: 'Latest century',
  moreFiltersLabel: 'More filters',
  infoLevelFull: 'Fully documented',
  infoLevelModerate: 'Documented from sources',
  infoLevelLow: 'Limited information',
  infoLevelTooltip:
    'How thoroughly we have documented this site so far. It reflects our records only — never the site’s significance.',
  infoLevelFilterLabel: 'Information level',
  provenanceFilterLabel: 'Provenance',
  supportLevelFieldVerified: 'Field-verified',
  supportLevelSourceDocumented: 'Source-documented',
  supportLevelSourceSeeded: 'Source-seeded',
  supportLevelWebCompiled: 'Web-compiled',
  supportLevelTooltip:
    'How this entry’s information was gathered — a field survey, a cited source, or a web compilation. It reflects our research process only — never the site’s significance.',
  verifiedOnlyFilter: 'Field-verified only',
  statusActive: 'Active',
  statusOccasional: 'Festival-only',
  statusHeritage: 'Heritage site — worship discontinued',
  statusRuin: 'Ruin',
  statusDestroyed: 'Destroyed',
  sourceNoteLabel: 'Note',
  figurePrecisionHelp:
    'How precise the record is about this figure\u2019s dates. Shown where the dates themselves do not say — a bare year the archive knows is an approximation would otherwise read as settled.',
  precisionExact: 'exact',
  precisionCirca: 'circa',
  precisionCentury: 'century',
  precisionRange: 'range',
  precisionUnknown: 'unknown',
  eventYearLabel: 'Event year',
  contributePrompt:
    'We know little about this site. If you know it, we would like to hear from you.',
  contributeAction: 'Write to us',
  stopOf: (current: number, total: number) => `Stop ${current} of ${total}`,
  nextIn: (seconds: number) => `Next in ${seconds}s`,
  photoOf: (current: number, total: number) => `Photo ${current} of ${total}`,
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
export type UiStrings = {
  [K in keyof typeof UI_TEXT_EN]: (typeof UI_TEXT_EN)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string;
};

export type UiStringKey = keyof UiStrings;

/**
 * The loaded string tables, keyed by language.
 *
 * Same shape it always had — `UI_TEXT.en.siteTitle`, `keyof (typeof UI_TEXT)['en']`
 * — so the fifty-odd call sites that read the *type* of the English table are
 * untouched. What changed is that `ur` is now `UiStrings | undefined`: it is
 * absent until `loadUiStrings('ur')` resolves.
 *
 * `t()` and `tFn()` already fell back to English for a missing table, which is
 * what makes this safe to do at all — and is also exactly the flash that must
 * never be seen, so `main.tsx` awaits the active language's table before the
 * first render rather than relying on the fallback. The fallback is the safety
 * net, not the plan.
 */
export const UI_TEXT: { en: UiStrings; ur?: UiStrings } = { en: UI_TEXT_EN };

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
      if (table) UI_TEXT[lang] = table;
    })
    .catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] interface strings for "${lang}" failed to load`, error);
      }
    });
  inflight.set(lang, promise);
  return promise;
}

export function t(lang: Lang, key: keyof (typeof UI_TEXT)['en']): string {
  const text = UI_TEXT[lang]?.[key] ?? UI_TEXT.en[key];
  if (typeof text === 'function') return '';
  return String(text ?? '');
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
export function tFn(lang: Lang, key: 'orderSpan', from: string, to: string): string;
export function tFn(lang: Lang, key: 'graphLineageScopeOrder', order: string, n: number): string;
export function tFn(lang: Lang, key: 'graphLineageScopeAll', n: number): string;
export function tFn(lang: Lang, key: 'graphLineageUnaffiliated', n: number): string;
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
export function tFn(lang: Lang, key: 'coverageEntriesNoun', n: number): string;
export function tFn(lang: Lang, key: 'coverageRestsEntryCount', n: number): string;
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
export function tFn(lang: Lang, key: 'coverageRestsTail', n: number): string;
export function tFn(lang: Lang, key: 'almanacCoverageTotal', dated: number, total: number): string;
/* String-valued interpolations. These exist for the same reason the numeric
   ones do: a label like "Category: X" or "Map showing location of X" puts its
   variable in a different place in Urdu, and a component that concatenates the
   pieces itself decides that placement in English. */
export function tFn(lang: Lang, key: 'ariaCategoryOf', category: string): string;
export function tFn(lang: Lang, key: 'mapLayerFrom', name: string, provider: string): string;
export function tFn(lang: Lang, key: 'paletteResultCount', shown: number, total: number): string;
export function tFn(lang: Lang, key: 'tourCount', n: number): string;
export function tFn(lang: Lang, key: 'placeSiteCount', n: number): string;
export function tFn(lang: Lang, key: 'placeSpan', from: number, to: number): string;
export function tFn(lang: Lang, key: 'placesUnplaced', n: number): string;
export function tFn(lang: Lang, key: 'ariaMapShowing', name: string): string;
export function tFn(lang: Lang, key: 'ariaExternalMapShowing', name: string): string;
export function tFn(lang: Lang, key: 'galleryImageLabel', index: number, action: string): string;
export function tFn(
  lang: Lang,
  key:
    | 'resultCount'
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
    | 'graphFigureFilterCount'
    | 'sharedGroundIntro'
    | 'sharedGroundIntroSame'
    | 'coverageEntriesNoun'
    | 'coverageRestsEntryCount'
    | 'aboutTrustLineage'
    | 'aboutTrustMemberships'
    | 'graphLineageOnlyTeacherOf'
    | 'graphLineageOnlyTeacherOfMore'
    | 'graphLineageOnlyDiscipleOf'
    | 'graphLineageOnlyDiscipleOfMore'
    | 'coverageRestsTail'
    | 'almanacCoverageTotal'
    | 'ariaCategoryOf'
    | 'mapLayerFrom'
    | 'paletteResultCount'
    | 'tourCount'
    | 'placeSiteCount'
    | 'placeSpan'
    | 'placesUnplaced'
    | 'ariaMapShowing'
    | 'ariaExternalMapShowing'
    | 'galleryImageLabel',
  ...args: (number | string)[]
): string {
  const fn = UI_TEXT[lang]?.[key] ?? UI_TEXT.en[key];
  if (typeof fn === 'function') return (fn as (...a: (number | string)[]) => string)(...args);
  return String(fn ?? '');
}
