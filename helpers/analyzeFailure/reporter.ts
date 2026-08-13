/**
 * Report generation - Markdown only
 */

import fs from 'fs'
import path from 'path'
import type { AnalysisResult } from './types'
import { getLogger } from './logger'

export class Reporter {
    private logger = getLogger()

    /**
     * Save Markdown summary
     */
    saveSummary(results: AnalysisResult[], outputDir?: string): string {
        const dir = outputDir || process.cwd()
        const summaryPath = path.join(dir, 'ai-analysis-summary.md')

        const content = this.buildMarkdown(results)
        fs.writeFileSync(summaryPath, content, 'utf-8')
        this.logger.info(`\n✅ Summary saved: ${summaryPath}`)

        this.updateGitHubStepSummary(content)

        return summaryPath
    }

    /**
     * Build Markdown report
     */
    private buildMarkdown(results: AnalysisResult[]): string {
        const lines: string[] = [
            '# 🤖 AI Analysis of Failed Tests',
            '',
            `**Generated:** ${new Date().toLocaleString()}`,
            '',
            '## Summary',
            '',
            `Total failures analyzed: **${results.length}**`,
            '',
        ]

        const successCount = results.filter(r => !r.error).length
        const errorCount = results.filter(r => r.error).length

        lines.push(`✅ Successfully analyzed: **${successCount}**`)
        if (errorCount > 0) {
            lines.push(`❌ Failed to analyze: **${errorCount}**`)
        }
        lines.push('')
        
        if (successCount > 0) {
            const successRate = Math.round((successCount / results.length) * 100)
            lines.push(`📈 Success rate: **${successRate}%**`)
            lines.push('')
        }

        lines.push('---')
        lines.push('')
        lines.push('## Detailed Analysis')
        lines.push('')

        for (const result of results) {
            lines.push(`### ❌ ${result.testName}`)
            lines.push('')
            
            if (result.error) {
                lines.push(`**⚠️ Analysis failed:** ${result.error}`)
            } else {
                // Clean up the analysis - remove extra empty lines
                const cleanAnalysis = result.analysis
                    .split('\n')
                    .filter(line => line.trim() !== '' || line.includes('##'))
                    .join('\n')
                lines.push(cleanAnalysis)
            }
            
            lines.push('')
            lines.push('---')
            lines.push('')
        }

        return lines.join('\n')
    }

    /**
     * Update GitHub Step Summary
     */
    private updateGitHubStepSummary(content: string): void {
        const githubStepSummary = process.env.GITHUB_STEP_SUMMARY
        if (githubStepSummary) {
            try {
                fs.appendFileSync(githubStepSummary, content)
                this.logger.info('GitHub Step Summary updated')
            } catch (error) {
                this.logger.warning(`Failed to update GitHub Step Summary: ${error}`)
            }
        }
    }

    /**
     * Export report
     */
    exportAll(results: AnalysisResult[], outputDir?: string): {
        markdown: string
    } {
        return {
            markdown: this.saveSummary(results, outputDir),
        }
    }
}

let reporterInstance: Reporter | null = null

export function getReporter(): Reporter {
    if (!reporterInstance) {
        reporterInstance = new Reporter()
    }
    return reporterInstance
}