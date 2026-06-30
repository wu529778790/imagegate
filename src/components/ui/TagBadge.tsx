/**
 * TagBadge - Consistent tag/badge styling.
 */

import React from "react";
import { Tag, TagProps } from "antd";
import { PROVIDER_COLORS, STATUS_CONFIG } from "@/types";
import type { RecordStatus } from "@/types";

export interface TagBadgeProps extends Omit<TagProps, "color"> {
  label: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
  size?: "small" | "medium" | "large";
  closable?: boolean;
  onClose?: (e: React.MouseEvent) => void;
}

const SIZE_STYLES = {
  small: { fontSize: 10, padding: "0 5px", height: 18, lineHeight: "18px" },
  medium: { fontSize: 12, padding: "0 8px", height: 22, lineHeight: "22px" },
  large: { fontSize: 14, padding: "0 10px", height: 26, lineHeight: "26px" },
} as const;

export function TagBadge({
  label,
  color,
  icon,
  size = "medium",
  closable = false,
  onClose,
  ...props
}: TagBadgeProps) {
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Tag
      {...props}
      style={{
        ...sizeStyle,
        ...(color ? { background: `${color}15`, borderColor: `${color}30`, color } : {}),
        ...props.style,
      }}
      closable={closable}
      {...(closable ? { onClose } : {})}
    >
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
      {label}
    </Tag>
  );
}

/** Provider badge with auto-mapped color from shared config. */
export function ProviderBadge({
  provider,
  label,
  size = "medium",
  ...rest
}: {
  provider: string;
  label?: React.ReactNode;
  size?: "small" | "medium" | "large";
  closable?: boolean;
  onClose?: (e: React.MouseEvent) => void;
}) {
  const color = PROVIDER_COLORS[provider] || "#71717a";
  return (
    <TagBadge
      label={label || PROVIDER_COLORS[provider] ? provider : provider}
      color={color}
      size={size}
      {...rest}
    />
  );
}

/** Status badge using shared STATUS_CONFIG. */
export function StatusBadge({
  status,
}: {
  status: RecordStatus;
}) {
  const config = STATUS_CONFIG[status];

  const icon =
    status === "success" ? (
      <span style={{ fontSize: 10 }}>✓</span>
    ) : status === "failed" ? (
      <span style={{ fontSize: 10 }}>✗</span>
    ) : status === "running" ? (
      <span style={{ fontSize: 10, animation: "spin 1s linear infinite" }}>⟳</span>
    ) : undefined;

  return <TagBadge label={config.label} color={config.color} icon={icon} />;
}
