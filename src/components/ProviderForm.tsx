"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import type { ProviderMeta } from "@/types";

interface ProviderFormProps {
  provider: Pick<ProviderMeta, "name" | "label" | "color" | "fields">;
  loading: boolean;
  onSave: (provider: ProviderMeta, values: Record<string, string>) => Promise<void>;
}

const FIELD_STYLE = {
  background: "var(--bg-elevated)",
  borderColor: "var(--border-subtle)",
  borderRadius: 8,
};

export function ProviderForm({ provider, loading, onSave }: ProviderFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const values: Record<string, string> = {};
        for (const field of provider.fields) {
          values[field.key] = data[field.key] ?? "";
        }
        form.setFieldsValue(values);
      });
  }, [form, provider.fields]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (values) {
      await onSave(provider as ProviderMeta, values);
    }
  };

  return (
    <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {provider.fields.map((field) => (
          <Form.Item
            key={field.key}
            name={field.key}
            label={<span style={{ color: "var(--text-secondary)" }}>{field.label}</span>}
            style={{ flex: 1, minWidth: 200, marginBottom: 16 }}
            rules={field.type === "password" ? [{ required: true, message: `请输入${field.label}` }] : undefined}
          >
            {field.type === "password" ? (
              <Input.Password placeholder={field.placeholder} style={FIELD_STYLE} />
            ) : (
              <Input placeholder={field.placeholder} style={FIELD_STYLE} />
            )}
          </Form.Item>
        ))}
      </div>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          loading={loading}
          onClick={handleSave}
          icon={<SaveOutlined />}
          size="small"
          style={{ borderRadius: 8 }}
        >
          保存 {provider.label}
        </Button>
      </Form.Item>
    </Form>
  );
}
