/**
 * helpers/testSelection/select.ts
 *
 * Given changed files and the dependency graph, decides which specs
 * actually need to run.
 */

import path from 'path'

export interface SelectionResult {
    /** Spec files impacted, relative to repo root */
    impactedSpecs: string[]
    /** True when the change is broad enough that per-spec selection isn't safe */
    fullRegression: boolean
    reason: string
}

const GLOBAL_FILES = ['playwright.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json']

export function selectImpactedSpecs(
    changedFiles: string[],
    graph: Map<string, Set<string>>,
    allSpecFiles: string[]
): SelectionResult {
    const root = process.cwd()
    const changedAbs = changedFiles.map(f => path.resolve(root, f))

    if (changedFiles.some(f => GLOBAL_FILES.includes(f))) {
        return {
            impactedSpecs: allSpecFiles.map(f => path.relative(root, f)),
            fullRegression: true,
            reason: 'Changed files include shared config (playwright.config.ts / package.json / tsconfig.json) — running full regression.',
        }
    }

    const impacted = allSpecFiles.filter(spec => {
        if (changedAbs.includes(spec)) return true
        const deps = graph.get(spec) ?? new Set<string>()
        return changedAbs.some(f => deps.has(f))
    })

    if (impacted.length === 0) {
        return {
            impactedSpecs: [],
            fullRegression: false,
            reason: 'No test-relevant files changed — nothing to run.',
        }
    }

    return {
        impactedSpecs: impacted.map(f => path.relative(root, f)),
        fullRegression: false,
        reason: `${impacted.length}/${allSpecFiles.length} specs depend on the changed files (static import analysis).`,
    }
}
