"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Row, Col, Select, Modal, message, Tooltip } from "antd";
import { DownloadOutlined, ThunderboltOutlined } from "@ant-design/icons";

// 信息图布局选项（21种）
const INFOGRAPHIC_LAYOUTS = [
  { value: "linear-progression", label: "线性流程", preview: "/images/infographic-layouts/timeline-horizontal.webp", description: "时间线、流程、教程" },
  { value: "binary-comparison", label: "二元对比", preview: "/images/infographic-layouts/comparison-table.webp", description: "A vs B、前后对比、优缺点" },
  { value: "comparison-matrix", label: "对比矩阵", preview: "/images/infographic-layouts/comparison-table.webp", description: "多因素比较" },
  { value: "hierarchical-layers", label: "层级结构", preview: "/images/infographic-layouts/pyramid.webp", description: "金字塔、优先级" },
  { value: "tree-branching", label: "树形分支", preview: "/images/infographic-layouts/tree-hierarchy.webp", description: "分类、层级" },
  { value: "hub-spoke", label: "中心辐射", preview: "/images/infographic-layouts/mind-map.webp", description: "核心概念+相关项" },
  { value: "structural-breakdown", label: "结构分解", preview: "/images/infographic-layouts/layers-stack.webp", description: "分解视图、剖面图" },
  { value: "bento-grid", label: "便当格", preview: "/images/infographic-layouts/grid-cards.webp", description: "多主题概览（默认）" },
  { value: "iceberg", label: "冰山图", preview: "/images/infographic-layouts/iceberg.webp", description: "表面vs隐藏" },
  { value: "bridge", label: "桥梁图", preview: "/images/infographic-layouts/bridge.webp", description: "问题-解决方案" },
  { value: "funnel", label: "漏斗图", preview: "/images/infographic-layouts/funnel.webp", description: "转化、筛选" },
  { value: "isometric-map", label: "等距地图", preview: "/images/infographic-layouts/layers-stack.webp", description: "空间关系" },
  { value: "dashboard", label: "仪表盘", preview: "/images/infographic-layouts/grid-cards.webp", description: "指标、KPI" },
  { value: "periodic-table", label: "元素周期表", preview: "/images/infographic-layouts/grid-cards.webp", description: "分类集合" },
  { value: "comic-strip", label: "漫画条", preview: "/images/infographic-layouts/circular-flow.webp", description: "叙事、序列" },
  { value: "story-mountain", label: "故事山", preview: "/images/infographic-layouts/pyramid.webp", description: "情节结构、张力弧" },
  { value: "jigsaw", label: "拼图", preview: "/images/infographic-layouts/nested-circles.webp", description: "相互关联部分" },
  { value: "venn-diagram", label: "维恩图", preview: "/images/infographic-layouts/venn.webp", description: "重叠概念" },
  { value: "winding-roadmap", label: "蜿蜒路线图", preview: "/images/infographic-layouts/journey-path.webp", description: "旅程、里程碑" },
  { value: "circular-flow", label: "循环流", preview: "/images/infographic-layouts/circular-flow.webp", description: "循环、重复过程" },
  { value: "dense-modules", label: "密集模块", preview: "/images/infographic-layouts/grid-cards.webp", description: "高密度数据指南" },
];

// 信息图风格选项（22种）
const INFOGRAPHIC_STYLES = [
  { value: "craft-handmade", label: "手工工艺", preview: "/images/infographic-styles/craft-handmade.webp", description: "手绘、纸质工艺（默认）" },
  { value: "claymation", label: "黏土动画", preview: "/images/infographic-styles/claymation.webp", description: "3D黏土人偶" },
  { value: "kawaii", label: "卡哇伊", preview: "/images/infographic-styles/kawaii.webp", description: "日系可爱、柔和色彩" },
  { value: "storybook-watercolor", label: "故事书水彩", preview: "/images/infographic-styles/storybook-watercolor.webp", description: "柔和水彩画" },
  { value: "chalkboard", label: "黑板", preview: "/images/infographic-styles/chalkboard.webp", description: "黑板粉笔" },
  { value: "cyberpunk-neon", label: "赛博朋克", preview: "/images/infographic-styles/cyberpunk-neon.webp", description: "霓虹灯、未来感" },
  { value: "bold-graphic", label: "大胆图形", preview: "/images/infographic-styles/bold-graphic.webp", description: "漫画风格、半色调" },
  { value: "aged-academia", label: "复古学术", preview: "/images/infographic-styles/aged-academia.webp", description: "复古科学、棕褐色" },
  { value: "corporate-memphis", label: "企业孟菲斯", preview: "/images/infographic-styles/corporate-memphis.webp", description: "扁平矢量、鲜艳" },
  { value: "technical-schematic", label: "技术示意图", preview: "/images/infographic-styles/technical-schematic.webp", description: "蓝图、工程" },
  { value: "origami", label: "折纸", preview: "/images/infographic-styles/origami.webp", description: "折纸、几何" },
  { value: "pixel-art", label: "像素艺术", preview: "/images/infographic-styles/pixel-art.webp", description: "复古8位" },
  { value: "ui-wireframe", label: "UI线框", preview: "/images/infographic-styles/ui-wireframe.webp", description: "灰度界面模型" },
  { value: "subway-map", label: "地铁图", preview: "/images/infographic-styles/subway-map.webp", description: "交通图" },
  { value: "ikea-manual", label: "宜家手册", preview: "/images/infographic-styles/ikea-manual.webp", description: "极简线条" },
  { value: "knolling", label: "整理摆拍", preview: "/images/infographic-styles/knolling.webp", description: "有序平铺" },
  { value: "lego-brick", label: "乐高积木", preview: "/images/infographic-styles/lego-brick.webp", description: "玩具积木构建" },
  { value: "pop-laboratory", label: "流行实验室", preview: "/images/infographic-styles/cyberpunk-neon.webp", description: "蓝图网格、坐标" },
  { value: "morandi-journal", label: "莫兰迪手账", preview: "/images/infographic-styles/craft-handmade.webp", description: "手绘涂鸦、暖莫兰迪色" },
  { value: "retro-pop-grid", label: "复古流行网格", preview: "/images/infographic-styles/bold-graphic.webp", description: "70年代复古、瑞士网格" },
  { value: "hand-drawn-edu", label: "手绘教育", preview: "/images/infographic-styles/kawaii.webp", description: "马卡龙色、手绘涂鸦、简笔画" },
  { value: "retro-popup-pop", label: "复古弹出流行", preview: "/images/infographic-styles/bold-graphic.webp", description: "复古弹出拼贴、粗轮廓" },
];

interface ImageResult {
  url: string;
}

export default function InfographicPage() {
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [previewLayout, setPreviewLayout] = useState<string | null>(null);
  const [previewStyle, setPreviewStyle] = useState<string | null>(null);

  const handleGenerate = async (values: {
    content: string;
    layout: string;
    style: string;
    aspect?: string;
    lang?: string;
  }) => {
    setLoading(true);

    try {
      const layoutInfo = INFOGRAPHIC_LAYOUTS.find(l => l.value === values.layout);
      const styleInfo = INFOGRAPHIC_STYLES.find(s => s.value === values.style);

      const prompt = `生成专业信息图。

内容：${values.content}

布局：${layoutInfo?.label} (${layoutInfo?.description})
风格：${styleInfo?.label} (${styleInfo?.description})
${values.aspect ? `比例：${values.aspect}` : "比例：16:9"}
${values.lang ? `语言：${values.lang}` : "语言：中文"}

要求：
1. 专业、美观、可直接发布
2. 信息清晰、层次分明
3. 符合选择的布局和风格
4. 适合社交媒体或文章配图`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          quality: "2k",
          ar: values.aspect || "16:9",
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
    a.download = `infographic-${Date.now()}.png`;
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
          <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ layout: "bento-grid", style: "craft-handmade", aspect: "16:9", lang: "zh" }}>
            {/* 内容输入 */}
            <Form.Item name="content" label={<span style={{ fontWeight: 600, fontSize: 16 }}>内容</span>} rules={[{ required: true, message: "请输入内容" }]}>
              <Input.TextArea rows={4} placeholder="输入你想生成信息图的内容..." style={{ borderRadius: 8, fontSize: 15 }} />
            </Form.Item>

            {/* 布局选择 */}
            <Form.Item label={<span style={{ fontWeight: 600, fontSize: 16 }}>信息布局（21种）</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
                {INFOGRAPHIC_LAYOUTS.map(l => (
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

            <Form.Item name="layout" hidden>
              <Input />
            </Form.Item>

            {/* 风格选择 */}
            <Form.Item label={<span style={{ fontWeight: 600, fontSize: 16 }}>视觉风格（22种）</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                {INFOGRAPHIC_STYLES.map(s => (
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

            <Form.Item name="style" hidden>
              <Input />
            </Form.Item>

            {/* 参数设置 */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="aspect" label={<span style={{ fontWeight: 600 }}>比例</span>}>
                  <Select size="large">
                    <Select.Option value="16:9">16:9 横版</Select.Option>
                    <Select.Option value="9:16">9:16 竖版</Select.Option>
                    <Select.Option value="1:1">1:1 方形</Select.Option>
                    <Select.Option value="4:3">4:3</Select.Option>
                    <Select.Option value="3:4">3:4</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="lang" label={<span style={{ fontWeight: 600 }}>语言</span>}>
                  <Select size="large">
                    <Select.Option value="zh">中文</Select.Option>
                    <Select.Option value="en">English</Select.Option>
                    <Select.Option value="ja">日本語</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
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
          {loading ? "生成中..." : "生成信息图"}
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
        width={900}
        centered
      >
        {previewImage && (
          <img src={previewImage} alt="预览" style={{ width: "100%", borderRadius: 8 }} />
        )}
      </Modal>
    </div>
  );
}
