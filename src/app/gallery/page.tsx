"use client";

import { useState, useEffect } from "react";
import { Card, Row, Col, Image, Typography, Empty, Spin, Tag, Pagination, Button, message, Space, Tooltip } from "antd";
import { PictureOutlined, CloudSyncOutlined, GithubOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Text, Title } = Typography;

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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Access custom session properties
  const user = session?.user as {
    id?: string;
    username?: string;
    avatarUrl?: string;
    name?: string | null;
  } | undefined;

  const fetchImages = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/images?page=${page}&pageSize=20`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/sync");
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  };

  const handleSyncImage = async (imageId: number) => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-image", imageId }),
      });

      const result = await response.json();

      if (result.success) {
        message.success("图片已同步到 GitHub");
        // Refresh images and sync status
        fetchImages(pagination.page);
        fetchSyncStatus();
      } else {
        message.error(result.error || "同步失败");
      }
    } catch (error) {
      message.error("同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-all" }),
      });

      const result = await response.json();

      if (result.success) {
        message.success("已加入同步队列");
        fetchSyncStatus();
      } else {
        message.error(result.error || "操作失败");
      }
    } catch (error) {
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

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty
          description="请先登录查看您的图片"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <a href="/login">去登录</a>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PictureOutlined style={{ fontSize: 24, color: "#4f46e5" }} />
          <Title level={3} style={{ margin: 0 }}>
            我的图片
          </Title>
          <Text type="secondary">
            {user?.username ? `(${user.username})` : ""}
          </Text>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <Space>
            <Tooltip title={`${syncStatus.user.syncedImages} 已同步 / ${syncStatus.user.pendingImages} 待同步`}>
              <Tag icon={<GithubOutlined />} color="default">
                {syncStatus.user.syncedImages} / {syncStatus.user.totalImages}
              </Tag>
            </Tooltip>
            {syncStatus.user.pendingImages > 0 && (
              <Button
                icon={<CloudSyncOutlined />}
                onClick={handleRetryAll}
                loading={syncing}
                size="small"
              >
                同步全部
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Images Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : images.length === 0 ? (
        <Empty description="还没有生成过图片" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {images.map((img) => (
              <Col key={img.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  cover={
                    <Image
                      alt={img.prompt}
                      src={img.imageUrl}
                      style={{ height: 200, objectFit: "cover" }}
                      preview={{
                        mask: <div style={{ color: "#fff", fontSize: 14 }}>预览</div>,
                      }}
                    />
                  }
                  style={{ height: "100%" }}
                  actions={[
                    img.githubPath ? (
                      <Tooltip title="已同步到 GitHub">
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title="同步到 GitHub">
                        <SyncOutlined
                          onClick={() => handleSyncImage(img.id)}
                          spin={syncing}
                        />
                      </Tooltip>
                    ),
                  ]}
                >
                  <Card.Meta
                    title={
                      <Text ellipsis={{ tooltip: img.prompt }} style={{ fontSize: 14 }}>
                        {img.prompt}
                      </Text>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color="blue">{img.provider}</Tag>
                          <Tag color="green">{img.model}</Tag>
                          {img.githubPath && (
                            <Tag color="purple">已同步</Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(img.createdAt).toLocaleString("zh-CN")}
                        </Text>
                        {img.generationDuration && (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                            {(img.generationDuration / 1000).toFixed(1)}s
                          </Text>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Pagination
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={(page) => fetchImages(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
