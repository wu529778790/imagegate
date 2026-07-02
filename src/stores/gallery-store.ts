"use client";

import { create } from "zustand";
import type { GalleryFilterStatus } from "@/types/images";

/**
 * Gallery page UI state — managed by Zustand so the URL can sync to it later.
 * Data itself lives in SWR (`useFilteredImages`); this is pure UI state.
 */
interface GalleryState {
  statusFilter: GalleryFilterStatus;
  search: string;
  page: number;
  /** Which image id is open in the detail modal. null = closed. */
  detailImageId: number | null;
  /** Whether the detail modal is open. */
  detailOpen: boolean;

  setStatusFilter: (s: GalleryFilterStatus) => void;
  setSearch: (s: string) => void;
  setPage: (p: number) => void;
  openDetail: (id: number) => void;
  closeDetail: () => void;

  /** Reset everything except detail. Call when search/filter changes. */
  resetPagination: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  statusFilter: "all",
  search: "",
  page: 1,
  detailImageId: null,
  detailOpen: false,

  setStatusFilter: (s) => set({ statusFilter: s, page: 1 }),
  setSearch: (s) => set({ search: s, page: 1 }),
  setPage: (p) => set({ page: p }),
  openDetail: (id) => set({ detailImageId: id, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false, detailImageId: null }),

  resetPagination: () => set({ page: 1 }),
}));
