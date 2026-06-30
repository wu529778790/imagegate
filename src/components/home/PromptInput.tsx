"use client";

import { useRef, type KeyboardEvent } from "react";
import { Button } from "antd";
import { ThunderboltOutlined, StopOutlined } from "@ant-design/icons";
import styles from "./PromptInput.module.css";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  batchMode?: boolean;
  batchRunning?: boolean;
  batchDone?: number;
  batchTotal?: number;
  onStopBatch?: () => void;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  batchMode = false,
  batchRunning = false,
  batchDone = 0,
  batchTotal = 0,
  onStopBatch,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const lineCount = value.split("\n").filter((l) => l.trim()).length;

  return (
    <div className={`gradient-border ${styles.promptInput}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          batchMode
            ? "输入多个 Prompt，每行一个：\n一只橘猫在窗台晒太阳\n赛博朋克风格的城市夜景"
            : "描述你想要生成的图片..."
        }
        rows={batchMode ? 5 : 3}
        maxLength={50000}
        className={styles.textarea}
      />
      <div className={styles.footer}>
        <span className={styles.count}>
          {batchMode
            ? batchRunning
              ? `生成中 ${batchDone}/${batchTotal}`
              : `${lineCount} 条`
            : value.length > 0
            ? `${value.length}`
            : ""}
        </span>
        <div className={styles.actions}>
          <span className={styles.shortcut}>⌘↵</span>
          {batchMode ? (
            batchRunning ? (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={onStopBatch}
                className={`${styles.generateBtn}`}
                size="small"
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={onSubmit}
                disabled={!value.trim()}
                className={value.trim() ? "pulse-glow" : ""}
                size="small"
              >
                批量生成
              </Button>
            )
          ) : (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={onSubmit}
              disabled={!value.trim()}
              className={value.trim() && !loading ? "pulse-glow" : ""}
              size="small"
            >
              生成
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
