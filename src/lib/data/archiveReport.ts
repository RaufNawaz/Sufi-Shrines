import type { Shrine } from '../../types/shrine';
import { getUrduFieldValue } from './fieldAliasing';
import { supportLevelKey, type SupportLevelKey } from './supportLevel';
import { infoLevelKey, type InfoLevelKey } from './infoLevel';
import { siteStatusKey, type SiteStatusKey } from './siteStatus';

/**
 * The State of the Archive (blue-sky item F10, DESIGN_VISION.md Part 3):
 * the archive grading itself in public. Everything here is COMPUTED from the
 * dataset the page loaded — no hardcoded dataset numbers that would drift the
 * moment the sheet is edited. The one external constant is the Punjab Auqaf
 * register size, which is not our data and is cited where it is used.
 */

/** Punjab Auqaf & Religious Affairs administers 534 shrines — its own public
 * functions page, recorded in docs/auqaf_records_brief.md. One provincial
 * register, before Sindh, KP or Balochistan are counted at all. */
export const AUQAF_PUNJAB_REGISTER = 534;
export const AUQAF_REGISTER_ASOF = '2026';

export interface ArchiveReport {
  totalShrines: number;
  supportLevels: Record<SupportLevelKey, number>;
  /** Rows whose support_level is blank or out of vocabulary. */
  supportUnknown: number;
  infoLevels: Record<InfoLevelKey, number>;
  infoUnknown: number;
  statuses: Record<SiteStatusKey, number>;
  statusUnknown: number;
  /** Rows carrying an Urdu article (sheet column or in-repo override). */
  urduDrafted: number;
  categories: Array<{ label: string; count: number }>;
}

export function buildArchiveReport(shrines: Shrine[]): ArchiveReport {
  const supportLevels: Record<SupportLevelKey, number> = {
    'field-verified': 0,
    'source-documented': 0,
    'source-seeded': 0,
    'web-compiled': 0,
  };
  const infoLevels: Record<InfoLevelKey, number> = { full: 0, moderate: 0, low: 0 };
  const statuses: Record<SiteStatusKey, number> = {
    active: 0,
    occasional: 0,
    heritage: 0,
    ruin: 0,
    destroyed: 0,
  };
  let supportUnknown = 0;
  let infoUnknown = 0;
  let statusUnknown = 0;
  let urduDrafted = 0;
  const categoryCounts = new Map<string, number>();

  for (const s of shrines) {
    const sk = supportLevelKey(s.supportLevel);
    if (sk) supportLevels[sk]++;
    else supportUnknown++;

    const ik = infoLevelKey(s.infoLevel);
    if (ik) infoLevels[ik]++;
    else infoUnknown++;

    const stk = siteStatusKey(s.status);
    if (stk) statuses[stk]++;
    else statusUnknown++;

    if (getUrduFieldValue(s.raw, 'Description')) urduDrafted++;

    const cat = (s.category || '').trim();
    if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  return {
    totalShrines: shrines.length,
    supportLevels,
    supportUnknown,
    infoLevels,
    infoUnknown,
    statuses,
    statusUnknown,
    urduDrafted,
    categories: [...categoryCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface ProvenanceSummary {
  /** Shrines whose Description provenance carries at least one citation. */
  withCitations: number;
  /** Shrines whose Description is tiered as an AI-researched draft. */
  aiResearched: number;
  /** Shrines whose Description came from primary-source (OCR) research. */
  primarySource: number;
  /** Shrines tracked in provenance at all. */
  tracked: number;
}

interface ProvenanceStoreLike {
  shrines: Array<{
    fields?: Record<string, { contentTier?: string; citations?: unknown[] } | undefined>;
  }>;
}

export function summarizeProvenance(store: ProvenanceStoreLike): ProvenanceSummary {
  let withCitations = 0;
  let aiResearched = 0;
  let primarySource = 0;
  for (const s of store.shrines) {
    const d = s.fields?.['Description'];
    if (!d) continue;
    if (Array.isArray(d.citations) && d.citations.length > 0) withCitations++;
    if (d.contentTier === 'ai-researched') aiResearched++;
    if (d.contentTier === 'tier1-ocr') primarySource++;
  }
  return { withCitations, aiResearched, primarySource, tracked: store.shrines.length };
}
