"use client";

import { useState } from "react";
import { Button, Card, Col, Form, Input, Radio, Row, Select, Typography, message, Spin, Tag } from "antd";
import { DownloadOutlined, PictureOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

const STYLES = [
  { value: "cute", label: "甜美可爱", description: "少女风、甜美 aesthetic" },
  { value: "fresh", label: "清新自然", description: "干净清爽、自然风格" },
  { value: "warm", label: "温暖舒适", description: "温馨友好、亲切感" },
  { value: "bold", label: "大胆醒目", description: "高冲击力、吸引眼球" },
  { value: "minimal", label: "极简精致", description: "超干净、精致简约" },
  { value: "retro", label: "复古怀旧", description: "复古风、怀旧潮流" },
  { value: "pop", label: "活力炫彩", description: "鲜艳活泼、吸引目光" },
  { value: "notion", label: "极简手绘", description: "极简手绘线条、知识感" },
  { value: "chalkboard", label: "黑板粉笔", description: "彩色粉笔、教育风格" },
  { value: "study-notes", label: "学习笔记", description: "手写笔记风格、蓝色笔" },
  { value: "screen-print", label: "丝网印刷", description: "大胆海报、半色调纹理" },
  { value: "sketch-notes", label: "手绘笔记", description: "手绘教育信息图、马卡龙色" },
];

const LAYOUTS = [
  { value: "sparse", label: "简约", description: "1-2个要点，最大冲击" },
  { value: "balanced", label: "均衡", description: "3-4个要点，标准布局" },
  { value: "dense", label: "密集", description: "5-8个要点，知识卡片" },
  { value: "list", label: "列表", description: "排名/清单 (4-7项)" },
  { value: "comparison", label: "对比", description: "并排对比" },
  { value: "flow", label: "流程", description: "流程/时间线 (3-6步)" },
  { value: "mindmap", label: "思维导图", description: "中心辐射 (4-8分支)" },
  { value: "quadrant", label: "四象限", description: "四象限/圆形分区" },
];

const PALETTES = [
  { value: "", label: "默认配色", description: "使用风格内置配色" },
  { value: "macaron", label: "马卡龙", description: "柔和、教育感" },
  { value: "warm", label: "暖色调", description: "大地色系、温馨" },
  { value: "neon", label: "霓虹", description: "高能量、未来感" },
];

const PRESETS = [
  { value: "knowledge-card", label: "知识卡片", style: "notion", layout: "dense" },
  { value: "checklist", label: "清单", style: "notion", layout: "list" },
  { value: "tutorial", label: "教程步骤", style: "chalkboard", layout: "flow" },
  { value: "cute-share", label: "甜美分享", style: "cute", layout: "balanced" },
  { value: "warning", label: "避坑指南", style: "bold", layout: "list" },
  { value: "retro-ranking", label: "复古排行", style: "retro", layout: "list" },
  { value: "pop-facts", label: "趣味冷知识", style: "pop", layout: "list" },
  { value: "clean-quote", label: "金句封面", style: "minimal", layout: "sparse" },
];

interface ImageResult {
  url: string;
  style: string;
  layout: string;
}

export default function XHSPage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [form] = Form.useForm();

  const handlePresetChange = (presetValue: string) => {
    const preset = PRESETS.find(p => p.value === presetValue);
    if (preset) {
      form.setFieldsValue({
        style: preset.style,
        layout: preset.layout,
      });
    }
  };

  const handleGenerate = async (values: {
    content: string;
    style: string;
    layout: string;
    palette?: string;
    count: number;
  }) => {
    setLoading(true);
    setImages([]);

    try {
      // Build prompt based on selected options
      const style = STYLES.find(s => s.value === values.style);
      const layout = LAYOUTS.find(l => l.value === values.layout);
      const palette = PALETTES.find(p => p.value === (values.palette || ""));

      const prompt = `生成小红书风格的图片卡片系列。

内容：${values.content}

风格：${style?.label} (${style?.description})
布局：${layout?.label} (${layout?.description})
${palette?.value ? `配色：${palette.label} (${palette.description})` : "配色：默认"}

要求：
1. 生成${values.count}张图片卡片
2. 每张卡片包含完整的内容信息
3. 适合社交媒体分享
4. 文字清晰可读
5. 视觉效果吸引人`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: "zai",
          model: "cogview-3",
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
        style: values.style,
        layout: values.layout,
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
    a.download = `xhs-card-${index + 1}.png`;
    a.click();
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 8, fontWeight: 600 }}>小红书图片生成</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: "block" }}>
        生成适合小红书、微信等社交媒体的图片卡片系列
      </Text>

      <Row gutter={24}>
        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 12 }} styles={{ body: { padding: "24px 28px" } }}>
            <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ style: "cute", layout: "balanced", count: 1 }}>
              <Form.Item name="content" label={<span style={{ fontWeight: 500 }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
                <TextArea rows={4} placeholder="输入你想生成卡片的内容..." style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item name="preset" label={<span style={{ fontWeight: 500 }}>预设</span>}>
                <Select placeholder="选择预设（可选）" allowClear onChange={handlePresetChange}>
                  {PRESETS.map(p => (
                    <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="style" label={<span style={{ fontWeight: 500 }}>视觉风格</span>}>
                <Select placeholder="选择风格">
                  {STYLES.map(s => (
                    <Select.Option key={s.value} value={s.value}>
                      <div>
                        <div>{s.label}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{s.description}</div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="layout" label={<span style={{ fontWeight: 500 }}>信息布局</span>}>
                <Select placeholder="选择布局">
                  {LAYOUTS.map(l => (
                    <Select.Option key={l.value} value={l.value}>
                      <div>
                        <div>{l.label}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{l.description}</div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="palette" label={<span style={{ fontWeight: 500 }}>配色方案</span>}>
                <Select placeholder="选择配色（可选）" allowClear>
                  {PALETTES.map(p => (
                    <Select.Option key={p.value} value={p.value}>
                      <div>
                        <div>{p.label}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{p.description}</div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="count" label={<span style={{ fontWeight: 500 }}>生成数量</span>}>
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value={1}>1张</Radio.Button>
                  <Radio.Button value={3}>3张</Radio.Button>
                  <Radio.Button value={5}>5张</Radio.Button>
                  <Radio.Button value={9}>9张</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ height: 44, borderRadius: 8, fontWeight: 500 }}>
                  生成图片
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: images.length > 0 ? 0 : 24 } }}
            title={<span style={{ fontWeight: 500 }}>结果</span>}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: "#64748b" }}>生成中...</div>
              </div>
            ) : images.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, padding: 16 }}>
                {images.map((img, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={img.url}
                      alt={`XHS Card ${index + 1}`}
                      style={{ width: "100%", borderRadius: 8, display: "block" }}
                    />
                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                      <Tag color="blue">{STYLES.find(s => s.value === img.style)?.label}</Tag>
                      <Tag color="green">{LAYOUTS.find(l => l.value === img.layout)?.label}</Tag>
                    </div>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(img.url, index)}
                      style={{ position: "absolute", bottom: 8, right: 8 }}
                      size="small"
                    >
                      下载
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#cbd5e1" }}>
                <PictureOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                <div>输入内容后点击生成</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
