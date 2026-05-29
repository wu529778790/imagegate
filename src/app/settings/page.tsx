"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Input, Row, Select, Typography, message, Space } from "antd";
import { SaveOutlined, LinkOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface ProviderConfig {
  name: string;
  label: string;
  color: string;
  developerUrl: string;
  fields: { key: string; label: string; placeholder: string; type?: "password" | "text" }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "zai",
    label: "Z.AI (智谱)",
    color: "#4f46e5",
    developerUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    fields: [
      { key: "zai_api_key", label: "API Key", placeholder: "输入智谱 API Key", type: "password" },
      { key: "zai_base_url", label: "Base URL", placeholder: "https://open.bigmodel.cn/api/paas/v4" },
      { key: "zai_model", label: "模型", placeholder: "cogview-3" },
    ],
  },
  {
    name: "openai",
    label: "OpenAI",
    color: "#10a37f",
    developerUrl: "https://platform.openai.com/api-keys",
    fields: [
      { key: "openai_api_key", label: "API Key", placeholder: "输入 OpenAI API Key", type: "password" },
      { key: "openai_base_url", label: "Base URL", placeholder: "https://api.openai.com/v1" },
      { key: "openai_model", label: "模型", placeholder: "gpt-image-2" },
    ],
  },
  {
    name: "google",
    label: "Google (Gemini)",
    color: "#4285f4",
    developerUrl: "https://aistudio.google.com/apikey",
    fields: [
      { key: "google_api_key", label: "API Key", placeholder: "输入 Google API Key", type: "password" },
      { key: "google_base_url", label: "Base URL", placeholder: "https://generativelanguage.googleapis.com/v1beta" },
      { key: "google_model", label: "模型", placeholder: "gemini-2.0-flash-preview-image-generation" },
    ],
  },
  {
    name: "openrouter",
    label: "OpenRouter",
    color: "#ff6b35",
    developerUrl: "https://openrouter.ai/keys",
    fields: [
      { key: "openrouter_api_key", label: "API Key", placeholder: "输入 OpenRouter API Key", type: "password" },
      { key: "openrouter_base_url", label: "Base URL", placeholder: "https://openrouter.ai/api/v1" },
      { key: "openrouter_model", label: "模型", placeholder: "google/gemini-2.0-flash-preview-image-generation" },
    ],
  },
  {
    name: "dashscope",
    label: "DashScope (通义万相)",
    color: "#ff6a00",
    developerUrl: "https://dashscope.console.aliyun.com/apiKey",
    fields: [
      { key: "dashscope_api_key", label: "API Key", placeholder: "输入 DashScope API Key", type: "password" },
      { key: "dashscope_base_url", label: "Base URL (可选)", placeholder: "https://dashscope.aliyuncs.com" },
      { key: "dashscope_model", label: "模型", placeholder: "qwen-image-2.0-pro" },
    ],
  },
  {
    name: "minimax",
    label: "MiniMax",
    color: "#6366f1",
    developerUrl: "https://platform.minimaxi.com/user-center/api-keys",
    fields: [
      { key: "minimax_api_key", label: "API Key", placeholder: "输入 MiniMax API Key", type: "password" },
      { key: "minimax_base_url", label: "Base URL", placeholder: "https://api.minimaxi.com" },
      { key: "minimax_model", label: "模型", placeholder: "image-01" },
    ],
  },
  {
    name: "replicate",
    label: "Replicate",
    color: "#000000",
    developerUrl: "https://replicate.com/account/api-tokens",
    fields: [
      { key: "replicate_api_key", label: "API Token", placeholder: "输入 Replicate API Token", type: "password" },
      { key: "replicate_base_url", label: "Base URL", placeholder: "https://api.replicate.com" },
      { key: "replicate_model", label: "模型", placeholder: "google/nano-banana-2" },
    ],
  },
  {
    name: "jimeng",
    label: "即梦 (Jimeng)",
    color: "#3b82f6",
    developerUrl: "https://console.volcengine.com/iam/keymanage/",
    fields: [
      { key: "jimeng_api_key", label: "API Key (AccessKey:SecretKey)", placeholder: "输入即梦 AccessKey:SecretKey", type: "password" },
      { key: "jimeng_base_url", label: "Base URL", placeholder: "https://visual.volcengineapi.com" },
      { key: "jimeng_model", label: "模型", placeholder: "jimeng_t2i_v40" },
    ],
  },
  {
    name: "seedream",
    label: "豆包 Seedream",
    color: "#00d4aa",
    developerUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    fields: [
      { key: "seedream_api_key", label: "API Key", placeholder: "输入豆包 ARK API Key", type: "password" },
      { key: "seedream_base_url", label: "Base URL", placeholder: "https://ark.cn-beijing.volces.com/api/v3" },
      { key: "seedream_model", label: "模型", placeholder: "doubao-seedream-5-0-260128" },
    ],
  },
  {
    name: "azure",
    label: "Azure OpenAI",
    color: "#0078d4",
    developerUrl: "https://portal.azure.com/#view/Microsoft_Azure_AI/OpenAI/azureopenai",
    fields: [
      { key: "azure_api_key", label: "API Key", placeholder: "输入 Azure OpenAI API Key", type: "password" },
      { key: "azure_base_url", label: "Endpoint", placeholder: "https://your-resource.openai.azure.com" },
      { key: "azure_model", label: "Deployment", placeholder: "gpt-image-2" },
    ],
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [globalForm] = Form.useForm();
  const [zaiForm] = Form.useForm();
  const [openaiForm] = Form.useForm();
  const [googleForm] = Form.useForm();
  const [openrouterForm] = Form.useForm();
  const [dashscopeForm] = Form.useForm();
  const [minimaxForm] = Form.useForm();
  const [replicateForm] = Form.useForm();
  const [jimengForm] = Form.useForm();
  const [seedreamForm] = Form.useForm();
  const [azureForm] = Form.useForm();

  const providerForms = useMemo<Record<string, ReturnType<typeof Form.useForm>[0]>>(() => ({
    zai: zaiForm,
    openai: openaiForm,
    google: googleForm,
    openrouter: openrouterForm,
    dashscope: dashscopeForm,
    minimax: minimaxForm,
    replicate: replicateForm,
    jimeng: jimengForm,
    seedream: seedreamForm,
    azure: azureForm,
  }), [zaiForm, openaiForm, googleForm, openrouterForm, dashscopeForm, minimaxForm, replicateForm, jimengForm, seedreamForm, azureForm]);

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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 0" }}>
      <Title level={3} style={{ marginBottom: 24, fontWeight: 600 }}>设置</Title>

      {/* 全局默认设置 */}
      <Card
        title={<span style={{ fontWeight: 600 }}>全局默认</span>}
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 24 }}
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

      {/* 服务商配置 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 16, fontWeight: 600 }}>服务商配置</Title>
      </div>

      {PROVIDERS.map((provider) => (
        <Card
          key={provider.name}
          bordered={false}
          style={{ borderRadius: 12, marginBottom: 16 }}
          title={
            <Space size={12}>
              <div style={{ width: 6, height: 24, borderRadius: 3, background: provider.color }} />
              <span style={{ fontWeight: 600 }}>{provider.label}</span>
              <a
                href={provider.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}
              >
                <LinkOutlined /> 开发者中心
              </a>
            </Space>
          }
          extra={
            <Button type="primary" loading={loading} onClick={() => handleSaveProvider(provider)} icon={<SaveOutlined />} style={{ borderRadius: 8 }}>
              保存
            </Button>
          }
        >
          <Form form={providerForms[provider.name]} layout="vertical" style={{ marginBottom: 0 }}>
            <Row gutter={16}>
              {provider.fields.map((field) => (
                <Col key={field.key} span={8}>
                  <Form.Item name={field.key} label={<span style={{ fontWeight: 500 }}>{field.label}</span>}>
                    {field.type === "password" ? (
                      <Input.Password placeholder={field.placeholder} />
                    ) : (
                      <Input placeholder={field.placeholder} />
                    )}
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form>
        </Card>
      ))}
    </div>
  );
}
