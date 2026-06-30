"use client";

import { Segmented, Tooltip, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { PROVIDER_COLORS, PROVIDER_LABELS, AR_OPTIONS, QUALITY_OPTIONS } from "@/types";
import type { AspectRatio, Quality } from "@/types";
import styles from "./GenerateParams.module.css";

interface GenerateParamsProps {
  provider: string;
  onProviderChange: (v: string) => void;
  ar: AspectRatio;
  onArChange: (v: AspectRatio) => void;
  quality: Quality;
  onQualityChange: (v: Quality) => void;
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
    <div className={styles.params}>
      <Segmented
        size="small"
        value={provider}
        onChange={(v) => onProviderChange(v as string)}
        options={Object.entries(PROVIDER_LABELS).map(([value, label]) => ({
          value,
          label: (
            <span className={styles.providerOption}>
              <span
                className={styles.providerDot}
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
        onChange={(v) => onArChange(v as AspectRatio)}
        options={AR_OPTIONS.map((a) => a)}
      />
      <Segmented
        size="small"
        value={quality}
        onChange={(v) => onQualityChange(v as Quality)}
        options={QUALITY_OPTIONS}
      />
      <Tooltip title="自定义模型">
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          className={styles.paramBtn}
        />
      </Tooltip>
    </div>
  );
}
