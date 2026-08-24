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
  return `/audio/tours/${tourId}/${stopIndex}.${lang}.mp3`;
}

/** Resolves true if playable audio exists at `src`, false on any error. */
function probeAudioAsset(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onOk);
      audio.removeEventListener('error', onErr);
    };
    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onErr = () => {
      cleanup();
      resolve(false);
    };
    audio.addEventListener('canplaythrough', onOk, { once: true });
    audio.addEventListener('error', onErr, { once: true });
    audio.src = src;
  });
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

  const play = useCallback(async () => {
    if (state === 'paused' && source === 'asset' && audioElRef.current) {
      await audioElRef.current.play();
      setState('playing');
      return;
    }
    if (state === 'paused' && source === 'tts' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setState('playing');
      return;
    }

    const assetSrc = tourAudioAssetPath(tourId, stopIndex, lang);
    const hasAsset = await probeAudioAsset(assetSrc);
    if (hasAsset) {
      const audio = new Audio(assetSrc);
      audio.addEventListener('ended', () => setState('idle'));
      audioElRef.current = audio;
      setSource('asset');
      setState('playing');
      await audio.play();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangTag(lang);
    utterance.onend = () => setState('idle');
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
