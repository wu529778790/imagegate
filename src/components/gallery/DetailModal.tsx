"use client";

import React, { useMemo } from "react";
import {
  Modal,
  Typography,
  Button,
  Space,
  Image,
  App,
  Descriptions,
} from "antd";
import {
  DownloadOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useGalleryStore } from "@/stores/gallery-store";
import { useFilteredImages } from "@/lib/api/hooks";
import { useDeleteImage } from "@/lib/api/mutations";
import { apiClient } from "@/lib/api/client";
import { formatMs, formatDateTime } from "@/lib/format";
import { StatusBadge, ProviderBadge } from "@/components/ui";
import styles from "./DetailModal.module.css";

const { Text, Title } = Typography;

export function DetailModal() {
  const { message } = App.useApp();
  const { detailOpen, detailImageId, closeDetail } = useGalleryStore();
  const { data, mutate } = useFilteredImages(
    detailOpen ? { page: 1, pageSize: 100 } : null,
  );

  const image = useMemo(() => {
    if (!data?.images || !detailImageId) return null;
    return data.images.find((img) => img.id === detailImageId) ?? null;
  }, [data?.images, detailImageId]);

  const deleteMutation = useDeleteImage();

  const handleDelete = async () => {
    if (!image) return;
    await deleteMutation.trigger(image.id);
    message.success("已删除");
    mutate();
    closeDetail();
  };

  const handleSync = async () => {
    if (!image || image.githubPath) return;
    try {
      const result = await apiClient.post<{ success: boolean; error?: string }>("/api/sync", {
        action: "sync-image",
        imageId: image.id,
      });
      if (result.success) {
        message.success("已同步到 GitHub");
        mutate();
      } else {
        message.error(result.error || "同步失败");
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "同步失败");
    }
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `imagegate-${image.id}.png`;
    link.click();
  };

  return (
    <Modal
      open={detailOpen}
      onCancel={closeDetail}
      footer={null}
      width={720}
      centered
      className={styles.modal}
      closeIcon={<EyeOutlined />}
    >
      {image && (
        <div className={styles.content}>
          <Image
            src={image.imageUrl}
            alt={image.prompt}
            className={styles.image}
            preview={false}
            fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4OCI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg=="
          />

          <div className={styles.info}>
            <div className={styles.header}>
              <StatusBadge status={image.generationStatus} />
              <ProviderBadge provider={image.provider} />
              <Text type="secondary" className={styles.time}>
                {formatDateTime(image.createdAt)}
              </Text>
            </div>

            <Title level={5} className={styles.promptTitle}>
              提示词
            </Title>
            <Text className={styles.prompt}>{image.prompt || "—"}</Text>

            <Descriptions size="small" column={2} className={styles.desc}>
              <Descriptions.Item label="模型">{image.model || "—"}</Descriptions.Item>
              <Descriptions.Item label="耗时">
                {image.generationDuration != null ? formatMs(image.generationDuration) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="ID">{image.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {image.githubPath ? "已同步 GitHub" : "本地"}
              </Descriptions.Item>
            </Descriptions>

            <Space className={styles.actions}>
              <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                下载
              </Button>
              {!image.githubPath && (
                <Button icon={<CloudSyncOutlined />} onClick={handleSync}>
                  同步到 GitHub
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Modal>
  );
}
