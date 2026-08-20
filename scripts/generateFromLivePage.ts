#!/usr/bin/env node

/**
 * scripts/generateFromLivePage.ts
 *
 * Generates a self-contained Playwright spec for a page this project has no
 * prior knowledge of — no Page Object, no fixtures. `ai:generate` (see
 * scripts/generateTests.ts) only works because this project's whole Page
 * Object layer is spelled out by hand in its prompt
 * (helpers/groq/prompts/generateTests.ts) — it can't generate anything for
 * a page it has no description of. This visits the page live instead and
 * captures a real accessibility snapshot — reusing
 * helpers/selfHealing/snapshot.ts, the exact mechanism self-healing already
 * uses to find elements at runtime — then asks Groq to write the test from
 * that snapshot alone.
 *
 * Deliberately a different tool from `ai:generate`, not a replacement: that
 * one extends this project's maintained suite; this one is for a page with
 * no suite yet — a fast, disposable first draft, not a hand-designed spec.
 * On a real project, the natural next step past this is Claude + Playwright
 * MCP directly: it drives the browser the same way, but already knows the
 * project's context from the codebase, no prompt to hand-author at all.
 *
 * Usage:
 *   npx tsx scripts/generateFromLivePage.ts <url> "<task description>"
 *   npm run ai:generate:live -- <url> "<task description>"
 *
 * Example:
 *   npm run ai:generate:live -- https://the-internet.herokuapp.com/login "Test the login form. Valid credentials: username tomsmith, password SuperSecretPassword! — success shows a message containing 'You logged into a secure area!'. An invalid username or password shows a matching error message."
 */

import 'dotenv/config'
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { getGroqClient } from '../helpers/groq/client'
import { GENERATE_TESTS_SYSTEM } from '../helpers/groq/prompts/generateTests'
import { getPageSnapshot, getInteractiveElements } from '../helpers/selfHealing/snapshot'

function buildPrompt(url: string, task: string, snapshot: string, elements: string): string {
    return `
You are an expert QA automation engineer writing a Playwright test in TypeScript.

You have never seen this page before — there is no existing Page Object or
helper library for it. Everything you know about it is the live snapshot
below, captured by actually visiting the page just now. Do not invent
selectors, labels, or routes that aren't shown in the data below.

TARGET URL: ${url}

TASK:
${task}

ACCESSIBILITY SNAPSHOT:
${snapshot}

INTERACTIVE ELEMENTS (tag + available attributes):
${elements}

RULES:
1. import { test, expect } from '@playwright/test' — nothing else
2. Prefer getByRole/getByLabel/getByPlaceholder/getByText built from the
   snapshot; fall back to a CSS selector from an id/name/data-test/
   data-testid attribute shown above only if no accessible query fits
3. Start with await page.goto('${url}')
4. Do not reference any Page Object, fixture, or helper file — this page has
   none, everything must be self-contained in this one file
5. Cover the happy path and any failure/edge cases the task describes
6. NO SEMICOLONS anywhere — this project's house style (eslint
   \`semi: ['error', 'never']\`) omits them at the end of every statement
7. Return ONLY TypeScript code — no markdown fences, no explanation, start
   immediately with the import line
`.trim()
}

function slugify(url: string): string {
    return url
        .replace(/^https?:\/\//, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
}

async function main() {
    const url = process.argv[2]
    const task = process.argv[3]

    if (!url || !task) {
        console.error('Usage: npx tsx scripts/generateFromLivePage.ts <url> "<task description>"')
        process.exit(1)
    }

    console.log(`Visiting ${url} to capture a live snapshot...`)
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(url)

    const snapshot = await getPageSnapshot(page)
    const elements = await getInteractiveElements(page)
    await browser.close()

    console.log('Interactive elements found:')
    console.log(elements)
    console.log('\nGenerating spec from the live snapshot via Groq...')

    const client = getGroqClient()
    const prompt = buildPrompt(url, task, snapshot, elements)
    const code = await client.ask(
        prompt,
        GENERATE_TESTS_SYSTEM,
        { temperature: 0.1, maxTokens: 2000 }
    )

    const clean = code
        .replace(/^```typescript\n?/m, '')
        .replace(/^```ts\n?/m, '')
        .replace(/^```\n?/m, '')
        .replace(/```$/m, '')
        .trim()

    const outDir = path.join(process.cwd(), 'tests', 'specs', 'generated')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const outPath = path.join(outDir, `${slugify(url)}.generated.spec.ts`)
    fs.writeFileSync(outPath, clean, 'utf-8')

    console.log(`\nSaved: ${outPath}`)
    console.log('\n--- preview ---\n')
    console.log(clean)
}

main().catch(console.error)