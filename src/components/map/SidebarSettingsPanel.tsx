import { useId, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLang, type Numerals } from '../../lib/i18n/LanguageContext';
import { usesEasternNumerals } from '../../lib/i18n/languages';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';
import type { CalendarPreference } from '../../lib/calendarPreference';
import type { DistanceUnits } from '../../lib/unitsPreference';
import type { DirectoryMode } from '../../lib/directoryPreference';
import {
  applyTextSize,
  readTextSize,
  writeTextSize,
  type TextSize,
} from '../../lib/textSizePreference';
import {
  applyMotionPreference,
  readMotionPreference,
  writeMotionPreference,
  type MotionPreference,
} from '../../lib/motionPreference';

/**
 * The map's settings popover.
 *
 * **It used to hold one choice.** The gear beside the theme and language
 * buttons opened a panel offering Spotlight or the shrine table, and nothing
 * else — while `/settings` carried nine preferences. A reader on the map, which
 * is the route this archive opens on, could reach one of them. The rest were
 * behind a page reachable only from a footer that the map does not render.
 *
 * So this panel now carries every preference that changes what the map itself
 * does, and links out for the remainder.
 *
 * **What is deliberately not here.**
 * - *Theme* and *reading language* have their own controls in the very same
 *   header row, one press away. Repeating them inside a panel anchored to that
 *   row is two affordances for one setting, sitting next to each other.
 * - *The saved-list file* — export, import, clear — needs a file picker and a
 *   confirmation, and one of its buttons destroys data. That belongs on a page
 *   the reader navigated to on purpose, not one keystroke from the map.
 *
 * **Both surfaces write the same modules** (`directoryPreference`,
 * `toursPreference`, `textSizePreference`, `motionPreference`,
 * `ReaderPreferencesContext`), so this panel and `/settings` cannot hold
 * different ideas of the same switch — which is the rule `SettingsPage`'s own
 * header states and the reason nothing here keeps its own storage key.
 */

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

export function SidebarSettingsPanel({
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

  const chooseTextSize = (size: TextSize) => {
    setTextSize(size);
    writeTextSize(size);
    applyTextSize(size, document.documentElement);
  };

  const chooseMotion = (next: MotionPreference) => {
    setMotion(next);
    writeMotionPreference(next);
    applyMotionPreference(next, document.documentElement);
  };

  return (
    <div className="sidebar-settings-panel" role="group" aria-label={t('settings')}>
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

        <SettingRow<TextSize>
          name="text-size"
          label={t('settingsTextSizeLabel')}
          value={textSize}
          options={[
            { value: 'small', label: t('settingsTextSizeSmall') },
            { value: 'medium', label: t('settingsTextSizeMedium') },
            { value: 'large', label: t('settingsTextSizeLarge') },
          ]}
          onChoose={chooseTextSize}
        />

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
