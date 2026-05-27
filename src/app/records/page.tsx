"use client";

import { useEffect, useState } from "react";
import { Card, Select, Space, Table, Tag, Typography } from "antd";

const { Title } = Typography;

interface Record {
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
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchRecords = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (providerFilter) params.set("provider", providerFilter);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/records?${params}`);
    const data = await res.json();
    setRecords(data.records);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [page, providerFilter, statusFilter]);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: "Model", dataIndex: "model", key: "model" },
    {
      title: "Prompt",
      dataIndex: "prompt",
      key: "prompt",
      ellipsis: true,
      width: 300,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag color={v === "success" ? "green" : v === "failed" ? "red" : "blue"}>{v}</Tag>
      ),
    },
    {
      title: "Duration",
      dataIndex: "duration_ms",
      key: "duration_ms",
      render: (v: number | null) => (v ? `${v}ms` : "-"),
    },
    { title: "Time", dataIndex: "created_at", key: "created_at" },
  ];

  return (
    <div>
      <Title level={2}>Generation Records</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            allowClear
            placeholder="Provider"
            style={{ width: 120 }}
            onChange={setProviderFilter}
            options={[
              { value: "zai", label: "Z.AI" },
              { value: "xiaomi", label: "Xiaomi" },
            ]}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 120 }}
            onChange={setStatusFilter}
            options={[
              { value: "success", label: "Success" },
              { value: "failed", label: "Failed" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </Space>
      </Card>
      <Card>
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
