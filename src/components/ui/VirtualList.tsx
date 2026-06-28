/**
 * VirtualList - High-performance virtual scrolling list
 * Only renders visible items for optimal performance with large datasets
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height of each item (in pixels) */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor function */
  keyExtractor: (item: T, index: number) => string | number;
  /** Container height (default: 100%) */
  height?: number | string;
  /** Number of items to render outside viewport (overscan) */
  overscan?: number;
  /** Additional className */
  className?: string;
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Loading indicator */
  loading?: boolean;
  /** Loading count */
  loadingCount?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  keyExtractor,
  height = '100%',
  overscan = 5,
  className,
  onScroll,
  loading = false,
  loadingCount = 10,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container height on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);
  }, [onScroll]);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Build visible items array
  const visibleItems: Array<{ item: T; index: number; top: number }> = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({
      item: items[i],
      index: i,
      top: i * itemHeight,
    });
  }

  // Show loading skeleton
  if (loading) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {Array.from({ length: loadingCount }).map((_, i) => (
            <div
              key={i}
              className="shimmer"
              style={{
                position: 'absolute',
                top: i * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight - 8,
                margin: '4px 8px',
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook to detect if element is in viewport
 */
export function useInViewport(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}
