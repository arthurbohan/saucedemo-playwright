/**
 * Groq API types
 */

export type GroqMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export type GroqRequest = {
    model: string
    messages: GroqMessage[]
    temperature?: number
    max_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    reasoning_effort?: 'low' | 'medium' | 'high'
}

export type GroqResponse = {
    choices: Array<{
        message: { content: string }
        finish_reason: string
    }>
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
        completion_tokens_details?: { reasoning_tokens: number }
    }
}

export type GroqOptions = {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    // openai/gpt-oss-* models spend completion tokens on a hidden reasoning
    // pass before the actual answer — with a small maxTokens that reasoning
    // can eat the whole budget and truncate the real answer (finish_reason
    // "length" with an empty/cut-off content). Default to 'low' so short,
    // format-constrained answers (a selector, a JSON blob) aren't at risk.
    reasoningEffort?: 'low' | 'medium' | 'high'
    // How many times to retry a 429 before giving up (default 3). CLI scripts
    // (analyzeFailure, analyzeRisk, generateTests) aren't time-boxed, so the
    // default patient retry is fine. self-healing runs inside a live
    // Playwright test with a ~30s timeout — pass 1 there (no retry) so a
    // rate limit fails fast into the non-AI fallback selector instead of
    // burning the test's entire time budget on a single wait.
    retryAttempts?: number
    // Cap on a single 429 wait in ms (default 20_000)
    maxRetryWaitMs?: number
    // Override the client's default model for this call. Groq's 8000 TPM cap
    // is enforced PER MODEL, not per account — routing a high-frequency,
    // low-stakes caller (self-healing, many short calls during a live test
    // run) to a different model than the heavier CLI scripts (analyzeFailure,
    // analyzeRisk, generateTests) gives each its own independent budget
    // instead of them competing for the same 8000 tokens/minute.
    model?: string
}