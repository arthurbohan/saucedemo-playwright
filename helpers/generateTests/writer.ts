/**
 * helpers/scripts/generateTests/writer.ts
 *
 * Saves generated TypeScript code to disk.
 * Strips markdown fences if the model added them.
 */

import fs   from 'fs'
import path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), 'tests', 'specs', 'generated')

export function saveGeneratedSpec(feature: string, code: string): string {
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