/**
 * helpers/scripts/generateTests/index.ts
 *
 * Public API for the test generation module.
 * Entry point used by scripts/generateTests.ts.
 */

export { generateSpec }          from './generator'
export { saveGeneratedSpec, previewCode } from './writer'
export { FEATURE_DESCRIPTIONS }  from './features'
export type { FeatureKey, GenerateResult } from './types'