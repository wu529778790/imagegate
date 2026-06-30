"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { App, Button, Checkbox, Image, Input, Select, Tag, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  PictureOutlined,
  UploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  RetweetOutlined,
  LeftOutlined,
  RightOutlined,
  HistoryOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { useSettings } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useAuthModal } from "@/components/AuthContext";
import { useGenerateStore } from "@/stores/generate-store";
import { PROVIDER_LABELS, PROVIDER_COLORS, AR_OPTIONS, QUALITY_OPTIONS } from "@/types";
import type { AspectRatio, Quality } from "@/types/generation";
import type { GenerateResponse } from "@/types/api";

import styles from "./Home.module.css";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface ReferenceImage {
  id: string;
  name: string;
  dataUrl: string;
}

interface GenResult {
  id: string;
  status: "pending" | "success" | "failed";
  image?: { dataUrl: string; width: number; height: number; durationMs: number };
  error?: string;
}

interface GenLog {
  id: string;
  createdAt: number;
  title: string;
  prompt: string;
  time: string;
  provider: string;
  model: string;
  ar: string;
  quality: string;
  references: ReferenceImage[];
  durationMs: number;
  successCount: number;
  failCount: number;
  imageCount: number;
  status: "成功" | "失败";
  images: Array<{ dataUrl: string; width: number; height: number; durationMs: number }>;
  thumbnails: string[];
}

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const LOG_KEY = "imagegate:gen_logs";
const GENERATION_COUNT = 1;

let _idCounter = 0;
function uid(): string {
  _idCounter += 1;
  return `${Date.now()}-${_idCounter}`;
}

function moveInArray<T>(arr: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getDataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

function readLogs(): GenLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as GenLog[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: GenLog[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch { /* storage full — silently skip */ }
}

// ────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────

export default function HomePage() {
  const { message: msg } = App.useApp();
  const authModal = useAuthModal();
  const fileRef = useRef<HTMLInputElement>(null);

  // Settings (SWR)
  const { data: settings } = useSettings();

  // Generate store (Zustand)
  const store = useGenerateStore();

  // Local state
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [results, setResults] = useState<GenResult[]>([]);
  const [logs, setLogs] = useState<GenLog[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);

  // Sync from settings
  useEffect(() => {
    if (settings) store.resetFromSettings(settings);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load logs
  useEffect(() => {
    const sorted = readLogs().sort((a, b) => b.createdAt - a.createdAt);
    setLogs(sorted);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!running || !startedAt) return;
    const timer = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);

  // ── Reference Image Helpers ──

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const next: ReferenceImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      next.push({ id: uid(), name: file.name, dataUrl });
    }
    setReferences((prev) => [...prev, ...next]);
  }, []);

  const addFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      const blobs: Blob[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) blobs.push(await item.getType(type));
        }
      }
      if (!blobs.length) {
        msg.error("剪切板里没有可读取的图片");
        return;
      }
      const next = await Promise.all(
        blobs.map(async (blob, i) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { id: uid(), name: `clipboard-${i + 1}.png`, dataUrl };
        }),
      );
      setReferences((prev) => [...prev, ...next]);
      msg.success(`已读取 ${next.length} 张参考图`);
    } catch {
      msg.error("剪切板里没有可读取的图片");
    }
  }, [msg]);

  // ── Generation ──

  const generate = useCallback(async () => {
    const text = prompt.trim();
    if (!text) {
      msg.error("请输入生图提示词");
      return;
    }

    const authed = await authModal.requireAuth({ action: "生成图片" });
    if (!authed) return;

    setRunning(true);
    setElapsedMs(0);
    const batchStart = performance.now();
    setStartedAt(batchStart);
    setActiveLogId(null);

    const resultId = uid();
    setResults([{ id: resultId, status: "pending" }]);

    try {
      const body: Record<string, string> = {
        prompt: text,
        provider: store.provider,
        ar: store.ar,
        quality: store.quality,
      };
      if (store.model) body.model = store.model;

      const data = await apiClient.post<GenerateResponse>("/api/generate", body);
      const durationMs = performance.now() - batchStart;

      // Get image dimensions
      const dims = await getImageDimensions(data.image);
      const bytes = getDataUrlSize(data.image) || (data.image.startsWith("http") ? 0 : data.image.length);

      const generatedImage = {
        dataUrl: data.image,
        width: dims.width || 1024,
        height: dims.height || 1024,
        durationMs,
      };

      setResults([{ id: resultId, status: "success", image: generatedImage }]);
      msg.success(`生成成功 (${formatMs(durationMs)})`);

      // Save log
      const log: GenLog = {
        id: resultId,
        createdAt: Date.now(),
        title: text.slice(0, 20) || "未命名",
        prompt: text,
        time: new Date().toLocaleString("zh-CN", { hour12: false }),
        provider: store.provider,
        model: store.model,
        ar: store.ar,
        quality: store.quality,
        references: [...references],
        durationMs,
        successCount: 1,
        failCount: 0,
        imageCount: GENERATION_COUNT,
        status: "成功",
        images: [generatedImage],
        thumbnails: [data.image],
      };

      const updated = [log, ...readLogs()];
      saveLogs(updated);
      setLogs(updated.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "生成失败";
      setResults([{ id: resultId, status: "failed", error: errMsg }]);
      msg.error(errMsg);

      const log: GenLog = {
        id: resultId,
        createdAt: Date.now(),
        title: text.slice(0, 20) || "未命名",
        prompt: text,
        time: new Date().toLocaleString("zh-CN", { hour12: false }),
        provider: store.provider,
        model: store.model,
        ar: store.ar,
        quality: store.quality,
        references: [...references],
        durationMs: performance.now() - batchStart,
        successCount: 0,
        failCount: 1,
        imageCount: GENERATION_COUNT,
        status: "失败",
        images: [],
        thumbnails: [],
      };
      const updated = [log, ...readLogs()];
      saveLogs(updated);
      setLogs(updated.sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setRunning(false);
    }
  }, [prompt, store.provider, store.model, store.ar, store.quality, references, authModal, msg]);

  const retryResult = useCallback(
    (index: number) => {
      setResults((prev) => prev.map((r, i) => (i === index ? { id: uid(), status: "pending" as const } : r)));
      // Trigger regeneration
      setTimeout(() => {
        if (!running) generate();
      }, 100);
    },
    [generate, running],
  );

  // ── Log Management ──

  const createSession = useCallback(() => {
    setPrompt("");
    setReferences([]);
    setResults([]);
    setElapsedMs(0);
    setStartedAt(0);
    setSelectedLogIds([]);
    setActiveLogId(null);
  }, []);

  const previewLog = useCallback(
    (log: GenLog) => {
      setActiveLogId(log.id);
      setLogsDrawerOpen(false);
      setPrompt(log.prompt);
      setReferences(log.references || []);
      if (log.provider) store.setProvider(log.provider);
      if (log.model) store.setModel(log.model);
      if (log.ar) store.setAr(log.ar as AspectRatio);
      if (log.quality) store.setQuality(log.quality as Quality);
      setResults(
        log.images.map((img) => ({
          id: uid(),
          status: "success" as const,
          image: img,
        })),
      );
    },
    [store],
  );

  const deleteSelectedLogs = useCallback(() => {
    const remaining = readLogs().filter((l) => !selectedLogIds.includes(l.id));
    saveLogs(remaining);
    setLogs(remaining.sort((a, b) => b.createdAt - a.createdAt));
    if (activeLogId && selectedLogIds.includes(activeLogId)) {
      setActiveLogId(null);
      setResults([]);
    }
    setSelectedLogIds([]);
  }, [selectedLogIds, activeLogId]);

  const toggleSelectAll = useCallback(() => {
    if (selectedLogIds.length === logs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(logs.map((l) => l.id));
    }
  }, [logs, selectedLogIds]);

  // ── Image Actions ──

  const downloadImage = useCallback((dataUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const addResultToRef = useCallback((dataUrl: string, index: number) => {
    setReferences((prev) => [...prev, { id: uid(), name: `result-${index + 1}.png`, dataUrl }]);
    msg.success("已加入参考图");
  }, [msg]);

  // ── Model Options ──

  const providerOptions = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className={styles.page}>
      <main className={styles.layout}>
        {/* ═══════════ LEFT SIDEBAR ═══════════ */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>生成记录</span>
            <Tag className={styles.sidebarCount}>{logs.length}</Tag>
          </div>
          <div className={styles.sidebarToolbar}>
            <Button size="small" icon={<PlusOutlined />} onClick={createSession}>
              新建
            </Button>
            <Button
              size="small"
              icon={<PlusOutlined style={{ transform: "rotate(45deg)" }} />}
              disabled={!logs.length}
              onClick={toggleSelectAll}
            >
              {selectedLogIds.length === logs.length && logs.length > 0 ? "取消" : "全选"}
            </Button>
            <Popconfirm
              title={`确定删除选中的 ${selectedLogIds.length} 条记录？`}
              onConfirm={deleteSelectedLogs}
              okText="删除"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />} disabled={!selectedLogIds.length}>
                删除
              </Button>
            </Popconfirm>
          </div>
          <div className={styles.sidebarLogs}>
            <div className={styles.sidebarLogsInner}>
              {logs.map((log) => (
                <LogCard
                  key={log.id}
                  log={log}
                  selected={selectedLogIds.includes(log.id)}
                  active={activeLogId === log.id}
                  onToggle={(checked) =>
                    setSelectedLogIds((prev) =>
                      checked ? [...prev, log.id] : prev.filter((id) => id !== log.id),
                    )
                  }
                  onClick={() => previewLog(log)}
                />
              ))}
              {!logs.length && (
                <div className={styles.sidebarEmpty}>暂无生成记录</div>
              )}
            </div>
          </div>
        </aside>

        {/* ═══════════ CENTER + RIGHT ═══════════ */}
        <section className={styles.workspace}>
          {/* ═══ CENTER: Workbench ═══ */}
          <div className={styles.workbench}>
            <div className={styles.workbenchTitle}>
              <h1>生图工作台</h1>
              <div className={styles.mobileBtns}>
                <Button icon={<HistoryOutlined />} onClick={() => setLogsDrawerOpen(true)}>
                  记录
                </Button>
                <Button icon={<SettingOutlined />}>
                  参数
                </Button>
              </div>
            </div>

            {/* ── Prompt ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>提示词</span>
              </div>
              <Input.TextArea
                className={styles.promptTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={7}
                placeholder="描述画面主体、风格、构图、光线和用途"
                onPressEnter={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.metaKey || e.ctrlKey) generate();
                }}
              />
              <div className={styles.promptFooter}>
                <span className={styles.promptCount}>{prompt.length}</span>
              </div>
            </div>

            {/* ── Reference Images ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>参考图</span>
                <div className={styles.sectionActions}>
                  <Button size="small" icon={<CopyOutlined />} onClick={addFromClipboard}>
                    剪切板
                  </Button>
                  <Button size="small" icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>
                    上传
                  </Button>
                </div>
              </div>
              <div
                className={styles.refScroller}
                onWheel={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollWidth <= el.clientWidth) return;
                  e.preventDefault();
                  el.scrollLeft += e.deltaY;
                }}
              >
                {references.map((ref, idx) => (
                  <div key={ref.id} className={styles.refThumb}>
                    <img src={ref.dataUrl} alt={ref.name} />
                    <span className={styles.refThumbLabel}>{idx + 1}</span>
                    <div className={styles.refOrderBtns}>
                      <button
                        className={styles.refOrderBtn}
                        disabled={idx === 0}
                        onClick={() => setReferences((prev) => moveInArray(prev, idx, -1))}
                        aria-label="左移"
                      >
                        <LeftOutlined style={{ fontSize: 10 }} />
                      </button>
                      <button
                        className={styles.refOrderBtn}
                        disabled={idx === references.length - 1}
                        onClick={() => setReferences((prev) => moveInArray(prev, idx, 1))}
                        aria-label="右移"
                      >
                        <RightOutlined style={{ fontSize: 10 }} />
                      </button>
                    </div>
                    <button
                      className={styles.refThumbRemove}
                      onClick={() => setReferences((prev) => prev.filter((r) => r.id !== ref.id))}
                      aria-label="移除参考图"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!references.length && (
                  <div className={styles.refEmpty}>暂无参考图</div>
                )}
              </div>
            </div>

            {/* ── Model & Params ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>参数设置</span>
              </div>
              <div className={styles.paramsGrid}>
                {/* Model / Provider */}
                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>提供方</span>
                  <Select
                    className={styles.modelSelect}
                    value={store.provider}
                    onChange={(v) => store.setProvider(v)}
                    options={providerOptions.map((opt) => ({
                      ...opt,
                      label: (
                        <span className={styles.modelSelectItem}>
                          <span
                            className={styles.modelDot}
                            style={{ background: PROVIDER_COLORS[opt.value] || "#71717a" }}
                          />
                          {opt.label}
                        </span>
                      ),
                    }))}
                  />
                </div>

                {/* Quality */}
                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>质量</span>
                  <div className={styles.paramPills}>
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.paramPill} ${store.quality === opt.value ? styles.paramPillActive : ""}`}
                        onClick={() => store.setQuality(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>尺寸比例</span>
                  <div className={styles.paramPills}>
                    {AR_OPTIONS.map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        className={`${styles.paramPill} ${store.ar === ar ? styles.paramPillActive : ""}`}
                        onClick={() => store.setAr(ar)}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Generate Button ── */}
            <div className={styles.generateBtn}>
              <Button
                type="primary"
                size="large"
                icon={<PictureOutlined />}
                loading={running}
                disabled={!prompt.trim() || running}
                onClick={generate}
              >
                开始生成
              </Button>
            </div>
          </div>

          {/* ═══ RIGHT: Results ═══ */}
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2>生成结果</h2>
              {running && <Tag className={styles.elapsedTag}>等待 {formatMs(elapsedMs)}</Tag>}
            </div>

            {results.length > 0 ? (
              <div className={styles.resultGrid}>
                {results.map((result, idx) =>
                  result.status === "success" && result.image ? (
                    <ResultImageCard
                      key={result.id}
                      image={result.image}
                      index={idx}
                      onDownload={downloadImage}
                      onAddRef={addResultToRef}
                    />
                  ) : result.status === "failed" ? (
                    <FailedCard key={result.id} error={result.error || "生成失败"} onRetry={() => retryResult(idx)} />
                  ) : (
                    <PendingCard key={result.id} />
                  ),
                )}
              </div>
            ) : (
              <div className={styles.resultsEmpty}>
                <PictureOutlined className={styles.resultsEmptyIcon} />
                <div>还没有生成图片</div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenInput}
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────
// LogCard — single log entry in sidebar
// ────────────────────────────────────────────

function LogCard({
  log,
  selected,
  active,
  onToggle,
  onClick,
}: {
  log: GenLog;
  selected: boolean;
  active: boolean;
  onToggle: (checked: boolean) => void;
  onClick: () => void;
}) {
  const thumbs = (log.thumbnails || []).filter(Boolean).slice(0, 4);

  return (
    <button
      type="button"
      className={`${styles.logCard} ${active ? styles.logCardActive : ""}`}
      onClick={onClick}
    >
      <div className={styles.logCardInner}>
        <div className={styles.logCardInfo}>
          <Checkbox
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e: { target: { checked: boolean } }) => onToggle(e.target.checked)}
          />
          <div>
            <div className={styles.logCardTitle}>{log.title}</div>
            {thumbs.length > 0 && (
              <div className={styles.logCardThumbs}>
                {thumbs.map((src, i) => (
                  <img key={i} src={src} alt="" className={styles.logCardThumb} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.logCardMeta}>
          <div className={styles.logCardTags}>
            <Tag className={styles.logCardTag} color="blue">
              成功 {log.successCount}
            </Tag>
            {log.failCount > 0 && (
              <Tag className={styles.logCardTag} color="red">
                失败 {log.failCount}
              </Tag>
            )}
          </div>
          <div className={styles.logCardTags}>
            <Tag className={styles.logCardTag}>{log.imageCount} 张</Tag>
            <Tag className={styles.logCardTag} color="green">
              {formatMs(log.durationMs)}
            </Tag>
          </div>
          <div className={styles.logCardTags}>
            <Tag className={styles.logCardTag}>{log.time}</Tag>
          </div>
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────
// ResultImageCard — successful generation
// ────────────────────────────────────────────

function ResultImageCard({
  image,
  index,
  onDownload,
  onAddRef,
}: {
  image: { dataUrl: string; width: number; height: number; durationMs: number };
  index: number;
  onDownload: (dataUrl: string, index: number) => void;
  onAddRef: (dataUrl: string, index: number) => void;
}) {
  return (
    <div className={styles.resultCard}>
      <Image
        src={image.dataUrl}
        alt={`生成结果 ${index + 1}`}
        className={styles.resultCardImg}
        preview={{ mask: null }}
      />
      <div className={styles.resultCardInfo}>
        <div className={styles.resultCardMeta}>
          <span>{image.width}x{image.height}</span>
          <span>{formatBytes(getDataUrlSize(image.dataUrl))}</span>
          <span>{formatMs(image.durationMs)}</span>
        </div>
        <div className={styles.resultCardActions}>
          <Tooltip title="下载">
            <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownload(image.dataUrl, index)}>
              下载
            </Button>
          </Tooltip>
          <Tooltip title="加入参考图">
            <Button size="small" icon={<RetweetOutlined />} onClick={() => onAddRef(image.dataUrl, index)}>
              参考
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// PendingCard — loading state
// ────────────────────────────────────────────

function PendingCard() {
  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingCardInner}>
        <div className={styles.spinner} />
        <span>生成中</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// FailedCard — error state
// ────────────────────────────────────────────

function FailedCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className={styles.failedCard}>
      <div className={styles.failedCardInner}>
        <div className={styles.failedCardTitle}>生成失败</div>
        <div className={styles.failedCardError}>{error}</div>
      </div>
      <div className={styles.failedCardRetry}>
        <Button size="small" danger onClick={onRetry}>
          重试
        </Button>
      </div>
    </div>
  );
}

