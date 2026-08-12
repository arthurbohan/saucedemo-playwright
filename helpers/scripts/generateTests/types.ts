/**
 * helpers/scripts/generateTests/types.ts
 *
 * Type definitions for the test generation module.
 */

export type FeatureKey = 'login' | 'inventory' | 'checkout'

export type GenerateResult = {
  feature:  FeatureKey
  filePath: string
  success:  boolean
  error?:   string
}