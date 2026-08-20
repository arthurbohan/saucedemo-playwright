/**
 * helpers/scripts/generateTests/generator.ts
 *
 * Core generation logic.
 * Calls Groq with the feature prompt and returns the generated code.
 */

import { getGroqClient }                                                  from '../groq/client'
import { buildGeneratePrompt, buildFixTestPrompt, GENERATE_TESTS_SYSTEM } from '../groq/prompts/generateTests'
import { FeatureKey }                                                     from './types'

export async function generateSpec(
  feature:     FeatureKey,
  description: string,
): Promise<string> {
  const client = getGroqClient()
  const prompt = buildGeneratePrompt(feature, description)

  return client.ask(prompt, GENERATE_TESTS_SYSTEM, {
    temperature: 0.1,   // low temperature — strict instruction following
    // Groq's TPM check counts prompt tokens + this reserved maxTokens
    // together as "Requested," not actual usage — so this isn't just an
    // output cap, it's part of the 8000 TPM budget alongside the prompt
    // itself (the prompt now includes real Page Object source, up to
    // ~4500 tokens for the checkout feature). Observed completions run
    // 550-900 tokens, so 2500 leaves real headroom without crowding out
    // prompt budget the way 3500 did.
    maxTokens:   2500,
  })
}

// Used by scripts/generateTests.ts when typeCheckFile() finds errors in a
// just-written spec — sends the errors back to Groq for a targeted fix
// instead of leaving a human to patch imports/method names by hand.
export async function fixSpec(code: string, tscErrors: string): Promise<string> {
  const client = getGroqClient()
  const prompt = buildFixTestPrompt(code, tscErrors)

  return client.ask(prompt, GENERATE_TESTS_SYSTEM, {
    temperature: 0.1,
    maxTokens:   3500,
  })
}