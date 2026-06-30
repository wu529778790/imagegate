/**
 * PageLayout — 统一页面布局容器
 *
 * 提供一致的页面 padding、max-width 和响应式行为。
 * 替代所有页面中重复的 `style={{ padding: "20px", maxWidth: 1400, margin: "0 auto" }}` 模式。
 */

import React from "react";
import styles from "./PageLayout.module.css";

export interface PageLayoutProps {
  children: React.ReactNode;
  /** 变体：标准(1400px)、窄(960px)、流体(100%) */
  variant?: "default" | "narrow" | "fluid";
  /** 额外 className */
  className?: string;
  /** 额外 style */
  style?: React.CSSProperties;
}

export function PageLayout({
  children,
  variant = "default",
  className,
  style,
}: PageLayoutProps) {
  const variantClass =
    variant === "narrow" ? styles.pageNarrow :
    variant === "fluid" ? styles.pageFluid :
    "";

  return (
    <div
      className={`${styles.page} ${variantClass} ${className || ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
