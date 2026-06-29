/**
 * EmptyState - Consistent empty state display
 */

import React from 'react';
import { Empty } from 'antd';
import type { EmptyProps } from 'antd';

export interface EmptyStateProps {
  /** Empty state description */
  description?: React.ReactNode;
  /** Custom image (use Empty.PRESENTED_IMAGE_* for presets) */
  image?: EmptyProps['image'];
  /** Show action button */
  action?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Inline style */
  style?: React.CSSProperties;
  /** Whether to center vertically */
  center?: boolean;
}

export function EmptyState({
  description = '暂无数据',
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  action,
  className,
  style,
  center = true,
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        padding: center ? '60px 24px' : '24px',
        textAlign: 'center',
        ...style,
      }}
    >
      <Empty
        image={image}
        description={
          <span style={{ color: 'var(--text-secondary)' }}>{description}</span>
        }
      >
        {action && action}
      </Empty>
    </div>
  );
}

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
  noRecords: <EmptyState description="暂无生成记录" />,
  noImages: <EmptyState description="还没有生成过图片" />,
  noHistory: <EmptyState description="暂无历史记录" />,
  noResults: <EmptyState description="没有找到匹配的结果" />,
  searchEmpty: (
    <EmptyState
      description={
        <span>
          没有找到相关记录
          <br />
          <span style={{ fontSize: 12, opacity: 0.7 }}>尝试调整筛选条件</span>
        </span>
      }
    />
  ),
};
