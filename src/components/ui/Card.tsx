import React from "react";
import styles from "./Card.module.css";

export type CardVariant = "default" | "glass" | "outlined" | "elevated";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 卡片变体 */
  variant?: CardVariant;
  /** 内边距 */
  padding?: CardPadding;
  /** 是否可悬浮 */
  hoverable?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * 统一的卡片组件
 * 提供多种变体和内边距选项
 *
 * @example
 * <Card variant="glass" padding="md" hoverable>
 *   <YourContent />
 * </Card>
 */
export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  hoverable = false,
  selected = false,
  children,
  className = "",
  ...props
}) => {
  const classNames = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    hoverable ? styles.hoverable : "",
    selected ? styles.selected : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};

/**
 * Card.Header - 卡片头部
 */
export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`${styles.header} ${className}`}>{children}</div>;

/**
 * Card.Body - 卡片内容区
 */
export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`${styles.body} ${className}`}>{children}</div>;

/**
 * Card.Footer - 卡片底部
 */
export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`${styles.footer} ${className}`}>{children}</div>;

export default Card;
