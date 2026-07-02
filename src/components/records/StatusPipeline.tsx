"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons";
import styles from "./StatusPipeline.module.css";

export type PipelineStage = "prompt" | "provider" | "model" | "call" | "sync";

export type StageStatus = "pending" | "active" | "done" | "error";

interface StageConfig {
  id: PipelineStage;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  { id: "prompt", label: "提示词", description: "已解析" },
  { id: "provider", label: "提供方", description: "路由选择" },
  { id: "model", label: "模型", description: "已加载" },
  { id: "call", label: "生成", description: "调用 API" },
  { id: "sync", label: "同步", description: "完成" },
];

interface StatusPipelineProps {
  stage: PipelineStage;
  status: StageStatus;
  data?: Partial<Record<PipelineStage, string>>;
}

/**
 * 5-stage animated pipeline — shows progress through a generation record.
 * Pulses on the active stage, green checkmarks on completed, red X on error.
 * Inspired by ComfyUI's node-execution ripple.
 */
export function StatusPipeline({ stage: currentStage, status, data: stageData }: StatusPipelineProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className={styles.pipeline}>
      {STAGES.map((stage, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const isFuture = idx > currentIndex;
        const isError = status === "error" && isCurrent;

        let stageStatus: "done" | "active" | "error" | "pending" = "pending";
        if (isPast) stageStatus = "done";
        else if (isCurrent && !isFuture) stageStatus = isError ? "error" : status === "done" ? "done" : "active";

        const detail = stageData?.[stage.id];

        return (
          <React.Fragment key={stage.id}>
            <motion.div
              className={`${styles.stage} ${styles[`stage${stageStatus.charAt(0).toUpperCase() + stageStatus.slice(1)}`]}`}
              animate={stageStatus === "active" ? { scale: [1, 1.04, 1] } : {}}
              transition={stageStatus === "active" ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              <div className={styles.stageIcon}>
                {stageStatus === "done" && <CheckCircleFilled />}
                {stageStatus === "error" && <CloseCircleFilled />}
                {stageStatus === "active" && <LoadingOutlined spin />}
                {stageStatus === "pending" && <span className={styles.stageDot} />}
              </div>
              <div className={styles.stageText}>
                <span className={styles.stageLabel}>{stage.label}</span>
                {detail && <span className={styles.stageDetail}>{detail}</span>}
              </div>
            </motion.div>

            {idx < STAGES.length - 1 && (
              <div className={`${styles.connector} ${isPast ? styles.connectorDone : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Derives pipeline state from a GenerationRecord's status/status_code.
 */
export function pipelineFromRecord(record: {
  status: string;
  provider?: string;
  model?: string;
  duration_ms?: number | null;
}): { stage: PipelineStage; status: StageStatus; data: Partial<Record<PipelineStage, string>> } {
  const data: Partial<Record<PipelineStage, string>> = {
    provider: record.provider,
    model: record.model || undefined,
  };

  switch (record.status) {
    case "pending":
      return { stage: "prompt", status: "active", data };
    case "running":
      return { stage: "call", status: "active", data };
    case "success":
      data.call = record.duration_ms ? `${(record.duration_ms / 1000).toFixed(1)}s` : undefined;
      return { stage: "sync", status: "done", data };
    case "failed":
      return { stage: "call", status: "error", data };
    default:
      return { stage: "prompt", status: "pending", data };
  }
}
