/**
 * helpers/riskAnalysis/reporter.ts
 *
 * Saves the risk report as ai-risk-analysis.md, mirroring the
 * ai-analysis-summary.md convention from helpers/analyzeFailure.
 */

import fs from 'fs'
import path from 'path'
import { getLogger } from '../analyzeFailure/logger'

export interface RiskReportMeta {
    base: string
    changedFiles: string[]
}

export function saveRiskReport(content: string, meta: RiskReportMeta): string {
    const logger = getLogger()

    const header = [
        '# 🎯 AI Risk Analysis',
        '',
        `**Generated:** ${new Date().toLocaleString()}`,
        `**Compared against:** ${meta.base}`,
        `**Changed files:** ${meta.changedFiles.length}`,
        '',
        '---',
        '',
    ].join('\n')

    const full = `${header}${content.trim()}\n`
    const filePath = path.join(process.cwd(), 'ai-risk-analysis.md')

    fs.writeFileSync(filePath, full, 'utf-8')
    logger.info(`\n✅ Risk report saved: ${filePath}`)

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, full)
    }

    return filePath
}
