import { useEffect, useState } from 'react';
import {
  ensureUrduContentForLang,
  isUrduContentLoaded,
  onUrduContentLoaded,
} from '../lib/data/urduContentOverride';
import { useLang } from '../lib/i18n/LanguageContext';

/**
 * Whether the Urdu article payload is in memory yet.
 *
 * **The question this answers is not "does this entry have an Urdu article".**
 * It is "has the file that would tell us arrived", and the two look identical
 * from a row: `getUrduFieldValue(row, 'Description')` returns nothing in both
 * cases, so a component that falls back to English on an empty value cannot
 * tell "there is no Urdu here" from "the Urdu is still downloading".
 *
 * It matters because the payload is language-gated and 253 KB.
 * `LanguageContext` requests it the moment the reader switches to Urdu, and
 * until it lands every consumer that falls back renders **English prose in the
 * Urdu view** — the one thing i18n rule 7 forbids outright. Measured on the dev
 * server, 28 August 2026, with only that chunk delayed: switching to Urdu on
 * the map left the whole English lead of the preview card
 * ("Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot
 * District…") on screen for **4.7 seconds**, under an Urdu name and an Urdu
 * category, before it swapped.
 *
 * The e2e no-leak guard could not see it: it opens `?lang=ur` directly, and on
 * that path `fetchShrines` awaits the payload before it builds a single row, so
 * there is no window at all. The window belongs to the *switch*, which no spec
 * walked.
 *
 * Subscribes rather than reading once, so a component mounted during the gap
 * re-renders when the payload lands instead of depending on some other state
 * change to bring it back.
 */
export function useUrduArticlesReady(): boolean {
  const [ready, setReady] = useState(isUrduContentLoaded);
  useEffect(() => {
    if (ready) return;
    return onUrduContentLoaded(() => setReady(true));
  }, [ready]);
  return ready;
}

/**
 * Ask for the Urdu article payload, and report whether it has arrived.
 *
 * The difference from `useUrduArticlesReady` above is the asking, and it is the
 * whole point. The payload used to be fetched by `LanguageContext` and awaited
 * by `useShrineData` on **every** route, because the gate was on the reader's
 * language. Measured on a production build, 30 August 2026: 258,872 gzipped
 * bytes of shrine article prose downloaded on `/almanac`, `/graph`,
 * `/place/:slug`, `/about` and the map front door, none of which renders a word
 * of it (docs/planning/URDU_ARTICLE_PAYLOAD.md).
 *
 * Three surfaces read a merged Urdu article field, and each one mounts only
 * when it is actually needed: the preview card when a shrine is selected, the
 * tour panel when a tour is running, the article when a shrine page is open. So
 * the gate moves here — the components that need the file ask for it, and a
 * reader looking at the calendar does not.
 *
 * Idempotent: concurrent callers share one chunk request, and a language that
 * is not Urdu resolves immediately without one.
 */
export function useUrduArticles(): boolean {
  const { lang } = useLang();
  const ready = useUrduArticlesReady();

  useEffect(() => {
    void ensureUrduContentForLang(lang);
  }, [lang]);

  return ready;
}
