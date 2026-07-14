import fs from 'fs'
import path from 'path'

// Load .env file
import 'dotenv/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type GeminiResponse = {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>
        }
        finishReason: string
    }>
    usageMetadata: {
        promptTokenCount: number
        candidatesTokenCount: number
        totalTokenCount: number
    }
}

type FailureInfo = {
    filePath: string
    content: string
    testName: string
}

// ─── Collect Failure Information ──────────────────────────────────────────────

function collectFailures(): FailureInfo[] {
    const testResultsDir = path.join(process.cwd(), 'test-results')

    if (!fs.existsSync(testResultsDir)) {
        console.error('❌ "test-results" directory not found.')
        console.error('   Please run your tests first: npm run test:e2e')
        process.exit(1)
    }

    const failures: FailureInfo[] = []

    function scan(dir: string) {
        fs.readdirSync(dir).forEach(file => {
            const full = path.join(dir, file)
            if (fs.statSync(full).isDirectory()) {
                scan(full)
            } else if (file === 'error-context.md') {
                const content = fs.readFileSync(full, 'utf-8')
                const testName = path.basename(path.dirname(full))
                    .replace(/-chromium$/, '')
                    .replace(/-/g, ' ')

                failures.push({ filePath: full, content, testName })
            }
        })
    }

    scan(testResultsDir)

    if (failures.length === 0) {
        console.log('✅ No failed tests found — everything passed successfully!')
        process.exit(0)
    }

    // Sort by modification time — newest first
    return failures.sort((a, b) =>
        fs.statSync(b.filePath).mtimeMs - fs.statSync(a.filePath).mtimeMs
    )
}

// ─── Analyze via Gemini API ──────────────────────────────────────────────────

async function analyzeWithGemini(failure: FailureInfo): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not defined.\n' +
            'Add it to your .env file: GEMINI_API_KEY=AIza...\n' +
            'Get a key here: aistudio.google.com'
        )
    }

    // Using gemini-2.5-flash as the standard stable model for fast text analysis
    const url = `https://googleapis.com{apiKey}`

    const prompt = `You are an expert QA Automation Engineer specialized in Playwright and TypeScript.

Failed test: "${failure.testName}"

Contents of error-context.md:
${failure.content}

Analyze the error and provide a clear, concise response strictly using the following markdown format:

## 🔍 Root Cause
(One or two sentences explaining exactly what went wrong)

## 📍 Code Location
(File, line number, or method — if identifiable from the context)

## 🛠 Solution
(Concrete steps required to fix the issue)

## 💡 Fix Example
(If applicable, provide a code snippet demonstrating the corrected implementation)

Be direct, highly technical, and avoid any introductory or conversational filler.`

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2,   // Low temperature for precise, predictable answers
                maxOutputTokens: 1024,
            }
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gemini API error ${response.status}: ${error}`)
    }

    const data = await response.json() as GeminiResponse

    const usage = data.usageMetadata
    console.log(
        `  📊 Tokens: input=${usage.promptTokenCount}, output=${usage.candidatesTokenCount}`
    )

    return data.candidates[0].content.parts[0].text
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function main() {
    console.log('🔍 Searching for failed tests in test-results/...\n')

    const failures = collectFailures()

    console.log(`❌ Failed tests found: ${failures.length}`)
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.testName}`))

    for (let i = 0; i < failures.length; i++) {
        const failure = failures[i]
        
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`🧪 Test: ${failure.testName}`)
        console.log(`📁 File: ${failure.filePath}`)
        console.log('─'.repeat(60))
        console.log('🤖 Sending to Gemini...')

        try {
            const analysis = await analyzeWithGemini(failure)
            console.log('\n' + analysis)
        } catch (err) {
            console.error(`\n❌ Analysis failed: ${err}`)
        }

        // 5-second delay between requests to avoid rate limiting (429 errors)
        if (failures.length > 1 && i < failures.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next request...');
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
    }

    console.log(`\n${'─'.repeat(60)}`)
    console.log('✅ Analysis complete')
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
