/**
 * helpers/git/diff.ts
 *
 * Reads what changed in the working copy, with graceful fallbacks so the
 * risk-analysis and test-selection scripts are never a no-op in a demo.
 *
 * Resolution order:
 *   1. explicit base ref (CLI arg) or origin/main / main, if the diff is non-empty
 *   2. uncommitted changes (working tree vs HEAD)
 *   3. last commit (HEAD~1 vs HEAD) — so a clean checkout still has something to show
 */

import { execFileSync } from 'child_process'

const RELEVANT_PATHS = ['tests', 'helpers', 'scripts', 'playwright.config.ts']

export interface DiffResult {
    /** Human-readable description of what was compared */
    base: string
    changedFiles: string[]
    diff: string
}

// execFileSync (not execSync) — args are passed as an argv array with no
// shell involved, so a ref containing shell metacharacters (`; rm -rf ~`,
// `$(...)`) is just an invalid git ref, never interpreted code. explicitBase
// here traces back to a CLI arg (and in CI, a PR base-branch name) — treat
// any of that as untrusted input, not something safe to string-interpolate
// into a shell command.
function git(args: string[]): string {
    return execFileSync('git', args, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 20 }).trim()
}

function refExists(ref: string): boolean {
    try {
        git(['rev-parse', '--verify', ref])
        return true
    } catch {
        return false
    }
}

function changedFilesFor(revs: string[]): string[] {
    return git(['diff', '--name-only', ...revs]).split('\n').filter(Boolean)
}

function diffFor(revs: string[]): string {
    return git(['diff', ...revs, '--', ...RELEVANT_PATHS])
}

function resolveBaseRef(explicit?: string): string | null {
    if (explicit) return explicit
    if (refExists('origin/main')) return 'origin/main'
    if (refExists('main')) return 'main'
    return null
}

export function getDiff(explicitBase?: string): DiffResult {
    const base = resolveBaseRef(explicitBase)

    if (base) {
        const range = `${base}...HEAD`
        const changedFiles = changedFilesFor([range])
        if (changedFiles.length > 0) {
            return { base: range, changedFiles, diff: diffFor([range]) }
        }
    }

    const uncommitted = changedFilesFor(['HEAD'])
    if (uncommitted.length > 0) {
        return { base: 'working tree (uncommitted)', changedFiles: uncommitted, diff: diffFor(['HEAD']) }
    }

    return {
        base: 'HEAD~1...HEAD',
        changedFiles: changedFilesFor(['HEAD~1', 'HEAD']),
        diff: diffFor(['HEAD~1', 'HEAD']),
    }
}
