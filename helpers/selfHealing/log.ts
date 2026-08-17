/**
 * helpers/selfHealing/log.ts
 *
 * Persists every healing attempt (not just successes) to a JSONL file so a
 * report can be built after the run — mirrors how Playwright itself writes
 * per-test artifacts under test-results/, but as one shared append-only log
 * since healing events happen mid-test, not at a natural "end of run" hook.
 */

import fs from 'fs'
import path from 'path'
import type { HealMethod } from './types'

export interface HealingLogEntry {
    timestamp: string
    testTitle: string
    testFile: string
    description: string
    originalSelector: string
    healed: boolean
    method: HealMethod | null
    newSelector: string | null
}

const LOG_DIR = path.join(process.cwd(), 'test-results')
const LOG_FILE = path.join(LOG_DIR, 'self-healing-log.jsonl')

// test-results/ isn't wiped between runs (unlike Playwright's per-test output
// subfolders), so without this the log would accumulate across every run —
// clear it once per process, on the first write.
let clearedThisRun = false

export function logHealingEvent(entry: HealingLogEntry): void {
    try {
        if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

        if (!clearedThisRun) {
            fs.rmSync(LOG_FILE, { force: true })
            clearedThisRun = true
        }

        fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf-8')
    } catch {
        // Logging must never break a test
    }
}

export function readHealingLog(): HealingLogEntry[] {
    if (!fs.existsSync(LOG_FILE)) return []

    return fs
        .readFileSync(LOG_FILE, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line) as HealingLogEntry
            } catch {
                return null
            }
        })
        .filter((entry): entry is HealingLogEntry => entry !== null)
}
