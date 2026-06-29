/* global Papa */

const CSV_FILE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";

const IMAGE_KEYS = new Set([
  "Image Link",
  "Image",
  "image",
  "image_url",
  "photo",
  "photo_url",
]);
const NON_DETAIL_KEYS = new Set(["Latitude", "Longitude", ...IMAGE_KEYS]);
const LEAD_PARAGRAPH_KEYS = ["Description", "About", "Paragraph", "Summary"];
const ARTICLE_SECTION_DEFINITIONS = [
  {
    id: "history",
    field: "History",
    title: { en: "History", ur: "\u062a\u0627\u0631\u06cc\u062e" },
  },
  {
    id: "architecture",
    field: "Architecture",
    title: { en: "Architecture", ur: "\u0645\u0639\u0645\u0627\u0631\u06cc" },
  },
  {
    id: "rituals",
    field: "Rituals",
    title: { en: "Rituals", ur: "\u0631\u0633\u0648\u0645\u0627\u062a" },
  },
  {
    id: "biography",
    field: "Saint Biography",
    title: {
      en: "Saint Biography",
      ur: "\u0633\u0648\u0627\u0646\u062d \u062d\u06cc\u0627\u062a",
    },
  },
  {
    id: "events",
    field: "Events & Urs",
    title: {
      en: "Events & Urs",
      ur: "\u062a\u0642\u0631\u06cc\u0628\u0627\u062a \u0627\u0648\u0631 \u0639\u0631\u0633",
    },
  },
  {
    id: "visiting",
    field: "Visiting Info",
    title: {
      en: "Visiting Info",
      ur: "\u0632\u06cc\u0627\u0631\u062a \u06a9\u06cc \u0645\u0639\u0644\u0648\u0645\u0627\u062a",
    },
  },
  {
    id: "sources",
    field: "Sources",
    title: { en: "Sources", ur: "\u062d\u0648\u0627\u0644\u06c1 \u062c\u0627\u062a" },
  },
];
const ARTICLE_SECTION_KEYS = ARTICLE_SECTION_DEFINITIONS.map(({ field }) => field);
const ARTICLE_SECTION_KEY_LOOKUP = new Set(
  ARTICLE_SECTION_KEYS.map((key) => String(key).toLowerCase()),
);
const GALLERY_SECTION_TITLE = {
  en: "Gallery",
  ur: "\u06af\u06cc\u0644\u0631\u06cc",
};
const GALLERY_EDITOR_SLOT_COUNT = 4;
const GALLERY_EDITOR_SLOTS = Array.from(
  { length: GALLERY_EDITOR_SLOT_COUNT },
  (_, index) => ({
    index: index + 1,
    imageField: `Gallery ${index + 1} Image`,
    captionField: `Gallery ${index + 1} Caption`,
  }),
);
const EDITOR_GALLERY_FIELD_KEYS = GALLERY_EDITOR_SLOTS.flatMap(
  ({ imageField, captionField }) => [imageField, captionField],
);
const LANGUAGE_STORAGE_KEY = "shrines_language";
const TRANSLATION_CACHE_STORAGE_KEY = "shrines_translation_cache_v3";
const LOW_RES_MIN_WIDTH_PX = 1100;
const LOW_RES_MIN_PIXEL_AREA = 900000;
const LOW_RES_SCALE_RATIO = 0.6;
const INFOBOX_PRIORITY_KEYS = [
  "Category",
  "Type",
  "Location",
  "District",
  "Province",
  "Region",
  "City",
  "Founded",
  "Sufi Saint",
  "Saint",
];
const SUMMARY_META_KEYS = ["Location", "Founded", "Sufi Saint"];
const MAX_INFOBOX_ROWS = 8;
const EDITOR_CORE_KEYS = new Set([
  "Name",
  "Category",
  "Location",
  "Latitude",
  "Longitude",
  "Founded",
  "Sufi Saint",
  "Image Link",
  ...LEAD_PARAGRAPH_KEYS,
  ...ARTICLE_SECTION_KEYS,
  ...EDITOR_GALLERY_FIELD_KEYS,
]);
const UI_TEXT = {
  en: {
    loading: "Loading shrine details...",
    backToMap: "Back to map",
    share: "Share",
    copied: "Copied",
    editorLogin: "Admin Login",
    editorLogout: "Log Out",
    editorOpen: "Edit Page",
    editorPanelTitle: "Edit Shrine",
    editorSave: "Save Changes",
    editorSaveLocal: "Save Locally",
    editorSaveToSheet: "Save to Google Sheet",
    editorCancel: "Cancel",
    editorReset: "Reset Local Changes",
    editorPasswordPrompt: "Enter the editor password",
    editorPasswordFailed: "Incorrect password.",
    editorLocalNotice: "Edits are stored only in this browser on this device.",
    editorSheetNotice:
      "Connect a Google Apps Script web app in editor-config.js to enable Google Sheet saves.",
    editorSheetEnabledNotice: "Google Sheet saving is active for this site.",
    editorSavingLocal: "Saving local changes...",
    editorSavingToSheet: "Saving to Google Sheet...",
    editorSaved: "Changes saved. Reloading page...",
    editorSavedLocal: "Local changes saved. Reloading page...",
    editorSavedToSheet: "Saved to Google Sheet. Reloading page...",
    editorSavedToSheetMirrored:
      "Saved to Google Sheet and mirrored locally while the published sheet refreshes. Reloading page...",
    editorSheetUnavailable: "Google Sheet saving is not configured yet.",
    editorSaveFailedPrefix: "Save failed:",
    editorNameRequired: "Name is required.",
    editorResetConfirm:
      "Reset this shrine back to the Google Sheet version for this browser?",
    editorExtraFields: "Additional Facts",
    editorExtraFieldsHint:
      "Use one line per fact in this format: Field: Value",
    viewMapSection: "View map section",
    openFullMap: "Open full map",
    copyCoordinates: "Copy coordinates",
    coordinatesCopied: "Coordinates copied",
    coordinatesLabel: "Coordinates",
    imageExpand: "Open image",
    closeImage: "Close image",
    contents: "Contents",
    overview: "Overview",
    descriptionSection: "Description",
    descriptionPlaceholder:
      "Add text to the Description column and it will appear here.",
    details: "Details",
    locationMap: "Location Map",
    getDirections: "Get Directions",
    relatedShrines: "Related Shrines",
    shrineFacts: "Shrine facts",
    distanceKm: "km away",
    noImage:
      'No image found. Add an "Image Link" value in your sheet.',
    imageLoadFailed: "Image failed to load. Check Image Link in your sheet.",
    invalidId: "Invalid shrine id.",
    notFound: "Shrine not found.",
    failedToLoadPrefix: "Failed to load data:",
  },
  ur: {
    loading: "مزار کی تفصیلات لوڈ ہو رہی ہیں...",
    backToMap: "نقشے پر واپس جائیں",
    share: "شیئر",
    copied: "کاپی ہو گیا",
    editorLogin: "\u0627\u06cc\u0688\u0645\u0646 \u0644\u0627\u06af \u0627\u0646",
    editorLogout: "\u0644\u0627\u06af \u0622\u0624\u0679",
    editorOpen: "\u0635\u0641\u062d\u06c1 \u0627\u06cc\u0688\u0679 \u06a9\u0631\u06cc\u06ba",
    editorPanelTitle: "\u0645\u0632\u0627\u0631 \u0627\u06cc\u0688\u0679 \u06a9\u0631\u06cc\u06ba",
    editorSave: "\u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0633\u06cc\u0648 \u06a9\u0631\u06cc\u06ba",
    editorSaveLocal: "\u0645\u0642\u0627\u0645\u06cc \u0637\u0648\u0631 \u067e\u0631 \u0645\u062d\u0641\u0648\u0638 \u06a9\u0631\u06cc\u06ba",
    editorSaveToSheet:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0645\u06cc\u06ba \u0645\u062d\u0641\u0648\u0638 \u06a9\u0631\u06cc\u06ba",
    editorCancel: "\u0645\u0646\u0633\u0648\u062e",
    editorReset: "\u0645\u0642\u0627\u0645\u06cc \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0631\u06cc \u0633\u06cc\u0679 \u06a9\u0631\u06cc\u06ba",
    editorPasswordPrompt:
      "\u0627\u06cc\u0688\u06cc\u0679\u0631 \u067e\u0627\u0633 \u0648\u0631\u0688 \u062f\u0631\u062c \u06a9\u0631\u06cc\u06ba",
    editorPasswordFailed: "\u067e\u0627\u0633 \u0648\u0631\u0688 \u063a\u0644\u0637 \u06c1\u06d2\u06d4",
    editorLocalNotice:
      "\u06cc\u06c1 \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0635\u0631\u0641 \u0627\u0633 \u0628\u0631\u0627\u0624\u0632\u0631 \u0627\u0648\u0631 \u0627\u0633 \u0688\u06cc\u0648\u0627\u0626\u0633 \u0645\u06cc\u06ba \u0633\u06cc\u0648 \u06c1\u0648\u06ba \u06af\u06cc\u06d4",
    editorSheetNotice:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0633\u06cc\u0648 \u0686\u0627\u0644\u0648 \u06a9\u0631\u0646\u06d2 \u06a9\u06d2 \u0644\u06cc\u06d2 editor-config.js \u0645\u06cc\u06ba Google Apps Script \u0648\u06cc\u0628 \u0627\u06cc\u067e \u062c\u0648\u0691\u06cc\u06ba\u06d4",
    editorSheetEnabledNotice:
      "\u0627\u0633 \u0633\u0627\u0626\u0679 \u06a9\u06d2 \u0644\u06cc\u06d2 \u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0633\u06cc\u0648 \u0641\u0639\u0627\u0644 \u06c1\u06d2\u06d4",
    editorSavingLocal:
      "\u0645\u0642\u0627\u0645\u06cc \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638 \u06a9\u06cc \u062c\u0627 \u0631\u06c1\u06cc \u06c1\u06cc\u06ba...",
    editorSavingToSheet:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0645\u06cc\u06ba \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638 \u06a9\u06cc \u062c\u0627 \u0631\u06c1\u06cc \u06c1\u06cc\u06ba...",
    editorSaved:
      "\u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0633\u06cc\u0648 \u06c1\u0648 \u06af\u0626\u06cc\u06ba\u06d4 \u0635\u0641\u062d\u06c1 \u062f\u0648\u0628\u0627\u0631\u06c1 \u0644\u0648\u0688 \u06c1\u0648 \u0631\u06c1\u0627 \u06c1\u06d2\u06d4",
    editorSavedLocal:
      "\u0645\u0642\u0627\u0645\u06cc \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638 \u06c1\u0648 \u06af\u0626\u06cc\u06ba\u06d4 \u0635\u0641\u062d\u06c1 \u062f\u0648\u0628\u0627\u0631\u06c1 \u0644\u0648\u0688 \u06c1\u0648 \u0631\u06c1\u0627 \u06c1\u06d2\u06d4",
    editorSavedToSheet:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0645\u06cc\u06ba \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638 \u06c1\u0648 \u06af\u0626\u06cc\u06ba\u06d4 \u0635\u0641\u062d\u06c1 \u062f\u0648\u0628\u0627\u0631\u06c1 \u0644\u0648\u0688 \u06c1\u0648 \u0631\u06c1\u0627 \u06c1\u06d2\u06d4",
    editorSavedToSheetMirrored:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0645\u06cc\u06ba \u062a\u0628\u062f\u06cc\u0644\u06cc\u0627\u06ba \u0645\u062d\u0641\u0648\u0638 \u06c1\u0648 \u06af\u0626\u06cc\u06ba \u0627\u0648\u0631 \u0634\u0627\u0626\u0639 \u0634\u062f\u06c1 \u0634\u06cc\u0679 \u06a9\u06d2 \u062a\u0627\u0632\u06c1 \u06c1\u0648\u0646\u06d2 \u062a\u06a9 \u0645\u0642\u0627\u0645\u06cc \u0637\u0648\u0631 \u067e\u0631 \u0628\u06be\u06cc \u062f\u06a9\u06be\u0627\u0626\u06cc \u062c\u0627\u0626\u06cc\u06ba \u06af\u06cc\u06d4 \u0635\u0641\u062d\u06c1 \u062f\u0648\u0628\u0627\u0631\u06c1 \u0644\u0648\u0688 \u06c1\u0648 \u0631\u06c1\u0627 \u06c1\u06d2\u06d4",
    editorSheetUnavailable:
      "\u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0633\u06cc\u0648 \u0627\u0628\u06be\u06cc \u062a\u0631\u062a\u06cc\u0628 \u0646\u06c1\u06cc\u06ba \u062f\u06cc\u0627 \u06af\u06cc\u0627\u06d4",
    editorSaveFailedPrefix: "\u0645\u062d\u0641\u0648\u0638 \u06a9\u0631\u0646\u06d2 \u0645\u06cc\u06ba \u0645\u0633\u0626\u0644\u06c1 \u06c1\u0648\u0627:",
    editorNameRequired: "\u0646\u0627\u0645 \u0636\u0631\u0648\u0631\u06cc \u06c1\u06d2\u06d4",
    editorResetConfirm:
      "\u06a9\u06cc\u0627 \u0622\u067e \u0627\u0633 \u0645\u0632\u0627\u0631 \u06a9\u0648 \u0627\u0633 \u0628\u0631\u0627\u0624\u0632\u0631 \u0645\u06cc\u06ba \u0648\u0627\u067e\u0633 \u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u0648\u0627\u0644\u06d2 \u0648\u0631\u0698\u0646 \u067e\u0631 \u0644\u0627\u0646\u0627 \u0686\u0627\u06c1\u062a\u06d2 \u06c1\u06cc\u06ba\u061f",
    editorExtraFields: "\u0627\u0636\u0627\u0641\u06cc \u062d\u0642\u0627\u0626\u0642",
    editorExtraFieldsHint:
      "\u06c1\u0631 \u0633\u0637\u0631 \u06a9\u0648 \u0627\u0633 \u0637\u0631\u062d \u0644\u06a9\u06be\u06cc\u06ba: \u0641\u06cc\u0644\u0688: \u0648\u06cc\u0644\u06cc\u0648",
    viewMapSection: "\u0646\u0642\u0634\u06d2 \u0648\u0627\u0644\u06d2 \u062d\u0635\u06d2 \u067e\u0631 \u062c\u0627\u0626\u06cc\u06ba",
    openFullMap: "\u067e\u0648\u0631\u0627 \u0646\u0642\u0634\u06c1 \u06a9\u06be\u0648\u0644\u06cc\u06ba",
    copyCoordinates: "\u06a9\u0648\u0622\u0631\u0688\u06cc\u0646\u06cc\u0679\u0633 \u06a9\u0627\u067e\u06cc \u06a9\u0631\u06cc\u06ba",
    coordinatesCopied: "\u06a9\u0648\u0622\u0631\u0688\u06cc\u0646\u06cc\u0679\u0633 \u06a9\u0627\u067e\u06cc \u06c1\u0648 \u06af\u0626\u06d2",
    coordinatesLabel: "\u06a9\u0648\u0622\u0631\u0688\u06cc\u0646\u06cc\u0679\u0633",
    imageExpand: "\u062a\u0635\u0648\u06cc\u0631 \u06a9\u06be\u0648\u0644\u06cc\u06ba",
    closeImage: "\u062a\u0635\u0648\u06cc\u0631 \u0628\u0646\u062f \u06a9\u0631\u06cc\u06ba",
    contents: "\u0645\u0636\u0645\u0648\u0646\u0627\u062a",
    overview: "\u062e\u0644\u0627\u0635\u06c1",
    descriptionSection: "\u062a\u0648\u0636\u06cc\u062d",
    descriptionPlaceholder:
      "\u0627\u067e \u06af\u0648\u06af\u0644 \u0634\u06cc\u0679 \u06a9\u06d2 Description \u06a9\u0627\u0644\u0645 \u0645\u06cc\u06ba \u0645\u062a\u0646 \u0634\u0627\u0645\u0644 \u06a9\u0631\u06cc\u06ba \u062a\u0648 \u0648\u06c1 \u06cc\u06c1\u0627\u06ba \u0646\u0638\u0631 \u0622\u0626\u06d2 \u06af\u0627\u06d4",
    details: "\u062a\u0641\u0635\u06cc\u0644\u0627\u062a",
    locationMap: "موقع کا نقشہ",
    getDirections: "راستہ حاصل کریں",
    relatedShrines: "متعلقہ مزارات",
    shrineFacts: "\u0645\u0632\u0627\u0631 \u06a9\u06cc \u0627\u06c1\u0645 \u0628\u0627\u062a\u06cc\u06ba",
    distanceKm: "کلو میٹر دور",
    noImage: 'تصویر نہیں ملی۔ اپنی شیٹ میں "Image Link" شامل کریں۔',
    imageLoadFailed: "تصویر لوڈ نہیں ہوئی۔ اپنی شیٹ میں Image Link چیک کریں۔",
    invalidId: "مزار کا آئی ڈی درست نہیں ہے۔",
    notFound: "مزار نہیں ملا۔",
    failedToLoadPrefix: "ڈیٹا لوڈ نہیں ہوا:",
  },
};
const SPECIAL_URDU_PHRASES = {
  "Muslim Shrine": "مسلم مزار",
  "Sikh Gurdwara": "سکھ گردوارہ",
  "Hindu Temple": "ہندو مندر",
  "Annual urs": "سالانہ عرس",
  "No events scheduled right now": "فی الحال کوئی تقریب طے نہیں",
  "Qawwali on Thursdays between Zuhr and Asr":
    "جمعرات کو ظہر اور عصر کے درمیان قوالی",
};
const WORD_URDU_MAP = {
  active: "فعال",
  and: "اور",
  annual: "سالانہ",
  around: "تقریباً",
  asr: "عصر",
  associated: "منسوب",
  balochistan: "بلوچستان",
  between: "کے درمیان",
  capital: "دارالحکومت",
  ce: "عیسوی",
  century: "صدی",
  city: "شہر",
  completed: "مکمل",
  complex: "کمپلیکس",
  constructed: "تعمیر شدہ",
  commissioned: "تعمیر کروایا گیا",
  district: "ضلع",
  dargah: "درگاہ",
  early: "اوائل",
  eidgah: "عیدگاہ",
  events: "تقریبات",
  founded: "تاسیس",
  ghazi: "غازی",
  gurdwara: "گردوارہ",
  hindu: "ہندو",
  islamabad: "اسلام آباد",
  island: "جزیرہ",
  karachi: "کراچی",
  kashmir: "کشمیر",
  khyber: "خیبر",
  lahore: "لاہور",
  likely: "غالباً",
  location: "مقام",
  mausoleum: "مقبرہ",
  month: "مہینہ",
  mosque: "مسجد",
  multan: "ملتان",
  muslim: "مسلم",
  name: "نام",
  national: "قومی",
  near: "قریب",
  no: "نہیں",
  now: "اب",
  of: "کا",
  on: "کو",
  onwards: "سے آگے",
  opened: "افتتاح",
  pakhtunkhwa: "پختونخوا",
  pakistan: "پاکستان",
  paragraph: "پیراگراف",
  park: "پارک",
  peshawar: "پشاور",
  punjab: "پنجاب",
  qawwali: "قوالی",
  right: "فی الحال",
  road: "روڈ",
  saint: "بزرگ",
  scheduled: "طے شدہ",
  sharif: "شریف",
  shrine: "مزار",
  sikh: "سکھ",
  sindh: "سندھ",
  site: "جگہ",
  sufi: "صوفی",
  temple: "مندر",
  territory: "علاقہ",
  thursdays: "جمعرات",
  tomb: "مقبرہ",
  urs: "عرس",
  valley: "وادی",
  with: "کے ساتھ",
  zuhr: "ظہر",
};
const DIGRAPH_URDU_MAP = {
  aa: "ا",
  ae: "ی",
  ai: "ے",
  ay: "ے",
  bh: "بھ",
  ch: "چ",
  dh: "دھ",
  gh: "غ",
  kh: "خ",
  oo: "و",
  ou: "او",
  ow: "اؤ",
  ph: "ف",
  sh: "ش",
  th: "تھ",
  zh: "ژ",
};
const CHAR_URDU_MAP = {
  a: "ا",
  b: "ب",
  c: "ک",
  d: "د",
  e: "ے",
  f: "ف",
  g: "گ",
  h: "ہ",
  i: "ی",
  j: "ج",
  k: "ک",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "پ",
  q: "ق",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "و",
  w: "و",
  x: "کس",
  y: "ی",
  z: "ز",
};

const pageEl = document.getElementById("shrinePage");
const langParam = new URLSearchParams(window.location.search).get("lang");
const initialLang =
  langParam === "en" || langParam === "ur"
    ? langParam
    : localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      (navigator.language && navigator.language.toLowerCase().startsWith("ur")
        ? "ur"
        : "en");
const currentLang = initialLang === "ur" ? "ur" : "en";
let heroResizeHandler = null;
const seedTranslations =
  typeof window !== "undefined" &&
  window.SHRINE_TRANSLATIONS &&
  typeof window.SHRINE_TRANSLATIONS === "object"
    ? window.SHRINE_TRANSLATIONS
    : {};

function loadPersistedTranslationMap() {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const translationCache = new Map(
  Object.entries({
    ...loadPersistedTranslationMap(),
    ...seedTranslations,
  }),
);

function persistTranslationCache() {
  try {
    localStorage.setItem(
      TRANSLATION_CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(translationCache)),
    );
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

function t(key) {
  return UI_TEXT[currentLang]?.[key] || UI_TEXT.en[key] || "";
}

function applyLanguageLayout() {
  const isRtl = currentLang === "ur";
  document.documentElement.classList.toggle("lang-rtl", isRtl);
  document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", isRtl ? "ur" : "en");
  document.body.classList.toggle("lang-rtl", isRtl);
  document.body.setAttribute("dir", isRtl ? "rtl" : "ltr");
  if (pageEl) {
    pageEl.setAttribute("dir", isRtl ? "rtl" : "ltr");
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;

  let url = String(rawUrl).trim();
  if (!url) return null;

  if (url.startsWith("//")) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;

  return url;
}

function normalizeRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = String(key).trim();
    normalized[normalizedKey] = typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function parseLatLng(row) {
  const lat = Number.parseFloat(row?.Latitude);
  const lng = Number.parseFloat(row?.Longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getShrinePageUrl(idx) {
  return `./shrine.html?id=${encodeURIComponent(idx)}&lang=${encodeURIComponent(
    currentLang,
  )}`;
}

function buildDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${lat},${lng}`,
  )}`;
}

function buildMiniMapEmbedUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    `${lat},${lng}`,
  )}&z=15&output=embed`;
}

function buildGoogleMapUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lng}`,
  )}`;
}

function formatCoordinateValue(value) {
  return Number.isFinite(value) ? value.toFixed(5) : "";
}

function formatCoordinatePair(latLng) {
  if (!latLng) return "";
  return `${formatCoordinateValue(latLng.lat)}, ${formatCoordinateValue(latLng.lng)}`;
}

async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to a hidden textarea when direct clipboard access is unavailable.
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  helper.style.pointerEvents = "none";
  helper.style.inset = "0";
  document.body.appendChild(helper);
  helper.focus();
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  helper.remove();
  return copied;
}

function haversineKm(fromLat, fromLng, toLat, toLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getFieldValue(row, baseKey) {
  const value = row?.[baseKey];
  if (value !== null && value !== undefined && String(value).trim()) return value;
  return "";
}

function getUrduFieldValue(row, baseKey) {
  const urduCandidates = [
    `${baseKey} Urdu`,
    `${baseKey}_ur`,
    `${baseKey} (Urdu)`,
    `${baseKey} UR`,
    `Urdu ${baseKey}`,
  ];

  if (baseKey === "Name") {
    urduCandidates.unshift("Urdu Name", "Name (Urdu)", "NameUrdu");
  }

  for (const key of urduCandidates) {
    const value = getFieldValue(row, key);
    if (value) return value;
  }

  return "";
}

function getLocalizedFieldValue(row, baseKey) {
  if (currentLang !== "ur") return getFieldValue(row, baseKey);
  const urduValue = getUrduFieldValue(row, baseKey);
  if (urduValue) return urduValue;
  return translateCachedTextToUrdu(getFieldValue(row, baseKey));
}

function isUrduVariantKey(key) {
  return /urdu|_ur|\(urdu\)|\bur\b/i.test(String(key || ""));
}

function findCachedTranslation(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";

  const exact = translationCache.get(raw);
  if (exact) return exact;

  const lowered = raw.toLowerCase();
  for (const [key, value] of translationCache.entries()) {
    if (String(key).toLowerCase() === lowered) return value;
  }

  return "";
}

function transliterateWordToUrdu(word) {
  const source = String(word || "");
  if (!source) return "";

  const lower = source.toLowerCase();
  let i = 0;
  let result = "";
  while (i < lower.length) {
    const digraph = lower.slice(i, i + 2);
    if (DIGRAPH_URDU_MAP[digraph]) {
      result += DIGRAPH_URDU_MAP[digraph];
      i += 2;
      continue;
    }

    const char = lower[i];
    result += CHAR_URDU_MAP[char] || source[i] || "";
    i += 1;
  }

  return result;
}

function buildUrduFallback(rawText) {
  const raw = String(rawText ?? "").trim();
  if (!raw) return "";
  if (!/[A-Za-z]/.test(raw)) return raw;

  const special = SPECIAL_URDU_PHRASES[raw];
  if (special) return special;

  const centuryMatch = raw.match(/^(\d+)(st|nd|rd|th)\s+century$/i);
  if (centuryMatch) return `${centuryMatch[1]}ویں صدی`;

  const tokens = raw.match(/[A-Za-z]+|\d+|[^A-Za-z\d]+/g) || [];
  const translated = tokens
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) {
        return token.replace(/,/g, "،");
      }

      const lower = token.toLowerCase();
      const known = WORD_URDU_MAP[lower];
      if (known) return known;

      return transliterateWordToUrdu(token);
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+،/g, "،")
    .trim();

  return translated || raw;
}

function translateCachedTextToUrdu(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  if (currentLang !== "ur") return raw;
  if (isLikelyUrl(raw)) return raw;
  if (!/[A-Za-z]/.test(raw)) return raw;

  const cached = findCachedTranslation(raw);
  if (cached && !/[A-Za-z]/.test(cached)) return cached;

  const generated = buildUrduFallback(raw);
  if (generated && generated !== raw) {
    translationCache.set(raw, generated);
    persistTranslationCache();
    return generated;
  }

  return raw;
}

async function translateTextToUrdu(text) {
  return translateCachedTextToUrdu(text);
}

async function getAutoLocalizedFieldValue(row, baseKey) {
  const urduValue = getUrduFieldValue(row, baseKey);
  if (urduValue) return urduValue;
  const baseValue = getFieldValue(row, baseKey);
  if (currentLang !== "ur") return baseValue;
  return translateCachedTextToUrdu(baseValue);
}

function getMapPageUrl() {
  return `./index.html?lang=${encodeURIComponent(currentLang)}`;
}

function getLanguageToggleLabel() {
  return currentLang === "ur" ? "English" : "\u0627\u0631\u062f\u0648";
}

function getBackArrowHtml() {
  return currentLang === "ur" ? "&rarr;" : "&larr;";
}

function getLanguageToggleAriaLabel() {
  return currentLang === "ur"
    ? "Switch language to English"
    : "\u0632\u0628\u0627\u0646 \u0627\u0631\u062f\u0648 \u0645\u06cc\u06ba \u062a\u0628\u062f\u06cc\u0644 \u06a9\u0631\u06cc\u06ba";
}

function initLanguageToggle() {
  applyLanguageLayout();
  const languageToggleEl = document.getElementById("shrineLanguageToggle");
  if (!languageToggleEl) return;

  languageToggleEl.textContent = getLanguageToggleLabel();
  languageToggleEl.setAttribute("aria-label", getLanguageToggleAriaLabel());

  languageToggleEl.addEventListener("click", () => {
    const nextLang = currentLang === "ur" ? "en" : "ur";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    const params = new URLSearchParams(window.location.search);
    params.set("lang", nextLang);
    window.location.search = params.toString();
  });
}

function setInitialLoadingMessage() {
  const loadingEl = pageEl.querySelector(".muted");
  if (loadingEl) loadingEl.textContent = t("loading");
}

function formatDistanceLabel(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  const rounded = distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0);
  return `${rounded} ${t("distanceKm")}`;
}

function getLocalizedStaticLabel(value) {
  if (value && typeof value === "object") {
    return value[currentLang] || value.en || "";
  }

  return String(value || "");
}

function isArticleSectionKey(key) {
  return ARTICLE_SECTION_KEY_LOOKUP.has(String(key || "").trim().toLowerCase());
}

function isGalleryImageKey(key) {
  const normalized = String(key || "").trim();
  return (
    /^Gallery\s*\d+\s*(Image|Photo|Link|Url)$/i.test(normalized) ||
    /^(Image|Photo)\s*\d+$/i.test(normalized)
  );
}

function isGalleryCaptionKey(key) {
  const normalized = String(key || "").trim();
  return (
    /^Gallery\s*\d+\s*(Caption|Title)$/i.test(normalized) ||
    /^(Image|Photo)\s*\d+\s*(Caption|Title)$/i.test(normalized) ||
    /^Caption\s*\d+$/i.test(normalized)
  );
}

function isGalleryKey(key) {
  return isGalleryImageKey(key) || isGalleryCaptionKey(key);
}

function isStructuredArticleKey(key) {
  return LEAD_PARAGRAPH_KEYS.includes(key) || isArticleSectionKey(key) || isGalleryKey(key);
}

function isEditorProtectedKey(key) {
  return isUrduVariantKey(key) || EDITOR_CORE_KEYS.has(key) || isGalleryKey(key);
}

function getGalleryIndexFromKey(key) {
  const normalized = String(key || "").trim();
  const galleryMatch = normalized.match(
    /^Gallery\s*(\d+)\s*(Image|Photo|Link|Url|Caption|Title)$/i,
  );
  if (galleryMatch) return Number.parseInt(galleryMatch[1], 10);

  const imageMatch = normalized.match(/^(Image|Photo)\s*(\d+)(?:\s*(Caption|Title))?$/i);
  if (imageMatch) return Number.parseInt(imageMatch[2], 10);

  const captionMatch = normalized.match(/^Caption\s*(\d+)$/i);
  if (captionMatch) return Number.parseInt(captionMatch[1], 10);

  return null;
}

function getGalleryImageFieldCandidates(index) {
  return [
    `Gallery ${index} Image`,
    `Gallery ${index} Photo`,
    `Gallery ${index} Link`,
    `Gallery ${index} Url`,
    `Image ${index}`,
    `Photo ${index}`,
  ];
}

function getGalleryCaptionFieldCandidates(index) {
  return [
    `Gallery ${index} Caption`,
    `Gallery ${index} Title`,
    `Image ${index} Caption`,
    `Image ${index} Title`,
    `Photo ${index} Caption`,
    `Photo ${index} Title`,
    `Caption ${index}`,
  ];
}

function getFirstFieldValue(row, candidateKeys) {
  for (const key of candidateKeys || []) {
    const value = getFieldValue(row, key);
    if (value) return value;
  }

  return "";
}

function getPrimaryImageUrl(row) {
  return normalizeUrl(
    row["Image Link"] || row.Image || row.image || row.image_url || row.photo || row.photo_url,
  );
}

function getVisibleEntries(row) {
  return Object.entries(row)
    .filter(([key, value]) => {
      if (
        String(key || "").startsWith("_") ||
        NON_DETAIL_KEYS.has(key) ||
        key === "Name" ||
        isStructuredArticleKey(key) ||
        isUrduVariantKey(key) ||
        value === null ||
        value === undefined
      ) {
        return false;
      }

      return Boolean(String(value).trim());
    })
    .map(([key, value]) => ({
      key,
      value: String(value).trim(),
    }));
}

function findEntryByKeys(entries, keys) {
  const lookup = new Set((keys || []).map((key) => String(key).toLowerCase()));
  return (
    entries.find((entry) => lookup.has(String(entry.key || "").toLowerCase())) || null
  );
}

function pickPriorityEntries(entries, priorityKeys, limit = MAX_INFOBOX_ROWS) {
  const selected = [];
  const usedKeys = new Set();

  (priorityKeys || []).forEach((priorityKey) => {
    const match = entries.find(
      (entry) =>
        !usedKeys.has(entry.key) &&
        String(entry.key || "").toLowerCase() === String(priorityKey).toLowerCase(),
    );

    if (match) {
      selected.push(match);
      usedKeys.add(match.key);
    }
  });

  entries.forEach((entry) => {
    if (selected.length >= limit || usedKeys.has(entry.key)) return;
    selected.push(entry);
    usedKeys.add(entry.key);
  });

  return selected.slice(0, limit);
}

function buildSummaryMeta(entries, excludedValues = []) {
  const meta = [];
  const seenValues = new Set(
    (excludedValues || []).map((value) => String(value || "").trim()).filter(Boolean),
  );

  SUMMARY_META_KEYS.forEach((key) => {
    const match = findEntryByKeys(entries, [key]);
    const value = String(match?.localizedValue || "").trim();
    if (!value || seenValues.has(value)) return;

    meta.push(value);
    seenValues.add(value);
  });

  return meta;
}

function isEditorEnabled() {
  return (
    typeof ShrineDataSource !== "undefined" &&
    ShrineDataSource &&
    typeof ShrineDataSource.isEditorEnabled === "function" &&
    ShrineDataSource.isEditorEnabled()
  );
}

function isEditorAuthenticated() {
  return (
    isEditorEnabled() &&
    typeof ShrineDataSource.isEditorAuthenticated === "function" &&
    ShrineDataSource.isEditorAuthenticated()
  );
}

function canSaveToGoogleSheet() {
  return (
    isEditorEnabled() &&
    typeof ShrineDataSource.isGoogleSheetsSaveEnabled === "function" &&
    ShrineDataSource.isGoogleSheetsSaveEnabled()
  );
}

function getEditorLocalNotice() {
  if (
    isEditorEnabled() &&
    typeof ShrineDataSource.getEditorConfig === "function"
  ) {
    return ShrineDataSource.getEditorConfig()?.localOnlyNotice || t("editorLocalNotice");
  }

  return t("editorLocalNotice");
}

function getEditorSheetNotice() {
  if (
    isEditorEnabled() &&
    typeof ShrineDataSource.getEditorConfig === "function"
  ) {
    const config = ShrineDataSource.getEditorConfig();
    const customNotice = String(config?.googleSheets?.saveNotice || "").trim();
    if (customNotice) return customNotice;
  }

  return canSaveToGoogleSheet()
    ? t("editorSheetEnabledNotice")
    : t("editorSheetNotice");
}

function getEditableExtraText(row) {
  return Object.entries(row || {})
    .filter(([key, value]) => {
      if (!key || key.startsWith("_")) return false;
      if (isEditorProtectedKey(key)) return false;
      if (value === null || value === undefined) return false;
      return Boolean(String(value).trim());
    })
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .join("\n");
}

function parseEditorExtraText(text) {
  const extraFields = {};

  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIdx = line.indexOf(":");
      if (separatorIdx <= 0) return;

      const key = line.slice(0, separatorIdx).trim();
      const value = line.slice(separatorIdx + 1).trim();
      if (!key || !value) return;
      extraFields[key] = value;
    });

  return extraFields;
}

function buildEditedRow(baseRow, formData) {
  const nextRow = {};

  Object.entries(baseRow || {}).forEach(([key, value]) => {
    if (!key || key.startsWith("_")) return;
    nextRow[key] = value;
  });

  Object.keys(nextRow).forEach((key) => {
    if (isEditorProtectedKey(key)) return;
    delete nextRow[key];
  });

  nextRow.Name = String(formData.get("name") || "").trim();
  nextRow.Category = String(formData.get("category") || "").trim();
  nextRow.Location = String(formData.get("location") || "").trim();
  nextRow.Latitude = String(formData.get("latitude") || "").trim();
  nextRow.Longitude = String(formData.get("longitude") || "").trim();
  nextRow.Founded = String(formData.get("founded") || "").trim();
  nextRow["Sufi Saint"] = String(formData.get("sufiSaint") || "").trim();
  nextRow["Image Link"] = String(formData.get("imageLink") || "").trim();

  LEAD_PARAGRAPH_KEYS.forEach((key) => {
    nextRow[key] = "";
  });
  nextRow.Description = String(formData.get("description") || "").trim();

  ARTICLE_SECTION_DEFINITIONS.forEach(({ id, field }) => {
    nextRow[field] = String(formData.get(`article_${id}`) || "").trim();
  });

  GALLERY_EDITOR_SLOTS.forEach(({ index, imageField, captionField }) => {
    nextRow[imageField] = String(formData.get(`gallery_${index}_image`) || "").trim();
    nextRow[captionField] = String(
      formData.get(`gallery_${index}_caption`) || "",
    ).trim();
  });

  Object.assign(
    nextRow,
    parseEditorExtraText(String(formData.get("extraFields") || "")),
  );

  return normalizeRow(nextRow);
}

function splitTextIntoBlocks(text) {
  return String(text || "")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripHeadingMarkup(text) {
  return String(text || "")
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^=+\s*(.*?)\s*=+$/, "$1")
    .replace(/^\*\*(.*?)\*\*$/, "$1")
    .replace(/^__(.*?)__$/, "$1")
    .trim();
}

function normalizeArticleHeading(text) {
  return stripHeadingMarkup(text)
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, " and ")
    .replace(/[：:]+$/u, "")
    .replace(/\s*[-–—]+\s*$/u, "")
    .trim()
    .toLowerCase();
}

function isExplicitArticleHeadingLine(line) {
  const rawLine = String(line || "").trim();
  if (!rawLine) return false;

  return /^#{1,6}\s+\S/u.test(rawLine) || /^=+\s*\S.*\s*=+\s*$/u.test(rawLine);
}

function createArticleSectionId(label, usedIds = new Set()) {
  const baseId = String(label || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const stem = baseId || "section";
  let candidate = stem;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${stem}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function getArticleSectionHeadingCandidates(sectionDef) {
  const candidates = [sectionDef.field, sectionDef.title.en, sectionDef.title.ur];

  switch (sectionDef.id) {
    case "biography":
      candidates.push(
        "Biography",
        "Saint Life",
        "\u0633\u0648\u0627\u0646\u062d",
      );
      break;
    case "events":
      candidates.push(
        "Events and Urs",
        "Events",
        "Urs",
        "\u062a\u0642\u0631\u06cc\u0628\u0627\u062a",
        "\u0639\u0631\u0633",
      );
      break;
    case "visiting":
      candidates.push(
        "Visiting Information",
        "Visit Info",
        "Visitor Information",
      );
      break;
    case "sources":
      candidates.push("References", "Citations", "\u062d\u0648\u0627\u0644\u06d2");
      break;
    default:
      break;
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function detectArticleSectionHeading(line) {
  const rawLine = String(line || "").trim();
  const cleanedLine = stripHeadingMarkup(rawLine);
  const normalizedLine = normalizeArticleHeading(cleanedLine);
  if (!normalizedLine) return null;

  for (const sectionDef of ARTICLE_SECTION_DEFINITIONS) {
    const candidates = getArticleSectionHeadingCandidates(sectionDef);
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeArticleHeading(candidate);
      if (!normalizedCandidate) continue;

      if (normalizedLine === normalizedCandidate) {
        return {
          id: sectionDef.id,
          label: getLocalizedStaticLabel(sectionDef.title),
          inlineContent: "",
        };
      }

      const inlineMatch = cleanedLine.match(
        new RegExp(`^${escapeRegExp(candidate)}\\s*[:\\-–—]\\s*(.+)$`, "i"),
      );
      if (inlineMatch) {
        return {
          id: sectionDef.id,
          label: getLocalizedStaticLabel(sectionDef.title),
          inlineContent: String(inlineMatch[1] || "").trim(),
        };
      }
    }
  }

  if (isExplicitArticleHeadingLine(rawLine)) {
    return {
      id: "",
      label: cleanedLine,
      inlineContent: "",
    };
  }

  return null;
}

function parseHeadingBasedArticleText(text) {
  const blocks = splitTextIntoBlocks(text);
  if (!blocks.length) {
    return { leadText: "", sections: [] };
  }

  const leadBlocks = [];
  const usedSectionIds = new Set([
    ...ARTICLE_SECTION_DEFINITIONS.map(({ id }) => id),
    "gallery",
    "details",
    "location",
    "related",
  ]);
  const sectionOrder = [];
  const sectionBlocksById = new Map();
  let currentSectionId = null;
  let foundHeading = false;

  blocks.forEach((block) => {
    const lines = String(block || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const headingMatch = detectArticleSectionHeading(lines[0]);
    if (headingMatch) {
      foundHeading = true;
      currentSectionId =
        headingMatch.id || createArticleSectionId(headingMatch.label, usedSectionIds);
      if (!sectionBlocksById.has(currentSectionId)) {
        sectionOrder.push(currentSectionId);
        sectionBlocksById.set(currentSectionId, {
          id: currentSectionId,
          label: headingMatch.label,
          blocks: [],
        });
      }

      const remainder = [headingMatch.inlineContent, ...lines.slice(1)]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (remainder) {
        sectionBlocksById.get(currentSectionId).blocks.push(remainder);
      }
      return;
    }

    if (currentSectionId) {
      sectionBlocksById.get(currentSectionId)?.blocks.push(block);
      return;
    }

    leadBlocks.push(block);
  });

  if (!foundHeading) {
    return {
      leadText: blocks.join("\n\n"),
      sections: [],
    };
  }

  return {
    leadText: leadBlocks.join("\n\n").trim(),
    sections: sectionOrder
      .map((sectionId) => {
        const section = sectionBlocksById.get(sectionId);
        const contentBlocks = (section?.blocks || [])
          .map((block) => String(block || "").trim())
          .filter(Boolean);
        if (!contentBlocks.length) return null;

        return {
          id: section.id,
          label: section.label,
          content: contentBlocks.join("\n\n"),
        };
      })
      .filter(Boolean),
  };
}

function buildRichTextContent(text) {
  const blocks = splitTextIntoBlocks(text);
  if (!blocks.length) return "";

  return `<div class="wiki-prose">${blocks
    .map((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const isBulletList =
        lines.length >= 1 && lines.every((line) => /^[-*\u2022]\s+/.test(line));
      const isOrderedList =
        lines.length >= 1 && lines.every((line) => /^\d+[.)]\s+/.test(line));

      if (isBulletList) {
        return `<ul class="wiki-prose-list">${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*\u2022]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      if (isOrderedList) {
        return `<ol class="wiki-prose-list wiki-prose-list-ordered">${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^\d+[.)]\s+/, ""))}</li>`)
          .join("")}</ol>`;
      }

      return `<p class="wiki-prose-paragraph">${escapeHtml(block).replace(
        /\n/g,
        "<br />",
      )}</p>`;
    })
    .join("")}</div>`;
}

async function getArticleSections(row, parsedSections = []) {
  const sections = [];
  const seenIds = new Set();

  (parsedSections || []).forEach((section) => {
    if (!section || !section.id || seenIds.has(section.id)) return;
    seenIds.add(section.id);
    sections.push(section);
  });

  const explicitSections = await Promise.all(
    ARTICLE_SECTION_DEFINITIONS.map(async (sectionDef) => {
      const rawValue =
        (await getAutoLocalizedFieldValue(row, sectionDef.field)) || row[sectionDef.field];
      const value = String(rawValue || "").trim();
      if (!value) return null;

      return {
        id: sectionDef.id,
        label: getLocalizedStaticLabel(sectionDef.title),
        content: value,
      };
    }),
  );

  explicitSections
    .filter(Boolean)
    .forEach((section) => {
      if (!seenIds.has(section.id)) {
        seenIds.add(section.id);
        sections.push(section);
      }
    });

  return sections;
}

async function getGalleryItems(row, title) {
  const galleryIndexes = Array.from(
    new Set(
      Object.keys(row || {})
        .filter((key) => !isUrduVariantKey(key))
        .map((key) => getGalleryIndexFromKey(key))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).sort((a, b) => a - b);

  const items = [];
  for (const index of galleryIndexes) {
    const imageUrl = normalizeUrl(
      getFirstFieldValue(row, getGalleryImageFieldCandidates(index)),
    );
    if (!imageUrl) continue;

    let caption = "";
    for (const candidateKey of getGalleryCaptionFieldCandidates(index)) {
      const value = String(
        (await getAutoLocalizedFieldValue(row, candidateKey)) ||
          getFieldValue(row, candidateKey) ||
          "",
      ).trim();
      if (value) {
        caption = value;
        break;
      }
    }

    items.push({
      index,
      imageUrl,
      caption,
      alt: caption || `${title} gallery image ${index}`,
    });
  }

  return items;
}

function buildGallerySection(galleryItems) {
  if (!galleryItems.length) return "";

  return `<section class="wiki-section" id="gallery"><h2>${escapeHtml(
    getLocalizedStaticLabel(GALLERY_SECTION_TITLE),
  )}</h2><div class="wiki-section-body"><div class="wiki-gallery-grid">${galleryItems
    .map(
      ({ imageUrl, caption, alt }) =>
        `<figure class="wiki-gallery-card"><div class="wiki-gallery-media"><img class="wiki-gallery-image" src="${escapeHtml(
          imageUrl,
        )}" alt="${escapeHtml(
          alt,
        )}" onerror="this.closest('.wiki-gallery-media').outerHTML='<div class=&quot;infobox-image-placeholder&quot;>${escapeHtml(
          t("imageLoadFailed"),
        )}</div>';" /><button class="wiki-gallery-expand" type="button" data-lightbox-src="${escapeHtml(
          imageUrl,
        )}" data-lightbox-alt="${escapeHtml(alt)}" data-lightbox-caption="${escapeHtml(
          caption || "",
        )}" aria-label="${escapeHtml(t("imageExpand"))}">${escapeHtml(
          t("imageExpand"),
        )}</button></div>${
          caption
            ? `<figcaption class="wiki-gallery-caption">${escapeHtml(caption)}</figcaption>`
            : ""
        }</figure>`,
    )
    .join("")}</div></div></section>`;
}

function initEditorControls(row, rowIdx = -1) {
  if (!isEditorEnabled()) return;

  const toggleBtn = document.getElementById("shrineEditorToggleButton");
  const logoutBtn = document.getElementById("shrineEditorLogoutButton");
  const panelEl = document.getElementById("shrineEditorPanel");
  const formEl = document.getElementById("shrineEditorForm");
  const saveLocalBtn = document.getElementById("shrineEditorSaveLocalButton");
  const saveSheetBtn = document.getElementById("shrineEditorSaveSheetButton");
  const cancelBtn = document.getElementById("shrineEditorCancelButton");
  const resetBtn = document.getElementById("shrineEditorResetButton");
  const statusEl = document.getElementById("shrineEditorStatus");
  let isSaving = false;

  function setStatus(message, state = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.dataset.state = state;
  }

  function setSavingState(nextSaving) {
    isSaving = nextSaving;

    if (saveLocalBtn) saveLocalBtn.disabled = nextSaving;
    if (saveSheetBtn) {
      saveSheetBtn.disabled = nextSaving || !canSaveToGoogleSheet();
    }
    if (cancelBtn) cancelBtn.disabled = nextSaving;
    if (resetBtn) resetBtn.disabled = nextSaving || !row._hasLocalOverride;
  }

  function getUpdatedRowFromForm() {
    if (!formEl) return null;

    const formData = new FormData(formEl);
    const updatedRow = buildEditedRow(row, formData);

    if (!updatedRow.Name) {
      setStatus(t("editorNameRequired"), "error");
      return null;
    }

    return updatedRow;
  }

  toggleBtn?.addEventListener("click", () => {
    if (!isEditorAuthenticated()) {
      const password = window.prompt(t("editorPasswordPrompt"));
      if (password === null) return;

      const success =
        typeof ShrineDataSource.loginEditor === "function" &&
        ShrineDataSource.loginEditor(password);

      if (!success) {
        window.alert(t("editorPasswordFailed"));
        return;
      }

      window.location.reload();
      return;
    }

    panelEl?.classList.toggle("hidden");
  });

  logoutBtn?.addEventListener("click", () => {
    if (typeof ShrineDataSource.logoutEditor === "function") {
      ShrineDataSource.logoutEditor();
    }
    window.location.reload();
  });

  cancelBtn?.addEventListener("click", () => {
    if (isSaving) return;
    panelEl?.classList.add("hidden");
  });

  resetBtn?.addEventListener("click", () => {
    if (isSaving) return;
    if (!window.confirm(t("editorResetConfirm"))) return;
    if (typeof ShrineDataSource.clearRowOverride === "function") {
      ShrineDataSource.clearRowOverride(row._localKey);
    }
    window.location.reload();
  });

  formEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSaving) return;

    const updatedRow = getUpdatedRowFromForm();
    if (!updatedRow) return;

    setSavingState(true);
    setStatus(t("editorSavingLocal"), "working");

    try {
      if (typeof ShrineDataSource.saveRowOverride === "function") {
        ShrineDataSource.saveRowOverride(row._localKey, updatedRow);
      }

      setStatus(t("editorSavedLocal"), "success");
      window.setTimeout(() => {
        window.location.reload();
      }, 180);
    } catch (error) {
      setStatus(
        `${t("editorSaveFailedPrefix")} ${error?.message || String(error)}`,
        "error",
      );
      setSavingState(false);
    }
  });

  saveSheetBtn?.addEventListener("click", async () => {
    if (isSaving) return;

    if (!canSaveToGoogleSheet()) {
      setStatus(t("editorSheetUnavailable"), "error");
      return;
    }

    const updatedRow = getUpdatedRowFromForm();
    if (!updatedRow) return;

    setSavingState(true);
    setStatus(t("editorSavingToSheet"), "working");

    try {
      const result =
        typeof ShrineDataSource.saveRowToGoogleSheet === "function"
          ? await ShrineDataSource.saveRowToGoogleSheet(
              row._localKey,
              row,
              updatedRow,
              { rowIndex: rowIdx },
            )
          : null;

      setStatus(
        result?.mirroredLocally
          ? t("editorSavedToSheetMirrored")
          : t("editorSavedToSheet"),
        "success",
      );
      window.setTimeout(() => {
        window.location.reload();
      }, 220);
    } catch (error) {
      setStatus(
        `${t("editorSaveFailedPrefix")} ${error?.message || String(error)}`,
        "error",
      );
      setSavingState(false);
    }
  });

  setSavingState(false);
}

function getRelatedShrines(rows, currentIdx, currentRow, limit = 4) {
  const currentCategory = String(currentRow?.Category || "").trim().toLowerCase();
  const currentLatLng = parseLatLng(currentRow);
  const candidates = [];

  (rows || []).forEach((item, idx) => {
    if (idx === currentIdx) return;

    const row = normalizeRow(item);
    const title = getLocalizedFieldValue(row, "Name") || row.Name || "";
    if (!title) return;

    const category = String(row.Category || "").trim().toLowerCase();
    const sameCategory = Boolean(currentCategory && category && category === currentCategory);
    const latLng = parseLatLng(row);
    const distanceKm =
      currentLatLng && latLng
        ? haversineKm(currentLatLng.lat, currentLatLng.lng, latLng.lat, latLng.lng)
        : Number.POSITIVE_INFINITY;

    candidates.push({
      idx,
      row,
      title,
      sameCategory,
      distanceKm,
    });
  });

  candidates.sort((a, b) => {
    if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return a.title.localeCompare(b.title);
  });

  return candidates.slice(0, limit);
}

function initShareButton() {
  const shareBtn = document.getElementById("shrineShareButton");
  if (!shareBtn) return;

  shareBtn.addEventListener("click", async () => {
    const shareTitle =
      pageEl.querySelector(".wiki-title")?.textContent?.trim() ||
      pageEl.querySelector(".hero-overlay h1")?.textContent?.trim() ||
      "Shrine";
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }

    const copied = await copyTextToClipboard(shareUrl);

    if (copied) {
      const originalText = shareBtn.textContent || t("share");
      shareBtn.textContent = t("copied");
      setTimeout(() => {
        shareBtn.textContent = originalText;
      }, 1300);
    }
  });
}

function initCopyButtons() {
  const copyButtons = Array.from(pageEl.querySelectorAll("[data-copy-text]"));
  if (!copyButtons.length) return;

  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.copyBusy === "true") return;

      const text = String(button.dataset.copyText || "").trim();
      if (!text) return;

      const originalText = button.dataset.copyDefault || button.textContent || "";
      button.dataset.copyDefault = originalText;
      button.dataset.copyBusy = "true";

      const copied = await copyTextToClipboard(text);
      if (copied) {
        button.textContent = button.dataset.copySuccess || t("copied");
      }

      window.setTimeout(
        () => {
          button.textContent = button.dataset.copyDefault || originalText;
          button.dataset.copyBusy = "false";
        },
        copied ? 1400 : 250,
      );
    });
  });
}

function initContentsSpy() {
  const sectionEls = Array.from(pageEl.querySelectorAll(".wiki-section[id]"));
  const linkEls = Array.from(pageEl.querySelectorAll(".wiki-contents-link"));
  if (!sectionEls.length || !linkEls.length) return;

  const linkById = new Map();
  linkEls.forEach((link) => {
    const id = String(link.getAttribute("href") || "").replace(/^#/, "");
    if (id) linkById.set(id, link);
  });

  const setActiveLink = (id) => {
    linkById.forEach((link, key) => {
      const isActive = key === id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const firstSectionId = sectionEls[0]?.id || "";
  if (firstSectionId) setActiveLink(firstSectionId);

  if ("IntersectionObserver" in window) {
    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        const activeId =
          [...visibleSections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
          sectionEls.find((section) => section.getBoundingClientRect().top >= 0)?.id ||
          sectionEls[sectionEls.length - 1]?.id ||
          firstSectionId;

        if (activeId) setActiveLink(activeId);
      },
      {
        rootMargin: "-18% 0px -58% 0px",
        threshold: [0.18, 0.32, 0.55, 0.75],
      },
    );

    sectionEls.forEach((section) => observer.observe(section));
    return;
  }

  const onScroll = () => {
    let activeId = firstSectionId;
    sectionEls.forEach((section) => {
      if (section.getBoundingClientRect().top <= 150) {
        activeId = section.id;
      }
    });

    if (activeId) setActiveLink(activeId);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initImageLightbox() {
  const lightboxEl = document.getElementById("shrineImageLightbox");
  const imageEl = document.getElementById("shrineLightboxImage");
  const captionEl = document.getElementById("shrineLightboxCaption");
  const closeBtn = lightboxEl?.querySelector(".wiki-lightbox-close");
  const openButtons = Array.from(pageEl.querySelectorAll("[data-lightbox-src]"));

  if (!lightboxEl || !imageEl || !openButtons.length) return;

  const closeLightbox = () => {
    lightboxEl.classList.add("hidden");
    lightboxEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    imageEl.removeAttribute("src");
    imageEl.alt = "";
    if (captionEl) {
      captionEl.textContent = "";
      captionEl.classList.add("hidden");
    }
  };

  const openLightbox = (button) => {
    const src = String(button.dataset.lightboxSrc || "").trim();
    if (!src) return;

    imageEl.src = src;
    imageEl.alt = button.dataset.lightboxAlt || "";

    if (captionEl) {
      const caption = String(button.dataset.lightboxCaption || "").trim();
      captionEl.textContent = caption;
      captionEl.classList.toggle("hidden", !caption);
    }

    lightboxEl.classList.remove("hidden");
    lightboxEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeBtn?.focus();
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", () => openLightbox(button));
  });

  lightboxEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-lightbox-close]")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightboxEl.classList.contains("hidden")) {
      closeLightbox();
    }
  });
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("www.");
}

function formatFactValue(value) {
  if (isLikelyUrl(value)) {
    const href = value.startsWith("www.") ? `https://${value}` : value;
    return `<a href="${escapeHtml(
      href,
    )}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`;
  }

  return escapeHtml(value).replace(/\n/g, "<br />");
}

function buildFactRow(label, value) {
  return `<tr><th scope="row">${escapeHtml(label)}</th><td>${formatFactValue(
    value,
  )}</td></tr>`;
}

function buildDetailsTable(entries, className) {
  if (!entries.length) return "";

  return `<table class="${escapeHtml(className)}"><tbody>${entries
    .map(({ localizedKey, localizedValue }) =>
      buildFactRow(localizedKey, localizedValue),
    )
    .join("")}</tbody></table>`;
}

function buildContentsNav(sections) {
  if (sections.length <= 1) return "";

  return `<nav class="wiki-contents" aria-label="${escapeHtml(
    t("contents"),
  )}"><p class="wiki-contents-title">${escapeHtml(t("contents"))}</p><ol class="wiki-contents-list">${sections
    .map(
      ({ id, label }) =>
        `<li><a class="wiki-contents-link" href="#${escapeHtml(id)}">${escapeHtml(
          label,
        )}</a></li>`,
    )
    .join("")}</ol></nav>`;
}

function buildLeadSectionContent(text) {
  const paragraphs = String(text || "")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<div class="wiki-lead-empty"><p class="wiki-description-placeholder">${escapeHtml(
      t("descriptionPlaceholder"),
    )}</p></div>`;
  }

  return `<div class="wiki-lead-body">${paragraphs
    .map(
      (paragraph) =>
        `<p class="wiki-lead-paragraph">${escapeHtml(paragraph)}</p>`,
    )
    .join("")}</div>`;
}

function buildInfoboxMedia(imageUrl, title, caption) {
  if (imageUrl) {
    return `<figure class="infobox-media"><div class="infobox-image-frame"><img class="infobox-image" src="${escapeHtml(
      imageUrl,
    )}" alt="${escapeHtml(title)}" onerror="this.closest('.infobox-image-frame').outerHTML='<div class=&quot;infobox-image-placeholder&quot;>${escapeHtml(
      t("imageLoadFailed"),
    )}</div>';" /><button class="infobox-image-expand" type="button" data-lightbox-src="${escapeHtml(
      imageUrl,
    )}" data-lightbox-alt="${escapeHtml(title)}" data-lightbox-caption="${escapeHtml(
      caption || "",
    )}" aria-label="${escapeHtml(t("imageExpand"))}">${escapeHtml(
      t("imageExpand"),
    )}</button></div>${
      caption
        ? `<figcaption class="infobox-caption">${escapeHtml(caption)}</figcaption>`
        : ""
    }</figure>`;
  }

  return `<div class="infobox-media"><div class="infobox-image-placeholder">${escapeHtml(
    t("noImage"),
  )}</div></div>`;
}

function buildInfoboxActions(latLng) {
  if (!latLng) return "";

  const coordinateText = formatCoordinatePair(latLng);
  return `<div class="infobox-actions"><a class="wiki-action-btn infobox-action-btn" href="#location">${escapeHtml(
    t("viewMapSection"),
  )}</a><a class="wiki-action-btn wiki-action-btn-primary infobox-action-btn" href="${escapeHtml(
    buildDirectionsUrl(latLng.lat, latLng.lng),
  )}" target="_blank" rel="noopener">${escapeHtml(
    t("getDirections"),
  )}</a><button class="wiki-action-btn infobox-action-btn" type="button" data-copy-text="${escapeHtml(
    coordinateText,
  )}" data-copy-success="${escapeHtml(t("coordinatesCopied"))}">${escapeHtml(
    t("copyCoordinates"),
  )}</button></div>`;
}

function optimizeHeroImageDisplay() {
  const heroEl = pageEl.querySelector(".shrine-hero");
  const heroImageEl = heroEl?.querySelector(".hero-image");

  if (!heroEl || !heroImageEl) return;

  const applyHeroMode = () => {
    const naturalWidth = Number(heroImageEl.naturalWidth) || 0;
    const naturalHeight = Number(heroImageEl.naturalHeight) || 0;
    if (!naturalWidth || !naturalHeight) return;

    const displayWidth = heroEl.clientWidth || window.innerWidth || naturalWidth;
    const displayHeight =
      heroEl.clientHeight ||
      Math.round(Math.min((window.innerHeight || 900) * 0.62, 560)) ||
      naturalHeight;
    const sourcePixels = naturalWidth * naturalHeight;
    const displayPixels = Math.max(displayWidth * displayHeight, 1);
    const scaleRatio = sourcePixels / displayPixels;

    const isLowRes =
      naturalWidth < LOW_RES_MIN_WIDTH_PX ||
      sourcePixels < LOW_RES_MIN_PIXEL_AREA ||
      scaleRatio < LOW_RES_SCALE_RATIO;

    heroEl.classList.toggle("low-res", isLowRes);
    if (isLowRes) {
      const source = heroImageEl.currentSrc || heroImageEl.src || "";
      if (source) {
        heroEl.style.setProperty(
          "--hero-bg-image",
          `url("${String(source).replace(/"/g, '\\"')}")`,
        );
      }
    } else {
      heroEl.style.removeProperty("--hero-bg-image");
    }
  };

  if (heroResizeHandler) {
    window.removeEventListener("resize", heroResizeHandler);
  }
  heroResizeHandler = () => applyHeroMode();
  window.addEventListener("resize", heroResizeHandler, { passive: true });

  if (heroImageEl.complete && heroImageEl.naturalWidth) {
    applyHeroMode();
  } else {
    heroImageEl.addEventListener("load", applyHeroMode, { once: true });
  }
}

async function renderShrine(rawRow, rowIdx = -1, allRows = []) {
  const row = normalizeRow(rawRow);
  const editorEnabled = isEditorEnabled();
  const editorAuthenticated = isEditorAuthenticated();
  const sheetSaveEnabled = canSaveToGoogleSheet();
  const title =
    (await getAutoLocalizedFieldValue(row, "Name")) ||
    getLocalizedFieldValue(row, "Name") ||
    row.Name ||
    "Shrine";
  const explicitImageUrl = getPrimaryImageUrl(row);
  const latLng = parseLatLng(row);
  const coordinateText = formatCoordinatePair(latLng);
  const fullMapUrl = latLng ? buildGoogleMapUrl(latLng.lat, latLng.lng) : "";
  const relatedShrines = getRelatedShrines(allRows, rowIdx, row, 4);
  const editableExtraText = getEditableExtraText(row);
  const allGalleryItems = await getGalleryItems(row, title);
  const fallbackInfoboxImage =
    !explicitImageUrl && allGalleryItems.length ? allGalleryItems[0] : null;
  const imageUrl = explicitImageUrl || fallbackInfoboxImage?.imageUrl || null;
  const imageCaption = fallbackInfoboxImage?.caption || "";
  const galleryItems = explicitImageUrl
    ? allGalleryItems
    : allGalleryItems.slice(fallbackInfoboxImage ? 1 : 0);

  let leadParagraph = "";
  for (const key of LEAD_PARAGRAPH_KEYS) {
    const value = (await getAutoLocalizedFieldValue(row, key)) || row[key];
    if (value && String(value).trim()) {
      leadParagraph = String(value).trim();
      break;
    }
  }
  const parsedArticleContent = parseHeadingBasedArticleText(leadParagraph);
  leadParagraph = parsedArticleContent.leadText;
  const articleSections = await getArticleSections(row, parsedArticleContent.sections);

  const visibleEntries = getVisibleEntries(row);
  const localizedEntries = (
    await Promise.all(
      visibleEntries.map(async ({ key, value }) => ({
        key,
        localizedKey: currentLang === "ur" ? await translateTextToUrdu(key) : key,
        localizedValue:
          (currentLang === "ur"
            ? await getAutoLocalizedFieldValue(row, key)
            : value) || value,
      })),
    )
  ).filter(({ localizedValue }) => String(localizedValue || "").trim());

  const infoboxEntries = pickPriorityEntries(
    localizedEntries,
    INFOBOX_PRIORITY_KEYS,
    MAX_INFOBOX_ROWS,
  );
  const headerEntry = findEntryByKeys(localizedEntries, ["Category", "Type", "Location"]);
  const headerLabel = String(headerEntry?.localizedValue || "").trim();
  const summaryMeta = buildSummaryMeta(
    localizedEntries,
    headerLabel ? [headerLabel] : [],
  );

  const sections = articleSections.map(({ id, label }) => ({ id, label }));
  if (galleryItems.length) {
    sections.push({
      id: "gallery",
      label: getLocalizedStaticLabel(GALLERY_SECTION_TITLE),
    });
  }
  if (localizedEntries.length) sections.push({ id: "details", label: t("details") });
  if (latLng) sections.push({ id: "location", label: t("locationMap") });
  if (relatedShrines.length) {
    sections.push({ id: "related", label: t("relatedShrines") });
  }
  const contentsNav = buildContentsNav(sections);

  document.title = `${title} — Sufi Shrines of Pakistan`;

  const parts = [];
  parts.push('<div class="shrine-shell">');
  parts.push('<div class="shrine-toolbar">');
  parts.push(
    `<a class="toolbar-btn toolbar-back-btn" href="${escapeHtml(
      getMapPageUrl(),
    )}"><span class="directional-icon">${getBackArrowHtml()}</span><span>${escapeHtml(
      t("backToMap"),
    )}</span></a>`,
  );
  parts.push('<div class="shrine-toolbar-actions">');
  parts.push(
    `<button id="shrineLanguageToggle" class="language-toggle toolbar-btn" type="button">${escapeHtml(
      getLanguageToggleLabel(),
    )}</button>`,
  );
  parts.push(
    `<button id="shrineShareButton" class="toolbar-btn" type="button">${escapeHtml(
      t("share"),
    )}</button>`,
  );
  if (editorEnabled) {
    parts.push(
      `<button id="shrineEditorToggleButton" class="toolbar-btn toolbar-btn-emphasis" type="button">${escapeHtml(
        editorAuthenticated ? t("editorOpen") : t("editorLogin"),
      )}</button>`,
    );
    if (editorAuthenticated) {
      parts.push(
        `<button id="shrineEditorLogoutButton" class="toolbar-btn" type="button">${escapeHtml(
          t("editorLogout"),
        )}</button>`,
      );
    }
  }
  parts.push("</div>");
  parts.push("</div>");
  parts.push('<article class="wiki-article">');
  parts.push('<header class="wiki-header">');
  if (headerLabel) {
    parts.push(`<p class="wiki-kicker">${escapeHtml(headerLabel)}</p>`);
  }
  parts.push(`<h1 class="wiki-title">${escapeHtml(title)}</h1>`);
  if (summaryMeta.length) {
    parts.push('<div class="wiki-summary-meta">');
    summaryMeta.forEach((item) => {
      parts.push(`<span>${escapeHtml(item)}</span>`);
    });
    parts.push("</div>");
  }
  parts.push("</header>");
  if (editorEnabled) {
    const articleEditorFields = ARTICLE_SECTION_DEFINITIONS.map(
      ({ id, field }) =>
        `<label class="wiki-editor-field wiki-editor-span-2"><span>${escapeHtml(
          field,
        )}</span><textarea name="article_${escapeHtml(
          id,
        )}" rows="6">${escapeHtml(row[field] || "")}</textarea></label>`,
    ).join("");
    const galleryEditorFields = GALLERY_EDITOR_SLOTS.map(
      ({ index, imageField, captionField }) =>
        `<label class="wiki-editor-field wiki-editor-span-2"><span>${escapeHtml(
          imageField,
        )}</span><input name="gallery_${escapeHtml(
          String(index),
        )}_image" type="text" value="${escapeHtml(
          row[imageField] || "",
        )}" /></label><label class="wiki-editor-field wiki-editor-span-2"><span>${escapeHtml(
          captionField,
        )}</span><input name="gallery_${escapeHtml(
          String(index),
        )}_caption" type="text" value="${escapeHtml(row[captionField] || "")}" /></label>`,
    ).join("");

    parts.push(
      `<section class="wiki-editor-panel hidden" id="shrineEditorPanel"><div class="wiki-editor-panel-head"><div><h2>${escapeHtml(
        t("editorPanelTitle"),
      )}</h2><div class="wiki-editor-note-stack"><p class="wiki-editor-note">${escapeHtml(
        getEditorLocalNotice(),
      )}</p><p class="wiki-editor-note wiki-editor-note-accent">${escapeHtml(
        getEditorSheetNotice(),
      )}</p></div></div></div><form class="wiki-editor-form" id="shrineEditorForm"><div class="wiki-editor-grid"><label class="wiki-editor-field wiki-editor-span-2"><span>Name</span><input name="name" type="text" value="${escapeHtml(
        row.Name || "",
      )}" required /></label><label class="wiki-editor-field"><span>Category</span><input name="category" type="text" value="${escapeHtml(
        row.Category || "",
      )}" /></label><label class="wiki-editor-field"><span>Location</span><input name="location" type="text" value="${escapeHtml(
        row.Location || "",
      )}" /></label><label class="wiki-editor-field"><span>Latitude</span><input name="latitude" type="text" value="${escapeHtml(
        row.Latitude || "",
      )}" /></label><label class="wiki-editor-field"><span>Longitude</span><input name="longitude" type="text" value="${escapeHtml(
        row.Longitude || "",
      )}" /></label><label class="wiki-editor-field"><span>Founded</span><input name="founded" type="text" value="${escapeHtml(
        row.Founded || "",
      )}" /></label><label class="wiki-editor-field"><span>Sufi Saint</span><input name="sufiSaint" type="text" value="${escapeHtml(
        row["Sufi Saint"] || "",
      )}" /></label><label class="wiki-editor-field wiki-editor-span-2"><span>Image Link</span><input name="imageLink" type="text" value="${escapeHtml(
        row["Image Link"] || row.Image || row.image || row.image_url || "",
      )}" /></label><label class="wiki-editor-field wiki-editor-span-2"><span>${escapeHtml(
        t("descriptionSection"),
      )}</span><textarea name="description" rows="8">${escapeHtml(
        row.Description || leadParagraph || "",
      )}</textarea></label><div class="wiki-editor-grid-divider wiki-editor-span-2"><span>Article sections</span></div>${articleEditorFields}<div class="wiki-editor-grid-divider wiki-editor-span-2"><span>Gallery</span></div>${galleryEditorFields}<label class="wiki-editor-field wiki-editor-span-2"><span>${escapeHtml(
        t("editorExtraFields"),
      )}</span><textarea name="extraFields" rows="6" placeholder="${escapeHtml(
        t("editorExtraFieldsHint"),
      )}">${escapeHtml(editableExtraText)}</textarea></label></div><div class="wiki-editor-actions"><button class="toolbar-btn toolbar-btn-emphasis" id="shrineEditorSaveLocalButton" type="submit">${escapeHtml(
        t("editorSaveLocal"),
      )}</button><button class="toolbar-btn toolbar-btn-sheet" id="shrineEditorSaveSheetButton" type="button"${
        sheetSaveEnabled ? "" : " disabled"
      }>${escapeHtml(
        t("editorSaveToSheet"),
      )}</button><button class="toolbar-btn" id="shrineEditorCancelButton" type="button">${escapeHtml(
        t("editorCancel"),
      )}</button><button class="toolbar-btn" id="shrineEditorResetButton" type="button"${row._hasLocalOverride ? "" : " disabled"}>${escapeHtml(
        t("editorReset"),
      )}</button></div><p class="wiki-editor-status" id="shrineEditorStatus"></p></form></section>`,
    );
  }
  parts.push('<div class="wiki-layout">');
  parts.push('<div class="wiki-main">');
  if (leadParagraph || !articleSections.length) {
    parts.push('<section class="wiki-lead-section">');
    parts.push(buildLeadSectionContent(leadParagraph));
    parts.push("</section>");
  }
  if (contentsNav) parts.push(contentsNav);

  articleSections.forEach(({ id, label, content }) => {
    parts.push(`<section class="wiki-section" id="${escapeHtml(id)}">`);
    parts.push(`<h2>${escapeHtml(label)}</h2>`);
    parts.push('<div class="wiki-section-body">');
    parts.push(buildRichTextContent(content));
    parts.push("</div>");
    parts.push("</section>");
  });

  if (galleryItems.length) {
    parts.push(buildGallerySection(galleryItems));
  }

  if (localizedEntries.length) {
    parts.push('<section class="wiki-section" id="details">');
    parts.push(`<h2>${escapeHtml(t("details"))}</h2>`);
    parts.push('<div class="wiki-section-body">');
    parts.push(buildDetailsTable(localizedEntries, "wiki-details-table"));
    parts.push("</div>");
    parts.push("</section>");
  }

  if (latLng) {
    parts.push('<section class="wiki-section" id="location">');
    parts.push(`<h2>${escapeHtml(t("locationMap"))}</h2>`);
    parts.push('<div class="wiki-section-body">');
    parts.push(
      `<div class="wiki-location-tools"><div class="wiki-coordinate-card"><span class="wiki-coordinate-label">${escapeHtml(
        t("coordinatesLabel"),
      )}</span><code class="wiki-coordinate-value">${escapeHtml(
        coordinateText,
      )}</code></div><div class="wiki-inline-actions"><button class="wiki-action-btn" type="button" data-copy-text="${escapeHtml(
        coordinateText,
      )}" data-copy-success="${escapeHtml(t("coordinatesCopied"))}">${escapeHtml(
        t("copyCoordinates"),
      )}</button><a class="wiki-action-btn" href="${escapeHtml(
        fullMapUrl,
      )}" target="_blank" rel="noopener">${escapeHtml(
        t("openFullMap"),
      )}</a><a class="wiki-action-btn wiki-action-btn-primary directions-link" href="${escapeHtml(
        buildDirectionsUrl(latLng.lat, latLng.lng),
      )}" target="_blank" rel="noopener">${escapeHtml(
        t("getDirections"),
      )}</a></div></div>`,
    );
    parts.push('<div class="wiki-map-wrap">');
    parts.push(
      `<iframe class="wiki-map-frame" title="${escapeHtml(
        t("locationMap"),
      )}" src="${escapeHtml(
        buildMiniMapEmbedUrl(latLng.lat, latLng.lng),
      )}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
    );
    parts.push("</div>");
    parts.push("</div>");
    parts.push("</section>");
  }

  if (relatedShrines.length) {
    parts.push('<section class="wiki-section" id="related">');
    parts.push(`<h2>${escapeHtml(t("relatedShrines"))}</h2>`);
    parts.push('<div class="wiki-section-body">');
    parts.push('<div class="related-grid">');
    relatedShrines.forEach(({ idx, row: relatedRow, distanceKm }) => {
      const relatedTitle =
        getLocalizedFieldValue(relatedRow, "Name") ||
        relatedRow.Name ||
        `Shrine ${idx + 1}`;
      const relatedCategory =
        getLocalizedFieldValue(relatedRow, "Category") || relatedRow.Category || "";
      const distanceText = formatDistanceLabel(distanceKm);
      const metaText = [relatedCategory, distanceText].filter(Boolean).join(" · ");

      parts.push(
        `<a class="related-card" href="${escapeHtml(
          getShrinePageUrl(idx),
        )}"><span class="related-name">${escapeHtml(
          relatedTitle,
        )}</span><span class="related-meta">${escapeHtml(metaText)}</span></a>`,
      );
    });
    parts.push("</div>");
    parts.push("</div>");
    parts.push("</section>");
  }

  parts.push("</div>");

  if (imageUrl || infoboxEntries.length || latLng) {
    parts.push('<aside class="wiki-infobox">');
    parts.push(`<div class="infobox-title">${escapeHtml(t("shrineFacts"))}</div>`);
    if (imageUrl || infoboxEntries.length) {
      parts.push(buildInfoboxMedia(imageUrl, title, imageCaption || headerLabel || title));
    }
    if (latLng) {
      parts.push(buildInfoboxActions(latLng));
    }
    if (infoboxEntries.length) {
      parts.push(buildDetailsTable(infoboxEntries, "infobox-table"));
    }
    parts.push("</aside>");
  }

  parts.push("</div>");
  parts.push("</article>");

  const footerMapLink = `<a href="${escapeHtml(getMapPageUrl())}">${escapeHtml(currentLang === "ur" ? "مکمل نقشہ" : "Interactive Map")}</a>`;
  parts.push(`<footer class="site-footer">
    <p>${footerMapLink}<span class="footer-divider">·</span>${escapeHtml(currentLang === "ur" ? "صوفی مزارات پروجیکٹ — کھلا مصدر ثقافتی ورثہ" : "Sufi Shrines Project — Open-source cultural heritage documentation")}</p>
    <p>${escapeHtml(currentLang === "ur" ? "ڈیٹا تاریخی ریکارڈ اور مقامی علم پر مبنی ہے۔" : "Data drawn from historical records, academic sources, and community knowledge.")}</p>
  </footer>`);

  if (imageUrl || galleryItems.length) {
    parts.push(
      `<div class="wiki-lightbox hidden" id="shrineImageLightbox" aria-hidden="true"><div class="wiki-lightbox-backdrop" data-lightbox-close="true"></div><div class="wiki-lightbox-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        title,
      )}"><button class="wiki-lightbox-close" type="button" data-lightbox-close="true">${escapeHtml(
        t("closeImage"),
      )}</button><div class="wiki-lightbox-media"><img class="wiki-lightbox-image" id="shrineLightboxImage" alt="" /></div><p class="wiki-lightbox-caption hidden" id="shrineLightboxCaption"></p></div></div>`,
    );
  }
  parts.push("</div>");

  parts.push(
    `<button class="scroll-to-top-btn" id="scrollToTopBtn" aria-label="${escapeHtml(currentLang === "ur" ? "سب سے اوپر جائیں" : "Back to top")}" title="${escapeHtml(currentLang === "ur" ? "سب سے اوپر جائیں" : "Back to top")}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></button>`,
  );

  pageEl.innerHTML = parts.join("");
  initLanguageToggle();
  initShareButton();
  initCopyButtons();
  initContentsSpy();
  initImageLightbox();
  initEditorControls(row, rowIdx);
  initScrollToTop();
}

function initScrollToTop() {
  const btn = document.getElementById("scrollToTopBtn");
  if (!btn) return;

  const onScroll = () => {
    btn.classList.toggle("visible", window.scrollY > 380);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
function renderError(message) {
  pageEl.innerHTML = `
    <button
      id="shrineLanguageToggle"
      class="language-toggle shrine-lang-toggle"
      type="button"
    >${escapeHtml(getLanguageToggleLabel())}</button>
    <a class="back-link" href="${escapeHtml(
      getMapPageUrl(),
    )}"><span class="directional-icon">${getBackArrowHtml()}</span><span>${escapeHtml(
      t("backToMap"),
    )}</span></a>
    <p class="muted">${escapeHtml(message)}</p>
  `;
  initLanguageToggle();
}

function loadShrinePage() {
  const idParam = new URLSearchParams(window.location.search).get("id");
  const shrineIdx = Number.parseInt(idParam, 10);

  if (!Number.isInteger(shrineIdx) || shrineIdx < 0) {
    renderError(t("invalidId"));
    return;
  }

  const fetchRows =
    typeof ShrineDataSource !== "undefined" &&
    ShrineDataSource &&
    typeof ShrineDataSource.fetchRows === "function"
      ? ShrineDataSource.fetchRows.bind(ShrineDataSource)
      : null;

  if (!fetchRows) {
    renderError(`${t("failedToLoadPrefix")} data source is unavailable.`);
    return;
  }

  fetchRows()
    .then(async (result) => {
      const rows = (result.rows || []).map(normalizeRow);
      const row = rows[shrineIdx];

      if (!row) {
        renderError(t("notFound"));
        return;
      }

      await renderShrine(row, shrineIdx, rows);
    })
    .catch((error) => {
      renderError(`${t("failedToLoadPrefix")} ${error?.message || String(error)}`);
    });
}

localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
persistTranslationCache();
initLanguageToggle();
setInitialLoadingMessage();
loadShrinePage();

