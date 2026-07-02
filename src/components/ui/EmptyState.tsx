/**
 * EmptyState - Consistent empty state display
 */

import React from 'react';
import { Empty } from 'antd';
import type { EmptyProps } from 'antd';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Optional title rendered above the description */
  title?: React.ReactNode;
  /** Empty state description */
  description?: React.ReactNode;
  /** Custom image (use Empty.PRESENTED_IMAGE_* for presets) */
  image?: EmptyProps["image"];
  /** Custom icon (displayed above description) */
  icon?: React.ReactNode;
  /** Show action button */
  action?: React.ReactNode;
  /** Build the action from a context object (so `EmptyStates.*` configs can be self-contained) */
  renderAction?: (ctx: { onLogin: () => void }) => React.ReactNode;
  /** Called when the `renderAction`'s login button is clicked */
  onLogin?: () => void;
  /** Additional className */
  className?: string;
  /** Inline style */
  style?: React.CSSProperties;
  /** Whether to center vertically */
  center?: boolean;
}

export function EmptyState({
  title,
  description = '暂无数据',
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  icon,
  action,
  renderAction,
  onLogin,
  className,
  style,
  center = true,
}: EmptyStateProps) {
  const resolvedAction =
    action ?? (renderAction ? renderAction({ onLogin: onLogin ?? (() => {}) }) : undefined);

  return (
    <div
      className={`${center ? styles.emptyState : styles.emptyStateNoCenter} ${className || ''}`}
      style={style}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      {title && <div className={styles.title}>{title}</div>}
      <Empty
        image={image}
        description={
          <span className={styles.description}>{description}</span>
        }
      >
        {resolvedAction}
      </Empty>
    </div>
  );
}

/**
 * Pre-configured empty state configs (not JSX elements).
 * Use with <EmptyState {...EmptyStates.noRecords} /> instead of .props hack.
 */
/**
 * Pre-configured empty-state configs.
 *
 * Each entry is a partial `EmptyStateProps`. The gallery / records pages
 * spread these: `<EmptyState {...EmptyStates.noImages} />`.
 *
 * For states that need a custom action button (e.g. login-to-view), pass
 * `action` as a function that receives an `onLogin` callback:
 *
 * ```tsx
 * <EmptyState
 *   {...EmptyStates.loginRequired}
 *   onLogin={() => authModal.open({ action: 'gallery' })}
 * />
 * ```
 */
export interface EmptyStateConfig {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  image?: EmptyProps["image"];
  /** Return the action JSX, given the helper callbacks from the parent. */
  renderAction?: (ctx: { onLogin: () => void }) => React.ReactNode;
}

export const EmptyStates: Record<string, EmptyStateConfig> = {
  noRecords: { description: "暂无生成记录" },
  noImages: { description: "还没有生成过图片" },
  noHistory: { description: "暂无历史记录" },
  noResults: { description: "没有找到匹配的结果" },
  loginRequired: {
    description: "登录后查看您保存的图片",
  },
  searchEmpty: {
    description: (
      <span>
        没有找到相关记录
        <br />
        <span className={styles.searchEmptyHint}>尝试调整筛选条件</span>
      </span>
    ),
  },
};
