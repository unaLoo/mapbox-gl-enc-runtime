import { getEventBus } from '@/utils/eventBus'
import { StyledFeature } from '@/rules/types'
import type { Tile } from '@/tiles/tile'
import { FeaturesStyledHandler } from '@/types'

export class BaseBucket {
	featuresStyledHandler: FeaturesStyledHandler

	constructor() {
		this.featuresStyledHandler = this._featuresStyledHandler.bind(this)
		this.initFeatureWorkflow()
	}

	initFeatureWorkflow() {
		const eventBus = getEventBus()
		eventBus?.on('featuresStyled', this.featuresStyledHandler)
	}

	_featuresStyledHandler(data: { tile: Tile; styledFeatures: StyledFeature[] }) {
		this.processFeatures(data.tile, data.styledFeatures)
	}

	processFeatures(tile: Tile, styledFeatures: StyledFeature[]) {
		throw new Error('implemented in subclass')
	}
}
