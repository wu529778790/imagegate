"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Input, Row, Select, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface ProviderConfig {
  name: string;
  label: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type?: "password" | "text" }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "zai",
    label: "Z.AI (智谱)",
    color: "#4f46e5",
    fields: [
      { key: "zai_api_key", label: "API Key", placeholder: "输入智谱 API Key", type: "password" },
      { key: "zai_base_url", label: "Base URL", placeholder: "https://api.z.ai/api/paas/v4" },
      { key: "zai_model", label: "模型", placeholder: "glm-image" },
    ],
  },
  {
    name: "xiaomi",
    label: "小米",
    color: "#16a34a",
    fields: [
      { key: "xiaomi_api_key", label: "API Key", placeholder: "输入小米 API Key", type: "password" },
      { key: "xiaomi_base_url", label: "Base URL", placeholder: "https://api.xiaomi.com/v1" },
      { key: "xiaomi_model", label: "模型", placeholder: "xiaomi-image" },
    ],
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [globalForm] = Form.useForm();
  const [zaiForm] = Form.useForm();
  const [xiaomiForm] = Form.useForm();
  const providerForms = useMemo<Record<string, ReturnType<typeof Form.useForm>[0]>>(() => ({ zai: zaiForm, xiaomi: xiaomiForm }), [zaiForm, xiaomiForm]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        globalForm.setFieldsValue({
          default_provider: data.default_provider,
          default_quality: data.default_quality,
          default_ar: data.default_ar,
        });
        for (const provider of PROVIDERS) {
          const form = providerForms[provider.name];
          const values: Record<string, string> = {};
          for (const field of provider.fields) {
            values[field.key] = data[field.key] ?? "";
          }
          form.setFieldsValue(values);
        }
      });
  }, [globalForm, providerForms]);

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

  const handleSaveProvider = async (provider: ProviderConfig) => {
    const form = providerForms[provider.name];
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

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
    <div>
      <Title level={3} style={{ marginBottom: 24, fontWeight: 600 }}>设置</Title>

      <Card
        title={<span style={{ fontWeight: 500 }}>全局默认</span>}
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 24, maxWidth: 700 }}
      >
        <Form form={globalForm} layout="vertical" onFinish={handleSaveGlobal}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="default_provider" label={<span style={{ fontWeight: 500 }}>默认服务商</span>}>
                <Select allowClear placeholder="自动检测">
                  {PROVIDERS.map((p) => (
                    <Select.Option key={p.name} value={p.name}>{p.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="default_quality" label={<span style={{ fontWeight: 500 }}>默认质量</span>}>
                <Select allowClear placeholder="2k">
                  <Select.Option value="normal">普通</Select.Option>
                  <Select.Option value="2k">2K</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="default_ar" label={<span style={{ fontWeight: 500 }}>默认宽高比</span>}>
                <Select allowClear placeholder="1:1">
                  <Select.Option value="1:1">1:1</Select.Option>
                  <Select.Option value="16:9">16:9</Select.Option>
                  <Select.Option value="9:16">9:16</Select.Option>
                  <Select.Option value="4:3">4:3</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} style={{ borderRadius: 8 }}>
              保存全局设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {PROVIDERS.map((provider) => (
        <Card
          key={provider.name}
          bordered={false}
          style={{ borderRadius: 12, marginBottom: 24, maxWidth: 700 }}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 32, borderRadius: 4, background: provider.color }} />
              <span style={{ fontWeight: 500 }}>{provider.label}</span>
            </div>
          }
          extra={
            <Button type="primary" loading={loading} onClick={() => handleSaveProvider(provider)} icon={<SaveOutlined />} style={{ borderRadius: 8 }}>
              保存
            </Button>
          }
        >
          <Form form={providerForms[provider.name]} layout="vertical">
            {provider.fields.map((field) => (
              <Form.Item key={field.key} name={field.key} label={<span style={{ fontWeight: 500 }}>{field.label}</span>}>
                {field.type === "password" ? (
                  <Input.Password placeholder={field.placeholder} />
                ) : (
                  <Input placeholder={field.placeholder} />
                )}
              </Form.Item>
            ))}
          </Form>
        </Card>
      ))}
    </div>
  );
}
