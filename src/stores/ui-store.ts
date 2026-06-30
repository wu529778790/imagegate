/**
 * Zustand store for global UI state.
 * Manages modal visibility, theme preference, and other UI-only state.
 */

import { create } from "zustand";

interface UIState {
  settingsModalOpen: boolean;
  historyModalOpen: boolean;

  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openHistoryModal: () => void;
  closeHistoryModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  settingsModalOpen: false,
  historyModalOpen: false,

  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  openHistoryModal: () => set({ historyModalOpen: true }),
  closeHistoryModal: () => set({ historyModalOpen: false }),
}));
