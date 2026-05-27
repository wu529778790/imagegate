"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Switch, Table, Typography, message, Space, Tag } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface ApiKey {
  id: number;
  name: string;
  provider: string;
  api_key: string;
  is_active: number;
  created_at: string;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchKeys = async () => {
    setLoading(true);
    const res = await fetch("/api/keys");
    const data = await res.json();
    setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAdd = async (values: { name: string; provider: string; api_key: string }) => {
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      message.success("Key added");
      setModalOpen(false);
      form.resetFields();
      fetchKeys();
    } else {
      message.error("Failed to add key");
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Delete this API key?",
      onOk: async () => {
        await fetch(`/api/keys/${id}`, { method: "DELETE" });
        message.success("Deleted");
        fetchKeys();
      },
    });
  };

  const handleToggle = async (id: number, checked: boolean) => {
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: checked }),
    });
    fetchKeys();
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag color={v === "zai" ? "blue" : "green"}>{v.toUpperCase()}</Tag>,
    },
    {
      title: "API Key",
      dataIndex: "api_key",
      key: "api_key",
      render: (v: string) => v.slice(0, 8) + "****" + v.slice(-4),
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (v: number, record: ApiKey) => (
        <Switch checked={v === 1} onChange={(c) => handleToggle(record.id, c)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: ApiKey) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} size="small" />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>API Keys</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Key
        </Button>
      </div>

      <Card>
        <Table dataSource={keys} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title="Add API Key" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. My Z.AI Key" />
          </Form.Item>
          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Input placeholder="zai or xiaomi" />
          </Form.Item>
          <Form.Item name="api_key" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="Enter API key" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
