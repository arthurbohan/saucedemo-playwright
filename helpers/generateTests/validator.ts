/**
 * helpers/scripts/generateTests/validator.ts
 *
 * Typechecks a freshly generated spec against the whole project (tsc needs
 * the full program graph to resolve '../../pages' etc. correctly — there's
 * no reliable single-file mode), then filters the output down to just the
 * lines for that file. Feeds scripts/generateTests.ts's fix-and-retry loop:
 * a generation that ignores an explicit instruction already in the prompt
 * (wrong import path, wrong method name) shows up here as a compiler error,
 * not just something a human catches later by hand.
 */

import { execFileSync } from 'child_process'
import path from 'path'

export type TypeCheckResult = {
  ok: boolean
  errors: string
}

export function typeCheckFile(filePath: string): TypeCheckResult {
  const relativePath = path.relative(process.cwd(), filePath)

  try {
    execFileSync('npx', ['tsc', '--noEmit'], { encoding: 'utf-8', stdio: 'pipe' })
    return { ok: true, errors: '' }
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? ''
    const relevant = output
      .split('\n')
      .filter(line => line.startsWith(relativePath))
      .join('\n')

    // A project-wide tsc failure unrelated to this file (pre-existing
    // errors elsewhere) isn't this generation's problem — only fail on
    // errors actually attributed to the file we just wrote.
    return { ok: relevant.length === 0, errors: relevant }
  }
}
