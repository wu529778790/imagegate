/**
 * LazyImage - Lazy loading image with placeholder
 */

import React, { useState, useRef } from 'react';
import type { ImageProps } from 'antd';

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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
    opacity: loaded ? 1 : 0,
  };

  return (
    <div style={containerStyle}>
      {/* Placeholder / Blur */}
      {!loaded && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: blurDataURL
              ? `url(${blurDataURL})`
              : 'var(--bg-surface)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurDataURL ? 'blur(20px)' : 'none',
            transform: blurDataURL ? 'scale(1.1)' : 'none',
          }}
        />
      )}

      {/* Skeleton shimmer */}
      {!loaded && !error && !blurDataURL && (
        <div
          className="shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            aspectRatio,
          }}
        />
      )}

      {/* Actual image */}
      {src && !error ? (
        <img
          ref={imgRef}
          src={src}
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyle}
          loading="lazy"
          {...props}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            fontSize: 12,
            aspectRatio,
          }}
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
