import { getEventBus } from '@/utils/eventBus'
import { ParsedStyledFeature, InstructonType } from '@/rules/types'
import type { Tile } from '@/tiles/tile'
import { FeaturesStyledHandler } from '@/types'

export class BaseBucket {
    protected readonly renderType: InstructonType
    featuresStyledHandler: FeaturesStyledHandler

    constructor(renderType: InstructonType) {
        this.renderType = renderType
        this.featuresStyledHandler = this._featuresStyledHandler.bind(this)
        this.initFeatureWorkflow()
    }

    initFeatureWorkflow() {
        const eventBus = getEventBus()
        eventBus?.on('featuresStyled', this.featuresStyledHandler)
    }

    _featuresStyledHandler(data: { tile: Tile; styledFeatures: ParsedStyledFeature[]; groupedFeatures: Map<InstructonType, ParsedStyledFeature[]> }) {
        const typeFeatures = data.groupedFeatures.get(this.renderType)
        if (typeFeatures && typeFeatures.length > 0) {
            this.processFeatures(data.tile, typeFeatures)
        }
    }

    processFeatures(tile: Tile, styledFeatures: ParsedStyledFeature[]) {
        throw new Error('implemented in subclass')
    }
}
