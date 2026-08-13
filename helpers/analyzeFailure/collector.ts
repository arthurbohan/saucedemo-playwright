/**
 * Failure files collector from test-results
 */

import fs from 'fs'
import path from 'path'
import type { FailureInfo } from './types'
import { getLogger } from './logger'

export class FailureCollector {
    private logger = getLogger()

    /**
     * Find all failed tests in test-results
     */
    collect(unique: boolean = true): FailureInfo[] {
        const testResultsDir = path.join(process.cwd(), 'test-results')

        if (!fs.existsSync(testResultsDir)) {
            this.logger.notice('test-results directory not found — no failed tests')
            return []
        }

        const failures: FailureInfo[] = []

        this.scanDirectory(testResultsDir, failures)

        // Sort by modification time (newest first)
        const sorted = failures.sort((a, b) =>
            fs.statSync(b.filePath).mtimeMs - fs.statSync(a.filePath).mtimeMs
        )

        // Remove duplicates if requested
        if (unique) {
            return this.deduplicate(sorted)
        }

        return sorted
    }

    /**
     * Recursively scan directory
     */
    private scanDirectory(dir: string, failures: FailureInfo[]): void {
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file)
            
            if (fs.statSync(fullPath).isDirectory()) {
                this.scanDirectory(fullPath, failures)
            } else if (file === 'error-context.md') {
                const failure = this.parseFailureFile(fullPath)
                if (failure) {
                    failures.push(failure)
                }
            }
        }
    }

    /**
     * Parse failure file
     */
    private parseFailureFile(filePath: string): FailureInfo | null {
        const parentDirName = path.basename(path.dirname(filePath))

        // Skip retry attempts
        if (parentDirName.includes('-retry')) {
            this.logger.info(`Skipping retry analysis for: ${parentDirName}`)
            return null
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8')
            const testName = parentDirName
                .replace(/-chromium$/, '')
                .replace(/-webkit$/, '')
                .replace(/-firefox$/, '')
                .replace(/-electron$/, '')
                .replace(/-retry\d*$/, '')
                .replace(/-/g, ' ')
                .trim()

            return {
                filePath,
                content,
                testName,
            }
        } catch (error) {
            this.logger.error(`Failed to parse failure file: ${filePath}`)
            return null
        }
    }

    /**
     * Remove duplicate failures by test name
     */
    private deduplicate(failures: FailureInfo[]): FailureInfo[] {
        const seen = new Set<string>()
        const unique: FailureInfo[] = []

        let duplicates = 0

        for (const failure of failures) {
            if (seen.has(failure.testName)) {
                this.logger.info(`  Duplicate: ${failure.testName} (skipping)`)
                duplicates++
                continue
            }
            seen.add(failure.testName)
            unique.push(failure)
        }

        if (duplicates > 0) {
            this.logger.warning(`⚠️  ${duplicates} duplicate failures removed`)
        }

        return unique
    }

    /**
     * Get statistics about failures
     */
    getStats(failures: FailureInfo[]) {
        const uniqueTests = new Set(failures.map(f => f.testName))
        return {
            total: failures.length,
            unique: uniqueTests.size,
            duplicates: failures.length - uniqueTests.size,
            files: failures.map(f => path.basename(f.filePath)),
        }
    }
}

let collectorInstance: FailureCollector | null = null

export function getCollector(): FailureCollector {
    if (!collectorInstance) {
        collectorInstance = new FailureCollector()
    }
    return collectorInstance
}