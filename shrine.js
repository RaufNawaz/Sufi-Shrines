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
const LANGUAGE_STORAGE_KEY = "shrines_language";
const TRANSLATION_CACHE_STORAGE_KEY = "shrines_translation_cache_v2";
const UI_TEXT = {
  en: {
    loading: "Loading shrine details...",
    backToMap: "Back to map",
    missingDescription: "Description not available.",
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
    missingDescription: "تفصیل دستیاب نہیں ہے۔",
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

function initLanguageToggle() {
  const languageToggleEl = document.getElementById("shrineLanguageToggle");
  if (!languageToggleEl) return;

  languageToggleEl.textContent = currentLang === "ur" ? "English" : "اردو";
  languageToggleEl.setAttribute(
    "aria-label",
    currentLang === "ur" ? "Switch language to English" : "زبان اردو میں تبدیل کریں",
  );

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

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("www.");
}

function buildDetailRow(label, value) {
  if (isLikelyUrl(value)) {
    const href = value.startsWith("www.") ? `https://${value}` : value;
    return `<div class="row"><b>${escapeHtml(label)}:</b> <a href="${escapeHtml(
      href,
    )}" target="_blank" rel="noopener">${escapeHtml(value)}</a></div>`;
  }

  return `<div class="row"><b>${escapeHtml(label)}:</b> ${escapeHtml(
    value,
  )}</div>`;
}

async function renderShrine(rawRow) {
  const row = normalizeRow(rawRow);
  const title =
    (await getAutoLocalizedFieldValue(row, "Name")) ||
    getLocalizedFieldValue(row, "Name") ||
    row.Name ||
    "Shrine";
  const imageUrl = normalizeUrl(
    row["Image Link"] || row.Image || row.image || row.image_url,
  );

  let leadParagraph = "";
  for (const key of LEAD_PARAGRAPH_KEYS) {
    const value = (await getAutoLocalizedFieldValue(row, key)) || row[key];
    if (value && String(value).trim()) {
      leadParagraph = String(value).trim();
      break;
    }
  }

  const parts = [];
  parts.push(
    `<button id="shrineLanguageToggle" class="language-toggle shrine-lang-toggle" type="button">${
      currentLang === "ur" ? "English" : "اردو"
    }</button>`,
  );
  parts.push('<header class="shrine-hero">');
  if (imageUrl) {
    parts.push(
      `<img class="hero-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.outerHTML='<div class=&quot;hero-image-placeholder&quot;>${escapeHtml(
        t("imageLoadFailed"),
      )}</div>';" />`,
    );
  } else {
    parts.push(`<div class="hero-image-placeholder">${escapeHtml(t("noImage"))}</div>`);
  }
  parts.push('<div class="hero-overlay">');
  parts.push(
    `<a class="back-link" href="${escapeHtml(getMapPageUrl())}">&larr; ${escapeHtml(
      t("backToMap"),
    )}</a>`,
  );
  parts.push(`<h1>${escapeHtml(title)}</h1>`);
  parts.push("</div>");
  parts.push("</header>");
  parts.push('<section class="shrine-content">');

  if (leadParagraph) {
    parts.push(`<p class="hero-paragraph">${escapeHtml(leadParagraph)}</p>`);
  } else {
    parts.push(`<p class="hero-paragraph hero-paragraph-placeholder">${escapeHtml(
      t("missingDescription"),
    )}</p>`);
  }

  parts.push('<section class="detail-grid">');

  const visibleEntries = Object.entries(row).filter(([key, value]) => {
    if (
      NON_DETAIL_KEYS.has(key) ||
      key === "Name" ||
      LEAD_PARAGRAPH_KEYS.includes(key) ||
      value === null ||
      value === undefined
    ) {
      return false;
    }
    if (currentLang === "en" && isUrduVariantKey(key)) return false;
    return true;
  });

  const detailRows = await Promise.all(
    visibleEntries.map(async ([key, value]) => {
      const textValue = String(value).trim();
      if (!textValue) return "";

      const localizedKey = currentLang === "ur" ? await translateTextToUrdu(key) : key;
      const localizedValue =
        currentLang === "ur" ? await translateTextToUrdu(textValue) : textValue;
      return buildDetailRow(localizedKey, localizedValue);
    }),
  );

  parts.push(...detailRows.filter(Boolean));
  parts.push("</section>");
  parts.push("</section>");

  pageEl.innerHTML = parts.join("");
  initLanguageToggle();
}

function renderError(message) {
  pageEl.innerHTML = `
    <button
      id="shrineLanguageToggle"
      class="language-toggle shrine-lang-toggle"
      type="button"
    >${currentLang === "ur" ? "English" : "اردو"}</button>
    <a class="back-link" href="${escapeHtml(getMapPageUrl())}">&larr; ${escapeHtml(
      t("backToMap"),
    )}</a>
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

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = (results.data || []).map(normalizeRow);
      const row = rows[shrineIdx];

      if (!row) {
        renderError(t("notFound"));
        return;
      }

      await renderShrine(row);
    },
    error: (error) => {
      renderError(`${t("failedToLoadPrefix")} ${error?.message || String(error)}`);
    },
  });
}

localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
persistTranslationCache();
initLanguageToggle();
setInitialLoadingMessage();
loadShrinePage();
