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

      {/* These routes existed with no link anywhere in the app — the graph
          explorer has been reachable only by typing /graph. Embeds stay
          link-free so an embedded map can't navigate its host away.

          Four, not six: "State of the Archive" and "What this archive knows"
          are sections of "About this archive" now, and listing all three sent a
          reader to the same page under three names. */}
      {!embed && (
        <nav className="welcome-card-links" aria-label={t('welcomeExploreMore')}>
          <p className="welcome-card-links-heading">{t('welcomeExploreMore')}</p>
          <Link to="/almanac">{t('almanacTitle')}</Link>
          <Link to="/graph">{t('graphExplorerTitle')}</Link>
          <Link to="/typology">{t('typologyTitle')}</Link>
          {/* Six, and the sixth is here because it was reachable from nowhere
              at all. `/chronology` shipped prerendered, in the sitemap at
              priority 0.7, rendering 171 shrine links — and with **no link to
              it anywhere in the application**: 0 anchors, 0 buttons and 0 text
              mentions across 81 rendered pages at two widths, and no
              `to="/chronology"` in any commit in the repository's history. Six
              e2e specs exercised it and every one arrived by `page.goto`, which
              is exactly why it survived. A crawler could reach the page; a
              reader could not.

              It goes beside `/typology` because they are the same kind of
              thing — the whole archive at once, by century and by built form —
              which is the reason `tabs.ts` already gives for the atlas tab
              owning both. A sixth *tab* was declined on purpose and stays
              declined (TRACK_C_CHRONOLOGY.md); this is a link, and the card is
              the archive's only index on desktop, where the tab bar is
              `display: none`. */}
          <Link to="/chronology">{t('chronologyTitle')}</Link>
          {/* The "four, not six" above was about three names for one page; the
              two below are destinations, not names — and `/shared-ground` is
              the only one of these that is about the map's own subject, which
              is where sites are in relation to each other. */}
          <Link to="/shared-ground">{t('sharedGroundPageTitle')}</Link>
          <Link to="/about">{t('aboutTitle')}</Link>
        </nav>
      )}
    </div>
  );
}
