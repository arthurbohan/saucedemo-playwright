/**
 * Groq module - main exports
 */

// Client
import {
    GroqClient,
    getGroqClient,
    askGroq,
} from './client'

// Types
export type {
    GroqMessage,
    GroqRequest,
    GroqResponse,
    GroqOptions,
} from './types'

// Prompts (explicit exports)
export * from './prompts/selfHealing'
export * from './prompts/riskAnalysis'
export * from './prompts/generateTests'

// Default export
export default {
    GroqClient,
    getGroqClient,
    askGroq,
}