/**
 * Groq API client
 */

import type { GroqRequest, GroqResponse, GroqOptions, GroqMessage } from './types'
import 'dotenv/config' 

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
// llama-3.3-70b-versatile was retired from Groq's catalog — see console.groq.com/docs/models
const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const DEFAULT_MAX_RETRY_WAIT_MS = 20_000
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_WAIT_MS = 5_000

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Groq returns the wait time both as a `retry-after` header and inlined in the
// error body ("Please try again in 12.3375s") — prefer the header, fall back
// to parsing the message, and cap it so a script never blocks unreasonably long.
function parseRetryDelayMs(body: string, retryAfterHeader: string | null, maxWaitMs: number): number {
    if (retryAfterHeader) {
        const seconds = Number(retryAfterHeader)
        if (!Number.isNaN(seconds)) {
            return Math.min(Math.ceil(seconds * 1000) + 250, maxWaitMs)
        }
    }

    const match = body.match(/try again in ([\d.]+)s/i)
    if (match) {
        return Math.min(Math.ceil(Number(match[1]) * 1000) + 250, maxWaitMs)
    }

    return Math.min(DEFAULT_RETRY_WAIT_MS, maxWaitMs)
}

export class GroqClient {
    private apiKey: string
    private model: string

    constructor(apiKey: string, model: string = DEFAULT_MODEL) {
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is required. Get it from console.groq.com')
        }
        this.apiKey = apiKey
        this.model = model
    }

    async chat(
        messages: GroqMessage[],
        options: GroqOptions = {}
    ): Promise<string> {
        const {
            temperature = 0.1,
            maxTokens = 1024,
            topP = 1,
            frequencyPenalty = 0,
            presencePenalty = 0,
            reasoningEffort = 'low',
            retryAttempts = DEFAULT_RETRY_ATTEMPTS,
            maxRetryWaitMs = DEFAULT_MAX_RETRY_WAIT_MS,
            model = this.model,
        } = options

        const request: GroqRequest = {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            reasoning_effort: reasoningEffort,
        }

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            let response: Response
            try {
                response = await fetch(GROQ_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(request),
                })
            } catch (error) {
                throw new Error(`Groq API request failed: ${error instanceof Error ? error.message : error}`, { cause: error })
            }

            // Groq's free tier enforces an 8000 tokens/minute cap PER MODEL — a
            // burst of calls to the same model (e.g. several self-healing
            // attempts in one test run) can still trip this even with model
            // routing. Back off and retry instead of failing outright.
            // Callers racing a hard deadline (self-healing inside a ~30s Playwright
            // test) should pass retryAttempts: 1 to skip this wait entirely and fail
            // straight to their own fallback instead of eating the test's timeout.
            if (response.status === 429 && attempt < retryAttempts) {
                const body = await response.text()
                const waitMs = parseRetryDelayMs(body, response.headers.get('retry-after'), maxRetryWaitMs)
                console.warn(`  ⏳ Groq rate limit hit, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${retryAttempts})...`)
                await sleep(waitMs)
                continue
            }

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Groq API error ${response.status}: ${error}`)
            }

            const data = await response.json() as GroqResponse

            if (data.usage) {
                const reasoningTokens = data.usage.completion_tokens_details?.reasoning_tokens
                console.log(
                    `  Tokens: prompt=${data.usage.prompt_tokens} ` +
                    `completion=${data.usage.completion_tokens} ` +
                    (reasoningTokens ? `(reasoning=${reasoningTokens}) ` : '') +
                    `total=${data.usage.total_tokens}`
                )
            }

            return data.choices[0].message.content
        }

        throw new Error('Groq API request failed: exhausted retries after repeated rate limiting')
    }

    async ask(
        prompt: string,
        systemPrompt: string = 'You are a helpful assistant.',
        options: GroqOptions = {}
    ): Promise<string> {
        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
        ], options)
    }

    async estimateTokens(messages: GroqMessage[]): Promise<number> {
        const totalChars = messages.reduce(
            (sum, msg) => sum + msg.content.length,
            0
        )
        return Math.ceil(totalChars / 4)
    }
}

let clientInstance: GroqClient | null = null

export function getGroqClient(): GroqClient {
    if (!clientInstance) {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            throw new Error(
                'GROQ_API_KEY is not set.\n' +
                'Get a free key (no credit card): console.groq.com\n' +
                'Add to .env: GROQ_API_KEY=your_key_here'
            )
        }
        clientInstance = new GroqClient(apiKey)
    }
    return clientInstance
}

export async function askGroq(
    prompt: string,
    systemPrompt?: string,
    options?: GroqOptions
): Promise<string> {
    const client = getGroqClient()
    return client.ask(prompt, systemPrompt, options)
}