"use client";

import React, { useMemo } from "react";
import { Pagination, Button, Space } from "antd";
import { GithubOutlined, CloudSyncOutlined, PictureOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { App } from "antd";
import { useAuthModal } from "@/components/AuthContext";
import {
  HeaderSection,
  EmptyState,
  EmptyStates,
  FilterBar,
  SearchInput,
  ImageGrid,
} from "@/components/ui";
import { PageLayout } from "@/components/layout/PageLayout";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { DetailModal } from "@/components/gallery/DetailModal";
import { useFilteredImages } from "@/lib/api/hooks";
import { useGalleryStore } from "@/stores/gallery-store";
import { GALLERY_STATUS_OPTIONS } from "@/types/images";
import { apiClient } from "@/lib/api/client";
import type { SyncStatus } from "@/types";
import styles from "./Gallery.module.css";

export default function GalleryPage() {
  const { message } = App.useApp();
  const { data: session, status } = useSession();
  const authModal = useAuthModal();

  const { statusFilter, search, page, setSearch, setPage, setStatusFilter } = useGalleryStore();

  const { data, isLoading, mutate } = useFilteredImages(
    status === "authenticated"
      ? { status: statusFilter, search, page, pageSize: 20 }
      : null,
  );

  const images = data?.images ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  const [syncStatus, setSyncStatus] = React.useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  const fetchSyncStatus = async () => {
    try {
      const data = await apiClient.get<SyncStatus>("/api/sync");
      setSyncStatus(data);
    } catch {
      // Silent: sync status is supplementary info, not critical.
    }
  };

  React.useEffect(() => {
    if (status === "authenticated") {
      fetchSyncStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      const result = await apiClient.post<{ success: boolean; error?: string }>("/api/sync", {
        action: "retry-all",
      });
      if (result.success) {
        message.success("已加入同步队列");
        fetchSyncStatus();
      } else {
        message.error(result.error || "操作失败");
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSyncing(false);
    }
  };

  const items = useMemo(
    () =>
      images.map((img) => ({
        key: String(img.id),
        src: img.imageUrl,
        alt: img.prompt,
      })),
    [images],
  );

  const siblingUrls = useMemo(() => images.map((img) => img.imageUrl), [images]);

  if (status === "unauthenticated") {
    return (
      <PageLayout>
        <div className={styles.loginPrompt}>
          <EmptyState
            {...EmptyStates.loginRequired}
            action={<Button type="primary" onClick={() => authModal.requireAuth({ action: "gallery" })}>立即登录</Button>}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <HeaderSection
        title="相册"
        icon={<PictureOutlined />}
        subtitle={syncStatus ? `共 ${syncStatus.user.totalImages} 张` : undefined}
        actions={
          syncStatus && (
            <Space>
              <GithubOutlined style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {syncStatus.user.syncedImages} / {syncStatus.user.totalImages} 已同步
              </span>
              {syncStatus.user.pendingImages > 0 && (
                <Button
                  icon={<CloudSyncOutlined />}
                  onClick={handleRetryAll}
                  loading={syncing}
                  size="small">
                  同步全部
                </Button>
              )}
            </Space>
          )
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.toolbarFilters}>
          <FilterBar
            options={GALLERY_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="按状态筛选"
          />
        </div>
        <div className={styles.toolbarSearch}>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="搜索提示词…"
          />
        </div>
      </div>

      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : images.length === 0 ? (
        <EmptyState {...EmptyStates.noImages} />
      ) : (
        <>
          <ImageGrid
            items={items.map((it) => {
              const img = images.find((i) => String(i.id) === it.key)!;
              return {
                key: it.key,
                src: it.src,
                alt: it.alt,
              };
            })}
            renderItem={(_, index) => (
              <GalleryCard
                image={images[index]}
                onDeleted={() => mutate()}
                siblingUrls={siblingUrls}
                index={index}
              />
            )}
            emptyState={<EmptyState {...EmptyStates.noImages} />}
          />

          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <Pagination
                current={page}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      <DetailModal />
    </PageLayout>
  );
}
