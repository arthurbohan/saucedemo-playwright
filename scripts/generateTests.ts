import 'dotenv/config'
import {
    generateSpec,
    saveGeneratedSpec,
    previewCode,
    FEATURE_DESCRIPTIONS,
    type FeatureKey,
} from '../helpers/generateTests/index'

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
        const code = await generateSpec(feature, FEATURE_DESCRIPTIONS[feature])
        const filePath = saveGeneratedSpec(feature, code)
        console.log(`Saved: ${filePath}`)
        console.log(previewCode(code))
    }
}

main().catch(console.error)