import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { useLang, type Numerals } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useTheme } from '../lib/i18n/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { isRtlLang } from '../lib/i18n/languages';
import {
  readDirectoryMode,
  writeDirectoryMode,
  type DirectoryMode,
} from '../lib/directoryPreference';
import { readToursEnabled, writeToursEnabled } from '../lib/toursPreference';
import { readTextSize, type TextSize } from '../lib/textSizePreference';
import { ReadingSizeSlider } from '../components/ui/ReadingSizeSlider';
import { useReaderPreferences } from '../lib/preferences/ReaderPreferencesContext';
import {
  applyMotionPreference,
  readMotionPreference,
  writeMotionPreference,
  type MotionPreference,
} from '../lib/motionPreference';
import type { CalendarPreference } from '../lib/calendarPreference';
import type { DistanceUnits } from '../lib/unitsPreference';
import {
  buildSavedListFile,
  clearSaved,
  parseSavedListFile,
  replaceSavedSlugs,
  useSavedShrines,
} from '../lib/savedShrines';
import type { Lang, Theme } from '../types/shrine';

/**
 * The archive's settings, on a page rather than in a popover on one route.
 *
 * Every control this site had lived on the map sidebar — theme, language,
 * numerals, the tours switch, and a one-option popover — so a reader arriving
 * on `/shrine/data-darbar` from a search engine, which is how most readers
 * arrive given that all 169 entries are prerendered with their own metadata,
 * could not change any of them without going to the map first. This page is
 * linked from `SiteFooter`, which is on every page but the map, so the
 * preferences are wherever the reader is.
 *
 * The map popover stays: a reader adjusting the map should not have to leave
 * it. Both surfaces read and write the same modules — `directoryPreference`,
 * `toursPreference` — so they cannot hold different ideas of the same switch.
 *
 * **Each option carries a sentence saying what it does**, which is the half
 * that was missing rather than the options themselves. `shrines_numerals`
 * decides whether a recorded date reads ۱۴۱۶ or 1416; in an archive whose
 * subject is what the sources actually say, that is an editorial choice and its
 * only affordance was an unlabelled toggle.
 */

/** One labelled control with its explanation. A `fieldset` because every
 *  control here is a group of choices, and the legend is the label a screen
 *  reader announces before the options rather than after them. */
function SettingsGroup({
  legend,
  help,
  note,
  children,
}: {
  legend: string;
  help: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="settings-group">
      <legend className="settings-legend">{legend}</legend>
      <p className="settings-help">{help}</p>
      <div className="settings-controls">{children}</div>
      {note && <p className="settings-note">{note}</p>}
    </fieldset>
  );
}

/** A radio, styled as a row rather than a chip: these are settings, and a
 *  settings choice reads better as a list you scan than as a toolbar. */
function SettingsRadio<T extends string>({
  name,
  value,
  current,
  label,
  onChoose,
}: {
  name: string;
  value: T;
  current: T;
  label: string;
  onChoose: (value: T) => void;
}) {
  return (
    <label className="settings-option">
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChoose(value)}
      />
      <span className="settings-option-label">{label}</span>
    </label>
  );
}

export default function SettingsPage() {
  const { lang, setLang, numerals, setNumerals, t, fmtNum } = useLang();
  /* Through `fmtNum` and `tFn` rather than interpolated into a template here:
     the count is a number (i18n rule 5, Eastern numerals in Urdu) and the
     phrase around it belongs to whichever language is being read. */
  const savedCountLabel = (n: number) => tFn(lang, 'settingsSavedCount', fmtNum(n));
  const importedLabel = (n: number) => tFn(lang, 'settingsSavedImported', fmtNum(n));
  const { theme, toggleTheme } = useTheme();
  const { calendar, setCalendar, units, setUnits } = useReaderPreferences();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('settings')} — ${t('siteTitle')}`);

  /* Local mirrors of the two preferences that live in plain modules rather than
     in a context. They are read once on mount and written through on change, so
     this page and the map sidebar stay in step via storage rather than via a
     provider neither of them needed. */
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>(readDirectoryMode);
  const [toursEnabled, setToursEnabled] = useState<boolean>(readToursEnabled);
  const [textSize, setTextSize] = useState<TextSize>(readTextSize);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);
  const saved = useSavedShrines();
  const fileInputRef = useRef<HTMLInputElement>(null);
  /* One line of feedback under the buttons, because an import that silently
     succeeds is indistinguishable from one that silently failed. `role="status"`
     rather than an alert: this is the outcome of something the reader just did,
     not an interruption. */
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const chooseDirectoryMode = (mode: DirectoryMode) => {
    setDirectoryMode(mode);
    writeDirectoryMode(mode);
  };

  const chooseMotion = (next: MotionPreference) => {
    setMotion(next);
    writeMotionPreference(next);
    applyMotionPreference(next, document.documentElement);
  };

  const exportSavedList = () => {
    const file = buildSavedListFile(new Date());
    const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    /* Dated, because the point of the file is that it is a copy taken at a
       moment — two exports a month apart should not overwrite each other in a
       downloads folder. */
    link.download = `sufi-shrines-saved-${file.exported.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importSavedList = async (file: File) => {
    const parsed = parseSavedListFile(await file.text());
    if (!parsed) {
      setSavedMessage(t('settingsSavedImportFailed'));
      return;
    }
    /* Merge, not replace: moving a list from a laptop to a phone should not
       delete what the phone already had. The note under the buttons says so,
       and says to clear first for an exact copy. */
    const before = new Set(saved);
    const added = parsed.filter((slug) => !before.has(slug));
    replaceSavedSlugs([...saved, ...parsed]);
    setSavedMessage(
      added.length === 0 ? t('settingsSavedImportedNone') : importedLabel(added.length),
    );
  };

  const clearSavedList = () => {
    if (!window.confirm(t('settingsSavedClearConfirm'))) return;
    clearSaved();
    setSavedMessage(null);
  };

  const chooseTours = (enabled: boolean) => {
    setToursEnabled(enabled);
    writeToursEnabled(enabled);
  };

  /* `useTheme` exposes a toggle rather than a setter, because until this page
     existed the only affordance was a moon button. Choosing the theme already
     shown is a no-op rather than a flip. */
  const chooseTheme = (next: Theme) => {
    if (next !== theme) toggleTheme();
  };

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('settings')} />

      <article
        className="entity-page settings-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('settings')}</li>
          </ol>
        </nav>

        <h1 ref={headingRef} className="entity-title" tabIndex={-1}>
          {t('settings')}
        </h1>
        <p className="settings-intro">{t('settingsIntro')}</p>

        <section className="settings-section" aria-labelledby="settings-language">
          <h2 id="settings-language" className="settings-section-heading">
            {t('settingsLanguageSection')}
          </h2>

          <SettingsGroup legend={t('settingsLanguageLabel')} help={t('settingsLanguageHelp')}>
            {/* The language names are written in their own language on purpose:
                a reader who cannot read the current interface needs to
                recognise the option, which is the one place in this archive
                where an English word belongs in the Urdu view. `data-latin`
                declares it rather than leaving the no-leak guard to guess. */}
            <label className="settings-option">
              <input
                type="radio"
                name="reading-language"
                value="en"
                checked={lang === 'en'}
                onChange={() => setLang('en' as Lang)}
              />
              <span className="settings-option-label" lang="en">
                <bdi data-latin>English</bdi>
              </span>
            </label>
            <label className="settings-option">
              <input
                type="radio"
                name="reading-language"
                value="ur"
                /* eslint-disable-next-line no-restricted-syntax -- this radio *is* the Urdu option; the comparison is which option is selected, not a behaviour that differs by language */
                checked={lang === 'ur'}
                onChange={() => setLang('ur' as Lang)}
              />
              <span className="settings-option-label" lang="ur">
                اردو
              </span>
            </label>
          </SettingsGroup>

          <SettingsGroup
            legend={t('settingsNumeralsLabel')}
            help={t('settingsNumeralsHelp')}
            note={t('settingsNumeralsUrduOnly')}
          >
            <SettingsRadio<Numerals>
              name="numerals"
              value="eastern"
              current={numerals}
              label={t('settingsNumeralsEastern')}
              onChoose={setNumerals}
            />
            <SettingsRadio<Numerals>
              name="numerals"
              value="western"
              current={numerals}
              label={t('settingsNumeralsWestern')}
              onChoose={setNumerals}
            />
          </SettingsGroup>
        </section>

        <section className="settings-section" aria-labelledby="settings-appearance">
          <h2 id="settings-appearance" className="settings-section-heading">
            {t('settingsAppearanceSection')}
          </h2>

          <SettingsGroup legend={t('settingsTextSizeLabel')} help={t('settingsTextSizeHelp')}>
            {/* The same slider the map's settings menu renders, and the same
                five steps. Two surfaces offering one preference at different
                granularities is the drift this page's header warns about. */}
            <ReadingSizeSlider value={textSize} onChange={setTextSize} id="settings-text-size" />
            {/* A line of prose set in the archive's own reading type, so the
                choice is visible in the thing being chosen rather than only in
                the page around it. Its own class so it takes body type rather
                than the smaller help size. */}
            <p className="settings-sample">{t('settingsTextSizeSample')}</p>
          </SettingsGroup>

          <SettingsGroup legend={t('settingsMotionLabel')} help={t('settingsMotionHelp')}>
            <SettingsRadio<MotionPreference>
              name="motion"
              value="system"
              current={motion}
              label={t('settingsMotionSystem')}
              onChoose={chooseMotion}
            />
            <SettingsRadio<MotionPreference>
              name="motion"
              value="reduced"
              current={motion}
              label={t('settingsMotionReduced')}
              onChoose={chooseMotion}
            />
          </SettingsGroup>

          <SettingsGroup legend={t('settingsThemeLabel')} help={t('settingsThemeHelp')}>
            <SettingsRadio<Theme>
              name="theme"
              value="light"
              current={theme}
              label={t('settingsThemeLight')}
              onChoose={chooseTheme}
            />
            <SettingsRadio<Theme>
              name="theme"
              value="dark"
              current={theme}
              label={t('settingsThemeDark')}
              onChoose={chooseTheme}
            />
          </SettingsGroup>
        </section>

        <section className="settings-section" aria-labelledby="settings-dates">
          <h2 id="settings-dates" className="settings-section-heading">
            {t('settingsDatesSection')}
          </h2>

          <SettingsGroup
            legend={t('settingsCalendarLabel')}
            help={t('settingsCalendarHelp')}
            note={t('settingsCalendarNote')}
          >
            <SettingsRadio<CalendarPreference>
              name="calendar"
              value="gregorian"
              current={calendar}
              label={t('settingsCalendarGregorian')}
              onChoose={setCalendar}
            />
            <SettingsRadio<CalendarPreference>
              name="calendar"
              value="hijri"
              current={calendar}
              label={t('settingsCalendarHijri')}
              onChoose={setCalendar}
            />
          </SettingsGroup>
        </section>

        <section className="settings-section" aria-labelledby="settings-distance">
          <h2 id="settings-distance" className="settings-section-heading">
            {t('settingsDistanceSection')}
          </h2>

          <SettingsGroup legend={t('settingsUnitsLabel')} help={t('settingsUnitsHelp')}>
            <SettingsRadio<DistanceUnits>
              name="units"
              value="km"
              current={units}
              label={t('settingsUnitsKm')}
              onChoose={setUnits}
            />
            <SettingsRadio<DistanceUnits>
              name="units"
              value="mi"
              current={units}
              label={t('settingsUnitsMi')}
              onChoose={setUnits}
            />
          </SettingsGroup>
        </section>

        <section className="settings-section" aria-labelledby="settings-map">
          <h2 id="settings-map" className="settings-section-heading">
            {t('settingsMapSection')}
          </h2>

          <SettingsGroup legend={t('settingsDirectoryLabel')} help={t('settingsDirectoryHelp')}>
            <SettingsRadio<DirectoryMode>
              name="directory-mode"
              value="spotlight"
              current={directoryMode}
              label={t('directoryModeSpotlight')}
              onChoose={chooseDirectoryMode}
            />
            <SettingsRadio<DirectoryMode>
              name="directory-mode"
              value="table"
              current={directoryMode}
              label={t('directoryModeTable')}
              onChoose={chooseDirectoryMode}
            />
          </SettingsGroup>

          <SettingsGroup legend={t('settingsToursLabel')} help={t('settingsToursHelp')}>
            {/* A switch, not two radios. The guard in noSentenceFragments.test
                is right that "On" and "Off" are fragments a component should not
                be assembling, and a boolean does not need them: the control's
                own state is the answer, and its accessible name says which way
                flipping it goes. */}
            <label className="settings-option">
              <input
                type="checkbox"
                checked={toursEnabled}
                onChange={(event) => chooseTours(event.target.checked)}
                aria-label={toursEnabled ? t('turnOffTours') : t('turnOnTours')}
              />
              <span className="settings-option-label">{t('settingsToursToggle')}</span>
            </label>
          </SettingsGroup>
        </section>

        <section className="settings-section" aria-labelledby="settings-saved">
          <h2 id="settings-saved" className="settings-section-heading">
            {t('settingsSavedSection')}
          </h2>

          <SettingsGroup
            legend={t('settingsSavedFileLabel')}
            help={t('settingsSavedHelp')}
            note={t('settingsSavedMergeNote')}
          >
            <p className="settings-saved-count">
              {saved.length === 0 ? t('settingsSavedEmpty') : savedCountLabel(saved.length)}
            </p>
            <div className="settings-actions">
              <button
                type="button"
                className="action-btn"
                onClick={exportSavedList}
                disabled={saved.length === 0}
              >
                {t('settingsSavedExport')}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('settingsSavedImport')}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={clearSavedList}
                disabled={saved.length === 0}
              >
                {t('settingsSavedClear')}
              </button>
            </div>
            {/* Hidden rather than styled: a native file input cannot be
                restyled to match the archive's buttons, and hiding it behind
                one keeps the keyboard and screen-reader behaviour the platform
                already gets right. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="settings-file-input"
              aria-label={t('settingsSavedImport')}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importSavedList(file);
                // Reset, so choosing the same file twice fires again.
                event.target.value = '';
              }}
            />
            {savedMessage && (
              <p className="settings-saved-message" role="status">
                {savedMessage}
              </p>
            )}
          </SettingsGroup>
        </section>

        <SiteFooter />
      </article>
    </div>
  );
}
