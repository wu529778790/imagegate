"use client";

import { useRef, type KeyboardEvent } from "react";
import { Button } from "antd";
import { ThunderboltOutlined, StopOutlined } from "@ant-design/icons";

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
    <div className="gradient-border prompt-input">
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
        className="prompt-input__textarea"
      />
      <div className="prompt-input__footer">
        <span className="prompt-input__count">
          {batchMode
            ? batchRunning
              ? `生成中 ${batchDone}/${batchTotal}`
              : `${lineCount} 条`
            : value.length > 0
            ? `${value.length}`
            : ""}
        </span>
        <div className="prompt-input__actions">
          <span className="prompt-input__shortcut">⌘↵</span>
          {batchMode ? (
            batchRunning ? (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={onStopBatch}
                className="btn-generate btn-generate--danger"
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

      <style jsx>{`
        .prompt-input {
          margin-bottom: 12px;
        }
        .prompt-input__textarea {
          width: 100%;
          padding: 14px 16px;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.6;
          resize: none;
          font-family: inherit;
          border-radius: 16px;
        }
        .prompt-input__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 14px 10px;
        }
        .prompt-input__count {
          font-size: 11px;
          color: var(--text-muted);
        }
        .prompt-input__actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .prompt-input__shortcut {
          font-size: 11px;
          color: var(--text-muted);
          margin-right: 4px;
        }
        .btn-generate {
          border-radius: 8px !important;
          font-weight: 600 !important;
          height: 34px !important;
        }
      `}</style>
    </div>
  );
}
