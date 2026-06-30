/**
 * LazyImage - Lazy loading image with placeholder
 */

import React, { useState, useRef } from 'react';
import type { ImageProps } from 'antd';
import styles from './LazyImage.module.css';

export interface LazyImageProps extends Omit<ImageProps, 'src'> {
  /** Image source */
  src?: string;
  /** Placeholder while loading */
  placeholder?: React.ReactNode;
  /** Blur data URL for progressive loading */
  blurDataURL?: string;
  /** Aspect ratio (e.g., "16/9", "1/1") */
  aspectRatio?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image errors */
  onError?: () => void;
}

export function LazyImage({
  src,
  placeholder,
  blurDataURL,
  aspectRatio = '16/9',
  onLoad,
  onError,
  style,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  return (
    <div className={styles.container} style={style}>
      {/* Placeholder / Blur */}
      {!loaded && !error && (
        <div
          className={blurDataURL ? styles.blurPlaceholder : styles.solidPlaceholder}
          style={blurDataURL ? { backgroundImage: `url(${blurDataURL})` } : undefined}
        />
      )}

      {/* Skeleton shimmer */}
      {!loaded && !error && !blurDataURL && (
        <div
          className={`shimmer ${styles.shimmerPlaceholder}`}
          style={{ aspectRatio }}
        />
      )}

      {/* Actual image */}
      {src && !error ? (
        <img
          ref={imgRef}
          src={src}
          onLoad={handleLoad}
          onError={handleError}
          className={`${styles.image} ${loaded ? styles.imageVisible : styles.imageHidden}`}
          loading="lazy"
          {...props}
        />
      ) : (
        <div
          className={styles.errorState}
          style={{ aspectRatio }}
        >
          {error ? '加载失败' : placeholder}
        </div>
      )}
    </div>
  );
}

/**
 * ProgressiveImage - Image with progressive loading effect
 */
export function ProgressiveImage({
  src,
  lowQualitySrc,
  ...props
}: LazyImageProps & { lowQualitySrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);

  React.useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setCurrentSrc(src);
  }, [src]);

  return <LazyImage {...props} src={currentSrc} />;
}
