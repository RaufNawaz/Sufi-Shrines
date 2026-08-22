import type { Lang, Shrine } from '../../types/shrine';

/**
 * Built form (`site_type`) — the sheet's short-term vocabulary for what
 * actually stands at a site. Ten values cover 166 of 169 rows; two rows
 * carry survey prose in the column itself, and one is blank. The prose
 * values are NOT normalized into the vocabulary (RULE 2: report what the
 * data says) — they fall through `siteTypeKey` as null and render verbatim.
 *
 * Labels follow the enum-label-map model (TRADITION_LABELS / CATEGORY_LABELS):
 * sheet values are join keys, these labels are cosmetic.
 */

export type SiteTypeKey =
  | 'temple'
  | 'complex'
  | 'dargah-mazar'
  | 'gurdwara'
  | 'mausoleum-memorial'
  | 'khanqah'
  | 'tomb-shrine'
  | 'cave-shrine'
  | 'natural-sacred-site'
  | 'martyrs-grave';

/** Exact (case-insensitive, trimmed) sheet vocabulary → key. Deliberately
 * not substring matching: the prose values contain words like "shrine
 * complex" and "tomb shrine" and must not be claimed by the vocabulary. */
const SITE_TYPE_VOCABULARY: Record<string, SiteTypeKey> = {
  temple: 'temple',
  complex: 'complex',
  'dargah/mazar': 'dargah-mazar',
  gurdwara: 'gurdwara',
  'mausoleum/memorial': 'mausoleum-memorial',
  khanqah: 'khanqah',
  'tomb-shrine': 'tomb-shrine',
  'cave shrine': 'cave-shrine',
  'natural sacred site': 'natural-sacred-site',
  "martyr's grave/shrine": 'martyrs-grave',
};

export function siteTypeKey(value: string): SiteTypeKey | null {
  return SITE_TYPE_VOCABULARY[(value || '').trim().toLowerCase()] ?? null;
}

export const SITE_TYPE_LABELS: Record<SiteTypeKey, { en: string; ur: string }> = {
  temple: { en: 'Temple', ur: 'مندر' },
  complex: { en: 'Complex', ur: 'احاطہ' },
  'dargah-mazar': { en: 'Dargah / Mazar', ur: 'درگاہ / مزار' },
  gurdwara: { en: 'Gurdwara', ur: 'گردوارہ' },
  'mausoleum-memorial': { en: 'Mausoleum / Memorial', ur: 'مقبرہ / یادگار' },
  khanqah: { en: 'Khanqah', ur: 'خانقاہ' },
  'tomb-shrine': { en: 'Tomb-shrine', ur: 'مزار' },
  'cave-shrine': { en: 'Cave shrine', ur: 'غار کا مزار' },
  'natural-sacred-site': { en: 'Natural sacred site', ur: 'قدرتی مقدس مقام' },
  'martyrs-grave': { en: "Martyr's grave / shrine", ur: 'شہید کی قبر / مزار' },
};

/** Bilingual label for a raw site_type value, or null when it isn't one of
 * the ten vocabulary values (caller renders the raw value verbatim). */
export function siteTypeDisplayLabel(value: string, lang: Lang): string | null {
  const key = siteTypeKey(value);
  return key ? SITE_TYPE_LABELS[key][lang] : null;
}

export interface SiteTypeGroup {
  /** Vocabulary key, or null for a prose/blank group. */
  key: SiteTypeKey | null;
  /** Anchor id on /typology — the vocabulary key, or a stable fallback. */
  anchor: string;
  /** Raw sheet value for prose groups ('' for the not-recorded group);
   * vocabulary groups render from SITE_TYPE_LABELS instead. */
  rawValue: string;
  shrines: Shrine[];
}

/**
 * Group the dataset by built form for the typology atlas: vocabulary groups
 * sorted by size (ties by label), then prose one-offs verbatim, then the
 * blank rows last as "not recorded". Every shrine lands in exactly one group.
 */
export function groupBySiteType(shrines: Shrine[]): SiteTypeGroup[] {
  const byKey = new Map<SiteTypeKey, Shrine[]>();
  const byProse = new Map<string, Shrine[]>();
  const blank: Shrine[] = [];

  for (const s of shrines) {
    const raw = (s.siteType || '').trim();
    if (!raw) {
      blank.push(s);
      continue;
    }
    const key = siteTypeKey(raw);
    if (key) {
      byKey.set(key, [...(byKey.get(key) ?? []), s]);
    } else {
      byProse.set(raw, [...(byProse.get(raw) ?? []), s]);
    }
  }

  const vocabGroups: SiteTypeGroup[] = [...byKey.entries()]
    .sort(
      ([ka, a], [kb, b]) =>
        b.length - a.length || SITE_TYPE_LABELS[ka].en.localeCompare(SITE_TYPE_LABELS[kb].en),
    )
    .map(([key, members]) => ({ key, anchor: key, rawValue: '', shrines: members }));

  const proseGroups: SiteTypeGroup[] = [...byProse.entries()]
    .map(([rawValue, members], i) => ({
      key: null,
      // Prose values are arbitrary text; anchor by position, stably.
      anchor: `as-described-${i + 1}`,
      rawValue,
      shrines: members,
    }))
    .sort((a, b) => b.shrines.length - a.shrines.length || a.rawValue.localeCompare(b.rawValue));

  const groups = [...vocabGroups, ...proseGroups];
  if (blank.length > 0) {
    groups.push({ key: null, anchor: 'not-recorded', rawValue: '', shrines: blank });
  }
  return groups;
}
