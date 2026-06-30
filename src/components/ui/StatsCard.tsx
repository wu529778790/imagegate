/**
 * StatsCard - Metric display card for dashboards
 */

import React from 'react';
import type { CardProps } from 'antd';
import { Card } from 'antd';
import styles from './StatsCard.module.css';

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
      className={`${styles.card} ${cardProps.className || ''}`}
      styles={{
        body: {
          padding: 16,
        },
      }}
    >
      <div className={styles.content}>
        {/* Title row */}
        <div className={styles.titleRow}>
          <span className={styles.title}>
            {title}
          </span>
          {icon && (
            <span className={styles.icon} style={{ color }}>{icon}</span>
          )}
        </div>

        {/* Value */}
        <div className={styles.value}>
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
          <div className={styles.footer}>
            {subtext && (
              <span className={styles.subtext}>{subtext}</span>
            )}
            {trend && (
              <span
                className={`${styles.trend} ${trend.isPositive ? styles.trendPositive : styles.trendNegative}`}
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
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${getCols()}, 1fr)`,
        gap,
      }}
    >
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}
