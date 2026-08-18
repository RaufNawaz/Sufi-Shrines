import React, { useState } from 'react';
import { categoryKey } from '../../lib/data/categoryKey';
import { ShrineGlyph } from './ShrineGlyph';
import { thumbnailUrl } from '../../lib/images/thumbnail';

interface ShrineImageProps {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
  placeholderClassName?: string;
  loading?: 'lazy' | 'eager';
  /** Display width in CSS pixels (use IMAGE_WIDTH). Hosts with a rendition
   *  API are asked for roughly this size instead of the original — see
   *  lib/images/thumbnail.ts for why that matters here. Omit for full size. */
  width?: number;
}

export function ShrineImage({
  src,
  alt,
  category = '',
  className = '',
  placeholderClassName = '',
  loading = 'lazy',
  width,
}: ShrineImageProps) {
  const [errored, setErrored] = useState(false);
  const catKey = categoryKey(category);
  const resolvedSrc = width ? thumbnailUrl(src, width) : src;

  if (!resolvedSrc || errored) {
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
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
