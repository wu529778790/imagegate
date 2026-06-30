/**
 * GalleryPage — User's saved images gallery.
 *
 * Phase 3 refactoring:
 * - Uses SWR hooks for images and sync status (no raw fetch)
 * - Auth check via AuthContext (client-side)
 * - apiClient for sync mutations
 * - No silent catch blocks
 */

'use client';

import { useState } from "react";
import { Typography, Empty, Tag, Pagination, Button, message, Space, Tooltip } from "antd";
import { PictureOutlined, CloudSyncOutlined, GithubOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useAuthModal } from "@/components/AuthContext";
import { HeaderSection, EmptyState, EmptyStates, ProviderBadge } from "@/components/ui";
import { useImages } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import type { ImageItem, SyncStatus } from "@/types";

// Lazy-load heavy components ( reduce initial bundle )
const ImageGrid = dynamic(() => import("@/components/ui/ImageGrid").then((m) => ({ default: m.ImageGrid })), { ssr: false });
const LoadingGrid = dynamic(() => import("@/components/ui/LoadingCard").then((m) => ({ default: m.LoadingGrid })), { ssr: false });

const { Text } = Typography;

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const authModal = useAuthModal();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);

  // SWR for images data
  const { data: imagesData, isLoading: loading, mutate: refreshImages } = useImages(page);
  const images: ImageItem[] = imagesData?.images ?? [];
  const pagination = imagesData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  const user = session?.user as { id?: string; username?: string; avatarUrl?: string } | undefined;

  // Fetch sync status ( one-time, not cached by SWR since it's rare )
  const fetchSyncStatus = async () => {
    try {
      const data = await apiClient.get<SyncStatus>("/api/sync");
      setSyncStatus(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(`同步状态查询失败: ${err.message}`);
      }
    }
  };

  const handleSyncImage = async (imageId: number) => {
    setSyncing(true);
    try {
      const result = await apiClient.post<{ success: boolean; error?: string }>("/api/sync", {
        action: "sync-image",
        imageId,
      });
      if (result.success) {
        message.success("已同步到 GitHub");
        refreshImages();
        fetchSyncStatus();
      } else {
        message.error(result.error || "同步失败");
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

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

  // Initial sync status fetch on auth
  if (status === "authenticated" && !syncStatus) {
    fetchSyncStatus();
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: "var(--text-muted)" }}>登录后查看您保存的图片</span>}
        >
          <Button
            type="primary"
            onClick={() => authModal.openAuthModal({ action: "查看图片库" })}
            style={{ borderRadius: 8 }}
          >
            立即登录
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px", maxWidth: 1400, margin: "0 auto" }}>
      <HeaderSection
        title="我的图片"
        icon={<PictureOutlined />}
        subtitle={user?.username ? `@${user.username}` : undefined}
        actions={
          syncStatus && (
            <Space>
              <Tooltip title={`${syncStatus.user.syncedImages} 已同步 / ${syncStatus.user.pendingImages} 待同步`}>
                <Tag icon={<GithubOutlined />} style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                  {syncStatus.user.syncedImages} / {syncStatus.user.totalImages}
                </Tag>
              </Tooltip>
              {syncStatus.user.pendingImages > 0 && (
                <Button icon={<CloudSyncOutlined />} onClick={handleRetryAll} loading={syncing} size="small" style={{ borderRadius: 8 }}>
                  同步全部
                </Button>
              )}
            </Space>
          )
        }
        marginBottom={24}
      />

      {loading ? (
        <LoadingGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} count={12} />
      ) : images.length === 0 ? (
        <EmptyState {...EmptyStates.noImages} />
      ) : (
        <>
          <ImageGrid
            items={images.map((img) => ({
              src: img.imageUrl!,
              alt: img.prompt,
              showDownload: true,
              onDownload: (e: React.MouseEvent) => {
                e.stopPropagation();
                const link = document.createElement("a");
                link.href = img.imageUrl!;
                link.download = `imagegate-${img.id}.png`;
                link.click();
              },
              showSync: true,
              isSynced: !!img.githubPath,
              onSync: img.githubPath ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); handleSyncImage(img.id); },
              metadata: (
                <>
                  <Text ellipsis={{ tooltip: img.prompt }} style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {img.prompt}
                  </Text>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <ProviderBadge provider={img.provider} size="small" />
                    {img.model && (
                      <Tag style={{ margin: 0, fontSize: 10, background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>{img.model}</Tag>
                    )}
                  </div>
                </>
              ),
            }))}
            emptyState={<EmptyState {...EmptyStates.noImages} />}
            cols={{ xs: 1, sm: 2, md: 3, lg: 4 }}
          />
          {pagination.totalPages > 1 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Pagination
                current={page}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
