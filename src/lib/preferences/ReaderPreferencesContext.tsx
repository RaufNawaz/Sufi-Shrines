/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  readCalendarPreference,
  writeCalendarPreference,
  type CalendarPreference,
} from '../calendarPreference';

/**
 * The reader preferences that components have to *read while rendering*.
 *
 * Most of this archive's preferences do not need a provider, and deliberately do
 * not have one: the theme and the reading size are `data-*` attributes on the
 * document that CSS resolves, and the tours switch and the shrine-list
 * destination are read once on mount by the two surfaces that own them. Adding a
 * context for those would be a re-render in place of a stylesheet.
 *
 * The calendar preference is different. Which of a projected and a recorded date
 * leads is decided in JavaScript, inside a formatter, on four surfaces — the
 * almanac's card in both its views, the shrine page's observance panel, and the
 * figure page's next-ʿurs line. Those have to change together the moment the
 * reader chooses, so this is the one preference that is state rather than an
 * attribute.
 */
interface ReaderPreferencesValue {
  calendar: CalendarPreference;
  setCalendar: (calendar: CalendarPreference) => void;
}

const ReaderPreferencesContext = createContext<ReaderPreferencesValue | null>(null);

export function ReaderPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [calendar, setCalendarState] = useState<CalendarPreference>(readCalendarPreference);

  const setCalendar = useCallback((next: CalendarPreference) => {
    setCalendarState(next);
    writeCalendarPreference(next);
  }, []);

  const value = useMemo<ReaderPreferencesValue>(
    () => ({ calendar, setCalendar }),
    [calendar, setCalendar],
  );

  return (
    <ReaderPreferencesContext.Provider value={value}>{children}</ReaderPreferencesContext.Provider>
  );
}

/**
 * Read the reader's preferences.
 *
 * Returns the defaults outside a provider rather than throwing, unlike
 * `useLang`. A missing language provider means the page cannot be rendered at
 * all; a missing preferences provider means a date leads with the calendar it
 * has always led with. Throwing would turn a Storybook story or an isolated
 * component test into a crash over a matter of emphasis.
 */
export function useReaderPreferences(): ReaderPreferencesValue {
  const ctx = useContext(ReaderPreferencesContext);
  if (ctx) return ctx;
  return { calendar: 'gregorian', setCalendar: () => {} };
}
