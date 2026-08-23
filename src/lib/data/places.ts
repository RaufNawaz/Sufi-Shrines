import type { Shrine } from '../../types/shrine';
import { categoryKey, type CategoryKey } from './categoryKey';

/**
 * Places as entities — Track B of `docs/planning/SHARED_GROUND_VISION.md`.
 *
 * The archive presents every site as an island. The coordinates say otherwise:
 * **35 of 169 sites are in or around Lahore**, and 29 places hold two or more.
 * "Lahore" and "Uch Sharif" should be readable subjects, not filter values.
 *
 * ── Why a vocabulary, and why matched anywhere in the string ─────────────────
 *
 * There is no District, City, Province or Region column. All of it is derived
 * from one free-text `Location`, and positional parsing does not survive it —
 * measured across the 169-row snapshot, the last comma-separated segment is
 * "Pakistan" for 124 rows and a province for 35, and six rows carry a paragraph
 * of survey qualification instead of an address.
 *
 * `extractRegion` in shrineModel.ts already solved this one level up: a closed
 * vocabulary of the seven provinces, matched at the head of any segment. This is
 * the same technique one level down. Every entry below is derived from a
 * `Location` string that actually appears in the data — none is inferred from
 * general knowledge of Pakistani geography (RULE 2).
 *
 * ── Two consequences, both deliberate ───────────────────────────────────────
 *
 * 1. **A site can belong to more than one place.** "Uch Sharif, Bahawalpur
 *    District, Punjab" matches both `uch-sharif` and `bahawalpur`, because it is
 *    in both. Twelve rows do this and every one is a town or neighbourhood
 *    inside its own district or city. Treating them as exclusive would mean
 *    choosing which of two true statements to suppress.
 * 2. **A name matched anywhere covers the level variations for free.** One
 *    `\bLahore\b` entry catches "Lahore", "Lahore District" and "Walled City,
 *    Lahore" without a hierarchy table. That is not a claim that a district is a
 *    city; it is the weaker and true claim that a site in Lahore District is in
 *    the Lahore area.
 *
 * A site whose Location names nothing in the vocabulary is **unplaced**, and
 * `buildPlaces` returns the count so the gap is visible rather than rounded
 * away.
 */

/**
 * The closed place vocabulary.
 *
 * `name` is spelled as the **dictionary and the data** spell it, which is not
 * always the shortest form: the sheet says "Sehwan Sharif", "Ghotki District"
 * and "Hingol National Park", and the Urdu dictionary is keyed on exactly those
 * strings. Shortening a name to look tidier costs its Urdu — measured: five of
 * the first sixty-two entries had no Urdu until their names were spelled the way
 * the archive spells them. `places.test.ts` asserts every name resolves. `match`
 * is deliberately loose about level ("Multan" catches "Multan City") and strict
 * about word boundaries, so `Dadu` cannot match inside another word. Entries are
 * ordered alphabetically by slug for review, not by frequency.
 *
 * Sixty-six entries as of 21 August 2026. The last five were found by reading
 * the *unplaced* list rather than the data: Quetta, Hyderabad, Kasur and Sharda
 * were missing outright, and Girhor Sharif was unplaced because the sheet spells
 * its district "Umarkot" while the pattern only accepted "Umerkot". One row
 * remains unplaced and always will — its survey states no city, district, tehsil
 * or province anywhere.
 *
 * Where the data uses an en-dash in a name (Qambar–Shahdadkot) the pattern
 * accepts either dash, because the sheet is inconsistent about it.
 */
export interface PlaceVocabularyEntry {
  slug: string;
  name: string;
  match: RegExp;
}

export const PLACES: readonly PlaceVocabularyEntry[] = [
  { slug: 'badin', name: 'Badin', match: /\bBadin\b/i },
  { slug: 'bahawalpur', name: 'Bahawalpur', match: /\bBahawalpur\b/i },
  { slug: 'bhalwal', name: 'Bhalwal', match: /\bBhalwal\b/i },
  { slug: 'bhit-shah', name: 'Bhit Shah', match: /\bBhit(?:\s+Shah)?\b/i },
  { slug: 'buner', name: 'Buner', match: /\bBuner\b/i },
  { slug: 'chakwal', name: 'Chakwal', match: /\bChakwal\b/i },
  { slug: 'chiniot', name: 'Chiniot', match: /\bChiniot\b/i },
  { slug: 'dadu', name: 'Dadu', match: /\bDadu\b/i },
  { slug: 'dera-ghazi-khan', name: 'Dera Ghazi Khan', match: /\bDera\s+Ghazi\s+Khan\b/i },
  { slug: 'eminabad', name: 'Eminabad', match: /\bEminabad\b/i },
  { slug: 'farooqabad', name: 'Farooqabad', match: /\bFarooqabad\b/i },
  { slug: 'ghotki', name: 'Ghotki District', match: /\bGhotki\b/i },
  { slug: 'gujranwala', name: 'Gujranwala', match: /\bGujranwala\b/i },
  { slug: 'gujrat', name: 'Gujrat', match: /\bGujrat\b/i },
  { slug: 'hasan-abdal', name: 'Hasan Abdal', match: /\bHasan\s+Abdal\b/i },
  { slug: 'hingol', name: 'Hingol National Park', match: /\bHingol\b/i },
  { slug: 'hyderabad', name: 'Hyderabad', match: /\bHyderabad\b/i },
  { slug: 'islamabad', name: 'Islamabad', match: /\bIslamabad\b/i },
  { slug: 'jhal-magsi', name: 'Jhal Magsi', match: /\bJhal\s+Magsi\b/i },
  { slug: 'jhang', name: 'Jhang', match: /\bJhang\b/i },
  { slug: 'jhelum', name: 'Jhelum', match: /\bJhelum\b/i },
  { slug: 'jhok-sharif', name: 'Jhok Sharif', match: /\bJhok(?:\s+Sharif)?\b/i },
  { slug: 'kalat', name: 'Kalat', match: /\bKalat\b/i },
  { slug: 'karachi', name: 'Karachi', match: /\bKarachi\b/i },
  { slug: 'kartarpur', name: 'Kartarpur', match: /\bKartarpur\b/i },
  { slug: 'kasur', name: 'Kasur', match: /\bKasur\b/i },
  { slug: 'khairpur', name: 'Khairpur', match: /\bKhairpur\b/i },
  { slug: 'khushab', name: 'Khushab', match: /\bKhushab\b/i },
  { slug: 'khuzdar', name: 'Khuzdar', match: /\bKhuzdar\b/i },
  { slug: 'kohat', name: 'Kohat', match: /\bKohat\b/i },
  { slug: 'lahore', name: 'Lahore', match: /\bLahore\b/i },
  { slug: 'larkana', name: 'Larkana', match: /\bLarkana\b/i },
  { slug: 'lasbela', name: 'Lasbela District', match: /\bLasbela\b/i },
  { slug: 'luari-sharif', name: 'Luari Sharif', match: /\bLuari\s+Sharif\b/i },
  { slug: 'malka-hans', name: 'Malka Hans', match: /\bMalka\s+Hans\b/i },
  { slug: 'mansehra', name: 'Mansehra', match: /\bMansehra\b/i },
  { slug: 'matiari', name: 'Matiari', match: /\bMatiari\b/i },
  { slug: 'mithankot', name: 'Mithankot', match: /\bMithankot\b|\bKot\s+Mithan\b/i },
  { slug: 'multan', name: 'Multan', match: /\bMultan\b/i },
  { slug: 'nagarparkar', name: 'Nagarparkar', match: /\bNagarparkar\b/i },
  { slug: 'nankana-sahib', name: 'Nankana Sahib', match: /\bNankana\s+Sahib\b/i },
  { slug: 'narowal', name: 'Narowal', match: /\bNarowal\b/i },
  { slug: 'nowshera', name: 'Nowshera', match: /\bNowshera\b/i },
  { slug: 'okara', name: 'Okara', match: /\bOkara\b/i },
  { slug: 'pakpattan', name: 'Pakpattan', match: /\bPakpattan\b/i },
  { slug: 'peshawar', name: 'Peshawar', match: /\bPeshawar\b/i },
  { slug: 'phalia', name: 'Phalia', match: /\bPhalia\b/i },
  {
    slug: 'qambar-shahdadkot',
    name: 'Qambar–Shahdadkot District',
    match: /\bQambar[-–]\s?Shahdadkot\b|\bQambar\b/i,
  },
  { slug: 'quetta', name: 'Quetta', match: /\bQuetta\b/i },
  { slug: 'rajanpur', name: 'Rajanpur', match: /\bRajanpur\b/i },
  { slug: 'rawalpindi', name: 'Rawalpindi', match: /\bRawalpindi\b/i },
  { slug: 'sargodha', name: 'Sargodha', match: /\bSargodha\b|\bSial\s+Sharif\b/i },
  { slug: 'sehwan', name: 'Sehwan Sharif', match: /\bSehwan\b/i },
  { slug: 'shahpur', name: 'Shahpur', match: /\bShahpur\b/i },
  { slug: 'sharaqpur', name: 'Sharaqpur', match: /\bSharaqpur\b/i },
  { slug: 'sharda', name: 'Sharda', match: /\bSharda\b/i },
  { slug: 'sheikhupura', name: 'Sheikhupura', match: /\bSheikhupura\b/i },
  { slug: 'shikarpur', name: 'Shikarpur', match: /\bShikarpur\b/i },
  { slug: 'sialkot', name: 'Sialkot', match: /\bSialkot\b/i },
  { slug: 'sukkur', name: 'Sukkur', match: /\bSukkur\b/i },
  { slug: 'tando-allahyar', name: 'Tando Allahyar', match: /\bTando\s+Allahyar\b/i },
  {
    slug: 'tando-muhammad-khan',
    name: 'Tando Muhammad Khan',
    match: /\bTando\s+Muhammad\s+Khan\b/i,
  },
  { slug: 'taunsa-sharif', name: 'Taunsa Sharif', match: /\bTaunsa\b/i },
  { slug: 'tharparkar', name: 'Tharparkar', match: /\bTharparkar\b/i },
  { slug: 'uch-sharif', name: 'Uch Sharif', match: /\bUch\s+Sharif\b/i },
  /* Both spellings occur in the data — "Umerkot" in the Location column of one
     row and "Umarkot" in another. `Ume?rkot` matched only the first, which left
     Girhor Sharif unplaced for a missing vowel. */
  { slug: 'umerkot', name: 'Umerkot', match: /\bUm[ae]?rkot\b/i },
] as const;

export interface PlaceRecord {
  slug: string;
  name: string;
  /** Sites whose Location names this place. Never empty in `buildPlaces`. */
  shrines: Shrine[];
  /** How many sites of each tradition, ordered by count then key. */
  traditions: { key: Exclude<CategoryKey, 'default'>; count: number }[];
  /** Earliest and latest four-digit year found in the sites' date fields, or
   *  null when none of them records one. Never inferred. */
  yearSpan: { earliest: number; latest: number } | null;
}

export interface PlacesResult {
  places: PlaceRecord[];
  /** Sites whose Location names nothing in the vocabulary. */
  unplaced: Shrine[];
}

/** Places named by one shrine's Location — may be more than one (town + district). */
export function placesForShrine(shrine: Shrine): PlaceVocabularyEntry[] {
  const location = shrine.location ?? '';
  if (!location) return [];
  return PLACES.filter((p) => p.match.test(location));
}

/**
 * The first four-digit year in a shrine's date fields.
 *
 * Deliberately narrow: it reads `yearBuilt` and `founded` and takes a bare
 * 1000–2099 run. It does *not* try to interpret "1416 AH" or "c. 1165
 * (rebuilt 1970s)" — those hedges are the most honest content in the archive
 * (RULE 2) and flattening them into a point would launder uncertainty. A row
 * whose date it cannot read simply does not contribute to a span.
 */
function firstGregorianYear(shrine: Shrine): number | null {
  for (const raw of [shrine.yearBuilt, shrine.founded]) {
    const text = String(raw ?? '');
    if (/\bAH\b|\bھ/.test(text)) continue; // Hijri — not comparable without conversion
    const m = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(text);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Group the archive by place.
 *
 * Places with fewer than `minSites` are dropped from `places` but their sites
 * are **not** moved to `unplaced` — they are placed, just not densely enough to
 * be worth a page. `unplaced` means "the Location names nowhere we know".
 */
export function buildPlaces(shrines: readonly Shrine[], minSites = 2): PlacesResult {
  const bySlug = new Map<string, Shrine[]>();
  const unplaced: Shrine[] = [];

  for (const shrine of shrines) {
    const matches = placesForShrine(shrine);
    if (matches.length === 0) {
      unplaced.push(shrine);
      continue;
    }
    for (const place of matches) {
      const list = bySlug.get(place.slug);
      if (list) list.push(shrine);
      else bySlug.set(place.slug, [shrine]);
    }
  }

  const places: PlaceRecord[] = [];
  for (const entry of PLACES) {
    const group = bySlug.get(entry.slug);
    if (!group || group.length < minSites) continue;

    const counts = new Map<Exclude<CategoryKey, 'default'>, number>();
    for (const s of group) {
      const key = categoryKey(s.category);
      if (key === 'default') continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const years = group.map(firstGregorianYear).filter((y): y is number => y !== null);

    places.push({
      slug: entry.slug,
      name: entry.name,
      shrines: group,
      traditions: [...counts]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
      yearSpan: years.length
        ? { earliest: Math.min(...years), latest: Math.max(...years) }
        : null,
    });
  }

  places.sort((a, b) => b.shrines.length - a.shrines.length || a.name.localeCompare(b.name));
  return { places, unplaced };
}
