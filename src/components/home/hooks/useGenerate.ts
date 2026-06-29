"use client";

import { useState, useCallback, useRef } from "react";
import { message } from "antd";
import { useAuthModal } from "@/components/AuthContext";

interface GenerateParams {
  prompt: string;
  provider: string;
  model: string;
  ar: string;
  quality: string;
}

interface GenerateResult {
  image: string;
  provider: string;
  model: string;
  duration_ms: number;
}

export function useGenerate() {
  const authModal = useAuthModal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generate = useCallback(
    async (params: GenerateParams) => {
      const { prompt, provider, model, ar, quality } = params;

      if (!prompt.trim()) {
        message.warning("请输入图片描述");
        return null;
      }

      const isAuthenticated = await authModal.requireAuth({
        action: "生成图片",
      });
      if (!isAuthenticated) return null;

      setLoading(true);
      try {
        const body: Record<string, string> = {
          prompt,
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
        if (!res.ok) throw new Error(data.error?.message || "生成失败");

        setResult(data);
        message.success(`生成成功 (${(data.duration_ms / 1000).toFixed(1)}s)`);
        return data;
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : "生成失败");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [authModal]
  );

  const clearResult = useCallback(() => setResult(null), []);

  return { loading, result, generate, clearResult, setResult };
}

export type { GenerateParams, GenerateResult };
