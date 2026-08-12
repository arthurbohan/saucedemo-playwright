/**
 * helpers/scripts/generateTests/generator.ts
 *
 * Core generation logic.
 * Calls Groq with the feature prompt and returns the generated code.
 */

import { getGroqClient }       from '../../groq/client'
import { buildGeneratePrompt } from './prompt'
import { FeatureKey }          from './types'

const SYSTEM_PROMPT =
  'You are a QA automation engineer. Return only TypeScript code. No explanation, no markdown.'

export async function generateSpec(
  feature:     FeatureKey,
  description: string,
): Promise<string> {
  const client = getGroqClient()
  const prompt = buildGeneratePrompt(feature, description)

  return client.ask(prompt, SYSTEM_PROMPT, {
    temperature: 0.1,   // low temperature — strict instruction following
    maxTokens:   8192,  // enough for a full spec file
  })
}