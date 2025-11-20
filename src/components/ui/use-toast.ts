import { create } from 'zustand'

export type ToastVariant = 'default' | 'destructive'

type Toast = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastStore = {
  toasts: Toast[]
  enqueue: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  enqueue: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }]
    })),
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))

export function useToast() {
  const enqueue = useToastStore((state) => state.enqueue)
  return {
    toast: enqueue
  }
}
