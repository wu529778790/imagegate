"use client";

import React, { useState } from "react";
import {
  DownloadOutlined,
  SyncOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { App } from "antd";
import { ImageCard, StatusBadge, ProviderBadge } from "@/components/ui";
import { formatMs, timeAgo } from "@/lib/format";
import { useDeleteImage } from "@/lib/api/mutations";
import { apiClient } from "@/lib/api/client";
import { useFavoriteMutation } from "@/lib/api/hooks";
import { useGalleryStore } from "@/stores/gallery-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useLightbox } from "@/hooks/use-lightbox";
import type { ImageItem } from "@/types/images";
import styles from "./GalleryCard.module.css";

interface GalleryCardProps {
  image: ImageItem;
  onDeleted?: (id: number) => void;
  /** All images in the current list — used to drive the lightbox. */
  siblingUrls?: string[];
  /** Index of this image within `siblingUrls`. */
  index?: number;
}

export function GalleryCard({ image, onDeleted, siblingUrls, index }: GalleryCardProps) {
  const { message } = App.useApp();
  const openDetail = useGalleryStore((s) => s.openDetail);
  const openLightbox = useLightbox((s) => s.open);
  const [syncing, setSyncing] = useState(false);

  // Favorites state
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const activeCollection = useFavoritesStore((s) => s.activeCollection);
  const addFavoriteId = useFavoritesStore((s) => s.addFavoriteId);
  const removeFavoriteId = useFavoritesStore((s) => s.removeFavoriteId);
  const isFav = favoriteIds.has(image.generationId);

  const deleteMutation = useDeleteImage();
  const favMutation = useFavoriteMutation(image.generationId);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `imagegate-${image.id}.png`;
    link.click();
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (image.githubPath || syncing) return;
    setSyncing(true);
    try {
      const result = await apiClient.post<{ success: boolean; error?: string }>("/api/sync", {
        action: "sync-image",
        imageId: image.id,
      });
      if (result.success) {
        message.success("已同步到 GitHub");
      } else {
        message.error(result.error || "同步失败");
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMutation.trigger(image.id);
    onDeleted?.(image.id);
  };

  return (
    <ImageCard
      src={image.imageUrl}
      alt={image.prompt}
      showDownload={true}
      onDownload={handleDownload}
      showSync={!image.githubPath}
      isSynced={!!image.githubPath}
      onSync={handleSync}
      previewable
      onClick={() => {
        if (siblingUrls && index !== undefined) {
          openLightbox(siblingUrls, index);
          return;
        }
        openDetail(image.id);
      }}
      statusBadge={<StatusBadge status={image.generationStatus} />}
      metadata={
        <div className={styles.metadata}>
          <div className={styles.promptRow} title={image.prompt}>
            {image.prompt?.substring(0, 60) || "无提示词"}
            {image.prompt && image.prompt.length > 60 && "…"}
          </div>
          <div className={styles.metaRow}>
            <ProviderBadge provider={image.provider} size="small" />
            <span className={styles.duration}>
              {image.generationDuration != null ? formatMs(image.generationDuration) : "—"}
            </span>
            <button
              className={`${styles.favBtn} ${isFav ? styles.favBtnActive : ""}`}
              onClick={async (e) => {
                e.stopPropagation();
                const action = isFav ? "remove" : "add";
                try {
                  await favMutation.trigger({ collection: activeCollection ?? "默认", action });
                  if (action === "add") addFavoriteId(image.generationId);
                  else removeFavoriteId(image.generationId);
                } catch {
                  message.error("操作失败");
                }
              }}
              aria-label={isFav ? "取消收藏" : "收藏"}
            >
              {isFav ? <StarFilled /> : <StarOutlined />}
            </button>
            <span className={styles.timeAgo}>{timeAgo(image.createdAt)}</span>
          </div>
        </div>
      }
    />
  );
}
