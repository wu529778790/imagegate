"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button, Input, Segmented, Tag, message, Pagination, Popconfirm, Tooltip, Progress } from "antd";
import { DownloadOutlined, ThunderboltOutlined, ClockCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined, CopyOutlined, ReloadOutlined, PictureOutlined, EditOutlined, SwapOutlined, StopOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from "@/lib/prompts";
import { ImageCard } from "@/components/ui/ImageCard";
import { EmptyState, EmptyStates } from "@/components/ui/EmptyState";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatusBadge, ProviderBadge } from "@/components/ui/TagBadge";
import { cn, formatDuration } from "@/lib/ui";

const PROVIDER_COLORS: Record<string, string> = { openai: "#10a37f", anthropic: "#d97706" };
const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI 兼容", anthropic: "Anthropic" };
const AR_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

interface RecordItem { id: number; provider: string; model: string; prompt: string; status: string; duration_ms: number; created_at: string; }
interface GenerateResult { image: string; provider: string; model: string; duration_ms: number; }
interface BatchItem { prompt: string; status: "pending" | "running" | "success" | "error"; result?: GenerateResult; error?: string; }

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<string>("openai");
  const [model, setModel] = useState("");
  const [ar, setAr] = useState("1:1");
  const [quality, setQuality] = useState("2k");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showParams, setShowParams] = useState(false);
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
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setSettings(data);
      if (data.default_provider) setProvider(data.default_provider);
      if (data.default_ar) setAr(data.default_ar);
      if (data.default_quality) setQuality(data.default_quality);
    });
  }, []);

  const loadRecords = useCallback(async (p = 1) => {
    setRecordsLoading(true);
    try { const res = await fetch(`/api/records?page=${p}&pageSize=20`); const data = await res.json(); setRecords(data.records || []); setTotal(data.total || 0); } catch { /* */ } finally { setRecordsLoading(false); }
  }, []);

  useEffect(() => { loadRecords(page); }, [page, loadRecords]);

  const doGenerate = async (p?: string, prov?: string, ratio?: string, q?: string) => {
    const usePrompt = p ?? prompt; const useProvider = prov ?? provider; const useAr = ratio ?? ar; const useQuality = q ?? quality;
    if (!usePrompt.trim()) { message.warning("请输入图片描述"); return; }
    setLoading(true);
    try {
      const body: Record<string, string> = { prompt: usePrompt, provider: useProvider, ar: useAr, quality: useQuality };
      if (model) body.model = model;
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "生成失败");
      setResult(data); message.success(`生成成功 (${(data.duration_ms / 1000).toFixed(1)}s)`);
      loadRecords(1); setPage(1);
    } catch (err: unknown) { message.error(err instanceof Error ? err.message : "生成失败"); } finally { setLoading(false); }
  };

  // Batch generation
  const startBatch = async () => {
    const lines = prompt.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { message.warning("请输入至少一个 Prompt（每行一个）"); return; }
    const items: BatchItem[] = lines.map((p) => ({ prompt: p, status: "pending" as const }));
    setBatchItems(items);
    setBatchRunning(true);
    batchAbortRef.current = false;

    for (let i = 0; i < items.length; i++) {
      if (batchAbortRef.current) break;
      setBatchItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "running" } : item));

      try {
        const body: Record<string, string> = { prompt: lines[i], provider, ar, quality };
        if (model) body.model = model;
        const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "失败");
        setBatchItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "success", result: data } : item));
      } catch (err: unknown) {
        setBatchItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "error", error: err instanceof Error ? err.message : "失败" } : item));
      }
    }
    setBatchRunning(false);
    loadRecords(1); setPage(1);
  };

  const stopBatch = () => { batchAbortRef.current = true; setBatchRunning(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); batchMode ? startBatch() : doGenerate(); }
  };

  const handleDownload = (base64: string, name?: string) => {
    const link = document.createElement("a"); link.href = `data:image/png;base64,${base64}`; link.download = name || `imagegate-${Date.now()}.png`; link.click();
  };

  const handleDelete = async (id: number) => { await fetch(`/api/records?id=${id}`, { method: "DELETE" }); loadRecords(page); };

  const applyTemplate = (t: PromptTemplate) => {
    if (batchMode) { setPrompt((prev) => prev ? prev + "\n" + t.prompt : t.prompt); }
    else { setPrompt(t.prompt); }
    textareaRef.current?.focus();
  };

  const filteredTemplates = PROMPT_TEMPLATES.filter((t) => t.category === templateCategory);
  const batchDone = batchItems.filter((i) => i.status === "success" || i.status === "error").length;
  const batchTotal = batchItems.length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,15,0.95)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 600, fontSize: 14, color: "#e4e4e7" }}>历史记录</div>
            <div style={{ flex: 1, overflow: "auto", padding: "8px 10px" }}>
              {recordsLoading ? (
                <LoadingCard count={5} height={80} />
              ) : records.length === 0 ? (
                <EmptyState {...EmptyStates.noRecords.props} style={{ marginTop: 60 }} />
              ) : (
                records.map((item) => (
                  <div key={item.id} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", marginBottom: 6, cursor: "pointer", transition: "all 0.15s", background: "rgba(255,255,255,0.02)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
                    onClick={() => setPrompt(item.prompt)}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary, #a1a1aa)", lineHeight: 1.5, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.prompt}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <ProviderBadge provider={item.provider} size="small" />
                      <StatusBadge status={item.status === "success" ? "success" : "failed"} />
                      <span style={{ fontSize: 10, color: "var(--text-muted, #52525b)", marginLeft: "auto" }}>{new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <Popconfirm title="确认删除？" onConfirm={() => handleDelete(item.id)} okText="删除" cancelText="取消">
                        <DeleteOutlined style={{ fontSize: 10, color: "var(--text-muted, #52525b)", cursor: "pointer" }} onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  </div>
                ))
              )}
            </div>
            {total > 20 && <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}><Pagination size="small" current={page} total={total} pageSize={20} onChange={setPage} showSizeChanger={false} /></div>}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: "absolute", left: sidebarOpen ? 320 : 0, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 20, height: 48, background: "rgba(20,20,32,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0 8px 8px 0", color: "#71717a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "left 0.2s" }}>
        {sidebarOpen ? <LeftOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
      </button>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 720 }}>

          {/* Template chips */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setTemplateCategory(cat.id)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: templateCategory === cat.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.06)", background: templateCategory === cat.id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)", color: templateCategory === cat.id ? "#818cf8" : "#71717a", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <button onClick={() => { setBatchMode(!batchMode); setBatchItems([]); }}
                  style={{ padding: "4px 10px", borderRadius: 6, border: batchMode ? "1px solid rgba(234,179,8,0.4)" : "1px solid rgba(255,255,255,0.06)", background: batchMode ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.02)", color: batchMode ? "#eab308" : "#71717a", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                  📦 {batchMode ? "批量模式" : "单条模式"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {filteredTemplates.map((t) => (
                <Tooltip key={t.id} title="点击应用模板" placement="top">
                  <button onClick={() => applyTemplate(t)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#a1a1aa", cursor: "pointer", fontSize: 12, transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; e.currentTarget.style.color = "#e4e4e7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#a1a1aa"; }}>
                    {t.icon} {t.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div className="gradient-border" style={{ marginBottom: 16 }}>
            <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={batchMode ? "输入多个 Prompt，每行一个：\n一只橘猫在窗台晒太阳\n赛博朋克风格的城市夜景\n水彩风格的山水画" : "描述你想要生成的图片...\n\n试试点击上方的模板快速开始"}
              rows={batchMode ? 6 : 4} maxLength={50000}
              style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", outline: "none", color: "#e4e4e7", fontSize: 15, lineHeight: 1.6, resize: "none", fontFamily: "inherit", borderRadius: 16 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 12px" }}>
              <span style={{ fontSize: 11, color: "#52525b" }}>
                {batchMode ? (
                  batchRunning ? `批量生成中 ${batchDone}/${batchTotal}` : `${prompt.split("\n").filter((l) => l.trim()).length} 条 · ⌘ + Enter 开始`
                ) : (
                  prompt.length > 0 ? `${prompt.length}/10000` : "⌘ + Enter 生成"
                )}
              </span>
              {batchMode ? (
                batchRunning ? (
                  <Button danger icon={<StopOutlined />} onClick={stopBatch} style={{ borderRadius: 10, fontWeight: 600, height: 38 }}>停止</Button>
                ) : (
                  <Button type="primary" icon={<ThunderboltOutlined />} onClick={startBatch} disabled={!prompt.trim()}
                    className={prompt.trim() ? "pulse-glow" : ""} style={{ borderRadius: 10, fontWeight: 600, height: 38 }}>批量生成</Button>
                )
              ) : (
                <Button type="primary" icon={<ThunderboltOutlined />} loading={loading} onClick={() => doGenerate()} disabled={!prompt.trim()}
                  className={prompt.trim() && !loading ? "pulse-glow" : ""} style={{ borderRadius: 10, fontWeight: 600, height: 38 }}>生成</Button>
              )}
            </div>
          </div>

          {/* Quick params */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
            <Segmented size="small" value={provider} onChange={(v) => setProvider(v as string)}
              options={Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label: <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: PROVIDER_COLORS[value], display: "inline-block" }} />{label}</span> }))} />
            <Segmented size="small" value={ar} onChange={(v) => setAr(v as string)} options={AR_OPTIONS} />
            <Segmented size="small" value={quality} onChange={(v) => setQuality(v as string)} options={[{ label: "标准", value: "normal" }, { label: "高清", value: "2k" }]} />
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setShowParams(!showParams)} style={{ color: "#71717a" }} />
          </div>

          {/* Advanced params */}
          <AnimatePresence>
            {showParams && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden", marginBottom: 16 }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 12, color: "#71717a", marginBottom: 8 }}>Model</div>
                  <Input size="small" value={model} onChange={(e) => setModel(e.target.value)} placeholder={settings[`${provider}_model`] || "输入模型名称"} style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============ BATCH MODE RESULTS ============ */}
          {batchItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {batchRunning && (
                <div style={{ marginBottom: 16 }}>
                  <Progress percent={Math.round((batchDone / batchTotal) * 100)} strokeColor="var(--accent-primary, #6366f1)" />
                  <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary, #71717a)", marginTop: 4 }}>{batchDone}/{batchTotal} 完成</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {batchItems.map((item, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 }}>
                    <ImageCard
                      src={item.status === "success" && item.result ? `data:image/png;base64,${item.result.image}` : undefined}
                      alt={item.prompt}
                      height={200}
                      showDownload={item.status === "success"}
                      onDownload={item.status === "success" && item.result ? () => handleDownload(item.result!.image, `batch-${idx + 1}.png`) : undefined}
                      metadata={
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary, #a1a1aa)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 4 }}>{item.prompt}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {item.status === "success" && <CheckCircleOutlined style={{ color: "var(--color-success, #22c55e)", fontSize: 10 }} />}
                            {item.status === "error" && <span style={{ fontSize: 10, color: "var(--color-error, #ef4444)" }}>{item.error}</span>}
                            {item.status === "success" && item.result && <span style={{ fontSize: 10, color: "var(--text-muted, #52525b)", marginLeft: "auto" }}>{(item.result.duration_ms / 1000).toFixed(1)}s</span>}
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ============ SINGLE MODE RESULT ============ */}
          {!batchMode && (
            <>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 24 }}>
                  <LoadingCard height={400} />
                  <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--text-secondary, #71717a)" }}>正在生成中...</div>
                </motion.div>
              )}
              <AnimatePresence>
                {result && !loading && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <Tooltip title="编辑 Prompt 重新生成"><Button size="small" icon={<EditOutlined />} onClick={() => textareaRef.current?.focus()} style={{ borderRadius: 8 }}>编辑 Prompt</Button></Tooltip>
                      <Tooltip title="换个比例再试"><Button size="small" icon={<SwapOutlined />} onClick={() => { const next = AR_OPTIONS[(AR_OPTIONS.indexOf(ar) + 1) % AR_OPTIONS.length]; setAr(next); doGenerate(prompt, provider, next, quality); }} style={{ borderRadius: 8 }}>换比例 ({AR_OPTIONS[(AR_OPTIONS.indexOf(ar) + 1) % AR_OPTIONS.length]})</Button></Tooltip>
                      <Tooltip title="换 Provider 再试"><Button size="small" icon={<SwapOutlined />} onClick={() => { const next = provider === "openai" ? "anthropic" : "openai"; setProvider(next); doGenerate(prompt, next, ar, quality); }} style={{ borderRadius: 8 }}>换 Provider ({provider === "openai" ? "Anthropic" : "OpenAI"})</Button></Tooltip>
                      <Tooltip title="换质量再试"><Button size="small" icon={<SwapOutlined />} onClick={() => { const next = quality === "2k" ? "normal" : "2k"; setQuality(next); doGenerate(prompt, provider, ar, next); }} style={{ borderRadius: 8 }}>换质量 ({quality === "2k" ? "标准" : "高清"})</Button></Tooltip>
                    </div>
                    <ImageCard
                      src={`data:image/png;base64,${result.image}`}
                      alt="生成结果"
                      showDownload
                      onDownload={() => handleDownload(result.image)}
                      actions={
                        <>
                          <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(prompt); message.success("已复制 Prompt"); }} style={{ borderRadius: 8 }}>复制 Prompt</Button>
                          <Button icon={<ReloadOutlined />} onClick={() => doGenerate()} style={{ borderRadius: 8 }}>重新生成</Button>
                        </>
                      }
                      metadata={
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px" }}>
                          <ProviderBadge provider={result.provider} />
                          <Tag style={{ margin: 0, fontSize: 10, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>{result.model}</Tag>
                          <span style={{ fontSize: 12, color: "var(--text-secondary, #71717a)", display: "flex", alignItems: "center", gap: 4 }}><ClockCircleOutlined />{(result.duration_ms / 1000).toFixed(1)}s</span>
                        </div>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {!result && !loading && (
                <EmptyState
                  {...EmptyStates.noRecords.props}
                  description="选择模板或输入描述，开始创作"
                  icon={<PictureOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />}
                  center={false}
                  style={{ padding: "60px 0" }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
