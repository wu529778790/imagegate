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
import { EmptyState, EmptyStates } from "@/components/ui/EmptyState";
import { ProviderBadge } from "@/components/ui/TagBadge";
import type { GenerateResult } from "./hooks/useGenerate";
import { AR_OPTIONS } from "./GenerateParams";

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
  const handleDownload = (base64: string, name?: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = name || `imagegate-${Date.now()}.png`;
    link.click();
  };

  if (!loading && !result) {
    return (
      <EmptyState
        {...EmptyStates.noRecords.props}
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

  return (
    <div className="result-container">
      {/* Loading state */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="result-loading">
          <div className="result-loading__skeleton" style={{ height: 380 }} />
          <p className="result-loading__text">正在生成中...</p>
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="result-actions">
              <Tooltip title="编辑 Prompt 重新生成">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => textareaRef?.current?.focus()}
                >
                  编辑
                </Button>
              </Tooltip>
              <Tooltip
                title={`换比例 (${AR_OPTIONS[(AR_OPTIONS.indexOf(ar) + 1) % AR_OPTIONS.length]})`}
              >
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ ar: AR_OPTIONS[(AR_OPTIONS.indexOf(ar) + 1) % AR_OPTIONS.length] })}
                >
                  换比例
                </Button>
              </Tooltip>
              <Tooltip
                title={`换 Provider (${provider === "openai" ? "Anthropic" : "OpenAI"})`}
              >
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ provider: provider === "openai" ? "anthropic" : "openai" })}
                >
                  换源
                </Button>
              </Tooltip>
              <Tooltip
                title={`换质量 (${quality === "2k" ? "标准" : "高清"})`}
              >
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onRegenerate({ quality: quality === "2k" ? "normal" : "2k" })}
                >
                  换质量
                </Button>
              </Tooltip>
            </div>

            <ImageCard
              src={`data:image/png;base64,${result.image}`}
              alt="生成结果"
              showDownload
              onDownload={() => handleDownload(result.image)}
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
                <div className="result-metadata">
                  <ProviderBadge provider={result.provider} />
                  <Tag className="result-tag">{result.model}</Tag>
                  <span className="result-duration">
                    <ClockCircleOutlined />
                    {(result.duration_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .result-container {
          min-height: 200px;
        }
        .result-loading {
          margin-bottom: 20px;
        }
        .result-loading__skeleton {
          border-radius: var(--radius-md);
        }
        .result-loading__text {
          text-align: center;
          margin-top: 10px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .result-actions {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .result-actions :global(.ant-btn) {
          border-radius: 7px !important;
        }

        .result-metadata {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 6px 10px;
        }
        .result-tag {
          margin: 0 !important;
          font-size: 10px !important;
          background: var(--bg-elevated) !important;
          border-color: var(--border-subtle) !important;
        }
        .result-duration {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
}
