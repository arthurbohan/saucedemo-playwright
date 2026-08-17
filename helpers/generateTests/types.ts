/**
 * helpers/scripts/generateTests/types.ts
 *
 * Type definitions for the test generation module.
 */

export type FeatureKey = 'login' | 'inventory' | 'checkout' | 'api'

// 'api' generates against tests/specs/api (jsonplaceholder, no browser Page
// Objects) — everything else generates a UI spec against tests/specs/features
export const API_FEATURES: readonly FeatureKey[] = ['api']

export type GenerateResult = {
  feature:  FeatureKey
  filePath: string
  success:  boolean
  error?:   string
}