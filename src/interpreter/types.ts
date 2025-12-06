/**
 * Feature Interpreter Types
 * Defines interfaces for feature interpretation and renderable elements
 */

import type { ENCFeature, TileLocalGeometry } from '../types'
import type { RuleResult } from '../rules/types'
import type { RenderingContext } from '../context/types'
import type { Tile } from '../tiles/tile'

/**
 * Render style definition
 * Defines how a renderable element should be rendered
 */
export interface RenderStyle {
	// 基础样式
	color?: [number, number, number, number] // RGBA
	opacity?: number

	// 点样式
	symbol?: string // 符号 ID
	symbolSize?: number

	// 线样式
	lineWidth?: number
	lineStyle?: 'solid' | 'dashed' | 'dotted'
	lineCap?: 'round' | 'square' | 'butt'
	lineJoin?: 'round' | 'bevel' | 'miter'

	// 面样式
	fillPattern?: string // 图案 ID
	borderWidth?: number
	borderColor?: [number, number, number, number]

	// 文本样式
	text?: string
	fontSize?: number
	fontFamily?: string
	textColor?: [number, number, number, number]
	textOffset?: [number, number] // [x, y] offset in pixels

	// Uniform 变量（传递给 shader）
	uniforms?: Record<string, number | number[] | boolean>
}

/**
 * Renderable element
 * Represents a single renderable component that can be added to a bucket
 */
export interface RenderableElement {
	// 要素类型
	type: 'point' | 'line' | 'area' | 'text' | 'composite'

	// 几何数据（瓦片局部坐标，已归一化到 8192）
	geometry: TileLocalGeometry

	// 渲染样式（从规则求值得到）
	style: RenderStyle

	// 关联的原始 feature（用于调试、交互等）
	sourceFeature: ENCFeature

	// 要素层级（用于渲染顺序，数值越大越在上层）
	zIndex?: number
}

/**
 * Feature interpretation context
 * Contains all information needed for feature interpretation
 */
export interface InterpretationContext {
	// 原始特征
	feature: ENCFeature

	// 规则求值结果
	ruleResult: RuleResult

	// 渲染上下文（环境、显示模式等）
	renderingContext: RenderingContext

	// 所属瓦片（用于坐标变换等）
	tile: Tile

	// 瓦片坐标信息
	tileZ: number
	tileX: number
	tileY: number
}

/**
 * Feature interpreter function
 * Interprets a feature into renderable elements
 */
export type FeatureInterpreterFunction = (context: InterpretationContext) => RenderableElement[]
