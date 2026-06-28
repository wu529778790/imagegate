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

export function ImageCard({
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

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'var(--bg-surface, #1e1e2e)',
    cursor: previewable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...style,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.2s ease',
  };

  const imageStyle: React.CSSProperties = {
    width,
    height,
    objectFit: fit,
    display: 'block',
    transition: 'opacity 0.2s ease',
    opacity: imageLoaded ? 1 : 0,
  };

  return (
    <div
      className={className}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%' }}>
        {!imageLoaded && src && (
          <div
            className="shimmer"
            style={{
              width: '100%',
              aspectRatio: aspectRatio || '16/9',
              position: 'absolute',
              inset: 0,
            }}
          />
        )}
        {src ? (
          <img
            src={src}
            alt={alt}
            style={imageStyle}
            onLoad={() => setImageLoaded(true)}
            loading={lazy ? 'lazy' : 'eager'}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: aspectRatio || '16/9',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        )}

        {/* Overlay Actions */}
        <div style={overlayStyle}>
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
              <Button shape="circle" icon={<CheckCircleOutlined />} size="small" style={{ color: '#22c55e' }} />
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
        <div style={{ padding: '10px 12px' }}>{metadata}</div>
      )}
    </div>
  );
}

/**
 * CompactImageCard - Smaller variant for dense layouts
 */
export function CompactImageCard(props: Omit<ImageCardProps, 'borderRadius' | 'showSync' | 'showDelete'>) {
  return <ImageCard {...props} borderRadius={8} showSync={false} showDelete={false} />;
}
