#!/usr/bin/env node

/**
 * scripts/mergeHealingSummary.ts
 *
 * test-e2e shards each other and each writes its own
 * test-results/self-healing-log.jsonl independently, so there's no single
 * "this run's healing activity" anywhere by default. This walks a directory
 * of downloaded per-shard artifacts, merges every self-healing-log.jsonl it
 * finds, and writes one combined self-healing-summary.md — same builder
 * summarizeHealing.ts uses, just fed merged entries instead of one shard's.
 *
 * Usage:
 *   npx tsx scripts/mergeHealingSummary.ts <directory-of-downloaded-artifacts>
 *   npm run healing:merge -- <directory>
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { readHealingLogsFromFiles, saveHealingSummary } from '../helpers/selfHealing'
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
    logger.section('🩹 Merging Self-Healing Summaries')

    const dir = process.argv[2]
    if (!dir) {
        logger.error('Usage: mergeHealingSummary.ts <directory>')
        process.exit(1)
    }

    const files = findLogFiles(dir)
    logger.info(`Found ${files.length} shard log(s) under ${dir}`)

    const entries = readHealingLogsFromFiles(files)
    if (entries.length === 0) {
        logger.notice('No self-healing activity recorded across any shard this run')
    } else {
        const healedCount = entries.filter(e => e.healed).length
        logger.info(`${entries.length} healing attempt(s) — ${healedCount} healed, ${entries.length - healedCount} could not be healed`)
    }

    const filePath = saveHealingSummary(entries)
    logger.success(`Merged summary saved: ${filePath}`)
}

main()
