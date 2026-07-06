// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { tourAudioAssetPath } from '../useTourAudio';

describe('tourAudioAssetPath', () => {
  it('builds the conventional per-stop, per-language path', () => {
    expect(tourAudioAssetPath('sufi-indus-valley', 0, 'en')).toBe(
      '/audio/tours/sufi-indus-valley/0.en.mp3',
    );
    expect(tourAudioAssetPath('sufi-indus-valley', 7, 'ur')).toBe(
      '/audio/tours/sufi-indus-valley/7.ur.mp3',
    );
  });

  it('is stable across different tours and stop indices', () => {
    expect(tourAudioAssetPath('sikh-heritage-circuit', 3, 'en')).toBe(
      '/audio/tours/sikh-heritage-circuit/3.en.mp3',
    );
  });
});
