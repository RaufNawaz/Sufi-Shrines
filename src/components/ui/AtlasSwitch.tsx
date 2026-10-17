import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';

/**
 * The Atlas tab's two views of the whole archive — by built form and by
 * century — as one segmented control at the top of each.
 *
 * The tab owns both /typology and /chronology, and neither page linked to the
 * other: the timeline's only entrance was the seventh row of the map's welcome
 * card, three screens into a sheet a phone reader must first open (first-visit
 * council, 17 October 2026).
 */
export function AtlasSwitch({ current }: { current: 'form' | 'century' }) {
  const { t } = useLang();
  return (
    <nav className="almanac-view-toggle atlas-switch" aria-label={t('atlasSwitchLabel')}>
      <Link
        to="/typology"
        className={`filter-chip${current === 'form' ? ' active' : ''}`}
        aria-current={current === 'form' ? 'page' : undefined}
      >
        {t('atlasByForm')}
      </Link>
      <Link
        to="/chronology"
        className={`filter-chip${current === 'century' ? ' active' : ''}`}
        aria-current={current === 'century' ? 'page' : undefined}
      >
        {t('atlasByCentury')}
      </Link>
    </nav>
  );
}
