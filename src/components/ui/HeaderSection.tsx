/**
 * HeaderSection - Consistent page header with title and optional actions
 */

import React from 'react';
import { Space } from 'antd';
import type { SpaceProps } from 'antd';
import styles from './HeaderSection.module.css';

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
    <div className={styles.header} style={{ marginBottom }}>
      <div
        className={`${styles.headerInner} ${center ? styles.headerInnerCenter : ''}`}
      >
        <div
          className={`${styles.titleWrap} ${center ? styles.titleWrapCenter : ''}`}
        >
          {icon && (
            <span className={styles.icon}>{icon}</span>
          )}
          <div>
            <h1 className={styles.title}>
              {title}
            </h1>
            {subtitle && (
              <p className={styles.subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <Space>{actions}</Space>}
      </div>
      {children && <div className={styles.children}>{children}</div>}
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
  const titleClass =
    level === 1 ? styles.sectionTitleH1 :
    level === 2 ? styles.sectionTitleH2 :
    level === 3 ? styles.sectionTitleH3 :
    styles.sectionTitleH4;

  return (
    <div className={styles.sectionTitleWrap} style={{ marginBottom }}>
      <Tag
        className={`${styles.sectionTitle} ${titleClass}`}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className={styles.sectionSubtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
