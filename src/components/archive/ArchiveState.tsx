import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { isRtlLang } from '../../lib/i18n/languages';
import {
  buildArchiveReport,
  summarizeProvenance,
  type ProvenanceSummary,
} from '../../lib/data/archiveReport';
import { SITE_STATUS_LABEL_KEYS, type SiteStatusKey } from '../../lib/data/siteStatus';
import type { UI_TEXT } from '../../lib/i18n/uiStrings';
import { DistributionBlock } from './CoverageStats';
import reviewedLedger from '../../../urdu-i18n/reviewed.json';
import type { Shrine } from '../../types/shrine';

/**
 * The archive grading itself in public — blue-sky item F10 (DESIGN_VISION.md
 * Part 3): "the archive grading itself in public is the brand; this is its
 * yearly proof."
 *
 * This was `/report`. It is now the last third of `/about`, for the reason the
 * whole merge happened: three routes were answering one question, and the reader
 * had to already know two of them existed. What it kept when it moved is what
 * `/coverage` never had — the state of the *sites*, how the prose was made, how
 * far the Urdu mirror has got, and the two hand-written ledgers.
 *
 * Everything numeric is computed from the dataset this page loaded; the two
 * hand-written ledgers are drawn from the project's committed working documents
 * and each correction names its date.
 */

/** SITE_STATUS_LABEL_KEYS deliberately omits 'active' (badges only mark the
 * exceptional states); this counts every state, so complete the map. */
const STATUS_LABEL_KEYS: Record<SiteStatusKey, keyof (typeof UI_TEXT)['en']> = {
  active: 'statusActive',
  ...SITE_STATUS_LABEL_KEYS,
};

const STATUS_KEYS = Object.keys(STATUS_LABEL_KEYS) as SiteStatusKey[];

/** The public corrections ledger — HANDOVER.md §9 and the session logs in
 * TODO.md, rewritten in reader voice. Bilingual data, not UI chrome, so it
 * lives here in the TRADITION_LABELS pattern rather than in uiStrings. */
const CORRECTIONS: Array<{ date: string; en: string; ur: string }> = [
  {
    date: '2026-08-18',
    en: 'The map’s "Invalid key" tiles had been misdiagnosed for weeks as an origin restriction. Measured properly, the cause was the tile provider refusing raster tiles of a custom style; the basemap was rebuilt on vector tiles.',
    ur: 'نقشے کی "غلط کلید" والی ٹائلوں کی وجہ ہفتوں تک غلط سمجھی جاتی رہی۔ جب باقاعدہ پیمائش ہوئی تو سبب کچھ اور نکلا، اور بنیادی نقشہ ویکٹر ٹائلوں پر نئے سرے سے بنایا گیا۔',
  },
  {
    date: '2026-08-18',
    en: 'Ten commits of fixes, believed live, had never deployed: the site builds from a version branch the fixes had not reached. The deploy path itself is now documented and checked.',
    ur: 'دس کمٹس کی اصلاحات، جو جاری سمجھی جاتی تھیں، کبھی شائع ہی نہیں ہوئی تھیں: سائٹ ایک ایسی شاخ سے بنتی تھی جہاں وہ پہنچی ہی نہ تھیں۔ اشاعت کا راستہ اب درج اور جانچ میں ہے۔',
  },
  {
    date: '2026-08-19',
    en: 'On laptop-sized screens the shrine list had collapsed to exactly zero height — present for screen readers, invisible to everyone else. Found by tests, not by looking.',
    ur: 'لیپ ٹاپ جتنی اسکرینوں پر مزارات کی فہرست کی اونچائی عین صفر ہو چکی تھی — اسکرین ریڈر کے لیے موجود، باقی سب کے لیے غائب۔ یہ آنکھ نے نہیں، ٹیسٹوں نے پکڑی۔',
  },
  {
    date: '2026-08-21',
    en: 'Searching in Urdu script returned nothing: the index was reading a column that does not exist, while the screen displayed names from the dictionary. The index now carries what the reader sees.',
    ur: 'اردو رسم الخط میں تلاش کچھ نہیں لاتی تھی: اشاریہ ایک ایسا کالم پڑھ رہا تھا جو موجود ہی نہیں، جبکہ اسکرین پر نام لغت سے دکھتے تھے۔ اب اشاریے میں وہی ہے جو قاری دیکھتا ہے۔',
  },
  {
    date: '2026-08-21',
    en: 'Every page without an active tour printed blank, because one print rule hid the whole document. Scoped, fixed, and guarded by a test.',
    ur: 'جس صفحے پر کوئی گائیڈڈ ٹور فعال نہ ہو وہ چھپائی میں خالی نکلتا تھا، کیونکہ ایک ہی قاعدہ پوری دستاویز چھپا دیتا تھا۔ اب یہ محدود، درست اور ٹیسٹ کی نگرانی میں ہے۔',
  },
];

const LOSSES: Array<{ en: string; ur: string }> = [
  {
    en: 'Mauj Darya Bukhari’s twelve photographs and videos are gone from their source — every link verified dead. The shrine needs re-shooting.',
    ur: 'موج دریا بخاری کی بارہ تصاویر اور ویڈیوز اپنے ماخذ سے مٹ چکی ہیں — ہر ربط جانچ کر مُردہ پایا گیا۔ مزار کی دوبارہ عکس بندی درکار ہے۔',
  },
  {
    en: 'The photographs of Data Darbar and Bibi Pak Daman survive only as heavily compressed copies of themselves.',
    ur: 'داتا دربار اور بی بی پاک دامن کی تصاویر صرف اپنی ہی سخت دبی ہوئی نقلوں کی صورت میں باقی ہیں۔',
  },
  {
    en: 'The archive holds no audio recordings yet, against a stated purpose of preserving oral history. The gap is recorded rather than hidden.',
    ur: 'زبانی تاریخ محفوظ کرنے کے اعلان شدہ مقصد کے مقابل، آرکائیو کے پاس تاحال کوئی صوتی ریکارڈنگ نہیں۔ یہ خلا چھپایا نہیں، درج کیا گیا ہے۔',
  },
];

function StatRow({ label, count, total }: { label: string; count: number; total: number }) {
  const { lang, fmtNum } = useLang();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="report-stat-row">
      <span className="report-stat-label">{label}</span>
      <span className="report-stat-count">
        {fmtNum(count)}
        {/* U+066A ARABIC PERCENT SIGN in Urdu, U+0025 in English. It was ٪ in
            both, which printed an Arabic glyph beside every English figure. */}
        <span className="report-stat-pct"> · {fmtNum(pct)}{isRtlLang(lang) ? '٪' : '%'}</span>
      </span>
    </li>
  );
}

export function ArchiveState({ shrines }: { shrines: readonly Shrine[] }) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);

  const report = useMemo(() => buildArchiveReport([...shrines]), [shrines]);

  // provenance.json is a lazy chunk — /about must not grow the critical path
  // by 170 KB for one section near its end.
  const [provenance, setProvenance] = useState<ProvenanceSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('../../../data/provenance.json').then((m) => {
      if (!cancelled)
        setProvenance(summarizeProvenance(m.default as Parameters<typeof summarizeProvenance>[0]));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewedCount = Object.keys(reviewedLedger as Record<string, unknown>).length;

  /* The status counts as a Distribution, so they render as the same bars as
     every other breakdown on this page. They arrived in a different shape
     because they were built for a page that drew its own. */
  const statusDist = useMemo(
    () => ({
      counts: report.statuses,
      unrecorded: report.statusUnknown,
      total: report.totalShrines,
    }),
    [report],
  );

  return (
    <>
      <DistributionBlock
        id="site-status"
        heading={t('reportStatusHeading')}
        dist={statusDist}
        keys={STATUS_KEYS}
        labelFor={(k) => t(STATUS_LABEL_KEYS[k])}
      />

      {provenance && (
        <section className="coverage-section" id="how-the-words-were-made">
          <h2 className="coverage-section-heading">{t('reportWordsHeading')}</h2>
          <p className="about-note">{t('reportWordsNote')}</p>
          <ul className="report-stat-list">
            <StatRow
              label={t('reportWithCitations')}
              count={provenance.withCitations}
              total={provenance.tracked}
            />
            <StatRow
              label={t('reportAiResearched')}
              count={provenance.aiResearched}
              total={provenance.tracked}
            />
            <StatRow
              label={t('reportPrimarySource')}
              count={provenance.primarySource}
              total={provenance.tracked}
            />
          </ul>
        </section>
      )}

      <section className="coverage-section" id="urdu-mirror">
        <h2 className="coverage-section-heading">{t('reportUrduHeading')}</h2>
        <ul className="report-stat-list">
          <StatRow
            label={t('reportUrduDrafted')}
            count={report.urduDrafted}
            total={report.totalShrines}
          />
          <StatRow
            label={t('reportUrduReviewed')}
            count={reviewedCount}
            total={report.urduDrafted}
          />
        </ul>
        <p className="about-note">{t('reportUrduReviewNote')}</p>
      </section>

      <section className="coverage-section" id="corrected-in-public">
        <h2 className="coverage-section-heading">{t('reportCorrectionsHeading')}</h2>
        <p className="about-note">{t('reportCorrectionsNote')}</p>
        <ul className="report-ledger">
          {CORRECTIONS.map((c) => (
            <li key={c.date + c.en.slice(0, 20)} className="report-ledger-item">
              <span className="report-ledger-date">{fmtNum(c.date)}</span>
              <span className="report-ledger-text">{isRtl ? c.ur : c.en}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="coverage-section" id="what-was-lost">
        <h2 className="coverage-section-heading">{t('reportLostHeading')}</h2>
        <ul className="report-ledger">
          {LOSSES.map((l, i) => (
            <li key={i} className="report-ledger-item">
              <span className="report-ledger-text">{isRtl ? l.ur : l.en}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
