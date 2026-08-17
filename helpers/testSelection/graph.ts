/**
 * helpers/testSelection/graph.ts
 *
 * Deterministic, AI-free dependency graph.
 *
 * Why not ask AI which specs are impacted by a change? Because that's a
 * probabilistic guess — for a CI gate deciding what regression to run, a
 * wrong guess silently skips a real regression. A static import scan is
 * cheap, exact, and instant. AI's job (see helpers/riskAnalysis) is the
 * judgment call on top: what's risky and what's NOT covered at all.
 *
 * Resolves only relative ('./', '../') imports — bare package imports
 * (@playwright/test, dotenv, ...) are irrelevant to local change impact.
 */

import fs from 'fs'
import path from 'path'

const IMPORT_LINE = /^\s*(?:import|export)\b.*\bfrom\s+['"](\.[^'"]+)['"]/

function readLocalImports(file: string): string[] {
    const content = fs.readFileSync(file, 'utf-8')
    const specifiers: string[] = []

    for (const line of content.split('\n')) {
        const match = line.match(IMPORT_LINE)
        if (match) specifiers.push(match[1])
    }

    return specifiers
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
    const base = path.resolve(path.dirname(fromFile), specifier)
    const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate
    }

    return null
}

/**
 * Returns a map of entryFile -> set of every local file it transitively imports.
 */
export function buildDependencyGraph(entryFiles: string[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()

    function visit(file: string): Set<string> {
        const existing = graph.get(file)
        if (existing) return existing

        const deps = new Set<string>()
        graph.set(file, deps) // placeholder guards against import cycles

        for (const specifier of readLocalImports(file)) {
            const resolved = resolveSpecifier(file, specifier)
            if (!resolved || resolved === file) continue

            deps.add(resolved)
            for (const nested of visit(resolved)) deps.add(nested)
        }

        return deps
    }

    for (const entry of entryFiles) visit(entry)
    return graph
}
