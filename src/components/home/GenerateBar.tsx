"use client";

import React from "react";
import { Button, Input, Select, App } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useGenerateStore } from "@/stores/generate-store";
import { useGenerateMutation } from "@/lib/api/hooks";
import { useAuthModal } from "@/components/AuthContext";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/types";
import { AR_OPTIONS, QUALITY_OPTIONS } from "@/types/generation";
import { formatMs } from "@/lib/format";
import styles from "./GenerateBar.module.css";

const { TextArea } = Input;

export function GenerateBar() {
  const { message } = App.useApp();
  const authModal = useAuthModal();

  const provider = useGenerateStore((s) => s.provider);
  const model = useGenerateStore((s) => s.model);
  const ar = useGenerateStore((s) => s.ar);
  const quality = useGenerateStore((s) => s.quality);
  const prompt = useGenerateStore((s) => s.prompt);
  const setPrompt = useGenerateStore((s) => s.setPrompt);
  const results = useGenerateStore((s) => s.results);
  const running = useGenerateStore((s) => s.running);
  const startTimer = useGenerateStore((s) => s.startTimer);
  const stopTimer = useGenerateStore((s) => s.stopTimer);
  const setResults = useGenerateStore((s) => s.setResults);
  const updateResult = useGenerateStore((s) => s.updateResult);

  const triggerMut = useGenerateMutation();

  const providerOptions = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));

  const handleSubmit = async () => {
    const text = prompt.trim();
    if (!text) {
      message.error("请输入生图提示词");
      return;
    }
    const authed = await authModal.requireAuth({ action: "生成图片" });
    if (!authed) return;

    const resultId = `gen-${Date.now()}-${results.length}`;
    startTimer();
    setResults([{ id: resultId, status: "pending" }]);

    try {
      const body = { prompt: text, provider, ar, quality, model: model || undefined };
      const data = await triggerMut.trigger(body);
      updateResult(resultId, {
        status: "success",
        image: { dataUrl: data.image, width: 1024, height: 1024, durationMs: data.duration_ms },
      });
      message.success(`生成成功 (${formatMs(data.duration_ms)})`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "生成失败";
      updateResult(resultId, { status: "failed", error: errMsg });
      message.error(errMsg);
    } finally {
      stopTimer();
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.main}>
        <TextArea
          className={styles.prompt}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述画面主体、风格、构图、光线和用途 (Ctrl+Enter 发送)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (e.metaKey || e.ctrlKey) handleSubmit();
          }}
        />
        <Button
          type="primary"
          icon={<PictureOutlined />}
          loading={running}
          disabled={!prompt.trim() || running}
          onClick={handleSubmit}
          className={styles.submitBtn}
        >
          生成
        </Button>
      </div>

      <div className={styles.params}>
        <div className={styles.paramGroup}>
          <span className={styles.paramLabel}>提供方</span>
          <Select
            className={styles.paramSelect}
            value={provider}
            onChange={(v) => useGenerateStore.getState().setProvider(v)}
            options={providerOptions.map((opt) => ({
              ...opt,
              label: (
                <span>
                  <span className={styles.dot} style={{ background: PROVIDER_COLORS[opt.value] || "#71717a" }} />
                  {opt.label}
                </span>
              ),
            }))}
            size="small"
          />
        </div>

        <div className={styles.paramGroup}>
          <span className={styles.paramLabel}>质量</span>
          <div className={styles.pills}>
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.pill} ${quality === opt.value ? styles.pillActive : ""}`}
                onClick={() => useGenerateStore.getState().setQuality(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.paramGroup}>
          <span className={styles.paramLabel}>比例</span>
          <div className={styles.pills}>
            {AR_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`${styles.pill} ${ar === opt ? styles.pillActive : ""}`}
                onClick={() => useGenerateStore.getState().setAr(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
