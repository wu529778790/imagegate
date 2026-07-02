"use client";

import { create } from "zustand";
import type { AspectRatio, Quality } from "@/types/generation";

/** One generated image result item. */
export interface ResultItem {
  id: string;
  status: "pending" | "success" | "failed";
  image?: {
    dataUrl: string;
    width: number;
    height: number;
    durationMs: number;
  };
  error?: string;
}

interface ReferenceImage {
  id: string;
  name: string;
  dataUrl: string;
}

interface GenerateState {
  // Form params
  provider: string;
  model: string;
  ar: AspectRatio;
  quality: Quality;
  prompt: string;

  // Reference images for the next / next+ generation
  references: ReferenceImage[];

  // UI toggles
  batchMode: boolean;
  sidebarOpen: boolean;

  // Results — the most recently generated images
  results: ResultItem[];

  // Elapsed timer state for the running generation
  running: boolean;
  startedAt: number;
  elapsedMs: number;

  // Actions (form)
  setProvider: (v: string) => void;
  setModel: (v: string) => void;
  setAr: (v: AspectRatio) => void;
  setQuality: (v: Quality) => void;
  setPrompt: (v: string) => void;
  toggleBatchMode: () => void;
  toggleSidebar: () => void;
  resetFromSettings: (settings: Record<string, string>) => void;

  // Actions (references)
  addReferences: (refs: ReferenceImage[]) => void;
  removeReference: (id: string) => void;
  moveReference: (index: number, offset: number) => void;
  clearReferences: () => void;

  // Actions (results)
  setResults: (r: ResultItem[]) => void;
  clearResults: () => void;
  addResult: (r: ResultItem) => void;
  updateResult: (id: string, patch: Partial<Omit<ResultItem, "id">>) => void;

  // Actions (timer)
  startTimer: () => void;
  stopTimer: () => void;
  bumpElapsed: () => void;
}

const MONOTONIC: { value: number } = { value: 0 };
function uid(): string {
  MONOTONIC.value += 1;
  return `${Date.now()}-${MONOTONIC.value}`;
}

export { uid };

export const useGenerateStore = create<GenerateState>((set) => ({
  provider: "openai",
  model: "",
  ar: "1:1",
  quality: "2k",
  prompt: "",
  references: [],
  batchMode: false,
  sidebarOpen: true,
  results: [],
  running: false,
  startedAt: 0,
  elapsedMs: 0,

  setProvider: (v) => set({ provider: v }),
  setModel: (v) => set({ model: v }),
  setAr: (v) => set({ ar: v }),
  setQuality: (v) => set({ quality: v }),
  setPrompt: (v) => set({ prompt: v }),
  toggleBatchMode: () => set((s) => ({ batchMode: !s.batchMode })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  resetFromSettings: (settings) => {
    let provider = settings.default_provider || "";
    if (!provider) {
      const availableProviders = ["anthropic", "openai"] as const;
      for (const p of availableProviders) {
        if (settings[`${p}_api_key`]) {
          provider = p;
          break;
        }
      }
    }
    set({
      provider: provider || "openai",
      ar: (settings.default_ar as AspectRatio) || "1:1",
      quality: (settings.default_quality as Quality) || "2k",
    });
  },

  addReferences: (refs) => set((s) => ({ references: [...s.references, ...refs] })),
  removeReference: (id) => set((s) => ({ references: s.references.filter((r) => r.id !== id) })),
  moveReference: (index, offset) =>
    set((s) => {
      const target = index + offset;
      if (target < 0 || target >= s.references.length) return s;
      const next = [...s.references];
      [next[index], next[target]] = [next[target], next[index]];
      return { references: next };
    }),
  clearReferences: () => set({ references: [] }),

  setResults: (r) => set({ results: r }),
  clearResults: () => set({ results: [] }),
  addResult: (r) => set((s) => ({ results: [...s.results, r] })),
  updateResult: (id, patch) =>
    set((s) => ({ results: s.results.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

  startTimer: () => set({ running: true, startedAt: Date.now(), elapsedMs: 0 }),
  stopTimer: () => set({ running: false }),
  bumpElapsed: () => set((s) => ({ elapsedMs: s.startedAt ? Date.now() - s.startedAt : 0 })),
}));
