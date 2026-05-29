"use client";

import { useState } from "react";
import { Button, Card, Col, Form, Input, Radio, Row, Select, Tabs, Typography, message, Spin, Tooltip } from "antd";
import { DownloadOutlined, PictureOutlined, ThunderboltOutlined } from "@ant-design/icons";

const { Title, Paragraph } = Typography;
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

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "2:1", label: "2:1" },
  { value: "1:2", label: "1:2" },
];

interface ImageResult {
  url: string;
  type: "basic" | "xhs";
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [basicForm] = Form.useForm();
  const [xhsForm] = Form.useForm();
  const [previewStyle, setPreviewStyle] = useState<string | null>(null);
  const [previewLayout, setPreviewLayout] = useState<string | null>(null);

  // 基础图片生成
  const handleBasicGenerate = async (values: {
    prompt: string;
    ar?: string;
    quality?: string;
    size?: string;
  }) => {
    setLoading(true);
    setImages([]);

    try {
      const payload: Record<string, unknown> = { prompt: values.prompt };
      if (values.ar) payload.ar = values.ar;
      if (values.quality) payload.quality = values.quality;
      if (values.size) payload.size = values.size;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "生成失败");
        return;
      }

      setImages([{
        url: `data:image/png;base64,${data.image}`,
        type: "basic",
      }]);

      message.success(`生成完成，耗时 ${data.duration_ms}ms`);
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  // 小红书图片生成
  const handleXhsGenerate = async (values: {
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
4. 笱合选择的风格和布局`;

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
        type: "xhs",
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
      {/* Hero Section */}
      <div style={{ textAlign: "center", padding: "60px 20px 40px" }}>
        <Title level={1} style={{ marginBottom: 16, fontWeight: 700 }}>
          <ThunderboltOutlined style={{ color: "#4f46e5", marginRight: 12 }} />
          妙笔
        </Title>
        <Paragraph style={{ fontSize: 18, color: "#64748b", maxWidth: 600, margin: "0 auto" }}>
          妙笔生花，一键生成精美图片。支持多种风格、布局和配色方案。
        </Paragraph>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 60px" }}>
        <Row gutter={24}>
          {/* Left: Input */}
          <Col xs={24} lg={10}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
              styles={{ body: { padding: 24 } }}
            >
              <Tabs
                defaultActiveKey="basic"
                items={[
                  {
                    key: "basic",
                    label: (
                      <span style={{ fontWeight: 500 }}>
                        <PictureOutlined style={{ marginRight: 6 }} />
                        基础生成
                      </span>
                    ),
                    children: (
                      <Form form={basicForm} layout="vertical" onFinish={handleBasicGenerate} initialValues={{ ar: "1:1", quality: "2k" }}>
                        <Form.Item name="prompt" label={<span style={{ fontWeight: 500 }}>描述你想生成的图片</span>} rules={[{ required: true, message: "请输入描述" }]}>
                          <TextArea rows={4} placeholder="例如：一只可爱的猫咪在阳光下睡觉，水彩画风格" style={{ borderRadius: 8 }} />
                        </Form.Item>
                        <Form.Item name="ar" label={<span style={{ fontWeight: 500 }}>宽高比</span>}>
                          <Radio.Group buttonStyle="solid" style={{ flexWrap: "wrap" }}>
                            {ASPECT_RATIOS.map(r => (
                              <Radio.Button key={r.value} value={r.value}>{r.label}</Radio.Button>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                        <Form.Item name="quality" label={<span style={{ fontWeight: 500 }}>质量</span>}>
                          <Radio.Group buttonStyle="solid">
                            <Radio.Button value="normal">普通</Radio.Button>
                            <Radio.Button value="2k">2K</Radio.Button>
                          </Radio.Group>
                        </Form.Item>
                        <Form.Item name="size" label={<span style={{ fontWeight: 500 }}>自定义尺寸</span>} tooltip="格式：宽x高，如 1280x720">
                          <Input placeholder="可选，如 1280x720" style={{ borderRadius: 8 }} />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button type="primary" htmlType="submit" loading={loading} block size="large" icon={<ThunderboltOutlined />} style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
                            生成图片
                          </Button>
                        </Form.Item>
                      </Form>
                    ),
                  },
                  {
                    key: "xhs",
                    label: (
                      <span style={{ fontWeight: 500 }}>
                        <ThunderboltOutlined style={{ marginRight: 6 }} />
                        小红书风格
                      </span>
                    ),
                    children: (
                      <Form form={xhsForm} layout="vertical" onFinish={handleXhsGenerate} initialValues={{ style: "cute", layout: "balanced" }}>
                        <Form.Item name="content" label={<span style={{ fontWeight: 500 }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
                          <TextArea rows={4} placeholder="输入你想生成卡片的内容..." style={{ borderRadius: 8 }} />
                        </Form.Item>

                        <Form.Item label={<span style={{ fontWeight: 500 }}>视觉风格</span>}>
                          <Row gutter={[12, 12]}>
                            {XHS_STYLES.map(s => (
                              <Col key={s.value} span={8}>
                                <Tooltip title={s.description}>
                                  <div
                                    style={{
                                      border: previewStyle === s.value ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                    }}
                                    onClick={() => {
                                      setPreviewStyle(s.value);
                                      xhsForm.setFieldValue("style", s.value);
                                    }}
                                  >
                                    <img src={s.preview} alt={s.label} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                                    <div style={{ padding: "6px 0", textAlign: "center", fontSize: 13, fontWeight: 500, background: "#fff" }}>
                                      {s.label}
                                    </div>
                                  </div>
                                </Tooltip>
                              </Col>
                            ))}
                          </Row>
                        </Form.Item>

                        <Form.Item name="style" hidden>
                          <Input />
                        </Form.Item>

                        <Form.Item label={<span style={{ fontWeight: 500 }}>信息布局</span>}>
                          <Row gutter={[12, 12]}>
                            {XHS_LAYOUTS.map(l => (
                              <Col key={l.value} span={8}>
                                <Tooltip title={l.description}>
                                  <div
                                    style={{
                                      border: previewLayout === l.value ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                    }}
                                    onClick={() => {
                                      setPreviewLayout(l.value);
                                      xhsForm.setFieldValue("layout", l.value);
                                    }}
                                  >
                                    <img src={l.preview} alt={l.label} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                                    <div style={{ padding: "6px 0", textAlign: "center", fontSize: 13, fontWeight: 500, background: "#fff" }}>
                                      {l.label}
                                    </div>
                                  </div>
                                </Tooltip>
                              </Col>
                            ))}
                          </Row>
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
                            生成小红书图片
                          </Button>
                        </Form.Item>
                      </Form>
                    ),
                  },
                ]}
              />
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
                  <div style={{ fontSize: 16 }}>输入描述后点击生成</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
