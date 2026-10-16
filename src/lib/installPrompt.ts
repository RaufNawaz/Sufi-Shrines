import { useSyncExternalStore } from 'react';

/**
 * Installing the archive as an app.
 *
 * The manifest has said `display: standalone` all along (vite.config.ts) and
 * the service worker precaches the archive, so an installed copy works at a
 * shrine with no signal — and nothing ever told a visitor so (council, 15
 * October 2026). Chromium announces installability once, early, with
 * `beforeinstallprompt`; this module listens from the first import (main.tsx)
 * and keeps the event so /settings can offer it later. iOS Safari has no such
 * event; there the offer is the platform's own instruction instead.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const CHANGE = 'shrines:install-changed';
let deferred: InstallPromptEvent | null = null;
let installed = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    window.dispatchEvent(new Event(CHANGE));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    window.dispatchEvent(new Event(CHANGE));
  });
}

export type InstallState = 'installed' | 'promptable' | 'ios' | 'unavailable';

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function read(): InstallState {
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'promptable';
  if (isIosSafari()) return 'ios';
  return 'unavailable';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, read, () => 'unavailable');
}

/** Shows the browser's own install dialog. The event can be used once. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  window.dispatchEvent(new Event(CHANGE));
}
