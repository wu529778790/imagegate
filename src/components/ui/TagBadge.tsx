/**
 * TagBadge - Consistent tag/badge styling
 */

import React from 'react';
import { Tag, TagProps } from 'antd';

export interface TagBadgeProps extends Omit<TagProps, 'color'> {
  /** Tag label */
  label: React.ReactNode;
  /** Tag color (supports Ant Design preset colors or custom hex) */
  color?: string;
  /** Whether to show with icon */
  icon?: React.ReactNode;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether tag is closable */
  closable?: boolean;
  /** Callback when closed */
  onClose?: (e: React.MouseEvent) => void;
}

export function TagBadge({
  label,
  color,
  icon,
  size = 'medium',
  closable = false,
  onClose,
  ...props
}: TagBadgeProps) {
  const sizeStyles = {
    small: { fontSize: 10, padding: '0 5px', height: 18, lineHeight: '18px' },
    medium: { fontSize: 12, padding: '0 8px', height: 22, lineHeight: '22px' },
    large: { fontSize: 14, padding: '0 10px', height: 26, lineHeight: '26px' },
  };

  const style = sizeStyles[size];

  return (
    <Tag
      {...props}
      style={{
        ...style,
        ...(color ? { background: `${color}15`, borderColor: `${color}30`, color } : {}),
        ...props.style,
      }}
      closeIcon={closable ? undefined : undefined}
      {...(closable ? { closable, onClose } : {})}
    >
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
      {label}
    </Tag>
  );
}

/**
 * ProviderBadge - Badge with provider color
 */
export function ProviderBadge({
  provider,
  label,
  size = 'medium',
  ...rest
}: {
  provider: string;
  label?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closable?: boolean;
  onClose?: (e: React.MouseEvent) => void;
}) {
  const providerColors: Record<string, string> = {
    openai: '#10a37f',
    anthropic: '#d97706',
    zai: '#8b5cf6',
    google: '#4285f4',
    dashscope: '#8b5cf6',
    minimax: '#8b5cf6',
    replicate: '#8b5cf6',
    jimeng: '#ec4899',
    seedream: '#8b5cf6',
    azure: '#8b5cf6',
    openrouter: '#8b5cf6',
  };

  const color = providerColors[provider] || '#71717a';
  const badgeLabel = label || provider;

  return <TagBadge label={badgeLabel} color={color} size={size} {...(rest as any)} />;
}

/**
 * StatusBadge - Status indicator with semantic colors
 */
export function StatusBadge({
  status,
  labels = {
    success: '成功',
    failed: '失败',
    pending: '进行中',
    running: '运行中',
  },
}: {
  status: 'success' | 'failed' | 'pending' | 'running';
  labels?: Record<string, string>;
}) {
  const statusConfig = {
    success: { color: '#22c55e', label: labels.success },
    failed: { color: '#ef4444', label: labels.failed },
    pending: { color: '#eab308', label: labels.pending },
    running: { color: '#8b5cf6', label: labels.running },
  };

  const config = statusConfig[status];

  return (
    <TagBadge
      label={config.label}
      color={config.color}
      icon={
        status === 'success' ? (
          <span style={{ fontSize: 10 }}>✓</span>
        ) : status === 'failed' ? (
          <span style={{ fontSize: 10 }}>✗</span>
        ) : status === 'running' ? (
          <span style={{ fontSize: 10, animation: 'spin 1s linear infinite' }}>⟳</span>
        ) : undefined
      }
    />
  );
}
