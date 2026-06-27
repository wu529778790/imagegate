"use client";

import { useState, useEffect } from "react";
import { Typography, Empty, Tag, Pagination, Button, message, Space, Tooltip, Popconfirm } from "antd";
import { PictureOutlined, CloudSyncOutlined, GithubOutlined, CheckCircleOutlined, SyncOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

const { Text } = Typography;

interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  provider: string;
  model: string;
  createdAt: string;
  generationId: number;
  generationStatus: string;
  generationDuration: number;
  githubPath?: string;
}

interface SyncStatus {
  user: {
    totalImages: number;
    syncedImages: number;
    pendingImages: number;
  };
  queue: {
    pending: number;
    processing: boolean;
  };
}

export default function GalleryPage() {
  const { data: session, status } = useSession();
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
      if (result.success) { message.success("已同步到 GitHub"); fetchImages(pagination.page); fetchSyncStatus(); }
      else { message.error(result.error || "同步失败"); }
    } catch { message.error("同步失败"); } finally { setSyncing(false); }
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
      if (result.success) { message.success("已加入同步队列"); fetchSyncStatus(); }
      else { message.error(result.error || "操作失败"); }
    } catch { message.error("操作失败"); } finally { setSyncing(false); }
  };

  useEffect(() => {
    if (status === "authenticated") {
      const timer = setTimeout(() => { fetchImages(); fetchSyncStatus(); }, 0);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="shimmer" style={{ width: 200, height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty description={<span style={{ color: "#71717a" }}>请先登录查看您的图片</span>} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <a href="/login" style={{ color: "#6366f1" }}>去登录</a>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PictureOutlined style={{ fontSize: 20, color: "#6366f1" }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e4e4e7" }}>我的图片</span>
          {user?.username && <span style={{ fontSize: 13, color: "#52525b" }}>@{user.username}</span>}
        </div>
        {syncStatus && (
          <Space>
            <Tooltip title={`${syncStatus.user.syncedImages} 已同步 / ${syncStatus.user.pendingImages} 待同步`}>
              <Tag icon={<GithubOutlined />} style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
                {syncStatus.user.syncedImages} / {syncStatus.user.totalImages}
              </Tag>
            </Tooltip>
            {syncStatus.user.pendingImages > 0 && (
              <Button icon={<CloudSyncOutlined />} onClick={handleRetryAll} loading={syncing} size="small" style={{ borderRadius: 8 }}>
                同步全部
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Images Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="shimmer" style={{ height: 300, borderRadius: 12 }} />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Empty description={<span style={{ color: "#71717a" }}>还没有生成过图片</span>} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="image-overlay"
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "#141420",
                  cursor: "pointer",
                }}
              >
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
                <div className="overlay-actions">
                  <Tooltip title="下载">
                    <Button type="primary" shape="circle" icon={<DownloadOutlined />} size="small" onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement("a");
                      link.href = img.imageUrl;
                      link.download = `imagegate-${img.id}.png`;
                      link.click();
                    }} />
                  </Tooltip>
                  {img.githubPath ? (
                    <Tooltip title="已同步"><Button shape="circle" icon={<CheckCircleOutlined />} size="small" style={{ color: "#22c55e" }} /></Tooltip>
                  ) : (
                    <Tooltip title="同步到 GitHub"><Button shape="circle" icon={<SyncOutlined />} size="small" onClick={(e) => { e.stopPropagation(); handleSyncImage(img.id); }} /></Tooltip>
                  )}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <Text ellipsis={{ tooltip: img.prompt }} style={{ fontSize: 13, color: "#a1a1aa", display: "block", marginBottom: 6 }}>
                    {img.prompt}
                  </Text>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Tag style={{ margin: 0, fontSize: 10, background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)", color: "#818cf8" }}>{img.provider}</Tag>
                    <Tag style={{ margin: 0, fontSize: 10, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>{img.model}</Tag>
                    {img.generationDuration && (
                      <span style={{ fontSize: 10, color: "#52525b", marginLeft: "auto" }}>{(img.generationDuration / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Pagination current={pagination.page} total={pagination.total} pageSize={pagination.pageSize} onChange={(p) => fetchImages(p)} showSizeChanger={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
