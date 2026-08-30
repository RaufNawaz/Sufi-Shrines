import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { ShrineImage } from '../ui/ShrineImage';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';

const SWIPE_THRESHOLD_PX = 50;

/**
 * Gallery photographs the browser could not load.
 *
 * ## What a reader got before this
 *
 * Measured 31 August 2026 on `/shrine/gurdwara-sacha-sauda`, whose only
 * photograph 404s: the gallery rendered **one tile, and the tile was a
 * `<button>` labelled "Image 1: Open image"** wrapping a category-tinted
 * placeholder. Clicking it opened the lightbox full-screen over a broken image
 * with **no text in it at all**. A screen-reader user was offered a picture that
 * does not exist and then given an empty dialog.
 *
 * Three entries are in that state today — Gurdwara Sacha Sauda, Shrine of Sachal
 * Sarmast and Garh Maharaja — each with exactly one image field and a dead URL.
 * It is not a fixed list: `pipeline/check_image_liveness.py` went from 53 to 54
 * dead in four days when a host's certificate expired, so any entry can arrive
 * here without anything changing in this repository.
 *
 * ## Why they disappear rather than explain themselves
 *
 * 51 entries carry no photograph and their pages have **no gallery section at
 * all** — `items.length === 0` returns null below. An entry whose only
 * photograph cannot be fetched is in exactly that position, so it renders
 * exactly that way. The alternative, a tile saying "photograph unavailable",
 * would mean authoring the sentence in Urdu (RULE 2) to say something the
 * archive already reports honestly in aggregate on `/about`.
 *
 * Module-level and keyed by the sheet's own URL, both for the reasons
 * `deadPhotoUrls` in `ShrineMarkers.tsx` gives: a dead URL is dead for the whole
 * visit, and the sheet points two entries at one file often enough that the
 * address is the right key rather than the entry.
 */
const deadImageUrls = new Set<string>();

interface Props {
  items: GalleryItem[];
  category?: string;
}

interface LightboxProps {
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ items, initialIndex, onClose }: LightboxProps) {
  const { t, lang, isRTL, fmtNum } = useLang();
  const [idx, setIdx] = useState(initialIndex);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  /*
   * One clamped step, used by the buttons, the arrow keys and the swipe.
   *
   * There were two copies of this arithmetic, and the arrow-key copy flipped
   * the *step* for RTL without flipping the *clamp*:
   *
   *   ArrowLeft:  Math.max(0, i - (isRTL ? -1 : 1))          // can exceed the end
   *   ArrowRight: Math.min(len - 1, i + (isRTL ? -1 : 1))    // can go below zero
   *
   * So in the Urdu view, arrowing past the last photo set idx out of range,
   * `items[idx]` became undefined, and reading `item.index` in the render threw
   * — the whole lightbox vanished. Measured: five ArrowLefts on a two-photo
   * gallery destroyed it in Urdu and did nothing in English. Clamping in one
   * place makes the direction and the bound impossible to disagree.
   */
  const step = useCallback(
    (delta: number) => setIdx((i) => Math.min(items.length - 1, Math.max(0, i + delta))),
    [items.length],
  );
  const goPrev = () => step(-1);
  const goNext = () => step(1);

  useEffect(() => {
    /*
     * Capture *before* focusing, not after.
     *
     * These two lines were the other way round, so `document.activeElement` was
     * already the dialog's own close button by the time it was read — and on
     * unmount the code restored focus to an element that had just been removed
     * from the document. Focus fell to <body>: a reader who opened a photo with
     * the keyboard and pressed Escape landed at the top of the page and had to
     * tab all the way back to where they were. The restore looked implemented
     * and did nothing.
     */
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, []);

  /*
   * A real focus trap. The previous code was labelled "Focus trap" and was
   * focus *management*: it focused the close button on open and restored focus
   * on close, but Tab walked straight out of the dialog and into the page
   * behind it — measured, eight Tabs landed on a `.related-card` link. For a
   * container marked `aria-modal="true"` that is a contradiction: the screen
   * reader has been told the rest of the page is inert while the keyboard is
   * free to roam it.
   */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') step(isRTL ? 1 : -1);
      if (e.key === 'ArrowRight') step(isRTL ? -1 : 1);
      if (e.key !== 'Tab') return;

      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusable = [
        ...overlay.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      // Cycle at the ends, and pull focus back in if it has already left —
      // the prev/next buttons become `disabled` at the ends, which removes the
      // currently-focused element from the tab order mid-interaction.
      if (!overlay.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isRTL, step]);

  // Warm the browser cache for adjacent images so prev/next feels instant.
  useEffect(() => {
    [idx - 1, idx + 1]
      .filter((i) => i >= 0 && i < items.length)
      .forEach((i) => {
        const preload = new window.Image();
        preload.src = thumbnailUrl(items[i].imageUrl, IMAGE_WIDTH.hero);
      });
  }, [idx, items]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    const swipedToNext = isRTL ? delta > 0 : delta < 0;
    if (swipedToNext) goNext();
    else goPrev();
  };

  const item = items[idx];

  return (
    <div
      ref={overlayRef}
      className="lightbox-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery')}
    >
      {items.length > 1 && (
        <div className="lightbox-counter">
          <span aria-hidden="true">
            {fmtNum(idx + 1)} / {fmtNum(items.length)}
          </span>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {tFn(lang, 'photoOf', idx + 1, items.length)}
          </span>
        </div>
      )}

      {items.length > 1 && (
        <button
          className="lightbox-nav-btn prev"
          onClick={goPrev}
          aria-label={t('ariaPreviousImage')}
          disabled={idx === 0}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <img
        key={item.index}
        src={thumbnailUrl(item.imageUrl, IMAGE_WIDTH.hero)}
        /* Was `Gallery image ${idx + 1}` — an English literal in the Urdu view.
           The accessible-name guard could not see it: the lightbox only exists
           after a click, and that sweep scans the page as loaded. Same blind
           spot as UpdateToast (HANDOVER §9.51).

           `photoOf` rather than a composed label: when the archive records no
           caption, the honest description of the image *is* its position, and
           "Photo 1 of 2" / "تصویر ۱ از ۲" says that in a sentence. */
        alt={item.caption || fmtNum(tFn(lang, 'photoOf', idx + 1, items.length))}
        className="lightbox-img"
      />

      {(item.caption || item.credit) && (
        <div className="lightbox-caption">
          {item.caption && <p>{item.caption}</p>}
          {item.credit && (
            <p className="lightbox-credit">
              {t('photoCredit')}: <bdi>{item.credit}</bdi>
            </p>
          )}
        </div>
      )}

      {items.length > 1 && (
        <button
          className="lightbox-nav-btn next"
          onClick={goNext}
          aria-label={t('ariaNextImage')}
          disabled={idx === items.length - 1}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <button
        ref={closeRef}
        className="lightbox-close"
        onClick={onClose}
        aria-label={t('closeImage')}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ShrineGallery({ items, category = '' }: Props) {
  const { t, lang, fmtNum } = useLang();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  /* Bumped when an image fails, purely to re-render. The set is the state; this
     is the signal that it changed. */
  const [deadSeen, setDeadSeen] = useState(0);

  const shown = items.filter((item) => !item.imageUrl || !deadImageUrls.has(item.imageUrl));

  /* Capture phase, because `error` does not bubble — the same reason the marker
     layer registers its listener the same way. One handler on the grid rather
     than one per tile: the tiles are replaced whenever this re-renders, and a
     listener on the container outlives them. */
  /* Told by the image, not inferred from an event.
     Two earlier attempts failed here and both are worth naming. A listener on
     the grid never fired: `error` does not bubble, and React delegates media
     events by binding them to the element, so nothing on an ancestor hears it.
     Then matching the failed `<img>` back to its row by URL prefix marked the
     wrong one dead — every Wikimedia Commons URL in this archive opens with the
     same 43 characters, so an entry with one broken photograph and one good one
     lost the good one. `ShrineImage` already knows which `src` failed, so it
     says so. */
  const markDead = useCallback((url: string) => {
    if (!url || deadImageUrls.has(url)) return;
    deadImageUrls.add(url);
    setDeadSeen((n) => n + 1);
  }, []);
  void deadSeen;

  /* Both the "no photograph" case and the "no photograph we can fetch" case. */
  if (shown.length === 0) return null;

  return (
    <section className="article-section" id="gallery" aria-labelledby="gallery-heading">
      <h2 className="article-section-heading" id="gallery-heading">
        {t('gallery')}
      </h2>
      <div className="gallery-grid" role="list">
        {shown.map((item, i) => (
          <button
            key={item.index}
            className="gallery-item"
            role="listitem"
            onClick={() => setLightboxIdx(i)}
            /* `fmtNum` around the whole string, the same treatment the
               lightbox's own alt text at the top of this file already gets:
               the index is interpolated into the label, so without it an Urdu
               reader is told "تصویر 1" in Western digits. */
            aria-label={
              item.caption || fmtNum(tFn(lang, 'galleryImageLabel', i + 1, t('imageExpand')))
            }
          >
            <ShrineImage
              src={item.imageUrl}
              alt={item.caption || ''}
              category={category}
              className="gallery-img"
              loading="lazy"
              width={IMAGE_WIDTH.gallery}
              onLoadError={() => markDead(item.imageUrl)}
            />
            {(item.caption || item.credit) && (
              <div className="gallery-caption">
                {item.caption && <p>{item.caption}</p>}
                {item.credit && (
                  <p className="gallery-credit">
                    {t('photoCredit')}: <bdi>{item.credit}</bdi>
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        /* `shown`, not `items`. The grid indexes into the filtered list, so
           handing the lightbox the unfiltered one opens a different photograph
           than the tile the reader pressed as soon as anything is filtered —
           and the whole point of the filtering is that something is. */
        <Lightbox items={shown} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </section>
  );
}
