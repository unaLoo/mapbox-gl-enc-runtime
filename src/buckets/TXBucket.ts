/**
 * Area Render Bucket
 * Manages area (polygon) renderable elements
 */
// import earcut from 'earcut'
// import classifyRings from './classifyRing'
import type { TileLocalGeometry } from '../types'
import { BaseBucket } from './BaseBucket'
import { ParsedStyledFeature, TextPlainParsedStyle } from '@/rules/types'
import { LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'
import { getEventBus } from '@/utils/eventBus'
import type { Tile } from '@/tiles/tile'
import { Color } from '@/rules/tables/ColorTable'

interface TextInstance {
	position: [number, number] // x, y
	text: string
	style: Omit<TextPlainParsedStyle, 'fieldName'>
}

/**
 * TX Bucket
 */
export class TXBucket extends BaseBucket {
	constructor(layeredGroupKey: LayeredGroupKey) {
		super(layeredGroupKey)
	}

	override processFeatures(tile: Tile, layeredStyledFeatures: LayeredParsedStyledFeature[]): void {
		const textInstances: TextInstance[] = []

		for (const element of layeredStyledFeatures) {
			const { feature, styleDesc } = element

			// 确保是TX类型
			if (styleDesc.type !== 'TX') continue

			const textStyle = styleDesc.style as TextPlainParsedStyle

			// 获取文本内容
			const textStr: string = feature.properties[textStyle.fieldName]
			if (!textStr || textStr.trim() === '') continue

			// 获取几何信息
			const geometry = feature.tileLocalGeometry!
			if (!geometry) continue

			// 计算要素的中心点位置
			const position = this.calculateCenter(geometry)

			// 构建文本实例
			textInstances.push({
				position: position,
				text: textStr.trim(),
				style: {
					fontSize: textStyle.fontSize,
					color: this.parseColor(textStyle.color),
					horizontalAlign: textStyle.horizontalAlign,
					verticalAlign: textStyle.verticalAlign,
					direction: textStyle.direction,
					bold: textStyle.bold,
				},
			})
		}

		// 准备渲染信息
		const renderInfo = {
			textInstances: textInstances,
			instanceCount: textInstances.length,
		}

		// 触发渲染数据准备完成事件
		this.triggerBucketsReady(tile, renderInfo)
	}

	private triggerBucketsReady(tile: Tile, renderInfo: any) {
		const eventBus = getEventBus()
		eventBus?.trigger('bucketsReady', {
			tile: tile,
			layeredGroupKey: this.layeredGroupKey,
			renderInfo: renderInfo,
		})
	}

	private parseColor(color: Color): [number, number, number] {
		// Color已经是[r,g,b]格式，直接返回
		return [color[0] / 255, color[1] / 255, color[2] / 255]
	}

	private calculateCenter(geometry: TileLocalGeometry): [number, number] {
		switch (geometry.type) {
			case 'Point': {
				const coord = geometry.coordinates as { x: number; y: number }
				return [coord.x, coord.y]
			}
			case 'LineString': {
				const coords = geometry.coordinates as Array<{ x: number; y: number }>
				if (coords.length === 0) return [0, 0]
				let sumX = 0,
					sumY = 0
				for (const pt of coords) {
					sumX += pt.x
					sumY += pt.y
				}
				return [sumX / coords.length, sumY / coords.length]
			}
			case 'Polygon': {
				const rings = geometry.coordinates as Array<Array<{ x: number; y: number }>>
				if (rings.length === 0 || rings[0].length === 0) return [0, 0]
				// 计算外环的质心
				const ring = rings[0]
				let area = 0,
					cx = 0,
					cy = 0
				const n = ring.length
				for (let i = 0; i < n; i++) {
					const p1 = ring[i]
					const p2 = ring[(i + 1) % n]
					const a = p1.x * p2.y - p2.x * p1.y
					area += a
					cx += (p1.x + p2.x) * a
					cy += (p1.y + p2.y) * a
				}
				area /= 2
				if (area === 0) {
					// 退化为平均值
					let sumX = 0,
						sumY = 0
					for (const pt of ring) {
						sumX += pt.x
						sumY += pt.y
					}
					return [sumX / ring.length, sumY / ring.length]
				}
				cx /= 6 * area
				cy /= 6 * area
				return [cx, cy]
			}
			default:
				return [0, 0]
		}
	}
}
