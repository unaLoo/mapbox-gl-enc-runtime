// Input : context , feature
// Output: styledFeatures

import { ENCFeature } from '@/types'

import { getAcronymByCode } from './tables/OBJLTable'
import { StyledFeature, FeatureStylingContext } from './types'
import { getStyleList, updateStyleTable } from './tables/StyleTable'
import { getEventBus } from '@/utils/eventBus'
import { Tile } from '@/tiles/tile'

function interpret(context: FeatureStylingContext, feature: ENCFeature): StyledFeature[] {
	const objl = feature.properties.OBJL
	if (objl === undefined) {
		throw new Error(`OBJL ${objl} is undefined`)
	}
	const acronym = getAcronymByCode(objl)
	const styleList = getStyleList(acronym)

	const res = styleList.map((style) => {
		return {
			feature: feature,
			style: style,
		}
	})
	return res
}

export class Interpreter {
	tileLoadHandler: (data: { tile: Tile; parsedFeatures: ENCFeature[] }) => void = () => {}

	constructor() {
		this.tileLoadHandler = this._tileLoadHandler.bind(this)
		updateStyleTable('DAY_BRIGHT')
		this.initFeatureWorkflow()
	}

	initFeatureWorkflow() {
		const eventBus = getEventBus()
		eventBus?.on('tileLoad', this.tileLoadHandler)
	}

	_tileLoadHandler(data: { tile: Tile; parsedFeatures: ENCFeature[] }) {
		console.log('tileLoad', data)
		const { tile, parsedFeatures } = data
		const styledFeatures = parsedFeatures
			.map((feature) => Interpreter.interpret({ theme: 'DAY_BRIGHT', tile: tile }, feature))
			.flat()

		const eventBus = getEventBus()
		eventBus?.trigger('featuresStyled', {
			tile: tile,
			styledFeatures: styledFeatures,
		})
		console.log(styledFeatures)
	}

	static interpret(context: FeatureStylingContext, feature: ENCFeature): StyledFeature[] {
		return interpret(context, feature)
	}
}
