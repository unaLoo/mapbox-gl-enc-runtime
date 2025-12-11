// Input : context , feature
// Output: styledFeatures

import { ENCFeature, TileLoadHandler } from '@/types'

import { getAcronymByCode } from './tables/OBJLTable'
import { FeatureStylingContext, StyleDescription, ParsedStyledFeature, ParsedStyleDescription, InstructonType } from './types'
import { getStyleDescList } from './tables/StyleTable'
import { getEventBus } from '@/utils/eventBus'
import { getColor, Theme } from './tables/ColorTable'
import { Tile } from '@/tiles/tile'

function interpret(context: FeatureStylingContext, feature: ENCFeature): ParsedStyledFeature[] {
	const objl = feature.properties.OBJL
	if (objl === undefined) {
		throw new Error(`OBJL ${objl} is undefined`)
	}
	const acronym = getAcronymByCode(objl)
	const styleList = getStyleDescList(acronym)

	const res = styleList.map((style: StyleDescription) => {
		// map color
		const parsedStyle = parseColor(style, context.theme)

		return {
			feature: feature,
			styleDesc: parsedStyle,
		}
	})
	return res
}

function parseColor(styleDesc: StyleDescription, theme: Theme = 'DAY_BRIGHT'): ParsedStyleDescription {
	switch (styleDesc.type) {
		case 'AC':
			return {
				type: 'AC',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color)
				}
			}
		case 'TX':
			return {
				type: 'TX',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color)
				}
			}
		case 'LS':
			return {
				type: 'LS',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color)
				}
			}

		default:
			console.error('parseColor: unknown style type', styleDesc.type)
			return styleDesc as unknown as ParsedStyleDescription
	}
}


export class Interpreter {
	tileLoadHandler: TileLoadHandler = () => { }

	constructor() {
		this.tileLoadHandler = this._tileLoadHandler.bind(this)
		this.initFeatureWorkflow()
	}

	initFeatureWorkflow() {
		const eventBus = getEventBus()
		eventBus?.on('tileLoad', this.tileLoadHandler)
	}

	_tileLoadHandler(data: { tile: Tile; decodedFeatures: ENCFeature[] }) {
		const { tile, decodedFeatures } = data
		const styledFeatures = decodedFeatures
			.map((feature) => Interpreter.interpret({ theme: 'DAY_BRIGHT', tile: tile }, feature))
			.flat()

		const groupedFeatures = this.groupFeaturesByType(styledFeatures)

		const eventBus = getEventBus()
		eventBus?.trigger('featuresStyled', {
			tile: tile,
			styledFeatures: styledFeatures,
			groupedFeatures: groupedFeatures,
		})
		// console.log('styledFeatures', styledFeatures)
	}

	private groupFeaturesByType(features: ParsedStyledFeature[]): Map<InstructonType, ParsedStyledFeature[]> {
		const groups = new Map<InstructonType, ParsedStyledFeature[]>()

		for (const feature of features) {
			const type = feature.styleDesc.type
			if (!groups.has(type)) {
				groups.set(type, [])
			}
			groups.get(type)!.push(feature)
		}

		return groups
	}

	static interpret(context: FeatureStylingContext, feature: ENCFeature): ParsedStyledFeature[] {
		return interpret(context, feature)
	}
}
