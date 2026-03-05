/* global L, Papa */

const CSV_FILE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv";

const DEFAULT_CENTER = [31.5204, 74.3587];
const DEFAULT_ZOOM = 6;
const SIDEBAR_RESIZE_DELAY_MS = 220;
const LANGUAGE_STORAGE_KEY = "shrines_language";
const TRANSLATION_CACHE_STORAGE_KEY = "shrines_translation_cache_v2";
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
const UI_TEXT = {
  en: {
    title: "Sufi Shrines",
    loading: "Loading data...",
    noSelection: "No shrine selected yet. Click a marker to view details.",
    tableButton: "Table of Shrines",
    searchPlaceholder: "Search shrines...",
    noMatches: "No matches.",
    uncategorized: "Uncategorized",
  },
  ur: {
    title: "صوفی مزارات",
    loading: "ڈیٹا لوڈ ہو رہا ہے...",
    noSelection: "ابھی کوئی مزار منتخب نہیں ہوا۔ تفصیل کے لیے مارکر پر کلک کریں۔",
    tableButton: "مزارات کی فہرست",
    searchPlaceholder: "مزار تلاش کریں...",
    noMatches: "کوئی نتیجہ نہیں ملا۔",
    uncategorized: "غیر زمرہ بند",
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

const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggle");
const mapTitleEl = document.getElementById("mapTitle");
const IS_COARSE_POINTER =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
const markers = [];
const rowsStore = [];

let tablePanelEl = null;
let selectedIdx = null;
let detailsRenderToken = 0;
let suppressMapClickUntil = 0;
let lastMarkerInteractionAt = 0;
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

setTimeout(() => map.invalidateSize(), 0);

const streetsLayer = L.tileLayer(
  "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=WDmTVcrwlj7v2t6K2h5d",
  {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    attribution: "&copy; MapTiler &copy; OpenStreetMap contributors",
  },
);

const topoLayer = L.tileLayer(
  "https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=WDmTVcrwlj7v2t6K2h5d",
  {
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    attribution: "&copy; MapTiler &copy; OpenStreetMap contributors",
  },
);

const voyagerLayer = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
);

const esriStreetsLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  },
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  },
);

streetsLayer.addTo(map);

L.control
  .layers(
    {
      "Streets (MapTiler)": streetsLayer,
      "Topo (MapTiler)": topoLayer,
      "Voyager (CARTO)": voyagerLayer,
      "Streets (Esri)": esriStreetsLayer,
      "Satellite (Esri)": satelliteLayer,
    },
    null,
    { position: "bottomleft" },
  )
  .addTo(map);

function t(key) {
  return UI_TEXT[currentLang]?.[key] || UI_TEXT.en[key] || "";
}

function setMapPanelTitle(title) {
  if (!mapTitleEl) return;
  const text = String(title || "").trim();
  mapTitleEl.textContent = text || t("title");
}

function resetMapPanelTitle() {
  setMapPanelTitle(t("title"));
}

function initLanguageToggle() {
  resetMapPanelTitle();

  const languageToggleEl = document.getElementById("languageToggle");
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

function maybeCacheGeneratedTranslation(raw) {
  const source = String(raw ?? "").trim();
  if (!source || !/[A-Za-z]/.test(source) || isLikelyUrl(source)) return false;
  const existing = findCachedTranslation(source);
  if (existing && !/[A-Za-z]/.test(existing)) return false;

  const generated = buildUrduFallback(source);
  if (!generated || generated === source) return false;
  if (existing && existing === generated) return false;

  translationCache.set(source, generated);
  return true;
}

function primeTranslationCache(rows) {
  if (currentLang !== "ur") return;

  let changed = false;
  for (const row of rows || []) {
    for (const [key, value] of Object.entries(row || {})) {
      if (maybeCacheGeneratedTranslation(key)) changed = true;

      const textValue = String(value ?? "").trim();
      if (!textValue || isLikelyUrl(textValue)) continue;
      if (maybeCacheGeneratedTranslation(textValue)) changed = true;
    }
  }

  if (changed) persistTranslationCache();
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

function getNoSelectionMessage() {
  return `<p class="muted">${escapeHtml(t("noSelection"))}</p>`;
}

function getLocalizedCategoryTitle(row) {
  const localizedCategory = getLocalizedFieldValue(row, "Category");
  const fallbackCategory = row?.Category;
  return String(localizedCategory || fallbackCategory || t("title")).trim() || t("title");
}

function setStatus(message) {
  statusEl.textContent = message || "";
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

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("www.");
}

function normalizeSheetRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = String(key).trim();
    normalized[normalizedKey] = typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function parseLatLng(row) {
  const lat = Number.parseFloat(row.Latitude);
  const lng = Number.parseFloat(row.Longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function clearDetails() {
  detailsEl.innerHTML = getNoSelectionMessage();
  resetMapPanelTitle();
}

function refreshMapAfterLayoutChange() {
  setTimeout(() => map.invalidateSize(), SIDEBAR_RESIZE_DELAY_MS);
}

function setSidebarCollapsed(collapsed) {
  sidebarEl.classList.toggle("collapsed", collapsed);
  refreshMapAfterLayoutChange();
}

function openSidebar() {
  setSidebarCollapsed(false);
}

function collapseSidebar() {
  setSidebarCollapsed(true);
}

function toggleSidebar() {
  setSidebarCollapsed(!sidebarEl.classList.contains("collapsed"));
}

sidebarToggleBtn.addEventListener("click", toggleSidebar);

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

function getShrinePageUrl(idx) {
  return `./shrine.html?id=${encodeURIComponent(idx)}&lang=${encodeURIComponent(
    currentLang,
  )}`;
}

async function renderDetails(rawRow, rowIdx = null) {
  const renderToken = ++detailsRenderToken;
  const row = normalizeSheetRow(rawRow);
  setMapPanelTitle(getLocalizedCategoryTitle(row));
  const title =
    (await getAutoLocalizedFieldValue(row, "Name")) ||
    getLocalizedFieldValue(row, "Name") ||
    row.Name ||
    "Shrine";
  const resolvedIdx = Number.isInteger(rowIdx) ? rowIdx : rowsStore.indexOf(rawRow);
  const detailsLink =
    resolvedIdx >= 0
      ? `<a class="details-title-link" href="${escapeHtml(
          getShrinePageUrl(resolvedIdx),
        )}">${escapeHtml(title)}</a>`
      : escapeHtml(title);
  const imageUrl = normalizeUrl(
    row["Image Link"] || row.Image || row.image || row.image_url,
  );
  const parts = [];

  if (imageUrl) {
    parts.push(
      `<img class="preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.style.display='none';" />`,
    );
  }

  parts.push(`<h2 class="details-title">${detailsLink}</h2>`);

  const visibleEntries = Object.entries(row).filter(([key, value]) => {
    if (NON_DETAIL_KEYS.has(key) || value === null || value === undefined) {
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

  if (renderToken !== detailsRenderToken) return;
  parts.push(...detailRows.filter(Boolean));

  detailsEl.innerHTML = parts.join("");
}

function makeDotIcon({ selected = false, hover = false } = {}) {
  const classes = ["shrine-dot"];
  if (selected) classes.push("selected");
  if (hover) classes.push("hover");
  const hitSize = IS_COARSE_POINTER ? 34 : 26;
  const anchor = Math.round(hitSize / 2);

  return L.divIcon({
    className: "shrine-marker-hit",
    html: `<div class="shrine-dot-hit"><div class="${classes.join(
      " ",
    )}"></div></div>`,
    iconSize: [hitSize, hitSize],
    iconAnchor: [anchor, anchor],
  });
}

function isMarkerDomTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(
    target.closest(
      ".shrine-dot, .shrine-dot-hit, .shrine-marker-hit, .leaflet-marker-icon",
    ),
  );
}

function markMarkerInteraction(durationMs = 1800) {
  const now = Date.now();
  lastMarkerInteractionAt = now;
  suppressMapClickUntil = Math.max(suppressMapClickUntil, now + durationMs);
}

function setSelected(idx) {
  if (selectedIdx !== null && markers[selectedIdx]) {
    markers[selectedIdx].setIcon(makeDotIcon());
  }

  selectedIdx = idx;

  if (selectedIdx !== null && markers[selectedIdx]) {
    markers[selectedIdx].setIcon(makeDotIcon({ selected: true }));
  }
}

map.on("click", (event) => {
  if (Date.now() < suppressMapClickUntil) return;
  if (isMarkerDomTarget(event?.originalEvent?.target)) return;
  if (IS_COARSE_POINTER && Date.now() - lastMarkerInteractionAt < 2200) return;
  clearDetails();
  collapseSidebar();
  hideTablePanel();
  setSelected(null);
});

function toggleTablePanel() {
  if (tablePanelEl) tablePanelEl.classList.toggle("hidden");
}

function hideTablePanel() {
  if (tablePanelEl) tablePanelEl.classList.add("hidden");
}

function groupRowsByCategory(rows) {
  const groups = new Map();

  rows.forEach((row, idx) => {
    const rawCategory =
      getLocalizedFieldValue(row, "Category") || row.Category || t("uncategorized");
    const category = (rawCategory || t("uncategorized")).trim() || t("uncategorized");
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ row, idx });
  });

  const categories = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const hasUncategorized = categories.includes(t("uncategorized"));
  const orderedCats = hasUncategorized
    ? categories
        .filter((cat) => cat !== t("uncategorized"))
        .concat(t("uncategorized"))
    : categories;

  return { groups, orderedCats };
}

function renderTableList(searchTerm = "") {
  const list = document.getElementById("shrinePanelList");
  if (!list) return;

  const query = String(searchTerm || "")
    .trim()
    .toLowerCase();
  list.innerHTML = "";

  const { groups, orderedCats } = groupRowsByCategory(rowsStore);
  let totalShown = 0;

  orderedCats.forEach((cat) => {
    const items = groups.get(cat) || [];
    const filtered = query
      ? items.filter(({ row }) =>
          (getLocalizedFieldValue(row, "Name") || row.Name || "")
            .toLowerCase()
            .includes(query),
        )
      : items;

    if (!filtered.length) return;

    const groupEl = document.createElement("div");
    groupEl.className = "group collapsed";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "group-header";
    header.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span class="group-meta">
        <span class="count">${filtered.length}</span>
        <span class="group-chevron"></span>
      </span>
    `;

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "group-items";

    header.addEventListener("click", (event) => {
      event.stopPropagation();
      groupEl.classList.toggle("collapsed");
    });

    filtered.forEach(({ row, idx }) => {
      const title = (row.Name || `Shrine ${idx + 1}`).trim();
      const localizedTitle = (
        getLocalizedFieldValue(row, "Name") ||
        row.Name ||
        `Shrine ${idx + 1}`
      ).trim();

      const item = document.createElement("button");
      item.className = "panel-item";
      item.type = "button";
      item.textContent = localizedTitle;

      item.addEventListener("click", (event) => {
        event.stopPropagation();

        const latLng = parseLatLng(row);
        if (!latLng || !markers[idx]) return;

        setSelected(idx);
        map.flyTo([latLng.lat, latLng.lng], Math.max(map.getZoom(), 13), {
          duration: 0.8,
        });
        renderDetails(row, idx);
        openSidebar();
        hideTablePanel();

        const searchInput = document.getElementById("shrineSearch");
        if (searchInput) searchInput.value = "";
        renderTableList("");
      });

      itemsWrap.appendChild(item);
      totalShown += 1;
    });

    groupEl.appendChild(header);
    groupEl.appendChild(itemsWrap);
    list.appendChild(groupEl);
  });

  if (totalShown === 0) {
    const empty = document.createElement("div");
    empty.className = "panel-empty";
    empty.textContent = t("noMatches");
    list.appendChild(empty);
  }
}

function buildTableControls() {
  const TableControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: () => {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control shrine-table-btn",
      );

      const button = L.DomUtil.create("button", "", container);
      button.type = "button";
      button.innerHTML = `
        <svg class="shrine-table-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#111827" d="M12 2 1 7l11 5 11-5-11-5Zm0 8L1 5v3l11 5 11-5V5l-11 5Zm0 6L1 11v3l11 5 11-5v-3l-11 5Z"/>
        </svg>
        <span>${escapeHtml(t("tableButton"))}</span>
      `;

      tablePanelEl = L.DomUtil.create("div", "shrine-drop hidden", container);
      tablePanelEl.innerHTML = `
        <div class="panel-search">
          <input id="shrineSearch" type="text" placeholder="${escapeHtml(
            t("searchPlaceholder"),
          )}" autocomplete="off" />
        </div>
        <div class="panel-list" id="shrinePanelList"></div>
      `;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        toggleTablePanel();

        if (tablePanelEl && !tablePanelEl.classList.contains("hidden")) {
          setTimeout(() => {
            const searchInput = document.getElementById("shrineSearch");
            if (searchInput) searchInput.focus();
          }, 0);
        }
      });

      setTimeout(() => {
        const searchInput = document.getElementById("shrineSearch");
        if (!searchInput) return;
        searchInput.addEventListener("input", () => {
          renderTableList(searchInput.value);
        });
      }, 0);

      return container;
    },
  });

  map.addControl(new TableControl());
}

function addMarker(rawRow, idx) {
  const row = normalizeSheetRow(rawRow);
  const latLng = parseLatLng(row);
  if (!latLng) return;

  const title = getLocalizedFieldValue(row, "Name") || row.Name || `Shrine ${idx + 1}`;
  const marker = L.marker([latLng.lat, latLng.lng], {
    icon: makeDotIcon(),
  }).addTo(map);

  marker.bindPopup(
    `<a class="popup-shrine-link" href="${escapeHtml(
      getShrinePageUrl(idx),
    )}">${escapeHtml(title)}</a>`,
  );

  marker.bindTooltip(title, {
    direction: "top",
    offset: [0, -10],
    opacity: 1,
    sticky: true,
  });

  marker.on("mouseover", () => {
    marker.setIcon(makeDotIcon({ selected: selectedIdx === idx, hover: true }));
    marker.openTooltip();
  });

  marker.on("mouseout", () => {
    marker.setIcon(makeDotIcon({ selected: selectedIdx === idx }));
    marker.closeTooltip();
  });

  let lastActivationAt = 0;
  const handleMarkerActivate = (event) => {
    const now = Date.now();
    if (now - lastActivationAt < 280) return;
    lastActivationAt = now;

    markMarkerInteraction(2200);
    if (event?.originalEvent) L.DomEvent.stop(event.originalEvent);

    setSelected(idx);
    map.setView([latLng.lat, latLng.lng], Math.max(map.getZoom(), 13), {
      animate: true,
    });
    renderDetails(row, idx);
    openSidebar();
    hideTablePanel();
    marker.openPopup();
  };

  const preActivateMarker = (event) => {
    markMarkerInteraction(2200);
    if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
  };
  marker.on("touchstart", preActivateMarker);
  marker.on("pointerdown", preActivateMarker);
  marker.on("mousedown", preActivateMarker);
  marker.on("click", handleMarkerActivate);
  marker.on("touchend", handleMarkerActivate);

  markers[idx] = marker;
}

function loadCsv() {
  setStatus(t("loading"));

  Papa.parse(CSV_FILE, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = (results.data || []).map(normalizeSheetRow);
      rowsStore.length = 0;
      rowsStore.push(...rows);
      primeTranslationCache(rowsStore);

      if (!rowsStore.length) {
        setStatus("Loaded CSV but found no rows.");
        clearDetails();
        collapseSidebar();
        return;
      }

      rowsStore.forEach((row, idx) => addMarker(row, idx));
      const validMarkers = markers.filter(Boolean);

      if (!validMarkers.length) {
        setStatus("No valid points found. Check Latitude and Longitude columns.");
        clearDetails();
        collapseSidebar();
        return;
      }

      const featureGroup = L.featureGroup(validMarkers);
      map.fitBounds(featureGroup.getBounds().pad(0.3), {
        maxZoom: DEFAULT_ZOOM,
      });

      setStatus("");
      clearDetails();
      collapseSidebar();
      buildTableControls();
      setTimeout(() => renderTableList(""), 0);
    },
    error: (error) => {
      console.error("CSV load error:", error);
      setStatus(`Failed to load CSV.\n${error?.message || String(error)}`);
      clearDetails();
      collapseSidebar();
    },
  });
}

localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
persistTranslationCache();
initLanguageToggle();
loadCsv();
