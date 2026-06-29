"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthModal } from "@/components/AuthContext";
import type { GenerateParams } from "./useGenerate";

interface BatchItem {
  prompt: string;
  status: "pending" | "running" | "success" | "error";
  result?: { image: string; provider: string; model: string; duration_ms: number };
  error?: string;
}

export function useBatchGenerate() {
  const authModal = useAuthModal();
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);

  const startBatch = useCallback(
    async (promptLines: string[], params: Omit<GenerateParams, "prompt">) => {
      if (promptLines.length === 0) return;

      const isAuthenticated = await authModal.requireAuth({
        action: "批量生成图片",
      });
      if (!isAuthenticated) return;

      const items: BatchItem[] = promptLines.map((p) => ({
        prompt: p,
        status: "pending" as const,
      }));
      setBatchItems(items);
      setBatchRunning(true);
      batchAbortRef.current = false;

      const { provider, model, ar, quality } = params;

      for (let i = 0; i < items.length; i++) {
        if (batchAbortRef.current) break;

        setBatchItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "running" } : item
          )
        );

        try {
          const body: Record<string, string> = {
            prompt: promptLines[i],
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
    },
    [authModal]
  );

  const stopBatch = useCallback(() => {
    batchAbortRef.current = true;
    setBatchRunning(false);
  }, []);

  const clearBatch = useCallback(() => setBatchItems([]), []);

  const batchDone = batchItems.filter(
    (i) => i.status === "success" || i.status === "error"
  ).length;
  const batchTotal = batchItems.length;

  return {
    batchItems,
    batchRunning,
    batchDone,
    batchTotal,
    startBatch,
    stopBatch,
    clearBatch,
  };
}

export type { BatchItem };
