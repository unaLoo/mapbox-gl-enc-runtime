import type { ENCFeature } from '../../types'
import { FeatureStylingContext, StyledFeature } from '@/rules/types'
import { interpret, prepare } from '@/rules/Interpreter'


export function interpretFeatures(context: FeatureStylingContext, features: ENCFeature[]): StyledFeature[] {
    return features.map(feat => {
        return interpret(context, feat)
    }).flat(1)
}
