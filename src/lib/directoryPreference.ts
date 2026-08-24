import { DIRECTORY_MODE_STORAGE_KEY } from './storageKeys';

export type DirectoryMode = 'spotlight' | 'table';

export const DEFAULT_DIRECTORY_MODE: DirectoryMode = 'spotlight';

export function readDirectoryMode(): DirectoryMode {
  if (typeof window === 'undefined') return DEFAULT_DIRECTORY_MODE;
  try {
    return window.localStorage.getItem(DIRECTORY_MODE_STORAGE_KEY) === 'table'
      ? 'table'
      : DEFAULT_DIRECTORY_MODE;
  } catch {
    return DEFAULT_DIRECTORY_MODE;
  }
}

export function writeDirectoryMode(mode: DirectoryMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DIRECTORY_MODE_STORAGE_KEY, mode);
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}
