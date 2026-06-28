/**
 * ConfirmDialog - Confirmation dialog replacement for Popconfirm
 * More flexible and accessible than Popconfirm
 */

import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export interface ConfirmDialogProps {
  /** Whether dialog is visible */
  open: boolean;
  /** Dialog title */
  title: React.ReactNode;
  /** Dialog content/description */
  content?: React.ReactNode;
  /** Confirm button text */
  okText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button danger style */
  danger?: boolean;
  /** Loading state for confirm button */
  confirmLoading?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Width of the dialog */
  width?: number | string;
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Icon to show (default: ExclamationCircleOutlined) */
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  content,
  okText = '确认',
  cancelText = '取消',
  danger = true,
  confirmLoading = false,
  onConfirm,
  onCancel,
  width = 420,
  showCancel = true,
  icon = <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span>{title}</span>
        </div>
      }
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ danger, loading: confirmLoading }}
      cancelButtonProps={showCancel ? {} : { style: { display: 'none' } }}
      onOk={onConfirm}
      onCancel={onCancel}
      width={width}
      styles={{
        body: { paddingTop: 12 },
        header: { paddingBottom: 12 },
      }}
    >
      {content && <div style={{ marginBottom: 8 }}>{content}</div>}
    </Modal>
  );
}

/**
 * Hook for using confirm dialog
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: React.ReactNode;
    content?: React.ReactNode;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const confirm = (config: {
    title: React.ReactNode;
    content?: React.ReactNode;
    onConfirm: () => void;
  }) => {
    setState({
      open: true,
      title: config.title,
      content: config.content,
      onConfirm: () => {
        config.onConfirm();
        setState((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const cancel = () => {
    setState((prev) => ({ ...prev, open: false }));
  };

  return {
    confirmDialog: (
      <ConfirmDialog
        open={state.open}
        title={state.title}
        content={state.content}
        onConfirm={state.onConfirm}
        onCancel={cancel}
      />
    ),
    confirm,
  };
}
