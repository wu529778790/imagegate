"use client";

import { useEffect, useState } from "react";
import { Button, Card, Empty, Modal, Spin, message } from "antd";
import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";

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

  return (
    <Modal
      title="历史记录"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
        </div>
      ) : history.length === 0 ? (
        <Empty description="暂无历史记录" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {history.map(item => (
            <Card
              key={item.id}
              bordered={false}
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 0 } }}
              cover={
                item.image_url ? (
                  <img
                    src={item.image_url}
                    alt="Generated"
                    style={{ width: "100%", height: 150, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ height: 150, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    无图片
                  </div>
                )
              }
              actions={[
                <Button
                  key="download"
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(item)}
                >
                  下载
                </Button>,
                <Button
                  key="delete"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(item.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <Card.Meta
                title={item.prompt?.substring(0, 30) + (item.prompt && item.prompt.length > 30 ? "..." : "")}
                description={new Date(item.created_at).toLocaleString("zh-CN")}
              />
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
