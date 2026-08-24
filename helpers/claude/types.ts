/**
 * Claude CLI subprocess types
 */

export type ClaudeOptions = {
    // Alias ('sonnet', 'opus', 'fable') or full model name — omit for the
    // CLI's own default.
    model?: string
    timeoutMs?: number
}

// The relevant fields of `claude -p --output-format json`'s stdout. The CLI
// prints a lot more (usage, cost breakdown, session id, ...) — only what
// this client actually reads is typed here.
export type ClaudeResult = {
    is_error: boolean
    subtype: string
    result?: string
    total_cost_usd?: number
}
