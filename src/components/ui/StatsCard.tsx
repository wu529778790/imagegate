/**
 * StatsCard - Metric display card for dashboards
 */

import React from 'react';
import type { CardProps } from 'antd';
import { Card } from 'antd';

export interface StatsCardProps extends Omit<CardProps, 'children'> {
  /** Card title */
  title: React.ReactNode;
  /** Main metric value */
  value: React.ReactNode;
  /** Optional subtext/description */
  subtext?: React.ReactNode;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Color theme */
  color?: string;
  /** Trend indicator */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Whether value is loading */
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtext,
  icon,
  color = 'var(--accent)',
  trend,
  loading = false,
  ...cardProps
}: StatsCardProps) {
  return (
    <Card
      variant="borderless"
      size="small"
      {...cardProps}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        ...cardProps.style,
      }}
      styles={{
        body: {
          padding: 16,
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {title}
          </span>
          {icon && (
            <span style={{ fontSize: 16, color, opacity: 0.8 }}>{icon}</span>
          )}
        </div>

        {/* Value */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {loading ? (
            <span
              className="shimmer"
              style={{ display: 'inline-block', width: 80, height: 32, borderRadius: 4 }}
            />
          ) : (
            value
          )}
        </div>

        {/* Subtext / Trend */}
        {(subtext || trend) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {subtext && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtext}</span>
            )}
            {trend && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: trend.isPositive ? '#22c55e' : '#ef4444',
                }}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * StatsGrid - Grid of stats cards
 */
export function StatsGrid({
  stats,
  cols = { xs: 1, sm: 2, md: 2, lg: 4 },
  gap = 16,
}: {
  stats: StatsCardProps[];
  cols?: { xs: number; sm: number; md: number; lg: number };
  gap?: number;
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
        gap,
        marginBottom: 24,
      }}
    >
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}
