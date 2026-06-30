import React from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否块级显示 */
  block?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 图标（左侧） */
  icon?: React.ReactNode;
  /** 图标（右侧） */
  iconRight?: React.ReactNode;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * 统一的按钮组件
 * 替代项目中散落的各种 button 样式
 *
 * @example
 * <Button variant="primary" size="md" icon={<Icon />}>
 *   提交
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      block = false,
      loading = false,
      icon,
      iconRight,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      block ? styles.block : "",
      loading ? styles.loading : "",
      disabled ? styles.disabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        {!loading && icon && <span className={styles.iconLeft}>{icon}</span>}
        {children && <span className={styles.content}>{children}</span>}
        {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
