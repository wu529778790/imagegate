/**
 * HeaderSection - Consistent page header with title and optional actions
 */

import React from 'react';
import { Space } from 'antd';
import type { SpaceProps } from 'antd';

export interface HeaderSectionProps {
  /** Page title */
  title: React.ReactNode;
  /** Optional subtitle/description */
  subtitle?: React.ReactNode;
  /** Icon to show before title */
  icon?: React.ReactNode;
  /** Action buttons/elements on the right */
  actions?: React.ReactNode;
  /** Additional content below header */
  children?: React.ReactNode;
  /** Margin bottom */
  marginBottom?: number;
  /** Whether to center title */
  center?: boolean;
}

export function HeaderSection({
  title,
  subtitle,
  icon,
  actions,
  children,
  marginBottom = 24,
  center = false,
}: HeaderSectionProps) {
  return (
    <div style={{ marginBottom }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: center ? 'center' : 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            ...(center ? { justifyContent: 'center', width: '100%' } : {}),
          }}
        >
          {icon && (
            <span style={{ fontSize: 20, color: 'var(--accent, #6366f1)' }}>{icon}</span>
          )}
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary, #e4e4e7)',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #71717a)',
                  margin: '4px 0 0',
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <Space>{actions}</Space>}
      </div>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}

/**
 * SectionTitle - Simple section title with optional spacing
 */
export function SectionTitle({
  title,
  subtitle,
  level = 2,
  marginBottom = 16,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  marginBottom?: number;
}) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <div style={{ marginBottom }}>
      <Tag
        style={{
          fontSize: level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16,
          fontWeight: 700,
          color: 'var(--text-primary, #e4e4e7)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        {title}
      </Tag>
      {subtitle && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary, #71717a)',
            margin: '4px 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
