"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Spin, message } from "antd";
import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { ImageGrid, EmptyState, LoadingGrid, ConfirmDialog, useConfirmDialog } from "@/components/ui";
import { cn } from "@/lib/ui";

interface HistoryItem {
  id: number;
  prompt: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
}

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HistoryModal({ open, onClose }: HistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { confirmDialog, confirm } = useConfirmDialog();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/records?pageSize=50");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHistory(data.records || []);
    } catch {
      message.error("加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Use setTimeout to avoid calling setState synchronously in effect
      const timer = setTimeout(() => {
        fetchHistory();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleDownload = (item: HistoryItem) => {
    if (!item.image_url) return;
    const a = document.createElement("a");
    a.href = item.image_url;
    a.download = `image-${item.id}.png`;
    a.click();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("已删除");
        fetchHistory();
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("网络错误");
    }
  };

  const handleConfirmDelete = (item: HistoryItem) => {
    confirm({
      title: "确认删除",
      content: `确定要删除这条记录吗？此操作无法撤销。`,
      onConfirm: () => handleDelete(item.id),
    });
  };

  return (
    <>
      <Modal
        title="历史记录"
        open={open}
        onCancel={onClose}
        footer={null}
        width={900}
        styles={{
          body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto", background: "var(--bg-primary, #0a0a0f)" },
          header: { background: "var(--bg-elevated, #141420)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
        }}
        style={{ backgroundColor: "var(--bg-elevated, #141420)" }}
      >
        {loading ? (
          <LoadingGrid cols={{ xs: 1, sm: 2, md: 3, lg: 3 }} count={6} />
        ) : history.length === 0 ? (
          <EmptyState description="暂无历史记录" />
        ) : (
          <ImageGrid
            items={history.map(item => ({
              src: item.image_url || undefined,
              alt: item.prompt || "Generated image",
              showDownload: !!item.image_url,
              onDownload: () => handleDownload(item),
              showDelete: true,
              onDelete: () => handleConfirmDelete(item),
              previewable: true,
              aspectRatio: "1/1",
              borderRadius: 8,
              metadata: (
                <div>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-primary, #e4e4e7)",
                    fontWeight: 500,
                    marginBottom: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.prompt?.substring(0, 40) || "无提示词"}
                    {item.prompt && item.prompt.length > 40 && "..."}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
                    {new Date(item.created_at).toLocaleString("zh-CN")}
                  </div>
                </div>
              ),
            }))}
            cols={{ xs: 1, sm: 2, md: 3, lg: 3 }}
          />
        )}
      </Modal>

      {/* Confirm dialog */}
      {confirmDialog}
    </>
  );
}
