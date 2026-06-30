/**
 * Zustand store for generation state.
 * Replaces the 8+ useState calls in HomePage with a single unified store.
 *
 * Design:
 * - UI state (provider, model, ar, quality, prompt, batchMode, sidebarOpen) lives here
 * - Generation loading/result state stays in the SWR mutation hook (useGenerateMutation)
 * - This store only manages form parameters and UI toggles
 */

import { create } from "zustand";
import type { AspectRatio, Quality } from "@/types/generation";

interface GenerateState {
  // Form params
  provider: string;
  model: string;
  ar: AspectRatio;
  quality: Quality;
  prompt: string;

  // UI toggles
  batchMode: boolean;
  sidebarOpen: boolean;

  // Actions
  setProvider: (v: string) => void;
  setModel: (v: string) => void;
  setAr: (v: AspectRatio) => void;
  setQuality: (v: Quality) => void;
  setPrompt: (v: string) => void;
  toggleBatchMode: () => void;
  toggleSidebar: () => void;
  resetFromSettings: (settings: Record<string, string>) => void;
}

export const useGenerateStore = create<GenerateState>((set) => ({
  provider: "openai",
  model: "",
  ar: "1:1",
  quality: "2k",
  prompt: "",
  batchMode: false,
  sidebarOpen: true,

  setProvider: (v) => set({ provider: v }),
  setModel: (_v) => set({ model: _v }),
  setAr: (v) => set({ ar: v }),
  setQuality: (v) => set({ quality: v }),
  setPrompt: (v) => set({ prompt: v }),
  toggleBatchMode: () => set((s) => ({ batchMode: !s.batchMode })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  resetFromSettings: (_settings) =>
    set({
      provider: _settings.default_provider || "openai",
      ar: (_settings.default_ar as AspectRatio) || "1:1",
      quality: (_settings.default_quality as Quality) || "2k",
    }),
}));
