"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button, Tooltip, Tag, message } from "antd";
import {
  EditOutlined,
  SwapOutlined,
  CopyOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { ImageCard } from "@/components/ui/ImageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProviderBadge } from "@/components/ui/TagBadge";
import { AR_OPTIONS, QUALITY_OPTIONS } from "@/types";
import type { AspectRatio } from "@/types";
import { downloadImage, formatDuration } from "@/lib/utils";
import type { GenerateResult } from "./hooks/useGenerate";
import styles from "./GenerateResult.module.css";

interface GenerateResultProps {
  result: GenerateResult | null;
  loading: boolean;
  prompt: string;
  provider: string;
  ar: string;
  quality: string;
  onRegenerate: (params?: Partial<{ prompt: string; provider: string; ar: string; quality: string }>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const PROVIDER_NAMES = ["openai", "anthropic"] as const;

export function GenerateResultView({
  result,
  loading,
  prompt,
  provider,
  ar,
  quality,
  onRegenerate,
  textareaRef,
}: GenerateResultProps) {
  if (!loading && !result) {
    return (
      <EmptyState
        description="输入描述或选择模板，开始创作"
        icon={
          <PictureOutlined
            style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}
          />
        }
        center={false}
        style={{ padding: "48px 0" }}
      />
    );
  }

  const nextAr = AR_OPTIONS[(AR_OPTIONS.indexOf(ar as typeof AR_OPTIONS[number]) + 1) % AR_OPTIONS.length];
  const nextProvider = PROVIDER_NAMES[(PROVIDER_NAMES.indexOf(provider as typeof PROVIDER_NAMES[number]) + 1) % PROVIDER_NAMES.length];
  const nextQuality = quality === "2k" ? "normal" : "2k";

  return (
    <div className={styles.container}>
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.loading}>
          <div className={`shimmer ${styles.loadingSkeleton}`} style={{ height: 380 }} />
          <p className={styles.loadingText}>正在生成中...</p>
        </motion.div>
      )}

      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className={styles.actions}>
              <Tooltip title="编辑 Prompt 重新生成">
                <Button size="small" icon={<EditOutlined />} onClick={() => textareaRef?.current?.focus()}>
                  编辑
                </Button>
              </Tooltip>
              <Tooltip title={`换比例 (${nextAr})`}>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ ar: nextAr })}
                >
                  换比例
                </Button>
              </Tooltip>
              <Tooltip title={`换源 (${nextProvider})`}>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ provider: nextProvider })}
                >
                  换源
                </Button>
              </Tooltip>
              <Tooltip title={`换质量 (${nextQuality === "2k" ? "高清" : "标准"})`}>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ quality: nextQuality })}
                >
                  换质量
                </Button>
              </Tooltip>
            </div>

            <ImageCard
              src={`data:image/png;base64,${result.image}`}
              alt="生成结果"
              showDownload
              onDownload={() => downloadImage(result.image)}
              actions={
                <>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      message.success("已复制 Prompt");
                    }}
                  >
                    复制 Prompt
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={() => onRegenerate()}>
                    重新生成
                  </Button>
                </>
              }
              metadata={
                <div className={styles.metadata}>
                  <ProviderBadge provider={result.provider} />
                  <Tag className={styles.tag}>{result.model}</Tag>
                  <span className={styles.duration}>
                    <ClockCircleOutlined /> {formatDuration(result.duration_ms)}
                  </span>
                </div>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
