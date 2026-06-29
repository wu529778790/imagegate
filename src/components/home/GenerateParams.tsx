"use client";

import { Segmented, Tooltip, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
};
const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};
const AR_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

interface GenerateParamsProps {
  provider: string;
  onProviderChange: (v: string) => void;
  ar: string;
  onArChange: (v: string) => void;
  quality: string;
  onQualityChange: (v: string) => void;
  model?: string;
}

export function GenerateParams({
  provider,
  onProviderChange,
  ar,
  onArChange,
  quality,
  onQualityChange,
}: GenerateParamsProps) {
  return (
    <div className="generate-params">
      <Segmented
        size="small"
        value={provider}
        onChange={(v) => onProviderChange(v as string)}
        options={Object.entries(PROVIDER_LABELS).map(([value, label]) => ({
          value,
          label: (
            <span className="provider-option">
              <span
                className="provider-dot"
                style={{ background: PROVIDER_COLORS[value] }}
              />
              {label}
            </span>
          ),
        }))}
      />
      <Segmented
        size="small"
        value={ar}
        onChange={(v) => onArChange(v as string)}
        options={AR_OPTIONS}
      />
      <Segmented
        size="small"
        value={quality}
        onChange={(v) => onQualityChange(v as string)}
        options={[
          { label: "标准", value: "normal" },
          { label: "高清", value: "2k" },
        ]}
      />
      <Tooltip title="自定义模型">
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          className="param-btn"
        />
      </Tooltip>

      <style jsx>{`
        .generate-params {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .provider-option {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }
        .provider-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: inline-block;
        }
        .param-btn {
          color: var(--text-muted) !important;
        }
      `}</style>
    </div>
  );
}

export { AR_OPTIONS, PROVIDER_COLORS, PROVIDER_LABELS };
