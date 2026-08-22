import { Link } from 'react-router-dom';
import type { useLang } from '../../lib/i18n/LanguageContext';

interface WelcomeCardProps {
  t: (k: Parameters<ReturnType<typeof useLang>['t']>[0]) => string;
  embed?: boolean;
}

export function WelcomeCard({ t, embed = false }: WelcomeCardProps) {
  return (
    <div className="welcome-card">
      <div className="welcome-card-icon-wrap" aria-hidden="true">
        <svg className="welcome-card-icon" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 6l-3 6H22v3h2v4.6C18.2 21.4 15 25.5 15 30.5h34c0-5-3.2-9.1-9-11V15h2v-3H35l-3-6zm-14 27v26h28V33H18zm8 8h12v10H26V41z" />
        </svg>
      </div>
      <h2 className="welcome-card-title">{t('exploreTitle')}</h2>
      <p className="welcome-card-text">{t('noSelection')}</p>
      {/* The "list button above" this hint refers to is hidden in embed mode */}
      {!embed && <p className="welcome-card-hint">{t('exploreHint')}</p>}

      {/* Both of these routes existed with no link anywhere in the app — the
          graph explorer has been reachable only by typing /graph. Embeds stay
          link-free so an embedded map can't navigate its host away. */}
      {!embed && (
        <nav className="welcome-card-links" aria-label={t('welcomeExploreMore')}>
          <p className="welcome-card-links-heading">{t('welcomeExploreMore')}</p>
          <Link to="/almanac">{t('almanacTitle')}</Link>
          <Link to="/graph">{t('graphExplorerTitle')}</Link>
          <Link to="/report">{t('reportTitle')}</Link>
        </nav>
      )}
    </div>
  );
}
