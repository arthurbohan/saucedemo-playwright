/**
 * helpers/selfHealing/reporter.ts
 *
 * Builds self-healing-summary.md from the JSONL log — same convention as
 * helpers/analyzeFailure/reporter.ts and helpers/riskAnalysis/reporter.ts.
 */

import fs from 'fs'
import path from 'path'
import type { HealingLogEntry } from './log'

function escapeMd(text: string): string {
    return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function buildMarkdown(entries: HealingLogEntry[]): string {
    const healed = entries.filter(e => e.healed)
    const failed = entries.filter(e => !e.healed)

    const lines: string[] = [
        '# 🩹 Self-Healing Summary',
        '',
        `**Generated:** ${new Date().toLocaleString()}`,
        '',
        `Total healing attempts: **${entries.length}**`,
        `✅ Healed: **${healed.length}**`,
    ]

    if (failed.length > 0) {
        lines.push(`❌ Could not heal: **${failed.length}**`)
    }

    lines.push(
        '',
        '> Every row below is a test whose ORIGINAL locator failed and had to be',
        '> recovered — the assertions still ran for real, but the selector the',
        '> Page Object depends on has drifted from the actual page. A healed pass',
        '> is not the same confidence as a plain pass: treat it as a prompt to',
        '> update the Page Object, and for anything UI-visible, a cue for manual',
        '> review rather than silent green.',
        '',
        '---',
        ''
    )

    if (healed.length > 0) {
        lines.push('## ✅ Healed', '')
        lines.push('| Test | Description | Original selector | Via | New selector |')
        lines.push('|---|---|---|---|---|')
        for (const e of healed) {
            lines.push(
                `| ${escapeMd(e.testFile)}: ${escapeMd(e.testTitle)} ` +
                `| ${escapeMd(e.description)} ` +
                `| \`${escapeMd(e.originalSelector)}\` ` +
                `| ${e.method ?? '—'} ` +
                `| \`${escapeMd(e.newSelector ?? '')}\` |`
            )
        }
        lines.push('')
    }

    if (failed.length > 0) {
        lines.push('## ❌ Could not heal', '')
        lines.push('| Test | Description | Original selector |')
        lines.push('|---|---|---|')
        for (const e of failed) {
            lines.push(
                `| ${escapeMd(e.testFile)}: ${escapeMd(e.testTitle)} ` +
                `| ${escapeMd(e.description)} ` +
                `| \`${escapeMd(e.originalSelector)}\` |`
            )
        }
        lines.push('')
    }

    return lines.join('\n')
}

export function saveHealingSummary(entries: HealingLogEntry[]): string {
    const content = buildMarkdown(entries)
    const filePath = path.join(process.cwd(), 'self-healing-summary.md')
    fs.writeFileSync(filePath, content, 'utf-8')

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, content)
    }

    return filePath
}
