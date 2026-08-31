#!/usr/bin/env node

/**
 * scripts/generateTests.ts
 *
 * Entry point for AI test-case generation (ai:generate). Generates a
 * first-draft spec file per feature (login, inventory, checkout, api) from
 * the descriptions in helpers/generateTests/features.ts, using the real
 * Page Object source as context (helpers/claude/prompts/generateTests.ts).
 *
 * Runs through the Claude Code CLI subprocess client (helpers/claude/),
 * authenticated with a Pro/Max subscription's CLAUDE_CODE_OAUTH_TOKEN —
 * same reasoning as scripts/analyzeFailure.ts. helpers/generateTests/
 * generator.ts only needs an { ask() } client plus a prompt source, so
 * nothing in there is Claude-specific.
 *
 * scripts/generateFromLivePage.ts (ai:generate:live) is a different tool
 * and still runs on Groq — it generates for a page with no Page Object at
 * all, so it doesn't share generator.ts's prompt/context path with this
 * script; no reason to move it too.
 */

import 'dotenv/config'
import { getClaudeClient } from '../helpers/claude/client'
import {
    GENERATE_TESTS_SYSTEM,
    buildGeneratePrompt,
    buildFixTestPrompt,
} from '../helpers/claude/prompts'
import {
    generateSpec,
    fixSpec,
    saveGeneratedSpec,
    previewCode,
    typeCheckFile,
    FEATURE_DESCRIPTIONS,
    type FeatureKey,
    type PromptSource,
} from '../helpers/generateTests/index'

const MAX_FIX_ATTEMPTS = 2

const PROMPT_SOURCE: PromptSource = {
    systemPrompt: GENERATE_TESTS_SYSTEM,
    buildGeneratePrompt,
    buildFixTestPrompt,
}

function isFeatureKey(value: string): value is FeatureKey {
    return value in FEATURE_DESCRIPTIONS
}

async function main() {
    const featureArg = process.argv[2]

    if (featureArg !== undefined && !isFeatureKey(featureArg)) {
        // `as FeatureKey` on argv would silently accept anything (including
        // '../../../etc/passwd') — this is a real runtime check, not a cast,
        // because that value ends up in a filesystem path in writer.ts.
        console.error(`Unknown feature: "${featureArg}". Valid features: ${Object.keys(FEATURE_DESCRIPTIONS).join(', ')}`)
        process.exit(1)
    }

    const features = featureArg
        ? [featureArg]
        : (Object.keys(FEATURE_DESCRIPTIONS) as FeatureKey[])

    const client = getClaudeClient()

    for (const feature of features) {
        console.log(`\nGenerating: ${feature}`)
        let code = await generateSpec(feature, FEATURE_DESCRIPTIONS[feature], client, PROMPT_SOURCE)
        let filePath = saveGeneratedSpec(feature, code)

        let attempt = 0
        let result = typeCheckFile(filePath)
        while (!result.ok && attempt < MAX_FIX_ATTEMPTS) {
            attempt++
            console.log(`  Type errors found — asking Claude to fix (attempt ${attempt}/${MAX_FIX_ATTEMPTS}):`)
            console.log(result.errors)
            code = await fixSpec(code, result.errors, client, PROMPT_SOURCE)
            filePath = saveGeneratedSpec(feature, code)
            result = typeCheckFile(filePath)
        }

        if (!result.ok) {
            console.error(`  ⚠️  Still has type errors after ${MAX_FIX_ATTEMPTS} fix attempt(s) — review manually:`)
            console.error(result.errors)
        } else if (attempt > 0) {
            console.log(`  ✅ Fixed after ${attempt} attempt(s)`)
        }

        console.log(`Saved: ${filePath}`)
        console.log(previewCode(code))
    }
}

main().catch(console.error)
