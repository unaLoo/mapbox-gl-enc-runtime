import { Color, ColorNames, Theme } from './tables/ColorTable'
import { ENCFeature } from '@/types'

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

export type GeomType = 'point' | 'line' | 'area' | 'lable'
export interface AreaSimpleFillDescription {
	type: 'area.simplefill'
	style: {
		themeColor: ColorNames
		color: Color
	}
}

// export interface PointSymbolDescription {
// 	'icon-anchor': 'top' | 'bottom' | 'left' | 'right' | 'center'
// 	'icon-rotate': number
// 	'icon-image'?: string
// 	'icon-sprite'?: [number, number, number, number] // [x, y, width, height]
// }
// export interface LineSymbolDescription {
// 	'line-color': string
// 	'line-width': number
// 	'line-type': 'solid' | 'dashed' | 'dotted' | 'marker'
// 	'line-dasharray': number[]
// }

// export interface LableSymbolDescription {
// 	'text-color'?: string
// 	'text-size'?: number
// 	'text-offset'?: [number, number]
// 	'text-source'?: string
// }

export type StyleDescription = AreaSimpleFillDescription

export interface StyledFeature {
	feature: ENCFeature
	style: StyleDescription
}

export interface FeatureStylingContext {
	theme: Theme
	[key: string]: any
}
