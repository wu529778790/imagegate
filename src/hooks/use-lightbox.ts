"use client";

import { create } from "zustand";

interface LightboxState {
  isOpen: boolean;
  images: string[];
  activeIndex: number;
  open: (images: string[], startIndex?: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useLightbox = create<LightboxState>((set, get) => ({
  isOpen: false,
  images: [],
  activeIndex: 0,
  open: (images, startIndex = 0) =>
    set({ isOpen: true, images, activeIndex: Math.max(0, Math.min(startIndex, images.length - 1)) }),
  close: () => set({ isOpen: false }),
  next: () => {
    const { activeIndex, images } = get();
    if (activeIndex < images.length - 1) set({ activeIndex: activeIndex + 1 });
  },
  prev: () => {
    const { activeIndex } = get();
    if (activeIndex > 0) set({ activeIndex: activeIndex - 1 });
  },
}));
