"use client";

import { motion } from "framer-motion";
import { Progress } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { ImageCard } from "@/components/ui/ImageCard";
import type { BatchItem } from "./hooks/useBatchGenerate";
import styles from "./BatchResults.module.css";

interface BatchResultsProps {
  items: BatchItem[];
  running: boolean;
  done: number;
  total: number;
  onDownload: (image: string, name: string) => void;
}

export function BatchResults({
  items,
  running,
  done,
  total,
  onDownload,
}: BatchResultsProps) {
  if (items.length === 0) return null;

  const handleDownload = (base64: string, idx: number) => {
    onDownload(base64, `batch-${idx + 1}.png`);
  };

  return (
    <div className={styles.results}>
      {running && (
        <div className={styles.progress}>
          <Progress
            percent={Math.round((done / total) * 100)}
            strokeColor="var(--accent-primary)"
            size="small"
          />
          <div className={styles.progressText}>
            {done}/{total} 完成
          </div>
        </div>
      )}
      <div className={styles.grid}>
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
          >
            <ImageCard
              src={
                item.status === "success" && item.result
                  ? `data:image/png;base64,${item.result.image}`
                  : undefined
              }
              alt={item.prompt}
              height={180}
              showDownload={item.status === "success"}
              onDownload={
                item.status === "success" && item.result
                  ? () => handleDownload(item.result!.image, idx)
                  : undefined
              }
              metadata={
                <div className={styles.itemMeta}>
                  <div className={styles.itemPrompt}>{item.prompt}</div>
                  <div className={styles.itemStatus}>
                    {item.status === "success" && (
                      <CheckCircleOutlined
                        style={{
                          color: "var(--color-success)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    {item.status === "error" && (
                      <span className={styles.error}>{item.error}</span>
                    )}
                    {item.status === "success" && item.result && (
                      <span className={styles.time}>
                        {(item.result.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              }
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
