"use client";

import React from "react";
import { Button, Image, Tooltip, App } from "antd";
import { DownloadOutlined, RetweetOutlined } from "@ant-design/icons";
import styles from "./TaskCard.module.css";
import type { ResultItem } from "@/stores/generate-store";

interface TaskCardProps {
  result: ResultItem;
  index: number;
}

export function TaskCard({ result, index }: TaskCardProps) {
  const { message } = App.useApp();

  if (result.status === "pending") return <PendingCard />;
  if (result.status === "failed") return <FailedCard error={result.error || "生成失败"} onRetry={() => {}} />;

  // success
  const img = result.image!;
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = img.dataUrl;
    link.download = `image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddRef = () => {
    // Note: This requires access to the store. Parent passes the data URL back.
    // For now — bubble through window event so the parent can wire it in.
    window.dispatchEvent(new CustomEvent("imagegate:addRef", { detail: img.dataUrl }));
    message.success("已加入参考图");
  };

  return (
    <div className={styles.card}>
      <Image
        src={img.dataUrl}
        alt={`生成结果 ${index + 1}`}
        className={styles.img}
        preview={{ mask: null }}
      />
      <div className={styles.info}>
        <div className={styles.meta}>
          <span>{img.width}×{img.height}</span>
          <span>{img.durationMs >= 1000 ? `${(img.durationMs / 1000).toFixed(1)}s` : `${Math.round(img.durationMs)}ms`}</span>
        </div>
        <div className={styles.actions}>
          <Tooltip title="下载">
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
          </Tooltip>
          <Tooltip title="加入参考图">
            <Button size="small" icon={<RetweetOutlined />} onClick={handleAddRef}>
              参考
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function PendingCard() {
  return (
    <div className={styles.pending}>
      <div className={styles.pendingInner}>
        <div className={styles.spinner} />
        <span>生成中</span>
      </div>
    </div>
  );
}

export function FailedCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className={styles.failed}>
      <div className={styles.failedInner}>
        <div className={styles.failedTitle}>生成失败</div>
        <div className={styles.failedError}>{error}</div>
      </div>
      <div className={styles.failedRetry}>
        <Button size="small" danger onClick={onRetry}>
          重试
        </Button>
      </div>
    </div>
  );
}
