"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { App, Tag, Button } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useSettings } from "@/lib/api/hooks";
import { useGenerateStore, uid } from "@/stores/generate-store";
import type { AspectRatio, Quality } from "@/types/generation";
import { TaskCard, PendingCard, FailedCard } from "@/components/home/TaskCard";
import { HistoryStrip } from "@/components/home/HistoryStrip";
import { ReferenceStrip } from "@/components/home/ReferenceStrip";
import { GenerateBar } from "@/components/home/GenerateBar";
import styles from "./Home.module.css";

export default function HomePage() {
  const { message: msg } = App.useApp();
  const { data: settings } = useSettings();

  const results = useGenerateStore((s) => s.results);
  const running = useGenerateStore((s) => s.running);
  const bumpElapsed = useGenerateStore((s) => s.bumpElapsed);

  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  // Sync from settings (read default_provider / default_ar / default_quality)
  useEffect(() => {
    if (settings) {
      useGenerateStore.getState().resetFromSettings(settings);
    }
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed timer (visual only)
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(bumpElapsed, 500);
    return () => window.clearInterval(timer);
  }, [running, bumpElapsed]);

  // ── Log management ──

  const handleSelectToggle = useCallback(
    (id: string, checked: boolean) =>
      setSelectedLogIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id))),
    [],
  );

  const handleNewSession = useCallback(() => {
    useGenerateStore.getState().setPrompt("");
    useGenerateStore.getState().clearReferences();
    useGenerateStore.getState().setResults([]);
    setSelectedLogIds([]);
    setActiveLogId(null);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    // No-op for now — deletion happens via HistoryStrip checkbox mode in a future iteration
    setSelectedLogIds([]);
  }, []);

  return (
    <div className={styles.pageV2}>
      {/* ═══ TOP: History strip ═══ */}
      <HistoryStrip
        activeLogId={activeLogId}
        selectedLogIds={selectedLogIds}
        onSelectToggle={handleSelectToggle}
        onPreview={useCallback(
          (log) => {
            setActiveLogId(log.id);
            useGenerateStore.getState().setPrompt(log.prompt);
            useGenerateStore.getState().setProvider(log.provider);
            if (log.model) useGenerateStore.getState().setModel(log.model);
            if (log.ar) useGenerateStore.getState().setAr(log.ar as AspectRatio);
            if (log.quality) useGenerateStore.getState().setQuality(log.quality as Quality);
          },
          [],
        )}
        onNewSession={handleNewSession}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* ═══ CENTER: Results + Reference strip ═══ */}
      <main className={styles.center}>
        <ReferenceStrip />

        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>生成结果</h2>
            {running && <Tag className={styles.elapsedTag}>等待中…</Tag>}
          </div>

          {results.length > 0 ? (
            <div className={styles.resultGrid}>
              {results.map((r, i) => {
                if (r.status === "pending") return <PendingCard key={r.id} />;
                if (r.status === "failed")
                  return <FailedCard key={r.id} error={r.error || "生成失败"} onRetry={() => {}} />;
                return <TaskCard key={r.id} result={r} index={i} />;
              })}
            </div>
          ) : (
            <div className={styles.resultsEmpty}>
              <PictureOutlined className={styles.resultsEmptyIcon} />
              <div>还没有生成图片 — 在下方输入提示词开始</div>
            </div>
          )}
        </div>
      </main>

      {/* ═══ FIXED BOTTOM: Generate bar ═══ */}
      <GenerateBar />
    </div>
  );
}
