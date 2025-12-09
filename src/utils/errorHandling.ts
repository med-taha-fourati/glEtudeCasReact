/**
 * Anti-Corruption Layer (ACL) for Error Handling
 * 
 * This module provides a unified error handling system that normalizes
 * inconsistent backend error responses into a single AppError format.
 * 
 * The backend returns errors in two incompatible formats:
 * 1. application/json (structured)
 * 2. text/plain (raw strings from Spring exceptions)
 * 
 * This ACL ensures NO raw backend errors ever reach UI components.
 */

import axios from 'axios'

export interface AppError {
    message: string
    status?: number
    code?: string
    original?: unknown
    __isAppError?: true
}
export function isAppError(error: unknown): error is AppError {
    return (
        error !== null &&
        typeof error === 'object' &&
        '__isAppError' in error &&
        (error as AppError).__isAppError === true
    )
}

/**
 * Maps known backend error strings to user-friendly messages.
 * 
 * The backend throws raw exception messages like:
 * - "Cette seance est saturee"
 * - "Enseignant pas trouve"
 * - "Le calendrier est verrouille, impossible de soumettre des voeux"
 * 
 * This function translates them to proper French messages suitable for end users.
 */
export function mapBackendError(text: string): string {
    const lowerText = text.toLowerCase()

    // Database constraint violations
    if (lowerText.includes('ora-02292') || lowerText.includes('child record found')) {
        return 'Impossible de supprimer : cet élément est utilisé par d\'autres données. Veuillez d\'abord supprimer les éléments liés.'
    }

    if (lowerText.includes('ora-02291') || lowerText.includes('parent key not found')) {
        return 'Référence invalide : l\'élément parent n\'existe pas.'
    }

    if (lowerText.includes('ora-00001') || lowerText.includes('unique constraint')) {
        return 'Cet élément existe déjà dans le système.'
    }

    // Séance saturation
    if (lowerText.includes('saturee') || lowerText.includes('saturé')) {
        return 'Cette séance est déjà complète.'
    }

    if (lowerText.includes('verrouille') && lowerText.includes('soumettre')) {
        return 'Le calendrier est verrouillé, impossible de soumettre des vœux.'
    }

    if (lowerText.includes('verrouille') && lowerText.includes('retirer')) {
        return 'Le calendrier est verrouillé, impossible de retirer des vœux.'
    }

    if (lowerText.includes('verrouille') || lowerText.includes('verrouillé')) {
        return 'Le calendrier est verrouillé.'
    }

    if (lowerText.includes('deja soumis') || lowerText.includes('déjà soumis')) {
        return 'Vous avez déjà soumis un vœu pour cette séance.'
    }

    if (lowerText.includes("n'avez pas de voeu") || lowerText.includes("n'avez pas de vœu")) {
        return "Vous n'avez pas de vœu pour cette séance."
    }

    if (lowerText.includes('pas trouve') || lowerText.includes('pas trouvé') ||
        lowerText.includes('not found') || lowerText.includes('introuvable')) {
        return 'Ressource introuvable.'
    }

    if (lowerText.includes('conflit') || lowerText.includes('deja une seance') ||
        lowerText.includes('déjà une séance')) {
        return 'Vous avez déjà une séance dans cet horaire.'
    }


    if (lowerText.includes('unauthorized') || lowerText.includes('non autorisé')) {
        return 'Accès non autorisé.'
    }


    if (lowerText.includes('forbidden') || lowerText.includes('interdit')) {
        return 'Action interdite.'
    }


    return 'Une erreur est survenue.'
}

function tryParseJSON(value: unknown): any | null {
    if (typeof value !== 'string') return null

    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

function extractMessage(data: unknown, status?: number): string {
    let baseMessage = ''


    if (data === null || data === undefined) {
        baseMessage = 'Une erreur est survenue.'
    }

    else if (typeof data === 'string') {

        const cleaned = data.trim()


        if (cleaned.startsWith('<') || cleaned.toLowerCase().includes('<!doctype')) {
            baseMessage = 'Une erreur est survenue.'
        }

        else if (cleaned.length === 0) {
            baseMessage = 'Une erreur est survenue.'
        }

        else {
            baseMessage = mapBackendError(cleaned)
        }
    }

    else if (data && typeof data === 'object') {
        const obj = data as any
        if (obj.message && typeof obj.message === 'string') {
            baseMessage = mapBackendError(obj.message)
        }

        else if (obj.error && typeof obj.error === 'string') {
            baseMessage = mapBackendError(obj.error)
        }
        else if (obj.detail && typeof obj.detail === 'string') {
            baseMessage = mapBackendError(obj.detail)
        }
        else {
            baseMessage = 'Une erreur est survenue.'
        }
    }

    else {
        baseMessage = 'Une erreur est survenue.'
    }


    if (status && status >= 400) {
        return `${baseMessage} (${status})`
    }

    return baseMessage
}

/**
 * Universal error normalization function.
 * 
 * Takes ANY error type and returns a standardized AppError.
 * This is the only function that should interact with raw backend errors.
 * 
 * Handles:
 * - Axios errors with responses
 * - Network errors (no response)
 * - Plain text backend errors
 * - JSON backend errors
 * - HTML error pages
 * - Unknown errors
 * 
 * @param error - Any error from any source
 * @returns Normalized AppError suitable for UI display
 */
export function normalizeError(error: unknown): AppError {
    console.log('[normalizeError] Called with:', error)
    console.log('[normalizeError] Type:', typeof error)
    console.log('[normalizeError] Is Axios error?', axios.isAxiosError(error))


    if (isAppError(error)) {
        console.log('[normalizeError] Already normalized')
        return error
    }


    if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response


        console.log('[normalizeError] Has response!')
        console.log('[normalizeError] Status:', status)
        console.log('[normalizeError] Data:', data)
        console.log('[normalizeError] Data type:', typeof data)

        const message = extractMessage(data, status)
        console.log('[normalizeError] Extracted message:', message)

        return {
            __isAppError: true,
            message,
            status,
            code: (data as any)?.code,
            original: error
        }
    }


    if (axios.isAxiosError(error) && error.request) {
        console.log('[normalizeError] Network error - no response')
        return {
            __isAppError: true,
            message: 'Network error. Please check your connection.',
            original: error
        }
    }


    if (axios.isAxiosError(error)) {
        console.log('[normalizeError] Axios setup error')
        return {
            __isAppError: true,
            message: error.message || 'Request configuration error.',
            original: error
        }
    }


    if (error instanceof Error) {
        console.log('[normalizeError] Standard Error object')
        return {
            __isAppError: true,
            message: mapBackendError(error.message),
            original: error
        }
    }


    if (typeof error === 'string') {
        console.log('[normalizeError] String error')
        return {
            __isAppError: true,
            message: mapBackendError(error),
            original: error
        }
    }


    console.log('[normalizeError] Unknown error type')
    return {
        __isAppError: true,
        message: 'Unexpected error occurred.',
        original: error
    }
}

export function formatErrorForLogging(error: AppError): string {
    return JSON.stringify({
        message: error.message,
        status: error.status,
        code: error.code,
        original: error.original
    }, null, 2)
}
