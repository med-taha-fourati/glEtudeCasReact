import { Button } from './button'
import { AlertCircle } from 'lucide-react'

type LinkedItem = {
    type: string
    count: number
}

type ConfirmDialogProps = {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    linkedItems?: LinkedItem[]
    isLoading?: boolean
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    linkedItems,
    isLoading = false
}: ConfirmDialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                    <div className="bg-red-100 rounded-full p-2">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
                        <p className="text-gray-600 text-sm">{description}</p>
                    </div>
                </div>

                {linkedItems && linkedItems.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                        <p className="font-semibold text-yellow-800 mb-2">
                            ⚠️ Éléments liés qui seront affectés:
                        </p>
                        <ul className="space-y-1">
                            {linkedItems.map((item, i) => (
                                <li key={i} className="text-sm text-yellow-900">
                                    • <span className="font-medium">{item.count}</span> {item.type}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Suppression...' : 'Supprimer tout'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
