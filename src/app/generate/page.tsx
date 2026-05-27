"use client";

import { useState } from "react";
import { Button, Card, Col, Form, Input, Radio, Row, Select, Space, Typography, message, Spin } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { TextArea } = Input;

export default function GeneratePage() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleGenerate = async (values: {
    prompt: string;
    provider?: string;
    model?: string;
    ar?: string;
    quality?: string;
  }) => {
    setLoading(true);
    setImageUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Generation failed");
        return;
      }

      setImageUrl(`data:image/png;base64,${data.image}`);
      message.success(`Generated in ${data.duration_ms}ms via ${data.provider}`);
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `generated-${Date.now()}.png`;
    a.click();
  };

  return (
    <div>
      <Title level={2}>Generate Image</Title>
      <Row gutter={24}>
        <Col span={12}>
          <Card title="Settings">
            <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ ar: "1:1", quality: "2k" }}>
              <Form.Item name="prompt" label="Prompt" rules={[{ required: true, message: "Please enter a prompt" }]}>
                <TextArea rows={4} placeholder="Describe the image you want to generate..." />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="provider" label="Provider">
                    <Select allowClear placeholder="Auto-detect">
                      <Select.Option value="zai">Z.AI (智谱)</Select.Option>
                      <Select.Option value="xiaomi">Xiaomi</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="model" label="Model">
                    <Input placeholder="Default model" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="ar" label="Aspect Ratio">
                    <Radio.Group>
                      <Radio.Button value="1:1">1:1</Radio.Button>
                      <Radio.Button value="16:9">16:9</Radio.Button>
                      <Radio.Button value="9:16">9:16</Radio.Button>
                      <Radio.Button value="4:3">4:3</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="quality" label="Quality">
                    <Radio.Group>
                      <Radio.Button value="normal">Normal</Radio.Button>
                      <Radio.Button value="2k">2K</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Generate
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="Result"
            extra={
              imageUrl && (
                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  Download
                </Button>
              )
            }
            style={{ minHeight: 400 }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Generating...</div>
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Generated" style={{ width: "100%", borderRadius: 8 }} />
            ) : (
              <div style={{ textAlign: "center", padding: 80, color: "#999" }}>
                Enter a prompt and click Generate
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
