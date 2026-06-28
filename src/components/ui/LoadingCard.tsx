/**
 * LoadingCard - Skeleton loading component
 * Provides visual feedback during data loading
 */

import React, { useMemo } from 'react';

interface LoadingCardProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Height of each skeleton item */
  height?: number | string;
  /** Custom className */
  className?: string;
  /** Whether to show as grid */
  grid?: boolean;
  /** Grid columns (only when grid=true) */
  gridCols?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function LoadingCard({
  count = 3,
  height = 200,
  className,
  grid = false,
  gridCols = 3,
}: LoadingCardProps) {
  const gridColsClass = useMemo(() => {
    const map = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    return map[gridCols];
  }, [gridCols]);

  const items = useMemo(() => Array.from({ length: count }), [count]);

  if (grid) {
    return (
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: 16,
        }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              borderRadius: 12,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((_, i) => (
        <div
          key={i}
          className="shimmer"
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            borderRadius: 12,
          }}
        />
      ))}
    </div>
  );
}

/**
 * LoadingGrid - Specialized grid loading for image galleries
 */
export function LoadingGrid({
  count = 6,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
}: {
  count?: number;
  cols?: { xs: number; sm: number; md: number; lg: number };
}) {
  const [width, setWidth] = React.useState(1024);

  React.useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCols = () => {
    if (width < 640) return cols.xs;
    if (width < 768) return cols.sm;
    if (width < 1024) return cols.md;
    return cols.lg;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getCols()}, 1fr)`,
        gap: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 300, borderRadius: 12 }} />
      ))}
    </div>
  );
}
