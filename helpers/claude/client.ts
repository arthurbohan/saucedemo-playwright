/**
 * Claude Code CLI subprocess client
 *
 * Uses a Claude Pro/Max subscription (a CLAUDE_CODE_OAUTH_TOKEN from
 * `claude setup-token`) instead of a billed ANTHROPIC_API_KEY — shells out
 * to `claude -p` per call rather than hitting the Messages API directly.
 *
 * Used by the failure-analysis path only (scripts/analyzeFailure.ts).
 * `--bare` mode is what strips the CLI's large default context (CLAUDE.md,
 * memory, tool/skill listings — tens of thousands of cache tokens, several
 * seconds per call), but --bare only accepts ANTHROPIC_API_KEY, never
 * OAuth — so that overhead is unavoidable here. Fine for 1-3 calls per CI
 * run; not worth it for self-healing, which fires once per failed locator
 * inside a live test run and stays on helpers/groq/client.ts.
 */

import { execFileSync } from 'child_process'
import type { ClaudeOptions, ClaudeResult } from './types'
import 'dotenv/config'

const DEFAULT_TIMEOUT_MS = 120_000

export class ClaudeSubprocessClient {
    constructor(private readonly oauthToken: string) {
        if (!oauthToken) {
            throw new Error('CLAUDE_CODE_OAUTH_TOKEN is required. Generate one with `claude setup-token`.')
        }
    }

    async ask(
        prompt: string,
        systemPrompt: string = 'You are a helpful assistant.',
        options: ClaudeOptions = {}
    ): Promise<string> {
        const { model, timeoutMs = DEFAULT_TIMEOUT_MS } = options

        // --tools "" disables all tool use — this client is a pure text
        // completion (analysis prompt in, prose out). Without it, Claude may
        // try to use e.g. Read on a file path mentioned in the prompt (error
        // context often includes one), which needs permission approval that
        // has no terminal to answer in headless mode and just hangs until
        // the timeout below fires instead of erroring immediately.
        const args = ['-p', '--system-prompt', systemPrompt, '--output-format', 'json', '--tools', '']
        if (model) args.push('--model', model)

        let stdout: string
        try {
            stdout = execFileSync('claude', args, {
                input: prompt,
                encoding: 'utf-8',
                timeout: timeoutMs,
                maxBuffer: 1024 * 1024 * 20,
                env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: this.oauthToken },
            })
        } catch (error: any) {
            if (error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT') {
                throw new Error(`Claude CLI timed out after ${timeoutMs}ms`, { cause: error })
            }
            const detail = error.stderr?.toString() || error.stdout?.toString() || error.message
            throw new Error(`Claude CLI request failed: ${detail}`, { cause: error })
        }

        let parsed: ClaudeResult
        try {
            parsed = JSON.parse(stdout)
        } catch (error) {
            throw new Error(`Claude CLI returned non-JSON output: ${stdout.slice(0, 500)}`, { cause: error })
        }

        if (parsed.is_error || parsed.subtype !== 'success') {
            throw new Error(`Claude CLI error: ${stdout.slice(0, 500)}`)
        }

        if (parsed.total_cost_usd) {
            console.log(`  Claude CLI cost: $${parsed.total_cost_usd.toFixed(4)}`)
        }

        return parsed.result ?? ''
    }
}

let clientInstance: ClaudeSubprocessClient | null = null

export function getClaudeClient(): ClaudeSubprocessClient {
    if (!clientInstance) {
        const token = process.env.CLAUDE_CODE_OAUTH_TOKEN
        if (!token) {
            throw new Error(
                'CLAUDE_CODE_OAUTH_TOKEN is not set.\n' +
                'Generate one from your Claude subscription: claude setup-token\n' +
                'Add to .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...'
            )
        }
        clientInstance = new ClaudeSubprocessClient(token)
    }
    return clientInstance
}

export async function askClaude(
    prompt: string,
    systemPrompt?: string,
    options?: ClaudeOptions
): Promise<string> {
    const client = getClaudeClient()
    return client.ask(prompt, systemPrompt, options)
}
