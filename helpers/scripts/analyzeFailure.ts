#!/usr/bin/env node

/**
 * scripts/analyze-failure.ts
 *
 * Reads failed Playwright tests from test-results/
 * and sends them to Groq API for root cause analysis.
 */

import fs from 'fs'
import path from 'path'
import 'dotenv/config'
import { getGroqClient } from '../groq/client'
import {
    buildFailureAnalysisPrompt,
    buildBatchAnalysisPrompt
} from '../groq/prompts'

type FailureInfo = {
    filePath: string
    content: string
    testName: string
}

type AnalysisResult = {
    testName: string
    analysis: string
    error?: string
}

function collectFailures(): FailureInfo[] {
    const testResultsDir = path.join(process.cwd(), 'test-results')

    if (!fs.existsSync(testResultsDir)) {
        console.log('info: test-results directory not found — no failed tests')
        process.exit(0)
    }

    const failures: FailureInfo[] = []

    function scan(dir: string) {
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file)
            if (fs.statSync(full).isDirectory()) {
                scan(full)
            } else if (file === 'error-context.md') {
                const parentDirName = path.basename(path.dirname(full))

                if (parentDirName.includes('-retry')) {
                    console.log(`Skipping retry analysis for: ${parentDirName}`)
                    continue
                }

                const content = fs.readFileSync(full, 'utf-8')
                const testName = parentDirName
                    .replace(/-chromium$/, '')
                    .replace(/-/g, ' ')
                    .trim()

                failures.push({ filePath: full, content, testName })
            }
        }
    }

    scan(testResultsDir)

    return failures.sort((a, b) =>
        fs.statSync(b.filePath).mtimeMs - fs.statSync(a.filePath).mtimeMs
    )
}

function logGroup(title: string, content: string) {
    const isCI = !!process.env.CI
    if (isCI) {
        console.log(`::group::AI Analysis: ${title}`)
        console.log(content)
        console.log('::endgroup::')
    } else {
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`AI Analysis: ${title}`)
        console.log('─'.repeat(60))
        console.log(content)
    }
}

function logError(message: string) {
    const isCI = !!process.env.CI
    if (isCI) {
        console.log(`::error::${message}`)
    } else {
        console.error(`ERROR: ${message}`)
    }
}

function logNotice(message: string) {
    const isCI = !!process.env.CI
    if (isCI) {
        console.log(`::notice::${message}`)
    } else {
        console.log(`INFO: ${message}`)
    }
}

function saveSummary(results: AnalysisResult[]) {
    const summaryPath = path.join(process.cwd(), 'ai-analysis-summary.md')

    const lines: string[] = [
        '## AI Analysis of Failed Tests',
        '',
        `Total failures analyzed: **${results.length}**`,
        '',
    ]

    for (const result of results) {
        lines.push(`### FAILED: ${result.testName}`)
        lines.push('')
        if (result.error) {
            lines.push(`_Analysis failed: ${result.error}_`)
        } else {
            lines.push(result.analysis)
        }
        lines.push('')
        lines.push('---')
        lines.push('')
    }

    fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8')
    console.log(`\nSummary saved: ${summaryPath}`)

    const githubStepSummary = process.env.GITHUB_STEP_SUMMARY
    if (githubStepSummary) {
        fs.appendFileSync(githubStepSummary, lines.join('\n'))
        console.log('GitHub Step Summary updated')
    }
}

async function main() {
    console.log('Analyzing failed tests...\n')

    const failures = collectFailures()

    if (failures.length === 0) {
        logNotice('No failed tests found')
        process.exit(0)
    }

    console.log(`Failed tests: ${failures.length}`)
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.testName}`))
    console.log()

    let groqClient
    try {
        groqClient = getGroqClient()
    } catch (error) {
        logError(`Failed to initialize Groq client: ${error}`)
        process.exit(1)
    }

    const results: AnalysisResult[] = []

    if (failures.length > 5) {
        console.log('Batch analyzing all failures...')
        try {
            const batchPrompt = buildBatchAnalysisPrompt(
                failures.map(f => ({ testName: f.testName, errorContext: f.content }))
            )
            const analysis = await groqClient.ask(
                batchPrompt,
                'You are a QA automation engineer. Analyze multiple test failures.',
                { maxTokens: 2048 }
            )

            for (const failure of failures) {
                results.push({
                    testName: failure.testName,
                    analysis: analysis.includes(failure.testName)
                        ? analysis
                        : `Analysis not found for ${failure.testName}`
                })
            }
            logGroup('Batch Analysis', analysis)
        } catch (err) {
            logError(`Batch analysis failed: ${err}`)
            console.log('Falling back to individual analysis...')
        }
    }

    const remainingFailures = failures.filter((_, i) => !results[i])
    for (const failure of remainingFailures) {
        console.log(`\nAnalyzing: ${failure.testName}`)

        try {
            const prompt = buildFailureAnalysisPrompt(failure.testName, failure.content)
            const analysis = await groqClient.ask(
                prompt,
                'You are a QA automation engineer. Be concise and precise.',
                { maxTokens: 1024, temperature: 0.1 }
            )
            logGroup(failure.testName, analysis)
            results.push({ testName: failure.testName, analysis })
        } catch (err) {
            const errorMsg = String(err)
            logError(`Analysis failed for "${failure.testName}": ${errorMsg}`)
            results.push({ testName: failure.testName, analysis: '', error: errorMsg })
        }

        if (remainingFailures.indexOf(failure) < remainingFailures.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }

    saveSummary(results)
    console.log('\nAnalysis complete')
}

main().catch(err => {
    logError(`Fatal: ${err}`)
    process.exit(1)
})