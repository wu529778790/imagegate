"use client";

import { useEffect, useState } from "react";
import { Card, Select, Space, Table, Tag, Typography, message } from "antd";

const { Title } = Typography;

interface GenerationRecordItem {
  id: number;
  provider: string;
  model: string | null;
  prompt: string | null;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<GenerationRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (providerFilter) params.set("provider", providerFilter);
      if (statusFilter) params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/records?${params}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) {
          setRecords(data.records || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) message.error("加载记录失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, providerFilter, statusFilter]);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "服务商",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: "模型", dataIndex: "model", key: "model" },
    {
      title: "提示词",
      dataIndex: "prompt",
      key: "prompt",
      ellipsis: true,
      width: 300,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag color={v === "success" ? "green" : v === "failed" ? "red" : "blue"}>
          {v === "success" ? "成功" : v === "failed" ? "失败" : "进行中"}
        </Tag>
      ),
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      render: (v: number | null) => (v ? `${v}ms` : "-"),
    },
    { title: "时间", dataIndex: "created_at", key: "created_at" },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, fontWeight: 600 }}>生成记录</Title>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space>
          <Select
            allowClear
            placeholder="服务商"
            style={{ width: 140 }}
            onChange={setProviderFilter}
            options={[
              { value: "zai", label: "Z.AI" },
              { value: "openai", label: "OpenAI" },
              { value: "google", label: "Google" },
              { value: "openrouter", label: "OpenRouter" },
              { value: "dashscope", label: "DashScope" },
              { value: "minimax", label: "MiniMax" },
              { value: "replicate", label: "Replicate" },
              { value: "jimeng", label: "即梦" },
              { value: "seedream", label: "豆包" },
              { value: "azure", label: "Azure" },
            ]}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            onChange={setStatusFilter}
            options={[
              { value: "success", label: "成功" },
              { value: "failed", label: "失败" },
              { value: "pending", label: "进行中" },
            ]}
          />
        </Space>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  );
}
