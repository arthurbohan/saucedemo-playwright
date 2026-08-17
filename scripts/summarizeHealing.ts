#!/usr/bin/env node

/**
 * scripts/summarizeHealing.ts
 *
 * Reads test-results/self-healing-log.jsonl (written live by heal() during
 * the Playwright run) and produces self-healing-summary.md — a human-
 * reviewable record of every locator that had to be recovered this run, so
 * a healed pass never looks identical to a plain one in the reports.
 *
 * Usage:
 *   npx tsx scripts/summarizeHealing.ts
 *   npm run healing:summary
 */

import 'dotenv/config'
import { readHealingLog, saveHealingSummary } from '../helpers/selfHealing'
import { getLogger } from '../helpers/analyzeFailure/logger'

function main() {
    const logger = getLogger()
    logger.section('🩹 Self-Healing Summary')

    const entries = readHealingLog()

    if (entries.length === 0) {
        logger.notice('No self-healing activity recorded for this run')
        process.exit(0)
    }

    const healedCount = entries.filter(e => e.healed).length
    logger.info(`${entries.length} healing attempt(s) — ${healedCount} healed, ${entries.length - healedCount} could not be healed`)

    const filePath = saveHealingSummary(entries)
    logger.success(`Summary saved: ${filePath}`)

    if (healedCount > 0) {
        logger.warning(`${healedCount} test(s) passed via a healed locator this run — review ${filePath}`)
    }
}

main()
