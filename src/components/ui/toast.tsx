import { useEffect } from 'react'
import { useToastStore } from './use-toast'

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const remove = useToastStore((state) => state.remove)

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((toast) =>
      setTimeout(() => remove(toast.id), toast.variant === 'destructive' ? 6000 : 4000)
    )
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [toasts, remove])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 text-sm shadow bg-white ${
            toast.variant === 'destructive' ? 'border-red-500 text-red-700' : 'border-slate-200'
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description && <p className="text-xs text-slate-500">{toast.description}</p>}
          <button className="mt-2 text-xs underline" onClick={() => remove(toast.id)}>
            Fermer
          </button>
        </div>
      ))}
    </div>
  )
}
