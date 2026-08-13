import 'dotenv/config'
import {
    generateSpec,
    saveGeneratedSpec,
    previewCode,
    FEATURE_DESCRIPTIONS,
    type FeatureKey,
} from '../helpers/generateTests/index'

async function main() {
    const featureArg = process.argv[2] as FeatureKey | undefined
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