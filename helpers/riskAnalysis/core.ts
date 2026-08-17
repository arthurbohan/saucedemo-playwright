/**
 * helpers/riskAnalysis/core.ts
 *
 * Sends the diff + impacted-specs context to Groq and gets back a
 * risk assessment: what's likely to break, and what changed with no
 * test coverage at all.
 */

import { getGroqClient } from '../groq/client'
import { RISK_ANALYSIS_SYSTEM, buildRiskAnalysisPrompt } from '../groq/prompts/riskAnalysis'

export interface RiskAnalysisInput {
    base: string
    changedFiles: string[]
    impactedSpecs: string[]
    diff: string
}

export async function analyzeRisk(input: RiskAnalysisInput): Promise<string> {
    const client = getGroqClient()
    const prompt = buildRiskAnalysisPrompt(input)
    return client.ask(prompt, RISK_ANALYSIS_SYSTEM, { maxTokens: 1500 })
}
