import React, { useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { ShrineImage } from '../ui/ShrineImage';

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
  const { t, isRTL } = useLang();
  const [idx, setIdx] = useState(initialIndex);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - (isRTL ? -1 : 1)));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(items.length - 1, i + (isRTL ? -1 : 1)));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [items.length, onClose, isRTL]);

  const item = items[idx];

  return (
    <div
      className="lightbox-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery')}
    >
      {items.length > 1 && (
        <button
          className="lightbox-nav-btn prev"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          aria-label="Previous image"
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
        src={item.imageUrl}
        alt={item.caption || `Gallery image ${idx + 1}`}
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
          onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
          aria-label="Next image"
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
  const { t } = useLang();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="article-section" id="gallery" aria-labelledby="gallery-heading">
      <h2 className="article-section-heading" id="gallery-heading">
        {t('gallery')}
      </h2>
      <div className="gallery-grid" role="list">
        {items.map((item, i) => (
          <button
            key={item.index}
            className="gallery-item"
            role="listitem"
            onClick={() => setLightboxIdx(i)}
            aria-label={item.caption || `${t('gallery')} image ${i + 1}: ${t('imageExpand')}`}
          >
            <ShrineImage
              src={item.imageUrl}
              alt={item.caption || ''}
              category={category}
              className="gallery-img"
              loading="lazy"
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
        <Lightbox items={items} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </section>
  );
}
