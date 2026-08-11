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
    }
}

export type GroqOptions = {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
}