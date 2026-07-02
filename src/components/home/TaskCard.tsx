"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Image, Tooltip, App } from "antd";
import { DownloadOutlined, RetweetOutlined } from "@ant-design/icons";
import { useGenerateStore } from "@/stores/generate-store";
import styles from "./TaskCard.module.css";
import type { ResultItem } from "@/stores/generate-store";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

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

  const addReferences = useGenerateStore((s) => s.addReferences);

  const handleAddRef = () => {
    addReferences([{ id: `ref-from-result-${Date.now()}`, name: "result.png", dataUrl: img.dataUrl }]);
    message.success("已加入参考图");
  };

  return (
    <motion.div className={styles.card} {...fadeUp} layout>
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
    </motion.div>
  );
}

export function PendingCard() {
  return (
    <motion.div className={styles.pending} {...fadeUp} layout>
      <div className={styles.pendingInner}>
        <div className={styles.spinner} />
        <span>生成中</span>
      </div>
    </motion.div>
  );
}

export function FailedCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div className={styles.failed} {...fadeUp} layout>
      <div className={styles.failedInner}>
        <div className={styles.failedTitle}>生成失败</div>
        <div className={styles.failedError}>{error}</div>
      </div>
      <div className={styles.failedRetry}>
        <Button size="small" danger onClick={onRetry}>
          重试
        </Button>
      </div>
    </motion.div>
  );
}
