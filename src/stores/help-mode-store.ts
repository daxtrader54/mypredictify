import { create } from 'zustand';

interface HelpModeState {
  isActive: boolean;
  toggle: () => void;
  deactivate: () => void;
}

export const useHelpModeStore = create<HelpModeState>()((set) => ({
  isActive: false,
  toggle: () => set((s) => ({ isActive: !s.isActive })),
  deactivate: () => set({ isActive: false }),
}));
