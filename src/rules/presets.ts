/**
 * S-52 预设规则集
 */

import type { Rule } from './types'

/**
 * 深度区域（DEPARE）规则
 * 根据水深和安全深度渲染不同颜色
 *
 * 注意：这些规则需要在运行时根据上下文动态解析颜色
 * 实际使用时，可以通过 RuleEvaluator 的扩展来支持从上下文获取颜色
 */
export const depthAreaRules: Rule[] = [
	{
		id: 'depare-danger',
		name: '危险水深区域',
		priority: 10,
		condition: {
			property: 'feature.properties.DRVAL1',
			operator: 'lt',
			value: 'context.safetyDepth.depth',
		},
		result: {
			color: [255, 0, 0],
			opacity: 0.8,
			visible: true,
		},
	},
	{
		id: 'depare-shallow',
		name: '浅水区域',
		priority: 5,
		condition: {
			property: 'feature.properties.DRVAL1',
			operator: 'gte',
			value: 'context.safetyDepth.depth',
		},
		result: {
			color: [173, 216, 230],
			opacity: 0.6,
			visible: true,
		},
	},
]

/**
 * 等深线（DEPCNT）
 */
export const depthContourRules: Rule[] = [
	{
		id: 'depcnt-shallow',
		name: '浅水等深线',
		priority: 10,
		condition: {
			property: 'feature.properties.VALDCO',
			operator: 'eq',
			value: 'context.safetyDepth.shallowContour',
		},
		result: {
			color: [255, 255, 0], // 黄色
			lineWidth: 2,
			lineStyle: 'solid',
			visible: true,
		},
	},
	{
		id: 'depcnt-deep',
		name: '深水等深线',
		priority: 5,
		condition: {
			property: 'feature.properties.VALDCO',
			operator: 'gte',
			value: 'context.safetyDepth.deepContour',
		},
		result: {
			color: [0, 0, 255], // 蓝色
			lineWidth: 1,
			lineStyle: 'dashed',
			visible: true,
		},
	},
]

/**
 * 所有预设规则
 */
export const allPresetRules: Rule[] = [...depthAreaRules, ...depthContourRules]
