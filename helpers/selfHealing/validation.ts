/**
 * Selector validation and sanitization
 */

import { VALID_ROLES } from './config'

export function isValidPlaywrightSelector(selector: string): boolean {
    if (!selector || selector.length < 2) return false

    // Invalid patterns
    const invalidPatterns = [
        /:near\(/,
        /:has\(/,
        /combobox\[role/,
        /\[role="combobox"\]/,
        /:contains\(/,
        /\.\s/,
        /\s{2,}/,
    ]

    for (const pattern of invalidPatterns) {
        if (pattern.test(selector)) return false
    }

    // Validate role selector
    if (selector.startsWith('role=')) {
        const roleMatch = selector.match(/^role=(\w+)(?:\[name="([^"]+)"\])?$/)
        if (!roleMatch) return false
        const role = roleMatch[1]!
        return (VALID_ROLES as readonly string[]).includes(role)
    }

    // Validate XPath
    if (selector.startsWith('//') || selector.startsWith('(//')) {
        return selector.length > 3 && !selector.includes('script')
    }

    // Validate CSS selector
    if (!selector.startsWith('role=') && !selector.startsWith('/')) {
        const clean = selector.replace(/\\./g, '')
        if (!/^[a-zA-Z_#.[\]]/.test(clean)) return false

        const quotes = (selector.match(/["']/g) || []).length
        if (quotes % 2 !== 0) return false
    }

    return true
}

export function sanitizeSelector(raw: string): string {
    return raw
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .trim()
}