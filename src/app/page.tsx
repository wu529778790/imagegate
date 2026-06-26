"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Select, Modal, message, Tooltip } from "antd";
import { DownloadOutlined, ThunderboltOutlined } from "@ant-design/icons";

// 小红书风格选项（9种）
const XHS_STYLES = [
  { value: "cute", label: "甜美可爱", preview: "/images/xhs-styles/cute.webp", description: "少女风、甜美 aesthetic（默认）" },
  { value: "fresh", label: "清新自然", preview: "/images/xhs-styles/fresh.webp", description: "干净清爽、自然风格" },
  { value: "warm", label: "温暖舒适", preview: "/images/xhs-styles/warm.webp", description: "温馨友好、亲切感" },
  { value: "bold", label: "大胆醒目", preview: "/images/xhs-styles/bold.webp", description: "高冲击力、吸引眼球" },
  { value: "minimal", label: "极简精致", preview: "/images/xhs-styles/minimal.webp", description: "超干净、精致简约" },
  { value: "retro", label: "复古怀旧", preview: "/images/xhs-styles/retro.webp", description: "复古风、怀旧潮流" },
  { value: "pop", label: "活力炫彩", preview: "/images/xhs-styles/pop.webp", description: "鲜艳活泼、吸引目光" },
  { value: "notion", label: "极简手绘", preview: "/images/xhs-styles/notion.webp", description: "极简手绘线条、知识感" },
  { value: "chalkboard", label: "黑板粉笔", preview: "/images/xhs-styles/chalkboard.webp", description: "彩色粉笔、教育风格" },
];

// 小红书布局选项（6种官方选项）
const XHS_LAYOUTS = [
  { value: "sparse", label: "简约", preview: "/images/xhs-layouts/sparse.webp", description: "1-2个要点，最大冲击（封面、金句）" },
  { value: "balanced", label: "均衡", preview: "/images/xhs-layouts/balanced.webp", description: "3-4个要点，标准布局（常规内容）" },
  { value: "dense", label: "密集", preview: "/images/xhs-layouts/dense.webp", description: "5-8个要点，知识卡片（总结、干货）" },
  { value: "list", label: "列表", preview: "/images/xhs-layouts/list.webp", description: "4-7项，清单/排行榜" },
  { value: "comparison", label: "对比", preview: "/images/xhs-layouts/comparison.webp", description: "两栏对比，优缺点分析" },
  { value: "flow", label: "流程", preview: "/images/xhs-layouts/flow.webp", description: "3-6步，流程/时间线" },
];

const XHS_PALETTES = [
  { value: "", label: "默认配色", description: "使用风格内置配色" },
  { value: "macaron", label: "马卡龙", description: "柔和、教育感" },
  { value: "warm", label: "暖色调", description: "大地色系、温馨" },
  { value: "neon", label: "霓虹", description: "高能量、未来感" },
];

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [previewStyle, setPreviewStyle] = useState<string | null>(null);
  const [previewLayout, setPreviewLayout] = useState<string | null>(null);

  const handleGenerate = async (values: {
    content: string;
    style: string;
    layout: string;
    palette?: string;
  }) => {
    setLoading(true);

    try {
      const styleInfo = XHS_STYLES.find(s => s.value === values.style);
      const layoutInfo = XHS_LAYOUTS.find(l => l.value === values.layout);
      const paletteInfo = XHS_PALETTES.find(p => p.value === (values.palette || ""));

      const prompt = `生成小红书风格的图片卡片。

内容：${values.content}

风格：${styleInfo?.label} (${styleInfo?.description})
布局：${layoutInfo?.label} (${layoutInfo?.description})
${paletteInfo?.value ? `配色：${paletteInfo.label}` : "配色：默认"}

要求：
1. 适合社交媒体分享
2. 文字清晰可读
3. 视觉效果吸引人
4. 符合选择的风格和布局`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          quality: "2k",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "生成失败");
        return;
      }

      setPreviewImage(`data:image/png;base64,${data.image}`);
      setPreviewVisible(true);
      message.success(`生成完成，耗时 ${data.duration_ms}ms`);
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!previewImage) return;
    const a = document.createElement("a");
    a.href = previewImage;
    a.download = `image-${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%)" }}>
      <div style={{ padding: "24px 24px 100px" }}>
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          styles={{ body: { padding: 32 } }}
        >
          <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ style: "cute", layout: "balanced" }}>
            {/* 内容输入 */}
            <Form.Item name="content" label={<span style={{ fontWeight: 600, fontSize: 16 }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
              <Input.TextArea rows={4} placeholder="输入你想生成卡片的内容..." style={{ borderRadius: 8, fontSize: 15 }} />
            </Form.Item>

            {/* 隐藏字段确保有值 */}
            <Form.Item name="style" hidden rules={[{ required: true, message: "请选择视觉风格" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="layout" hidden rules={[{ required: true, message: "请选择信息布局" }]}>
              <Input />
            </Form.Item>

            {/* 视觉风格 */}
            <Form.Item label={<span style={{ fontWeight: 600, fontSize: 16 }}>视觉风格</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 12 }}>
                {XHS_STYLES.map(s => (
                  <Tooltip key={s.value} title={s.description} placement="top">
                    <div
                      style={{
                        border: previewStyle === s.value ? "3px solid #4f46e5" : "2px solid #e5e7eb",
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: "#fff",
                        transform: previewStyle === s.value ? "scale(1.02)" : "scale(1)",
                      }}
                      onClick={() => {
                        setPreviewStyle(s.value);
                        form.setFieldValue("style", s.value);
                      }}
                    >
                      <img src={s.preview} alt={s.label} style={{ width: "100%", display: "block" }} />
                      <div style={{ padding: "4px 0", textAlign: "center", fontSize: 11, fontWeight: 500 }}>
                        {s.label}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </Form.Item>

            {/* 信息布局 */}
            <Form.Item label={<span style={{ fontWeight: 600, fontSize: 16 }}>信息布局</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                {XHS_LAYOUTS.map(l => (
                  <Tooltip key={l.value} title={l.description} placement="top">
                    <div
                      style={{
                        border: previewLayout === l.value ? "3px solid #4f46e5" : "2px solid #e5e7eb",
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: "#fff",
                        transform: previewLayout === l.value ? "scale(1.02)" : "scale(1)",
                      }}
                      onClick={() => {
                        setPreviewLayout(l.value);
                        form.setFieldValue("layout", l.value);
                      }}
                    >
                      <img src={l.preview} alt={l.label} style={{ width: "100%", display: "block" }} />
                      <div style={{ padding: "4px 0", textAlign: "center", fontSize: 11, fontWeight: 500 }}>
                        {l.label}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </Form.Item>

            {/* 配色选择 */}
            <Form.Item name="palette" label={<span style={{ fontWeight: 600 }}>配色方案</span>}>
              <Select placeholder="选择配色（可选）" allowClear size="large" style={{ maxWidth: 300 }}>
                {XHS_PALETTES.map(p => (
                  <Select.Option key={p.value} value={p.value}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>{p.description}</div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* 固定底部生成按钮 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #e5e7eb",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={loading}
          size="large"
          icon={<ThunderboltOutlined />}
          style={{
            height: 56,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 16,
            padding: "0 48px",
          }}
        >
          {loading ? "生成中..." : "生成图片"}
        </Button>
      </div>

      {/* 预览弹窗 */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownload} size="large">
            下载图片
          </Button>,
        ]}
        width={600}
        centered
      >
        {previewImage && (
          <img src={previewImage} alt="预览" style={{ width: "100%", borderRadius: 8 }} />
        )}
      </Modal>
    </div>
  );
}
