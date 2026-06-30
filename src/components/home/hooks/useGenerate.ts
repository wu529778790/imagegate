/**
 * useGenerate — Single image generation hook.
 *
 * Uses apiClient for the POST request (consistent error handling).
 * Auth check via AuthContext remains.
 * No local type definitions — all imported from @/types.
 */

'use client';

import { useState, useCallback } from "react";
import { message } from "antd";
import { useAuthModal } from "@/components/AuthContext";
import { apiClient } from "@/lib/api/client";
import type { GenerateParams } from "@/types/generation";
import type { GenerateResponse } from "@/types/api";

export function useGenerate() {
  const authModal = useAuthModal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

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

        const data = await apiClient.post<GenerateResponse>("/api/generate", body);
        setResult(data);
        message.success(`生成成功 (${(data.duration_ms / 1000).toFixed(1)}s)`);
        return data;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "生成失败";
        message.error(msg);
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

// Re-export types from @/types for backward compatibility during migration
export type { GenerateParams, GenerateResponse };
