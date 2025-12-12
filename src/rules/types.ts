import { Color, ColorNames, Theme } from './tables/ColorTable'
import { ENCFeature } from '@/types'

////////////////////////////////////////////////////////////
/////////////////////// 为了能接上 instruction

export type InstructonType = 'AC' | 'AP' | 'LS' | 'LC' | 'SY' | 'TX' | 'TE' | 'CS'

/**
 * AC
 */
export interface AreaColorStyle {
	color: ColorNames
}
export interface AreaColorParsedStyle {
	color: Color
}

/**
 * AP
 */
export interface AreaPatternStyle {
	pattern: string
}
export interface AreaPatternParsedStyle {
	pattern: string
}

/**
 * lS
 */
export interface LineSimpleStyle {
	lineStyle: 'SOLID' | 'DASH' | 'DOT' | 'DASHDOT'
	lineWidth: number
	color: ColorNames
}
export interface LineSimpleParsedStyle {
	lineStyle: 'SOLID' | 'DASH' | 'DOT' | 'DASHDOT'
	lineWidth: number
	color: Color
}

/**
 * LC
 */
export interface LineComplexStyle {
	pattern: string
}
export interface LineComplexParsedStyle {
	pattern: string
}

/**
 * SY
 */
export interface SymbolStyle {
	symbol: string
	rotationField?: string
}
export interface SymbolParsedStyle {
	symbol: string
	rotationField?: string
}

/**
 * TX(OBJNAM,3,1,2,'15110',1,0,CHBLK,29)          // 对象名，29像素，右对齐，加粗
 */
export interface TextPlainStyle {
	fieldName: string
	horizontalAlign: 1 | 2 | 3 //'LEFT' | 'CENTER' | 'RIGHT'
	verticalAlign: 1 | 2 | 3 // 'TOP' | 'CENTER' | 'BOTTOM'
	direction: 2 | 3 // 'HORIZONTAL' | 'VERTICAL'
	bold: 0 | 1
	color: ColorNames
	fontSize: number
}
export interface TextPlainParsedStyle {
	fieldName: string
	horizontalAlign: 1 | 2 | 3 //'LEFT' | 'CENTER' | 'RIGHT'
	verticalAlign: 1 | 2 | 3 // 'TOP' | 'CENTER' | 'BOTTOM'
	direction: 2 | 3 // 'HORIZONTAL' | 'VERTICAL'
	bold: 0 | 1
	color: Color
	fontSize: number
}

/**
 * TE('%4.1lf','VERCCL',3,1,2,'15110',1,0,CHBLK,11)      // 高度数值，1位小数
 */
export interface TextNumericStyle extends TextPlainStyle {
	formatString: string
}
export interface TextNumericParsedStyle extends TextNumericStyle {
	formatString: string
}

export interface ConditionalStyle {
	condition: 'DEPARE01' | 'DATCVR01' | 'DEPCNT02' | 'OBSTRN04' | 'SOUNDG02' | 'TOPMAR01'
}
export interface ConditionalParsedStyle {
	[key: string]: any
}

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

export type StyleDescription =
	| { type: 'AC'; style: AreaColorStyle }
	| { type: 'AP'; style: AreaPatternStyle }
	| { type: 'LS'; style: LineSimpleStyle }
	| { type: 'LC'; style: LineComplexStyle }
	| { type: 'SY'; style: SymbolStyle }
	| { type: 'TX'; style: TextPlainStyle }
	| { type: 'TE'; style: TextNumericStyle }
	| { type: 'CS'; style: ConditionalStyle }

export type ParsedStyleDescription =
	| { type: 'AC'; style: AreaColorParsedStyle }
	| { type: 'AP'; style: AreaPatternParsedStyle }
	| { type: 'LS'; style: LineSimpleParsedStyle }
	| { type: 'LC'; style: LineComplexParsedStyle }
	| { type: 'SY'; style: SymbolParsedStyle }
	| { type: 'TX'; style: TextPlainParsedStyle }
	| { type: 'TE'; style: TextNumericParsedStyle }
	| { type: 'CS'; style: ConditionalParsedStyle }

export interface StyledFeature {
	feature: ENCFeature
	styleDesc: StyleDescription
}

export interface ParsedStyledFeature {
	feature: ENCFeature
	styleDesc: ParsedStyleDescription
}

export interface FeatureStylingContext {
	theme: Theme
	SAFETY_CONTOUR: number
	SHALLOW_CONTOUR: number
	DEEP_CONTOUR: number
	[key: string]: any
}
