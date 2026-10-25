import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../../types/shrine';

import { LANGUAGES } from '../i18n/languages';
export type TourAudioState = 'idle' | 'playing' | 'paused';
export type TourAudioSource = 'asset' | 'tts' | null;

/**
 * Static per-stop narration path convention: drop an MP3 at this path (in
 * `public/`) to have it used instead of the SpeechSynthesis fallback, e.g.
 * `public/audio/tours/sufi-indus-valley/0.en.mp3` for the first stop's
 * English narration. Precached at runtime by the PWA service worker
 * (see vite.config.ts) the first time it's played.
 */
export function tourAudioAssetPath(tourId: string, stopIndex: number, lang: Lang): string {
  // Under the deploy's base path: a bare `/audio/…` 404s on a /Sufi-Shrines/ deploy.
  return `${import.meta.env.BASE_URL}audio/tours/${tourId}/${stopIndex}.${lang}.mp3`;
}

/**
 * Resolves true if an audio file exists at `src`, false otherwise.
 *
 * A HEAD request, not an `<audio>` element waiting for `canplaythrough`: iOS
 * Safari does not load media outside a user gesture, so that promise never
 * settled there and the Play button did nothing (mobile audit, 25 October
 * 2026). The content type is checked because a dev server answers a missing
 * file with the app's index.html and a 200.
 */
async function probeAudioAsset(src: string): Promise<boolean> {
  try {
    const response = await fetch(src, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type') ?? '').startsWith('audio/');
  } catch {
    return false;
  }
}

function speechLangTag(lang: Lang): string {
  return LANGUAGES[lang].speech;
}

interface UseTourAudioOptions {
  tourId: string;
  stopIndex: number;
  text: string;
  lang: Lang;
}

/**
 * Per-stop narration: plays a static audio asset when one exists at the
 * conventional path, otherwise falls back to the browser's SpeechSynthesis
 * API reading `text`. Resets whenever the stop changes.
 */
export function useTourAudio({ tourId, stopIndex, text, lang }: UseTourAudioOptions) {
  const [state, setState] = useState<TourAudioState>('idle');
  const [source, setSource] = useState<TourAudioSource>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    audioElRef.current?.pause();
    audioElRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState('idle');
    setSource(null);
  }, []);

  // A new stop means a new narration — drop whatever was playing.
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, stopIndex]);

  useEffect(() => stop, [stop]);

  /* Whether this stop has a recorded narration, found out *before* the tap.
     iOS lets audio and speech start only synchronously inside a user gesture;
     awaiting the probe in the click handler put speak() after an await, where
     iOS ignores it. */
  const hasAssetRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    hasAssetRef.current = false;
    void probeAudioAsset(tourAudioAssetPath(tourId, stopIndex, lang)).then((found) => {
      if (!cancelled) hasAssetRef.current = found;
    });
    return () => {
      cancelled = true;
    };
  }, [tourId, stopIndex, lang]);

  const play = useCallback(() => {
    if (state === 'paused' && source === 'asset' && audioElRef.current) {
      void audioElRef.current.play().catch(() => setState('idle'));
      setState('playing');
      return;
    }
    if (state === 'paused' && source === 'tts' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setState('playing');
      return;
    }

    if (hasAssetRef.current) {
      const audio = new Audio(tourAudioAssetPath(tourId, stopIndex, lang));
      audio.addEventListener('ended', () => setState('idle'));
      audioElRef.current = audio;
      setSource('asset');
      setState('playing');
      void audio.play().catch(() => setState('idle'));
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangTag(lang);
    utterance.onend = () => setState('idle');
    // No voice for the language, or the engine refused: back to idle rather
    // than a Pause button over silence.
    utterance.onerror = () => setState('idle');
    setSource('tts');
    setState('playing');
    window.speechSynthesis.speak(utterance);
  }, [state, source, tourId, stopIndex, lang, text]);

  const pause = useCallback(() => {
    if (source === 'asset') {
      audioElRef.current?.pause();
    } else if (source === 'tts' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    setState('paused');
  }, [source]);

  return { state, source, play, pause, stop };
}
