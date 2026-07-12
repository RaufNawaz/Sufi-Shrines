import React, { useState } from 'react';
import { categoryKey } from '../../lib/data/categoryKey';
import { ShrineGlyph } from './ShrineGlyph';

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
        <ShrineGlyph className="shrine-img-icon" />
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
