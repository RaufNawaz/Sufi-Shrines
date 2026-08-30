import React, { useState } from 'react';
import { categoryKey } from '../../lib/data/categoryKey';
import { ShrineGlyph } from './ShrineGlyph';
import { thumbnailUrl } from '../../lib/images/thumbnail';
import { imageShape } from '../../lib/images/imageShape';

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
  /**
   * Called once when the browser cannot fetch `src`.
   *
   * This component already falls back to a placeholder on its own, which is the
   * right thing for a marker or a thumbnail. A caller that has to make a
   * *structural* decision — the gallery, which must stop offering a picture it
   * cannot show — needs to know it happened, and asking the image is the only
   * reliable way: `error` does not bubble, so a listener on any ancestor never
   * hears it, and matching a failed `<img>` back to its row by URL is a second
   * chance to be wrong. Both were tried here first.
   */
  onLoadError?: () => void;
}

export function ShrineImage({
  src,
  alt,
  category = '',
  className = '',
  placeholderClassName = '',
  loading = 'lazy',
  width,
  onLoadError,
}: ShrineImageProps) {
  const [errored, setErrored] = useState(false);
  const catKey = categoryKey(category);
  const resolvedSrc = width ? thumbnailUrl(src, width) : src;
  /* Looked up on `src`, the URL the sheet holds, not on `resolvedSrc`: the
     shapes were measured against the sheet's URLs, and `thumbnailUrl` only asks
     a rendition API for a narrower copy of the same picture, so the ratio it
     returns is the ratio that was measured. */
  const shape = imageShape(src);

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
      /* The measured shape, so the browser reserves the box before the bytes
         arrive — the CSS sets the displayed width and lets the height follow,
         so these two attributes act as a ratio rather than as a size. An
         unmeasured image passes undefined and renders exactly as it did
         before; see lib/images/imageShape.ts for why a miss is the safe
         outcome. */
      {...(shape ? { width: shape.width, height: shape.height } : {})}
      onError={() => {
        setErrored(true);
        onLoadError?.();
      }}
    />
  );
}
