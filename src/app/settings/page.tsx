"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Row, Select, Typography, message } from "antd";

const { Title, Text } = Typography;

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
    color: "#1677ff",
    fields: [
      { key: "zai_api_key", label: "API Key", placeholder: "输入智谱 API Key", type: "password" },
      { key: "zai_base_url", label: "Base URL", placeholder: "https://api.z.ai/api/paas/v4" },
      { key: "zai_model", label: "Model", placeholder: "glm-image" },
    ],
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [globalForm] = Form.useForm();
  const [zaiForm] = Form.useForm();
  const providerForms: Record<string, ReturnType<typeof Form.useForm>[0]> = { zai: zaiForm };

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
            values[field.key] = data[field.key] || "";
          }
          form.setFieldsValue(values);
        }
      });
  }, [globalForm, providerForms]);

  const handleSaveGlobal = async (values: Record<string, string>) => {
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success("Global settings saved");
    } else {
      message.error("Failed to save");
    }
    setLoading(false);
  };

  const handleSaveProvider = async (provider: ProviderConfig) => {
    const form = providerForms[provider.name];
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success(`${provider.label} settings saved`);
    } else {
      message.error("Failed to save");
    }
    setLoading(false);
  };

  return (
    <div>
      <Title level={2}>Settings</Title>

      <Card title="Global" style={{ maxWidth: 600, marginBottom: 24 }}>
        <Form form={globalForm} layout="vertical" onFinish={handleSaveGlobal}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="default_provider" label="Default Provider">
                <Select allowClear placeholder="Auto-detect">
                  {PROVIDERS.map((p) => (
                    <Select.Option key={p.name} value={p.name}>{p.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="default_quality" label="Default Quality">
                <Select allowClear placeholder="2k">
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="2k">2K</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="default_ar" label="Default Aspect Ratio">
                <Select allowClear placeholder="1:1">
                  <Select.Option value="1:1">1:1</Select.Option>
                  <Select.Option value="16:9">16:9</Select.Option>
                  <Select.Option value="9:16">9:16</Select.Option>
                  <Select.Option value="4:3">4:3</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Global Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {PROVIDERS.map((provider) => (
        <Card
          key={provider.name}
          title={<Text strong>{provider.label}</Text>}
          extra={
            <Button type="primary" loading={loading} onClick={() => handleSaveProvider(provider)}>
              Save
            </Button>
          }
          style={{ maxWidth: 600, marginBottom: 24 }}
        >
          <Form form={providerForms[provider.name]} layout="vertical">
            {provider.fields.map((field) => (
              <Form.Item key={field.key} name={field.key} label={field.label}>
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
