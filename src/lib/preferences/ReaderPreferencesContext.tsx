/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  readCalendarPreference,
  writeCalendarPreference,
  type CalendarPreference,
} from '../calendarPreference';
import { readUnits, writeUnits, type DistanceUnits } from '../unitsPreference';

/**
 * The reader preferences that components have to *read while rendering*.
 *
 * Most of this archive's preferences do not need a provider, and deliberately do
 * not have one: the theme and the reading size are `data-*` attributes on the
 * document that CSS resolves, and the tours switch and the shrine-list
 * destination are read once on mount by the two surfaces that own them. Adding a
 * context for those would be a re-render in place of a stylesheet.
 *
 * The two here are different. Which of a projected and a recorded date leads,
 * and whether a distance reads in kilometres or miles, are both decided in
 * JavaScript inside a formatter — the calendar on four surfaces (the almanac's
 * card in both views, the shrine page's observance panel, the figure page's
 * next-ʿurs line) and the units on eight. Those have to change together the
 * moment the reader chooses, so these are the preferences that are state rather
 * than attributes.
 */
interface ReaderPreferencesValue {
  calendar: CalendarPreference;
  setCalendar: (calendar: CalendarPreference) => void;
  units: DistanceUnits;
  setUnits: (units: DistanceUnits) => void;
}

const ReaderPreferencesContext = createContext<ReaderPreferencesValue | null>(null);

export function ReaderPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [calendar, setCalendarState] = useState<CalendarPreference>(readCalendarPreference);
  const [units, setUnitsState] = useState<DistanceUnits>(readUnits);

  const setCalendar = useCallback((next: CalendarPreference) => {
    setCalendarState(next);
    writeCalendarPreference(next);
  }, []);

  const setUnits = useCallback((next: DistanceUnits) => {
    setUnitsState(next);
    writeUnits(next);
  }, []);

  const value = useMemo<ReaderPreferencesValue>(
    () => ({ calendar, setCalendar, units, setUnits }),
    [calendar, setCalendar, units, setUnits],
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
  return { calendar: 'gregorian', setCalendar: () => {}, units: 'km', setUnits: () => {} };
}
