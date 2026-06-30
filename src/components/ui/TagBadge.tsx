/**
 * TagBadge - Consistent tag/badge styling.
 */

import React from "react";
import { Tag, TagProps } from "antd";
import { PROVIDER_COLORS, STATUS_CONFIG } from "@/types";
import type { RecordStatus } from "@/types";
import styles from "./TagBadge.module.css";

export interface TagBadgeProps extends Omit<TagProps, "color"> {
  label: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
  size?: "small" | "medium" | "large";
  closable?: boolean;
  onClose?: (e: React.MouseEvent) => void;
}

export function TagBadge({
  label,
  color,
  icon,
  size = "medium",
  closable = false,
  onClose,
  ...props
}: TagBadgeProps) {
  const sizeClass =
    size === "small" ? styles.sizeSmall :
    size === "large" ? styles.sizeLarge :
    styles.sizeMedium;

  return (
    <Tag
      {...props}
      className={`${sizeClass} ${props.className || ""}`}
      style={{
        ...(color ? { background: `${color}15`, borderColor: `${color}30`, color } : {}),
        ...props.style,
      }}
      closable={closable}
      {...(closable ? { onClose } : {})}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
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
      <span className={styles.statusIcon}>✓</span>
    ) : status === "failed" ? (
      <span className={styles.statusIcon}>✗</span>
    ) : status === "running" ? (
      <span className={styles.statusIconSpin}>⟳</span>
    ) : undefined;

  return <TagBadge label={config.label} color={config.color} icon={icon} />;
}
