import { Link } from 'react-router-dom';
import type { Shrine, Lang } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';
import { extractLeadPreviewText } from '../../lib/data/articleParsing';
import { categoryDisplayLabel, categoryKey } from '../../lib/data/categoryKey';
import { figureTypeDisplayLabel } from '../../lib/data/figureType';
import { IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { publicLocation } from '../../lib/data/publicLocation';
import { useUrduArticles } from '../../hooks/useUrduArticlesReady';
import { langAttr } from '../../lib/i18n/languages';
import { ShrineImage } from '../ui/ShrineImage';
import { InlineEmphasis } from '../ui/InlineEmphasis';
import { RecordedRun } from '../ui/RecordedRun';

/**
 * The palette's preview pane — what Spotlight shows beside the highlighted
 * result (Rauf, 15 October 2026: "redesign this to function like spotlight").
 *
 * Wide screens only (the pane is `display: none` under 900px). It reads the
 * same fields as the map's `ShrinePreview` card, by the same rules, so the two
 * summaries of a site can never disagree: `publicLocation` for the place, the
 * figure-type label rather than "saint" for every figure, and no English lead
 * under an Urdu name while the Urdu articles are still loading.
 *
 * `aria-hidden`: the highlighted row is already announced through the
 * combobox's `aria-activedescendant`, and a second announcement of the same
 * site on every arrow press would be noise. Its two actions are reachable from
 * the keyboard as Enter (show on map) and from the row itself.
 */
export function PalettePreview({ shrine, onShow }: { shrine: Shrine; onShow: () => void }) {
  const { lang, t, fmtNum, localizeField } = useLang();
  const name = localizeShrineName(shrine, lang);
  const rawLocation = localizeField(shrine.raw, 'Location') || shrine.location;
  const location = publicLocation(rawLocation, shrine, lang as Lang);
  const category =
    categoryDisplayLabel(shrine.category, lang as Lang) ??
    (localizeField(shrine.raw, 'Category') || shrine.category);
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const figureLabel =
    figureTypeDisplayLabel(shrine.figureType ?? '', lang as Lang) ?? t('saintLabel');
  const founded = resolveFoundedDate(shrine.raw, lang as Lang);
  const urduArticlesReady = useUrduArticles();
  const descRaw =
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: getUrduFieldValue reads the sheet's Urdu-only Description column
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
        (urduArticlesReady ? getFieldValue(shrine.raw, 'Description') : '')
      : getFieldValue(shrine.raw, 'Description');
  const lead = descRaw ? extractLeadPreviewText(descRaw) : '';

  return (
    <div className="palette-preview-card" aria-hidden="true">
      <ShrineImage
        src={shrine.imageUrl}
        alt=""
        category={shrine.category}
        className="palette-preview-img"
        placeholderClassName="palette-preview-img palette-preview-placeholder"
        width={IMAGE_WIDTH.preview}
      />
      <p className="palette-preview-kind">
        <span
          className={`palette-result-dot palette-result-dot--${categoryKey(shrine.category)}`}
        />
        {category}
      </p>
      <h3 className="palette-preview-name" lang={langAttr(lang as Lang)}>
        <bdi>{name}</bdi>
      </h3>
      {(location || founded) && (
        <p className="palette-preview-meta">
          {location && <RecordedRun text={location} />}
          {location && founded && ' · '}
          {founded && fmtNum(founded)}
        </p>
      )}
      {saint && (
        <p className="palette-preview-figure">
          <span className="palette-preview-label">{figureLabel}</span>
          <RecordedRun text={saint} />
        </p>
      )}
      {lead && (
        <p className="palette-preview-lead">
          <InlineEmphasis text={lead} />
        </p>
      )}
      <div className="palette-preview-actions">
        <Link to={`/shrine/${shrine.slug}`} className="palette-preview-open" tabIndex={-1}>
          {t('paletteReadEntry')}
        </Link>
        {shrine.latLng && (
          <button type="button" className="palette-preview-show" tabIndex={-1} onClick={onShow}>
            {t('paletteShowOnMap')}
          </button>
        )}
      </div>
    </div>
  );
}
