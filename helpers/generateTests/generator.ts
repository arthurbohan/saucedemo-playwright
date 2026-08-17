/**
 * helpers/scripts/generateTests/generator.ts
 *
 * Core generation logic.
 * Calls Groq with the feature prompt and returns the generated code.
 */

import { getGroqClient }                            from '../groq/client'
import { buildGeneratePrompt, GENERATE_TESTS_SYSTEM } from '../groq/prompts/generateTests'
import { FeatureKey }                                from './types'

export async function generateSpec(
  feature:     FeatureKey,
  description: string,
): Promise<string> {
  const client = getGroqClient()
  const prompt = buildGeneratePrompt(feature, description)

  return client.ask(prompt, GENERATE_TESTS_SYSTEM, {
    temperature: 0.1,   // low temperature — strict instruction following
    // prompt (~2000 tokens) + maxTokens must stay under this Groq account's
    // 8000 TPM cap; existing hand-written specs run 1000-2300 tokens, so 3500
    // leaves headroom without tripping a 413 "request too large"
    maxTokens:   3500,
  })
}