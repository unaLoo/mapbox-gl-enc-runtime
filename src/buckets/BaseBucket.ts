import { getEventBus } from '@/utils/eventBus'
import { ParsedStyledFeature, InstructonType } from '@/rules/types'
import type { Tile } from '@/tiles/tile'
import { FeaturesStyledHandler, LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'

export class BaseBucket {
	protected readonly layeredGroupKey: LayeredGroupKey
	featuresStyledHandler: FeaturesStyledHandler

	constructor(layeredGroupKey: LayeredGroupKey) {
		this.layeredGroupKey = layeredGroupKey
		this.featuresStyledHandler = this._featuresStyledHandler.bind(this)
		this.initFeatureWorkflow()
	}

	initFeatureWorkflow() {
		const eventBus = getEventBus()
		eventBus?.on('featuresStyled', this.featuresStyledHandler)
	}
	_featuresStyledHandler(data: {
		tile: Tile
		tileSourceId: string
		layeredStyledFeatures: LayeredParsedStyledFeature[]
		groupedFeatures: globalThis.Map<LayeredGroupKey, LayeredParsedStyledFeature[]>
	}) {
		const layeredStyledFeatures = data.groupedFeatures.get(this.layeredGroupKey)
		if (layeredStyledFeatures && layeredStyledFeatures.length > 0) {
			this.processFeatures(data.tile, layeredStyledFeatures)
		}
	}

	processFeatures(tile: Tile, layeredStyledFeatures: LayeredParsedStyledFeature[]): void {
		throw new Error('implemented in subclass')
	}
}
