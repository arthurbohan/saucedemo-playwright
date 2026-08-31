/**
 * helpers/scripts/generateTests/generator.ts
 *
 * Core generation logic. Provider-agnostic — takes any { ask() } client
 * plus a matching prompt source. scripts/generateTests.ts passes
 * helpers/claude/'s client + prompts (see that file for why).
 */

import { FeatureKey } from './types'

export type AiClient = {
  ask: (prompt: string, systemPrompt: string, options?: any) => Promise<string>
}

export type PromptSource = {
  systemPrompt: string
  buildGeneratePrompt: (feature: FeatureKey, description: string) => string
  buildFixTestPrompt: (code: string, tscErrors: string) => string
}

export async function generateSpec(
  feature: FeatureKey,
  description: string,
  client: AiClient,
  promptSource: PromptSource,
): Promise<string> {
  const prompt = promptSource.buildGeneratePrompt(feature, description)

  return client.ask(prompt, promptSource.systemPrompt, {
    temperature: 0.1,   // low temperature — strict instruction following
    maxTokens: 2500,
  })
}

// Used by scripts/generateTests.ts when typeCheckFile() finds errors in a
// just-written spec — sends the errors back to the AI for a targeted fix
// instead of leaving a human to patch imports/method names by hand.
export async function fixSpec(
  code: string,
  tscErrors: string,
  client: AiClient,
  promptSource: PromptSource,
): Promise<string> {
  const prompt = promptSource.buildFixTestPrompt(code, tscErrors)

  return client.ask(prompt, promptSource.systemPrompt, {
    temperature: 0.1,
    maxTokens: 3500,
  })
}
