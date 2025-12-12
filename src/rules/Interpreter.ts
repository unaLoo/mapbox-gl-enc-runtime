// Input : context , feature
// Output: styledFeatures

import { ENCFeature, TileLoadHandler, LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'

import { getAcronymByCode } from './tables/OBJLTable'
import {
	FeatureStylingContext,
	StyleDescription,
	ParsedStyledFeature,
	ParsedStyleDescription,
	ConditionalStyle,
} from './types'
import { getStyleDescList } from './tables/StyleTable'
import { getEventBus } from '@/utils/eventBus'
import { ColorNames, getColor, Theme } from './tables/ColorTable'
import { Tile } from '@/tiles/tile'

const contextHere: FeatureStylingContext = {
	theme: 'DAY_BRIGHT',
	SAFETY_CONTOUR: 2,
	SHALLOW_CONTOUR: 3,
	DEEP_CONTOUR: 6,
}

const ConditionProcedureMap = {
	DEPARE01: (context: FeatureStylingContext, feature: ENCFeature): ParsedStyleDescription[] => {
		let finalColor: ColorNames

		if (feature.properties.DRVAL1! < 0.0) {
			finalColor = 'DEPIT'
		}
		else if (feature.properties.DRVAL1! < 2.0) {
			finalColor = 'DEPIT'
		}
		else if (feature.properties.DRVAL1! < 3.0) {
			finalColor = 'DEPMS'
		}
		else if (feature.properties.DRVAL1! < 6.0) {
			finalColor = 'DEPMD'
		}
		else {
			finalColor = 'DEPDW'
		}

		// if (feature.properties.DRVAL1! >= context.DEEP_CONTOUR &&
		// 	true
		// 	// feature.properties.DRVAL2! > context.DEEP_CONTOUR 
		// )
		// 	finalColor = 'DEPDW'

		// else if (feature.properties.DRVAL1! >= context.SAFETY_CONTOUR &&
		// 	true
		// 	// feature.properties.DRVAL2! > context.SAFETY_CONTOUR
		// )
		// 	finalColor = 'DEPMD'

		// else if (feature.properties.DRVAL1! >= context.SHALLOW_CONTOUR &&
		// 	true
		// 	//feature.properties.DRVAL2! > context.SHALLOW_CONTOUR
		// )
		// 	finalColor = 'DEPMS'

		// else if (feature.properties.DRVAL1! >= 0 &&
		// 	true
		// 	//feature.properties.DRVAL2! > 0
		// )

		// 	finalColor = 'DEPIT'

		// else
		// 	// default
		// 	finalColor = 'DEPIT'

		console.log(feature.properties, finalColor)
		return [
			{
				type: 'AC',
				style: {
					color: getColor(context.theme, finalColor),
				},
			}
		]
	},
	// ...
}

function parseCondition(
	context: FeatureStylingContext,
	feature: ENCFeature,
	condtion: ConditionalStyle['condition'],
): ParsedStyledFeature[] {
	switch (condtion) {
		case 'DEPARE01':
			const procedure = ConditionProcedureMap[condtion]
			const parsedStyledDescList = procedure(context, feature)
			const parsedStyledFeature = parsedStyledDescList.map(item => ({
				feature: feature,
				styleDesc: item,
			}))

			return parsedStyledFeature
		default:
			throw new Error(`parseCondition: unknown condition ${condtion}`)
	}
}

function interpret(context: FeatureStylingContext, feature: ENCFeature): ParsedStyledFeature[] {
	const objl = feature.properties.OBJL
	if (objl === undefined) {
		throw new Error(`OBJL ${objl} is undefined`)
	}
	const acronym = getAcronymByCode(objl)
	const styleDescList = getStyleDescList(acronym)

	const parsedStyleDescList: ParsedStyledFeature[] = []

	for (const styleDesc of styleDescList) {
		if (styleDesc.type === 'CS') {
			const res = parseCondition(context, feature, styleDesc.style.condition)
			res.forEach(item => {
				parsedStyleDescList.push(item)
			})
		} else {
			const parsedStyle = parseColor(styleDesc, context.theme)
			parsedStyleDescList.push({
				feature: feature,
				styleDesc: parsedStyle,
			})
		}
	}

	return parsedStyleDescList
}

function parseColor(styleDesc: StyleDescription, theme: Theme = 'DAY_BRIGHT'): ParsedStyleDescription {
	switch (styleDesc.type) {
		case 'AC':
			return {
				type: 'AC',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color),
				},
			}
		case 'TX':
			return {
				type: 'TX',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color),
				},
			}
		case 'LS':
			return {
				type: 'LS',
				style: {
					...styleDesc.style,
					color: getColor(theme, styleDesc.style.color),
				},
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

	_tileLoadHandler(data: { tile: Tile; tileSourceId: string; decodedFeatures: ENCFeature[] }) {
		const { tile, tileSourceId, decodedFeatures } = data

		// 生成带图层信息的样式化特征
		const layeredStyledFeatures: LayeredParsedStyledFeature[] = decodedFeatures
			.map((feature) => Interpreter.interpret(contextHere, feature))
			.flat()
			.map((styledFeature) => ({
				layerId: styledFeature.feature.properties._objNam,
				tile: tile,
				feature: styledFeature.feature,
				styleDesc: styledFeature.styleDesc,
			}))

		// 按 "图层ID + 样式类型" 分组
		const groupedFeatures = this.groupFeaturesByLayerAndType(layeredStyledFeatures)

		const eventBus = getEventBus()
		eventBus?.trigger('featuresStyled', {
			tile: tile,
			tileSourceId: tileSourceId,
			layeredStyledFeatures: layeredStyledFeatures,
			groupedFeatures: groupedFeatures,
		})
	}

	private groupFeaturesByLayerAndType(
		features: LayeredParsedStyledFeature[],
	): Map<LayeredGroupKey, LayeredParsedStyledFeature[]> {
		const groups = new Map<LayeredGroupKey, LayeredParsedStyledFeature[]>()

		for (const feature of features) {
			const key: LayeredGroupKey = `${feature.layerId}-${feature.styleDesc.type}` // "LNDARE-AC"
			if (!groups.has(key)) {
				groups.set(key, [])
			}
			groups.get(key)!.push(feature)
		}

		return groups
	}

	static interpret(context: FeatureStylingContext, feature: ENCFeature): ParsedStyledFeature[] {
		return interpret(context, feature)
	}
}
