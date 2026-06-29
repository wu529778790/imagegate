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

const AR_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export default function HomePage() {
  // Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [ar, setAr] = useState("1:1");
  const [quality, setQuality] = useState("2k");
  const [prompt, setPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [batchMode, setBatchMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { loading, result, generate, clearResult } = useGenerate();
  const { batchItems, batchRunning, batchDone, batchTotal, startBatch, stopBatch, clearBatch } =
    useBatchGenerate();
  const { records, recordsLoading, page, total, setPage, loadRecords, handleDelete } =
    useRecords();

  // Load settings
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

  // Handlers
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

  const handleDownload = (base64: string, name?: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = name || `imagegate-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="home-layout">
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

      {/* Main content */}
      <main className="home-main">
        <div className="home-content">
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

          {/* Batch results */}
          <BatchResults
            items={batchItems}
            running={batchRunning}
            done={batchDone}
            total={batchTotal}
            onDownload={handleDownload}
          />

          {/* Single result */}
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

      <style jsx>{`
        .home-layout {
          display: flex;
          height: calc(100vh - 52px);
          overflow: hidden;
        }
        .home-main {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 20px;
        }
        .home-content {
          width: 100%;
          max-width: 680px;
        }
      `}</style>
    </div>
  );
}
