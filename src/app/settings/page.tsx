"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Select, Typography, message } from "antd";

const { Title } = Typography;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        form.setFieldsValue(data);
      });
  }, [form]);

  const handleSave = async (values: Record<string, string>) => {
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      message.success("Settings saved");
    } else {
      message.error("Failed to save");
    }
    setLoading(false);
  };

  return (
    <div>
      <Title level={2}>Settings</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="default_provider" label="Default Provider">
            <Select allowClear placeholder="Auto-detect">
              <Select.Option value="zai">Z.AI (智谱)</Select.Option>
              <Select.Option value="xiaomi">Xiaomi</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="default_quality" label="Default Quality">
            <Select allowClear placeholder="2k">
              <Select.Option value="normal">Normal</Select.Option>
              <Select.Option value="2k">2K</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="default_ar" label="Default Aspect Ratio">
            <Select allowClear placeholder="1:1">
              <Select.Option value="1:1">1:1</Select.Option>
              <Select.Option value="16:9">16:9</Select.Option>
              <Select.Option value="9:16">9:16</Select.Option>
              <Select.Option value="4:3">4:3</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="zai_base_url" label="Z.AI Base URL">
            <Input placeholder="https://api.z.ai/api/paas/v4" />
          </Form.Item>
          <Form.Item name="xiaomi_base_url" label="Xiaomi Base URL">
            <Input placeholder="https://api.xiaomi.com/v1" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
