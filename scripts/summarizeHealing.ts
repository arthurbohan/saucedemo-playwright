#!/usr/bin/env node

/**
 * scripts/summarizeHealing.ts
 *
 * Reads test-results/self-healing-log.jsonl (written live by heal() during
 * the Playwright run) and produces self-healing-summary.md — a human-
 * reviewable record of every locator that had to be recovered this run, so
 * a healed pass never looks identical to a plain one in the reports.
 *
 * With a directory argument, merges every self-healing-log.jsonl found
 * under it instead — e.g. several downloaded per-shard CI artifacts — into
 * one combined report. Used by pr-checks.yml's merge-healing-summary job to
 * post a single PR comment instead of 4 separate per-shard ones. Unlike the
 * no-argument mode, this always writes the file even with zero entries — a
 * "no healing this run" PR comment is still useful, and the sticky-comment
 * step needs a file to exist either way.
 *
 * Usage:
 *   npx tsx scripts/summarizeHealing.ts
 *   npx tsx scripts/summarizeHealing.ts <directory-of-downloaded-shard-logs>
 *   npm run healing:summary [-- <directory>]
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { readHealingLog, readHealingLogsFromFiles, saveHealingSummary } from '../helpers/selfHealing'
import { getLogger } from '../helpers/analyzeFailure/logger'

function findLogFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return []

    const results: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            results.push(...findLogFiles(full))
        } else if (entry.name === 'self-healing-log.jsonl') {
            results.push(full)
        }
    }
    return results
}

function main() {
    const logger = getLogger()
    const dir = process.argv[2]

    let entries
    if (dir) {
        logger.section('🩹 Merging Self-Healing Summaries')
        const files = findLogFiles(dir)
        logger.info(`Found ${files.length} shard log(s) under ${dir}`)
        entries = readHealingLogsFromFiles(files)
    } else {
        logger.section('🩹 Self-Healing Summary')
        entries = readHealingLog()
    }

    if (entries.length === 0 && !dir) {
        logger.notice('No self-healing activity recorded for this run')
        process.exit(0)
    }

    const healedCount = entries.filter(e => e.healed).length

    if (entries.length === 0) {
        logger.notice('No self-healing activity recorded across any shard this run')
    } else {
        logger.info(`${entries.length} healing attempt(s) — ${healedCount} healed, ${entries.length - healedCount} could not be healed`)
    }

    const filePath = saveHealingSummary(entries)
    logger.success(`Summary saved: ${filePath}`)

    if (healedCount > 0) {
        logger.warning(`${healedCount} test(s) passed via a healed locator this run — review ${filePath}`)
    }
}

main()
