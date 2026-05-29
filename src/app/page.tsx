"use client";

import { useState } from "react";
import { Button, Card, Col, Form, Input, Row, Select, message, Spin, Tooltip } from "antd";
import { DownloadOutlined, PictureOutlined, ThunderboltOutlined } from "@ant-design/icons";
const { TextArea } = Input;

// 小红书风格选项
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
  { value: "study-notes", label: "学习笔记", preview: "/images/xhs-styles/notion.webp", description: "手写笔记风格" },
];

const XHS_LAYOUTS = [
  { value: "sparse", label: "简约", preview: "/images/xhs-layouts/sparse.webp", description: "1-2个要点，最大冲击" },
  { value: "balanced", label: "均衡", preview: "/images/xhs-layouts/balanced.webp", description: "3-4个要点，标准布局" },
  { value: "dense", label: "密集", preview: "/images/xhs-layouts/dense.webp", description: "5-8个要点，知识卡片" },
  { value: "list", label: "列表", preview: "/images/xhs-layouts/list.webp", description: "排名/清单" },
  { value: "comparison", label: "对比", preview: "/images/xhs-layouts/comparison.webp", description: "并排对比" },
  { value: "flow", label: "流程", preview: "/images/xhs-layouts/flow.webp", description: "流程/时间线" },
  { value: "mindmap", label: "思维导图", preview: "/images/xhs-layouts/balanced.webp", description: "中心辐射" },
  { value: "quadrant", label: "四象限", preview: "/images/xhs-layouts/dense.webp", description: "四象限分区" },
];

const XHS_PALETTES = [
  { value: "", label: "默认配色", description: "使用风格内置配色" },
  { value: "macaron", label: "马卡龙", description: "柔和、教育感" },
  { value: "warm", label: "暖色调", description: "大地色系、温馨" },
  { value: "neon", label: "霓虹", description: "高能量、未来感" },
];

interface ImageResult {
  url: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageResult[]>([]);
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
    setImages([]);

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

      setImages([{
        url: `data:image/png;base64,${data.image}`,
      }]);

      message.success(`生成完成，耗时 ${data.duration_ms}ms`);
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${index + 1}.png`;
    a.click();
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%)" }}>
      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 60px" }}>
        <Row gutter={24}>
          {/* Left: Input */}
          <Col xs={24} lg={10}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
              styles={{ body: { padding: 24 } }}
            >
              <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ style: "cute", layout: "balanced" }}>
                <Form.Item name="content" label={<span style={{ fontWeight: 500 }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
                  <TextArea rows={4} placeholder="输入你想生成卡片的内容..." style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item label={<span style={{ fontWeight: 500 }}>视觉风格</span>}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {XHS_STYLES.map(s => (
                      <Tooltip key={s.value} title={s.description}>
                        <div
                          style={{
                            border: previewStyle === s.value ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                            borderRadius: 8,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            background: "#fff",
                          }}
                          onClick={() => {
                            setPreviewStyle(s.value);
                            form.setFieldValue("style", s.value);
                          }}
                        >
                          <img src={s.preview} alt={s.label} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                          <div style={{ padding: "4px 0", textAlign: "center", fontSize: 12, fontWeight: 500 }}>
                            {s.label}
                          </div>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </Form.Item>

                <Form.Item name="style" hidden>
                  <Input />
                </Form.Item>

                <Form.Item label={<span style={{ fontWeight: 500 }}>信息布局</span>}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {XHS_LAYOUTS.map(l => (
                      <Tooltip key={l.value} title={l.description}>
                        <div
                          style={{
                            border: previewLayout === l.value ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                            borderRadius: 8,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            background: "#fff",
                          }}
                          onClick={() => {
                            setPreviewLayout(l.value);
                            form.setFieldValue("layout", l.value);
                          }}
                        >
                          <img src={l.preview} alt={l.label} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                          <div style={{ padding: "4px 0", textAlign: "center", fontSize: 12, fontWeight: 500 }}>
                            {l.label}
                          </div>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </Form.Item>

                <Form.Item name="layout" hidden>
                  <Input />
                </Form.Item>

                <Form.Item name="palette" label={<span style={{ fontWeight: 500 }}>配色方案</span>}>
                  <Select placeholder="选择配色（可选）" allowClear>
                    {XHS_PALETTES.map(p => (
                      <Select.Option key={p.value} value={p.value}>
                        <div>
                          <div>{p.label}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{p.description}</div>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={loading} block size="large" icon={<ThunderboltOutlined />} style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
                    生成图片
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Right: Preview */}
          <Col xs={24} lg={14}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", minHeight: 500 }}
              styles={{ body: { padding: images.length > 0 ? 0 : 32 } }}
              title={<span style={{ fontWeight: 600 }}>预览</span>}
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: "120px 0" }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 20, color: "#64748b", fontSize: 16 }}>生成中...</div>
                </div>
              ) : images.length > 0 ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={images[0].url}
                    alt="Generated"
                    style={{ width: "100%", display: "block", borderRadius: "0 0 16px 16px" }}
                  />
                  <div style={{ position: "absolute", top: 16, right: 16 }}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(images[0].url, 0)}
                      style={{ borderRadius: 8 }}
                    >
                      下载
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "120px 0", color: "#cbd5e1" }}>
                  <PictureOutlined style={{ fontSize: 80, marginBottom: 20 }} />
                  <div style={{ fontSize: 16 }}>输入内容后点击生成</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
