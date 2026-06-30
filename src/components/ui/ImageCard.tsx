/**
 * ImageCard - Reusable image card with overlay actions
 * Supports both local and remote images with hover actions
 */

import React, { useState } from 'react';
import { Button, message, Tooltip } from 'antd';
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
      className={`${styles.card} ${previewable ? styles.cardPreviewable : ''} ${className || ''}`}
      style={{ borderRadius: borderRadiusValue, ...style }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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

        {/* Overlay Actions */}
        <div className={styles.overlay} style={{ opacity: isHovered ? 1 : 0 }}>
          {previewable && (
            <Tooltip title="预览">
              <Button
                type="primary"
                shape="circle"
                icon={<EyeOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Preview handler
                }}
              />
            </Tooltip>
          )}
          {showDownload && (
            <Tooltip title="下载">
              <Button
                type="primary"
                shape="circle"
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleDownload}
              />
            </Tooltip>
          )}
          {showSync && !isSynced && (
            <Tooltip title="同步到 GitHub">
              <Button
                shape="circle"
                icon={<SyncOutlined />}
                size="small"
                onClick={onSync}
              />
            </Tooltip>
          )}
          {showSync && isSynced && (
            <Tooltip title="已同步">
              <Button shape="circle" icon={<CheckCircleOutlined />} size="small" className={styles.syncedIcon} />
            </Tooltip>
          )}
          {showDelete && (
            <Tooltip title="删除">
              <Button
                shape="circle"
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={onDelete}
              />
            </Tooltip>
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
