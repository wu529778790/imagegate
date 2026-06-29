"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Button,
  Input,
  Segmented,
  Tag,
  message,
  Pagination,
  Popconfirm,
  Tooltip,
  Progress,
} from "antd";
import {
  DownloadOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
  ReloadOutlined,
  PictureOutlined,
  EditOutlined,
  SwapOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  PROMPT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type PromptTemplate,
} from "@/lib/prompts";
import { ImageCard } from "@/components/ui/ImageCard";
import { EmptyState, EmptyStates } from "@/components/ui/EmptyState";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatusBadge, ProviderBadge } from "@/components/ui/TagBadge";
import { cn, formatDuration } from "@/lib/ui";
import { useAuthModal } from "@/components/AuthContext";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
};
const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};
const AR_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

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
interface BatchItem {
  prompt: string;
  status: "pending" | "running" | "success" | "error";
  result?: GenerateResult;
  error?: string;
}

export default function HomePage() {
  const authModal = useAuthModal();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<string>("openai");
  const [model, setModel] = useState("");
  const [ar, setAr] = useState("1:1");
  const [quality, setQuality] = useState("2k");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>("product");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Batch
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);

  // History
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data.default_provider) setProvider(data.default_provider);
        if (data.default_ar) setAr(data.default_ar);
        if (data.default_quality) setQuality(data.default_quality);
      });
  }, []);

  const loadRecords = useCallback(async (p = 1) => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/records?page=${p}&pageSize=20`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch {
      /* */
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords(page);
  }, [page, loadRecords]);

  const doGenerate = async (
    p?: string,
    prov?: string,
    ratio?: string,
    q?: string
  ) => {
    const usePrompt = p ?? prompt;
    const useProvider = prov ?? provider;
    const useAr = ratio ?? ar;
    const useQuality = q ?? quality;
    if (!usePrompt.trim()) {
      message.warning("请输入图片描述");
      return;
    }

    const isAuthenticated = await authModal.requireAuth({
      action: "生成图片",
    });
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const body: Record<string, string> = {
        prompt: usePrompt,
        provider: useProvider,
        ar: useAr,
        quality: useQuality,
      };
      if (model) body.model = model;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "生成失败");
      setResult(data);
      message.success(`生成成功 (${(data.duration_ms / 1000).toFixed(1)}s)`);
      loadRecords(1);
      setPage(1);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  // Batch generation
  const startBatch = async () => {
    const lines = prompt
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      message.warning("请输入至少一个 Prompt（每行一个）");
      return;
    }

    const isAuthenticated = await authModal.requireAuth({
      action: "批量生成图片",
    });
    if (!isAuthenticated) return;

    const items: BatchItem[] = lines.map((p) => ({
      prompt: p,
      status: "pending" as const,
    }));
    setBatchItems(items);
    setBatchRunning(true);
    batchAbortRef.current = false;

    for (let i = 0; i < items.length; i++) {
      if (batchAbortRef.current) break;
      setBatchItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "running" } : item
        )
      );

      try {
        const body: Record<string, string> = {
          prompt: lines[i],
          provider,
          ar,
          quality,
        };
        if (model) body.model = model;
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "失败");
        setBatchItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "success", result: data } : item
          )
        );
      } catch (err: unknown) {
        setBatchItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "失败",
                }
              : item
          )
        );
      }
    }
    setBatchRunning(false);
    loadRecords(1);
    setPage(1);
  };

  const stopBatch = () => {
    batchAbortRef.current = true;
    setBatchRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      batchMode ? startBatch() : doGenerate();
    }
  };

  const handleDownload = (base64: string, name?: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = name || `imagegate-${Date.now()}.png`;
    link.click();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    loadRecords(page);
  };

  const applyTemplate = (t: PromptTemplate) => {
    if (batchMode) {
      setPrompt((prev) => (prev ? prev + "\n" + t.prompt : t.prompt));
    } else {
      setPrompt(t.prompt);
    }
    textareaRef.current?.focus();
  };

  const filteredTemplates = PROMPT_TEMPLATES.filter(
    (t) => t.category === templateCategory
  );
  const batchDone = batchItems.filter(
    (i) => i.status === "success" || i.status === "error"
  ).length;
  const batchTotal = batchItems.length;

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 52px)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--text-primary)",
              }}
            >
              历史记录
            </div>
            <div
              style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}
              className="scrollbar-custom"
            >
              {recordsLoading ? (
                <LoadingCard count={5} height={72} />
              ) : records.length === 0 ? (
                <EmptyState
                  {...EmptyStates.noRecords.props}
                  style={{ marginTop: 48 }}
                />
              ) : (
                records.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      marginBottom: 4,
                      cursor: "pointer",
                      transition: "all 0.12s",
                      background: "var(--bg-elevated)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-accent)";
                      e.currentTarget.style.background = "var(--bg-surface)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }}
                    onClick={() => setPrompt(item.prompt)}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        marginBottom: 4,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.prompt}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ProviderBadge provider={item.provider} size="small" />
                      <StatusBadge
                        status={item.status === "success" ? "success" : "failed"}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginLeft: "auto",
                        }}
                      >
                        {new Date(item.created_at).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Popconfirm
                        title="确认删除？"
                        onConfirm={() => handleDelete(item.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <DeleteOutlined
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                ))
              )}
            </div>
            {total > 20 && (
              <div
                style={{
                  padding: "6px 10px",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "absolute",
          left: sidebarOpen ? 280 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: 18,
          height: 44,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "0 6px 6px 0",
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "left 0.2s ease",
          borderLeft: "none",
        }}
      >
        {sidebarOpen ? (
          <LeftOutlined style={{ fontSize: 9 }} />
        ) : (
          <RightOutlined style={{ fontSize: 9 }} />
        )}
      </button>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "28px 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 680 }}>
          {/* Templates toggle */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: showTemplates ? 8 : 0,
                flexWrap: "wrap",
              }}
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setTemplateCategory(cat.id);
                    setShowTemplates(true);
                  }}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border:
                      templateCategory === cat.id && showTemplates
                        ? "1px solid var(--border-accent)"
                        : "1px solid var(--border-subtle)",
                    background:
                      templateCategory === cat.id && showTemplates
                        ? "rgba(139,92,246,0.1)"
                        : "var(--bg-elevated)",
                    color:
                      templateCategory === cat.id && showTemplates
                        ? "var(--accent-primary)"
                        : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.12s",
                  }}
                >
                  {cat.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setBatchItems([]);
                  }}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: batchMode
                      ? "1px solid rgba(251,191,36,0.4)"
                      : "1px solid var(--border-subtle)",
                    background: batchMode
                      ? "rgba(251,191,36,0.1)"
                      : "var(--bg-elevated)",
                    color: batchMode ? "var(--color-warning)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.12s",
                  }}
                >
                  <AppstoreOutlined style={{ marginRight: 4 }} />
                  {batchMode ? "批量模式" : "单条模式"}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      paddingTop: 6,
                    }}
                  >
                    {filteredTemplates.map((t) => (
                      <Tooltip key={t.id} title="点击应用" placement="top">
                        <button
                          onClick={() => applyTemplate(t)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-elevated)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 12,
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--border-accent)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--border-subtle)";
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                          }}
                        >
                          {t.icon} {t.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompt input */}
          <div className="gradient-border" style={{ marginBottom: 12 }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                batchMode
                  ? "输入多个 Prompt，每行一个：\n一只橘猫在窗台晒太阳\n赛博朋克风格的城市夜景"
                  : "描述你想要生成的图片..."
              }
              rows={batchMode ? 5 : 3}
              maxLength={50000}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 14,
                lineHeight: 1.6,
                resize: "none",
                fontFamily: "inherit",
                borderRadius: 16,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 14px 10px",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {batchMode
                  ? batchRunning
                    ? `生成中 ${batchDone}/${batchTotal}`
                    : `${prompt.split("\n").filter((l) => l.trim()).length} 条`
                  : prompt.length > 0
                    ? `${prompt.length}`
                    : ""}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span
                  style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}
                >
                  ⌘↵
                </span>
                {batchMode ? (
                  batchRunning ? (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={stopBatch}
                      style={{ borderRadius: 8, fontWeight: 600, height: 34 }}
                      size="small"
                    >
                      停止
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={startBatch}
                      disabled={!prompt.trim()}
                      className={prompt.trim() ? "pulse-glow" : ""}
                      style={{ borderRadius: 8, fontWeight: 600, height: 34 }}
                      size="small"
                    >
                      批量生成
                    </Button>
                  )
                ) : (
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={loading}
                    onClick={() => doGenerate()}
                    disabled={!prompt.trim()}
                    className={prompt.trim() && !loading ? "pulse-glow" : ""}
                    style={{ borderRadius: 8, fontWeight: 600, height: 34 }}
                    size="small"
                  >
                    生成
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick params */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <Segmented
              size="small"
              value={provider}
              onChange={(v) => setProvider(v as string)}
              options={Object.entries(PROVIDER_LABELS).map(
                ([value, label]) => ({
                  value,
                  label: (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: PROVIDER_COLORS[value],
                          display: "inline-block",
                        }}
                      />
                      {label}
                    </span>
                  ),
                })
              )}
            />
            <Segmented
              size="small"
              value={ar}
              onChange={(v) => setAr(v as string)}
              options={AR_OPTIONS}
            />
            <Segmented
              size="small"
              value={quality}
              onChange={(v) => setQuality(v as string)}
              options={[
                { label: "标准", value: "normal" },
                { label: "高清", value: "2k" },
              ]}
            />
            <Tooltip title="自定义模型">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                style={{ color: "var(--text-muted)" }}
              />
            </Tooltip>
          </div>

          {/* Batch results */}
          {batchItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {batchRunning && (
                <div style={{ marginBottom: 12 }}>
                  <Progress
                    percent={Math.round((batchDone / batchTotal) * 100)}
                    strokeColor="var(--accent-primary)"
                    size="small"
                  />
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    {batchDone}/{batchTotal} 完成
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10,
                }}
              >
                {batchItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    <ImageCard
                      src={
                        item.status === "success" && item.result
                          ? `data:image/png;base64,${item.result.image}`
                          : undefined
                      }
                      alt={item.prompt}
                      height={180}
                      showDownload={item.status === "success"}
                      onDownload={
                        item.status === "success" && item.result
                          ? () =>
                              handleDownload(
                                item.result!.image,
                                `batch-${idx + 1}.png`
                              )
                          : undefined
                      }
                      metadata={
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              marginBottom: 4,
                            }}
                          >
                            {item.prompt}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {item.status === "success" && (
                              <CheckCircleOutlined
                                style={{
                                  color: "var(--color-success)",
                                  fontSize: 10,
                                }}
                              />
                            )}
                            {item.status === "error" && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--color-error)",
                                }}
                              >
                                {item.error}
                              </span>
                            )}
                            {item.status === "success" && item.result && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                  marginLeft: "auto",
                                }}
                              >
                                {(item.result.duration_ms / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Single mode result */}
          {!batchMode && (
            <>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ marginBottom: 20 }}
                >
                  <LoadingCard height={380} />
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 10,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    正在生成中...
                  </div>
                </motion.div>
              )}
              <AnimatePresence>
                {result && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tooltip title="编辑 Prompt 重新生成">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => textareaRef.current?.focus()}
                          style={{ borderRadius: 7 }}
                        >
                          编辑
                        </Button>
                      </Tooltip>
                      <Tooltip
                        title={`换比例 (${AR_OPTIONS[(AR_OPTIONS.indexOf(ar) + 1) % AR_OPTIONS.length]})`}
                      >
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => {
                            const next =
                              AR_OPTIONS[
                                (AR_OPTIONS.indexOf(ar) + 1) %
                                  AR_OPTIONS.length
                              ];
                            setAr(next);
                            doGenerate(prompt, provider, next, quality);
                          }}
                          style={{ borderRadius: 7 }}
                        >
                          换比例
                        </Button>
                      </Tooltip>
                      <Tooltip
                        title={`换 Provider (${provider === "openai" ? "Anthropic" : "OpenAI"})`}
                      >
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => {
                            const next =
                              provider === "openai" ? "anthropic" : "openai";
                            setProvider(next);
                            doGenerate(prompt, next, ar, quality);
                          }}
                          style={{ borderRadius: 7 }}
                        >
                          换源
                        </Button>
                      </Tooltip>
                      <Tooltip
                        title={`换质量 (${quality === "2k" ? "标准" : "高清"})`}
                      >
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => {
                            const next = quality === "2k" ? "normal" : "2k";
                            setQuality(next);
                            doGenerate(prompt, provider, ar, next);
                          }}
                          style={{ borderRadius: 7 }}
                        >
                          换质量
                        </Button>
                      </Tooltip>
                    </div>
                    <ImageCard
                      src={`data:image/png;base64,${result.image}`}
                      alt="生成结果"
                      showDownload
                      onDownload={() => handleDownload(result.image)}
                      actions={
                        <>
                          <Button
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(prompt);
                              message.success("已复制 Prompt");
                            }}
                            style={{ borderRadius: 7 }}
                          >
                            复制 Prompt
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => doGenerate()}
                            style={{ borderRadius: 7 }}
                          >
                            重新生成
                          </Button>
                        </>
                      }
                      metadata={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            padding: "6px 10px",
                          }}
                        >
                          <ProviderBadge provider={result.provider} />
                          <Tag
                            style={{
                              margin: 0,
                              fontSize: 10,
                              background: "var(--bg-elevated)",
                              borderColor: "var(--border-subtle)",
                            }}
                          >
                            {result.model}
                          </Tag>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <ClockCircleOutlined />
                            {(result.duration_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {!result && !loading && (
                <EmptyState
                  {...EmptyStates.noRecords.props}
                  description="输入描述或选择模板，开始创作"
                  icon={
                    <PictureOutlined
                      style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}
                    />
                  }
                  center={false}
                  style={{ padding: "48px 0" }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
