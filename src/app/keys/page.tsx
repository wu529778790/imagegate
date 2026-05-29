"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Select, Switch, Table, Typography, message, Tag } from "antd";
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
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch {
      message.error("加载 API 密钥失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/keys");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) setKeys(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) message.error("加载 API 密钥失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAdd = async (values: { name: string; provider: string; api_key: string }) => {
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("密钥已添加");
        setModalOpen(false);
        form.resetFields();
        fetchKeys();
      } else {
        message.error("添加失败");
      }
    } catch {
      message.error("网络错误，添加失败");
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除此 API 密钥？",
      okButtonProps: { danger: true },
      okText: "删除",
      cancelText: "取消",
      onOk: async () => {
        const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
        if (res.ok) {
          message.success("已删除");
          fetchKeys();
        } else {
          message.error("删除失败");
        }
      },
    });
  };

  const handleToggle = async (id: number, checked: boolean) => {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });
      if (res.ok) {
        fetchKeys();
      } else {
        message.error("更新失败");
      }
    } catch {
      message.error("网络错误，更新失败");
    }
  };

  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    {
      title: "服务商",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) => <Tag color={v === "zai" ? "blue" : "green"}>{v.toUpperCase()}</Tag>,
    },
    {
      title: "API Key",
      dataIndex: "api_key",
      key: "api_key",
      render: (v: string) => <span style={{ fontFamily: "monospace" }}>{v}</span>,
    },
    {
      title: "启用",
      dataIndex: "is_active",
      key: "is_active",
      render: (v: number, record: ApiKey) => (
        <Switch checked={v === 1} onChange={(c) => handleToggle(record.id, c)} />
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: ApiKey) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} size="small">
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>API 密钥</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ borderRadius: 8 }}>
          添加密钥
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table dataSource={keys} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title="添加 API 密钥" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="添加" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label={<span style={{ fontWeight: 500 }}>名称</span>} rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="例如：我的智谱 Key" />
          </Form.Item>
          <Form.Item name="provider" label={<span style={{ fontWeight: 500 }}>服务商</span>} rules={[{ required: true, message: "请选择服务商" }]}>
            <Select placeholder="选择服务商">
              <Select.Option value="zai">Z.AI (智谱)</Select.Option>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="google">Google (Gemini)</Select.Option>
              <Select.Option value="openrouter">OpenRouter</Select.Option>
              <Select.Option value="dashscope">DashScope (通义万相)</Select.Option>
              <Select.Option value="minimax">MiniMax</Select.Option>
              <Select.Option value="replicate">Replicate</Select.Option>
              <Select.Option value="jimeng">即梦 (Jimeng)</Select.Option>
              <Select.Option value="seedream">豆包 Seedream</Select.Option>
              <Select.Option value="azure">Azure OpenAI</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="api_key" label={<span style={{ fontWeight: 500 }}>API Key</span>} rules={[{ required: true, message: "请输入 API Key" }]}>
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
