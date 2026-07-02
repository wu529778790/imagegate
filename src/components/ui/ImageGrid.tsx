/**
 * ImageGrid - Responsive image grid layout.
 *
 * Replaced the old `useState(window.innerWidth)` + resize listener approach
 * with pure CSS — the grid column width is controlled by `--ig-col` and
 * responsive overrides in `ImageGrid.module.css`. To override, pass a
 * `style={{ '--ig-col': '200px' } as React.CSSProperties}` prop or wrap
 * in a scoped CSS selector.
 */

import React from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { ImageCard } from './ImageCard';
import type { ImageCardProps } from './ImageCard';
import styles from './ImageGrid.module.css';

export interface ImageGridProps {
  /** Array of image items */
  items: ImageCardProps[];
  /**
   * Column width override, injected as `--ig-col` CSS variable on the grid.
   * Use this to control how wide each column is before wrapping.
   */
  colWidth?: string;
  /**
   * @deprecated Use `colWidth` instead. Kept for backward compatibility with
   * pages not yet migrated (e.g. HistoryModal).
   */
  cols?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  /** Gap between items */
  gap?: number | string;
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

export const ImageGrid = React.memo(function ImageGrid({
  items,
  colWidth,
  cols,
  gap,
  animate = true,
  staggerDelay = 50,
  renderItem,
  emptyState,
  loading = false,
  loadingCount = 6,
}: ImageGridProps) {
  void cols; // deprecated, ignored — column width is now pure CSS
  const gridStyle: CSSProperties = {
    ...(colWidth ? ({ '--ig-col': colWidth } as CSSProperties) : {}),
    ...(gap !== undefined ? ({ '--ig-gap': typeof gap === 'number' ? `${gap}px` : gap } as CSSProperties) : {}),
  };

  if (loading) {
    return (
      <div className={styles.grid} style={gridStyle}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 240, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (renderItem) {
    return (
      <div className={styles.grid} style={gridStyle}>
        {items.map((item, index) => (
          <React.Fragment key={item.src || index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid} style={gridStyle}>
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
});
