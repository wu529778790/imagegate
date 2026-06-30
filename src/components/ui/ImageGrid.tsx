/**
 * ImageGrid - Responsive image grid layout
 * Automatically adjusts columns based on viewport width
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ImageCard } from './ImageCard';
import type { ImageCardProps } from './ImageCard';
import styles from './ImageGrid.module.css';

export interface ImageGridProps {
  /** Array of image items */
  items: ImageCardProps[];
  /** Number of columns at different breakpoints */
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between items */
  gap?: number;
  /** Whether to animate items on mount */
  animate?: boolean;
  /** Stagger animation delay (ms) */
  staggerDelay?: number;
  /** Render custom item instead of ImageCard */
  renderItem?: (item: ImageCardProps, index: number) => ReactNode;
  /** Empty state when no items */
  emptyState?: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Loading count */
  loadingCount?: number;
}

export function ImageGrid({
  items,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 16,
  animate = true,
  staggerDelay = 50,
  renderItem,
  emptyState,
  loading = false,
  loadingCount = 6,
}: ImageGridProps) {
  const [width, setWidth] = useState(1024);

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCols = () => {
    if (width < 640) return cols.xs || 1;
    if (width < 768) return cols.sm || 2;
    if (width < 1024) return cols.md || 3;
    if (width < 1280) return cols.lg || 4;
    return cols.xl || 5;
  };

  if (loading) {
    return (
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${getCols()}, 1fr)`,
          gap,
        }}
      >
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 300, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (renderItem) {
    return (
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${getCols()}, 1fr)`,
          gap,
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.src || index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${getCols()}, 1fr)`,
        gap,
      }}
    >
      {items.map((item, index) => {
        const delay = animate ? index * staggerDelay : 0;

        return (
          <div
            key={item.src || index}
            className={animate ? styles.gridItem : styles.gridItemVisible}
            style={{
              animation: animate ? `fade-in-up 0.4s ease-out ${delay}ms forwards` : undefined,
            }}
          >
            <ImageCard {...item} />
          </div>
        );
      })}
    </div>
  );
}
