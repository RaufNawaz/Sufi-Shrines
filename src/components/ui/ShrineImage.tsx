import React, { useState } from 'react';

function categoryKey(category: string): 'muslim' | 'hindu' | 'sikh' | 'default' {
  const c = (category || '').toLowerCase();
  if (c.includes('muslim')) return 'muslim';
  if (c.includes('hindu')) return 'hindu';
  if (c.includes('sikh')) return 'sikh';
  return 'default';
}

interface ShrineImageProps {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
  placeholderClassName?: string;
  loading?: 'lazy' | 'eager';
}

export function ShrineImage({
  src,
  alt,
  category = '',
  className = '',
  placeholderClassName = '',
  loading = 'lazy',
}: ShrineImageProps) {
  const [errored, setErrored] = useState(false);
  const catKey = categoryKey(category);

  if (!src || errored) {
    return (
      <div
        className={`shrine-img-placeholder shrine-img-placeholder--${catKey} ${placeholderClassName}`}
        aria-hidden="true"
      >
        <svg
          className="shrine-img-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
