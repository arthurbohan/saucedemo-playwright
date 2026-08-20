/**
 * Prompts for failure analysis
 */

export const FAILURE_ANALYSIS_SYSTEM = `
You are a QA automation engineer specializing in Playwright test debugging.
Be concise and precise. Focus only on the test failure analysis.
`.trim()

export function buildFailureAnalysisPrompt(
    testName: string,
    errorContext: string,
    includeManualVerdict = true
): string {
    const manualVerdictSection = includeManualVerdict ? `
## Manual Verdict
(exactly one of: "🔴 Product bug" / "🟡 Test or environment issue" / "🟠 Unclear — needs a human look")
(one plain-language sentence why — no code, no jargon, written for a manual tester deciding whether to file a bug report)
` : ''

    return `
You are an experienced QA automation engineer. Analyze the failed Playwright test below.

Test name: "${testName}"

error-context.md contents:
${errorContext}

Respond STRICTLY in this format:
${manualVerdictSection}
## Root Cause
(1-2 sentences — exactly what went wrong)

## Location
(file:line or method name if visible in the context)

## Fix
(concrete steps — what needs to be changed)

## Code
(fixed code snippet if needed, otherwise skip this section)`
}

export function buildDetailedFailurePrompt(
    testName: string,
    errorContext: string,
    testCode?: string
): string {
    let prompt = `
You are an experienced QA automation engineer. Analyze the failed Playwright test below.

Test name: "${testName}"

Error context:
${errorContext}
`

    if (testCode) {
        prompt += `

Test code:
${testCode}`
    }

    prompt += `

Provide a comprehensive analysis:

## Root Cause
(2-3 sentences explaining the exact issue)

## Location
(File path and line number if available)

## Solution
(Step-by-step fix)

## Code Fix
(Provide the complete corrected code snippet)

## Prevention
(How to prevent this in the future)

## Estimated Fix Time
(Small/Medium/Large)`
    return prompt
}

export function buildBatchAnalysisPrompt(
    failures: Array<{ testName: string; errorContext: string }>,
    includeManualVerdict = true
): string {
    let prompt = `
You are an experienced QA automation engineer. Analyze these failed Playwright tests.

Total failures: ${failures.length}

`

    failures.forEach((failure, index) => {
        prompt += `
--- FAILURE ${index + 1} ---
Test name: "${failure.testName}"
Error: ${failure.errorContext.slice(0, 500)}
`
    })

    const manualVerdictLine = includeManualVerdict
        ? '\n### Manual Verdict\n(exactly one of: "🔴 Product bug" / "🟡 Test or environment issue" / "🟠 Unclear — needs a human look", then one plain-language sentence why — written for a manual tester, no code)'
        : ''

    prompt += `

For each failure, provide:

${failures.map((_, i) => `
## Failure ${i + 1}: ${failures[i].testName}${manualVerdictLine}
### Root Cause
### Location
### Fix
### Code (if needed)
`).join('\n')}

Be concise but thorough.`
    return prompt
}