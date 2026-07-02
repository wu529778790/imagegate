"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { App, Button, Image, Input, Select, Tag } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useSettings, useGenerateMutation } from "@/lib/api/hooks";
import { useAuthModal } from "@/components/AuthContext";
import { useGenerateStore } from "@/stores/generate-store";
import type { AspectRatio, Quality } from "@/types/generation";
import type { GenerateResponse } from "@/types/api";
import type { GenerateParams } from "@/types/generation";
import { ProviderBadge } from "@/components/ui";
import { ReferenceStrip } from "@/components/home/ReferenceStrip";
import { HistoryStrip } from "@/components/home/HistoryStrip";
import { TaskCard, PendingCard, FailedCard } from "@/components/home/TaskCard";
import { useDeleteRecord } from "@/lib/api/mutations";
import styles from "./Home.module.css";
import { formatMs } from "@/lib/format";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/types";
import { AR_OPTIONS, QUALITY_OPTIONS } from "@/types/generation";

const MONOTONIC: { v: number } = { v: 0 };

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export default function HomePage() {
  const { message: msg } = App.useApp();
  const authModal = useAuthModal();

  // Settings (SWR)
  const { data: settings } = useSettings();

  // Generate store (Zustand)
  const provider = useGenerateStore((s) => s.provider);
  const model = useGenerateStore((s) => s.model);
  const ar = useGenerateStore((s) => s.ar);
  const quality = useGenerateStore((s) => s.quality);
  const prompt = useGenerateStore((s) => s.prompt);
  const setPrompt = useGenerateStore((s) => s.setPrompt);
  const results = useGenerateStore((s) => s.results);
  const setResults = useGenerateStore((s) => s.setResults);
  const addResult = useGenerateStore((s) => s.addResult);
  const updateResult = useGenerateStore((s) => s.updateResult);
  const running = useGenerateStore((s) => s.running);
  const startTimer = useGenerateStore((s) => s.startTimer);
  const stopTimer = useGenerateStore((s) => s.stopTimer);
  const bumpElapsed = useGenerateStore((s) => s.bumpElapsed);
  const references = useGenerateStore((s) => s.references);
  const addReferences = useGenerateStore((s) => s.addReferences);

  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  const triggerMut = useGenerateMutation();
  const deleteRecordMut = useDeleteRecord();

  // Sync from settings (once mounted)
  useEffect(() => {
    if (settings) {
      // Smart detection handled by store.resetFromSettings — but we avoid calling it
      // directly here to allow the user's manual choices to persist.
    }
  }, [settings]);

  // Listen for "add result as reference" events bubbled from TaskCard
  useEffect(() => {
    const handler = (e: Event) => {
      const dataUrl = (e as CustomEvent<string>).detail;
      addReferences([{ id: `ref-from-result-${Date.now()}`, name: "result.png", dataUrl }]);
    };
    window.addEventListener("imagegate:addRef", handler);
    return () => window.removeEventListener("imagegate:addRef", handler);
  }, [addReferences]);

  // Elapsed timer (visual only)
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(bumpElapsed, 500);
    return () => window.clearInterval(timer);
  }, [running, bumpElapsed]);

  // ── Generation ──

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text) {
      msg.error("请输入生图提示词");
      return;
    }

    const authed = await authModal.requireAuth({ action: "生成图片" });
    if (!authed) return;

    MONOTONIC.v += 1;
    const resultId = `gen-${Date.now()}-${MONOTONIC.v}`;
    startTimer();
    setResults([{ id: resultId, status: "pending" }]);
    setActiveLogId(null);

    try {
      const body: GenerateParams = {
        prompt: text,
        provider,
        ar,
        quality,
        model: model || undefined,
      };

      const data = await triggerMut.trigger(body);

      const dims = await getImageDimensions(data.image);

      const item = {
        dataUrl: data.image,
        width: dims.width || 1024,
        height: dims.height || 1024,
        durationMs: data.duration_ms,
      };

      updateResult(resultId, { status: "success", image: item });
      msg.success(`生成成功 (${formatMs(data.duration_ms)})`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "生成失败";
      updateResult(resultId, { status: "failed", error: errMsg });
      msg.error(errMsg);
    } finally {
      stopTimer();
    }
  }, [prompt, provider, ar, quality, model, authModal, msg, startTimer, stopTimer, setResults, updateResult, triggerMut]);

  const handleRetryResult = useCallback(
    (index: number) => {
      if (!running) handleGenerate();
    },
    [handleGenerate, running],
  );

  // ── Log management ──

  const handleSelectToggle = useCallback(
    (id: string, checked: boolean) =>
      setSelectedLogIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id))),
    [],
  );

  const handleNewSession = useCallback(() => {
    setPrompt("");
    useGenerateStore.getState().clearReferences();
    setResults([]);
    setSelectedLogIds([]);
    setActiveLogId(null);
  }, [setPrompt, setResults]);

  const handleDeleteSelected = useCallback(() => {
    selectedLogIds.forEach((id) => {
      deleteRecordMut.trigger(Number(id)).catch(() => {});
    });
    setSelectedLogIds([]);
    if (activeLogId && selectedLogIds.includes(activeLogId)) {
      setActiveLogId(null);
      setResults([]);
    }
  }, [selectedLogIds, activeLogId, deleteRecordMut, setResults]);

  // ── Provider / AR / Quality options ──

  const providerOptions = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className={styles.page}>
      <main className={styles.layout}>
        {/* LEFT SIDEBAR */}
        <HistoryStrip
          activeLogId={activeLogId}
          selectedLogIds={selectedLogIds}
          onSelectToggle={handleSelectToggle}
          onPreview={useCallback(
            (log) => {
              setActiveLogId(log.id);
              setPrompt(log.prompt);
              useGenerateStore.getState().setProvider(log.provider);
              if (log.model) useGenerateStore.getState().setModel(log.model);
              if (log.ar) useGenerateStore.getState().setAr(log.ar as AspectRatio);
              if (log.quality) useGenerateStore.getState().setQuality(log.quality as Quality);
            },
            [setPrompt],
          )}
          onNewSession={handleNewSession}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* CENTER + RIGHT */}
        <section className={styles.workspace}>
          {/* CENTER: workbench */}
          <div className={styles.workbench}>
            <div className={styles.workbenchTitle}>
              <h1>生图工作台</h1>
            </div>

            {/* Prompt */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>提示词</span>
              </div>
              <Input.TextArea
                className={styles.promptTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="描述画面主体、风格、构图、光线和用途"
              />
            </div>

            {/* Reference images */}
            <ReferenceStrip />

            {/* Parameters */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>参数设置</span>
              </div>
              <div className={styles.paramsGrid}>
                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>提供方</span>
                  <Select
                    className={styles.modelSelect}
                    value={provider}
                    onChange={(v) => useGenerateStore.getState().setProvider(v)}
                    options={providerOptions.map((opt) => ({
                      ...opt,
                      label: (
                        <span className={styles.modelSelectItem}>
                          <span className={styles.modelDot} style={{ background: PROVIDER_COLORS[opt.value] || "#71717a" }} />
                          {opt.label}
                        </span>
                      ),
                    }))}
                  />
                </div>

                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>质量</span>
                  <div className={styles.paramPills}>
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.paramPill} ${quality === opt.value ? styles.paramPillActive : ""}`}
                        onClick={() => useGenerateStore.getState().setQuality(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.paramItem}>
                  <span className={styles.paramLabel}>尺寸比例</span>
                  <div className={styles.paramPills}>
                    {AR_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`${styles.paramPill} ${ar === opt ? styles.paramPillActive : ""}`}
                        onClick={() => useGenerateStore.getState().setAr(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className={styles.generateBtn}>
              <Button
                type="primary"
                size="large"
                icon={<PictureOutlined />}
                loading={running}
                disabled={!prompt.trim() || running}
                onClick={handleGenerate}
              >
                开始生成
              </Button>
            </div>
          </div>

          {/* RIGHT: results */}
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2>生成结果</h2>
              {running && <Tag className={styles.elapsedTag}>等待中…</Tag>}
            </div>

            {results.length > 0 ? (
              <div className={styles.resultGrid}>
                {results.map((r, i) => {
                  if (r.status === "pending") return <PendingCard key={r.id} />;
                  if (r.status === "failed") return <FailedCard key={r.id} error={r.error || "生成失败"} onRetry={() => handleRetryResult(i)} />;
                  return <TaskCard key={r.id} result={r} index={i} />;
                })}
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
    </div>
  );
}
