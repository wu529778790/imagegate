"use client";

import { useState, useEffect } from "react";
import { Card, Row, Col, Image, Typography, Empty, Spin, Tag, Pagination } from "antd";
import { PictureOutlined } from "@ant-design/icons";
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
}

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

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

  useEffect(() => {
    if (status === "authenticated") {
      fetchImages();
    }
  }, [status]);

  // Access custom session properties
  const user = session?.user as {
    id?: string;
    username?: string;
    avatarUrl?: string;
    name?: string | null;
  } | undefined;

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
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <PictureOutlined style={{ fontSize: 24, color: "#4f46e5" }} />
        <Title level={3} style={{ margin: 0 }}>
          我的图片
        </Title>
        <Text type="secondary">
          {user?.username ? `(${user.username})` : ""}
        </Text>
      </div>

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
