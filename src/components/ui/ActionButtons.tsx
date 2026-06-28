/**
 * ActionButtons - Consistent button group styling
 */

import React from 'react';
import { Button, ButtonProps, Space } from 'antd';
import type { SpaceProps } from 'antd';

export interface ActionButtonsProps {
  /** Primary action button */
  primary?: {
    label: React.ReactNode;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
  };
  /** Secondary action buttons */
  secondary?: Array<{
    label: React.ReactNode;
    onClick: () => void;
    icon?: React.ReactNode;
    type?: ButtonProps['type'];
    disabled?: boolean;
  }>;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Alignment */
  align?: 'start' | 'center' | 'end';
  /** Gap between buttons */
  gap?: number | string;
  /** Whether to wrap on small screens */
  wrap?: boolean;
  /** Full width on mobile */
  fullWidthOnMobile?: boolean;
}

export function ActionButtons({
  primary,
  secondary = [],
  direction = 'horizontal',
  align = 'start',
  gap = 8,
  wrap = true,
  fullWidthOnMobile = true,
}: ActionButtonsProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center',
    gap,
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...(fullWidthOnMobile && direction === 'horizontal' ? { width: '100%' } : {}),
  };

  const buttonBaseStyle: React.CSSProperties = {
    borderRadius: 10,
    fontWeight: 600,
    height: 38,
    ...(fullWidthOnMobile && direction === 'horizontal'
      ? {
          flex: fullWidthOnMobile ? '1 1 auto' : undefined,
          minWidth: direction === 'horizontal' ? 100 : undefined,
        }
      : {}),
  };

  return (
    <div style={containerStyle}>
      {primary && (
        <Button
          type="primary"
          onClick={primary.onClick}
          loading={primary.loading}
          disabled={primary.disabled}
          icon={primary.icon}
          style={buttonBaseStyle}
        >
          {primary.label}
        </Button>
      )}
      {secondary.map((btn, index) => (
        <Button
          key={index}
          type={btn.type || 'default'}
          onClick={btn.onClick}
          disabled={btn.disabled}
          icon={btn.icon}
          style={buttonBaseStyle}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * IconButton - Small icon-only button with tooltip
 */
export function IconButton({
  icon,
  tooltip,
  onClick,
  danger,
  ...props
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  danger?: boolean;
} & Omit<ButtonProps, 'icon' | 'onClick'>) {
  return (
    <Button
      type="text"
      icon={icon}
      onClick={onClick}
      danger={danger}
      {...props}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...props.style,
      }}
    />
  );
}
