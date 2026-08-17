/**
 * Groq API client
 */

import type { GroqRequest, GroqResponse, GroqOptions, GroqMessage } from './types'
import 'dotenv/config' 

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
// llama-3.3-70b-versatile was retired from Groq's catalog — see console.groq.com/docs/models
const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const MAX_RETRY_WAIT_MS = 20_000
const DEFAULT_RETRY_WAIT_MS = 5_000

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Groq returns the wait time both as a `retry-after` header and inlined in the
// error body ("Please try again in 12.3375s") — prefer the header, fall back
// to parsing the message, and cap it so a script never blocks unreasonably long.
function parseRetryDelayMs(body: string, retryAfterHeader: string | null): number {
    if (retryAfterHeader) {
        const seconds = Number(retryAfterHeader)
        if (!Number.isNaN(seconds)) {
            return Math.min(Math.ceil(seconds * 1000) + 250, MAX_RETRY_WAIT_MS)
        }
    }

    const match = body.match(/try again in ([\d.]+)s/i)
    if (match) {
        return Math.min(Math.ceil(Number(match[1]) * 1000) + 250, MAX_RETRY_WAIT_MS)
    }

    return DEFAULT_RETRY_WAIT_MS
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
        } = options

        const request: GroqRequest = {
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
        }

        const maxAttempts = 3

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
                throw new Error(`Groq API request failed: ${error instanceof Error ? error.message : error}`)
            }

            // Groq's free tier shares a per-minute token budget across every caller
            // (self-healing during a run, analyzeFailure right after) — back off and
            // retry instead of failing the whole analysis on a transient 429.
            if (response.status === 429 && attempt < maxAttempts) {
                const body = await response.text()
                const waitMs = parseRetryDelayMs(body, response.headers.get('retry-after'))
                console.warn(`  ⏳ Groq rate limit hit, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${maxAttempts})...`)
                await sleep(waitMs)
                continue
            }

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Groq API error ${response.status}: ${error}`)
            }

            const data = await response.json() as GroqResponse

            if (data.usage) {
                console.log(
                    `  Tokens: prompt=${data.usage.prompt_tokens} ` +
                    `completion=${data.usage.completion_tokens} ` +
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