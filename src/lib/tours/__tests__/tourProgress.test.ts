import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTourProgressState,
  recordTourStop,
  recordTourCompleted,
  clearLastActive,
} from '../tourProgress';
import { TOUR_PROGRESS_STORAGE_KEY } from '../../storageKeys';

beforeEach(() => {
  localStorage.clear();
});

describe('getTourProgressState', () => {
  it('returns an empty state when nothing is stored', () => {
    expect(getTourProgressState()).toEqual({ lastActive: null, tours: {} });
  });

  it('returns an empty state for corrupted JSON rather than throwing', () => {
    localStorage.setItem(TOUR_PROGRESS_STORAGE_KEY, '{not json');
    expect(getTourProgressState()).toEqual({ lastActive: null, tours: {} });
  });
});

describe('recordTourStop', () => {
  it('sets lastActive and marks the tour in-progress', () => {
    recordTourStop('sufi-indus-valley', 2);
    expect(getTourProgressState()).toEqual({
      lastActive: { tourId: 'sufi-indus-valley', stopIdx: 2 },
      tours: { 'sufi-indus-valley': { status: 'in-progress', stopIdx: 2 } },
    });
  });

  it('overwrites lastActive when a different tour is touched', () => {
    recordTourStop('sufi-indus-valley', 2);
    recordTourStop('sikh-heritage-circuit', 0);
    const state = getTourProgressState();
    expect(state.lastActive).toEqual({ tourId: 'sikh-heritage-circuit', stopIdx: 0 });
    // Both tours keep independent in-progress entries.
    expect(state.tours['sufi-indus-valley']).toEqual({ status: 'in-progress', stopIdx: 2 });
    expect(state.tours['sikh-heritage-circuit']).toEqual({ status: 'in-progress', stopIdx: 0 });
  });
});

describe('recordTourCompleted', () => {
  it('marks the tour completed and clears lastActive if it pointed there', () => {
    recordTourStop('sufi-indus-valley', 7);
    recordTourCompleted('sufi-indus-valley');
    const state = getTourProgressState();
    expect(state.lastActive).toBeNull();
    expect(state.tours['sufi-indus-valley']).toEqual({ status: 'completed', stopIdx: 7 });
  });

  it('does not clear lastActive for a different, still in-progress tour', () => {
    recordTourStop('sufi-indus-valley', 3);
    recordTourStop('sikh-heritage-circuit', 1);
    recordTourCompleted('sufi-indus-valley');
    const state = getTourProgressState();
    expect(state.lastActive).toEqual({ tourId: 'sikh-heritage-circuit', stopIdx: 1 });
    expect(state.tours['sufi-indus-valley'].status).toBe('completed');
  });
});

describe('clearLastActive', () => {
  it('clears the resume pointer without touching per-tour status', () => {
    recordTourStop('sufi-indus-valley', 4);
    clearLastActive();
    const state = getTourProgressState();
    expect(state.lastActive).toBeNull();
    expect(state.tours['sufi-indus-valley']).toEqual({ status: 'in-progress', stopIdx: 4 });
  });

  it('is a no-op when there is nothing to clear', () => {
    clearLastActive();
    expect(getTourProgressState()).toEqual({ lastActive: null, tours: {} });
  });
});
