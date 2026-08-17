/**
 * helpers/testSelection/discover.ts
 *
 * Finds every spec / setup file under tests/specs, recursively.
 */

import fs from 'fs'
import path from 'path'

export function findSpecFiles(dir: string = path.join(process.cwd(), 'tests/specs')): string[] {
    const results: string[] = []

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            results.push(...findSpecFiles(full))
        } else if (entry.isFile() && (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.setup.ts'))) {
            results.push(full)
        }
    }

    return results
}
