/**
 * Logger with GitHub Actions support
 */

export class Logger {
    private isCI: boolean

    constructor() {
        this.isCI = !!process.env.CI
    }

    /**
     * Group logs for GitHub Actions
     */
    group(title: string, content: string) {
        if (this.isCI) {
            console.log(`::group::AI Analysis: ${title}`)
            console.log(content)
            console.log('::endgroup::')
        } else {
            console.log(`\n${'─'.repeat(60)}`)
            console.log(`AI Analysis: ${title}`)
            console.log('─'.repeat(60))
            console.log(content)
        }
    }

    /**
     * Log error messages
     */
    error(message: string) {
        if (this.isCI) {
            console.log(`::error::${message}`)
        } else {
            console.error(`ERROR: ${message}`)
        }
    }

    /**
     * Log notice messages
     */
    notice(message: string) {
        if (this.isCI) {
            console.log(`::notice::${message}`)
        } else {
            console.log(`INFO: ${message}`)
        }
    }

    /**
     * Log info messages
     */
    info(message: string) {
        console.log(message)
    }

    /**
     * Log warning messages
     */
    warning(message: string) {
        if (this.isCI) {
            console.log(`::warning::${message}`)
        } else {
            console.warn(`WARNING: ${message}`)
        }
    }

    /**
     * Create a section in logs
     */
    section(title: string) {
        if (!this.isCI) {
            console.log(`\n${'═'.repeat(60)}`)
            console.log(`  ${title}`)
            console.log('═'.repeat(60))
        }
    }

    /**
     * Log progress with progress bar
     */
    progress(current: number, total: number, message?: string) {
        const percent = Math.round((current / total) * 100)
        const bar = '█'.repeat(Math.round(percent / 2)) + '░'.repeat(50 - Math.round(percent / 2))
        console.log(`[${bar}] ${percent}% ${message || ''}`)
    }

    /**
     * Log success message
     */
    success(message: string) {
        console.log(`✅ ${message}`)
    }

    /**
     * Log failure message
     */
    failure(message: string) {
        console.log(`❌ ${message}`)
    }
}

let loggerInstance: Logger | null = null

export function getLogger(): Logger {
    if (!loggerInstance) {
        loggerInstance = new Logger()
    }
    return loggerInstance
}