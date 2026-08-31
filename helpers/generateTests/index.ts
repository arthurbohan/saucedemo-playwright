/**
 * helpers/scripts/generateTests/index.ts
 *
 * Public API for the test generation module.
 * Entry point used by scripts/generateTests.ts.
 */

export { generateSpec, fixSpec } from './generator'
export type { AiClient, PromptSource } from './generator'
export { saveGeneratedSpec, previewCode } from './writer'
export { typeCheckFile }         from './validator'
export { FEATURE_DESCRIPTIONS }  from './features'
export type { FeatureKey, GenerateResult } from './types'