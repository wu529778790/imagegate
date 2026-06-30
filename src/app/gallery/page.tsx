"use client";

import { useState, useEffect } from "react";
import { Typography, Empty, Tag, Pagination, Button, message, Space, Tooltip } from "antd";
import { PictureOutlined, CloudSyncOutlined, GithubOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { ImageGrid, EmptyState, LoadingGrid, EmptyStates, HeaderSection, ProviderBadge } from "@/components/ui";
import { useAuthModal } from "@/components/AuthContext";
import type { ImageItem, SyncStatus } from "@/types";

const { Text } = Typography;

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const authModal = useAuthModal();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  const user = session?.user as { id?: string; username?: string; avatarUrl?: string } | undefined;

  const fetchImages = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/images?page=${page}&pageSize=20`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images);
        setPagination(data.pagination);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) setSyncStatus(await res.json());
    } catch { /* ignore */ }
  };

  const handleSyncImage = async (imageId: number) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-image", imageId }),
      });
      const result = await res.json();
      if (result.success) {
        message.success("已同步到 GitHub");
        fetchImages(pagination.page);
        fetchSyncStatus();
      } else {
        message.error(result.error || "同步失败");
      }
    } catch {
      message.error("同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-all" }),
      });
      const result = await res.json();
      if (result.success) {
        message.success("已加入同步队列");
        fetchSyncStatus();
      } else {
        message.error(result.error || "操作失败");
      }
    } catch {
      message.error("操作失败");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchImages();
      fetchSyncStatus();
    }
  }, [status]);

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
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={fetchImages}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
