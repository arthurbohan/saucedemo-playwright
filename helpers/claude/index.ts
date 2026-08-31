/**
 * Claude module - main exports
 */

// Client
import {
    ClaudeSubprocessClient,
    getClaudeClient,
    askClaude,
} from './client'

// Types
export type {
    ClaudeOptions,
    ClaudeResult,
} from './types'

// Prompts (explicit exports)
export * from './prompts/failureAnalysis'
export * from './prompts/generateTests'

// Default export
export default {
    ClaudeSubprocessClient,
    getClaudeClient,
    askClaude,
}
