import 'dotenv/config'
import {
    generateSpec,
    fixSpec,
    saveGeneratedSpec,
    previewCode,
    typeCheckFile,
    FEATURE_DESCRIPTIONS,
    type FeatureKey,
} from '../helpers/generateTests/index'

const MAX_FIX_ATTEMPTS = 2

function isFeatureKey(value: string): value is FeatureKey {
    return value in FEATURE_DESCRIPTIONS
}

async function main() {
    const featureArg = process.argv[2]

    if (featureArg !== undefined && !isFeatureKey(featureArg)) {
        // `as FeatureKey` on argv would silently accept anything (including
        // '../../../etc/passwd') — this is a real runtime check, not a cast,
        // because that value ends up in a filesystem path in writer.ts.
        console.error(`Unknown feature: "${featureArg}". Valid features: ${Object.keys(FEATURE_DESCRIPTIONS).join(', ')}`)
        process.exit(1)
    }

    const features = featureArg
        ? [featureArg]
        : (Object.keys(FEATURE_DESCRIPTIONS) as FeatureKey[])

    for (const feature of features) {
        console.log(`\nGenerating: ${feature}`)
        let code = await generateSpec(feature, FEATURE_DESCRIPTIONS[feature])
        let filePath = saveGeneratedSpec(feature, code)

        let attempt = 0
        let result = typeCheckFile(filePath)
        while (!result.ok && attempt < MAX_FIX_ATTEMPTS) {
            attempt++
            console.log(`  Type errors found — asking Groq to fix (attempt ${attempt}/${MAX_FIX_ATTEMPTS}):`)
            console.log(result.errors)
            code = await fixSpec(code, result.errors)
            filePath = saveGeneratedSpec(feature, code)
            result = typeCheckFile(filePath)
        }

        if (!result.ok) {
            console.error(`  ⚠️  Still has type errors after ${MAX_FIX_ATTEMPTS} fix attempt(s) — review manually:`)
            console.error(result.errors)
        } else if (attempt > 0) {
            console.log(`  ✅ Fixed after ${attempt} attempt(s)`)
        }

        console.log(`Saved: ${filePath}`)
        console.log(previewCode(code))
    }
}

main().catch(console.error)