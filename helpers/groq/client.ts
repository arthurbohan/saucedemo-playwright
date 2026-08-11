/**
 * Groq API client
 */

// Minimal ambient for `process.env` so this file typechecks without @types/node
declare const process: { env: { [key: string]: string | undefined } }

import type { GroqRequest, GroqResponse, GroqOptions, GroqMessage } from './types'
import 'dotenv/config' 

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

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

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(request),
            })

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
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Groq API request failed: ${error.message}`)
            }
            throw error
        }
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