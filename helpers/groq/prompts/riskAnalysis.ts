/**
 * Prompts for pre-merge risk analysis
 */

export const RISK_ANALYSIS_SYSTEM = `
You are a senior QA engineer performing pre-merge risk analysis on a Playwright
test automation framework. Be specific and reference actual file names and
user-facing flows. Do not restate the diff line by line — synthesize.
`.trim()

export interface RiskAnalysisPromptInput {
    base: string
    changedFiles: string[]
    impactedSpecs: string[]
    diff: string
}

export function buildRiskAnalysisPrompt(input: RiskAnalysisPromptInput): string {
    const { base, changedFiles, impactedSpecs, diff } = input

    return `
Compare range: ${base}

Changed files:
${changedFiles.map(f => `- ${f}`).join('\n')}

Specs that already cover these files (found via static import analysis):
${impactedSpecs.length ? impactedSpecs.map(f => `- ${f}`).join('\n') : '(none — no existing spec imports any of the changed files)'}

Diff:
\`\`\`diff
${diff.slice(0, 12000)}
\`\`\`

Respond STRICTLY in this markdown format:

## Risk Summary
(2-3 sentences — what changed and the overall risk level: High/Medium/Low)

## Affected User Flows
(bullet list of concrete user-facing flows this touches)

## Regression Risk Areas
(bullet list, each item starting with "**High/Medium/Low** — " followed by the reasoning)

## Coverage Gaps
(what changed but has NO existing spec covering it — say explicitly "none found" if that's the case)

## Recommended New Test Cases
(bullet list of specific, actionable test case titles — short enough to hand directly to a test generator)
`.trim()
}
