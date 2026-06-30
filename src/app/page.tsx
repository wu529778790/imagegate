"use client";

import { useState, useEffect, useRef } from "react";
import {
  HistorySidebar,
  PromptInput,
  TemplateSelector,
  GenerateParams,
  GenerateResultView,
  BatchResults,
  useGenerate,
  useBatchGenerate,
  useRecords,
} from "@/components/home";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { AR_OPTIONS } from "@/types";
import type { AspectRatio, Quality } from "@/types";
import { downloadImage } from "@/lib/utils";
import styles from "./Home.module.css";

export default function HomePage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [ar, setAr] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("2k");
  const [prompt, setPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [batchMode, setBatchMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { loading, result, generate, clearResult } = useGenerate();
  const { batchItems, batchRunning, batchDone, batchTotal, startBatch, stopBatch, clearBatch } =
    useBatchGenerate();
  const { records, recordsLoading, page, total, setPage, loadRecords, handleDelete } =
    useRecords();

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

  const handleGenerate = async (overrides?: Partial<{ prompt: string; provider: string; ar: string; quality: string }>) => {
    const usePrompt = overrides?.prompt ?? prompt;
    const useProvider = overrides?.provider ?? provider;
    const useAr = overrides?.ar ?? ar;
    const useQuality = overrides?.quality ?? quality;

    await generate({
      prompt: usePrompt,
      provider: useProvider,
      model,
      ar: useAr,
      quality: useQuality,
    });
    loadRecords(1);
    setPage(1);
  };

  const handleBatchGenerate = async () => {
    const lines = prompt
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    await startBatch(lines, { provider, model, ar, quality });
    loadRecords(1);
    setPage(1);
  };

  const handleToggleBatch = () => {
    setBatchMode(!batchMode);
    clearBatch();
  };

  return (
    <div className={styles.layout}>
      <HistorySidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        records={records}
        loading={recordsLoading}
        page={page}
        total={total}
        onPageChange={setPage}
        onSelectPrompt={(p) => setPrompt(p)}
        onDelete={handleDelete}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <TemplateSelector
            value={prompt}
            onChange={setPrompt}
            batchMode={batchMode}
            onToggleBatch={handleToggleBatch}
          />

          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={() => (batchMode ? handleBatchGenerate() : handleGenerate())}
            loading={loading}
            batchMode={batchMode}
            batchRunning={batchRunning}
            batchDone={batchDone}
            batchTotal={batchTotal}
            onStopBatch={stopBatch}
          />

          <GenerateParams
            provider={provider}
            onProviderChange={(v) => {
              setProvider(v);
              clearResult();
            }}
            ar={ar}
            onArChange={(v) => {
              setAr(v);
              clearResult();
            }}
            quality={quality}
            onQualityChange={(v) => {
              setQuality(v);
              clearResult();
            }}
            model={model}
          />

          <BatchResults
            items={batchItems}
            running={batchRunning}
            done={batchDone}
            total={batchTotal}
            onDownload={downloadImage}
          />

          {!batchMode && (
            <GenerateResultView
              result={result}
              loading={loading}
              prompt={prompt}
              provider={provider}
              ar={ar}
              quality={quality}
              onRegenerate={handleGenerate}
              textareaRef={textareaRef}
            />
          )}
        </div>
      </main>
    </div>
  );
}
