"use client";

import { motion } from "framer-motion";
import { Progress } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { ImageCard } from "@/components/ui/ImageCard";
import type { BatchItem } from "./hooks/useBatchGenerate";

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
    <div className="batch-results">
      {running && (
        <div className="batch-progress">
          <Progress
            percent={Math.round((done / total) * 100)}
            strokeColor="var(--accent-primary)"
            size="small"
          />
          <div className="batch-progress__text">
            {done}/{total} 完成
          </div>
        </div>
      )}
      <div className="batch-grid">
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
                <div className="batch-item-meta">
                  <div className="batch-item-prompt">{item.prompt}</div>
                  <div className="batch-item-status">
                    {item.status === "success" && (
                      <CheckCircleOutlined
                        style={{
                          color: "var(--color-success)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    {item.status === "error" && (
                      <span className="batch-error">{item.error}</span>
                    )}
                    {item.status === "success" && item.result && (
                      <span className="batch-time">
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

      <style jsx>{`
        .batch-results {
          margin-bottom: 20px;
        }
        .batch-progress {
          margin-bottom: 12px;
        }
        .batch-progress__text {
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .batch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        .batch-item-meta {
          padding: 4px 0;
        }
        .batch-item-prompt {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          margin-bottom: 4px;
        }
        .batch-item-status {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .batch-error {
          font-size: 10px;
          color: var(--color-error);
        }
        .batch-time {
          font-size: 10px;
          color: var(--text-muted);
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
