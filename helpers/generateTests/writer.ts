/**
 * helpers/scripts/generateTests/writer.ts
 *
 * Saves generated TypeScript code to disk.
 * Strips markdown fences if the model added them.
 */

import fs   from 'fs'
import path from 'path'

// Flat on purpose: generated specs live at the same depth as
// tests/specs/features/*.spec.ts so the AI's '../../xxx' imports resolve
// correctly. UI vs API is distinguished by filename (api.generated.spec.ts)
// via testMatch in the two playwright.config.ts *-generated projects.
const OUTPUT_DIR = path.join(process.cwd(), 'tests', 'specs', 'generated')

export function saveGeneratedSpec(feature: string, code: string): string {
  // Defense in depth: `feature` ends up in a filesystem path below. Even
  // though the CLI validates it against known feature keys first, this
  // module shouldn't trust that every future caller will — a value like
  // '../../../etc/passwd' would otherwise let path.join() escape OUTPUT_DIR.
  if (!/^[a-zA-Z0-9_-]+$/.test(feature)) {
    throw new Error(`Invalid feature name: "${feature}" — must be alphanumeric/dash/underscore only`)
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`  Created output folder: ${OUTPUT_DIR}`)
  }

  // Strip markdown code fences if Groq added them
  const clean = code
    .replace(/^```typescript\n?/m, '')
    .replace(/^```ts\n?/m, '')
    .replace(/^```\n?/m, '')
    .replace(/```$/m, '')
    .trim()

  const filePath = path.join(OUTPUT_DIR, `${feature}.generated.spec.ts`)
  fs.writeFileSync(filePath, clean, 'utf-8')
  return filePath
}

export function previewCode(code: string, lines = 8): string {
  return code.split('\n').slice(0, lines).join('\n')
}