import { DIRECTORY_MODE_STORAGE_KEY } from './storageKeys';
import { readStorage, writeStorage } from './safeStorage';

export type DirectoryMode = 'spotlight' | 'table';

export const DEFAULT_DIRECTORY_MODE: DirectoryMode = 'spotlight';

export function readDirectoryMode(): DirectoryMode {
  return readStorage(DIRECTORY_MODE_STORAGE_KEY) === 'table' ? 'table' : DEFAULT_DIRECTORY_MODE;
}

export function writeDirectoryMode(mode: DirectoryMode): void {
  writeStorage(DIRECTORY_MODE_STORAGE_KEY, mode);
}
