"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, message, Collapse, Typography } from "antd";
import { SaveOutlined, LinkOutlined } from "@ant-design/icons";
import { PROVIDERS } from "@/types";
import type { ProviderMeta } from "@/types";
import { ProviderForm } from "./ProviderForm";

const { Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [globalForm] = Form.useForm();

  useEffect(() => {
    if (open) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          globalForm.setFieldsValue({
            default_provider: data.default_provider,
            default_quality: data.default_quality,
            default_ar: data.default_ar,
          });
        });
    }
  }, [open, globalForm]);

  const handleSaveGlobal = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("全局设置已保存");
      } else {
        message.error("保存失败");
      }
    } catch {
      message.error("网络错误，保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async (provider: ProviderMeta, values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success(`${provider.label} 设置已保存`);
      } else {
        message.error("保存失败");
      }
    } catch {
      message.error("网络错误，保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{
        body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto", background: "var(--bg-primary)" },
        header: { background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" },
      }}
    >
      {/* Global defaults */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 14, marginBottom: 12, display: "block", color: "var(--text-primary)" }}>
          全局默认
        </Text>
        <Form form={globalForm} layout="vertical" onFinish={handleSaveGlobal}>
          <Space size={16} style={{ width: "100%" }}>
            <Form.Item name="default_provider" label={<span style={{ color: "var(--text-secondary)" }}>默认服务商</span>} style={{ flex: 1 }}>
              <Select allowClear placeholder="自动检测">
                {PROVIDERS.map((p) => (
                  <Select.Option key={p.name} value={p.name}>{p.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="default_quality" label={<span style={{ color: "var(--text-secondary)" }}>默认质量</span>} style={{ flex: 1 }}>
              <Select allowClear placeholder="2k">
                <Select.Option value="normal">标准</Select.Option>
                <Select.Option value="2k">高清</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="default_ar" label={<span style={{ color: "var(--text-secondary)" }}>默认比例</span>} style={{ flex: 1 }}>
              <Select allowClear placeholder="1:1">
                <Select.Option value="1:1">1:1</Select.Option>
                <Select.Option value="16:9">16:9</Select.Option>
                <Select.Option value="9:16">9:16</Select.Option>
                <Select.Option value="4:3">4:3</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="small" style={{ borderRadius: 8 }}>
              保存全局设置
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Provider configs */}
      <Collapse
        items={PROVIDERS.map((provider) => ({
          key: provider.name,
          label: (
            <Space>
              <div style={{ width: 6, height: 16, borderRadius: 3, background: provider.color }} />
              <Text strong style={{ color: "var(--text-primary)" }}>{provider.label}</Text>
              <a
                href={provider.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 12, color: "var(--accent-primary)" }}
              >
                <LinkOutlined /> 获取 API Key
              </a>
            </Space>
          ),
          children: (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12, color: "var(--text-secondary)" }}>
                {provider.description}
              </Text>
              <ProviderForm provider={provider} loading={loading} onSave={handleSaveProvider} />
            </div>
          ),
        }))}
      />
    </Modal>
  );
}
