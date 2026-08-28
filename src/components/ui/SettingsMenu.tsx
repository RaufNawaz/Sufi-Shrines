import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useLang, type Numerals } from '../../lib/i18n/LanguageContext';
import { usesEasternNumerals } from '../../lib/i18n/languages';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';
import type { CalendarPreference } from '../../lib/calendarPreference';
import type { DistanceUnits } from '../../lib/unitsPreference';
import {
  readDirectoryMode,
  writeDirectoryMode,
  type DirectoryMode,
} from '../../lib/directoryPreference';
import { readToursEnabled, writeToursEnabled } from '../../lib/toursPreference';
import { readTextSize, type TextSize } from '../../lib/textSizePreference';
import { ReadingSizeSlider } from './ReadingSizeSlider';
import {
  applyMotionPreference,
  readMotionPreference,
  writeMotionPreference,
  type MotionPreference,
} from '../../lib/motionPreference';

/**
 * The gear, and the preferences behind it — on every page rather than on one.
 *
 * **It used to be map chrome.** The gear lived in the map sidebar's header and
 * nowhere else, and it opened a panel offering Spotlight or the shrine table.
 * Everything else was on `/settings`, linked from `SiteFooter` — which the map
 * does not render. So the archive's preferences were reachable from a route
 * that showed one of them, or from a footer on the other ten pages, and a
 * reader who arrived on `/shrine/data-darbar` from a search engine (which is
 * how most arrive: all 169 entries are prerendered with their own metadata) had
 * to scroll to the bottom of an article to change the reading size.
 *
 * This component is that gear, self-contained: the trigger, the popover, and
 * every way out of it. `EntityPageHeader` renders one, so do the ten pages that
 * use it; `MapSidebar` renders one; `NotFoundPage` gets one by finally using
 * the shared header instead of its own copy.
 *
 * **The three dismissal lessons are kept, not rewritten** (HANDOVER §9.82–84,
 * `e2e/directory-mode.spec.ts`):
 * - Escape, on the *capture* phase, stopping there. `MapPage` also listens for
 *   Escape, to collapse the sidebar and deselect the shrine. One press should
 *   shut the thing on top, not the surface behind it as well.
 * - A pointerdown outside it. The panel hangs over the control it configures,
 *   so the gear alone is not enough of a way out.
 * - Focus returns to the trigger, because a panel dismissed by keyboard that
 *   drops focus to the document leaves a keyboard reader at the top of the page.
 *
 * **It stands down on `/settings`.** A gear opening a seven-row subset of the
 * page you are already reading is not an affordance, it is a second copy.
 */

/** Where the panel's map-and-tours choices are read from when nothing else owns
 *  them.
 *
 *  On the map they are owned upstream — `MapSidebar` needs `directoryMode` to
 *  decide what the list button opens, and `MapPage` needs `toursEnabled` to
 *  decide whether the tour layer exists at all — so both are passed in and the
 *  panel reports changes back. On every other page nothing owns them, and the
 *  panel reads and writes the preference modules itself. Either way the write
 *  goes through the same module `/settings` writes, so no two surfaces can hold
 *  different ideas of one switch. */
export interface SettingsMenuProps {
  /** Map only: the sidebar owns this because the list button's behaviour reads it. */
  directoryMode?: DirectoryMode;
  onDirectoryModeChange?: (mode: DirectoryMode) => void;
  /** Map only: `MapPage` owns this because the tour layer's existence reads it. */
  toursEnabled?: boolean;
  onToursToggle?: (enabled: boolean) => void;
  /** Map only: on a phone the sidebar is a bottom sheet, and at peek height its
   *  header sits near the foot of the screen — there is only room for the panel
   *  inside an expanded sheet, so the sheet is expanded first (§9.84). */
  onBeforeOpen?: () => void;
}

/** One preference: its name, and its choices on the same line where they fit.
 *
 *  A `div[role=radiogroup]` with native radios inside, rather than the
 *  `fieldset`/`legend` the settings *page* uses. Not a style preference: a
 *  legend cannot be laid out as a flex item beside its own controls with
 *  consistent results across browsers, and the row-per-preference shape is the
 *  whole reason seven preferences fit in a popover that used to hold one. The
 *  radios stay native, so arrow keys move within the group and a screen reader
 *  announces "2 of 3" without any of it being reimplemented. */
function SettingRow<T extends string>({
  name,
  label,
  value,
  options,
  onChoose,
}: {
  name: string;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChoose: (value: T) => void;
}) {
  const labelId = `${useId()}-${name}`;
  return (
    <div className="msettings-row">
      <span className="msettings-row-label" id={labelId}>
        {label}
      </span>
      <div className="msettings-seg" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`msettings-seg-option${value === option.value ? ' active' : ''}`}
          >
            {/* Transparent and filling the segment, rather than `.sr-only`.
                A clipped 1x1 input is the usual way to build this, and it
                would make the *label* the only real target — which is fine for
                a reader and wrong for the guard that matters here:
                `e2e/directory-mode.spec.ts` exists because two of these
                options were once unreachable at their own centre, and it
                hit-tests each input with `elementFromPoint`. Filling the
                segment keeps the input the thing a tap actually lands on, so
                that check goes on measuring the real target. */}
            <input
              className="msettings-seg-input"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChoose(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  directoryMode,
  onDirectoryModeChange,
  toursEnabled,
  onToursToggle,
}: {
  directoryMode: DirectoryMode;
  onDirectoryModeChange: (mode: DirectoryMode) => void;
  toursEnabled: boolean;
  onToursToggle: (enabled: boolean) => void;
}) {
  const { lang, t, numerals, setNumerals } = useLang();
  const { calendar, setCalendar, units, setUnits } = useReaderPreferences();

  /* Read on mount, which for this panel means "each time it opens": it is
     rendered only while the gear is on. So a change made on `/settings` is
     already reflected the next time this opens, with no subscription and no
     provider these two preferences do not otherwise need. */
  const [textSize, setTextSize] = useState<TextSize>(readTextSize);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);

  const chooseMotion = (next: MotionPreference) => {
    setMotion(next);
    writeMotionPreference(next);
    applyMotionPreference(next, document.documentElement);
  };

  return (
    <div className="settings-menu-panel" role="group" aria-label={t('settings')}>
      <div className="msettings-section">
        <h2 className="msettings-heading">{t('settingsMapSection')}</h2>

        <SettingRow<DirectoryMode>
          name="directory-mode"
          label={t('settingsDirectoryLabel')}
          value={directoryMode}
          options={[
            { value: 'spotlight', label: t('directoryModeSpotlight') },
            { value: 'table', label: t('directoryModeTable') },
          ]}
          onChoose={onDirectoryModeChange}
        />

        {/* A switch rather than two radios, for the reason the settings page
            gives: a boolean's own state is the answer, and "On"/"Off" are
            sentence fragments a component should not be assembling.

            Deliberately the *same* `.tour-toggle` control the sidebar already
            renders further down, markup and class both. The two flip one
            preference through one module, and a reader who finds them both —
            they can be on screen together — must not have to work out whether
            a pill and a checkbox mean the same thing. */}
        <div className="msettings-row">
          <span className="msettings-row-label">{t('settingsToursToggle')}</span>
          <button
            type="button"
            className="tour-toggle"
            role="switch"
            aria-checked={toursEnabled}
            aria-label={toursEnabled ? t('turnOffTours') : t('turnOnTours')}
            title={toursEnabled ? t('turnOffTours') : t('turnOnTours')}
            onClick={() => onToursToggle(!toursEnabled)}
          >
            <span className="tour-toggle-knob" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="msettings-section">
        <h2 className="msettings-heading">{t('settingsAppearanceSection')}</h2>

        {/* A slider, not a segmented row: five steps do not fit one, and the
            reason to have five is that a reader asked to be able to *adjust*
            rather than pick from three names. It writes and applies the step
            itself, so this only has to remember it for the label. */}
        <div className="msettings-row msettings-row--stacked">
          <span className="msettings-row-label" id="msettings-reading-size">
            {t('settingsTextSizeLabel')}
          </span>
          <ReadingSizeSlider
            value={textSize}
            onChange={setTextSize}
            labelledBy="msettings-reading-size"
          />
        </div>

        <SettingRow<MotionPreference>
          name="motion"
          label={t('settingsMotionLabel')}
          value={motion}
          options={[
            { value: 'system', label: t('settingsMotionSystem') },
            { value: 'reduced', label: t('settingsMotionReduced') },
          ]}
          onChoose={chooseMotion}
        />

        {/* Only where the choice does anything. `settingsNumeralsUrduOnly` says
            so in a note on the settings page; a popover has no room for a note,
            and a control that visibly changes nothing is worse than an absent
            one. `usesEasternNumerals` rather than a language comparison: the
            question is whether this language has two numeral systems to choose
            between, which is a fact about the language. */}
        {usesEasternNumerals(lang) && (
          <SettingRow<Numerals>
            name="numerals"
            label={t('settingsNumeralsLabel')}
            value={numerals}
            options={[
              { value: 'eastern', label: t('settingsNumeralsEastern') },
              { value: 'western', label: t('settingsNumeralsWestern') },
            ]}
            onChoose={setNumerals}
          />
        )}
      </div>

      <div className="msettings-section">
        <h2 className="msettings-heading">{t('settingsDatesSection')}</h2>

        <SettingRow<CalendarPreference>
          name="calendar"
          label={t('settingsCalendarLabel')}
          value={calendar}
          options={[
            { value: 'gregorian', label: t('settingsCalendarGregorian') },
            { value: 'hijri', label: t('settingsCalendarHijri') },
          ]}
          onChoose={setCalendar}
        />

        <SettingRow<DistanceUnits>
          name="units"
          label={t('settingsUnitsLabel')}
          value={units}
          options={[
            { value: 'km', label: t('settingsUnitsKm') },
            { value: 'mi', label: t('settingsUnitsMi') },
          ]}
          onChoose={setUnits}
        />
      </div>

      {/* The way out to the rest — the saved-list file, the theme and language
          as named options with their explanations, and the help text under
          every control that does not fit here. */}
      <Link className="msettings-all" to="/settings">
        {t('settingsAllOptions')}
      </Link>
    </div>
  );
}

export function SettingsMenu({
  directoryMode,
  onDirectoryModeChange,
  toursEnabled,
  onToursToggle,
  onBeforeOpen,
}: SettingsMenuProps) {
  const { t } = useLang();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* The fallbacks for the pages that do not own these. Seeded on mount and
     written through on change; the panel itself is only rendered while `open`,
     so a change made on `/settings` is already reflected the next time the gear
     is pressed, with no subscription and no provider these two do not
     otherwise need. */
  const [ownDirectoryMode, setOwnDirectoryMode] = useState<DirectoryMode>(readDirectoryMode);
  const [ownToursEnabled, setOwnToursEnabled] = useState<boolean>(readToursEnabled);

  const chooseDirectoryMode = useCallback(
    (mode: DirectoryMode) => {
      setOwnDirectoryMode(mode);
      writeDirectoryMode(mode);
      onDirectoryModeChange?.(mode);
    },
    [onDirectoryModeChange],
  );

  const chooseTours = useCallback(
    (enabled: boolean) => {
      setOwnToursEnabled(enabled);
      writeToursEnabled(enabled);
      onToursToggle?.(enabled);
    },
    [onToursToggle],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  /* A route change closes it. Without this the panel outlives the page it was
     opened from — the link to `/settings` at its foot is inside the panel, so
     following it left the popover sitting open over the page it had just
     navigated to. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname === '/settings' || pathname === '/ur/settings') return null;

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`icon-btn settings-menu-trigger${open ? ' active' : ''}`}
        aria-label={t('settings')}
        title={t('settings')}
        aria-expanded={open}
        onClick={() => {
          if (!open) onBeforeOpen?.();
          setOpen((v) => !v);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.38.36.72.6 1 .29.34.68.53 1.1.6h.09v4h-.09c-.42.07-.81.26-1.1.6-.24.28-.45.62-.6 1Z" />
        </svg>
      </button>
      {open && (
        <SettingsPanel
          directoryMode={directoryMode ?? ownDirectoryMode}
          onDirectoryModeChange={chooseDirectoryMode}
          toursEnabled={toursEnabled ?? ownToursEnabled}
          onToursToggle={chooseTours}
        />
      )}
    </div>
  );
}
