import * as React from 'react'
import { cn } from './utils'

type SelectContextValue = {
    value: string
    onValueChange: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

export function Select({
    value,
    onValueChange,
    children
}: {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
}) {
    return (
        <SelectContext.Provider value={{ value, onValueChange }}>
            {children}
        </SelectContext.Provider>
    )
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <button
            type="button"
            className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm',
                'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
        >
            {children}
        </button>
    )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext)
    return <span>{context?.value || placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white py1 shadow-lg">
            {children}
        </div>
    )
}

export function SelectItem({
    value,
    children
}: {
    value: string
    children: React.ReactNode
}) {
    const context = React.useContext(SelectContext)

    const handleClick = () => {
        context?.onValueChange(value)
    }

    const isSelected = context?.value === value

    return (
        <div
            onClick={handleClick}
            className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'hover:bg-slate-100 focus:bg-slate-100',
                isSelected && 'bg-slate-100 font-medium'
            )}
        >
            {children}
        </div>
    )
}
