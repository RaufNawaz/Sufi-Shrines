/**
 * The settings page: does each control actually reach the preference?
 *
 * The rule this asserts is the one in the plan — **no preference may be
 * write-only.** Before this page existed every control lived on the map
 * sidebar, so the failure this guards against is not "the option is missing"
 * but "the option is on the page and changes nothing", which looks identical to
 * working until a reader reloads.
 *
 * Rendered rather than inspected as source, because the thing under test is the
 * wiring between a radio and `localStorage`, and a source check cannot see a
 * handler that sets state without persisting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../SettingsPage';
import { renderWithProviders } from '../../test/utils';
import {
  CALENDAR_STORAGE_KEY,
  DIRECTORY_MODE_STORAGE_KEY,
  NUMERALS_STORAGE_KEY,
  TEXT_SIZE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TOURS_STORAGE_KEY,
} from '../../lib/storageKeys';
import { UI_TEXT } from '../../lib/i18n/uiStrings';

const en = UI_TEXT.en;

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-size');
  });

  it('renders every section', () => {
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    for (const heading of [
      en.settingsLanguageSection,
      en.settingsAppearanceSection,
      en.settingsMapSection,
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });

  it('explains every option rather than only offering it', () => {
    /* The half that was missing was not the controls, it was that nothing said
       what a preference does — `shrines_numerals` decides whether a recorded
       date reads ۱۴۱۶ or 1416, which is editorial in a bilingual archive. A
       group with no help text is the defect this page was written to fix. */
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    const groups = document.querySelectorAll('fieldset.settings-group');
    expect(groups.length).toBeGreaterThanOrEqual(5);
    for (const group of groups) {
      const help = group.querySelector('.settings-help');
      expect(help?.textContent?.trim().length ?? 0).toBeGreaterThan(20);
      expect(group.querySelector('legend')?.textContent?.trim()).toBeTruthy();
    }
  });

  it('persists the numerals choice', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    await user.click(screen.getByRole('radio', { name: en.settingsNumeralsWestern }));
    expect(localStorage.getItem(NUMERALS_STORAGE_KEY)).toBe('western');
    await user.click(screen.getByRole('radio', { name: en.settingsNumeralsEastern }));
    expect(localStorage.getItem(NUMERALS_STORAGE_KEY)).toBe('eastern');
  });

  it('persists the shrine-list destination, the option that used to be map-only', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    await user.click(screen.getByRole('radio', { name: en.directoryModeTable }));
    expect(localStorage.getItem(DIRECTORY_MODE_STORAGE_KEY)).toBe('table');
    await user.click(screen.getByRole('radio', { name: en.directoryModeSpotlight }));
    expect(localStorage.getItem(DIRECTORY_MODE_STORAGE_KEY)).toBe('spotlight');
  });

  it('persists the tours switch, and writes an explicit off', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    const toggle = screen.getByRole('checkbox', { name: en.turnOnTours });
    await user.click(toggle);
    expect(localStorage.getItem(TOURS_STORAGE_KEY)).toBe('on');
    await user.click(screen.getByRole('checkbox', { name: en.turnOffTours }));
    expect(localStorage.getItem(TOURS_STORAGE_KEY)).toBe('off');
  });

  it('persists the theme, and choosing the theme already shown is a no-op', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    await user.click(screen.getByRole('radio', { name: en.settingsThemeDark }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    /* `useTheme` exposes a toggle rather than a setter, so a radio group over it
       has to guard against flipping when the reader picks what is already
       selected — the bug that would make the dark option turn the lights back
       on every second click. */
    await user.click(screen.getByRole('radio', { name: en.settingsThemeDark }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    await user.click(screen.getByRole('radio', { name: en.settingsThemeLight }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('persists the reading size and puts it on the document', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    await user.click(screen.getByRole('radio', { name: en.settingsTextSizeLarge }));
    expect(localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe('large');
    /* Applied immediately, not on the next reload: the sample line under the
       control is set in the archive's reading type, so the reader is meant to
       see the choice in the thing being chosen. */
    expect(document.documentElement.getAttribute('data-text-size')).toBe('large');
    await user.click(screen.getByRole('radio', { name: en.settingsTextSizeMedium }));
    expect(localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe('medium');
    expect(document.documentElement.hasAttribute('data-text-size')).toBe(false);
  });

  it('shows a sample of the reading type beside the size control', () => {
    /* Three radios labelled Small/Medium/Large tell the reader the names of
       three sizes and nothing about the sizes. */
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    expect(screen.getByText(en.settingsTextSizeSample)).toBeInTheDocument();
  });

  it('persists the calendar preference', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    await user.click(screen.getByRole('radio', { name: en.settingsCalendarHijri }));
    expect(localStorage.getItem(CALENDAR_STORAGE_KEY)).toBe('hijri');
    await user.click(screen.getByRole('radio', { name: en.settingsCalendarGregorian }));
    expect(localStorage.getItem(CALENDAR_STORAGE_KEY)).toBe('gregorian');
  });

  it('says what the calendar preference will not do', () => {
    /* The note is the honest half: a day recorded as a Gregorian date has no
       Hijri date in this archive, and the setting has to say so rather than
       leave the reader wondering why some rows did not change. */
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    expect(screen.getByText(en.settingsCalendarNote)).toBeInTheDocument();
  });

  it('reflects what is already stored instead of showing defaults', () => {
    /* A settings page that renders its defaults over a stored choice tells the
       reader their preference was forgotten. */
    localStorage.setItem(DIRECTORY_MODE_STORAGE_KEY, 'table');
    localStorage.setItem(TOURS_STORAGE_KEY, 'on');
    localStorage.setItem(NUMERALS_STORAGE_KEY, 'western');
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    expect(screen.getByRole('radio', { name: en.directoryModeTable })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: en.turnOffTours })).toBeChecked();
    expect(screen.getByRole('radio', { name: en.settingsNumeralsWestern })).toBeChecked();
  });

  it('gives every option row a 44px target and the whole label as the hit area', () => {
    renderWithProviders(<SettingsPage />, { route: '/settings' });
    const options = document.querySelectorAll('.settings-option');
    expect(options.length).toBeGreaterThanOrEqual(9);
    for (const option of options) {
      // The control is inside its own label, so the label is the hit area
      // rather than the 18px box — asserted structurally because jsdom has no
      // layout and cannot measure the 44px the stylesheet sets.
      expect(option.tagName).toBe('LABEL');
      expect(option.querySelector('input')).toBeTruthy();
    }
  });
});
