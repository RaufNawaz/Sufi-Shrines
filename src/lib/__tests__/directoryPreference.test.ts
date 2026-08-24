import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DIRECTORY_MODE,
  readDirectoryMode,
  writeDirectoryMode,
} from '../directoryPreference';
import { DIRECTORY_MODE_STORAGE_KEY } from '../storageKeys';

describe('directory preference', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to spotlight search', () => {
    expect(readDirectoryMode()).toBe(DEFAULT_DIRECTORY_MODE);
    expect(readDirectoryMode()).toBe('spotlight');
  });

  it('restores the traditional table preference', () => {
    localStorage.setItem(DIRECTORY_MODE_STORAGE_KEY, 'table');
    expect(readDirectoryMode()).toBe('table');
  });

  it('falls back to spotlight for unknown persisted values', () => {
    localStorage.setItem(DIRECTORY_MODE_STORAGE_KEY, 'unknown');
    expect(readDirectoryMode()).toBe('spotlight');
  });

  it('persists a selected mode', () => {
    writeDirectoryMode('table');
    expect(localStorage.getItem(DIRECTORY_MODE_STORAGE_KEY)).toBe('table');
  });
});
