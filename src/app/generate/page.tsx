"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Segmented, Space, Tag, message, Spin, Empty, Pagination } from "antd";
import { DownloadOutlined, ThunderboltOutlined, ClockCircleOutlined, DeleteOutlined } from "@ant-design/icons";

// Provider 品牌色
const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};

interface RecordItem {
  id: number;
  provider: string;
  model: string;
  prompt: string;
  status: string;
  duration_ms: number;
  created_at: string;
}

interface GenerateResult {
  image: string;
  provider: string;
  model: string;
  duration_ms: number;
}

export default function GeneratePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // 历史记录
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 加载 settings（获取默认 provider/model）
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        if (data.default_provider) {
          form.setFieldValue("provider", data.default_provider);
        }
      });
  }, [form]);

  // 加载历史记录
  const loadRecords = useCallback(async (p = 1) => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/records?page=${p}&pageSize=20`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords(page);
  }, [page, loadRecords]);

  // 生成图片
  const handleGenerate = async (values: {
    prompt: string;
    provider?: string;
    model?: string;
    ar?: string;
    quality?: string;
  }) => {
    if (!values.prompt?.trim()) {
      message.warning("请输入图片描述");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { prompt: values.prompt };
      if (values.provider) body.provider = values.provider;
      if (values.model) body.model = values.model;
      if (values.ar) body.ar = values.ar;
      if (values.quality) body.quality = values.quality;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "生成失败");
      }

      setResult(data);
      message.success(`生成成功 (${(data.duration_ms / 1000).toFixed(1)}s)`);
      // 刷新历史记录
      loadRecords(1);
      setPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "生成失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 下载图片
  const handleDownload = (base64: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = `imagegate-${Date.now()}.png`;
    link.click();
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/records?id=${id}`, { method: "DELETE" });
      loadRecords(page);
    } catch {
      // ignore
    }
  };

  // 获取当前选中 provider 的默认 model
  const getDefaultValue = (field: string) => {
    const provider = form.getFieldValue("provider") || settings.default_provider;
    if (field === "model" && provider) {
      return settings[`${provider}_model`] || "";
    }
    if (field === "quality") return settings.default_quality || "2k";
    if (field === "ar") return settings.default_ar || "1:1";
    return "";
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* 左侧 — 历史记录 */}
      <div
        style={{
          width: 340,
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", fontWeight: 600, fontSize: 15 }}>
          历史记录
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
          <Spin spinning={recordsLoading}>
            {records.length === 0 && !recordsLoading ? (
              <Empty description="暂无记录" style={{ marginTop: 60 }} />
            ) : (
              records.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                    marginBottom: 8,
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c7d2fe")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#f0f0f0")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: "#374151",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.prompt}
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Tag
                      color={PROVIDER_COLORS[item.provider] || "#666"}
                      style={{ margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }}
                    >
                      {PROVIDER_LABELS[item.provider] || item.provider}
                    </Tag>
                    {item.status === "success" ? (
                      <Tag color="success" style={{ margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }}>
                        成功
                      </Tag>
                    ) : (
                      <Tag color="error" style={{ margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }}>
                        失败
                      </Tag>
                    )}
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                      <ClockCircleOutlined style={{ marginRight: 3 }} />
                      {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </Spin>
        </div>
        {total > 20 && (
          <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
            <Pagination
              size="small"
              current={page}
              total={total}
              pageSize={20}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* 右侧 — 生图主区域 */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", maxWidth: 800, margin: "0 auto" }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: "#1e1b4b" }}>
            🖼️ AI 生图
          </div>

          <Form form={form} layout="vertical" onFinish={handleGenerate}>
            <Form.Item name="prompt" rules={[{ required: true, message: "请输入图片描述" }]}>
              <Input.TextArea
                rows={4}
                placeholder="描述你想要生成的图片，例如：一只橘猫坐在窗台上晒太阳，背景是城市天际线"
                style={{ fontSize: 15, borderRadius: 10 }}
                maxLength={10000}
                showCount
              />
            </Form.Item>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Form.Item label="Provider" name="provider" style={{ marginBottom: 0, minWidth: 160 }}>
                <Segmented
                  options={Object.entries(PROVIDER_LABELS).map(([value, label]) => ({
                    value,
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: PROVIDER_COLORS[value],
                            display: "inline-block",
                          }}
                        />
                        {label}
                      </span>
                    ),
                  }))}
                />
              </Form.Item>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Form.Item label="Model" name="model" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                <Input placeholder={getDefaultValue("model") || "输入模型名称"} />
              </Form.Item>

              <Form.Item label="比例" name="ar" style={{ marginBottom: 0 }}>
                <Segmented
                  options={["1:1", "16:9", "9:16", "4:3", "3:4"]}
                  defaultValue={getDefaultValue("ar") || "1:1"}
                />
              </Form.Item>

              <Form.Item label="质量" name="quality" style={{ marginBottom: 0 }}>
                <Segmented
                  options={[
                    { label: "标准", value: "normal" },
                    { label: "高清", value: "2k" },
                  ]}
                  defaultValue={getDefaultValue("quality") || "2k"}
                />
              </Form.Item>
            </div>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ThunderboltOutlined />}
                loading={loading}
                size="large"
                style={{ height: 48, borderRadius: 10, fontSize: 16, fontWeight: 600, minWidth: 160 }}
              >
                生成图片
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 结果展示区 */}
        {result && (
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              maxWidth: 800,
              margin: "24px auto 0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>生成结果</div>
              <Space>
                <Tag color={PROVIDER_COLORS[result.provider]}>
                  {PROVIDER_LABELS[result.provider] || result.provider}
                </Tag>
                <Tag>{result.model}</Tag>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {(result.duration_ms / 1000).toFixed(1)}s
                </span>
              </Space>
            </div>
            <div style={{ textAlign: "center" }}>
              <img
                src={`data:image/png;base64,${result.image}`}
                alt="生成结果"
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(result.image)}
              >
                下载图片
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
