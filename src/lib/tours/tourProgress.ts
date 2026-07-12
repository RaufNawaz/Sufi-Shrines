import { TOUR_PROGRESS_STORAGE_KEY } from '../storageKeys';

export type TourStatus = 'in-progress' | 'completed';

export interface TourProgressEntry {
  status: TourStatus;
  stopIdx: number;
}

export interface TourProgressState {
  /** The single most-recently-touched tour+stop — drives the "Resume tour" offer. */
  lastActive: { tourId: string; stopIdx: number } | null;
  /** Per-tour status, independent of lastActive — drives the TourList card badges. */
  tours: Record<string, TourProgressEntry>;
}

// A fresh object every call — callers (recordTourStop et al.) mutate their
// local `state` in place, so a shared instance here would leak between them.
function emptyState(): TourProgressState {
  return { lastActive: null, tours: {} };
}

function readState(): TourProgressState {
  try {
    const raw = localStorage.getItem(TOUR_PROGRESS_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      lastActive: parsed?.lastActive ?? null,
      tours: parsed?.tours ?? {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: TourProgressState): void {
  localStorage.setItem(TOUR_PROGRESS_STORAGE_KEY, JSON.stringify(state));
}

export function getTourProgressState(): TourProgressState {
  return readState();
}

/** Call whenever the active stop changes — marks the tour in-progress and
 * becomes the pointer offered by a future "Resume tour" prompt. */
export function recordTourStop(tourId: string, stopIdx: number): void {
  const state = readState();
  state.lastActive = { tourId, stopIdx };
  state.tours[tourId] = { status: 'in-progress', stopIdx };
  writeState(state);
}

/** Call when a tour is finished (Finish on the last stop) — clears the
 * resume pointer for this tour since there's nothing left to resume. */
export function recordTourCompleted(tourId: string): void {
  const state = readState();
  state.tours[tourId] = { status: 'completed', stopIdx: state.tours[tourId]?.stopIdx ?? 0 };
  if (state.lastActive?.tourId === tourId) state.lastActive = null;
  writeState(state);
}

/** Dismiss the "Resume tour" prompt without affecting per-tour status. */
export function clearLastActive(): void {
  const state = readState();
  if (!state.lastActive) return;
  state.lastActive = null;
  writeState(state);
}
