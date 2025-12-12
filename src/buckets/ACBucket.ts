/**
 * Area Render Bucket
 * Manages area (polygon) renderable elements
 */
import earcut from 'earcut'
import type { TileLocalGeometry } from '../types'
import classifyRings from './classifyRing'
import { BaseBucket } from './BaseBucket'
import { AreaColorParsedStyle, ParsedStyledFeature } from '@/rules/types'
import { LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'
import { getEventBus } from '@/utils/eventBus'
import type { Tile } from '@/tiles/tile'
import { AreaRenderInfo } from '@/renderer/types'

/**
 * AC Bucket
 * Collects and manages area renderable elements
 * Uses ear clipping triangulation for polygons
 */
export class ACBucket extends BaseBucket {
	constructor(layeredGroupKey: LayeredGroupKey) {
		super(layeredGroupKey)
	}

	override processFeatures(tile: Tile, layeredStyledFeatures: LayeredParsedStyledFeature[]): void {
		const vertices: number[] = []
		const indices: number[] = []

		for (const element of layeredStyledFeatures) {
			const { feature, styleDesc } = element

			// Assume style is AreaSimpleFillDescription
			const fillStyle = styleDesc.style as AreaColorParsedStyle
			const fillColor = [...fillStyle.color, 1.0]
			const rawPolygons = this.extractPolygons(feature.tileLocalGeometry!)

			// 记录当前顶点起始索引
			let vertexOffset = vertices.length / 6 // Now 6 floats: x,y,r,g,b,a

			for (const rawPolygon of rawPolygons) {
				if (rawPolygon.length === 0) continue

				// 使用 classifyRings 正确分类外环和内环（孔）
				const classifiedPolygons = classifyRings(rawPolygon, 500) // maxRings = 500 for performance

				for (const polygon of classifiedPolygons) {
					if (polygon.length === 0) continue

					// 外环（第一个环）
					const exteriorRing = polygon[0]
					if (exteriorRing.length < 3) continue // 至少需要3个点才能形成三角形

					// 准备 earcut 输入
					const flatCoords: number[] = []
					for (const point of exteriorRing) {
						flatCoords.push(point.x, point.y)
					}

					// 洞的索引数组
					const holes: number[] = []
					let holeIndex = exteriorRing.length
					for (let i = 1; i < polygon.length; i++) {
						const hole = polygon[i]
						if (hole.length >= 3) {
							holes.push(holeIndex)
							for (const point of hole) {
								flatCoords.push(point.x, point.y)
							}
							holeIndex += hole.length
						}
					}

					// 使用 earcut 进行三角化
					const triangulation = earcut(flatCoords, holes.length > 0 ? holes : undefined, 2)

					// 生成顶点数据（每个顶点包含位置和颜色）
					for (let i = 0; i < flatCoords.length; i += 2) {
						vertices.push(
							flatCoords[i], // x
							flatCoords[i + 1], // y
							fillColor[0], // r
							fillColor[1], // g
							fillColor[2], // b
							fillColor[3], // a
						)
					}

					// 生成索引数据（需要加上顶点偏移量）
					for (const index of triangulation) {
						indices.push(vertexOffset + index)
					}

					// 更新顶点偏移量
					vertexOffset += flatCoords.length / 2
				}
			}
		}

		const renderInfo = {
			vertices: vertices,
			vertexCount: vertices.length / 6,
			indices: indices,
			indexCount: indices.length,
		}

		// 触发 bucketsReady 事件
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

	/**
	 * Extract polygons from geometry
	 */
	private extractPolygons(geometry: TileLocalGeometry): Array<Array<Array<{ x: number; y: number }>>> {
		const polygons: Array<Array<Array<{ x: number; y: number }>>> = []

		const coords = geometry.coordinates as Array<Array<{ x: number; y: number }>>
		polygons.push(coords)

		return polygons
	}
}
