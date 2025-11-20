import { create } from 'zustand'

type UIState = {
  globalError: string | null
  setGlobalError: (message: string | null) => void
  clearGlobalError: () => void
}

export const useUIStore = create<UIState>((set) => ({
  globalError: null,
  setGlobalError: (message) => set({ globalError: message }),
  clearGlobalError: () => set({ globalError: null })
}))
