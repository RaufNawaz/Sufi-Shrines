import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine, Lang } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';
import { extractLeadPreviewText } from '../../lib/data/articleParsing';
import { categoryDisplayLabel } from '../../lib/data/categoryKey';
import { figureTypeDisplayLabel } from '../../lib/data/figureType';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { infoLevelKey } from '../../lib/data/infoLevel';
import { supportLevelKey } from '../../lib/data/supportLevel';
import { siteStatusKey, SITE_STATUS_LABEL_KEYS } from '../../lib/data/siteStatus';
import { TOURS, localizeTourTitle } from '../../lib/tours/tours';
import { t as translate } from '../../lib/i18n/uiStrings';
import { ShrineGlyph } from '../ui/ShrineGlyph';
import { InfoLevelBadge } from '../ui/InfoLevelBadge';
import { SupportLevelBadge } from '../ui/SupportLevelBadge';
import { useShareLink } from '../../hooks/useShareLink';
import { useSavedShrines, toggleSaved } from '../../lib/savedShrines';
import { useUrduArticles } from '../../hooks/useUrduArticlesReady';
import { langAttr } from '../../lib/i18n/languages';

interface ShrinePreviewProps {
  shrine: Shrine;
  lang: string;
  localizeField: (row: Shrine['raw'], field: string) => string;
  toursEnabled: boolean;
  onStartTour: (tourId: string) => void;
}

export function ShrinePreview({
  shrine,
  lang,
  localizeField,
  toursEnabled,
  onStartTour,
}: ShrinePreviewProps) {
  const { fmtNum, t } = useLang();
  const { copy, copied } = useShareLink({ copiedMs: 2000 });
  const isShrineSaved = useSavedShrines().includes(shrine.slug);

  const relatedTour = toursEnabled
    ? (TOURS.find((tr) => tr.stops.some((s) => s.shrineSlug === shrine.slug)) ?? null)
    : null;

  const name = localizeShrineName(shrine, lang);

  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const category =
    categoryDisplayLabel(shrine.category, lang as Lang) ??
    (localizeField(shrine.raw, 'Category') || shrine.category);
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  /* What kind of figure this is, in words, where the sheet records it.
     This row used to be `🕌 {saint}` — a mosque, the only emoji in `src/`,
     printed in front of the principal figure of **every** site. 88 of the
     archive's 171 entries are not Muslim shrines, so it labelled Guru Nanak,
     Bebe Nanaki, Guru Hargobind and Shiva with a mosque, in a preview card
     opening from a gurdwara or a mandir pin — while the shrine page's own
     infobox, two taps away, correctly said "Sikh Guru" or "Deity". The archive
     contradicted itself between a page and its preview.

     `ShrineInfobox` already solved this: ولی names a Muslim saint specifically
     and must not label Shiva or Guru Nanak. Same call, same fallback. */
  const figureLabel =
    figureTypeDisplayLabel(shrine.figureType ?? '', lang as Lang) ?? t('saintLabel');
  const founded = resolveFoundedDate(shrine.raw, lang as Lang);

  const statusKey = siteStatusKey(shrine.status);
  const statusLabel =
    statusKey && statusKey !== 'active'
      ? translate(lang as Lang, SITE_STATUS_LABEL_KEYS[statusKey])
      : '';

  /* No English lead while the Urdu one is still downloading.
     The fallback below is right for the two entries that have no Urdu article
     at all, and wrong for the seconds after a language switch, when every entry
     looks like one of those two — see `useUrduArticlesReady`. Falling back then
     put the entire English lead under an Urdu name for 4.7 measured seconds.
     Nothing is a truthful empty; English prose is not. */
  const urduArticlesReady = useUrduArticles();
  const descRaw =
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: getUrduFieldValue reads the sheet's Urdu-only Description column
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
        (urduArticlesReady ? getFieldValue(shrine.raw, 'Description') : '')
      : getFieldValue(shrine.raw, 'Description');
  const leadText = descRaw ? extractLeadPreviewText(descRaw) : '';

  const handleCopyLink = useCallback(() => {
    copy(window.location.href);
  }, [copy]);

  return (
    <div className="preview-card reveal-rise">
      {shrine.imageUrl ? (
        <img
          src={thumbnailUrl(shrine.imageUrl, IMAGE_WIDTH.preview)}
          alt={name}
          className="preview-card-hero"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="preview-card-hero-placeholder" aria-hidden="true">
          <ShrineGlyph className="preview-card-hero-icon" />
        </div>
      )}
      <h2 className="preview-title">
        <Link to={`/shrine/${shrine.slug}`} lang={langAttr(lang as Lang)}>
          {name}
        </Link>
      </h2>
      <div className="preview-meta-row">
        {category && <span>{category}</span>}
        {location && <span>· {location}</span>}
        {founded && <span>· {fmtNum(founded)}</span>}
      </div>
      {saint && (
        <div className="preview-meta-row">
          <span className="preview-figure-row">
            <span className="preview-figure-label">{figureLabel}</span>
            <bdi>{saint}</bdi>
          </span>
        </div>
      )}
      {(infoLevelKey(shrine.infoLevel) || supportLevelKey(shrine.supportLevel)) && (
        <div className="preview-meta-row">
          <InfoLevelBadge level={shrine.infoLevel} />
          <SupportLevelBadge level={shrine.supportLevel} />
        </div>
      )}
      {(statusLabel || shrine.statusNote) && (
        <div className="preview-status-note">
          {statusLabel}
          {statusLabel && shrine.statusNote && ' — '}
          {shrine.statusNote && <bdi>{shrine.statusNote}</bdi>}
        </div>
      )}
      {leadText && <p className="preview-description">{leadText}</p>}
      {relatedTour && (
        <div className="preview-related-tour">
          <span>
            {translate(lang as Lang, 'partOfTour')}: {localizeTourTitle(relatedTour, lang as Lang)}
          </span>
          <button className="preview-related-tour-btn" onClick={() => onStartTour(relatedTour.id)}>
            {translate(lang as Lang, 'viewTour')}
          </button>
        </div>
      )}
      <div className="preview-actions">
        <Link to={`/shrine/${shrine.slug}`} className="preview-view-link">
          {translate(lang as Lang, 'viewFullDetails')}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button
          className={`preview-copy-link${copied ? ' copied' : ''}`}
          onClick={handleCopyLink}
          aria-label={
            copied ? translate(lang as Lang, 'linkCopied') : translate(lang as Lang, 'copyLink')
          }
          title={translate(lang as Lang, 'copyLink')}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
          <span>
            {copied ? translate(lang as Lang, 'copied') : translate(lang as Lang, 'share')}
          </span>
        </button>
        <button
          className={`preview-copy-link preview-save-btn${isShrineSaved ? ' is-saved' : ''}`}
          onClick={() => toggleSaved(shrine.slug)}
          aria-pressed={isShrineSaved}
          title={translate(lang as Lang, 'saveShrineFull')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isShrineSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>
            {isShrineSaved
              ? translate(lang as Lang, 'savedLabel')
              : translate(lang as Lang, 'saveShrine')}
          </span>
        </button>
      </div>
    </div>
  );
}
