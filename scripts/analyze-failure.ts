/**
 * scripts/analyze-failure.ts
 *
 * Reads failed Playwright tests from test-results/
 * and sends them to Groq API for root cause analysis.
 *
 * Used in CI — runs automatically after test failures.
 * Results appear in GitHub Actions logs and Telegram notifications.
 *
 * Local run:
 *   GROQ_API_KEY=gsk_... npx ts-node scripts/analyze-failure.ts
 *
 * Or via .env:
 *   npm run ai:analyze
 */

import fs   from 'fs'
import path from 'path'
import 'dotenv/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type GroqResponse = {
  choices: Array<{
    message: { content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens:     number
    completion_tokens: number
    total_tokens:      number
  }
}

type FailureInfo = {
  filePath: string
  content:  string
  testName: string
}

type AnalysisResult = {
  testName: string
  analysis: string
  error?:   string
}

// ─── Collect failed tests ─────────────────────────────────────────────────────

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
        const content  = fs.readFileSync(full, 'utf-8')
        const testName = path.basename(path.dirname(full))
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

// ─── Analyze via Groq API ─────────────────────────────────────────────────────

async function analyzeWithGroq(failure: FailureInfo): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set.\n' +
      'Get a free key (no credit card): console.groq.com\n' +
      'Add to GitHub Secrets: Settings -> Secrets -> GROQ_API_KEY'
    )
  }

  const prompt = `You are an experienced QA automation engineer. Analyze the failed Playwright test below.

Test name: "${failure.testName}"

error-context.md contents:
${failure.content}

Respond STRICTLY in this format:

## Root Cause
(1-2 sentences — exactly what went wrong)

## Location
(file:line or method name if visible in the context)

## Fix
(concrete steps — what needs to be changed)

## Code
(fixed code snippet if needed, otherwise skip this section)`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens:  1024,
      messages: [
        {
          role:    'system',
          content: 'You are a QA automation engineer. Be concise and precise. Focus only on the test failure analysis.',
        },
        {
          role:    'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API ${response.status}: ${error}`)
  }

  const data = await response.json() as GroqResponse

  console.log(
    `  Tokens: prompt=${data.usage.prompt_tokens} ` +
    `completion=${data.usage.completion_tokens} ` +
    `total=${data.usage.total_tokens}`
  )

  return data.choices[0].message.content
}

// ─── GitHub Actions log formatting ───────────────────────────────────────────

function logGroup(title: string, content: string) {
  if (process.env.CI) {
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
  process.env.CI
    ? console.log(`::error::${message}`)
    : console.error(`ERROR: ${message}`)
}

function logNotice(message: string) {
  process.env.CI
    ? console.log(`::notice::${message}`)
    : console.log(`INFO: ${message}`)
}

// ─── Save summary for Telegram and GitHub Step Summary ───────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  const results: AnalysisResult[] = []

  for (const failure of failures) {
    console.log(`\nAnalyzing: ${failure.testName}`)

    try {
      const analysis = await analyzeWithGroq(failure)
      logGroup(failure.testName, analysis)
      results.push({ testName: failure.testName, analysis })
    } catch (err) {
      const errorMsg = String(err)
      logError(`Analysis failed for "${failure.testName}": ${errorMsg}`)
      results.push({ testName: failure.testName, analysis: '', error: errorMsg })
    }

    if (failures.indexOf(failure) < failures.length - 1) {
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