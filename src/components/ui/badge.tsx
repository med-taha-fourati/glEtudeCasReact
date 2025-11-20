import { cn } from './utils'

type Variant = 'default' | 'secondary' | 'outline' | 'destructive'

const styles: Record<Variant, string> = {
  default: 'bg-slate-900 text-white',
  secondary: 'bg-slate-100 text-slate-900',
  outline: 'border border-slate-300 text-slate-700',
  destructive: 'bg-red-600 text-white'
}

export function Badge({
  children,
  variant = 'default',
  className
}: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
