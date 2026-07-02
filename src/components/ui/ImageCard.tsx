/**
 * ImageCard - Reusable image card with overlay actions
 * Supports both local and remote images with hover actions
 */

import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ImageProps } from 'antd';
import styles from './ImageCard.module.css';

export interface ImageCardProps {
  /** Image source (URL or base64) */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Image width (default: 100%) */
  width?: string | number;
  /** Image height (default: auto) */
  height?: string | number;
  /** Object fit style */
  fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  /** Show download button */
  showDownload?: boolean;
  /** Download handler */
  onDownload?: (e: React.MouseEvent) => void;
  /** Download filename */
  downloadName?: string;
  /** Show sync button (for GitHub sync) */
  showSync?: boolean;
  /** Whether image is synced */
  isSynced?: boolean;
  /** Sync handler */
  onSync?: (e: React.MouseEvent) => void;
  /** Show delete button */
  showDelete?: boolean;
  /** Delete handler */
  onDelete?: (e: React.MouseEvent) => void;
  /** Additional overlay actions */
  actions?: React.ReactNode;
  /** Additional metadata below image */
  metadata?: React.ReactNode;
  /** Whether to enable fullscreen preview */
  previewable?: boolean;
  /** Border radius */
  borderRadius?: number | string;
  /** Card aspect ratio */
  aspectRatio?: string;
  /** Additional className */
  className?: string;
  /** Additional inline style */
  style?: React.CSSProperties;
  /** Lazy load the image */
  lazy?: boolean;
  /** Tag to display */
  tags?: Array<{ label: string; color?: string }>;
  /** Duration text */
  duration?: string;
  /** Status badge rendered in the top-left corner */
  statusBadge?: React.ReactNode;
  /** Selected state — highlights the card border (drag-select) */
  selected?: boolean;
  /** Click handler for the entire card (e.g. open detail modal) */
  onClick?: () => void;
}

export const ImageCard = React.memo(function ImageCard({
  src,
  alt = 'Generated image',
  width = '100%',
  height = 'auto',
  fit = 'cover',
  showDownload = true,
  onDownload,
  downloadName,
  showSync = false,
  isSynced = false,
  onSync,
  showDelete = false,
  onDelete,
  actions,
  metadata,
  previewable = false,
  borderRadius = 12,
  aspectRatio,
  className,
  style,
  lazy = true,
  tags,
  duration,
  statusBadge,
  selected = false,
  onClick,
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    if (onDownload) {
      e.stopPropagation();
      onDownload(e);
    } else if (src) {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = src;
      link.download = downloadName || `image-${Date.now()}.png`;
      link.click();
    }
  };

  const borderRadiusValue = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  return (
    <div
      className={`${styles.card} ${previewable ? styles.cardPreviewable : ''} ${selected ? styles.cardSelected : ''} ${onClick ? styles.cardClickable : ''} ${className || ''}`}
      style={{ borderRadius: borderRadiusValue, ...style }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {statusBadge && <div className={styles.statusBadge}>{statusBadge}</div>}
      {/* Image */}
      <div className={styles.imageWrap}>
        {!imageLoaded && src && (
          <div
            className={`shimmer ${styles.shimmerPlaceholder}`}
            style={{ aspectRatio: aspectRatio || '16/9' }}
          />
        )}
        {src ? (
          <img
            src={src}
            alt={alt}
            className={`${styles.image} ${imageLoaded ? styles.imageVisible : styles.imageHidden}`}
            style={{ width, height, objectFit: fit }}
            onLoad={() => setImageLoaded(true)}
            loading={lazy ? 'lazy' : 'eager'}
          />
        ) : (
          <div
            className={styles.emptyPlaceholder}
            style={{ aspectRatio: aspectRatio || '16/9' }}
          />
        )}

        {/* Overlay Actions — bottom-visible on hover */}
        <div className={styles.overlay}>
          {previewable && onClick && (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              查看
            </Button>
          )}
          {showDownload && (
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
          )}
          {showSync && !isSynced && onSync && (
            <Button size="small" icon={<SyncOutlined />} onClick={onSync}>
              同步
            </Button>
          )}
          {showSync && isSynced && (
            <Button size="small" icon={<CheckCircleOutlined />} className={styles.syncedIcon} disabled>
              已同步
            </Button>
          )}
          {showDelete && onDelete && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
              删除
            </Button>
          )}
          {actions}
        </div>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className={styles.metadata}>{metadata}</div>
      )}
    </div>
  );
});

/**
 * CompactImageCard - Smaller variant for dense layouts
 */
export const CompactImageCard = React.memo(function CompactImageCard(props: Omit<ImageCardProps, 'borderRadius' | 'showSync' | 'showDelete'>) {
  return <ImageCard {...props} borderRadius={8} showSync={false} showDelete={false} />;
});
