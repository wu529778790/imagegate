"use client";

import { useState } from "react";
import { Button, Form, Input, Select, Modal, message, Tooltip } from "antd";
import { DownloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { HeaderSection } from "@/components/ui/HeaderSection";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { cn } from "@/lib/ui";

const XHS_STYLES = [
  { value: "cute", label: "甜美可爱", preview: "/images/xhs-styles/cute.webp", description: "少女风、甜美 aesthetic" },
  { value: "fresh", label: "清新自然", preview: "/images/xhs-styles/fresh.webp", description: "干净清爽、自然风格" },
  { value: "warm", label: "温暖舒适", preview: "/images/xhs-styles/warm.webp", description: "温馨友好、亲切感" },
  { value: "bold", label: "大胆醒目", preview: "/images/xhs-styles/bold.webp", description: "高冲击力、吸引眼球" },
  { value: "minimal", label: "极简精致", preview: "/images/xhs-styles/minimal.webp", description: "超干净、精致简约" },
  { value: "retro", label: "复古怀旧", preview: "/images/xhs-styles/retro.webp", description: "复古风、怀旧潮流" },
  { value: "pop", label: "活力炫彩", preview: "/images/xhs-styles/pop.webp", description: "鲜艳活泼、吸引目光" },
  { value: "notion", label: "极简手绘", preview: "/images/xhs-styles/notion.webp", description: "极简手绘线条、知识感" },
  { value: "chalkboard", label: "黑板粉笔", preview: "/images/xhs-styles/chalkboard.webp", description: "彩色粉笔、教育风格" },
];

const XHS_LAYOUTS = [
  { value: "sparse", label: "简约", preview: "/images/xhs-layouts/sparse.webp", description: "1-2个要点，最大冲击" },
  { value: "balanced", label: "均衡", preview: "/images/xhs-layouts/balanced.webp", description: "3-4个要点，标准布局" },
  { value: "dense", label: "密集", preview: "/images/xhs-layouts/dense.webp", description: "5-8个要点，知识卡片" },
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

const gridCardStyle = (selected: boolean): React.CSSProperties => ({
  border: selected ? "2px solid var(--accent-primary, #6366f1)" : "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
  transition: "all 0.2s",
  background: selected ? "rgba(99,102,241,0.08)" : "var(--bg-elevated, #141420)",
  transform: selected ? "scale(1.02)" : "scale(1)",
  boxShadow: selected ? "0 0 16px rgba(99,102,241,0.2)" : "none",
});

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [previewStyle, setPreviewStyle] = useState<string | null>(null);
  const [previewLayout, setPreviewLayout] = useState<string | null>(null);

  const handleGenerate = async (values: { content: string; style: string; layout: string; palette?: string }) => {
    setLoading(true);
    try {
      const styleInfo = XHS_STYLES.find(s => s.value === values.style);
      const layoutInfo = XHS_LAYOUTS.find(l => l.value === values.layout);
      const paletteInfo = XHS_PALETTES.find(p => p.value === (values.palette || ""));
      const prompt = `生成小红书风格的图片卡片。\n\n内容：${values.content}\n\n风格：${styleInfo?.label} (${styleInfo?.description})\n布局：${layoutInfo?.label} (${layoutInfo?.description})\n${paletteInfo?.value ? `配色：${paletteInfo.label}` : "配色：默认"}\n\n要求：\n1. 适合社交媒体分享\n2. 文字清晰可读\n3. 视觉效果吸引人\n4. 符合选择的风格和布局`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, quality: "2k" }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error || "生成失败"); return; }
      setPreviewImage(`data:image/png;base64,${data.image}`);
      setPreviewVisible(true);
      message.success(`生成完成，耗时 ${(data.duration_ms / 1000).toFixed(1)}s`);
    } catch { message.error("网络错误"); } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!previewImage) return;
    const a = document.createElement("a");
    a.href = previewImage;
    a.download = `imagegate-${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ minHeight: "calc(100vh - 56px)" }}>
      <div style={{ padding: "32px 24px 100px", maxWidth: 900, margin: "0 auto" }}>
        <HeaderSection
          title="小红书卡片"
          subtitle="快速生成吸引眼球的小红书风格图片"
          icon={<span style={{ fontSize: 24 }}>📱</span>}
          marginBottom={24}
        />

        <div className="glass" style={{ padding: "32px" }}>
          <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ style: "cute", layout: "balanced" }}>
            <Form.Item name="content" label={<span style={{ fontWeight: 600, color: "var(--text-secondary, #a1a1aa)" }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
              <Input.TextArea rows={4} placeholder="输入你想生成卡片的内容..." style={{ borderRadius: 12, fontSize: 15, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)", color: "var(--text-primary, #e4e4e7)" }} />
            </Form.Item>

            <Form.Item name="style" hidden rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="layout" hidden rules={[{ required: true }]}><Input /></Form.Item>

            <Form.Item label={<span style={{ fontWeight: 600, color: "var(--text-secondary, #a1a1aa)" }}>视觉风格</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
                {XHS_STYLES.map(s => (
                  <Tooltip key={s.value} title={s.description} placement="top">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                      <div
                        style={gridCardStyle(previewStyle === s.value)}
                        onClick={() => { setPreviewStyle(s.value); form.setFieldValue("style", s.value); }}
                      >
                        <img src={s.preview} alt={s.label} style={{ width: "100%", display: "block" }} />
                        <div style={{ padding: "5px 0", textAlign: "center", fontSize: 11, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                          {s.label}
                        </div>
                      </div>
                    </motion.div>
                  </Tooltip>
                ))}
              </div>
            </Form.Item>

            <Form.Item label={<span style={{ fontWeight: 600, color: "var(--text-secondary, #a1a1aa)" }}>信息布局</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                {XHS_LAYOUTS.map(l => (
                  <Tooltip key={l.value} title={l.description} placement="top">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                      <div
                        style={gridCardStyle(previewLayout === l.value)}
                        onClick={() => { setPreviewLayout(l.value); form.setFieldValue("layout", l.value); }}
                      >
                        <img src={l.preview} alt={l.label} style={{ width: "100%", display: "block" }} />
                        <div style={{ padding: "5px 0", textAlign: "center", fontSize: 11, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                          {l.label}
                        </div>
                      </div>
                    </motion.div>
                  </Tooltip>
                ))}
              </div>
            </Form.Item>

            <Form.Item name="palette" label={<span style={{ fontWeight: 600, color: "var(--text-secondary, #a1a1aa)" }}>配色方案</span>}>
              <Select placeholder="选择配色（可选）" allowClear size="large" style={{ maxWidth: 300 }}>
                {XHS_PALETTES.map(p => (
                  <Select.Option key={p.value} value={p.value}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #71717a)" }}>{p.description}</div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <ActionButtons
          primary={{
            label: loading ? "生成中..." : "生成图片",
            onClick: () => form.submit(),
            loading,
            icon: <ThunderboltOutlined />,
          }}
          fullWidthOnMobile={true}
        />
      </div>

      {/* Preview modal */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownload} size="large" style={{ borderRadius: 10 }}>
            下载图片
          </Button>,
        ]}
        width={600}
        centered
        styles={{ body: { background: "var(--bg-primary, #0a0a0f)", padding: 0 } }}
      >
        {previewImage && (
          <img src={previewImage} alt="预览" style={{ width: "100%", borderRadius: 12 }} />
        )}
      </Modal>
    </div>
  );
}
