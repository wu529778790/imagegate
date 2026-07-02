"use client";

import { create } from "zustand";

interface FavoritesState {
  /** Names of all user-defined collections. */
  collections: string[];
  /** Currently active collection tab. */
  activeCollection: string;
  /** Set of record ids in the active collection (used for fast `isFavorite` checks). */
  favoriteIds: Set<number>;
  /** Whether the initial fetch has happened. */
  loaded: boolean;

  setCollections: (cols: string[]) => void;
  setActiveCollection: (col: string) => void;
  setFavoriteIds: (ids: number[]) => void;
  addFavoriteId: (id: number) => void;
  removeFavoriteId: (id: number) => void;
  setLoaded: (v: boolean) => void;
}

export const useFavoritesStore = create<FavoritesState>((set) => ({
  collections: ["默认"],
  activeCollection: "默认",
  favoriteIds: new Set<number>(),
  loaded: false,

  setCollections: (cols) => set({ collections: cols.length ? cols : ["默认"] }),
  setActiveCollection: (col) => set({ activeCollection: col }),
  setFavoriteIds: (ids) => set({ favoriteIds: new Set(ids) }),
  addFavoriteId: (id) =>
    set((s) => {
      const next = new Set(s.favoriteIds);
      next.add(id);
      return { favoriteIds: next };
    }),
  removeFavoriteId: (id) =>
    set((s) => {
      const next = new Set(s.favoriteIds);
      next.delete(id);
      return { favoriteIds: next };
    }),
  setLoaded: (v) => set({ loaded: v }),
}));
