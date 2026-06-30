/**
 * ErrorAlert - Consistent error display
 */

import React from 'react';
import { Alert, Button } from 'antd';
import type { AlertProps } from 'antd';

export interface ErrorAlertProps extends Omit<AlertProps, 'type'> {
  /** Error message */
  message: React.ReactNode;
  /** Detailed error description */
  description?: React.ReactNode;
  /** Whether to show close button */
  closable?: boolean;
  /** Callback when closed */
  onClose?: () => void;
  /** Show retry button */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Additional className */
  className?: string;
}

export function ErrorAlert({
  message,
  description,
  closable = true,
  onClose,
  onRetry,
  retryText = '重试',
  className,
  ...props
}: ErrorAlertProps) {
  return (
    <Alert
      type="error"
      message={message}
      description={description}
      closable={closable}
      onClose={onClose}
      showIcon
      className={className}
      style={{
        borderRadius: 12,
        border: '1px solid var(--color-error-soft)',
        background: 'var(--color-error-soft)',
        ...props.style,
      }}
      action={
        onRetry ? (
          <Button size="small" onClick={onRetry} style={{ marginLeft: 8 }}>
            {retryText}
          </Button>
        ) : undefined
      }
      {...props}
    />
  );
}

/**
 * SuccessAlert - Success message display
 */
export function SuccessAlert({
  message,
  description,
  closable = true,
  onClose,
  className,
  ...props
}: Omit<ErrorAlertProps, 'onRetry' | 'retryText'>) {
  return (
    <Alert
      type="success"
      message={message}
      description={description}
      closable={closable}
      onClose={onClose}
      showIcon
      className={className}
      style={{
        borderRadius: 12,
        border: '1px solid rgba(34, 197, 94, 0.3)',
        background: 'rgba(34, 197, 94, 0.1)',
        ...props.style,
      }}
      {...props}
    />
  );
}

/**
 * WarningAlert - Warning message display
 */
export function WarningAlert({
  message,
  description,
  closable = true,
  onClose,
  className,
  ...props
}: Omit<ErrorAlertProps, 'onRetry' | 'retryText'>) {
  return (
    <Alert
      type="warning"
      message={message}
      description={description}
      closable={closable}
      onClose={onClose}
      showIcon
      className={className}
      style={{
        borderRadius: 12,
        border: '1px solid rgba(234, 179, 8, 0.3)',
        background: 'rgba(234, 179, 8, 0.1)',
        ...props.style,
      }}
      {...props}
    />
  );
}
