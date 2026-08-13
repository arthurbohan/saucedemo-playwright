/**
 * Cache for analysis results to avoid duplicate API calls
 */

import fs from 'fs'
import path from 'path'
import type { CacheEntry } from './types'
import { CACHE_CONFIG } from './config'
import { getLogger } from './logger'

export class AnalysisCache {
    private cachePath: string
    private cache: Map<string, CacheEntry> = new Map()
    private logger = getLogger()
    private maxAge: number

    constructor() {
        this.cachePath = path.join(
            process.cwd(),
            CACHE_CONFIG.CACHE_DIR,
            CACHE_CONFIG.CACHE_FILE
        )
        this.maxAge = CACHE_CONFIG.MAX_AGE_DAYS * 24 * 60 * 60 * 1000
        this.load()
    }

    /**
     * Load cache from disk
     */
    load(): void {
        try {
            const dir = path.dirname(this.cachePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            if (fs.existsSync(this.cachePath)) {
                const data = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'))
                for (const [key, value] of Object.entries(data)) {
                    this.cache.set(key, value as CacheEntry)
                }
                this.logger.info(`📦 Cache loaded: ${this.cache.size} entries`)
                this.clean()
            }
        } catch (error) {
            this.logger.warning(`Failed to load cache: ${error}`)
        }
    }

    /**
     * Save cache to disk
     */
    save(): void {
        try {
            const data = Object.fromEntries(this.cache)
            const dir = path.dirname(this.cachePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2))
        } catch (error) {
            this.logger.warning(`Failed to save cache: ${error}`)
        }
    }

    /**
     * Get cached analysis
     */
    get(testName: string, content: string): string | null {
        const entry = this.cache.get(testName)
        if (!entry) return null

        // Check if content has changed
        const contentHash = this.hash(content)
        if (entry.testHash !== contentHash) {
            this.logger.info(`  Cache miss: content changed for "${testName}"`)
            return null
        }

        // Check age
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.logger.info(`  Cache expired: "${testName}" (${this.formatAge(entry.timestamp)} old)`)
            this.cache.delete(testName)
            this.save()
            return null
        }

        this.logger.info(`  ✅ Cache hit: "${testName}"`)
        return entry.analysis
    }

    /**
     * Save analysis to cache
     */
    set(testName: string, content: string, analysis: string): void {
        this.cache.set(testName, {
            analysis,
            timestamp: Date.now(),
            testHash: this.hash(content),
        })
        this.save()
    }

    /**
     * Remove old entries
     */
    clean(): void {
        let removed = 0
        const now = Date.now()

        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.maxAge) {
                this.cache.delete(key)
                removed++
            }
        }

        if (removed > 0) {
            this.logger.info(`🧹 Removed ${removed} expired cache entries`)
            this.save()
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear()
        this.save()
        this.logger.info('🧹 Cache cleared')
    }

    /**
     * Get cache statistics
     */
    getStats(): { total: number; oldest: string | null; newest: string | null } {
        let oldest: CacheEntry | null = null
        let newest: CacheEntry | null = null

        for (const [, entry] of this.cache) {
            if (!oldest || entry.timestamp < oldest.timestamp) {
                oldest = entry
            }
            if (!newest || entry.timestamp > newest.timestamp) {
                newest = entry
            }
        }

        return {
            total: this.cache.size,
            oldest: oldest ? this.formatAge(oldest.timestamp) : null,
            newest: newest ? this.formatAge(newest.timestamp) : null,
        }
    }

    /**
     * Simple string hash
     */
    private hash(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return hash.toString(36)
    }

    /**
     * Format age for display
     */
    private formatAge(timestamp: number): string {
        const age = Date.now() - timestamp
        const hours = Math.floor(age / (1000 * 60 * 60))
        if (hours < 24) {
            return `${hours}h ago`
        }
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }
}

let cacheInstance: AnalysisCache | null = null

export function getCache(): AnalysisCache {
    if (!cacheInstance) {
        cacheInstance = new AnalysisCache()
    }
    return cacheInstance
}