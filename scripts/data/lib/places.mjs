/**
 * places.mjs — the shared place vocabulary for the data/prerender scripts.
 *
 * Mirrors the `PLACES` table in src/lib/data/places.ts, with each `match`
 * regular expression carried as its `source` string so a `.mjs` file can hold
 * it. Guarded against drift from the app's TypeScript copy — structurally *and*
 * behaviourally, over the shipped 169-row snapshot — by
 * src/lib/data/__tests__/placesVocabSync.test.ts.
 *
 * Why a mirror and not an import: the prerenderer runs under plain node with no
 * TypeScript loader, and the app's copy is the one that must stay readable and
 * annotated. This is the same arrangement as slugs.mjs, which mirrors
 * slugify.ts under the same kind of guard, and the reason it works is that the
 * guard compares the tables field by field rather than trusting either side.
 *
 * The rationale for every entry — why the vocabulary is closed, why a name is
 * matched anywhere in the Location string, and why one site can be in two
 * places — is documented once, in places.ts. Do not restate it here; edit both
 * tables together and let the guard prove you did.
 */

export const PLACE_VOCABULARY = [
  { slug: 'badin', name: 'Badin', pattern: '\\bBadin\\b' },
  { slug: 'bahawalpur', name: 'Bahawalpur', pattern: '\\bBahawalpur\\b' },
  { slug: 'bhalwal', name: 'Bhalwal', pattern: '\\bBhalwal\\b' },
  { slug: 'bhit-shah', name: 'Bhit Shah', pattern: '\\bBhit(?:\\s+Shah)?\\b' },
  { slug: 'buner', name: 'Buner', pattern: '\\bBuner\\b' },
  { slug: 'chakwal', name: 'Chakwal', pattern: '\\bChakwal\\b' },
  { slug: 'chiniot', name: 'Chiniot', pattern: '\\bChiniot\\b' },
  { slug: 'chunian', name: 'Chunian', pattern: '\\bChunian\\b' },
  { slug: 'dadu', name: 'Dadu', pattern: '\\bDadu\\b' },
  { slug: 'dera-ghazi-khan', name: 'Dera Ghazi Khan', pattern: '\\bDera\\s+Ghazi\\s+Khan\\b' },
  { slug: 'eminabad', name: 'Eminabad', pattern: '\\bEminabad\\b' },
  { slug: 'farooqabad', name: 'Farooqabad', pattern: '\\bFarooqabad\\b' },
  { slug: 'ghotki', name: 'Ghotki District', pattern: '\\bGhotki\\b' },
  { slug: 'gujranwala', name: 'Gujranwala', pattern: '\\bGujranwala\\b' },
  { slug: 'gujrat', name: 'Gujrat', pattern: '\\bGujrat\\b' },
  { slug: 'hasan-abdal', name: 'Hasan Abdal', pattern: '\\bHasan\\s+Abdal\\b' },
  { slug: 'hingol', name: 'Hingol National Park', pattern: '\\bHingol\\b' },
  { slug: 'hujra', name: 'Hujra', pattern: '\\bHujra\\b' },
  { slug: 'hyderabad', name: 'Hyderabad', pattern: '\\bHyderabad\\b' },
  { slug: 'islamabad', name: 'Islamabad', pattern: '\\bIslamabad\\b' },
  { slug: 'jarwa', name: 'Jarwa', pattern: '\\bJarwa\\b' },
  { slug: 'jhal-magsi', name: 'Jhal Magsi', pattern: '\\bJhal\\s+Magsi\\b' },
  { slug: 'jhang', name: 'Jhang', pattern: '\\bJhang\\b' },
  { slug: 'jhelum', name: 'Jhelum', pattern: '\\bJhelum\\b' },
  { slug: 'jhok-sharif', name: 'Jhok Sharif', pattern: '\\bJhok(?:\\s+Sharif)?\\b' },
  { slug: 'kalat', name: 'Kalat', pattern: '\\bKalat\\b' },
  { slug: 'karachi', name: 'Karachi', pattern: '\\bKarachi\\b' },
  { slug: 'kartarpur', name: 'Kartarpur', pattern: '\\bKartarpur\\b' },
  { slug: 'kasur', name: 'Kasur', pattern: '\\bKasur\\b' },
  { slug: 'khairpur', name: 'Khairpur', pattern: '\\bKhairpur\\b' },
  { slug: 'khushab', name: 'Khushab', pattern: '\\bKhushab\\b' },
  { slug: 'khuzdar', name: 'Khuzdar', pattern: '\\bKhuzdar\\b' },
  { slug: 'kohat', name: 'Kohat', pattern: '\\bKohat\\b' },
  { slug: 'lahore', name: 'Lahore', pattern: '\\bLahore\\b' },
  { slug: 'larkana', name: 'Larkana', pattern: '\\bLarkana\\b' },
  { slug: 'lasbela', name: 'Lasbela District', pattern: '\\bLasbela\\b' },
  { slug: 'luari-sharif', name: 'Luari Sharif', pattern: '\\bLuari\\s+Sharif\\b' },
  { slug: 'malka-hans', name: 'Malka Hans', pattern: '\\bMalka\\s+Hans\\b' },
  { slug: 'mansehra', name: 'Mansehra', pattern: '\\bMansehra\\b' },
  { slug: 'matiari', name: 'Matiari', pattern: '\\bMatiari\\b' },
  { slug: 'mithankot', name: 'Mithankot', pattern: '\\bMithankot\\b|\\bKot\\s+Mithan\\b' },
  { slug: 'multan', name: 'Multan', pattern: '\\bMultan\\b' },
  { slug: 'nagarparkar', name: 'Nagarparkar', pattern: '\\bNagarparkar\\b' },
  { slug: 'nankana-sahib', name: 'Nankana Sahib', pattern: '\\bNankana\\s+Sahib\\b' },
  { slug: 'narowal', name: 'Narowal', pattern: '\\bNarowal\\b' },
  { slug: 'nowshera', name: 'Nowshera', pattern: '\\bNowshera\\b' },
  { slug: 'okara', name: 'Okara', pattern: '\\bOkara\\b' },
  { slug: 'pakpattan', name: 'Pakpattan', pattern: '\\bPakpattan\\b' },
  { slug: 'peshawar', name: 'Peshawar', pattern: '\\bPeshawar\\b' },
  { slug: 'phalia', name: 'Phalia', pattern: '\\bPhalia\\b' },
  { slug: 'qambar-shahdadkot', name: 'Qambar–Shahdadkot District', pattern: '\\bQambar[-–]\\s?Shahdadkot\\b|\\bQambar\\b' },
  { slug: 'quetta', name: 'Quetta', pattern: '\\bQuetta\\b' },
  { slug: 'rajanpur', name: 'Rajanpur', pattern: '\\bRajanpur\\b' },
  { slug: 'rawalpindi', name: 'Rawalpindi', pattern: '\\bRawalpindi\\b' },
  { slug: 'sargodha', name: 'Sargodha', pattern: '\\bSargodha\\b|\\bSial\\s+Sharif\\b' },
  { slug: 'satghara', name: 'Satghara', pattern: '\\bSatghara\\b' },
  { slug: 'sehwan', name: 'Sehwan Sharif', pattern: '\\bSehwan\\b' },
  { slug: 'shahpur', name: 'Shahpur', pattern: '\\bShahpur\\b' },
  { slug: 'sharaqpur', name: 'Sharaqpur', pattern: '\\bSharaqpur\\b' },
  { slug: 'sharda', name: 'Sharda', pattern: '\\bSharda\\b' },
  { slug: 'sheikhupura', name: 'Sheikhupura', pattern: '\\bSheikhupura\\b' },
  { slug: 'shikarpur', name: 'Shikarpur', pattern: '\\bShikarpur\\b' },
  { slug: 'sialkot', name: 'Sialkot', pattern: '\\bSialkot\\b' },
  { slug: 'sukkur', name: 'Sukkur', pattern: '\\bSukkur\\b' },
  { slug: 'tando-allahyar', name: 'Tando Allahyar', pattern: '\\bTando\\s+Allahyar\\b' },
  { slug: 'tando-muhammad-khan', name: 'Tando Muhammad Khan', pattern: '\\bTando\\s+Muhammad\\s+Khan\\b' },
  { slug: 'taunsa-sharif', name: 'Taunsa Sharif', pattern: '\\bTaunsa\\b' },
  { slug: 'tharparkar', name: 'Tharparkar', pattern: '\\bTharparkar\\b' },
  { slug: 'uch-sharif', name: 'Uch Sharif', pattern: '\\bUch(?:\\s+Sharif)?\\b' },
  { slug: 'umerkot', name: 'Umerkot', pattern: '\\bUm[ae]?rkot\\b' },
  { slug: 'wazirabad', name: 'Wazirabad', pattern: '\\bWazirabad\\b' },
];

/** Compiled once; the flags match the app's (`i`, no `g` — these are tests, not
 *  scans, and a lastIndex would make the result depend on call order). */
const COMPILED = PLACE_VOCABULARY.map((p) => ({ ...p, re: new RegExp(p.pattern, 'i') }));

/**
 * Every vocabulary entry whose pattern occurs in one free-text Location.
 * More than one is normal and correct: "Uch Sharif, Bahawalpur District" is in
 * both.
 */
export function placesForLocation(location) {
  if (!location) return [];
  return COMPILED.filter((p) => p.re.test(location)).map(({ slug, name, pattern }) => ({
    slug,
    name,
    pattern,
  }));
}

/**
 * The Location string of a raw sheet row, as the app reads it.
 *
 * Exactly `row['Location']` and nothing else, because that is what
 * `getFieldValue(row, 'Location')` does in fieldAliasing.ts. The first draft
 * here also tried 'Address' and 'Place', which sounds harmless and is not: a
 * row carrying an Address but no Location would then be placed by the
 * prerenderer and unplaced by the app, and the two would disagree about which
 * files should exist. Held to the app's reading by placesVocabSync.test.ts.
 */
export function locationOfRow(row) {
  const v = row?.['Location'];
  return v !== null && v !== undefined && String(v).trim() ? String(v).trim() : '';
}

/**
 * Place → site count over raw sheet rows, dropping places with fewer than
 * `minSites`. Mirrors `buildPlaces(shrines, minSites)`; the app's copy also
 * computes tradition counts and a date span, which the prerenderer has no use
 * for.
 */
export function countPlaces(rows, locationOf, minSites = 2) {
  const counts = new Map();
  for (const row of rows) {
    for (const place of placesForLocation(locationOf(row))) {
      counts.set(place.slug, (counts.get(place.slug) ?? 0) + 1);
    }
  }
  return PLACE_VOCABULARY.filter((p) => (counts.get(p.slug) ?? 0) >= minSites).map((p) => ({
    ...p,
    count: counts.get(p.slug),
  }));
}

/**
 * Provinces, mirrored from `PROVINCES` and `buildProvinces` in
 * src/lib/data/places.ts, where the three-step rule is documented. Held to the
 * app by placesVocabSync.test.ts, which compares the counts over the snapshot.
 */
export const PROVINCE_VOCABULARY = [
  { slug: 'azad-kashmir', name: 'Azad Kashmir', pattern: '\\bAzad\\s+(?:Jammu\\s+and\\s+)?Kashmir\\b' },
  { slug: 'balochistan', name: 'Balochistan', pattern: null },
  { slug: 'khyber-pakhtunkhwa', name: 'Khyber Pakhtunkhwa', pattern: null },
  { slug: 'punjab', name: 'Punjab', pattern: null },
  { slug: 'sindh', name: 'Sindh', pattern: null },
];

/** `extractRegion` in src/lib/data/shrineModel.ts, line for line. */
const ADMIN_UNITS = [
  { match: /^Azad\s+(?:Jammu\s+and\s+)?Kashmir\b/i, value: 'Azad Kashmir' },
  { match: /^Gilgit[-\s]Baltistan\b/i, value: 'Gilgit-Baltistan' },
  { match: /^Islamabad(?:\s+Capital\s+Territory)?\b/i, value: 'Islamabad Capital Territory' },
  { match: /^Khyber\s+Pakhtunkhwa\b/i, value: 'Khyber Pakhtunkhwa' },
  { match: /^Bal[ou]chistan\b/i, value: 'Balochistan' },
  { match: /^Punjab\b/i, value: 'Punjab' },
  { match: /^Sindh\b/i, value: 'Sindh' },
];

export function regionOfLocation(location) {
  if (!location) return '';
  const parts = location
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  for (const part of [...parts].reverse()) {
    for (const unit of ADMIN_UNITS) if (unit.match.test(part)) return unit.value;
  }
  for (const part of [...parts].reverse()) if (/^Pakistan\b/i.test(part)) return 'Pakistan';
  return '';
}

/** Province slug → site count over raw rows, every province with a site. */
export function countProvinces(rows, locationOf) {
  const locations = rows.map((row) => locationOf(row));
  const seen = new Map();
  for (const location of locations) {
    const region = regionOfLocation(location);
    if (!region || !PROVINCE_VOCABULARY.some((p) => p.name === region)) continue;
    for (const place of placesForLocation(location)) {
      const set = seen.get(place.slug) ?? new Set();
      set.add(region);
      seen.set(place.slug, set);
    }
  }
  const index = new Map([...seen].filter(([, set]) => set.size === 1).map(([slug, set]) => [slug, [...set][0]]));
  const byName = (name) => PROVINCE_VOCABULARY.find((p) => p.name === name) ?? null;
  const counts = new Map();
  for (const location of locations) {
    const region = regionOfLocation(location);
    // "Pakistan" (the country fallback) is no province: read on.
    let province = region ? byName(region) : null;
    if (!province) {
      province = PROVINCE_VOCABULARY.find((p) => p.pattern && new RegExp(p.pattern, 'i').test(location)) ?? null;
      if (!province) {
        const from = new Set(placesForLocation(location).map((p) => index.get(p.slug)).filter(Boolean));
        province = from.size === 1 ? byName([...from][0]) : null;
      }
    }
    if (province) counts.set(province.slug, (counts.get(province.slug) ?? 0) + 1);
  }
  return PROVINCE_VOCABULARY.filter((p) => counts.has(p.slug)).map((p) => ({
    ...p,
    count: counts.get(p.slug),
  }));
}
